const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    designation: { type: String, default: '' },
    department: { type: String, default: 'National Informatics Centre' },
    role: { type: String, enum: ['admin', 'recipient'], required: true },
    passwordHash: { type: String, required: true },

    // RSA-4096 keypair — used to wrap/unwrap the per-document AES-256 key for this user.
    rsaPublicKey: { type: String, required: true },
    rsaPrivateKey: { type: String, required: true }, // demo only: normally held client-side / in an HSM

    // Ed25519 keypair — used to sign attribution tokens and ledger entries.
    edPublicKey: { type: String, required: true },
    edPrivateKey: { type: String, required: true }, // demo only

    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    employeeId: this.employeeId,
    name: this.name,
    designation: this.designation,
    department: this.department,
    role: this.role,
    rsaPublicKey: this.rsaPublicKey,
    edPublicKey: this.edPublicKey,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
