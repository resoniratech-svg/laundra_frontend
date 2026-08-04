import sys
import os

# Set environment variables from .env
os.environ['DATABASE_URL'] = 'postgresql://postgres:postgres@localhost:5433/laundry-backend'
os.environ['SECRET_KEY'] = '96f849646beee05f25adfa9a6c9e0d165bf259bf6a3b2b814df39c1b48bf5b2d'

sys.path.append(r'c:\Users\kanek\OneDrive\Desktop\laundry-backend')

from app.core.database import SessionLocal
from app.models.order import Order
from app.models.delivery import Delivery

db = SessionLocal()

print("=== CHECKING POSTGRESQL DATABASE FOR ORDERS 931644 AND 965670 ===")

# Query Order table
orders = db.query(Order).all()
print(f"Total Orders in PostgreSQL DB: {len(orders)}")
for o in orders:
    print(f"  Order ID in DB: {o.id}, Status: {o.status}")

target_ids = ['931644', '965670']
matched_orders = [o for o in orders if str(o.id) in target_ids]
print(f"\nOrders 931644 and 965670 in PostgreSQL 'orders' table count: {len(matched_orders)}")

# Query Delivery table
deliveries = db.query(Delivery).all()
print(f"Total Deliveries in PostgreSQL DB: {len(deliveries)}")
for d in deliveries:
    print(f"  Delivery ID in DB: {d.id}, Order ID: {d.order_id}, Type: {d.type}")

matched_deliveries = [d for d in deliveries if str(d.order_id) in target_ids or str(d.id) in target_ids]
print(f"Orders 931644 and 965670 in PostgreSQL 'deliveries' table count: {len(matched_deliveries)}")

db.close()
