const fs = require('fs');
const Document = require('../models/Document');
const Ledger = require('../models/Ledger');
const User = require('../models/User');
const pdfService = require('../services/pdfService');
const attributionService = require('../services/attributionService');
const ledgerService = require('../services/ledgerService');
const cryptoService = require('../services/cryptoService');
const asyncHandler = require('../utils/asyncHandler');

// POST /verify-leak  (admin only, multipart/form-data: file)
// Runs the full leak-investigation pipeline against an uploaded (leaked) PDF:
// Extract Metadata -> Verify Signature -> Compare Hash -> Verify Ledger -> Recipient Identified
const verifyLeak = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'A PDF file is required.' });
  }

  const leakedBytes = fs.readFileSync(req.file.path);
  const leakedFileHash = cryptoService.sha256Hex(leakedBytes);

  const steps = [];
  let identifiedRecipient = null;
  let token = null;

  // Step 1: Extract Metadata
  const extraction = await pdfService.extractHiddenMetadata(leakedBytes);
  steps.push({
    step: 'Extract Metadata',
    status: extraction.found ? 'pass' : 'fail',
    detail: extraction.found
      ? 'Hidden attribution metadata recovered from document Info dictionary.'
      : 'No hidden attribution metadata found. This document was not sourced from a tracked decryption, or the metadata has been stripped.',
  });

  if (!extraction.found || !extraction.payload) {
    fs.unlinkSync(req.file.path);
    return res.json({
      leakedFileHash,
      steps,
      chainValid: null,
      identifiedRecipient: null,
      conclusion: 'INCONCLUSIVE — no embedded attribution token could be recovered from this file.',
    });
  }

  token = extraction.payload;

  // Step 2: Verify Signature — the token must validate against the claimed recipient's Ed25519 public key
  const claimedRecipient = await User.findById(token.recipientId);
  let signatureValid = false;
  if (claimedRecipient) {
    const verification = attributionService.verifyAttributionToken(token, claimedRecipient.edPublicKey);
    signatureValid = verification.valid;
  }
  steps.push({
    step: 'Verify Signature',
    status: signatureValid ? 'pass' : 'fail',
    detail: signatureValid
      ? `Ed25519 signature valid — token was genuinely signed by ${claimedRecipient?.name} (${claimedRecipient?.employeeId}).`
      : 'Signature verification failed. The token may be forged or corrupted.',
  });

  // Step 3: Compare Hash — the document hash embedded in the token must match the original on file
  const document = await Document.findById(token.documentId);
  const hashMatches = Boolean(document && document.hash === token.documentHash);
  steps.push({
    step: 'Compare Hash',
    status: hashMatches ? 'pass' : 'fail',
    detail: hashMatches
      ? `Document hash in token matches the original registered document hash (${token.documentHash.slice(0, 16)}...).`
      : 'Document hash mismatch — token does not correspond to a known original document.',
  });

  // Step 4: Verify Ledger — an immutable, chain-verified ledger entry must exist for this token
  const ledgerEntry = await Ledger.findOne({ tokenId: token.tokenId }).populate('recipientId', 'employeeId name department');
  const chainVerification = await ledgerService.verifyChain();
  const entryInChain = chainVerification.report.find((r) => r.tokenId === token.tokenId);
  const ledgerOk = Boolean(ledgerEntry && entryInChain && entryInChain.valid);
  steps.push({
    step: 'Verify Ledger',
    status: ledgerOk ? 'pass' : 'fail',
    detail: ledgerOk
      ? `Immutable ledger entry #${ledgerEntry.sequence} found and cryptographically verified (chain-linked + signed).`
      : 'No valid, unbroken ledger entry found for this token.',
  });

  // Step 5: Recipient Identified
  if (ledgerOk && ledgerEntry.recipientId) {
    identifiedRecipient = {
      id: ledgerEntry.recipientId._id,
      employeeId: ledgerEntry.recipientId.employeeId,
      name: ledgerEntry.recipientId.name,
      department: ledgerEntry.recipientId.department,
      deviceId: ledgerEntry.deviceId,
      decryptedAt: ledgerEntry.timestamp,
      tokenId: token.tokenId,
    };
  }
  steps.push({
    step: 'Recipient Identified',
    status: identifiedRecipient ? 'pass' : 'fail',
    detail: identifiedRecipient
      ? `Leak attributed to ${identifiedRecipient.name} (${identifiedRecipient.employeeId}) — decrypted on device ${identifiedRecipient.deviceId} at ${new Date(identifiedRecipient.decryptedAt).toISOString()}.`
      : 'Could not conclusively identify the responsible recipient.',
  });

  fs.unlinkSync(req.file.path);

  const allPassed = steps.every((s) => s.status === 'pass');

  res.json({
    leakedFileHash,
    document: document ? { id: document._id, name: document.originalName, classification: document.classification } : null,
    steps,
    chainValid: chainVerification.valid,
    identifiedRecipient,
    conclusion: allPassed
      ? `CONFIRMED — This leaked document is cryptographically traced to ${identifiedRecipient.name} (${identifiedRecipient.employeeId}).`
      : 'VERIFICATION FAILED — one or more integrity checks did not pass. See step details above.',
  });
});

module.exports = { verifyLeak };
