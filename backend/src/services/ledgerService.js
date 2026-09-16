const fs = require('fs');
const path = require('path');
const { Ledger } = require('../models');
const { sha256Hex, ed25519Sign, ed25519Verify } = require('./cryptoService');
const { LEDGER_GENESIS_SEED } = require('../config/constants');

const LEDGER_JSON_PATH = path.join(__dirname, '..', '..', 'ledger.json');

function computeEntryHash({ previousHash, recipientId, documentId, tokenId, documentHash, deviceId, nonce, timestamp }) {
  const material = [
    previousHash,
    String(recipientId),
    String(documentId),
    tokenId,
    documentHash,
    deviceId,
    nonce,
    new Date(timestamp).toISOString(),
  ].join('|');
  return sha256Hex(material);
}

async function getGenesisHash() {
  return sha256Hex(LEDGER_GENESIS_SEED);
}

async function getLastEntry() {
  return Ledger.findOne({ order: [['sequence', 'DESC']] });
}

/**
 * Appends a new immutable ledger entry recording a decryption/attribution event.
 * The entry is cryptographically chained to the previous entry (previousHash ->
 * currentHash) and signed with the recipient's Ed25519 private key, binding the
 * attribution to that specific recipient. Mirrors the full chain to ledger.json
 * on disk as a secondary, human-inspectable immutable log.
 */
async function appendEntry({ recipientId, documentId, tokenId, documentHash, deviceId, nonce, recipientEdPrivateKey, recipientEdPublicKey, timestamp }) {
  const last = await getLastEntry();
  const previousHash = last ? last.currentHash : await getGenesisHash();
  const sequence = last ? last.sequence + 1 : 0;
  const ts = timestamp || new Date();

  const currentHash = computeEntryHash({
    previousHash,
    recipientId,
    documentId,
    tokenId,
    documentHash,
    deviceId,
    nonce,
    timestamp: ts,
  });

  const signature = ed25519Sign(recipientEdPrivateKey, currentHash);

  const entry = await Ledger.create({
    sequence,
    previousHash,
    currentHash,
    recipientId,
    documentId,
    tokenId,
    documentHash,
    deviceId,
    nonce,
    signature,
    signerPublicKey: recipientEdPublicKey,
    timestamp: ts,
  });

  await mirrorToJsonFile();
  return entry;
}

async function mirrorToJsonFile() {
  const entries = await Ledger.findAll({ order: [['sequence', 'ASC']], raw: true });
  const serializable = entries.map((e) => ({
    sequence: e.sequence,
    previousHash: e.previousHash,
    currentHash: e.currentHash,
    recipientId: String(e.recipientId),
    documentId: String(e.documentId),
    tokenId: e.tokenId,
    documentHash: e.documentHash,
    deviceId: e.deviceId,
    nonce: e.nonce,
    signature: e.signature,
    signerPublicKey: e.signerPublicKey,
    timestamp: e.timestamp,
  }));
  fs.writeFileSync(LEDGER_JSON_PATH, JSON.stringify({ chain: serializable, exportedAt: new Date().toISOString() }, null, 2));
}

/**
 * Walks the full chain in sequence order, re-deriving each entry's hash and
 * verifying: (1) previousHash correctly links to the prior entry's currentHash,
 * (2) currentHash matches a fresh recomputation from the entry's own fields
 * (detects tampering with any stored field), and (3) the Ed25519 signature over
 * currentHash verifies against the recorded signer public key. Any single
 * broken record invalidates the chain from that point forward.
 */
async function verifyChain() {
  const entries = await Ledger.findAll({ order: [['sequence', 'ASC']], raw: true });
  const genesisHash = await getGenesisHash();
  let expectedPrevious = genesisHash;
  const report = [];
  let valid = true;

  for (const entry of entries) {
    const recomputedHash = computeEntryHash(entry);
    const previousLinkOk = entry.previousHash === expectedPrevious;
    const hashOk = entry.currentHash === recomputedHash;
    const signatureOk = ed25519Verify(entry.signerPublicKey, entry.currentHash, entry.signature);
    const entryValid = previousLinkOk && hashOk && signatureOk;
    if (!entryValid) valid = false;

    report.push({
      sequence: entry.sequence,
      tokenId: entry.tokenId,
      previousLinkOk,
      hashOk,
      signatureOk,
      valid: entryValid,
    });

    expectedPrevious = entry.currentHash;
  }

  return { valid, totalEntries: entries.length, report, genesisHash };
}

module.exports = { computeEntryHash, getGenesisHash, getLastEntry, appendEntry, verifyChain, mirrorToJsonFile, LEDGER_JSON_PATH };
