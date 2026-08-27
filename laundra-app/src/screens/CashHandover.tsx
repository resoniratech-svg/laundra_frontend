import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { Header } from '../components/Header';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadow } from '../theme/shadow';
import { tApp } from '../utils/i18n';

interface CollectedOrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  taskType: 'Pickup' | 'Delivery';
  amount: number;
  paymentMethod: 'Cash' | 'Card' | 'Cheque' | string;
  date: string;
  isStoreCounter?: boolean;
}

export const CashHandoverScreen = () => {
  const language = useAuthStore((state) => state.language);
  const currentUser = useAuthStore((state) => state.currentUser);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [collectedOrders, setCollectedOrders] = useState<CollectedOrderItem[]>([]);

  useEffect(() => {
    fetchDriverCollections();
  }, []);

  const fetchDriverCollections = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/v1/deliveries');
      if (Array.isArray(res.data)) {
        const currentDriverName = (currentUser?.name || '').trim().toLowerCase();
        const detailsPromises = res.data.map(async (d: any) => {
          try {
            const detailRes = await apiClient.get(`/api/v1/deliveries/${d.id}/details`);
            const details = detailRes.data || {};
            const orderData = details.order || {};
            const custData = details.customer || {};

            const isPaid = (orderData.payment_status || '').toUpperCase() === 'PAID';
            const isStoreCollected = orderData.payment_collected_by === 'STORE_COUNTER' || orderData.paymentCollectedBy === 'STORE_COUNTER';

            if (!isPaid || isStoreCollected) return null;

            const methodRaw = (
              orderData.payment_method ||
              d.pickup_payment_method ||
              orderData.pickup_payment_method ||
              d.delivery_payment_method ||
              'Cash'
            ).toUpperCase();

            const cleanMethod =
              methodRaw === 'CARD' ? 'Card' : methodRaw === 'CHEQUE' ? 'Cheque' : 'Cash';

            return {
              id: d.id,
              orderNumber: orderData.order_number || String(orderData.id || d.order_id).slice(0, 8),
              customerName: custData.name || 'Customer',
              taskType: (d.type || 'Pickup').toUpperCase() === 'DELIVERY' ? ('Delivery' as const) : ('Pickup' as const),
              amount: Number(orderData.total_amount || 0),
              paymentMethod: cleanMethod,
              date: orderData.pickup_date ? new Date(orderData.pickup_date).toLocaleDateString() : new Date().toLocaleDateString(),
              isStoreCounter: isStoreCollected,
            };
          } catch (e) {
            return null;
          }
        });

        const results = await Promise.all(detailsPromises);
        setCollectedOrders(results.filter(Boolean) as CollectedOrderItem[]);
      }
    } catch (e) {
      console.error('Failed to fetch driver collections', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDriverCollections();
  };

  // KPIs
  const cashInHand = useMemo(() => {
    return collectedOrders
      .filter((o) => o.paymentMethod === 'Cash')
      .reduce((sum, o) => sum + o.amount, 0);
  }, [collectedOrders]);

  const cardsAndCheques = useMemo(() => {
    return collectedOrders
      .filter((o) => o.paymentMethod !== 'Cash')
      .reduce((sum, o) => sum + o.amount, 0);
  }, [collectedOrders]);

  const totalShiftCollections = cashInHand + cardsAndCheques;

  return (
    <ScreenContainer>
      <Header
        title={`💰 ${tApp('Cash In Hand & Handover', language)}`}
        subtitle={tApp('Track physical cash, cards, & shift store handover', language)}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* KPI STAT CARDS */}
            <View style={styles.kpiGrid}>
              {/* Card 1: Physical Cash In Hand */}
              <View style={[styles.kpiCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }, shadow.card]}>
                <Text style={styles.kpiIcon}>💵</Text>
                <Text style={[styles.kpiTitle, { color: '#166534' }]}>Physical Cash In Hand</Text>
                <Text style={[styles.kpiValue, { color: '#15803d' }]}>QR {cashInHand.toFixed(2)}</Text>
                <Text style={styles.kpiSub}>To be remitted at store counter</Text>
              </View>

              {/* Card 2: Card Swipes & Cheques */}
              <View style={[styles.kpiCard, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }, shadow.card]}>
                <Text style={styles.kpiIcon}>💳</Text>
                <Text style={[styles.kpiTitle, { color: '#1e40af' }]}>Card Swipes & Cheques</Text>
                <Text style={[styles.kpiValue, { color: '#1d4ed8' }]}>QR {cardsAndCheques.toFixed(2)}</Text>
                <Text style={styles.kpiSub}>Digital & cheque receipts verified</Text>
              </View>

              {/* Card 3: Total Shift Collections */}
              <View style={[styles.kpiCard, { backgroundColor: '#faf5ff', borderColor: '#e9d5ff', width: '100%' }, shadow.card]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={[styles.kpiTitle, { color: '#6b21a8' }]}>Total Shift Collections</Text>
                    <Text style={[styles.kpiValue, { color: '#7e22ce' }]}>QR {totalShiftCollections.toFixed(2)}</Text>
                  </View>
                  <Text style={{ fontSize: 28 }}>📦</Text>
                </View>
              </View>
            </View>

            {/* SECTION: ACTIVE COLLECTIONS AWAITING STORE HANDOVER */}
            <View style={[styles.card, shadow.card]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>📦 Shift Collections Awaiting Handover</Text>
                <Text style={styles.countBadge}>{collectedOrders.length} Orders</Text>
              </View>

              {collectedOrders.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>✨</Text>
                  <Text style={styles.emptyTitle}>All Clear!</Text>
                  <Text style={styles.emptySub}>No unremitted cash or collections pending handover.</Text>
                </View>
              ) : (
                <View style={styles.ordersList}>
                  {collectedOrders.map((ord) => {
                    const isCash = ord.paymentMethod === 'Cash';
                    const isCard = ord.paymentMethod === 'Card';
                    const isCheque = ord.paymentMethod === 'Cheque';

                    return (
                      <View key={ord.id} style={styles.orderRow}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <Text style={styles.orderIdText}>#{ord.orderNumber}</Text>
                            <Text style={styles.taskTypeTag}>{ord.taskType}</Text>
                          </View>
                          <Text style={styles.custNameText}>{ord.customerName}</Text>
                          <Text style={styles.dateText}>{ord.date}</Text>
                        </View>

                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          <Text style={styles.amountText}>QR {ord.amount.toFixed(2)}</Text>
                          <View
                            style={[
                              styles.methodBadge,
                              isCash && styles.cashBadge,
                              isCard && styles.cardBadge,
                              isCheque && styles.chequeBadge,
                            ]}
                          >
                            <Text
                              style={[
                                styles.methodBadgeText,
                                isCash && styles.cashBadgeText,
                                isCard && styles.cardBadgeText,
                                isCheque && styles.chequeBadgeText,
                              ]}
                            >
                              {isCash ? '💵 Cash' : isCard ? '💳 Card' : '📝 Cheque'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* SECTION: STORE HANDOVER INSTRUCTIONS */}
            <View style={[styles.card, { backgroundColor: '#f8fafc' }, shadow.card]}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#1e293b', marginBottom: 4 }}>
                ℹ️ Store Counter Handover Process
              </Text>
              <Text style={{ fontSize: 11, color: '#64748b', lineHeight: 16 }}>
                At the end of your shift, hand over the physical cash (QR {cashInHand.toFixed(2)}) and card slip receipts to the store cashier or admin manager. The cashier will verify and mark the shift handover as settled.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    width: '48%',
    borderRadius: radius.card,
    padding: 14,
    borderWidth: 1,
  },
  kpiIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  kpiTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 2,
  },
  kpiSub: {
    fontSize: 9,
    color: '#64748b',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  countBadge: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 11,
    fontWeight: '700',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 2,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  ordersList: {
    gap: 10,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  orderIdText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e3a8a',
  },
  taskTypeTag: {
    fontSize: 10,
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    fontWeight: '700',
  },
  custNameText: {
    fontSize: 12,
    color: '#334155',
  },
  dateText: {
    fontSize: 10,
    color: '#94a3b8',
  },
  amountText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cashBadge: {
    backgroundColor: '#f0fdf4',
  },
  cardBadge: {
    backgroundColor: '#eff6ff',
  },
  chequeBadge: {
    backgroundColor: '#fefce8',
  },
  methodBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cashBadgeText: {
    color: '#15803d',
  },
  cardBadgeText: {
    color: '#1d4ed8',
  },
  chequeBadgeText: {
    color: '#a16207',
  },
});
