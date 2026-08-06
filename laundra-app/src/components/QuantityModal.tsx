import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Order } from '../types/order';
import { TaskService } from '../services/TaskService';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';

interface QuantityModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
  onSuccess: () => void;
  currentUserName?: string;
}

export const QuantityModal: React.FC<QuantityModalProps> = ({
  visible,
  order,
  onClose,
  onSuccess,
  currentUserName = 'Delivery Staff',
}) => {
  const [pickupItemQuantities, setPickupItemQuantities] = useState<{ [key: string]: number }>({});
  const [bagsWeight, setBagsWeight] = useState('');
  const [pickupNotes, setPickupNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rawItemList = order?.items && order.items.length > 0 ? order.items : ((order as any)?.services || []);

  useEffect(() => {
    if (order && rawItemList.length > 0) {
      const initialQtys: { [key: string]: number } = {};
      rawItemList.forEach((it: any, idx: number) => {
        const key = it.id || it.serviceId || it.service_id || String(idx);
        const ord = it.orderedQuantity ?? it.ordered_quantity ?? it.quantity ?? it.qty ?? 1;
        const picked = it.pickedUpQuantity ?? it.picked_up_quantity ?? 0;
        const pending = it.pickupPendingQuantity ?? it.pickup_pending_quantity ?? Math.max(0, ord - picked);
        initialQtys[key] = pending;
      });
      setPickupItemQuantities(initialQtys);
      setBagsWeight('');
      setPickupNotes('');
    }
  }, [order]);

  if (!order) return null;

  const handleQtyChange = (key: string, textVal: string) => {
    const parsed = parseInt(textVal, 10);
    const num = isNaN(parsed) ? 0 : parsed;
    setPickupItemQuantities((prev) => ({
      ...prev,
      [key]: num,
    }));
  };

  const handleSavePickup = async () => {
    if (!order) return;

    // Validate quantities matching web portal rules
    for (let idx = 0; idx < rawItemList.length; idx++) {
      const it = rawItemList[idx];
      const key = it.order_item_id || it.id;
      if (!key) {
        Alert.alert('Validation Error', `Order item "${it.name || 'Service'}" is missing an OrderItem UUID.`);
        return;
      }
      const sName = it.serviceName || it.name || `Service ${idx + 1}`;
      const ord = it.orderedQuantity ?? it.ordered_quantity ?? it.quantity ?? it.qty ?? 1;
      const picked = it.pickedUpQuantity ?? it.picked_up_quantity ?? 0;
      const pending = it.pickupPendingQuantity ?? it.pickup_pending_quantity ?? Math.max(0, ord - picked);
      const rec = pickupItemQuantities[key] !== undefined ? pickupItemQuantities[key] : pending;

      if (rec < 0) {
        Alert.alert('Validation Error', `Received quantity for "${sName}" cannot be negative.`);
        return;
      }
      if (rec > pending) {
        Alert.alert('Validation Error', `Received quantity for "${sName}" (${rec} Pcs) cannot exceed Pending Quantity (${pending} Pcs).`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const targetOrderId = (order as any).backendId || order.id;

      // Format payload items matching web portal
      const payloadItems = rawItemList.map((it: any) => {
        const itemUuid = it.order_item_id || it.id;
        if (!itemUuid) {
          throw new Error(`Order item "${it.name || 'Service'}" is missing an OrderItem UUID.`);
        }
        const ord = it.orderedQuantity ?? it.ordered_quantity ?? it.quantity ?? it.qty ?? 1;
        const picked = it.pickedUpQuantity ?? it.picked_up_quantity ?? 0;
        const pending = it.pickupPendingQuantity ?? it.pickup_pending_quantity ?? Math.max(0, ord - picked);
        const qty = pickupItemQuantities[itemUuid] !== undefined ? pickupItemQuantities[itemUuid] : pending;
        return { item_id: itemUuid, quantity: Number(qty) };
      }).filter((item) => item.item_id && Number(item.quantity) > 0);

      if (payloadItems.length > 0 && targetOrderId) {
        await TaskService.submitPickupItems(targetOrderId, payloadItems, currentUserName);
      }

      // Update task delivery status to PICKED
      const targetDelivId = (order as any).deliveryId || order.id;
      await TaskService.updateOrderStatus(targetDelivId, 'Picked Up', 'In Processing');

      setIsSubmitting(false);
      Alert.alert(
        'Success 🎉',
        'Pickup details & received item quantities saved successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              onSuccess();
              onClose();
            },
          },
        ]
      );
    } catch (err: any) {
      setIsSubmitting(false);
      Alert.alert('Pickup Completion Failed', err?.message || 'Failed to submit pickup details.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          {/* Header */}
          <Text style={styles.title}>🧺 Confirm Received Pickup Quantities</Text>
          <Text style={styles.subtitle}>
            Order #{order.id} • Customer: {order.customerName}
          </Text>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Service Items Section */}
            <Text style={styles.sectionLabel}>Received Services & Quantities:</Text>
            <View style={styles.itemsList}>
              {rawItemList.map((it: any, idx: number) => {
                const itemKey = it.order_item_id || it.id;
                const sName = it.serviceName || it.name || `Service ${idx + 1}`;
                const ord = it.orderedQuantity ?? it.ordered_quantity ?? it.quantity ?? it.qty ?? 1;
                const picked = it.pickedUpQuantity ?? it.picked_up_quantity ?? 0;
                const pending = it.pickupPendingQuantity ?? it.pickup_pending_quantity ?? Math.max(0, ord - picked);
                const currentVal = pickupItemQuantities[itemKey] !== undefined ? pickupItemQuantities[itemKey] : pending;
                const isInvalid = currentVal < 0 || currentVal > pending;

                return (
                  <View key={itemKey || idx} style={[styles.itemCard, isInvalid && styles.itemCardInvalid]}>
                    <Text style={styles.itemName}>{sName}</Text>

                    <View style={styles.itemRow}>
                      <Text style={styles.itemOrderedText}>
                        Ordered: <Text style={styles.boldText}>{ord} Pcs</Text>
                        {picked > 0 && <Text style={styles.pickedText}> (Picked: {picked})</Text>}
                      </Text>

                      <View style={styles.inputContainer}>
                        <Text style={styles.receivedLabel}>Received:</Text>
                        <TextInput
                          style={[styles.qtyInput, isInvalid && styles.qtyInputInvalid]}
                          keyboardType="number-pad"
                          value={String(currentVal)}
                          onChangeText={(t) => handleQtyChange(itemKey, t)}
                        />
                        <Text style={styles.pcsText}>Pcs</Text>
                      </View>
                    </View>

                    {isInvalid && (
                      <Text style={styles.errorText}>
                        ⚠️ Quantity must be between 0 and {pending} Pcs
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Bags / Total Weight */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Bags / Total Weight (Quantity)</Text>
              <TextInput
                style={styles.textInput}
                value={bagsWeight}
                onChangeText={setBagsWeight}
                placeholder="e.g. 1 Bag (Wash & Fold)"
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Pickup Inspection Notes */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Pickup Inspection Notes (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={pickupNotes}
                onChangeText={setPickupNotes}
                placeholder="Heavy stains on standard shirt"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={2}
              />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, isSubmitting && styles.btnDisabled]}
              onPress={handleSavePickup}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save Pickup</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  content: {
    backgroundColor: '#ffffff',
    borderRadius: radius.card,
    padding: 20,
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1e3a8a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 14,
    fontWeight: '500',
  },
  scrollArea: {
    maxHeight: 420,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
  },
  itemsList: {
    gap: 8,
    marginBottom: 14,
  },
  itemCard: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemCardInvalid: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  itemName: {
    fontWeight: '800',
    fontSize: 14,
    color: '#0f172a',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  itemOrderedText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  boldText: {
    color: '#0f172a',
    fontWeight: '800',
  },
  pickedText: {
    color: '#16a34a',
    fontWeight: '800',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  receivedLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  qtyInput: {
    width: 60,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: '#16a34a',
    borderRadius: 6,
    fontWeight: '800',
    fontSize: 15,
    textAlign: 'center',
    backgroundColor: '#f0fdf4',
    color: '#15803d',
  },
  qtyInputInvalid: {
    borderColor: '#dc2626',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
  },
  pcsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  errorText: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '700',
    marginTop: 6,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  multilineInput: {
    height: 50,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#16a34a',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
