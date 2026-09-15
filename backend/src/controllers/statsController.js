const Document = require('../models/Document');
const User = require('../models/User');
const Ledger = require('../models/Ledger');
const asyncHandler = require('../utils/asyncHandler');

// GET /dashboard/stats — admin summary cards + recent activity table
const getAdminStats = asyncHandler(async (req, res) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [documentsUploaded, activeRecipients, todaysDecryptions, provenanceRecords, recentEntries] = await Promise.all([
    Document.countDocuments(),
    User.countDocuments({ role: 'recipient' }),
    Ledger.countDocuments({ timestamp: { $gte: startOfToday } }),
    Ledger.countDocuments(),
    Ledger.find()
      .sort({ sequence: -1 })
      .limit(10)
      .populate('recipientId', 'employeeId name')
      .populate('documentId', 'originalName classification'),
  ]);

  res.json({
    cards: {
      documentsUploaded,
      activeRecipients,
      todaysDecryptions,
      provenanceRecords,
    },
    recentActivity: recentEntries.map((e) => ({
      sequence: e.sequence,
      tokenId: e.tokenId,
      recipient: e.recipientId ? `${e.recipientId.name} (${e.recipientId.employeeId})` : 'Unknown',
      document: e.documentId ? e.documentId.originalName : 'Unknown',
      classification: e.documentId ? e.documentId.classification : '-',
      timestamp: e.timestamp,
      deviceId: e.deviceId,
    })),
  });
});

// GET /dashboard/recipient-stats — recipient-facing summary
const getRecipientStats = asyncHandler(async (req, res) => {
  const recipientId = req.user._id;
  const documents = await Document.find({ 'recipients.recipient': recipientId });
  const assigned = documents.length;
  const decrypted = documents.filter((d) =>
    d.recipients.some((r) => String(r.recipient) === String(recipientId) && r.status === 'decrypted')
  ).length;
  const pending = assigned - decrypted;

  const myLedgerCount = await Ledger.countDocuments({ recipientId });

  res.json({
    cards: {
      assignedDocuments: assigned,
      decryptedDocuments: decrypted,
      pendingDocuments: pending,
      myProvenanceRecords: myLedgerCount,
    },
  });
});

module.exports = { getAdminStats, getRecipientStats };
