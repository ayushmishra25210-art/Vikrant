require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  // Creates any missing tables (users, documents, document_recipients,
  // ledger_entries) on first run. Never drops or alters existing tables here —
  // that's what `npm run seed` (sync({ force: true })) is for, run explicitly.
  await sequelize.sync();
  app.listen(PORT, () => {
    console.log(`[SERVER] Cryptographic Attribution & Provenance API running on http://localhost:${PORT}`);
  });
}

start();
