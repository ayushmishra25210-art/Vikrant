const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    employeeId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'employee_id',
      set(value) {
        this.setDataValue('employeeId', String(value).trim().toUpperCase());
      },
    },
    name: { type: DataTypes.STRING, allowNull: false },
    designation: { type: DataTypes.STRING, defaultValue: '' },
    department: { type: DataTypes.STRING, defaultValue: 'National Informatics Centre' },
    role: { type: DataTypes.ENUM('admin', 'recipient'), allowNull: false },
    passwordHash: { type: DataTypes.STRING, allowNull: false, field: 'password_hash' },

    // RSA-4096 keypair — used to wrap/unwrap the per-document AES-256 key for this user.
    rsaPublicKey: { type: DataTypes.TEXT, allowNull: false, field: 'rsa_public_key' },
    rsaPrivateKey: { type: DataTypes.TEXT, allowNull: false, field: 'rsa_private_key' }, // demo only: normally held client-side / in an HSM

    // Ed25519 keypair — used to sign attribution tokens and ledger entries.
    edPublicKey: { type: DataTypes.TEXT, allowNull: false, field: 'ed_public_key' },
    edPrivateKey: { type: DataTypes.TEXT, allowNull: false, field: 'ed_private_key' }, // demo only

    lastLoginAt: { type: DataTypes.DATE, field: 'last_login_at' },
  },
  {
    tableName: 'users',
  }
);

User.prototype.toSafeJSON = function toSafeJSON() {
  return {
    id: this.id,
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

module.exports = User;
