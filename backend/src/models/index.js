const { sequelize } = require('../config/db');
const User = require('./User');
const Document = require('./Document');
const DocumentRecipient = require('./DocumentRecipient');
const Ledger = require('./Ledger');

// --- Associations -----------------------------------------------------------

// A document's uploader (admin who encrypted + stored it).
User.hasMany(Document, { as: 'uploadedDocuments', foreignKey: 'uploaderId' });
Document.belongsTo(User, { as: 'uploader', foreignKey: 'uploaderId' });

// Per-recipient assignment rows (replaces the old embedded recipients[] array).
Document.hasMany(DocumentRecipient, { as: 'recipients', foreignKey: 'documentId' });
DocumentRecipient.belongsTo(Document, { as: 'document', foreignKey: 'documentId' });

User.hasMany(DocumentRecipient, { as: 'assignments', foreignKey: 'recipientId' });
DocumentRecipient.belongsTo(User, { as: 'recipient', foreignKey: 'recipientId' });

// Provenance ledger entries.
Document.hasMany(Ledger, { as: 'ledgerEntries', foreignKey: 'documentId' });
Ledger.belongsTo(Document, { as: 'document', foreignKey: 'documentId' });

User.hasMany(Ledger, { as: 'decryptionEvents', foreignKey: 'recipientId' });
Ledger.belongsTo(User, { as: 'recipient', foreignKey: 'recipientId' });

module.exports = { sequelize, User, Document, DocumentRecipient, Ledger };
