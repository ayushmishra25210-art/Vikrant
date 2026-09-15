const User = require('../models/User');
const Document = require('../models/Document');
const Ledger = require('../models/Ledger');
const asyncHandler = require('../utils/asyncHandler');

const listRecipients = asyncHandler(async (req, res) => {
  const recipients = await User.find({ role: 'recipient' }).select('employeeId name designation department createdAt');
  res.json({ recipients });
});

// GET /recipient/:id/history — every ledger (decryption/attribution) event for one recipient
const getRecipientHistory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: 'Recipient not found.' });

  const entries = await Ledger.find({ recipientId: id })
    .sort({ sequence: -1 })
    .populate('documentId', 'originalName classification hash');

  res.json({
    recipient: { id: user._id, employeeId: user.employeeId, name: user.name },
    history: entries.map((e) => ({
      sequence: e.sequence,
      tokenId: e.tokenId,
      document: e.documentId
        ? { id: e.documentId._id, name: e.documentId.originalName, classification: e.documentId.classification }
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
