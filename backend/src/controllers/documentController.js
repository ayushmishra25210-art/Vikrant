const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Document = require('../models/Document');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const cryptoService = require('../services/cryptoService');
const pdfService = require('../services/pdfService');
const ledgerService = require('../services/ledgerService');
const attributionService = require('../services/attributionService');
const { deriveDeviceId } = require('../utils/deviceId');

const ENCRYPTED_DIR = path.join(__dirname, '..', '..', 'uploads', 'encrypted');
if (!fs.existsSync(ENCRYPTED_DIR)) fs.mkdirSync(ENCRYPTED_DIR, { recursive: true });

// POST /documents/upload  (admin only, multipart/form-data: file, classification, description, recipients[])
const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'A PDF file is required.' });
  }

  const { classification, description } = req.body;
  let recipientEmployeeIds = [];
  if (req.body.recipients) {
    try {
      recipientEmployeeIds = Array.isArray(req.body.recipients) ? req.body.recipients : JSON.parse(req.body.recipients);
    } catch (err) {
      recipientEmployeeIds = String(req.body.recipients)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  const tempPath = req.file.path;
  const plaintext = fs.readFileSync(tempPath);

  // 1. Hash the original plaintext document (used for later leak-matching)
  const hash = cryptoService.sha256Hex(plaintext);

  // 2. Encrypt once with AES-256-GCM
  const { key: aesKey, iv, authTag, encryptedData } = cryptoService.aesEncrypt(plaintext);

  const encryptedFilename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.enc`;
  const encryptedPath = path.join(ENCRYPTED_DIR, encryptedFilename);
  fs.writeFileSync(encryptedPath, encryptedData);
  fs.unlinkSync(tempPath); // remove plaintext temp file — only the encrypted copy persists at rest

  // 3. Protect the AES key per recipient (RSA-4096-OAEP wrap), plus a copy for the uploader
  //    so the admin can later assign additional recipients without re-uploading.
  const uploader = req.user;
  const adminEncryptedAESKey = cryptoService.rsaWrapKey(uploader.rsaPublicKey, aesKey);

  const recipientDocs = recipientEmployeeIds.length
    ? await User.find({ employeeId: { $in: recipientEmployeeIds.map((e) => e.toUpperCase()) }, role: 'recipient' })
    : [];

  const recipients = recipientDocs.map((r) => ({
    recipient: r._id,
    encryptedAESKey: cryptoService.rsaWrapKey(r.rsaPublicKey, aesKey),
    status: 'pending',
  }));

  const document = await Document.create({
    filename: encryptedFilename,
    originalName: req.file.originalname,
    description: description || '',
    classification: classification || 'CONFIDENTIAL',
    uploader: uploader._id,
    hash,
    fileSize: plaintext.length,
    encryptedPath,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    recipients,
    adminEncryptedAESKey,
  });

  const populated = await Document.findById(document._id).populate('recipients.recipient', 'employeeId name');

  res.status(201).json({ message: 'Document encrypted and stored successfully.', document: serializeDocument(populated) });
});

// POST /documents/:id/assign  (admin only, body: { recipientIds: [employeeId,...] })
const assignRecipients = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { recipientIds } = req.body;
  if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
    return res.status(400).json({ message: 'recipientIds (array of employee IDs) is required.' });
  }

  const document = await Document.findById(id);
  if (!document) return res.status(404).json({ message: 'Document not found.' });

  const uploader = await User.findById(document.uploader);
  const aesKey = cryptoService.rsaUnwrapKey(uploader.rsaPrivateKey, document.adminEncryptedAESKey);

  const users = await User.find({ employeeId: { $in: recipientIds.map((e) => e.toUpperCase()) }, role: 'recipient' });
  const alreadyAssigned = new Set(document.recipients.map((r) => String(r.recipient)));

  let added = 0;
  for (const user of users) {
    if (alreadyAssigned.has(String(user._id))) continue;
    document.recipients.push({
      recipient: user._id,
      encryptedAESKey: cryptoService.rsaWrapKey(user.rsaPublicKey, aesKey),
      status: 'pending',
    });
    added += 1;
  }

  await document.save();
  const populated = await Document.findById(document._id).populate('recipients.recipient', 'employeeId name');
  res.json({ message: `${added} recipient(s) assigned.`, document: serializeDocument(populated) });
});

// GET /documents  — admin: all documents. recipient: only documents assigned to them.
const listDocuments = asyncHandler(async (req, res) => {
  let query = {};
  if (req.user.role === 'recipient') {
    query = { 'recipients.recipient': req.user._id };
  }
  const documents = await Document.find(query)
    .sort({ createdAt: -1 })
    .populate('uploader', 'employeeId name')
    .populate('recipients.recipient', 'employeeId name');

  res.json({ documents: documents.map((d) => serializeDocument(d, req.user)) });
});

// GET /documents/:id
const getDocument = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id)
    .populate('uploader', 'employeeId name')
    .populate('recipients.recipient', 'employeeId name');
  if (!document) return res.status(404).json({ message: 'Document not found.' });

  if (req.user.role === 'recipient') {
    const isAssigned = document.recipients.some((r) => String(r.recipient._id) === String(req.user._id));
    if (!isAssigned) return res.status(403).json({ message: 'You are not assigned to this document.' });
  }

  res.json({ document: serializeDocument(document, req.user) });
});

// POST /documents/:id/decrypt  (recipient only)
// Performs the full decrypt -> attribute -> embed -> ledger -> return-PDF workflow.
const decryptDocument = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) return res.status(404).json({ message: 'Document not found.' });

  const assignment = document.recipients.find((r) => String(r.recipient) === String(req.user._id));
  if (!assignment) {
    return res.status(403).json({ message: 'You are not an authorized recipient of this document.' });
  }

  // 1. Recipient verified (JWT auth + assignment check above)
  const recipient = req.user;

  // 2. Unwrap the AES-256 content key using the recipient's RSA-4096 private key
  const aesKey = cryptoService.rsaUnwrapKey(recipient.rsaPrivateKey, assignment.encryptedAESKey);

  // 3. Read + decrypt the stored ciphertext (AES-256-GCM — auth tag verifies integrity)
  const encryptedData = fs.readFileSync(document.encryptedPath);
  const plaintext = cryptoService.aesDecrypt({
    encryptedData,
    key: aesKey,
    iv: Buffer.from(document.iv, 'base64'),
    authTag: Buffer.from(document.authTag, 'base64'),
  });

  // Integrity check: recomputed hash of decrypted content must match the hash recorded at upload
  const recomputedHash = cryptoService.sha256Hex(plaintext);
  const integrityOk = recomputedHash === document.hash;

  // 4. Device verified (derived fingerprint from request)
  const deviceId = deriveDeviceId(req);

  // 5. Generate + sign the cryptographic attribution token
  const token = attributionService.createAttributionToken({
    recipientId: recipient._id,
    employeeId: recipient.employeeId,
    documentId: document._id,
    documentHash: document.hash,
    deviceId,
    edPrivateKey: recipient.edPrivateKey,
  });

  // 6. Embed the signed token as hidden metadata (visible page content is untouched)
  const attributedPdfBytes = await pdfService.embedHiddenMetadata(plaintext, token);

  // 7. Append an immutable, chained + signed provenance ledger entry
  const ledgerEntry = await ledgerService.appendEntry({
    recipientId: recipient._id,
    documentId: document._id,
    tokenId: token.tokenId,
    documentHash: document.hash,
    deviceId,
    nonce: token.nonce,
    recipientEdPrivateKey: recipient.edPrivateKey,
    recipientEdPublicKey: recipient.edPublicKey,
    timestamp: token.timestamp,
  });

  assignment.status = 'decrypted';
  assignment.decryptedAt = new Date();
  await document.save();

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="attributed-${document.originalName}"`,
    'X-Token-Id': token.tokenId,
    'X-Ledger-Sequence': String(ledgerEntry.sequence),
    'X-Integrity-Ok': String(integrityOk),
    'X-Device-Id': deviceId,
    'Access-Control-Expose-Headers': 'X-Token-Id, X-Ledger-Sequence, X-Integrity-Ok, X-Device-Id',
  });
  res.send(Buffer.from(attributedPdfBytes));
});

// GET /document/:id/provenance — full decryption/attribution history for one document
const getDocumentProvenance = asyncHandler(async (req, res) => {
  const Ledger = require('../models/Ledger');
  const document = await Document.findById(req.params.id).populate('recipients.recipient', 'employeeId name');
  if (!document) return res.status(404).json({ message: 'Document not found.' });

  const entries = await Ledger.find({ documentId: document._id }).sort({ sequence: 1 }).populate('recipientId', 'employeeId name');

  res.json({
    document: { id: document._id, name: document.originalName, hash: document.hash, classification: document.classification },
    provenance: entries.map((e) => ({
      sequence: e.sequence,
      tokenId: e.tokenId,
      recipient: e.recipientId ? { id: e.recipientId._id, employeeId: e.recipientId.employeeId, name: e.recipientId.name } : null,
      deviceId: e.deviceId,
      timestamp: e.timestamp,
      previousHash: e.previousHash,
      currentHash: e.currentHash,
      signature: e.signature,
    })),
  });
});

function serializeDocument(doc, requestingUser) {
  const obj = {
    id: doc._id,
    filename: doc.originalName,
    description: doc.description,
    classification: doc.classification,
    hash: doc.hash,
    fileSize: doc.fileSize,
    uploader: doc.uploader ? { id: doc.uploader._id, employeeId: doc.uploader.employeeId, name: doc.uploader.name } : null,
    uploadTime: doc.uploadTime,
    recipients: doc.recipients.map((r) => ({
      id: r.recipient?._id,
      employeeId: r.recipient?.employeeId,
      name: r.recipient?.name,
      status: r.status,
      decryptedAt: r.decryptedAt,
    })),
  };
  if (requestingUser && requestingUser.role === 'recipient') {
    const mine = doc.recipients.find((r) => String(r.recipient?._id || r.recipient) === String(requestingUser._id));
    obj.myStatus = mine ? mine.status : null;
  }
  return obj;
}

module.exports = { uploadDocument, assignRecipients, listDocuments, getDocument, decryptDocument, getDocumentProvenance };
