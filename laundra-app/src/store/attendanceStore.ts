import { create } from 'zustand';
import { AttendanceLog, LeaveRequest } from '../types/leave';

interface AttendanceState {
  isClockedIn: boolean;
  attendanceLogs: AttendanceLog[];
  leaveRequests: LeaveRequest[];
  clockIn: (log: AttendanceLog) => void;
  clockOut: (log: AttendanceLog) => void;
  addLeaveRequest: (req: LeaveRequest) => void;
}

export const useAttendanceStore = create<AttendanceState>((set) => ({
  isClockedIn: false,
  attendanceLogs: [],
  leaveRequests: [],
  clockIn: (log) => set((state) => ({ isClockedIn: true, attendanceLogs: [log, ...state.attendanceLogs] })),
  clockOut: (log) => set((state) => ({ isClockedIn: false, attendanceLogs: [log, ...state.attendanceLogs] })),
  addLeaveRequest: (req) => set((state) => ({ leaveRequests: [req, ...state.leaveRequests] })),
}));
