# Deployment Guide

## Overview

| Service   | Provider        | Free tier limits                                              |
|-----------|-----------------|---------------------------------------------------------------|
| Frontend  | Firebase Hosting | 10 GB storage, 360 MB/day bandwidth, custom domain supported |
| Backend   | Render          | 750 hrs/month, spins down after 15 min idle (~30s cold start) |
| Images    | Cloudinary      | Free plan: 25 GB storage, 25 GB bandwidth/month               |

---

## 1. Backend — Deploy to Render

### Prerequisites
- A [Render](https://render.com) account (GitHub login works)
- Your Firebase service account key handy

### Steps

1. **Push your repo to GitHub** (Render imports from GitHub)

2. **Create a new Web Service** on Render:
   - Connect your repo
   - Name: `terrapulse-api`
   - Root Directory: (leave blank — the render.yaml is at repo root)
   - Build Command: `pip install -r backend/requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

3. **Set environment variables** in Render dashboard → Environment:
   ```
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   ALLOWED_ORIGINS=https://hackartonic.web.app,https://hackartonic.firebaseapp.com
   ```

4. **Deploy** — Render will build and start. Note your URL (e.g. `https://terrapulse-api.onrender.com`)

---

## 2. Frontend — Deploy to Firebase Hosting

### Prerequisites
- [Firebase CLI](https://firebase.google.com/docs/cli) installed (`npm install -g firebase-tools`)
- Logged in: `firebase login`
- Project `hackartonic` already exists

### Steps

1. **Update `.env.production`** — set `VITE_API_URL` to your Render URL:
   ```
   VITE_API_URL=https://terrapulse-api.onrender.com
   ```

2. **Build the frontend**:
   ```bash
   cd frontend
   npm run build
   # copies .env.production values into the bundle
   ```

3. **Deploy to Firebase**:
   ```bash
   firebase deploy --only hosting
   ```

   Your app will be live at:
   - `https://hackartonic.web.app`
   - `https://hackartonic.firebaseapp.com`

---

## 3. Update CORS

The backend already reads `ALLOWED_ORIGINS` from env vars (set in step 1.3).  
If your Firebase Hosting URL changes, update `ALLOWED_ORIGINS` on Render and redeploy.

---

## 4. Verify

1. Visit `https://hackartonic.web.app`
2. Register a citizen account, submit a report
3. Register an authority account, check the dashboard
4. Confirm the map shows reports

---

## Troubleshooting

- **Backend returns 502 / not reachable** — Render free tier spins down after 15 min. Wait 30-60s for cold start.
- **CORS errors in console** — check `ALLOWED_ORIGINS` env var on Render
- **Firebase Auth not working** — make sure the authorized domains in Firebase Console → Authentication include your Render URL (if using email link sign-in). For email/password it works without this.
- **"Failed to fetch" on report submit** — check that Cloudinary upload preset `terrapulse` exists and is **unsigned**
