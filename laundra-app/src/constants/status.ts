export const PICKUP_STATUSES = [
  'created',
  'accepted',
  'pickup assigned',
  'pending pickup',
  'courier on the way',
  'reached customer'
];

export const DELIVERY_STATUSES = [
  'ready',
  'out for delivery',
  'partially delivered'
];

export const STATUS_COLORS: { [key: string]: { bg: string; text: string } } = {
  active: { bg: '#DCFCE7', text: '#16A34A' },
  pending: { bg: '#EFF6FF', text: '#2563EB' },
  ready: { bg: '#FEF3C7', text: '#D97706' },
  delivered: { bg: '#DCFCE7', text: '#15803D' },
  suspended: { bg: '#FEE2E2', text: '#B91C1C' },
  approved: { bg: '#DCFCE7', text: '#16A34A' },
  rejected: { bg: '#FEE2E2', text: '#EF4444' },
};
