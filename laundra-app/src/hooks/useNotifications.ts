import { useNotificationStore } from '../store/notificationStore';

export const useNotifications = () => {
  const { notifications, markAsRead } = useNotificationStore();
  const unreadCount = notifications.filter((n) => n.unread).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
  };
};
