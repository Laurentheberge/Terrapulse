import sys

from app.firebase import db


def clear_collection(name: str):
    docs = db.collection(name).list_documents()
    for d in docs:
        d.delete()


def cleanup():
    """Delete all seeded demo reports (citizen_id is empty string)."""
    docs = db.collection("reports").where("citizen_id", "==", "").stream()
    count = 0
    for d in docs:
        d.reference.delete()
        count += 1
    print(f"Deleted {count} seeded reports.")


if __name__ == "__main__":
    cleanup()
