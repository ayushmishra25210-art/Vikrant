module.exports = {
  ROLES: {
    ADMIN: 'admin',
    RECIPIENT: 'recipient',
  },
  CLASSIFICATIONS: ['UNCLASSIFIED', 'RESTRICTED', 'CONFIDENTIAL', 'SECRET'],
  DOCUMENT_STATUS: {
    PENDING: 'pending',
    DECRYPTED: 'decrypted',
  },
  LEDGER_GENESIS_SEED: process.env.LEDGER_GENESIS_SEED || 'SIH-CRYPTO-PROVENANCE-GENESIS-BLOCK',
};
