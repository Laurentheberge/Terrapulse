import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.firebase import db
from app.routers import auth, hotspots, reports, sites

app = FastAPI(title="TerraPulse AI")

origins = [
    "http://localhost:5173",
    "http://localhost:4173",
    "https://hackartonic.web.app",
    "https://hackartonic.firebaseapp.com",
]
if os.environ.get("ALLOWED_ORIGINS"):
    origins.extend(o.strip() for o in os.environ["ALLOWED_ORIGINS"].split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(reports.router)
app.include_router(hotspots.router)
app.include_router(sites.router)


@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/debug/reports-count")
def debug_reports_count():
    docs = list(db.collection("reports").stream())
    return {
        "total": len(docs),
        "sample_ids": [d.id for d in docs[:5]],
    }
