import { useQuery } from '@tanstack/react-query';
import { DashboardService } from '../services/DashboardService';
import { useAuthStore } from '../store/authStore';

export const useDashboard = () => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const driverName = currentUser?.name || 'Driver';

  return useQuery({
    queryKey: ['dashboard', driverName],
    queryFn: () => DashboardService.getDashboardData(driverName),
    refetchInterval: 15000,
  });
};
