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

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
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
