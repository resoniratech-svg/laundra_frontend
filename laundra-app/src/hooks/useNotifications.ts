import { useEffect } from 'react';
import { useNotificationStore } from '../store/notificationStore';
import { NotificationService } from '../services/NotificationService';
import { useAuthStore } from '../store/authStore';

export const useNotifications = () => {
  const { notifications, setNotifications, markAsRead } = useNotificationStore();
  const currentUser = useAuthStore((state) => state.currentUser);
  const userName = currentUser?.name || 'vinay';

  const refetchNotifications = async () => {
    const list = await NotificationService.fetchLiveNotifications(userName);
    if (Array.isArray(list)) {
      setNotifications(list);
    }
  };

  useEffect(() => {
    refetchNotifications();
  }, [userName]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    refetchNotifications,
  };
};
