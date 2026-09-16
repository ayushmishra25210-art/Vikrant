const { Op } = require('sequelize');
const { Ledger, User, Document } = require('../models');
const ledgerService = require('../services/ledgerService');
const asyncHandler = require('../utils/asyncHandler');

// GET /ledger — full chain with search, filters and pagination (also serves the Audit page)
const getLedger = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
  const { search, recipientId, documentId, from, to } = req.query;

  const where = {};
  if (recipientId) where.recipientId = recipientId;
  if (documentId) where.documentId = documentId;
  if (from || to) {
    where.timestamp = {};
    if (from) where.timestamp[Op.gte] = new Date(from);
    if (to) where.timestamp[Op.lte] = new Date(to);
  }

  // Fetch full verification once so per-entry chain status can be attached below.
  const verification = await ledgerService.verifyChain();
  const validityByToken = new Map(verification.report.map((r) => [r.tokenId, r.valid]));

  let entries = await Ledger.findAll({
    where,
    order: [['sequence', 'DESC']],
    include: [
      { model: User, as: 'recipient', attributes: ['id', 'employeeId', 'name'] },
      { model: Document, as: 'document', attributes: ['id', 'originalName', 'classification', 'hash'] },
    ],
  });

  if (search) {
    const term = search.toLowerCase();
    entries = entries.filter((e) => {
      return (
        e.tokenId?.toLowerCase().includes(term) ||
        e.recipient?.employeeId?.toLowerCase().includes(term) ||
        e.recipient?.name?.toLowerCase().includes(term) ||
        e.document?.originalName?.toLowerCase().includes(term) ||
        e.deviceId?.toLowerCase().includes(term)
      );
    });
  }

  const total = entries.length;
  const paged = entries.slice((page - 1) * limit, page * limit);

  res.json({
    chainValid: verification.valid,
    totalEntries: total,
    genesisHash: verification.genesisHash,
    page,
    limit,
    entries: paged.map((e) => ({
      sequence: e.sequence,
      previousHash: e.previousHash,
      currentHash: e.currentHash,
      tokenId: e.tokenId,
      recipient: e.recipient ? { id: e.recipient.id, employeeId: e.recipient.employeeId, name: e.recipient.name } : null,
      document: e.document ? { id: e.document.id, name: e.document.originalName, classification: e.document.classification } : null,
      documentHash: e.documentHash,
      deviceId: e.deviceId,
      nonce: e.nonce,
      signature: e.signature,
      timestamp: e.timestamp,
      ledgerStatus: validityByToken.get(e.tokenId) ? 'verified' : 'broken',
    })),
  });
});

// GET /ledger/verify — on-demand full chain integrity re-verification
const verifyLedger = asyncHandler(async (req, res) => {
  const result = await ledgerService.verifyChain();
  res.json(result);
});

module.exports = { getLedger, verifyLedger };
