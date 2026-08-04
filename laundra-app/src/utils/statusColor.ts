import { STATUS_COLORS } from '../constants/status';

export const getStatusColor = (status: string = '') => {
  const key = status.toLowerCase();
  return STATUS_COLORS[key] || { bg: '#EFF6FF', text: '#2563EB' };
};
