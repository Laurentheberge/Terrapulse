from collections import defaultdict

import geohash2
from fastapi import APIRouter

from app.firebase import db
from app.scoring import environment_score

router = APIRouter(prefix="/hotspots", tags=["hotspots"])

CLUSTER_PRECISION = 5  # ~5 km grid cells


@router.get("")
def get_hotspots():
    docs = db.collection("reports").stream()

    clusters = defaultdict(list)
    for d in docs:
        data = d.to_dict()
        if data.get("status") == "resolved":
            continue
        lat, lng = data.get("latitude"), data.get("longitude")
        if lat is None or lng is None:
            continue
        gh = geohash2.encode(lat, lng, precision=CLUSTER_PRECISION)
        clusters[gh].append(data)

    results = []
    for gh, reports in clusters.items():
        scores = []
        for r in reports:
            dmg = r.get("damage_type", "")
            sev = r.get("severity_level", "")
            if dmg and sev:
                try:
                    scores.append(environment_score(dmg, sev))
                except Exception:
                    scores.append(100)
        avg_score = round(sum(scores) / len(scores)) if scores else 100
        try:
            lat, lng = map(float, geohash2.decode(gh)[:2])
        except Exception as e:
            print(f"[hotspots] geohash decode failed for {gh}: {e}")
            continue
        results.append({
            "geohash": gh,
            "latitude": round(lat, 4),
            "longitude": round(lng, 4),
            "report_count": len(reports),
            "average_score": avg_score,
        })

    return sorted(results, key=lambda h: h["report_count"], reverse=True)
