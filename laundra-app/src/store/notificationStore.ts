import { create } from 'zustand';
import { NotificationItem } from '../types/announcement';

interface NotificationState {
  notifications: NotificationItem[];
  setNotifications: (notifications: NotificationItem[]) => void;
  markAsRead: (id: string | number) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [
    { id: 1, text: 'New home pickup requested by Selena Gomez.', time: '10 mins ago', unread: true },
    { id: 2, text: 'Order #OR-8839 status changed to Ready for Delivery.', time: '2 hours ago', unread: false },
  ],
  setNotifications: (notifications) => set({ notifications }),
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, unread: false } : n)),
    })),
}));
