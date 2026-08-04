import { Order } from '../types/order';
import { User } from '../types/user';

/**
 * Filter pickup orders for logged-in delivery staff.
 * Matches exact web portal logic from DeliveryPortal.tsx:
 * Order belongs to current user if pickupCourier (or courier) matches currentUser.name
 * or is assigned to 'All Delivery Staff'.
 */
export const isMyPickupOrder = (o: Order, currentUser: User | null): boolean => {
  if (o.isDeleted || !currentUser) return false;
  const currentName = currentUser.name.trim().toLowerCase();
  const pickupCourier = (o.pickupCourier || o.courier || '').trim().toLowerCase();

  return pickupCourier === currentName || pickupCourier === 'all delivery staff';
};

/**
 * Filter delivery orders for logged-in delivery staff.
 * Matches exact web portal logic from DeliveryPortal.tsx:
 * Order belongs to current user if deliveryCourier (or courier) matches currentUser.name
 * or is assigned to 'All Delivery Staff'.
 */
export const isMyDeliveryOrder = (o: Order, currentUser: User | null): boolean => {
  if (o.isDeleted || !currentUser) return false;
  const currentName = currentUser.name.trim().toLowerCase();
  const deliveryCourier = (o.deliveryCourier || o.courier || '').trim().toLowerCase();

  return deliveryCourier === currentName || deliveryCourier === 'all delivery staff';
};
