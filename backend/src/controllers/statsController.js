const { Op } = require('sequelize');
const { Document, User, Ledger, DocumentRecipient } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

// GET /dashboard/stats — admin summary cards + recent activity table
const getAdminStats = asyncHandler(async (req, res) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [documentsUploaded, activeRecipients, todaysDecryptions, provenanceRecords, recentEntries] = await Promise.all([
    Document.count(),
    User.count({ where: { role: 'recipient' } }),
    Ledger.count({ where: { timestamp: { [Op.gte]: startOfToday } } }),
    Ledger.count(),
    Ledger.findAll({
      order: [['sequence', 'DESC']],
      limit: 10,
      include: [
        { model: User, as: 'recipient', attributes: ['id', 'employeeId', 'name'] },
        { model: Document, as: 'document', attributes: ['id', 'originalName', 'classification'] },
      ],
    }),
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
      recipient: e.recipient ? `${e.recipient.name} (${e.recipient.employeeId})` : 'Unknown',
      document: e.document ? e.document.originalName : 'Unknown',
      classification: e.document ? e.document.classification : '-',
      timestamp: e.timestamp,
      deviceId: e.deviceId,
    })),
  });
});

// GET /dashboard/recipient-stats — recipient-facing summary
const getRecipientStats = asyncHandler(async (req, res) => {
  const recipientId = req.user.id;
  const assignments = await DocumentRecipient.findAll({ where: { recipientId } });
  const assigned = assignments.length;
  const decrypted = assignments.filter((a) => a.status === 'decrypted').length;
  const pending = assigned - decrypted;

  const myLedgerCount = await Ledger.count({ where: { recipientId } });

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
