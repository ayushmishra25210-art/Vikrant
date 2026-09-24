require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const connectDB = require('../config/db');
const { sequelize, User, Document, DocumentRecipient, Ledger } = require('../models');
const cryptoService = require('../services/cryptoService');
const pdfService = require('../services/pdfService');
const ledgerService = require('../services/ledgerService');
const attributionService = require('../services/attributionService');

const ENCRYPTED_DIR = path.join(__dirname, '..', '..', 'uploads', 'encrypted');
if (!fs.existsSync(ENCRYPTED_DIR)) fs.mkdirSync(ENCRYPTED_DIR, { recursive: true });

const ADMIN_PASSWORD = 'Admin@123';
const RECIPIENT_PASSWORD = 'Recipient@123';

async function makeSamplePdf(title, bodyLines, classification) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({ x: 0, y: 792, width: 595, height: 50, color: rgb(0.043, 0.239, 0.569) });
  page.drawText('GOVERNMENT OF INDIA', { x: 40, y: 812, size: 16, font: boldFont, color: rgb(1, 1, 1) });
  page.drawText(classification, { x: 40, y: 760, size: 11, font: boldFont, color: rgb(0.7, 0.1, 0.1) });
  page.drawText(title, { x: 40, y: 730, size: 18, font: boldFont, color: rgb(0.05, 0.05, 0.1) });

  let y = 690;
  for (const line of bodyLines) {
    page.drawText(line, { x: 40, y, size: 11, font, color: rgb(0.15, 0.15, 0.15) });
    y -= 20;
  }

  page.drawText('This document is the property of the Government of India and is intended solely', {
    x: 40, y: 100, size: 9, font, color: rgb(0.4, 0.4, 0.4),
  });
  page.drawText('for the named recipient(s). Unauthorized disclosure is a punishable offence.', {
    x: 40, y: 85, size: 9, font, color: rgb(0.4, 0.4, 0.4),
  });

  return pdfDoc.save();
}

async function createUser({ employeeId, phoneNumber, name, designation, department, role, password }) {
  const rsa = cryptoService.generateRSAKeyPair();
  const ed = cryptoService.generateEd25519KeyPair();
  const passwordHash = await bcrypt.hash(password, 10);

  return User.create({
    employeeId,
    phoneNumber,
    name,
    designation,
    department,
    role,
    passwordHash,
    rsaPublicKey: rsa.publicKey,
    rsaPrivateKey: rsa.privateKey,
    edPublicKey: ed.publicKey,
    edPrivateKey: ed.privateKey,
  });
}

async function encryptAndStore({ pdfBytes, filename, classification, description, uploader, recipients }) {
  const hash = cryptoService.sha256Hex(pdfBytes);
  const { key: aesKey, iv, authTag, encryptedData } = cryptoService.aesEncrypt(Buffer.from(pdfBytes));

  const encryptedFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.enc`;
  const encryptedPath = path.join(ENCRYPTED_DIR, encryptedFilename);
  fs.writeFileSync(encryptedPath, encryptedData);

  const adminEncryptedAESKey = cryptoService.rsaWrapKey(uploader.rsaPublicKey, aesKey);

  const document = await Document.create({
    filename: encryptedFilename,
    originalName: filename,
    description,
    classification,
    uploaderId: uploader.id,
    hash,
    fileSize: pdfBytes.length,
    encryptedPath,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    adminEncryptedAESKey,
  });

  await DocumentRecipient.bulkCreate(
    recipients.map((r) => ({
      documentId: document.id,
      recipientId: r.id,
      encryptedAESKey: cryptoService.rsaWrapKey(r.rsaPublicKey, aesKey),
      status: 'pending',
    }))
  );

  return { document, aesKey };
}

// Simulates a real recipient decrypting a document, so the demo ledger contains
// genuine, independently-verifiable signed entries (not fabricated placeholders).
async function simulateDecryption(document, recipient, deviceLabel) {
  const assignment = await DocumentRecipient.findOne({ where: { documentId: document.id, recipientId: recipient.id } });
  const aesKey = cryptoService.rsaUnwrapKey(recipient.rsaPrivateKey, assignment.encryptedAESKey);
  const encryptedData = fs.readFileSync(document.encryptedPath);
  const plaintext = cryptoService.aesDecrypt({
    encryptedData,
    key: aesKey,
    iv: Buffer.from(document.iv, 'base64'),
    authTag: Buffer.from(document.authTag, 'base64'),
  });

  const deviceId = `DEV-${cryptoService.sha256Hex(deviceLabel).slice(0, 16).toUpperCase()}`;

  const token = attributionService.createAttributionToken({
    recipientId: recipient.id,
    employeeId: recipient.employeeId,
    documentId: document.id,
    documentHash: document.hash,
    deviceId,
    edPrivateKey: recipient.edPrivateKey,
  });

  await pdfService.embedHiddenMetadata(plaintext, token); // validated for correctness, output not persisted in seed

  await ledgerService.appendEntry({
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

  return token;
}

async function main() {
  await connectDB();

  console.log('[SEED] Dropping and recreating tables (users, documents, document_recipients, ledger_entries)...');
  // force: true drops each table and recreates it from the current model
  // definitions — the Postgres equivalent of the old deleteMany({}) sweep,
  // and also what actually creates the schema on a brand-new database.
  await sequelize.sync({ force: true });
  fs.readdirSync(ENCRYPTED_DIR).forEach((f) => fs.unlinkSync(path.join(ENCRYPTED_DIR, f)));
  if (fs.existsSync(ledgerService.LEDGER_JSON_PATH)) fs.unlinkSync(ledgerService.LEDGER_JSON_PATH);

  console.log('[SEED] Creating users (generating RSA-4096 + Ed25519 keypairs, this takes a few seconds)...');
  const admin = await createUser({
    employeeId: 'EMP001',
    phoneNumber: '9876543201',
    name: 'Rajesh Kumar Sharma',
    designation: 'Under Secretary',
    department: 'National Informatics Centre',
    role: 'admin',
    password: ADMIN_PASSWORD,
  });

  const recipient1 = await createUser({
    employeeId: 'EMP101',
    phoneNumber: '9876543202',
    name: 'Anita Desai',
    designation: 'Section Officer',
    department: 'Ministry of Electronics & IT',
    role: 'recipient',
    password: RECIPIENT_PASSWORD,
  });
  const recipient2 = await createUser({
    employeeId: 'EMP102',
    phoneNumber: '9876543203',
    name: 'Vikram Singh Rathore',
    designation: 'Deputy Director',
    department: 'Ministry of Home Affairs',
    role: 'recipient',
    password: RECIPIENT_PASSWORD,
  });
  const recipient3 = await createUser({
    employeeId: 'EMP103',
    phoneNumber: '9876543204',
    name: 'Priya Nair',
    designation: 'Assistant Director',
    department: 'Ministry of Defence',
    role: 'recipient',
    password: RECIPIENT_PASSWORD,
  });

  console.log('[SEED] Creating and encrypting sample documents...');

  const doc1Bytes = await makeSamplePdf(
    'National Cyber Security Policy - Draft Review',
    ['Reference No: NCSP/2026/0417', 'Subject: Draft policy circulated for inter-ministerial review.', 'Please submit comments within 15 working days.'],
    'CONFIDENTIAL'
  );
  const doc2Bytes = await makeSamplePdf(
    'Border Infrastructure Development Report Q2',
    ['Reference No: BIDR/2026/0092', 'Subject: Quarterly progress report on border road infrastructure.', 'For restricted internal circulation only.'],
    'SECRET'
  );
  const doc3Bytes = await makeSamplePdf(
    'Defence Procurement Tender Evaluation Summary',
    ['Reference No: DPTES/2026/1183', 'Subject: Technical evaluation summary of tender bids.', 'Not for public disclosure prior to award.'],
    'SECRET'
  );
  const doc4Bytes = await makeSamplePdf(
    'Digital Governance Framework Circular',
    ['Reference No: DGFC/2026/0056', 'Subject: Revised framework for e-Governance service delivery.', 'Circulated for implementation by all departments.'],
    'RESTRICTED'
  );
  const doc5Bytes = await makeSamplePdf(
    'Inter-Departmental Budget Allocation Memo',
    ['Reference No: IDBAM/2026/0271', 'Subject: Budget allocation memo for FY 2026-27.', 'Confidential — for authorised recipients only.'],
    'CONFIDENTIAL'
  );

  const { document: doc1 } = await encryptAndStore({
    pdfBytes: doc1Bytes,
    filename: 'National-Cyber-Security-Policy-Draft.pdf',
    classification: 'CONFIDENTIAL',
    description: 'Draft policy document circulated for inter-ministerial review and comment.',
    uploader: admin,
    recipients: [recipient1, recipient2],
  });

  const { document: doc2 } = await encryptAndStore({
    pdfBytes: doc2Bytes,
    filename: 'Border-Infrastructure-Report-Q2.pdf',
    classification: 'SECRET',
    description: 'Quarterly progress report on border road infrastructure development.',
    uploader: admin,
    recipients: [recipient2],
  });

  const { document: doc3 } = await encryptAndStore({
    pdfBytes: doc3Bytes,
    filename: 'Defence-Procurement-Tender-Evaluation.pdf',
    classification: 'SECRET',
    description: 'Technical evaluation summary of defence procurement tender bids.',
    uploader: admin,
    recipients: [recipient3],
  });

  const { document: doc4 } = await encryptAndStore({
    pdfBytes: doc4Bytes,
    filename: 'Digital-Governance-Framework-Circular.pdf',
    classification: 'RESTRICTED',
    description: 'Revised framework circular for e-Governance service delivery.',
    uploader: admin,
    recipients: [recipient1, recipient2, recipient3],
  });

  const { document: doc5 } = await encryptAndStore({
    pdfBytes: doc5Bytes,
    filename: 'Inter-Departmental-Budget-Allocation-Memo.pdf',
    classification: 'CONFIDENTIAL',
    description: 'Budget allocation memo for the upcoming financial year.',
    uploader: admin,
    recipients: [recipient1],
  });

  console.log('[SEED] Simulating sample decryption + attribution events for the ledger...');
  await simulateDecryption(doc1, recipient1, 'seed-device-anita-laptop');
  await simulateDecryption(doc1, recipient2, 'seed-device-vikram-desktop');
  await simulateDecryption(doc2, recipient2, 'seed-device-vikram-desktop');
  await simulateDecryption(doc4, recipient3, 'seed-device-priya-tablet');
  await simulateDecryption(doc5, recipient1, 'seed-device-anita-laptop');

  const verification = await ledgerService.verifyChain();
  console.log(`[SEED] Ledger chain built: ${verification.totalEntries} entries, valid: ${verification.valid}`);

  console.log('\n=================================================================');
  console.log(' SEED COMPLETE — Sample credentials');
  console.log('=================================================================');
  console.log(` Admin      : EMP001 / ${ADMIN_PASSWORD}`);
  console.log(` Recipient  : EMP101 / ${RECIPIENT_PASSWORD}  (Anita Desai)`);
  console.log(` Recipient  : EMP102 / ${RECIPIENT_PASSWORD}  (Vikram Singh Rathore)`);
  console.log(` Recipient  : EMP103 / ${RECIPIENT_PASSWORD}  (Priya Nair)`);
  console.log('=================================================================\n');
}

module.exports = { run: main };

// Only auto-run + exit the process when this file is executed directly
// (`npm run seed`). When required as a module instead (e.g. server.js
// optionally seeding on boot on a host with no interactive shell), the
// caller owns the process lifecycle — calling process.exit(0) here would
// kill the web server right after it finished booting.
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[SEED] Failed:', err);
      process.exit(1);
    });
}
