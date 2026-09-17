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

  // Opt-in, for hosts with no interactive shell (e.g. a free-tier PaaS deploy)
  // where `npm run seed` can't be run by hand after the first deploy. Set
  // SEED_ON_BOOT=true for exactly one deploy to wipe and repopulate demo
  // data, then unset it — leaving it on would wipe the ledger/documents on
  // every restart, including free-tier spin-down/up cycles.
  if (process.env.SEED_ON_BOOT === 'true') {
    console.log('[SERVER] SEED_ON_BOOT=true — reseeding demo data before starting...');
    await require('./seed/seed').run();
    console.log('[SERVER] Reseed complete. Remove SEED_ON_BOOT before the next deploy.');
  }

  app.listen(PORT, () => {
    console.log(`[SERVER] Cryptographic Attribution & Provenance API running on http://localhost:${PORT}`);
  });
}

start();
