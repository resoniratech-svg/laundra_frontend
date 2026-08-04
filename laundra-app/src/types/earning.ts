export interface EarningTrip {
  orderId: string;
  type: 'Pickup' | 'Delivery';
  customerName: string;
  date: string;
  amount: number;
  status: 'Paid' | 'Pending';
}

export interface EarningSummary {
  todayEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  lifetimeEarnings: number;
  trips: EarningTrip[];
}
