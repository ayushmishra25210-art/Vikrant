const mongoose = require('mongoose');

// Append-only provenance ledger. Each entry is chained to the previous entry via
// previousHash -> currentHash, and signed with the acting recipient's Ed25519 key.
// Mutating any historical entry changes its currentHash, which breaks the chain
// for every entry recorded after it — this is what verifyChain() detects.
const ledgerSchema = new mongoose.Schema(
  {
    sequence: { type: Number, required: true, unique: true },
    previousHash: { type: String, required: true },
    currentHash: { type: String, required: true },

    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    tokenId: { type: String, required: true, unique: true },
    documentHash: { type: String, required: true },
    deviceId: { type: String, required: true },
    nonce: { type: String, required: true },

    signature: { type: String, required: true }, // Ed25519 signature (base64) over currentHash
    signerPublicKey: { type: String, required: true }, // recipient's Ed25519 public key at signing time

    timestamp: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ledger', ledgerSchema);
