import { create } from 'zustand';
import { Order } from '../types/order';

interface TaskState {
  orders: Order[];
  activeTaskTab: 'pickups' | 'deliveries';
  setOrders: (orders: Order[]) => void;
  setActiveTaskTab: (tab: 'pickups' | 'deliveries') => void;
  updateOrderInStore: (updated: Order) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  orders: [],
  activeTaskTab: 'pickups',
  setOrders: (orders) => set({ orders }),
  setActiveTaskTab: (activeTaskTab) => set({ activeTaskTab }),
  updateOrderInStore: (updated) =>
    set((state) => ({
      orders: state.orders.map((o) => (o.id === updated.id ? updated : o)),
    })),
}));
