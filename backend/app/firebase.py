import os

import firebase_admin
from firebase_admin import auth, credentials, firestore
from dotenv import load_dotenv

load_dotenv()

FIREBASE_KEY_PATH = os.path.join(os.path.dirname(__file__), "..", "firebase-key.json")

if os.path.exists(FIREBASE_KEY_PATH):
    cred = credentials.Certificate(FIREBASE_KEY_PATH)
else:
    FIREBASE_PRIVATE_KEY = os.environ["FIREBASE_PRIVATE_KEY"].replace("\\n", "\n")
    cred = credentials.Certificate({
        "type": "service_account",
        "project_id": os.environ["FIREBASE_PROJECT_ID"],
        "private_key": FIREBASE_PRIVATE_KEY,
        "client_email": os.environ["FIREBASE_CLIENT_EMAIL"],
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_id": "",
        "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{os.environ['FIREBASE_CLIENT_EMAIL']}",
        "private_key_id": "",
    })

firebase_admin.initialize_app(cred)

db = firestore.client()


def verify_token(id_token: str):
    return auth.verify_id_token(id_token)
