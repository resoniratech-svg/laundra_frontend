import { EarningSummary } from '../types/earning';
import { Order } from '../types/order';

export const EarningService = {
  calculateEarnings: (orders: Order[], driverName: string): EarningSummary => {
    const cleanName = driverName.trim().toLowerCase();
    
    const myOrders = orders.filter(o => {
      if (o.isDeleted) return false;
      const matchPickup = o.pickupCourier && (o.pickupCourier.trim().toLowerCase() === cleanName || o.pickupCourier === 'All Delivery Staff');
      const matchDelivery = o.deliveryCourier && (o.deliveryCourier.trim().toLowerCase() === cleanName || o.deliveryCourier === 'All Delivery Staff');
      return matchPickup || matchDelivery;
    });

    let todayEarnings = 0;
    let pendingEarnings = 0;
    let paidEarnings = 0;
    let lifetimeEarnings = 0;
    const trips: any[] = [];

    myOrders.forEach(o => {
      if (o.pickupCourier && (o.pickupCourier.trim().toLowerCase() === cleanName || o.pickupCourier === 'All Delivery Staff')) {
        const amt = o.pickupCommission !== undefined ? o.pickupCommission : 0;
        const isPaid = !!o.pickupCommissionPaid;
        lifetimeEarnings += amt;
        if (isPaid) paidEarnings += amt; else pendingEarnings += amt;
        todayEarnings += amt;
        trips.push({
          orderId: o.id,
          type: 'Pickup',
          customerName: o.customerName || 'Customer',
          date: o.created_at || new Date().toISOString(),
          amount: amt,
          status: isPaid ? 'Paid' : 'Pending',
        });
      }

      if (o.deliveryCourier && (o.deliveryCourier.trim().toLowerCase() === cleanName || o.deliveryCourier === 'All Delivery Staff')) {
        const amt = o.deliveryCommission !== undefined ? o.deliveryCommission : 0;
        const isPaid = !!o.deliveryCommissionPaid;
        lifetimeEarnings += amt;
        if (isPaid) paidEarnings += amt; else pendingEarnings += amt;
        todayEarnings += amt;
        trips.push({
          orderId: o.id,
          type: 'Delivery',
          customerName: o.customerName || 'Customer',
          date: o.created_at || new Date().toISOString(),
          amount: amt,
          status: isPaid ? 'Paid' : 'Pending',
        });
      }
    });

    return {
      todayEarnings,
      pendingEarnings,
      paidEarnings,
      lifetimeEarnings,
      trips,
    };
  },
};
