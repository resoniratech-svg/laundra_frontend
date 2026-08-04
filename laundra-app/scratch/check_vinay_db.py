import sys
import os

os.environ['DATABASE_URL'] = 'postgresql://postgres:postgres@localhost:5433/laundry-backend'
os.environ['SECRET_KEY'] = '96f849646beee05f25adfa9a6c9e0d165bf259bf6a3b2b814df39c1b48bf5b2d'

sys.path.append(r'c:\Users\kanek\OneDrive\Desktop\laundry-backend')

from app.core.database import SessionLocal
from app.models.user import User
from app.models.order import Order
from app.models.delivery import Delivery

db = SessionLocal()

print("=== CHECKING POSTGRESQL DATABASE FOR DRIVER VINAY & ORDER #697937 ===")

# Find user Vinay
vinay_users = db.query(User).filter(User.name.ilike('%Vinay%')).all()
print(f"Driver Vinay Users in DB ({len(vinay_users)}):")
for u in vinay_users:
    print(f"  ID: {u.id}, Name: {u.name}, Email: {u.email}, Role: {u.role}")

# Find Order 697937
orders_697937 = db.query(Order).filter(Order.order_number == '697937').all()
print(f"\nOrder #697937 in DB ({len(orders_697937)}):")
for o in orders_697937:
    print(f"  ID: {o.id}, Order Number: {o.order_number}, Status: {o.status}")

# Find Deliveries for Vinay
if vinay_users:
    vinay_id = vinay_users[0].id
    deliveries_vinay = db.query(Delivery).filter(Delivery.delivery_boy_id == vinay_id).all()
    print(f"\nDeliveries assigned to Vinay ID ({vinay_id}) in DB ({len(deliveries_vinay)}):")
    for d in deliveries_vinay:
        print(f"  Delivery ID: {d.id}, Order ID: {d.order_id}, Type: {d.type}, Status: {d.status}")

# Find all Deliveries
all_deliveries = db.query(Delivery).all()
print(f"\nTotal Deliveries in DB ({len(all_deliveries)}):")
for d in all_deliveries:
    print(f"  Delivery ID: {d.id}, Order ID: {d.order_id}, Driver ID: {d.delivery_boy_id}, Status: {d.status}")

db.close()
