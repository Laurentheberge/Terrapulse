# TerraPulse

Environmental damage reporting platform. Citizens submit geo-tagged photos of environmental issues (illegal dumping, flooding, erosion, water pollution, deforestation). AI classifies severity, reports appear on a live hotspot map, and authorities prioritize via a scoring dashboard.

---

## Prerequisites

- **Node.js** >= 18 (v24 used in development)
- **Python** >= 3.12
- **Poetry** (Python package manager)
- A **Firebase** project (Firestore + Auth)
- A **Cloudinary** account (free tier, unsigned upload preset)
## Frontend

```bash
cd frontend
npm install        # first time only
npm run dev        # dev server at http://localhost:5173
npm run build      # production build to frontend/dist/
npm run lint       # ESLint
npm run preview    # serve built dist/ locally
```

## Backend

```bash
cd backend
poetry install                          # first time only
poetry run uvicorn app.main:app --reload  # dev server at http://localhost:8000
poetry run pytest                       # run all tests
poetry run python -m app.seed           # seed ~15 sample reports
```

## Configuration

Copy `.env.example` to `.env` in `backend/` and fill in:

| Variable              | Description                    |
|-----------------------|--------------------------------|
| `FIREBASE_PROJECT_ID` | Firebase project ID            |
| `FIREBASE_PRIVATE_KEY`| Firebase service account key   |
| `FIREBASE_CLIENT_EMAIL`| Firebase service account email|
| `CLOUDINARY_URL`      | Cloudinary URL provider API key    |

Frontend config goes in `frontend/.env`:

| Variable                   | Description                |
|----------------------------|----------------------------|
| `VITE_FIREBASE_API_KEY`    | Firebase Web API key       |
| `VITE_FIREBASE_AUTH_DOMAIN`| Firebase auth domain       |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID        |
| `VITE_CLOUDINARY_CLOUD_NAME`| Cloudinary cloud name     |
| `VITE_CLOUDINARY_UPLOAD_PRESET`| Cloudinary unsigned preset|

## Project layout

```
/
├── frontend/          # Vite + React 18 + TypeScript + Tailwind
│   └── src/
│       ├── pages/     # Home, PublicMap, AuthorityDashboard, Login
│       ├── components/# Map, ReportForm, ReportTable, etc.
│       └── firebase.ts
├── backend/           # FastAPI + Firebase Admin SDK
│   └── app/
│       ├── main.py    # FastAPI entrypoint
│       ├── firebase.py# Auth middleware
│       ├── ai.py      # analyze_image()
│       ├── scoring.py # environment_score()
│       ├── seed.py    # Dev seed script
│       └── routers/   # API route modules
└── AGENTS.md          # Instructions for AI coding assistants
```

## Deployment

See `DEPLOYMENT.md` for Firebase Hosting (frontend) and Render (backend) setup.
