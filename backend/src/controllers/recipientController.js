const { User, Ledger, Document } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

const listRecipients = asyncHandler(async (req, res) => {
  const recipients = await User.findAll({
    where: { role: 'recipient' },
    attributes: ['id', 'employeeId', 'name', 'designation', 'department', 'createdAt'],
  });
  res.json({ recipients });
});

// GET /recipient/:id/history — every ledger (decryption/attribution) event for one recipient
const getRecipientHistory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findByPk(id);
  if (!user) return res.status(404).json({ message: 'Recipient not found.' });

  const entries = await Ledger.findAll({
    where: { recipientId: id },
    order: [['sequence', 'DESC']],
    include: [{ model: Document, as: 'document', attributes: ['id', 'originalName', 'classification', 'hash'] }],
  });

  res.json({
    recipient: { id: user.id, employeeId: user.employeeId, name: user.name },
    history: entries.map((e) => ({
      sequence: e.sequence,
      tokenId: e.tokenId,
      document: e.document
        ? { id: e.document.id, name: e.document.originalName, classification: e.document.classification }
        : null,
      documentHash: e.documentHash,
      deviceId: e.deviceId,
      timestamp: e.timestamp,
      currentHash: e.currentHash,
      signature: e.signature,
    })),
  });
});

module.exports = { listRecipients, getRecipientHistory };
