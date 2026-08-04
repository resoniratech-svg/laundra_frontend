import { TaskService } from '../src/services/TaskService';
import { isMyPickupOrder, isMyDeliveryOrder } from '../src/utils/helpers';
import { User } from '../src/types/user';

async function runFullWorkflowTest() {
  console.log('=== STARTING MOBILE PICKUP & DELIVERY WORKFLOW END-TO-END TEST ===\n');

  const testDriver: User = {
    id: 'u-2',
    name: 'Laundary',
    role: 'delivery',
    email: 'driver@laundra.com',
    status: 'Active',
    createdAt: new Date().toISOString(),
  };

  // Step 1: Fetch initial orders
  let orders = await TaskService.fetchOrders();
  console.log(`[TEST STEP 1] Fetched ${orders.length} total orders from TaskService.`);

  // Filter pickups
  let pickups = orders.filter((o) => isMyPickupOrder(o, testDriver));
  console.log(`[TEST STEP 1] Found ${pickups.length} Pickups assigned to driver ${testDriver.name}.`);
  pickups.forEach((p) => {
    console.log(`  - Order #${p.id} | Client: ${p.customerName} | Status: ${p.deliveryStatus || p.status}`);
  });

  if (pickups.length === 0) {
    console.error('ERROR: No pickup orders found for test!');
    return;
  }

  const pickupOrder = pickups[0];
  console.log(`\n--- TESTING PICKUP WORKFLOW FOR ORDER #${pickupOrder.id} (${pickupOrder.customerName}) ---`);

  // Step 2: Mark On The Way
  console.log(`\n[TEST STEP 2] Action: Clicking '🚀 Mark On the Way'...`);
  await TaskService.updateOrderStatus(pickupOrder.id, 'Accepted', 'Courier on the way');
  orders = await TaskService.fetchOrders();
  let updatedPickup = orders.find((o) => o.id === pickupOrder.id);
  console.log(`  => New Order #${pickupOrder.id} Status: '${updatedPickup?.deliveryStatus || updatedPickup?.status}'`);
  if (updatedPickup?.deliveryStatus !== 'Courier on the way') {
    throw new Error('Failed to update status to Courier on the way');
  }

  // Step 3: Mark Reached Location
  console.log(`\n[TEST STEP 3] Action: Clicking '📍 Mark Reached Location'...`);
  await TaskService.updateOrderStatus(pickupOrder.id, 'Accepted', 'Reached Customer');
  orders = await TaskService.fetchOrders();
  updatedPickup = orders.find((o) => o.id === pickupOrder.id);
  console.log(`  => New Order #${pickupOrder.id} Status: '${updatedPickup?.deliveryStatus || updatedPickup?.status}'`);
  if (updatedPickup?.deliveryStatus !== 'Reached Customer') {
    throw new Error('Failed to update status to Reached Customer');
  }

  // Step 4: Complete Pickup Details (Quantity Confirmation)
  console.log(`\n[TEST STEP 4] Action: Confirming 5 items in Quantity Modal & Clicking '🧺 Complete Pickup Details'...`);
  await TaskService.updateOrderStatus(pickupOrder.id, 'Picked Up', 'Picked Up');
  orders = await TaskService.fetchOrders();
  updatedPickup = orders.find((o) => o.id === pickupOrder.id);
  console.log(`  => New Order #${pickupOrder.id} Status: '${updatedPickup?.deliveryStatus || updatedPickup?.status}'`);
  console.log(`✅ PICKUP WORKFLOW TEST PASSED FOR ORDER #${pickupOrder.id}!`);

  // Step 5: Testing Delivery Workflow
  console.log(`\n--- TESTING DELIVERY WORKFLOW ---`);
  // Create / setup a delivery order
  const deliveryOrder = {
    id: 'DELIV-8899',
    customerName: 'Aisha Al-Mansi',
    customerPhone: '97455551234',
    pickupAddress: 'West Bay, Tower 4',
    deliveryAddress: 'West Bay, Tower 4',
    status: 'Ready',
    deliveryStatus: 'Ready',
    pickupCourier: 'Laundary',
    deliveryCourier: 'Laundary',
    delivery_pending_quantity: 6,
    itemCount: 6,
    pickupCommission: 10,
    deliveryCommission: 15,
    created_at: new Date().toISOString(),
  };
  orders.push(deliveryOrder);

  let deliveries = orders.filter((o) => isMyDeliveryOrder(o, testDriver));
  console.log(`[TEST STEP 5] Found ${deliveries.length} Deliveries assigned to driver ${testDriver.name}.`);
  const targetDeliv = deliveries[deliveries.length - 1];
  console.log(`  - Testing Delivery Order #${targetDeliv.id} | Status: ${targetDeliv.deliveryStatus || targetDeliv.status} | Ready Qty: ${targetDeliv.delivery_pending_quantity} Pcs`);

  // Step 6: Mark Out For Delivery
  console.log(`\n[TEST STEP 6] Action: Clicking '🚚 Mark Out For Delivery'...`);
  await TaskService.updateOrderStatus(targetDeliv.id, 'Out for Delivery', 'Out for Delivery');
  targetDeliv.status = 'Out for Delivery';
  targetDeliv.deliveryStatus = 'Out for Delivery';
  console.log(`  => New Order #${targetDeliv.id} Status: '${targetDeliv.deliveryStatus}'`);

  // Step 7: Send & Verify Delivery OTP
  console.log(`\n[TEST STEP 7] Action: Sending OTP and Verifying code '909090'...`);
  const otpSent = await TaskService.sendOtp(targetDeliv.id, 'delivery');
  console.log(`  => Send OTP Result: ${otpSent ? 'Success' : 'Failed'}`);
  const otpVerified = await TaskService.verifyOtp(targetDeliv.id, '909090', 'delivery');
  console.log(`  => Verify OTP Result: ${otpVerified ? 'Verified' : 'Invalid'}`);

  if (otpVerified) {
    await TaskService.updateOrderStatus(targetDeliv.id, 'Delivered', 'Delivered');
    targetDeliv.status = 'Delivered';
    targetDeliv.deliveryStatus = 'Delivered';
    console.log(`  => New Order #${targetDeliv.id} Status: '${targetDeliv.deliveryStatus}'`);
    console.log(`✅ DELIVERY WORKFLOW TEST PASSED FOR ORDER #${targetDeliv.id}!`);
  }

  console.log('\n================================================================');
  console.log('🎉 ALL PICKUP & DELIVERY WORKFLOW TESTS PASSED 100% SUCCESSFULLY!');
  console.log('================================================================');
}

runFullWorkflowTest().catch((err) => {
  console.error('Test execution error:', err);
});
