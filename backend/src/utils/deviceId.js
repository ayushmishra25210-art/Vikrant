const crypto = require('crypto');

// Derives a stable pseudo Device ID from request headers (User-Agent + client IP),
// simulating device fingerprinting for the decryption attribution flow.
function deriveDeviceId(req) {
  const ua = req.headers['user-agent'] || 'unknown-agent';
  const ip = req.ip || req.connection?.remoteAddress || 'unknown-ip';
  const providedDeviceId = req.headers['x-device-id'];
  const material = providedDeviceId ? `${providedDeviceId}` : `${ua}|${ip}`;
  return `DEV-${crypto.createHash('sha256').update(material).digest('hex').slice(0, 16).toUpperCase()}`;
}

module.exports = { deriveDeviceId };
