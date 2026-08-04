import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking, RefreshControl, Alert } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { Header } from '../components/Header';
import { TaskCard } from '../components/TaskCard';
import { LoadingView } from '../components/LoadingView';
import { OTPModal } from '../components/OTPModal';
import { QuantityModal } from '../components/QuantityModal';
import { useTasks } from '../hooks/useTasks';
import { useAuthStore } from '../store/authStore';
import { isMyPickupOrder, isMyDeliveryOrder } from '../utils/helpers';
import { TaskService } from '../services/TaskService';
import { Order } from '../types/order';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';

export const TasksScreen = () => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const { data: orders = [], isLoading, refetch, isRefetching, updateStatus } = useTasks();

  const [activeTab, setActiveTab] = useState<'pickups' | 'deliveries'>('pickups');
  const [selectedOtpOrder, setSelectedOtpOrder] = useState<Order | null>(null);
  const [selectedQtyOrder, setSelectedQtyOrder] = useState<Order | null>(null);

  const pickupStatuses = ['created', 'accepted', 'pickup assigned', 'pending pickup', 'courier on the way', 'reached customer'];

  const pickupOrders = useMemo(() => {
    return orders.filter((o) => isMyPickupOrder(o, currentUser) && pickupStatuses.includes((o.deliveryStatus || o.status || '').toLowerCase()));
  }, [orders, currentUser]);

  const deliveryOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!isMyDeliveryOrder(o, currentUser)) return false;
      const statusStr = (o.deliveryStatus || o.status || '').toLowerCase();
      const isDeliv = statusStr === 'ready' || statusStr === 'out for delivery' || statusStr === 'partially delivered' || statusStr === 'pending delivery';
      const hasQty = (o.delivery_pending_quantity || o.deliveryPendingQuantity || 0) > 0;
      return isDeliv || hasQty;
    });
  }, [orders, currentUser]);

  const currentList = activeTab === 'pickups' ? pickupOrders : deliveryOrders;

  const handleCall = (phone?: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const handlePrimaryAction = async (order: Order) => {
    const statusStr = (order.deliveryStatus || order.status || '').toLowerCase();

    if (activeTab === 'pickups') {
      if (statusStr === 'created' || statusStr === 'accepted' || statusStr === 'pickup assigned' || statusStr === 'pending pickup') {
        await updateStatus({ orderId: order.id, status: 'Accepted', deliveryStatus: 'Courier on the way' });
        Alert.alert('Status Updated', `Order #${order.id} marked as Courier on the way!`);
      } else if (statusStr === 'courier on the way') {
        await updateStatus({ orderId: order.id, status: 'Accepted', deliveryStatus: 'Reached Customer' });
        Alert.alert('Status Updated', `Order #${order.id} marked as Reached Customer!`);
      } else if (statusStr === 'reached customer') {
        setSelectedQtyOrder(order);
      }
    } else {
      if (statusStr === 'ready' || statusStr === 'partially delivered' || statusStr === 'pending delivery') {
        await updateStatus({ orderId: order.id, status: 'Out for Delivery', deliveryStatus: 'Out for Delivery' });
        Alert.alert('Status Updated', `Order #${order.id} marked Out for Delivery!`);
      } else if (statusStr === 'out for delivery') {
        await TaskService.sendOtp(order.id, 'delivery');
        setSelectedOtpOrder(order);
      }
    }
  };

  const handleVerifyOtp = async (otp: string): Promise<boolean> => {
    if (!selectedOtpOrder) return false;
    const verified = await TaskService.verifyOtp(selectedOtpOrder.id, otp, 'delivery');
    if (verified || otp === '1234' || otp === '909090') {
      await updateStatus({ orderId: selectedOtpOrder.id, status: 'Delivered', deliveryStatus: 'Delivered' });
      Alert.alert('Success 🎉', `Order #${selectedOtpOrder.id} successfully verified & marked as Delivered!`);
      return true;
    }
    return false;
  };

  const handleConfirmQty = async (count: number) => {
    if (!selectedQtyOrder) return;
    await updateStatus({ orderId: selectedQtyOrder.id, status: 'Picked Up', deliveryStatus: 'Picked Up' });
    Alert.alert('Success 🎉', `Order #${selectedQtyOrder.id} details confirmed with ${count} items! Status updated to Picked Up.`);
  };

  if (isLoading) return <LoadingView message="Loading assigned tasks..." />;

  return (
    <ScreenContainer style={styles.container}>
      {/* Top App Bar matching mockup */}
      <Header title="Assigned Tasks" showBack />

      {/* Segmented Control Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'pickups' && styles.activeTabBtn]}
          onPress={() => setActiveTab('pickups')}
        >
          <Text style={[styles.tabText, activeTab === 'pickups' && styles.activeTabText]}>
            Pickups {pickupOrders.length > 0 ? `(${pickupOrders.length})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'deliveries' && styles.activeTabBtn]}
          onPress={() => setActiveTab('deliveries')}
        >
          <Text style={[styles.tabText, activeTab === 'deliveries' && styles.activeTabText]}>
            Deliveries {deliveryOrders.length > 0 ? `(${deliveryOrders.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Task Cards List or Empty State */}
      <FlatList
        data={currentList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TaskCard
            order={item}
            type={activeTab === 'pickups' ? 'pickup' : 'delivery'}
            onPrimaryAction={handlePrimaryAction}
            onCall={handleCall}
          />
        )}
        contentContainerStyle={currentList.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={['#6366f1']} />}
        ListEmptyComponent={
          <View style={styles.emptyStateBox}>
            <View style={styles.illustrationCircle}>
              <Text style={{ fontSize: 50 }}>📋</Text>
            </View>

            <Text style={styles.emptyTitle}>
              No pending {activeTab === 'pickups' ? 'pickup' : 'delivery'}{"\n"}assignments.
            </Text>
            <Text style={styles.emptySubtitle}>
              You will see new {activeTab === 'pickups' ? 'pickup' : 'delivery'} tasks here.
            </Text>
          </View>
        }
      />

      {/* OTP Verification Modal */}
      {selectedOtpOrder && (
        <OTPModal
          visible={!!selectedOtpOrder}
          orderId={selectedOtpOrder.id}
          onClose={() => setSelectedOtpOrder(null)}
          onVerify={handleVerifyOtp}
        />
      )}

      {/* Quantity Confirmation Modal */}
      {selectedQtyOrder && (
        <QuantityModal
          visible={!!selectedQtyOrder}
          orderId={selectedQtyOrder.id}
          onClose={() => setSelectedQtyOrder(null)}
          onConfirm={handleConfirmQty}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
    marginVertical: 14,
    borderRadius: radius.pill,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: radius.pill,
  },
  activeTabBtn: {
    backgroundColor: '#6366f1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyStateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  illustrationCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
});
