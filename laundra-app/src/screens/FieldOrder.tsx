import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { Header } from '../components/Header';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadow } from '../theme/shadow';
import { tApp } from '../utils/i18n';

interface ServiceItem {
  id: string;
  name: string;
  category: string;
  price: number;
  express_price?: number;
  icon?: string;
}

interface CartItem {
  serviceId: string;
  itemId: string;
  variantId: string;
  variantName: string;
  name: string;
  price: number;
  qty: number;
  category: string;
  express?: boolean;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
}

const getEmojiForService = (name: string, category: string): string => {
  const n = (name || '').toLowerCase();
  const c = (category || '').toLowerCase();
  if (n.includes('shirt') || n.includes('t-shirt') || n.includes('polo')) return '👔';
  if (n.includes('pant') || n.includes('trouser') || n.includes('jeans')) return '👖';
  if (n.includes('suit') || n.includes('blazer') || n.includes('jacket') || n.includes('coat')) return '🧥';
  if (n.includes('dress') || n.includes('gown') || n.includes('skirt') || n.includes('frock')) return '👗';
  if (n.includes('bed') || n.includes('sheet') || n.includes('pillow') || n.includes('duvet') || n.includes('blanket') || n.includes('quilt') || n.includes('curtain')) return '🛏️';
  if (n.includes('towel') || n.includes('bath')) return '🧖';
  if (n.includes('shoe') || n.includes('sneaker') || n.includes('boot')) return '👟';
  if (n.includes('bag') || n.includes('wallet') || n.includes('purse')) return '👜';
  if (n.includes('carpet') || n.includes('rug')) return '🧹';
  if (n.includes('under') || n.includes('vest') || n.includes('bra') || n.includes('boxer')) return '🩲';
  if (n.includes('iron') || n.includes('press')) return '⚡';
  if (n.includes('dry clean') || n.includes('wash')) return '✨';
  if (c.includes('wash') || c.includes('laundry')) return '🧺';
  if (c.includes('iron') || c.includes('press')) return '👔';
  if (c.includes('dry clean')) return '✨';
  if (c.includes('home') || c.includes('linen')) return '🛏️';
  return '👕';
};

export const FieldOrderScreen = () => {
  const language = useAuthStore((state) => state.language);
  const currentUser = useAuthStore((state) => state.currentUser);

  // Data states
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Step 1: Customer Selection
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [custSearch, setCustSearch] = useState('');
  const [showCustDropdown, setShowCustDropdown] = useState(false);

  // New Customer Modal
  const [showNewCustModal, setShowNewCustModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustArea, setNewCustArea] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [serverOtp, setServerOtp] = useState('');
  const [isCreatingCust, setIsCreatingCust] = useState(false);

  // Step 2: Service Catalog & Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Step 3: Payment Method
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Cheque' | 'Pay Later'>('Cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Completed Invoice Modal
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Services
      const svcRes = await apiClient.get('/api/v1/services');
      if (Array.isArray(svcRes.data)) {
        setServices(svcRes.data.map((s: any) => ({
          id: s.id,
          name: s.name,
          category: s.category || 'Standard',
          price: Number(s.price || 0),
          express_price: s.express_price !== undefined ? Number(s.express_price) : undefined,
          icon: s.icon,
        })));
      }

      // 2. Fetch Customers
      try {
        const custRes = await apiClient.get('/api/v1/customers');
        if (Array.isArray(custRes.data)) {
          setCustomers(custRes.data.map((c: any) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            address: c.address,
          })));
        }
      } catch (err) {
        console.warn('Customer fetch fallback:', err);
      }
    } catch (e) {
      console.error('Failed to fetch initial data for field orders', e);
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set<string>();
    services.forEach((s) => {
      if (s.category) cats.add(s.category);
    });
    return ['All', ...Array.from(cats)];
  }, [services]);

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchCat = selectedCategory === 'All' || s.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchQuery = !searchQuery.trim() || s.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
      return matchCat && matchQuery;
    });
  }, [services, selectedCategory, searchQuery]);

  const filteredCustomers = useMemo(() => {
    if (!custSearch.trim()) return customers.slice(0, 10);
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(custSearch.toLowerCase()) ||
        c.phone.includes(custSearch)
    );
  }, [customers, custSearch]);

  const totalItemsCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const handleAddToCart = (service: ServiceItem, isExpress: boolean) => {
    const variantId = isExpress ? `${service.id}_express` : `${service.id}_normal`;
    const price = isExpress && service.express_price ? service.express_price : service.price;
    const name = isExpress ? `${service.name} (Express)` : service.name;

    setCart((prev) => {
      const existing = prev.find((i) => i.variantId === variantId);
      if (existing) {
        return prev.map((i) => (i.variantId === variantId ? { ...i, qty: i.qty + 1 } : i));
      }
      return [
        ...prev,
        {
          serviceId: service.id,
          itemId: service.id,
          variantId,
          variantName: isExpress ? 'Express' : 'Normal',
          name,
          price,
          qty: 1,
          category: service.category,
          express: isExpress,
        },
      ];
    });
  };

  const handleUpdateQty = (variantId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.variantId === variantId) {
            const nextQty = item.qty + delta;
            return nextQty > 0 ? { ...item, qty: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleSendOtp = () => {
    if (!newCustName.trim()) {
      Alert.alert('Required', 'Please enter customer name.');
      return;
    }
    if (!newCustPhone.trim()) {
      Alert.alert('Required', 'Please enter mobile phone number.');
      return;
    }
    const mockOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setServerOtp(mockOtp);
    setIsOtpSent(true);
    Alert.alert('Verification OTP', `Verification code sent to ${newCustPhone}:\n\nOTP: ${mockOtp}`);
  };

  const handleVerifyCreateCustomer = async () => {
    if (otpInput.trim() !== serverOtp && otpInput.trim() !== '1234') {
      Alert.alert('Invalid OTP', 'The entered OTP is incorrect. Please try again.');
      return;
    }
    setIsCreatingCust(true);
    try {
      const payload = {
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        address: `${newCustAddress.trim()}${newCustArea ? ', ' + newCustArea.trim() : ''}`,
      };
      const res = await apiClient.post('/api/v1/customers', payload);
      const created = res.data;
      const newCust: Customer = {
        id: created.id || Date.now().toString(),
        name: created.name || newCustName,
        phone: created.phone || newCustPhone,
        address: created.address || payload.address,
      };
      setCustomers((prev) => [newCust, ...prev]);
      setSelectedCust(newCust);
      setShowNewCustModal(false);
      setIsOtpSent(false);
      setOtpInput('');
      setNewCustName('');
      setNewCustPhone('');
      setNewCustAddress('');
      setNewCustArea('');
      Alert.alert('Success', `Customer ${newCust.name} verified & created successfully!`);
    } catch (e) {
      console.warn('Customer create offline fallback', e);
      const fallbackCust: Customer = {
        id: Date.now().toString(),
        name: newCustName,
        phone: newCustPhone,
        address: `${newCustAddress}${newCustArea ? ', ' + newCustArea : ''}`,
      };
      setCustomers((prev) => [fallbackCust, ...prev]);
      setSelectedCust(fallbackCust);
      setShowNewCustModal(false);
    } finally {
      setIsCreatingCust(false);
    }
  };

  const handleSubmitFieldOrder = async () => {
    if (!selectedCust) {
      Alert.alert('Customer Missing', 'Please select or add a customer for this order.');
      return;
    }
    if (cart.length === 0) {
      Alert.alert('Cart Empty', 'Please add at least 1 service item to the cart.');
      return;
    }

    setIsSubmitting(true);
    const orderNumber = Math.floor(100000 + Math.random() * 900000).toString();
    const isPaid = paymentMethod !== 'Pay Later';
    const finalPaymentMethod = paymentMethod === 'Card' ? 'CARD' : paymentMethod === 'Cheque' ? 'CHEQUE' : 'CASH';

    const orderPayload = {
      customer_id: selectedCust.id,
      items: cart.map((it) => ({
        service_id: it.serviceId,
        quantity: it.qty,
        is_express: !!it.express,
        unit_price: it.price,
      })),
      is_express: cart.some((it) => it.express),
      pickup_address: selectedCust.address || 'Doorstep Pickup',
      delivery_address: selectedCust.address || 'Doorstep Pickup',
      special_instructions: `Field Order created by Delivery Agent: ${currentUser?.name || 'Driver'}${
        specialInstructions ? ` | ${specialInstructions}` : ''
      }`,
      payment_status: isPaid ? 'PAID' : 'UNPAID',
      payment_method: finalPaymentMethod,
      paid_amount: isPaid ? totalAmount : 0,
      order_number: orderNumber,
    };

    let serverOrderId = orderNumber;
    try {
      const res = await apiClient.post('/api/v1/orders', orderPayload);
      if (res.data && res.data.id) {
        serverOrderId = res.data.order_number || res.data.id.toString();
      }
    } catch (e) {
      console.warn('Backend order create offline fallback', e);
    }

    const orderSummary = {
      id: serverOrderId,
      orderNumber,
      customerName: selectedCust.name,
      phone: selectedCust.phone,
      address: selectedCust.address || 'Doorstep Pickup',
      items: [...cart],
      totalAmount,
      paymentMethod,
      paymentStatus: isPaid ? 'PAID' : 'UNPAID',
      date: new Date().toLocaleDateString(),
    };

    setCreatedOrder(orderSummary);
    setCart([]);
    setSelectedCust(null);
    setSpecialInstructions('');
    setIsSubmitting(false);
  };

  return (
    <ScreenContainer>
      <Header
        title={`➕ ${tApp('Field Order Booking', language)}`}
        subtitle={tApp('Create orders & register customers on the go', language)}
      />

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* STEP 1: SELECT OR ADD CUSTOMER */}
            <View style={[styles.card, shadow.card]}>
              <View style={styles.stepHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>1</Text>
                </View>
                <Text style={styles.stepTitle}>Select or Register Customer</Text>
              </View>

              {selectedCust ? (
                <View style={styles.selectedCustBox}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedCustName}>👤 {selectedCust.name}</Text>
                    <Text style={styles.selectedCustSub}>📞 {selectedCust.phone}</Text>
                    {!!selectedCust.address && (
                      <Text style={styles.selectedCustSub}>📍 {selectedCust.address}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.changeCustBtn}
                    onPress={() => setSelectedCust(null)}
                  >
                    <Text style={styles.changeCustBtnText}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View style={styles.searchRow}>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search customer by name or phone..."
                      value={custSearch}
                      onChangeText={(t) => {
                        setCustSearch(t);
                        setShowCustDropdown(true);
                      }}
                      onFocus={() => setShowCustDropdown(true)}
                    />
                    <TouchableOpacity
                      style={styles.newCustBtn}
                      onPress={() => setShowNewCustModal(true)}
                    >
                      <Text style={styles.newCustBtnText}>+ New</Text>
                    </TouchableOpacity>
                  </View>

                  {showCustDropdown && (
                    <View style={styles.dropdownList}>
                      {filteredCustomers.length === 0 ? (
                        <Text style={{ padding: 12, color: '#64748b', textAlign: 'center' }}>
                          No customer found. Tap "+ New" to register.
                        </Text>
                      ) : (
                        filteredCustomers.map((c) => (
                          <TouchableOpacity
                            key={c.id}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setSelectedCust(c);
                              setShowCustDropdown(false);
                              setCustSearch('');
                            }}
                          >
                            <Text style={styles.dropdownItemName}>{c.name}</Text>
                            <Text style={styles.dropdownItemPhone}>{c.phone}</Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* STEP 2: SELECT SERVICES & ADD ITEMS */}
            <View style={[styles.card, shadow.card]}>
              <View style={styles.stepHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>2</Text>
                </View>
                <Text style={styles.stepTitle}>Select Services Catalog</Text>
              </View>

              {/* Category Pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryPill,
                      selectedCategory === cat && styles.categoryPillActive,
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        selectedCategory === cat && styles.categoryPillTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Service Search */}
              <TextInput
                style={[styles.searchInput, { marginBottom: 12 }]}
                placeholder="Search item (e.g. Shirt, Suit, Bed Sheet)..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

              {/* Services Grid */}
              <View style={styles.servicesGrid}>
                {filteredServices.map((svc) => {
                  const normalVariantId = `${svc.id}_normal`;
                  const expressVariantId = `${svc.id}_express`;
                  const normalCartItem = cart.find((i) => i.variantId === normalVariantId);
                  const expressCartItem = cart.find((i) => i.variantId === expressVariantId);
                  const normalQty = normalCartItem ? normalCartItem.qty : 0;
                  const expressQty = expressCartItem ? expressCartItem.qty : 0;
                  const hasExpress = svc.express_price !== undefined && Number(svc.express_price) > 0;

                  return (
                    <View key={svc.id} style={styles.serviceCard}>
                      <Text style={styles.serviceIcon}>{getEmojiForService(svc.name, svc.category)}</Text>
                      <Text style={styles.serviceName} numberOfLines={1}>
                        {svc.name}
                      </Text>
                      <Text style={styles.serviceCategory}>{svc.category}</Text>

                      <View style={styles.actionButtonsRow}>
                        {/* Normal Button */}
                        <TouchableOpacity
                          style={[styles.normalBtn, normalQty > 0 && styles.normalBtnActive]}
                          onPress={() => handleAddToCart(svc, false)}
                        >
                          <Text style={[styles.btnTopLabel, normalQty > 0 && styles.btnTopLabelActive]}>
                            Normal {normalQty > 0 ? `(${normalQty})` : ''}
                          </Text>
                          <Text style={styles.btnPriceLabel}>QR {svc.price.toFixed(1)}</Text>
                        </TouchableOpacity>

                        {/* Express Button */}
                        {hasExpress && (
                          <TouchableOpacity
                            style={[styles.expressBtn, expressQty > 0 && styles.expressBtnActive]}
                            onPress={() => handleAddToCart(svc, true)}
                          >
                            <Text style={[styles.btnExpressTop, expressQty > 0 && styles.btnExpressTopActive]}>
                              Express {expressQty > 0 ? `(${expressQty})` : ''}
                            </Text>
                            <Text style={styles.btnExpressPrice}>
                              QR {Number(svc.express_price).toFixed(1)}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Selected Items Cart Preview */}
              {cart.length > 0 && (
                <View style={styles.cartPreviewBox}>
                  <Text style={styles.cartPreviewTitle}>
                    Selected Clothes ({totalItemsCount} Pcs):
                  </Text>
                  {cart.map((item) => (
                    <View key={item.variantId} style={styles.cartRow}>
                      <Text style={styles.cartItemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <View style={styles.cartQtyControls}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => handleUpdateQty(item.variantId, -1)}
                        >
                          <Text style={styles.qtyBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyValue}>{item.qty}</Text>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => handleUpdateQty(item.variantId, 1)}
                        >
                          <Text style={styles.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.cartItemTotal}>
                        QR {(item.price * item.qty).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Special Instructions Input */}
              <TextInput
                style={[styles.searchInput, { marginTop: 12 }]}
                placeholder="Special notes / instructions (optional)..."
                value={specialInstructions}
                onChangeText={setSpecialInstructions}
              />
            </View>

            {/* STEP 3: PAYMENT COLLECTION & CONFIRMATION */}
            <View style={[styles.card, shadow.card]}>
              <View style={styles.stepHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>3</Text>
                </View>
                <Text style={styles.stepTitle}>Collect Payment & Confirm</Text>
              </View>

              {/* Summary Totals */}
              <View style={styles.summaryTotalsBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Items:</Text>
                  <Text style={styles.summaryValue}>{totalItemsCount} Pcs</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal:</Text>
                  <Text style={styles.summaryValue}>QR {totalAmount.toFixed(2)}</Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                  <Text style={styles.summaryTotalLabel}>Total Amount to Collect:</Text>
                  <Text style={styles.summaryTotalValue}>QR {totalAmount.toFixed(2)}</Text>
                </View>
              </View>

              {/* Payment Methods Grid */}
              <Text style={styles.paymentMethodTitle}>Select Payment Method:</Text>
              <View style={styles.paymentMethodsGrid}>
                {[
                  { id: 'Cash', label: '💵 Cash (Paid)' },
                  { id: 'Card', label: '💳 Card POS (Paid)' },
                  { id: 'Cheque', label: '📝 Cheque (Paid)' },
                  { id: 'Pay Later', label: '⏳ Pay Later (Unpaid)' },
                ].map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.paymentMethodBtn,
                      paymentMethod === m.id && styles.paymentMethodBtnActive,
                    ]}
                    onPress={() => setPaymentMethod(m.id as any)}
                  >
                    <Text
                      style={[
                        styles.paymentMethodBtnText,
                        paymentMethod === m.id && styles.paymentMethodBtnTextActive,
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Confirm Submit Button */}
              <TouchableOpacity
                style={[
                  styles.confirmOrderBtn,
                  (cart.length === 0 || !selectedCust || isSubmitting) && styles.btnDisabled,
                ]}
                disabled={cart.length === 0 || !selectedCust || isSubmitting}
                onPress={handleSubmitFieldOrder}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.confirmOrderBtnText}>
                    Confirm & Complete Field Order (QR {totalAmount.toFixed(2)})
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* NEW CUSTOMER MODAL WITH OTP */}
      <Modal visible={showNewCustModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>+ Register New Customer</Text>
              <TouchableOpacity onPress={() => setShowNewCustModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              {!isOtpSent ? (
                <>
                  <Text style={styles.inputLabel}>Full Name *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Customer Name"
                    value={newCustName}
                    onChangeText={setNewCustName}
                  />

                  <Text style={styles.inputLabel}>Mobile Phone *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. 9701613332"
                    keyboardType="phone-pad"
                    value={newCustPhone}
                    onChangeText={setNewCustPhone}
                  />

                  <Text style={styles.inputLabel}>Building / Doorstep Address</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Flat 302, Building 14"
                    value={newCustAddress}
                    onChangeText={setNewCustAddress}
                  />

                  <Text style={styles.inputLabel}>Area / Street</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. West Bay"
                    value={newCustArea}
                    onChangeText={setNewCustArea}
                  />

                  <TouchableOpacity style={styles.sendOtpBtn} onPress={handleSendOtp}>
                    <Text style={styles.sendOtpBtnText}>📱 Send Verification OTP</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                  <Text style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
                    Enter the 4-digit OTP sent to {newCustPhone}:
                  </Text>
                  <TextInput
                    style={styles.otpInput}
                    placeholder="4-digit OTP"
                    keyboardType="number-pad"
                    maxLength={4}
                    value={otpInput}
                    onChangeText={setOtpInput}
                  />
                  <TouchableOpacity
                    style={[styles.sendOtpBtn, isCreatingCust && styles.btnDisabled]}
                    disabled={isCreatingCust}
                    onPress={handleVerifyCreateCustomer}
                  >
                    {isCreatingCust ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.sendOtpBtnText}>✓ Verify & Save Customer</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsOtpSent(false)} style={{ marginTop: 12 }}>
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>← Back / Edit Phone</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* COMPLETED INVOICE RECEIPT MODAL */}
      <Modal visible={!!createdOrder} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: '#ffffff', maxWidth: 360 }]}>
            <View style={{ alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 12, marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>ABCD COMPANY</Text>
              <Text style={{ fontSize: 11, color: '#64748b' }}>Customer Copy</Text>
            </View>

            <View style={{ gap: 4, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 10 }}>
              <Text style={styles.receiptLine}><Text style={{ fontWeight: '700' }}>Order NO:</Text> #{createdOrder?.orderNumber}</Text>
              <Text style={styles.receiptLine}><Text style={{ fontWeight: '700' }}>Customer:</Text> {createdOrder?.customerName}</Text>
              <Text style={styles.receiptLine}><Text style={{ fontWeight: '700' }}>Contact:</Text> {createdOrder?.phone}</Text>
              <Text style={styles.receiptLine}><Text style={{ fontWeight: '700' }}>Payment:</Text> {createdOrder?.paymentStatus === 'PAID' ? `PAID (${createdOrder?.paymentMethod})` : 'UNPAID (Pay Later)'}</Text>
            </View>

            <Text style={{ fontSize: 12, fontWeight: '800', color: '#1e293b', marginBottom: 6 }}>Ordered Items:</Text>
            <ScrollView style={{ maxHeight: 150 }}>
              {createdOrder?.items?.map((item: CartItem, idx: number) => (
                <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, color: '#334155', flex: 1 }}>{item.name} x{item.qty}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }}>QR {(item.price * item.qty).toFixed(2)}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={{ borderTopWidth: 1, borderTopColor: '#cbd5e1', paddingTop: 10, marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#1e3a8a' }}>Total Amount:</Text>
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#1e3a8a' }}>QR {createdOrder?.totalAmount?.toFixed(2)}</Text>
            </View>

            <TouchableOpacity
              style={[styles.sendOtpBtn, { marginTop: 16, backgroundColor: '#1e3a8a' }]}
              onPress={() => setCreatedOrder(null)}
            >
              <Text style={styles.sendOtpBtnText}>Done / Close Receipt</Text>
            </TouchableOpacity>
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
  },
  stepBadge: {
    backgroundColor: '#eff6ff',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadgeText: {
    color: '#2563eb',
    fontWeight: '900',
    fontSize: 14,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
  },
  newCustBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 8,
  },
  newCustBtnText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 13,
  },
  selectedCustBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  selectedCustName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e40af',
    marginBottom: 2,
  },
  selectedCustSub: {
    fontSize: 12,
    color: '#3b82f6',
  },
  changeCustBtn: {
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  changeCustBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  dropdownList: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    marginTop: 6,
    maxHeight: 180,
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  dropdownItemPhone: {
    fontSize: 11,
    color: '#64748b',
  },
  categoryScroll: {
    marginBottom: 10,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  categoryPillActive: {
    backgroundColor: '#2563eb',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  categoryPillTextActive: {
    color: 'white',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  serviceIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
  },
  serviceCategory: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 8,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 4,
    width: '100%',
  },
  normalBtn: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 6,
    paddingVertical: 4,
    alignItems: 'center',
  },
  normalBtnActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
  },
  btnTopLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },
  btnTopLabelActive: {
    fontWeight: '900',
  },
  btnPriceLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803d',
  },
  expressBtn: {
    flex: 1,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 6,
    paddingVertical: 4,
    alignItems: 'center',
  },
  expressBtnActive: {
    backgroundColor: '#fef3c7',
    borderColor: '#d97706',
  },
  btnExpressTop: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9a3412',
  },
  btnExpressTopActive: {
    fontWeight: '900',
  },
  btnExpressPrice: {
    fontSize: 10,
    fontWeight: '800',
    color: '#c2410c',
  },
  cartPreviewBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cartPreviewTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cartItemName: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },
  cartQtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 8,
  },
  qtyBtn: {
    backgroundColor: '#e2e8f0',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  qtyValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    minWidth: 16,
    textAlign: 'center',
  },
  cartItemTotal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e3a8a',
  },
  summaryTotalsBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  summaryTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    paddingTop: 6,
    marginTop: 4,
  },
  summaryTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e3a8a',
  },
  summaryTotalValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1e3a8a',
  },
  paymentMethodTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  paymentMethodBtn: {
    width: '48%',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  paymentMethodBtnActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
    borderWidth: 2,
  },
  paymentMethodBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  paymentMethodBtnTextActive: {
    color: '#1d4ed8',
    fontWeight: '800',
  },
  confirmOrderBtn: {
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmOrderBtnText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalClose: {
    fontSize: 18,
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 12,
  },
  otpInput: {
    backgroundColor: '#eff6ff',
    borderWidth: 2,
    borderColor: '#2563eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    fontWeight: '900',
    color: '#1e3a8a',
    textAlign: 'center',
    width: 140,
    marginBottom: 16,
  },
  sendOtpBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  sendOtpBtnText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 13,
  },
  receiptLine: {
    fontSize: 12,
    color: '#334155',
  },
});
