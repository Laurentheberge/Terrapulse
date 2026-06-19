import os
from fastapi import FastAPI
from starlette.responses import PlainTextResponse

from app.firebase import db
from app.routers import auth, hotspots, reports, sites

app = FastAPI(title="TerraPulse AI")


@app.middleware("http")
async def cors_middleware(request, call_next):
    try:
        response = await call_next(request)
    except Exception as e:
        response = PlainTextResponse(str(e), status_code=500)
    origin = request.headers.get("origin", "")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    if request.method == "OPTIONS":
        return PlainTextResponse("", status_code=200, headers=dict(response.headers))
    return response


app.include_router(auth.router)
app.include_router(reports.router)
app.include_router(hotspots.router)
app.include_router(sites.router)


@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/debug/reports-count")
def debug_reports_count():
    try:
        docs = list(db.collection("reports").stream())
        return {"total": len(docs), "sample_ids": [d.id for d in docs[:5]]}
    except Exception as e:
        return {"error": str(e)}
