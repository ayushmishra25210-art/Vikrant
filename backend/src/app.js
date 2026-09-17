const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const ledgerRoutes = require('./routes/ledgerRoutes');
const verifyRoutes = require('./routes/verifyRoutes');
const recipientRoutes = require('./routes/recipientRoutes');
const statsRoutes = require('./routes/statsRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Accept any localhost/127.0.0.1 origin regardless of port, PLUS any
// *.vercel.app deployment (Vercel assigns an unpredictable subdomain per
// preview build, so there's no single fixed URL to pin to), PLUS whatever
// FRONTEND_ORIGIN is explicitly set to. Vite also auto-increments to the
// next free port (5174, 5175, ...) whenever 5173 is already taken by another
// running instance, so pinning CORS to one exact localhost origin is brittle
// in local dev — a mismatched port here silently blocks every API call, and
// the only symptom is a generic "network error" with no useful message in
// the browser.
const LOCALHOST_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const VERCEL_ORIGIN_PATTERN = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;

app.use(
  cors({
    origin(origin, callback) {
      const isAllowed =
        !origin || // curl, same-origin, server-to-server — no Origin header at all
        LOCALHOST_ORIGIN_PATTERN.test(origin) ||
        VERCEL_ORIGIN_PATTERN.test(origin) ||
        origin === process.env.FRONTEND_ORIGIN;
      callback(null, isAllowed);
    },
    exposedHeaders: ['X-Token-Id', 'X-Ledger-Sequence', 'X-Integrity-Ok', 'X-Device-Id'],
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'sih-crypto-provenance-backend', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/verify-leak', verifyRoutes);
app.use('/api/recipient', recipientRoutes);
app.use('/api/dashboard', statsRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use(errorHandler);

module.exports = app;
