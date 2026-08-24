export interface OrderItem {
  itemId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone?: string;
  address?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  status: string;
  deliveryStatus?: string;
  pickupCourier?: string | null;
  deliveryCourier?: string | null;
  courier?: string | null;
  items?: OrderItem[];
  itemCount?: number;
  delivery_pending_quantity?: number;
  deliveryPendingQuantity?: number;
  total?: number;
  pickupCommission?: number;
  deliveryCommission?: number;
  pickupCommissionPaid?: boolean;
  deliveryCommissionPaid?: boolean;
  pickupPaymentMethod?: string;
  deliveryPaymentMethod?: string;
  pickupDate?: string;
  deliveryDate?: string;
  pickupOtp?: string;
  deliveryOtp?: string;
  companyId?: string;
  isDeleted?: boolean;
  created_at?: string;
}
