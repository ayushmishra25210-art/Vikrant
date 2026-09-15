const Ledger = require('../models/Ledger');
const ledgerService = require('../services/ledgerService');
const asyncHandler = require('../utils/asyncHandler');

// GET /ledger — full chain with search, filters and pagination (also serves the Audit page)
const getLedger = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
  const { search, recipientId, documentId, from, to } = req.query;

  const filter = {};
  if (recipientId) filter.recipientId = recipientId;
  if (documentId) filter.documentId = documentId;
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to) filter.timestamp.$lte = new Date(to);
  }

  // Fetch full verification once so per-entry chain status can be attached below.
  const verification = await ledgerService.verifyChain();
  const validityByToken = new Map(verification.report.map((r) => [r.tokenId, r.valid]));

  let entriesQuery = Ledger.find(filter)
    .sort({ sequence: -1 })
    .populate('recipientId', 'employeeId name')
    .populate('documentId', 'originalName classification hash');

  let entries = await entriesQuery;

  if (search) {
    const term = search.toLowerCase();
    entries = entries.filter((e) => {
      return (
        e.tokenId?.toLowerCase().includes(term) ||
        e.recipientId?.employeeId?.toLowerCase().includes(term) ||
        e.recipientId?.name?.toLowerCase().includes(term) ||
        e.documentId?.originalName?.toLowerCase().includes(term) ||
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
      recipient: e.recipientId ? { id: e.recipientId._id, employeeId: e.recipientId.employeeId, name: e.recipientId.name } : null,
      document: e.documentId ? { id: e.documentId._id, name: e.documentId.originalName, classification: e.documentId.classification } : null,
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
