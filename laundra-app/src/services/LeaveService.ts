import { apiClient } from '../api/client';
import { LeaveRequest } from '../types/leave';

export const LeaveService = {
  applyLeave: async (startDate: string, endDate: string, reason: string): Promise<boolean> => {
    try {
      const res = await apiClient.post('/api/v1/mobile-staff/leaves', {
        start_date: startDate,
        end_date: endDate,
        reason: reason,
      });
      return res.status === 200 || res.status === 201;
    } catch (error) {
      console.warn('LeaveService applyLeave error:', error);
      throw error;
    }
  },

  fetchMyLeaves: async (): Promise<LeaveRequest[]> => {
    try {
      const res = await apiClient.get('/api/v1/mobile-staff/leaves');
      if (Array.isArray(res.data)) {
        return res.data.map((lr: any) => ({
          id: lr.id,
          deliveryBoyName: 'Me',
          startDate: lr.start_date,
          endDate: lr.end_date,
          reason: lr.reason,
          status: lr.status === 'APPROVED' ? 'Approved' : (lr.status === 'REJECTED' ? 'Rejected' : 'Pending'),
          createdAt: lr.created_at || new Date().toISOString(),
        }));
      }
    } catch (error) {
      console.warn('LeaveService fetchMyLeaves error:', error);
    }
    return [];
  },
};
