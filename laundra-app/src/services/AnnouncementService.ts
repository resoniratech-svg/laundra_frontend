import { apiClient } from '../api/client';
import { Announcement } from '../types/announcement';

export const AnnouncementService = {
  fetchAnnouncements: async (): Promise<Announcement[]> => {
    try {
      // 1. Try staff-specific announcements endpoint
      const res = await apiClient.get('/api/v1/announcements/staff');
      if (Array.isArray(res.data)) {
        return res.data;
      }
    } catch (e) {
      console.warn('AnnouncementService fetch /staff warning, trying fallback:', e);
      try {
        // 2. Try general announcements endpoint
        const res2 = await apiClient.get('/api/v1/deliveries/announcements');
        if (Array.isArray(res2.data)) {
          return res2.data;
        }
      } catch (err) {
        console.warn('AnnouncementService fetch error:', err);
      }
    }
    return [];
  },
};
