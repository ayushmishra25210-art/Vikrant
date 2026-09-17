# e-Prahari — Cryptographic Attribution & Immutable Decryption Provenance

**Smart India Hackathon Prototype**
*Cryptographic Attribution and Immutable Decryption Provenance for Multi-Recipient Encrypted Document Distribution*

A full-stack MVP demonstrating end-to-end confidential document distribution: AES-256-GCM encryption, per-recipient
RSA-4096 key protection, Ed25519-signed attribution tokens embedded as hidden PDF metadata, an immutable hash-chained
provenance ledger, and a leak-investigation pipeline that traces a leaked document back to the recipient who
decrypted it — all real cryptography, no simulated placeholders.

---

## 1. Project Structure

```
sih-crypto-provenance/
├── backend/                 Express + PostgreSQL API (independent, runs on :5050)
│   ├── src/
│   │   ├── config/          DB connection, constants
│   │   ├── models/          User, Document, DocumentRecipient, Ledger (Sequelize models)
│   │   ├── middleware/      JWT auth, role guard, multer upload, error handler
│   │   ├── controllers/     auth, document, ledger, verify-leak, recipient, stats
│   │   ├── routes/          Express routers per resource
│   │   ├── services/        cryptoService, pdfService, ledgerService, attributionService
│   │   ├── seed/            Seed script — creates demo users, documents & ledger
│   │   └── app.js / server.js
│   ├── uploads/              encrypted/ temp/ decrypted/ (git-ignored contents)
│   └── ledger.json           Mirrored append-only ledger (regenerated on each entry)
├── frontend/                 React (Vite) + Tailwind SPA (independent, runs on :5173)
│   └── src/
│       ├── api/              Axios client with JWT interceptor
│       ├── context/          AuthContext
│       ├── components/       GovNavbar, Sidebar, DataTable, DecryptModal, VerificationReport, Timeline, ...
│       ├── pages/             Login, AdminDashboard, DocumentUpload, DocumentRegistry, DocumentProvenance,
│       │                      Ledger, LeakInvestigation, Audit, RecipientDashboard, RecipientHistory
│       └── routes/            ProtectedRoute (JWT + role-based guard)
├── postman_collection.json   Ready-to-import Postman collection for every API endpoint
├── package.json               Root orchestration scripts (concurrently runs both dev servers)
└── README.md
```

The backend and frontend are fully independent Node projects — each has its own `package.json`, `.env`, and dev
server, and each can be installed/run entirely on its own. The root `package.json` adds nothing but convenience: it
uses [`concurrently`](https://www.npmjs.com/package/concurrently) to start both dev servers with one command and
colour-coded, prefixed log output (`[BACKEND]` / `[FRONTEND]`).

---

## 2. Prerequisites

- Node.js 18+ and npm
- PostgreSQL running locally (or a connection string to a reachable instance)
  - macOS (Homebrew): `brew install postgresql@16 && brew services start postgresql@16`
  - Then create the database: `createdb sih_crypto_provenance`

---

## 3. Setup & Run

### Option A — one command from the repo root (recommended)

```bash
createdb sih_crypto_provenance   # one-time: create the Postgres database (see Prerequisites)
npm run install:all   # installs root, backend and frontend dependencies
cp backend/.env.example backend/.env       # edit DATABASE_URL if your Postgres user/password/port differ
cp frontend/.env.example frontend/.env     # edit if your API base URL differs
npm run seed           # creates all tables, then 1 admin, 3 recipients, 5 documents, sample ledger entries
npm run dev             # starts BOTH servers concurrently — backend :5050, frontend :5173
```

Backend and frontend logs are interleaved in one terminal, each prefixed `[BACKEND]` / `[FRONTEND]` and colour-coded.
Press `Ctrl+C` once to stop both. You can also run just one side with `npm run dev:backend` or `npm run dev:frontend`
from the root.

### Option B — backend and frontend run independently, in separate terminals

#### Backend

```bash
createdb sih_crypto_provenance   # one-time: create the Postgres database
cd backend
npm install
cp .env.example .env      # edit DATABASE_URL if your Postgres user/password/port differ
npm run seed              # creates all tables, then 1 admin, 3 recipients, 5 documents, sample ledger entries
npm run dev                # starts the API on http://localhost:5050
```

> **Note:** the default port is `5050`, not `5000` — macOS reserves `5000` for AirPlay Receiver / Control Center on
> many systems, which conflicts with the common Express default. Change `PORT` in `.env` if you need a different port.

#### Frontend

```bash
cd frontend
npm install
cp .env.example .env       # VITE_API_BASE_URL should point at the backend, e.g. http://localhost:5050/api
npm run dev                 # starts the SPA on http://localhost:5173
```

Open **http://localhost:5173** and sign in with one of the seeded accounts below.

---

## 4. Demo Credentials (seeded automatically)

| Role      | Employee ID | Password        | Name                    |
|-----------|-------------|------------------|-------------------------|
| Admin     | `EMP001`    | `Admin@123`      | Rajesh Kumar Sharma     |
| Recipient | `EMP101`    | `Recipient@123`  | Anita Desai             |
| Recipient | `EMP102`    | `Recipient@123`  | Vikram Singh Rathore    |
| Recipient | `EMP103`    | `Recipient@123`  | Priya Nair              |

Re-running `npm run seed` wipes and recreates all users, documents, encrypted files and the ledger from scratch —
safe to re-run any time before a demo.

---

## 5. End-to-End Workflow (what to demo)

1. **Login as Admin (EMP001)** → Dashboard shows live counts (documents, recipients, today's decryptions, ledger records).
2. **Upload Document** → select a PDF, choose classification, assign recipients → server computes SHA-256, encrypts
   with AES-256-GCM, wraps the AES key separately with each recipient's RSA-4096 public key.
3. **Login as a Recipient (EMP101 / EMP102 / EMP103)** → see assigned documents on the dashboard.
4. **Click Decrypt** → modal shows recipient verification, device fingerprint, timestamp, then generates and signs
   a cryptographic attribution token (Ed25519) and embeds it as **hidden** PDF metadata (visible content untouched).
   A new, chained + signed entry is appended to the immutable provenance ledger. Download the attributed PDF.
5. **Login back as Admin** → **Provenance Ledger** page visualises the hash chain and shows a live integrity
   verification (`chainValid: true/false`), recomputed on every request.
6. **Leak Investigation** → upload the previously downloaded attributed PDF (simulating a leak). The system runs:
   `Extract Metadata → Verify Signature → Compare Hash → Verify Ledger → Recipient Identified`, and displays an
   official verification report naming the responsible recipient, their department and decryption device.
7. **Audit Trail** → searchable, filterable, paginated table of every decryption event with ledger status.

---

## 6. Cryptography — what's real here

| Purpose                                   | Algorithm                              |
|--------------------------------------------|-----------------------------------------|
| Document content encryption               | AES-256-GCM (authenticated)             |
| Per-recipient AES key protection          | RSA-4096 with OAEP-SHA256 padding       |
| Attribution token & ledger entry signing  | Ed25519                                 |
| Integrity hashing (documents & ledger)    | SHA-256                                 |

All of the above use Node's built-in `crypto` module — no mocked or placeholder cryptography. Every recipient and
admin gets a genuine RSA-4096 + Ed25519 keypair generated at seed/creation time. The provenance ledger is an
append-only hash chain (`previousHash → currentHash`), each entry additionally signed by the acting recipient's
Ed25519 key — tampering with any stored field is detected because the chain's stored hash no longer matches a fresh
recomputation, and (if an attacker also updates the hash to hide it) the *next* entry's `previousHash` link breaks.

Hidden attribution metadata is embedded into the PDF's Info dictionary via `pdf-lib`'s low-level `context` API under
a custom, non-rendered key (`XAttributionData`), with a secondary marker mirrored into the standard `Keywords`
field for resilience. No visible watermark is drawn and the rendered page content is byte-identical to the original.

---

## 7. API Reference

Base URL: `http://localhost:5050/api` (see `postman_collection.json` for a ready-to-import collection)

| Method | Endpoint                              | Auth          | Description |
|--------|-----------------------------------------|---------------|-------------|
| POST   | `/auth/login`                          | —             | Login, returns JWT + user |
| GET    | `/auth/me`                             | Any           | Current user |
| POST   | `/documents/upload`                    | Admin         | Encrypt & store a PDF, optionally assign recipients |
| POST   | `/documents/:id/assign`                | Admin         | Assign additional recipients to an existing document |
| POST   | `/documents/:id/decrypt`               | Recipient     | Decrypt, attribute, embed metadata, log to ledger, return PDF |
| GET    | `/documents`                           | Any           | List documents (own assignments for recipients) |
| GET    | `/documents/:id`                       | Any           | Document detail |
| GET    | `/documents/:id/provenance`            | Any           | Full decryption/attribution timeline for a document |
| GET    | `/ledger`                              | Any           | Paginated, searchable, filterable ledger entries |
| GET    | `/ledger/verify`                       | Any           | On-demand full chain integrity re-verification |
| POST   | `/verify-leak`                         | Admin         | Run the leak-investigation pipeline on an uploaded PDF |
| GET    | `/recipient`                           | Any           | List recipients |
| GET    | `/recipient/:id/history`               | Any           | Decryption history for one recipient |
| GET    | `/dashboard/admin`                     | Admin         | Dashboard cards + recent activity |
| GET    | `/dashboard/recipient`                 | Recipient     | Recipient dashboard cards |
| GET    | `/health`                              | —             | Health check |

---

## 8. Environment Variables

**backend/.env**
```
PORT=5050
DATABASE_URL=postgres://<your-os-username>@127.0.0.1:5432/sih_crypto_provenance
JWT_SECRET=change_this_to_a_long_random_secret_in_production
JWT_EXPIRES_IN=8h
LEDGER_GENESIS_SEED=SIH-CRYPTO-PROVENANCE-GENESIS-BLOCK
FRONTEND_ORIGIN=http://localhost:5173
```

**frontend/.env**
```
VITE_API_BASE_URL=http://localhost:5050/api
```

---

## 9. Deployment (Vercel + Render)

Frontend on Vercel, backend + Postgres on Render. Both platforms deploy from a GitHub repo, so push this project to
GitHub first (`git remote add origin <your-repo-url> && git push -u origin main`).

### Backend + database (Render)

This repo includes [`render.yaml`](render.yaml), a Render **Blueprint** — it creates the web service and a Postgres
database together in one step:

1. Go to the Render dashboard → **New** → **Blueprint** → connect this GitHub repo. Render reads `render.yaml`
   automatically and shows you the backend service + `sih-crypto-provenance-db` Postgres instance it's about to
   create.
2. Click **Apply**. Render provisions the database, wires its connection string into the backend's `DATABASE_URL`
   automatically, and generates random values for `JWT_SECRET` / `LEDGER_SIGNING_PASSPHRASE`.
3. First deploy runs with `SEED_ON_BOOT=true`, so it seeds the demo data (1 admin, 3 recipients, 5 documents, sample
   ledger) automatically — no shell access needed. **After the first successful deploy, go to the service's
   Environment tab and set `SEED_ON_BOOT` to `false`**, then save (this redeploys once more). Leaving it `true` would
   wipe the ledger/documents back to the seed state on every restart, including a free-tier spin-down/up cycle.
4. Note the backend's public URL (e.g. `https://sih-crypto-provenance-backend.onrender.com`) — the frontend needs it
   next.

### Frontend (Vercel)

1. Go to the Vercel dashboard → **Add New** → **Project** → import this GitHub repo.
2. Set **Root Directory** to `frontend`. Vercel auto-detects the Vite framework preset (build command
   `npm run build`, output directory `dist`) — a [`vercel.json`](frontend/vercel.json) in this repo also adds the SPA
   rewrite rule React Router needs so refreshing a route like `/admin/dashboard` doesn't 404.
3. Add an environment variable: `VITE_API_BASE_URL` = `https://<your-render-backend-url>/api` (the URL from the
   Render step above, with `/api` appended). Vite bakes this in at build time, so it must be set *before* deploying.
4. Deploy. Any `https://*.vercel.app` origin — including preview deployments — is already allowed by the backend's
   CORS policy by default (see `backend/src/app.js`), so no extra CORS configuration is needed unless you attach a
   custom domain, in which case set that domain as `FRONTEND_ORIGIN` on the Render service.

### Known limitation of this hosting setup

Uploaded/encrypted files are written to local disk (`backend/uploads/encrypted/`), not object storage. Render's free
web service tier has **ephemeral disk** — a redeploy, or a free-tier spin-down after 15 minutes of inactivity followed
by spin-up, wipes anything written to disk since the last deploy. For a live, actively-driven demo session this won't
matter; if the service spins down mid-demo, encrypted files created since the last deploy are lost and decrypting
those specific documents will fail (re-running the seed, or upgrading to a paid instance / adding S3-compatible
storage, resolves this — out of scope for the hackathon MVP).

---

## 10. Known Limitations (demo scope, disclosed honestly)

- Private keys (RSA + Ed25519) are stored server-side in PostgreSQL for demonstration purposes so the API can act on
  a recipient's behalf without a client-side key-management flow. A production system would generate/store private
  keys client-side or in an HSM/KMS, with the server holding only public keys.
- Digital Certificate (DSC) login and OTP login on the login page are UI-only affordances that show an explanatory
  message — full smart-card/OTP integration is out of scope for a 24-hour MVP.
- `multer@1.x` is used for simplicity; production deployments should migrate to `multer@2.x`.

---

## 11. Tech Stack

**Frontend:** React 18 (Vite), Tailwind CSS, React Router, Axios, Lucide Icons
**Backend:** Node.js, Express.js, PostgreSQL, Sequelize, JWT, Multer, Node `crypto`, `pdf-lib`, dotenv, CORS
