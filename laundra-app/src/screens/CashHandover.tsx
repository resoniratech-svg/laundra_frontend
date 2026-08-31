import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
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

interface SettlementVoucher {
  id: string;
  settlementNumber: string;
  driverId?: string;
  driverName: string;
  settledBy: string;
  settledAt: string;
  cashAmount: number;
  cardAmount: number;
  chequeAmount: number;
  totalAmount: number;
  orderCount: number;
  orders?: any[];
  status: string;
}

export const CashHandoverScreen = () => {
  const navigation = useNavigation();
  const language = useAuthStore((state) => state.language);
  const currentUser = useAuthStore((state) => state.currentUser);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [collectedOrders, setCollectedOrders] = useState<CollectedOrderItem[]>([]);
  const [settlementHistory, setSettlementHistory] = useState<SettlementVoucher[]>([]);
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchDriverCollections();
      const interval = setInterval(() => {
        fetchDriverCollections();
      }, 15000);
      return () => clearInterval(interval);
    }, [])
  );

  const fetchDriverCollections = async () => {
    setLoading(true);
    try {
      // 1. Fetch past settlement history
      let pastSettlements: SettlementVoucher[] = [];
      try {
        const settleRes = await apiClient.get('/api/v1/deliveries/settlements');
        if (Array.isArray(settleRes.data)) {
          pastSettlements = settleRes.data;
          setSettlementHistory(pastSettlements);
        }
      } catch (err) {
        console.warn('Could not fetch settlement history:', err);
      }

      const settledOrderIds = new Set<string>();
      pastSettlements.forEach((s) => {
        (s.orders || []).forEach((so: any) => {
          const idVal = String(so.orderId || so.id || '');
          if (idVal) settledOrderIds.add(idVal);
        });
      });

      // 2. Fetch deliveries
      const res = await apiClient.get('/api/v1/deliveries');
      if (Array.isArray(res.data)) {
        const detailsPromises = res.data.map(async (d: any) => {
          try {
            const detailRes = await apiClient.get(`/api/v1/deliveries/${d.id}/details`);
            const details = detailRes.data || {};
            const orderData = details.order || {};
            const custData = details.customer || {};

            const isPaid = (orderData.payment_status || '').toUpperCase() === 'PAID';
            const isStoreCollected = orderData.payment_collected_by === 'STORE_COUNTER' || orderData.paymentCollectedBy === 'STORE_COUNTER';
            const orderNum = orderData.order_number || String(orderData.id || d.order_id).slice(0, 8);
            const isSettled = orderData.handover_settled || settledOrderIds.has(orderNum) || settledOrderIds.has(String(orderData.id)) || settledOrderIds.has(String(d.order_id));

            if (!isPaid || isStoreCollected || isSettled) return null;

            const methodRaw = (
              orderData.payment_method ||
              d.pickup_payment_method ||
              orderData.pickup_payment_method ||
              d.delivery_payment_method ||
              'Cash'
            ).toUpperCase();

            const cleanMethod =
              methodRaw === 'CARD' ? 'Card' : (methodRaw === 'CHEQUE' || methodRaw === 'CHECK') ? 'Cheque' : 'Cash';

            return {
              id: d.id,
              orderNumber: orderNum,
              customerName: custData.name || 'Customer',
              taskType: (d.type || 'Pickup').toUpperCase() === 'DELIVERY' ? ('Delivery' as const) : ('Pickup' as const),
              amount: Number(orderData.total_amount || 0),
              paymentMethod: cleanMethod,
              date: orderData.pickup_date ? new Date(orderData.pickup_date).toLocaleDateString() : new Date().toLocaleDateString(),
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

  const formatSettledDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const normalized = dateStr.includes('Z') || dateStr.includes('+') ? dateStr : `${dateStr}Z`;
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  };

  const openInvoiceForOrder = async (orderIdOrNumber: string, fallbackData?: any) => {
    setLoadingInvoice(true);
    try {
      const cleanId = String(orderIdOrNumber).replace('#', '').trim();

      // 1. Fetch Company info
      let compName = 'ABCD company';
      let compAddr = 'knr';
      let compPhone = '96385274112';
      try {
        const compRes = await apiClient.get('/api/v1/companies');
        if (Array.isArray(compRes.data) && compRes.data.length > 0) {
          const comp = compRes.data[0];
          compName = comp.name || compName;
          compAddr = comp.address && comp.address !== 'N/A' ? comp.address : compAddr;
          compPhone = comp.phone && comp.phone !== 'N/A' ? comp.phone : compPhone;
        }
      } catch (e) {
        // Fallback
      }

      // 2. Fetch deliveries details to get full customer phone, address, and items
      let matchedOrder: any = null;
      try {
        const delivRes = await apiClient.get('/api/v1/deliveries');
        if (Array.isArray(delivRes.data)) {
          for (const d of delivRes.data) {
            try {
              const detRes = await apiClient.get(`/api/v1/deliveries/${d.id}/details`);
              const details = detRes.data || {};
              const ord = details.order || {};
              const cust = details.customer || {};

              const ordNum = String(ord.order_number || ord.id || d.order_id || '').toLowerCase();
              if (
                ordNum === cleanId.toLowerCase() ||
                String(d.id).toLowerCase() === cleanId.toLowerCase() ||
                String(d.order_id).toLowerCase() === cleanId.toLowerCase() ||
                String(ord.id || '').slice(0, 8).toLowerCase() === cleanId.toLowerCase()
              ) {
                matchedOrder = {
                  companyName: compName,
                  companyAddress: compAddr,
                  companyPhone: compPhone,
                  orderNumber: ord.order_number || cleanId,
                  orderDate: ord.pickup_date ? new Date(ord.pickup_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                  customerName: cust.name || fallbackData?.customerName || 'Customer',
                  phone: cust.phone || fallbackData?.phone || 'N/A',
                  address: ord.pickup_address || cust.address || fallbackData?.address || 'Doorstep Pickup',
                  paymentStatus: (ord.payment_status || 'PAID').toUpperCase(),
                  paymentMethod: ord.payment_method || ord.pickup_payment_method || fallbackData?.paymentMethod || 'CASH',
                  driverName: currentUser?.name || 'nandu',
                  items: Array.isArray(ord.items) && ord.items.length > 0
                    ? ord.items.map((it: any) => ({
                        name: it.service_name || it.name || 'Laundry Service',
                        qty: it.quantity || it.ordered_quantity || it.qty || 1,
                        price: Number(it.unit_price || it.price || 0),
                        amount: Number(it.total_price || (Number(it.unit_price || 0) * Number(it.quantity || 1))),
                      }))
                    : fallbackData?.items || [],
                  totalAmount: Number(ord.total_amount || fallbackData?.amount || 0),
                };
                break;
              }
            } catch (e) {
              // continue
            }
          }
        }
      } catch (e) {
        console.warn('Error fetching delivery details for invoice:', e);
      }

      if (!matchedOrder) {
        // Try direct orders API
        try {
          const ordRes = await apiClient.get('/api/v1/orders');
          if (Array.isArray(ordRes.data)) {
            const found = ordRes.data.find(
              (o: any) =>
                String(o.order_number || o.id).toLowerCase() === cleanId.toLowerCase() ||
                String(o.id).slice(0, 8).toLowerCase() === cleanId.toLowerCase()
            );
            if (found) {
              let custPhone = found.customer?.phone || found.phone || 'N/A';
              let custName = found.customer?.name || found.customer_name || fallbackData?.customerName || 'Customer';
              let custAddr = found.pickup_address || found.customer?.address || fallbackData?.address || 'Doorstep Pickup';

              if ((custPhone === 'N/A' || !custPhone) && found.customer_id) {
                try {
                  const custRes = await apiClient.get(`/api/v1/customers/${found.customer_id}`);
                  if (custRes.data) {
                    custPhone = custRes.data.phone || custPhone;
                    custName = custRes.data.name || custName;
                    custAddr = custRes.data.address || custAddr;
                  }
                } catch (ce) {
                  // Fallback
                }
              }

              matchedOrder = {
                companyName: compName,
                companyAddress: compAddr,
                companyPhone: compPhone,
                orderNumber: found.order_number || cleanId,
                orderDate: found.pickup_date ? new Date(found.pickup_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                customerName: custName,
                phone: custPhone,
                address: custAddr,
                paymentStatus: (found.payment_status || 'PAID').toUpperCase(),
                paymentMethod: found.payment_method || fallbackData?.paymentMethod || 'CASH',
                driverName: currentUser?.name || 'nandu',
                items: Array.isArray(found.items)
                  ? found.items.map((it: any) => ({
                      name: it.service_name || it.name || 'Laundry Service',
                      qty: it.quantity || it.ordered_quantity || it.qty || 1,
                      price: Number(it.unit_price || it.price || 0),
                      amount: Number(it.total_price || (Number(it.unit_price || 0) * Number(it.quantity || 1))),
                    }))
                  : [],
                totalAmount: Number(found.total_amount || fallbackData?.amount || 0),
              };
            }
          }
        } catch (e) {
          // Fallback
        }
      }

      if (matchedOrder) {
        setViewingInvoice(matchedOrder);
      } else {
        // Generic fallback
        setViewingInvoice({
          companyName: compName,
          companyAddress: compAddr,
          companyPhone: compPhone,
          orderNumber: cleanId,
          orderDate: new Date().toISOString().split('T')[0],
          customerName: fallbackData?.customerName || 'Customer',
          phone: fallbackData?.phone || 'N/A',
          address: fallbackData?.address || 'Doorstep Pickup',
          paymentStatus: 'PAID',
          paymentMethod: fallbackData?.paymentMethod || 'CASH',
          driverName: currentUser?.name || 'nandu',
          items: fallbackData?.items || [],
          totalAmount: Number(fallbackData?.amount || fallbackData?.totalAmount || 0),
        });
      }
    } catch (e) {
      console.warn('Invoice open error:', e);
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handleShareWhatsApp = (inv: any) => {
    if (!inv) return;
    const phone = (inv.phone || '').replace(/[^0-9]/g, '');
    const text = `🧾 *${inv.companyName || 'ABCD company'} - INVOICE* (#${inv.orderNumber})\n\nCustomer: ${inv.customerName}\nTotal Amount: QR ${Number(inv.totalAmount || 0).toFixed(2)}\nPayment: ${inv.paymentStatus} (${inv.paymentMethod})\nDate: ${inv.orderDate || inv.date}\n\nThank you for choosing ${inv.companyName || 'our laundry service'}!`;
    const url = phone ? `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}` : `whatsapp://send?text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Notice', 'Unable to open WhatsApp on this device.');
    });
  };

  const handlePrintReceipt = (inv: any) => {
    Alert.alert('🖨️ Thermal Print', `Sending Receipt #${inv?.orderNumber} to Bluetooth Thermal Printer...`);
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
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {loading && !refreshing ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 10, color: '#64748b', fontSize: 13 }}>Loading shift collections...</Text>
          </View>
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
                      <TouchableOpacity
                        key={ord.id}
                        style={styles.orderRow}
                        activeOpacity={0.7}
                        onPress={() => openInvoiceForOrder(ord.orderNumber, ord)}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <Text style={styles.orderIdText}>#{ord.orderNumber}</Text>
                            <Text style={styles.taskTypeTag}>{ord.taskType}</Text>
                            <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>👁️ Invoice</Text>
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
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* SECTION: SETTLEMENT HISTORY */}
            <View style={[styles.card, shadow.card]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>📜 My Handover Settlement History</Text>
                <Text style={styles.countBadge}>{settlementHistory.length}</Text>
              </View>

              {settlementHistory.length === 0 ? (
                <View style={{ paddingVertical: 18, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#94a3b8' }}>No past settlements logged yet.</Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {settlementHistory.map((s) => (
                    <View
                      key={s.id}
                      style={{
                        backgroundColor: '#f8fafc',
                        borderRadius: radius.sm,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        gap: 8,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#1e293b' }}>
                          {s.settlementNumber}
                        </Text>
                        <View
                          style={{
                            backgroundColor: '#dcfce7',
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#15803d' }}>
                            ✓ {s.status}
                          </Text>
                        </View>
                      </View>

                      <Text style={{ fontSize: 11, color: '#64748b' }}>
                        Settled by: <Text style={{ fontWeight: '600', color: '#334155' }}>{s.settledBy}</Text> •{' '}
                        {formatSettledDateTime(s.settledAt)}
                      </Text>

                      {Array.isArray(s.orders) && s.orders.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                          {s.orders.map((so: any, idx: number) => {
                            const oNum = so.orderId || so.id;
                            return (
                              <TouchableOpacity
                                key={idx}
                                style={{
                                  backgroundColor: '#e0f2fe',
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
                                  borderRadius: 6,
                                  borderWidth: 1,
                                  borderColor: '#bae6fd',
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                                onPress={() => openInvoiceForOrder(oNum, so)}
                              >
                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#0369a1' }}>
                                  #{oNum}
                                </Text>
                                <Text style={{ fontSize: 9, color: '#0284c7' }}>👁️</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}

                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          borderTopWidth: 1,
                          borderTopColor: '#e2e8f0',
                          paddingTop: 6,
                          marginTop: 2,
                        }}
                      >
                        <Text style={{ fontSize: 11, color: '#64748b' }}>
                          Cash Handed: <Text style={{ fontWeight: '700', color: '#15803d' }}>QR {s.cashAmount.toFixed(2)}</Text>
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#1e293b' }}>
                          Total: QR {s.totalAmount.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  ))}
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

      {/* EXACT WEB-STYLE THERMAL TAX INVOICE MODAL */}
      <Modal visible={!!viewingInvoice} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: '#ffffff', maxWidth: 360, width: '92%', padding: 20, borderRadius: 12, position: 'relative' }]}>
            {/* Close Button */}
            <TouchableOpacity
              onPress={() => setViewingInvoice(null)}
              style={{ position: 'absolute', right: 14, top: 12, zIndex: 10, padding: 4 }}
            >
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#000000' }}>✕</Text>
            </TouchableOpacity>

            {/* 1. Header: Company Branding */}
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#000000' }}>
                {viewingInvoice?.companyName || 'ABCD company'}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#000000', marginTop: 2 }}>
                {viewingInvoice?.companyAddress || 'knr'}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#000000', marginTop: 1 }}>
                {viewingInvoice?.companyPhone || '96385274112'}
              </Text>
            </View>

            {/* 2. Customer Copy Header */}
            <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#000000', borderStyle: 'dashed', marginVertical: 8, paddingVertical: 4, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#000000' }}>Customer Copy</Text>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#000000' }}>نسخة العميل</Text>
            </View>

            {/* 3. Order Metadata */}
            <View style={{ gap: 3, marginBottom: 8 }}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={{ width: 100, fontWeight: '700', color: '#000000', fontSize: 12 }}>Order NO:</Text>
                <Text style={{ flex: 1, fontWeight: '900', color: '#000000', fontSize: 12 }}>#{viewingInvoice?.orderNumber}</Text>
              </View>

              <View style={{ flexDirection: 'row' }}>
                <Text style={{ width: 100, fontWeight: '700', color: '#000000', fontSize: 12 }}>Order Date:</Text>
                <Text style={{ flex: 1, fontWeight: '700', color: '#000000', fontSize: 12 }}>{viewingInvoice?.orderDate || viewingInvoice?.date}</Text>
              </View>

              <View style={{ flexDirection: 'row' }}>
                <Text style={{ width: 100, fontWeight: '700', color: '#000000', fontSize: 12 }}>Customer:</Text>
                <Text style={{ flex: 1, fontWeight: '900', color: '#000000', fontSize: 12 }}>{viewingInvoice?.customerName}</Text>
              </View>

              <View style={{ flexDirection: 'row' }}>
                <Text style={{ width: 100, fontWeight: '700', color: '#000000', fontSize: 12 }}>Contact NO:</Text>
                <Text style={{ flex: 1, fontWeight: '700', color: '#000000', fontSize: 12 }}>{viewingInvoice?.phone || '433262'}</Text>
              </View>

              <View style={{ flexDirection: 'row' }}>
                <Text style={{ width: 100, fontWeight: '700', color: '#000000', fontSize: 12 }}>Address:</Text>
                <Text style={{ flex: 1, fontWeight: '700', color: '#000000', fontSize: 12 }}>{viewingInvoice?.address || 'sgdf'}</Text>
              </View>

              <View style={{ flexDirection: 'row' }}>
                <Text style={{ width: 100, fontWeight: '700', color: '#000000', fontSize: 12 }}>Payment:</Text>
                <Text style={{ flex: 1, fontWeight: '900', color: '#e11d48', fontSize: 12 }}>
                  Paid ({viewingInvoice?.paymentMethod || 'CASH'})
                </Text>
              </View>
            </View>

            {/* 4. Cloth Table Header */}
            <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#000000', borderStyle: 'dashed', paddingVertical: 4, marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ flex: 2, fontWeight: '700', color: '#000000', fontSize: 11 }}>Cloth نوع</Text>
                <Text style={{ flex: 1, textAlign: 'center', fontWeight: '700', color: '#000000', fontSize: 11 }}>Qty كمية</Text>
                <Text style={{ flex: 1, textAlign: 'right', fontWeight: '700', color: '#000000', fontSize: 11 }}>Price سعر</Text>
                <Text style={{ flex: 1.2, textAlign: 'right', fontWeight: '700', color: '#000000', fontSize: 11 }}>Amount مبلغ</Text>
              </View>
            </View>

            {/* 5. Cloth Items List */}
            <ScrollView style={{ maxHeight: 120 }}>
              {Array.isArray(viewingInvoice?.items) && viewingInvoice.items.length > 0 ? (
                viewingInvoice.items.map((item: any, idx: number) => {
                  const name = item.name || item.service_name || 'Item';
                  const qty = Number(item.qty || item.quantity || 1);
                  const price = Number(item.price || item.unit_price || 0);
                  const amt = Number(item.amount || (price * qty));

                  return (
                    <View
                      key={idx}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 3,
                        borderBottomWidth: 1,
                        borderColor: '#e2e8f0',
                        borderStyle: 'dashed',
                      }}
                    >
                      <Text style={{ flex: 2, fontWeight: '700', color: '#000000', fontSize: 11 }}>{name}</Text>
                      <Text style={{ flex: 1, textAlign: 'center', fontWeight: '700', color: '#000000', fontSize: 11 }}>{qty}</Text>
                      <Text style={{ flex: 1, textAlign: 'right', color: '#000000', fontSize: 11 }}>{price.toFixed(2)}</Text>
                      <Text style={{ flex: 1.2, textAlign: 'right', fontWeight: '700', color: '#000000', fontSize: 11 }}>{amt.toFixed(2)}</Text>
                    </View>
                  );
                })
              ) : (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 3,
                    borderBottomWidth: 1,
                    borderColor: '#e2e8f0',
                    borderStyle: 'dashed',
                  }}
                >
                  <Text style={{ flex: 2, fontWeight: '700', color: '#000000', fontSize: 11 }}>Standard Laundry</Text>
                  <Text style={{ flex: 1, textAlign: 'center', fontWeight: '700', color: '#000000', fontSize: 11 }}>1</Text>
                  <Text style={{ flex: 1, textAlign: 'right', color: '#000000', fontSize: 11 }}>{Number(viewingInvoice?.totalAmount || 0).toFixed(2)}</Text>
                  <Text style={{ flex: 1.2, textAlign: 'right', fontWeight: '700', color: '#000000', fontSize: 11 }}>{Number(viewingInvoice?.totalAmount || 0).toFixed(2)}</Text>
                </View>
              )}
            </ScrollView>

            {/* 6. Totals Box */}
            <View style={{ alignItems: 'flex-end', marginTop: 6 }}>
              <View style={{ width: 180, borderBottomWidth: 1, borderColor: '#000000', borderStyle: 'dashed', paddingBottom: 2, marginBottom: 2, flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 11, color: '#000000' }}>Total Quantity:</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#000000' }}>
                  {Array.isArray(viewingInvoice?.items)
                    ? viewingInvoice.items.reduce((acc: number, it: any) => acc + Number(it.qty || it.quantity || 1), 0)
                    : 1}
                </Text>
              </View>

              <View style={{ width: 180, borderBottomWidth: 1, borderColor: '#000000', borderStyle: 'dashed', paddingBottom: 2, marginBottom: 2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '900', color: '#000000' }}>Total to Pay:</Text>
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#000000' }}>
                  QR {Number(viewingInvoice?.totalAmount || 0).toFixed(2)}
                </Text>
              </View>
            </View>

            {/* 7. Footer Notice */}
            <View style={{ borderTopWidth: 1, borderColor: '#000000', borderStyle: 'dashed', marginTop: 10, paddingTop: 6, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: '#64748b' }}>
                Booked by Delivery Agent: <Text style={{ fontWeight: '700', color: '#334155' }}>{viewingInvoice?.driverName || 'nandu'}</Text>
              </Text>
              <Text style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>THANK YOU...VISIT AGAIN</Text>
            </View>

            {/* 8. Action Buttons */}
            <View style={{ marginTop: 14 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: '#16a34a',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                }}
                onPress={() => handleShareWhatsApp(viewingInvoice)}
              >
                <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13 }}>💬 Share via WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: radius.card,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  receiptLine: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
});
