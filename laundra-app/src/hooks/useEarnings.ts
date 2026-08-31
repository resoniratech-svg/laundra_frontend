import { useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { useTasks } from './useTasks';
import { EarningService } from '../services/EarningService';

export const useEarnings = () => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const { data: orders = [], refetch } = useTasks();

  const earnings = useMemo(() => {
    const driverName = currentUser?.name || '';
    return EarningService.calculateEarnings(orders, driverName);
  }, [orders, currentUser]);

  return {
    ...earnings,
    refetch
  };
};
