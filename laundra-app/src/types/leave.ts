export interface LeaveRequest {
  id?: string;
  deliveryBoyName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt?: string;
}

export interface AttendanceLog {
  id?: string;
  time: string;
  type: 'Clock In' | 'Clock Out';
  gps: string;
  date?: string;
}
