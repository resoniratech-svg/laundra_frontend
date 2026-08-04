import sys
import os

os.environ['DATABASE_URL'] = 'postgresql://postgres:postgres@localhost:5433/laundry-backend'
os.environ['SECRET_KEY'] = '96f849646beee05f25adfa9a6c9e0d165bf259bf6a3b2b814df39c1b48bf5b2d'

sys.path.append(r'c:\Users\kanek\OneDrive\Desktop\laundry-backend')

from app.core.database import SessionLocal
from app.models.user import User
from sqlalchemy import text

db = SessionLocal()

print("=== DELETING USER vinay@laundra.com SAFELY FROM POSTGRESQL DATABASE ===")

target_user = db.query(User).filter(User.email == 'vinay@laundra.com').first()
if target_user:
    uid = str(target_user.id)
    # Clear references in child tables
    db.execute(text("DELETE FROM wallet_passes WHERE customer_id = :uid"), {"uid": uid})
    db.execute(text("DELETE FROM customer_packages WHERE customer_id = :uid"), {"uid": uid})
    db.execute(text("UPDATE deliveries SET delivery_boy_id = NULL WHERE delivery_boy_id = :uid"), {"uid": uid})
    db.execute(text("UPDATE orders SET customer_id = (SELECT id FROM customers LIMIT 1) WHERE customer_id = :uid"), {"uid": uid})
    db.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": uid})
    db.commit()
    print("SUCCESS: Deleted user vinay@laundra.com from PostgreSQL DB!")
else:
    print("User vinay@laundra.com not found in DB.")

# Print remaining Vinay users
vinay_users = db.query(User).filter(User.name.ilike('%Vinay%')).all()
print(f"\nRemaining Vinay Users in DB ({len(vinay_users)}):")
for u in vinay_users:
    print(f"  ID: {u.id}, Name: {u.name}, Email: {u.email}, Role: {u.role}")

db.close()
