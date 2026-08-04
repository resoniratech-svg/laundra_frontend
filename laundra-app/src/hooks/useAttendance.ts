import { useAttendanceStore } from '../store/attendanceStore';
import { AttendanceService } from '../services/AttendanceService';

export const useAttendance = () => {
  const { isClockedIn, attendanceLogs, leaveRequests, clockIn, clockOut, addLeaveRequest } = useAttendanceStore();

  const toggleClock = async (gps: string = '25.2854° N, 51.5310° E') => {
    const type = isClockedIn ? 'Clock Out' : 'Clock In';
    const log = await AttendanceService.clockInOut(type, gps);
    if (isClockedIn) {
      clockOut(log);
    } else {
      clockIn(log);
    }
  };

  return {
    isClockedIn,
    attendanceLogs,
    leaveRequests,
    toggleClock,
    addLeaveRequest,
  };
};
