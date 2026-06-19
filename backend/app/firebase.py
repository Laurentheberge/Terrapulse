import json
import os

import firebase_admin
from firebase_admin import auth, credentials, firestore
from dotenv import load_dotenv

load_dotenv()

key_paths = [
    os.path.join(os.path.dirname(__file__), "..", "firebase-key.json"),
    "/etc/secrets/firebase-key.json",
]

cred = None
for path in key_paths:
    if os.path.exists(path):
        cred = credentials.Certificate(path)
        break

if cred is None:
    raw_key = os.environ.get("FIREBASE_PRIVATE_KEY", "")
    raw_key = raw_key.replace("\\n", "\n")
    cred = credentials.Certificate({
        "type": "service_account",
        "project_id": os.environ.get("FIREBASE_PROJECT_ID", ""),
        "private_key": raw_key,
        "client_email": os.environ.get("FIREBASE_CLIENT_EMAIL", ""),
        "token_uri": "https://oauth2.googleapis.com/token",
    })

firebase_admin.initialize_app(cred)

db = firestore.client()


def verify_token(id_token: str):
    return auth.verify_id_token(id_token)
