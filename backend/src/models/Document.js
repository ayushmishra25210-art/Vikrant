const mongoose = require('mongoose');

const recipientAssignmentSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // AES-256 content key, RSA-OAEP-4096 encrypted with this recipient's public key (base64)
    encryptedAESKey: { type: String, required: true },
    status: { type: String, enum: ['pending', 'decrypted'], default: 'pending' },
    decryptedAt: { type: Date },
    assignedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    description: { type: String, default: '' },
    classification: {
      type: String,
      enum: ['UNCLASSIFIED', 'RESTRICTED', 'CONFIDENTIAL', 'SECRET'],
      default: 'CONFIDENTIAL',
    },
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // SHA-256 hash of the ORIGINAL plaintext PDF (pre-encryption). Used for leak matching later.
    hash: { type: String, required: true },
    fileSize: { type: Number, required: true },

    encryptedPath: { type: String, required: true },
    iv: { type: String, required: true }, // AES-GCM IV, base64
    authTag: { type: String, required: true }, // AES-GCM auth tag, base64

    // AES content key, RSA-wrapped with the UPLOADER's own public key. Lets the
    // admin assign additional recipients later without re-uploading the file.
    adminEncryptedAESKey: { type: String, required: true },

    recipients: [recipientAssignmentSchema],

    uploadTime: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', documentSchema);
