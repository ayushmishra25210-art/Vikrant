const { Sequelize } = require('sequelize');

// Accepts either a single DATABASE_URL, or discrete PG* parts (handy when a
// password contains characters that are awkward to URL-encode). Falls back to
// a local default matching the standard Homebrew/apt PostgreSQL install with
// no password, so `createdb sih_crypto_provenance` + npm run seed just works.
const connectionString =
  process.env.DATABASE_URL ||
  `postgres://${process.env.PGUSER || process.env.USER || 'postgres'}${
    process.env.PGPASSWORD ? `:${process.env.PGPASSWORD}` : ''
  }@${process.env.PGHOST || '127.0.0.1'}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'sih_crypto_provenance'}`;

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  logging: false,
  define: {
    underscored: true, // snake_case columns (employee_id, created_at, ...) — idiomatic Postgres
  },
});

async function connectDB() {
  try {
    await sequelize.authenticate();
    const { host, port, database } = sequelize.config;
    console.log(`[DB] PostgreSQL connected: ${host}:${port}/${database}`);
  } catch (err) {
    console.error('[DB] PostgreSQL connection error:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
module.exports.sequelize = sequelize;
