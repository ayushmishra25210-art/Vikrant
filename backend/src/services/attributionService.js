const { ed25519Sign, ed25519Verify, generateNonce, generateTokenId, sha256Hex } = require('./cryptoService');

/**
 * Builds and signs the cryptographic attribution token generated at the moment
 * a recipient decrypts a document. The token binds RecipientID + DocumentHash +
 * Timestamp + DeviceID + Nonce together, and is signed with the recipient's
 * Ed25519 private key so the attribution is non-repudiable.
 */
function createAttributionToken({ recipientId, employeeId, documentId, documentHash, deviceId, edPrivateKey }) {
  const tokenId = generateTokenId();
  const timestamp = new Date().toISOString();
  const nonce = generateNonce();

  const tokenBody = {
    tokenId,
    recipientId: String(recipientId),
    employeeId,
    documentId: String(documentId),
    documentHash,
    timestamp,
    deviceId,
    nonce,
  };

  // Canonical string of the token body is what gets signed and hashed.
  const canonical = JSON.stringify(tokenBody);
  const tokenHash = sha256Hex(canonical);
  const signature = ed25519Sign(edPrivateKey, tokenHash);

  return { ...tokenBody, tokenHash, signature };
}

function verifyAttributionToken(token, edPublicKey) {
  const { signature, tokenHash, ...body } = token;
  const canonical = JSON.stringify(body);
  const recomputedHash = sha256Hex(canonical);
  const hashMatches = recomputedHash === tokenHash;
  const signatureValid = ed25519Verify(edPublicKey, tokenHash, signature);
  return { valid: hashMatches && signatureValid, hashMatches, signatureValid };
}

module.exports = { createAttributionToken, verifyAttributionToken };
