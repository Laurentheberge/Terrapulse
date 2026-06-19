"""Run: poetry run python cleanup_seed.py"""
from app.firebase import db

docs = db.collection("reports").where("citizen_id", "==", "").stream()
count = 0
for d in docs:
    d.reference.delete()
    count += 1
print(f"Deleted {count} seeded demo reports")
