import { Order } from './order';

export type TaskType = 'pickup' | 'delivery';

export interface Task {
  id: string;
  order: Order;
  type: TaskType;
  status: string;
  customerName: string;
  phone: string;
  address: string;
  readyQuantity?: number;
  totalQuantity?: number;
  scheduledTime?: string;
}
