# TerraPulse AI — AGENTS.md

## Commands

```bash
# Frontend (Vite React TS)
cd frontend && npm run dev          # dev server on :5173
cd frontend && npm run build        # prod build -> dist/
cd frontend && npm run lint         # ESLint
cd frontend && npm run preview      # serve built dist/

# Backend (FastAPI)
cd backend && poetry run uvicorn app.main:app --reload   # dev on :8000
cd backend && poetry run pytest                           # all tests
cd backend && poetry run pytest tests/test_scoring.py     # single test
cd backend && poetry run python -m app.seed                # delete seeded demo reports (citizen_id == "")
cd backend && poetry run python -m app.seed --disposal    # seed 15 disposal sites
cd backend && poetry run python set_authority.py you@example.com  # promote user to authority
cd backend && poetry run python cleanup_seed.py                   # delete seeded demo reports only
```

## Architecture

- **`/frontend`** — Vite + React 18 + TypeScript + Tailwind + Leaflet (OpenStreetMap tiles, no API key)
- **`/backend`** — FastAPI (Python) with Firebase Admin SDK
- **Firebase**: Firestore (NoSQL), Auth (email/password), Hosting
- **Image storage**: Cloudinary unsigned upload from frontend, URL stored on report doc
- **AI**: removed — users select damage type + severity manually via dropdowns in ReportForm
- **Hosting**: Firebase Hosting (frontend), Render free tier (backend — spins down after 15min idle, ~30-60s cold start)

## Project layout

```
/
├── frontend/
│   ├── src/
│   │   ├── pages/              # Home, PublicMap, AuthorityDashboard, DisposalSites, Login, Register
│   │   ├── components/         # Navbar, ProtectedRoute, ReportForm
│   │   ├── firebase.ts         # Firebase client config (project hackartonic)
│   │   └── App.tsx             # React Router, auth state listener
│   └── vite.config.ts          # Tailwind plugin
├── backend/
│   └── app/
│       ├── main.py             # FastAPI app, CORS, router includes
│       ├── firebase.py         # Admin SDK init + token verify middleware
│       ├── auth.py             # FastAPI deps: get_current_user, require_authority, get_optional_user
│       ├── models.py           # Report dataclass + enums (DamageType, SeverityLevel, ReportStatus)
│       ├── scoring.py          # environment_score() + constants
│       ├── seed.py             # seed 15 sample reports + 15 disposal sites (--disposal flag)
│       ├── routers/
│       │   ├── auth.py         # POST /auth/set-role (sets custom claim citizen/authority)
│       │   ├── reports.py      # POST/GET/GET by id/PATCH status
│       │   ├── hotspots.py     # GET aggregated clusters
│       │   └── sites.py        # GET disposal sites
│       └── firebase-key.json (gitignored)
├── render.yaml                 # Render deployment config
├── DEPLOYMENT.md               # Step-by-step hosting guide
└── frontend/
    ├── .env.production          # Production env vars (VITE_API_URL points to Render)
    ├── firebase.json            # Firebase Hosting config
    └── src/
        ├── api.ts               # Base API URL helper (reads VITE_API_URL)
        └── ...
```

## Key conventions

- **Auth flow**: client-side Firebase Auth SDK. Backend only verifies ID tokens. Custom claims: `citizen` / `authority` roles, checked server-side via Admin SDK. Role is set on registration via `POST /auth/set-role`. `ProtectedRoute` (frontend) + `require_authority` (backend) enforce access control — citizens redirected away from `/authority`, backend returns 403 on PATCH status for non-authority.
- **Firestore**: NoSQL — no foreign keys, denormalize freely. Reports store a `geohash` field for proximity queries (no native bounding-box support). Uses `geohash2` library (pure Python) instead of `python-geohash` (needs Rust compiler on Windows).
- **Scoring**: Dedicated `backend/app/scoring.py` with penalty & multiplier tables in `SCORING.md`. Formula: `deduction = type_penalty * severity_multiplier; score = clamp(100 + deduction, 0, 100)`. Cluster scoring sums deductions from all non-resolved reports within ~200m before clamping.
- **Env vars** (backend): `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `CLOUDINARY_URL`, `ALLOWED_ORIGINS`. Frontend: `VITE_FIREBASE_*`, `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`, `VITE_API_URL`.
- **Seed script**: `python -m app.seed` — generates ~15 reports across all 5 damage types for development/testing. Needs a `firebase-key.json` in `backend/` or env vars.
- **Damage type & severity**: user selects from buttons in ReportForm (illegal_dumping, flooding, erosion, water_pollution, deforestation + low/medium/high). Score computed immediately on the backend via `scoring.py`.
- **Build order**: lint → typecheck → test (pytest). Backend has no typecheck step yet.
- **Report statuses**: `pending_review` → `in_progress` / `resolved` / `rejected`. Authorities can set any status. Citizens can mark their own reports as `resolved`.
- **Backend Firebase Init** (`app/firebase.py`): loads `firebase-key.json` from `backend/` if present, otherwise falls back to env vars `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`.

## Deployment

See `DEPLOYMENT.md` for full guide. TL;DR:
1. **Backend**: push to GitHub → create Web Service on Render (root dir `backend`, build `pip install -r requirements.txt`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`) → set env vars (Firebase credentials, `ALLOWED_ORIGINS`)
2. **Frontend**: update `frontend/.env.production` `VITE_API_URL` to Render URL → `cd frontend && npm run build && firebase deploy --only hosting`
3. Create Cloudinary unsigned upload preset `terrapulse` if not done

## Notes

- Firestore geohash: use `geohash2` library. No native `$geoWithin` style queries.
- `SCORING.md` documents the scoring formula (auditable, easy to retune).
- Windows PowerShell 5.1 has quoting issues with `poetry run python -c` — use temp script files instead.
- Frontend Firebase config is hardcoded in `src/firebase.ts` for project `hackartonic` (API key is a client-side restriction, not a secret).
- **Dark mode**: uses Tailwind v4 `@custom-variant dark` class strategy (add/remove `dark` class on `<html>`). Toggle stored in `localStorage("theme")`. All pages include `dark:` variants.
- **Disposal sites**: seeded separately via `python -m app.seed --disposal`. Listed nearest-first using client-side haversine distance. OSM directions links open in new tab.
