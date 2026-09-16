const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { Document, User, DocumentRecipient, Ledger } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const cryptoService = require('../services/cryptoService');
const pdfService = require('../services/pdfService');
const ledgerService = require('../services/ledgerService');
const attributionService = require('../services/attributionService');
const { deriveDeviceId } = require('../utils/deviceId');

const ENCRYPTED_DIR = path.join(__dirname, '..', '..', 'uploads', 'encrypted');
if (!fs.existsSync(ENCRYPTED_DIR)) fs.mkdirSync(ENCRYPTED_DIR, { recursive: true });

// Shared eager-load shape: uploader + each recipient assignment row with its User.
// Replaces Mongoose's .populate('uploader') / .populate('recipients.recipient').
const DOCUMENT_INCLUDES = [
  { model: User, as: 'uploader', attributes: ['id', 'employeeId', 'name'] },
  {
    model: DocumentRecipient,
    as: 'recipients',
    include: [{ model: User, as: 'recipient', attributes: ['id', 'employeeId', 'name'] }],
  },
];

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

  const recipientUsers = recipientEmployeeIds.length
    ? await User.findAll({ where: { employeeId: { [Op.in]: recipientEmployeeIds.map((e) => e.toUpperCase()) }, role: 'recipient' } })
    : [];

  const document = await Document.create({
    filename: encryptedFilename,
    originalName: req.file.originalname,
    description: description || '',
    classification: classification || 'CONFIDENTIAL',
    uploaderId: uploader.id,
    hash,
    fileSize: plaintext.length,
    encryptedPath,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    adminEncryptedAESKey,
  });

  if (recipientUsers.length) {
    await DocumentRecipient.bulkCreate(
      recipientUsers.map((r) => ({
        documentId: document.id,
        recipientId: r.id,
        encryptedAESKey: cryptoService.rsaWrapKey(r.rsaPublicKey, aesKey),
        status: 'pending',
      }))
    );
  }

  const populated = await Document.findByPk(document.id, { include: DOCUMENT_INCLUDES });

  res.status(201).json({ message: 'Document encrypted and stored successfully.', document: serializeDocument(populated) });
});

// POST /documents/:id/assign  (admin only, body: { recipientIds: [employeeId,...] })
const assignRecipients = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { recipientIds } = req.body;
  if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
    return res.status(400).json({ message: 'recipientIds (array of employee IDs) is required.' });
  }

  const document = await Document.findByPk(id);
  if (!document) return res.status(404).json({ message: 'Document not found.' });

  const uploader = await User.findByPk(document.uploaderId);
  const aesKey = cryptoService.rsaUnwrapKey(uploader.rsaPrivateKey, document.adminEncryptedAESKey);

  const users = await User.findAll({ where: { employeeId: { [Op.in]: recipientIds.map((e) => e.toUpperCase()) }, role: 'recipient' } });
  const existingAssignments = await DocumentRecipient.findAll({ where: { documentId: document.id } });
  const alreadyAssigned = new Set(existingAssignments.map((r) => r.recipientId));

  const newRows = [];
  for (const user of users) {
    if (alreadyAssigned.has(user.id)) continue;
    newRows.push({
      documentId: document.id,
      recipientId: user.id,
      encryptedAESKey: cryptoService.rsaWrapKey(user.rsaPublicKey, aesKey),
      status: 'pending',
    });
  }
  if (newRows.length) await DocumentRecipient.bulkCreate(newRows);

  const populated = await Document.findByPk(document.id, { include: DOCUMENT_INCLUDES });
  res.json({ message: `${newRows.length} recipient(s) assigned.`, document: serializeDocument(populated) });
});

// GET /documents  — admin: all documents. recipient: only documents assigned to them.
const listDocuments = asyncHandler(async (req, res) => {
  let where = {};
  if (req.user.role === 'recipient') {
    const assignments = await DocumentRecipient.findAll({ where: { recipientId: req.user.id }, attributes: ['documentId'] });
    where = { id: { [Op.in]: assignments.map((a) => a.documentId) } };
  }
  const documents = await Document.findAll({ where, include: DOCUMENT_INCLUDES, order: [['createdAt', 'DESC']] });

  res.json({ documents: documents.map((d) => serializeDocument(d, req.user)) });
});

// GET /documents/:id
const getDocument = asyncHandler(async (req, res) => {
  const document = await Document.findByPk(req.params.id, { include: DOCUMENT_INCLUDES });
  if (!document) return res.status(404).json({ message: 'Document not found.' });

  if (req.user.role === 'recipient') {
    const isAssigned = document.recipients.some((r) => r.recipientId === req.user.id);
    if (!isAssigned) return res.status(403).json({ message: 'You are not assigned to this document.' });
  }

  res.json({ document: serializeDocument(document, req.user) });
});

// POST /documents/:id/decrypt  (recipient only)
// Performs the full decrypt -> attribute -> embed -> ledger -> return-PDF workflow.
const decryptDocument = asyncHandler(async (req, res) => {
  const document = await Document.findByPk(req.params.id);
  if (!document) return res.status(404).json({ message: 'Document not found.' });

  const assignment = await DocumentRecipient.findOne({ where: { documentId: document.id, recipientId: req.user.id } });
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
    recipientId: recipient.id,
    employeeId: recipient.employeeId,
    documentId: document.id,
    documentHash: document.hash,
    deviceId,
    edPrivateKey: recipient.edPrivateKey,
  });

  // 6. Embed the signed token as hidden metadata (visible page content is untouched)
  const attributedPdfBytes = await pdfService.embedHiddenMetadata(plaintext, token);

  // 7. Append an immutable, chained + signed provenance ledger entry
  const ledgerEntry = await ledgerService.appendEntry({
    recipientId: recipient.id,
    documentId: document.id,
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
  await assignment.save();

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
  const document = await Document.findByPk(req.params.id, { include: DOCUMENT_INCLUDES });
  if (!document) return res.status(404).json({ message: 'Document not found.' });

  const entries = await Ledger.findAll({
    where: { documentId: document.id },
    order: [['sequence', 'ASC']],
    include: [{ model: User, as: 'recipient', attributes: ['id', 'employeeId', 'name'] }],
  });

  res.json({
    document: { id: document.id, name: document.originalName, hash: document.hash, classification: document.classification },
    provenance: entries.map((e) => ({
      sequence: e.sequence,
      tokenId: e.tokenId,
      recipient: e.recipient ? { id: e.recipient.id, employeeId: e.recipient.employeeId, name: e.recipient.name } : null,
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
    id: doc.id,
    filename: doc.originalName,
    description: doc.description,
    classification: doc.classification,
    hash: doc.hash,
    fileSize: doc.fileSize,
    uploader: doc.uploader ? { id: doc.uploader.id, employeeId: doc.uploader.employeeId, name: doc.uploader.name } : null,
    uploadTime: doc.uploadTime,
    recipients: doc.recipients.map((r) => ({
      id: r.recipient?.id,
      employeeId: r.recipient?.employeeId,
      name: r.recipient?.name,
      status: r.status,
      decryptedAt: r.decryptedAt,
    })),
  };
  if (requestingUser && requestingUser.role === 'recipient') {
    const mine = doc.recipients.find((r) => r.recipientId === requestingUser.id);
    obj.myStatus = mine ? mine.status : null;
  }
  return obj;
}

module.exports = { uploadDocument, assignRecipients, listDocuments, getDocument, decryptDocument, getDocumentProvenance };
