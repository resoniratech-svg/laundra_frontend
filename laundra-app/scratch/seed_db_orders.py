import sys
import os
import uuid
from datetime import datetime

os.environ['DATABASE_URL'] = 'postgresql://postgres:postgres@localhost:5433/laundry-backend'
os.environ['SECRET_KEY'] = '96f849646beee05f25adfa9a6c9e0d165bf259bf6a3b2b814df39c1b48bf5b2d'

sys.path.append(r'c:\Users\kanek\OneDrive\Desktop\laundry-backend')

from app.core.database import SessionLocal
from app.models.company import Company
from app.models.customer import Customer
from app.models.user import User
from app.models.order import Order
from app.models.delivery import Delivery

db = SessionLocal()

print("=== SEEDING ORDERS INTO POSTGRESQL DATABASE ===")

company = db.query(Company).first()
tenant_id = company.id if company else uuid.uuid4()

driver_prakash = db.query(User).filter(User.name.ilike('%Prakash%')).first()
if not driver_prakash:
    driver_prakash = User(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        name='Prakash',
        email='prakash@laundra.com',
        role='DELIVERY_BOY',
        status='Active'
    )
    db.add(driver_prakash)
    db.commit()
    db.refresh(driver_prakash)

# Customer MADHU
customer_madhu = db.query(Customer).filter(Customer.name == 'MADHU').first()
if not customer_madhu:
    customer_madhu = Customer(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        name='MADHU',
        phone='897654324567',
        email='madhu@example.com',
        address='kgsdh'
    )
    db.add(customer_madhu)
    db.commit()
    db.refresh(customer_madhu)

# Order #931644
order_1 = db.query(Order).filter(Order.order_number == '931644').first()
if not order_1:
    order_1 = Order(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        customer_id=customer_madhu.id,
        order_number='931644',
        status='Pending Pickup',
        pickup_address='kgsdh',
        delivery_address='kgsdh'
    )
    db.add(order_1)
    db.commit()
    db.refresh(order_1)

delivery_1 = db.query(Delivery).filter(Delivery.order_id == order_1.id).first()
if not delivery_1:
    delivery_1 = Delivery(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        order_id=order_1.id,
        delivery_boy_id=driver_prakash.id,
        type='PICKUP',
        status='Pending Pickup'
    )
    db.add(delivery_1)

# Customer charan
customer_charan = db.query(Customer).filter(Customer.name == 'charan').first()
if not customer_charan:
    customer_charan = Customer(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        name='charan',
        phone='9701613332',
        email='charan@example.com',
        address='kpr'
    )
    db.add(customer_charan)
    db.commit()
    db.refresh(customer_charan)

# Order #965670
order_2 = db.query(Order).filter(Order.order_number == '965670').first()
if not order_2:
    order_2 = Order(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        customer_id=customer_charan.id,
        order_number='965670',
        status='Pending Pickup',
        pickup_address='kpr',
        delivery_address='kpr'
    )
    db.add(order_2)
    db.commit()
    db.refresh(order_2)

delivery_2 = db.query(Delivery).filter(Delivery.order_id == order_2.id).first()
if not delivery_2:
    delivery_2 = Delivery(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        order_id=order_2.id,
        delivery_boy_id=driver_prakash.id,
        type='PICKUP',
        status='Pending Pickup'
    )
    db.add(delivery_2)

db.commit()
print("SUCCESS: Created Order #931644 and Order #965670 in PostgreSQL database!")

# Verify count
all_delivs = db.query(Delivery).all()
print(f"Total Deliveries in PostgreSQL DB now: {len(all_delivs)}")
for d in all_delivs:
    print(f"  Delivery ID: {d.id}, Order ID: {d.order_id}, Driver ID: {d.delivery_boy_id}, Status: {d.status}")

db.close()
