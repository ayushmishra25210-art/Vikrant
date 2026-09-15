const crypto = require('crypto');

/**
 * Core cryptographic primitives for the system.
 *
 * Content confidentiality : AES-256-GCM (authenticated symmetric encryption)
 * Key protection per user  : RSA-4096 with OAEP-SHA256 padding (wraps the AES key)
 * Attribution / integrity : Ed25519 digital signatures (attribution tokens + ledger entries)
 * Integrity hashing        : SHA-256
 */

// ---------- Hashing ----------

function sha256Hex(bufferOrString) {
  return crypto.createHash('sha256').update(bufferOrString).digest('hex');
}

// ---------- Key generation ----------

function generateRSAKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey, privateKey };
}

function generateEd25519KeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey, privateKey };
}

// ---------- AES-256-GCM (document content encryption) ----------

function aesEncrypt(plaintextBuffer) {
  const key = crypto.randomBytes(32); // AES-256 content key
  const iv = crypto.randomBytes(12); // 96-bit GCM nonce
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintextBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { key, iv, authTag, encryptedData: encrypted };
}

function aesDecrypt({ encryptedData, key, iv, authTag }) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
}

// ---------- RSA-OAEP (per-recipient AES key wrapping) ----------

function rsaWrapKey(recipientPublicKeyPem, aesKeyBuffer) {
  const wrapped = crypto.publicEncrypt(
    { key: recipientPublicKeyPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    aesKeyBuffer
  );
  return wrapped.toString('base64');
}

function rsaUnwrapKey(recipientPrivateKeyPem, wrappedBase64) {
  const wrapped = Buffer.from(wrappedBase64, 'base64');
  return crypto.privateDecrypt(
    { key: recipientPrivateKeyPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    wrapped
  );
}

// ---------- Ed25519 (signing) ----------

function ed25519Sign(privateKeyPem, dataBufferOrString) {
  const data = Buffer.isBuffer(dataBufferOrString) ? dataBufferOrString : Buffer.from(dataBufferOrString);
  return crypto.sign(null, data, privateKeyPem).toString('base64');
}

function ed25519Verify(publicKeyPem, dataBufferOrString, signatureBase64) {
  const data = Buffer.isBuffer(dataBufferOrString) ? dataBufferOrString : Buffer.from(dataBufferOrString);
  try {
    return crypto.verify(null, data, publicKeyPem, Buffer.from(signatureBase64, 'base64'));
  } catch (err) {
    return false;
  }
}

function generateNonce(byteLength = 16) {
  return crypto.randomBytes(byteLength).toString('hex');
}

function generateTokenId() {
  return `TOK-${crypto.randomBytes(12).toString('hex').toUpperCase()}`;
}

module.exports = {
  sha256Hex,
  generateRSAKeyPair,
  generateEd25519KeyPair,
  aesEncrypt,
  aesDecrypt,
  rsaWrapKey,
  rsaUnwrapKey,
  ed25519Sign,
  ed25519Verify,
  generateNonce,
  generateTokenId,
};
