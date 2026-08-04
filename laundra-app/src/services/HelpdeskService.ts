import { apiClient } from '../api/client';

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: 'PENDING' | 'RESPONDED' | 'CLOSED';
  admin_response?: string;
  created_at?: string;
}

export const HelpdeskService = {
  fetchTickets: async (): Promise<Ticket[]> => {
    try {
      const res = await apiClient.get('/api/v1/staff/support-tickets');
      if (Array.isArray(res.data)) {
        return res.data;
      }
    } catch (e) {
      console.warn('HelpdeskService fetch error:', e);
    }
    return [];
  },

  raiseTicket: async (subject: string, description: string): Promise<boolean> => {
    try {
      await apiClient.post('/api/v1/staff/support-tickets', { subject, description });
      return true;
    } catch (e) {
      console.warn('HelpdeskService raiseTicket error:', e);
      return false;
    }
  },
};
