import os

import firebase_admin
from firebase_admin import auth, credentials, firestore
from dotenv import load_dotenv

load_dotenv()

FIREBASE_KEY_PATH = os.path.join(os.path.dirname(__file__), "..", "firebase-key.json")

if os.path.exists(FIREBASE_KEY_PATH):
    cred = credentials.Certificate(FIREBASE_KEY_PATH)
else:
    cred = credentials.Certificate({
        "type": "service_account",
        "project_id": os.environ["FIREBASE_PROJECT_ID"],
        "private_key": os.environ["FIREBASE_PRIVATE_KEY"].replace("\\n", "\n"),
        "client_email": os.environ["FIREBASE_CLIENT_EMAIL"],
    })

firebase_admin.initialize_app(cred)

db = firestore.client()


def verify_token(id_token: str):
    return auth.verify_id_token(id_token)
