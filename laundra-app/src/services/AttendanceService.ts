import { AttendanceLog } from '../types/leave';

export const AttendanceService = {
  clockInOut: async (type: 'Clock In' | 'Clock Out', gps: string): Promise<AttendanceLog> => {
    return {
      id: `att-${Date.now()}`,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      type,
      gps,
      date: new Date().toISOString().split('T')[0],
    };
  },
};
