import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { Avatar } from '../components/Avatar';
import { LoadingView } from '../components/LoadingView';
import { ErrorView } from '../components/ErrorView';
import { useDashboard } from '../hooks/useDashboard';
import { useNotifications } from '../hooks/useNotifications';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadow } from '../theme/shadow';
import { formatDate } from '../utils/formatDate';

import { useTasks } from '../hooks/useTasks';
import { isMyPickupOrder, isMyDeliveryOrder } from '../utils/helpers';
import { Order } from '../types/order';

export const DashboardScreen = () => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const { data, isLoading, error, refetch, isRefetching } = useDashboard();
  const { data: orders = [], refetch: refetchTasks } = useTasks();
  const { notifications, refetchNotifications } = useNotifications();

  const pickupStatuses = ['created', 'accepted', 'pickup assigned', 'pending pickup', 'courier on the way', 'reached customer'];
  
  const pickupOrders = React.useMemo(() => {
    return orders.filter((o) => isMyPickupOrder(o, currentUser) && pickupStatuses.includes((o.deliveryStatus || o.status || '').toLowerCase()));
  }, [orders, currentUser]);

  const isDeliveryOrderActive = (o: Order) => {
    if (!isMyDeliveryOrder(o, currentUser)) return false;
    const delStatus = (o.deliveryStatus || o.status || '').toLowerCase();
    if (delStatus === 'delivered' || delStatus === 'fully_delivered' || delStatus === 'completed') return false;
    const activeStatuses = ['out for delivery', 'out_for_delivery', 'ready', 'assigned', 'on_the_way', 'courier on the way', 'reached customer', 'reached_customer', 'partially delivered', 'partially_delivered'];
    return activeStatuses.includes(delStatus);
  };

  const deliveryOrders = React.useMemo(() => {
    return orders.filter(isDeliveryOrderActive);
  }, [orders, currentUser]);

  const onRefresh = useCallback(() => {
    refetch();
    refetchTasks();
    refetchNotifications();
  }, [refetch, refetchTasks, refetchNotifications]);

  if (isLoading) return <LoadingView message="Loading delivery dashboard..." />;
  if (error) return <ErrorView message="Failed to connect to operations server." onRetry={refetch} />;

  const pendingPickups = pickupOrders.length;
  const pendingDeliveries = deliveryOrders.length;
  const completedDrops = data?.completedDrops || 0;
  const totalCommission = data?.totalCommission || 0;
  const announcements = data?.announcements || [];

  const userName = currentUser?.name || 'laundry';
  const companyName = currentUser?.companyName || 'Iron';

  return (
    <ScreenContainer style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Bar matching exact mockup */}
        <View style={styles.headerRow}>
          <View style={styles.headerCenter}>
            <Text style={styles.companyTitle}>{companyName}</Text>
            <Text style={styles.welcomeTextSmall}>Welcome, {userName}!</Text>
            <Text style={styles.subText}>Ready for your shifts today?</Text>
            <Text style={styles.dateText}>{formatDate(new Date().toISOString())}</Text>
          </View>
        </View>

        {/* Vertical Stack Statistic Cards */}
        <View style={styles.gridContainer}>
          {/* Card 1: Pickups Today (Blue) */}
          <View style={[styles.statCard, { backgroundColor: '#f0f9ff', borderColor: '#e0f2fe' }]}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 22 }}>🧺</Text>
                <Text style={[styles.cardTitle, { color: '#0369a1' }]}>Pickups Today</Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <Text style={[styles.cardNumber, { color: '#0369a1' }]}>{pendingPickups}</Text>
              <View style={[styles.pillBadge, { backgroundColor: '#e0f2fe' }]}>
                <Text style={[styles.pillText, { color: '#0284c7' }]}>Pending: {pendingPickups}</Text>
              </View>
            </View>
            <Text style={[styles.cardSubtitle, { color: '#0284c7' }]}>Assigned Queue</Text>
          </View>

          {/* Card 2: Deliveries Today (Orange) */}
          <View style={[styles.statCard, { backgroundColor: '#fff7ed', borderColor: '#ffedd5' }]}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 22 }}>🚚</Text>
                <Text style={[styles.cardTitle, { color: '#c2410c' }]}>Deliveries Today</Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <Text style={[styles.cardNumber, { color: '#c2410c' }]}>{pendingDeliveries}</Text>
              <View style={[styles.pillBadge, { backgroundColor: '#ffedd5' }]}>
                <Text style={[styles.pillText, { color: '#ea580c' }]}>Pending: {pendingDeliveries}</Text>
              </View>
            </View>
            <Text style={[styles.cardSubtitle, { color: '#ea580c' }]}>Ready Drops</Text>
          </View>

          {/* Card 3: Drops Completed (Green) */}
          <View style={[styles.statCard, { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' }]}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={styles.checkBg}>
                  <Text style={{ fontSize: 14, color: '#ffffff' }}>✓</Text>
                </View>
                <Text style={[styles.cardTitle, { color: '#15803d' }]}>Drops Completed</Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <Text style={[styles.cardNumber, { color: '#15803d' }]}>{completedDrops}</Text>
              <View style={[styles.pillBadge, { backgroundColor: '#dcfce7' }]}>
                <Text style={[styles.pillText, { color: '#16a34a' }]}>Completed</Text>
              </View>
            </View>
            <Text style={[styles.cardSubtitle, { color: '#16a34a' }]}>Deliveries Done</Text>
          </View>

          {/* Card 4: Total Earnings (Yellow) */}
          <View style={[styles.statCard, { backgroundColor: '#fefce8', borderColor: '#fef3c7' }]}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 22 }}>💵</Text>
                <Text style={[styles.cardTitle, { color: '#a16207' }]}>Total Earnings</Text>
              </View>
            </View>

            <View style={styles.cardBodySingle}>
              <Text style={[styles.cardNumberText, { color: '#a16207' }]}>
                QR {totalCommission.toFixed(2)}
              </Text>
            </View>
            <Text style={[styles.cardSubtitle, { color: '#ca8a04', marginTop: 4 }]}>Commission Earned Today</Text>
          </View>
        </View>

        {/* Live Notifications White Card */}
        <View style={[styles.sectionCard, shadow.card]}>
          <View style={styles.sectionTitleRow}>
            <Text style={{ fontSize: 18 }}>🔔</Text>
            <Text style={styles.sectionTitle}>Live Notifications</Text>
          </View>
          {notifications.length === 0 ? (
            <Text style={styles.emptyStateText}>No new notifications</Text>
          ) : (
            notifications.slice(0, 3).map((item) => (
              <View key={item.id} style={styles.notificationRow}>
                <Text style={styles.notificationText}>{item.text}</Text>
              </View>
            ))
          )}
        </View>

        {/* Company Announcements White Card */}
        <View style={[styles.sectionCard, shadow.card]}>
          <View style={styles.sectionTitleRow}>
            <Text style={{ fontSize: 18 }}>📢</Text>
            <Text style={styles.sectionTitle}>Company Announcements</Text>
          </View>
          {announcements.length === 0 ? (
            <Text style={styles.emptyStateText}>No active announcements</Text>
          ) : (
            announcements.slice(0, 2).map((item) => (
              <View key={item.id} style={styles.announcementRow}>
                <Text style={styles.announcementTitle}>{item.title}</Text>
                <Text style={styles.announcementContent}>{item.content}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  headerCenter: {
    flex: 1,
  },
  companyTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1e3a8a',
    letterSpacing: 0.5,
  },
  welcomeTextSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  subText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  dateText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '700',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fef9c3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fef08a',
  },
  gridContainer: {
    gap: 14,
    marginBottom: 16,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 14,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: radius.card, // 16px
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  checkBg: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  cardBodySingle: {
    marginVertical: 4,
  },
  cardNumber: {
    fontSize: 30,
    fontWeight: '900',
  },
  cardNumberText: {
    fontSize: 24,
    fontWeight: '900',
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.card, // 16px
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  emptyStateText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 4,
  },
  notificationRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  notificationText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  announcementRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  announcementTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  announcementContent: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
});
