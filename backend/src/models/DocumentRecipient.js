const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Join table between Document and User (recipient). Replaces what was an
// embedded `recipients[]` subdocument array in the original MongoDB schema —
// PostgreSQL is relational, so each assignment becomes its own row instead of
// living inside the document's own record.
const DocumentRecipient = sequelize.define(
  'DocumentRecipient',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    documentId: { type: DataTypes.UUID, allowNull: false, field: 'document_id' },
    recipientId: { type: DataTypes.UUID, allowNull: false, field: 'recipient_id' },
    // AES-256 content key, RSA-OAEP-4096 encrypted with this recipient's public key (base64)
    encryptedAESKey: { type: DataTypes.TEXT, allowNull: false, field: 'encrypted_aes_key' },
    status: { type: DataTypes.ENUM('pending', 'decrypted'), defaultValue: 'pending' },
    decryptedAt: { type: DataTypes.DATE, field: 'decrypted_at' },
    assignedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'assigned_at' },
  },
  {
    tableName: 'document_recipients',
    indexes: [{ unique: true, fields: ['document_id', 'recipient_id'] }],
  }
);

module.exports = DocumentRecipient;
