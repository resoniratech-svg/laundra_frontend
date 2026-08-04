import { TaskService } from './TaskService';
import { AnnouncementService } from './AnnouncementService';
import { Order } from '../types/order';

export const DashboardService = {
  getDashboardData: async (driverName: string) => {
    const orders: Order[] = await TaskService.fetchOrders();
    const announcements = await AnnouncementService.fetchAnnouncements();

    const cleanName = driverName.trim().toLowerCase();
    const pickupStatuses = ['created', 'accepted', 'pickup assigned', 'pending pickup', 'courier on the way', 'reached customer'];
    const deliveryStatuses = ['ready', 'out for delivery', 'partially delivered'];

    const myOrders = orders.filter(o => {
      if (o.isDeleted) return false;
      const matchPickup = o.pickupCourier && (o.pickupCourier.trim().toLowerCase() === cleanName || o.pickupCourier === 'All Delivery Staff');
      const matchDelivery = o.deliveryCourier && (o.deliveryCourier.trim().toLowerCase() === cleanName || o.deliveryCourier === 'All Delivery Staff');
      return matchPickup || matchDelivery;
    });

    const pendingPickups = myOrders.filter(o => pickupStatuses.includes((o.status || '').toLowerCase())).length;
    const pendingDeliveries = myOrders.filter(o => {
      const isDeliv = (o.status || '').toLowerCase() === 'ready' || (o.status || '').toLowerCase() === 'out for delivery';
      const hasQty = (o.delivery_pending_quantity || o.deliveryPendingQuantity || 0) > 0;
      return isDeliv || hasQty;
    }).length;
    const completedDrops = myOrders.filter(o => (o.status || '').toLowerCase() === 'delivered').length;

    const totalCommission = myOrders.reduce((sum, o) => {
      return sum + (o.pickupCommission || 0) + (o.deliveryCommission || 0);
    }, 0);

    return {
      pendingPickups,
      pendingDeliveries,
      completedDrops,
      totalCommission,
      orders: myOrders,
      announcements,
    };
  },
};
