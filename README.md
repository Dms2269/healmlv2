# HEALML – Universal Self-Healing Machine Learning Platform

HEALML is a production-grade, enterprise MLOps platform engineered to diagnose data corruptions, execute autonomous statistical healing with versioned rollback safety, and train resilient machine learning models with holdout test validation and verifiable recovery logging.

---

## Key Features

### 1. Enterprise Architecture & Role-Based Access Control (RBAC)
- **Strict Role Separation:** Distinct **Client Workspaces** and **Master Admin Control Portal** enforced via route guards, Bearer token verification, and backend endpoint tenant checks.
- **Pending Registration Gatekeeping:** New client registrations require explicit Master Admin approval before workspace access is granted.
- **Dedicated Error & Guard Views:** Safe React Error Boundaries (`HealWorkspaceErrorBoundary`, `ErrorBoundary`), `403 Access Denied`, and `404 Not Found` recovery pages ensure users never encounter a blank screen.

### 2. Client Self-Healing Workstation & Versioned Engine Rollback
- **Universal Tabular Dataset Ingestion:** Ingest CSV, TSV, and Excel (`.xlsx`/`.xls`) files with automated schema inference (`numeric`, `categorical`, `datetime`, `identifier`, `target`).
- **Dual Real Self-Healing Engine Releases:**
  - **`v2.0` (`HEALML_UNIVERSAL_V2` · `policy_v2.4_zero_drift`) — Active Production:** Full 15-step all-column autonomous healing featuring skewness-calibrated Mean vs Median imputation, domain non-negative/percentage/age clamping, categorical canonical normalization, ISO-8601 datetime repair, and mandatory 2nd-scan degradation rollback.
  - **`v1.8` (`HEALML_CLASSIC_STABLE_V1_8` · `policy_v1.8_conservative`) — Previous Stable Fallback:** Conservative deterministic baseline applying exact payload deduplication, Median numeric imputation, `2.5 × IQR` Winsorization, and Mode categorical fill (preserving existing casing) with strict Zero-Target-Drift & ID locks.
- **4-Layer Compatibility Matrix:** Separately validates **Heal Engine Binary**, **Repair Policy Config**, **Dataset Schema**, and **Model Artifacts** prior to switching versions or running healing.
- **Safe Recovery & Sanitized Diagnostics:** The Heal Workspace error boundary and runtime recovery panel provide one-click **Retry Heal Workspace**, **Back to Dataset Explorer**, **Use Previous Stable Heal Version (`v1.8`)**, and **View Error Details** (logging Error ID, timestamp, stage, project/dataset IDs, and sanitized messages without tokens, passwords, or stack traces).
- **Non-Destructive Dual Storage & Verified Exports:** Original raw datasets (`originalRows`) remain immutable while repaired datasets are persisted cleanly (`ds_healed_*`) and exportable to CSV and `.xlsx`.

### 3. Master Admin Control Portal
- Executive Telemetry, Client Management, Pending Registrations, Support Tickets, ML Model Monitoring, Dataset Repository, System Health, Critical Alerts Ledger, Certified PDF Reports, Audit Logs, and Database Backups.

---

## Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, SheetJS (`xlsx`), jsPDF.
- **Server & API Runtime:** Node.js Express (`server.ts`) serving the Vite SPA (`dist/` in production) and `/api/*` endpoints (`src/serverApiFallback.ts` + optional Python Flask ML backend proxy on port `5001`).
- **ML Subsystem (Python Backend Sync):** Python 3, Flask, Scikit-Learn, Pandas, NumPy, SQLAlchemy (`backend/app.py`, `backend/ml_engine.py`).

---

## Heal Engine & Version Management APIs

- `GET /api/heal/versions?projectId=...` — Lists registered real Heal Engine versions (`v2.0`, `v1.8`) and active project selection.
- `POST /api/heal/versions/switch` — Switches between `v2.0` and `v1.8` after compatibility checks and commits an audit entry (`ROLLBACK_TO_STABLE` / `RESTORE_CURRENT`).
- `POST /api/pipeline/heal` — Executes verified dataset healing with authentication (`401`), tenant/permission authorization (`403`), dataset validation (`404`), idempotency key deduplication, separate healed dataset record creation, and sanitized `500` error capture.
- `GET /api/heal/history` — Returns execution history and version switch logs.
- `GET /api/heal/errors` / `POST /api/heal/errors` — Retrieves and records sanitized Heal diagnostic entries.

---

## Installation, Setup & Verification

### Prerequisites
- Node.js (v18+)
- Python 3.9+

### Environment Configuration
Copy `.env.example` to `.env` and configure:
- `PORT=3000`
- `MASTER_ADMIN_INITIAL_PASSWORD` (Master Admin password loaded securely by backend auth; login identifier: `2269dms@gmail.com`)
- Optional SMTP alert variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`)

### Build & Run
```bash
npm install
npm run build
npm start
```

### Automated Test Suites
```bash
# TypeScript & production bundle verification
npm run lint
npm run build

# Comprehensive verification suite (Tests 1-18: RBAC, Healing v2.0 & v1.8, Stress 1200-row, Compatibility, Error Boundary, Exports)
npx tsx tests/run_verification_tests.ts

# Live API & SPA route end-to-end verification (against running server)
BASE_URL=http://127.0.0.1:3099 npx tsx tests/e2e_heal_verification.ts

# Python backend syntax & unit checks
python3 -m py_compile backend/*.py
python3 tests/test_healml_suite.py
```
