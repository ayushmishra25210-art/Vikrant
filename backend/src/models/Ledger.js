const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Append-only provenance ledger. Each entry is chained to the previous entry via
// previousHash -> currentHash, and signed with the acting recipient's Ed25519 key.
// Mutating any historical entry changes its currentHash, which breaks the chain
// for every entry recorded after it — this is what verifyChain() detects.
const Ledger = sequelize.define(
  'Ledger',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sequence: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    previousHash: { type: DataTypes.STRING, allowNull: false, field: 'previous_hash' },
    currentHash: { type: DataTypes.STRING, allowNull: false, field: 'current_hash' },

    recipientId: { type: DataTypes.UUID, allowNull: false, field: 'recipient_id' },
    documentId: { type: DataTypes.UUID, allowNull: false, field: 'document_id' },
    tokenId: { type: DataTypes.STRING, allowNull: false, unique: true, field: 'token_id' },
    documentHash: { type: DataTypes.STRING, allowNull: false, field: 'document_hash' },
    deviceId: { type: DataTypes.STRING, allowNull: false, field: 'device_id' },
    nonce: { type: DataTypes.STRING, allowNull: false },

    signature: { type: DataTypes.TEXT, allowNull: false }, // Ed25519 signature (base64) over currentHash
    signerPublicKey: { type: DataTypes.TEXT, allowNull: false, field: 'signer_public_key' }, // recipient's Ed25519 public key at signing time

    timestamp: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'ledger_entries',
  }
);

module.exports = Ledger;
