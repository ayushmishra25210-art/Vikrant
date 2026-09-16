const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Document = sequelize.define(
  'Document',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    filename: { type: DataTypes.STRING, allowNull: false },
    originalName: { type: DataTypes.STRING, allowNull: false, field: 'original_name' },
    description: { type: DataTypes.TEXT, defaultValue: '' },
    classification: {
      type: DataTypes.ENUM('UNCLASSIFIED', 'RESTRICTED', 'CONFIDENTIAL', 'SECRET'),
      defaultValue: 'CONFIDENTIAL',
    },
    uploaderId: { type: DataTypes.UUID, allowNull: false, field: 'uploader_id' },

    // SHA-256 hash of the ORIGINAL plaintext PDF (pre-encryption). Used for leak matching later.
    hash: { type: DataTypes.STRING, allowNull: false },
    fileSize: { type: DataTypes.BIGINT, allowNull: false, field: 'file_size' },

    encryptedPath: { type: DataTypes.STRING, allowNull: false, field: 'encrypted_path' },
    iv: { type: DataTypes.STRING, allowNull: false }, // AES-GCM IV, base64
    authTag: { type: DataTypes.STRING, allowNull: false, field: 'auth_tag' }, // AES-GCM auth tag, base64

    // AES content key, RSA-wrapped with the UPLOADER's own public key. Lets the
    // admin assign additional recipients later without re-uploading the file.
    adminEncryptedAESKey: { type: DataTypes.TEXT, allowNull: false, field: 'admin_encrypted_aes_key' },

    uploadTime: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'upload_time' },
  },
  {
    tableName: 'documents',
  }
);

module.exports = Document;
