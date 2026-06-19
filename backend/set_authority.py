"""Usage: python set_authority.py user@example.com"""
import sys
from app.firebase import auth

email = sys.argv[1]
user = auth.get_user_by_email(email)
auth.set_custom_user_claims(user.uid, {"role": "authority"})
print(f"Set authority role for {email}")
