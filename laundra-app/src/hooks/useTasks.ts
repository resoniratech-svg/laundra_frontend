import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TaskService } from '../services/TaskService';

export const useTasks = () => {
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: ['orders'],
    queryFn: TaskService.fetchOrders,
    refetchInterval: 10000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status, deliveryStatus, backendId }: { orderId: string; status: string; deliveryStatus?: string; backendId?: string }) =>
      TaskService.updateOrderStatus(orderId, status, deliveryStatus, backendId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return {
    ...tasksQuery,
    updateStatus: updateStatusMutation.mutateAsync,
  };
};
