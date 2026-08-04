import { LeaveRequest } from '../types/leave';

export const LeaveService = {
  applyLeave: async (req: LeaveRequest): Promise<boolean> => {
    return true;
  },
};
