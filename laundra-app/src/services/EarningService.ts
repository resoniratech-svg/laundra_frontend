import { EarningSummary } from '../types/earning';
import { Order } from '../types/order';

const pickupCompletedStatuses = [
  'received', 'sorting', 'washing', 'drying', 'ironing', 'quality check',
  'packing', 'ready', 'out for delivery', 'out_for_delivery', 'delivered',
  'partially_picked_up', 'partially picked up', 'picked_up', 'picked up',
  'fully_picked_up', 'fully picked up', 'accepted', 'completed'
];

const deliveryCompletedStatuses = [
  'delivered', 'completed', 'fully_delivered', 'fully delivered',
  'partially_delivered', 'partially delivered'
];

export const EarningService = {
  calculateEarnings: (orders: Order[], driverName: string): EarningSummary => {
    const cleanName = driverName.trim().toLowerCase();

    let pendingEarnings = 0;
    let paidEarnings = 0;
    let lifetimeEarnings = 0;
    const trips: any[] = [];
    const processedKeys = new Set<string>();

    orders.forEach(o => {
      if (o.isDeleted || (o.status || '').toLowerCase() === 'cancelled') return;

      const st = (o.status || '').toLowerCase();
      const delSt = (o.deliveryStatus || '').toLowerCase();

      const taskType = ((o as any).taskType || (o as any).type || '').toUpperCase();
      const canBePickup = !taskType || taskType === 'PICKUP';
      const canBeDelivery = !taskType || taskType === 'DELIVERY';

      const delId = (o as any).deliveryId || (o as any).task_id || (o as any).delivery_id || o.id;

      // 1. Pickup Commission Evaluation (credited ONLY upon task completion)
      const isPickupStaff = o.pickupCourier && (o.pickupCourier.trim().toLowerCase() === cleanName || o.pickupCourier === 'All Delivery Staff');
      const isPickupCompleted = pickupCompletedStatuses.includes(st) || pickupCompletedStatuses.includes(delSt) || !!o.pickupCommissionPaid;
      const pickupKey = `${o.id}_pickup_${delId}_${o.pickupCommission}`;

      if (canBePickup && isPickupStaff && isPickupCompleted && !processedKeys.has(pickupKey)) {
        processedKeys.add(pickupKey);
        const amt = o.pickupCommission !== undefined ? Number(o.pickupCommission) : 0;
        if (amt > 0) {
          const isPaid = !!o.pickupCommissionPaid;
          if (isPaid) {
            paidEarnings += amt;
          } else {
            pendingEarnings += amt;
          }
          lifetimeEarnings += amt;
          trips.push({
            orderId: o.id,
            type: 'Pickup',
            customerName: o.customerName || 'Customer',
            date: o.pickupDate || (o.created_at ? o.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
            amount: amt,
            status: isPaid ? 'Paid' : 'Pending',
          });
        }
      }

      // 2. Delivery Commission Evaluation (credited ONLY upon task completion)
      const isDeliveryStaff = o.deliveryCourier && (o.deliveryCourier.trim().toLowerCase() === cleanName || o.deliveryCourier === 'All Delivery Staff');
      const isDeliveryCompleted = deliveryCompletedStatuses.includes(st) || deliveryCompletedStatuses.includes(delSt) || !!o.deliveryCommissionPaid;
      const deliveryKey = `${o.id}_delivery_${delId}_${o.deliveryCommission}`;

      if (canBeDelivery && isDeliveryStaff && isDeliveryCompleted && !processedKeys.has(deliveryKey)) {
        processedKeys.add(deliveryKey);
        const amt = o.deliveryCommission !== undefined ? Number(o.deliveryCommission) : 0;
        if (amt > 0) {
          const isPaid = !!o.deliveryCommissionPaid;
          if (isPaid) {
            paidEarnings += amt;
          } else {
            pendingEarnings += amt;
          }
          lifetimeEarnings += amt;
          trips.push({
            orderId: o.id,
            type: 'Delivery',
            customerName: o.customerName || 'Customer',
            date: (o as any).deliveredDate || o.deliveryDate || (o.created_at ? o.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
            amount: amt,
            status: isPaid ? 'Paid' : 'Pending',
          });
        }
      }
    });

    return {
      todayEarnings: pendingEarnings + paidEarnings,
      pendingEarnings,
      paidEarnings,
      lifetimeEarnings,
      trips,
    };
  },
};
