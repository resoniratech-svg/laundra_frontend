import { apiClient } from '../api/client';
import { AnnouncementService } from './AnnouncementService';
import { HelpdeskService } from './HelpdeskService';
import { NotificationItem } from '../types/announcement';

export const NotificationService = {
  fetchLiveNotifications: async (userName: string = 'Staff'): Promise<NotificationItem[]> => {
    const list: NotificationItem[] = [];

    try {
      // 1. Fetch real active announcements
      const anns = await AnnouncementService.fetchAnnouncements();
      if (Array.isArray(anns)) {
        anns.forEach((a: any) => {
          const dateStr = a.created_at ? new Date(a.created_at).toLocaleDateString() : 'Recently';
          list.push({
            id: `ann-${a.id}`,
            text: `📢 Announcement: ${a.title}`,
            time: dateStr,
            unread: true,
          });
        });
      }

      // 2. Fetch real helpdesk support tickets
      const tickets = await HelpdeskService.fetchTickets();
      if (Array.isArray(tickets)) {
        tickets.forEach((t: any) => {
          const ticketIdStr = t.id ? String(t.id).slice(0, 8) : 'TKT';
          const timeStr = t.created_at ? new Date(t.created_at).toLocaleDateString() : 'Just now';
          list.push({
            id: `tkt-${t.id}`,
            text: `🎧 Support Ticket #${ticketIdStr} from ${userName}: ${t.subject || 'Ticket'}`,
            time: timeStr,
            unread: t.status === 'PENDING',
          });
        });
      }

      // 3. Fetch active delivery orders
      try {
        const ordersRes = await apiClient.get('/api/v1/mobile-staff/orders');
        if (Array.isArray(ordersRes.data)) {
          ordersRes.data.slice(0, 3).forEach((o: any) => {
            const orderNum = o.order_number || String(o.id).slice(0, 6);
            list.push({
              id: `ord-${o.id}`,
              text: `📦 Order #${orderNum} - Status: ${o.status || 'Assigned'}`,
              time: 'Today',
              unread: false,
            });
          });
        }
      } catch (err) {
        // Ignored if orders endpoint not reachable
      }
    } catch (e) {
      console.warn('NotificationService fetchLiveNotifications error:', e);
    }

    return list;
  },
};
