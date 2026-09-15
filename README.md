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
├── backend/                 Express + MongoDB API (independent, runs on :5050)
│   ├── src/
│   │   ├── config/          DB connection, constants
│   │   ├── models/          User, Document, Ledger (Mongoose schemas)
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
└── README.md
```

The backend and frontend are fully independent Node projects — each has its own `package.json`, `.env`, and dev
server. Neither requires the other to be running to `npm install`.

---

## 2. Prerequisites

- Node.js 18+ and npm
- MongoDB running locally (or a connection string to a reachable instance)
  - macOS (Homebrew): `brew install mongodb-community && brew services start mongodb-community`

---

## 3. Setup & Run

### Backend

```bash
cd backend
npm install
cp .env.example .env      # edit if your Mongo URI / ports differ
npm run seed              # creates 1 admin, 3 recipients, 5 documents, sample ledger entries
npm run dev                # starts the API on http://localhost:5050
```

> **Note:** the default port is `5050`, not `5000` — macOS reserves `5000` for AirPlay Receiver / Control Center on
> many systems, which conflicts with the common Express default. Change `PORT` in `.env` if you need a different port.

### Frontend

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
MONGO_URI=mongodb://127.0.0.1:27017/sih_crypto_provenance
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

## 9. Known Limitations (demo scope, disclosed honestly)

- Private keys (RSA + Ed25519) are stored server-side in MongoDB for demonstration purposes so the API can act on a
  recipient's behalf without a client-side key-management flow. A production system would generate/store private
  keys client-side or in an HSM/KMS, with the server holding only public keys.
- Digital Certificate (DSC) login and OTP login on the login page are UI-only affordances that show an explanatory
  message — full smart-card/OTP integration is out of scope for a 24-hour MVP.
- `multer@1.x` is used for simplicity; production deployments should migrate to `multer@2.x`.

---

## 10. Tech Stack

**Frontend:** React 18 (Vite), Tailwind CSS, React Router, Axios, Lucide Icons
**Backend:** Node.js, Express.js, MongoDB, Mongoose, JWT, Multer, Node `crypto`, `pdf-lib`, dotenv, CORS
