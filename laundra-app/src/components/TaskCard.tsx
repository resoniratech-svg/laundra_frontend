import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Order } from '../types/order';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadow } from '../theme/shadow';
import { Badge } from './Badge';

interface TaskCardProps {
  order: Order;
  type: 'pickup' | 'delivery';
  onPrimaryAction: (order: Order) => void;
  onCall?: (phone?: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  order,
  type,
  onPrimaryAction,
  onCall,
}) => {
  const isPickup = type === 'pickup';
  const statusStr = (order.deliveryStatus || order.status || '').toLowerCase();

  let primaryBtnText = '🚀 Mark On the Way';
  let primaryBtnBg = colors.primary;

  if (isPickup) {
    if (statusStr === 'courier on the way' || statusStr === 'accepted' || statusStr === 'on_the_way') {
      primaryBtnText = '📍 Mark Reached Location';
      primaryBtnBg = '#7c3aed'; // Purple
    } else if (statusStr === 'reached customer' || statusStr === 'reached') {
      primaryBtnText = '🧺 Complete Pickup Details';
      primaryBtnBg = colors.success; // Green
    }
  } else {
    if (statusStr === 'out for delivery' || statusStr === 'out_for_delivery') {
      primaryBtnText = '✅ Complete Delivery';
      primaryBtnBg = colors.success; // Green
    } else {
      primaryBtnText = '🚚 Mark Out For Delivery';
      primaryBtnBg = colors.primary; // Blue
    }
  }

  const handleNavigate = () => {
    const address = encodeURIComponent(order.deliveryAddress || order.pickupAddress || order.address || 'Doha');
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${address}`);
  };

  const clientPhone = order.customerPhone || (order as any).phone || '9351332324';
  const clientAddress = (isPickup ? order.pickupAddress : order.deliveryAddress) || order.address || 'Branch Location';
  const commissionAmt = isPickup
    ? (order.pickupCommission !== undefined ? order.pickupCommission : 0.00)
    : (order.deliveryCommission !== undefined ? order.deliveryCommission : 0.00);

  const itemList = (order.items && order.items.length > 0) ? order.items : ((order as any).services || []);

  const servicesText = itemList.length > 0
    ? itemList.map((it: any) => `${it.name || it.service_name || it.serviceName || 'Laundry Service'} x${it.quantity || it.qty || 1}`).join(', ')
    : 'Standard Laundry Load';

  const dateStr = order.pickupDate || (order.created_at ? order.created_at.split('T')[0] : new Date().toLocaleDateString());

  const badgeLabel = ['out for delivery', 'out_for_delivery'].includes(statusStr)
    ? 'Out for Delivery'
    : (isPickup
        ? (order.deliveryStatus || order.status || 'Pending Pickup')
        : (statusStr === 'assigned' ? 'Assigned' : (order.deliveryStatus || order.status || 'Assigned')));

  return (
    <View style={[styles.card, shadow.card]}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.orderId}>Order #{order.id}</Text>
        <Badge label={badgeLabel} />
      </View>

      {/* Main Details Section */}
      <View style={styles.body}>
        <Text style={styles.detailItem}>👤 <Text style={styles.boldLabel}>Client Name:</Text> {order.customerName}</Text>
        <Text style={styles.detailItem}>📞 <Text style={styles.boldLabel}>Client Phone:</Text> {clientPhone}</Text>
        <Text style={styles.detailItem}>📍 <Text style={styles.boldLabel}>Address:</Text> {clientAddress}</Text>

        {isPickup ? (
          <Text style={styles.detailItem}>🧺 <Text style={styles.boldLabel}>Services:</Text> {servicesText}</Text>
        ) : (
          <View style={styles.servicesBox}>
            <Text style={styles.servicesHeader}>🧺 Services & Delivery Quantities:</Text>
            {itemList.map((it: any, idx: number) => {
              const sName = it.name || it.service_name || it.serviceName || `Service ${idx + 1}`;
              const displayQty = it.readyQuantity !== undefined ? Number(it.readyQuantity) : (it.ready_quantity !== undefined ? Number(it.ready_quantity) : (it.quantity || it.orderedQuantity || 1));
              return (
                <Text key={idx} style={styles.serviceLine}>
                  • <Text style={{ fontWeight: '800' }}>{sName}</Text>: Given for Delivery: <Text style={styles.qtyGreen}>{displayQty} Pcs</Text>
                </Text>
              );
            })}
          </View>
        )}

        <Text style={styles.detailItem}>
          📅 <Text style={styles.boldLabel}>{isPickup ? 'Pickup' : 'Delivery'} Time:</Text> {dateStr} ({isPickup ? '10:00 AM - 1:00 PM' : '3:00 PM - 6:00 PM'})
        </Text>

        {!isPickup && (
          <Text style={styles.detailItem}>💳 <Text style={styles.boldLabel}>Method:</Text> CASH (Paid)</Text>
        )}

        <Text style={styles.detailItem}>
          📝 <Text style={styles.boldLabel}>Instructions:</Text> {isPickup ? 'Handle with care, separate whites.' : 'Deliver order directly to customer upon arrival.'}
        </Text>

        {/* Commission Tag */}
        <View style={[styles.commissionTag, isPickup ? styles.pickupCommissionBg : styles.deliveryCommissionBg]}>
          <Text style={[styles.commissionText, isPickup ? styles.pickupCommissionText : styles.deliveryCommissionText]}>
            💰 {isPickup ? 'Pickup' : 'Delivery'} Commission: QR {(Number(commissionAmt) || 0).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Secondary Action Buttons */}
      {isPickup ? (
        <View style={{ marginBottom: 10 }}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => onCall?.(clientPhone)}>
            <Text style={styles.secondaryBtnText}>📞 Contact Client</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => onCall?.(clientPhone)}>
            <Text style={styles.secondaryBtnText}>📞 Contact Client</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleNavigate}>
            <Text style={styles.secondaryBtnText}>🗺️ Navigate</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Primary Action Button */}
      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: primaryBtnBg }]}
        onPress={() => onPrimaryAction(order)}
      >
        <Text style={styles.primaryBtnText}>{primaryBtnText}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: radius.card, // 16px
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
  },
  orderId: {
    color: '#1e3a8a',
    fontSize: 16,
    fontWeight: '900',
  },
  body: {
    gap: 6,
    marginBottom: 14,
  },
  detailItem: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  boldLabel: {
    fontWeight: '800',
    color: colors.textPrimary,
  },
  servicesBox: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 4,
    gap: 4,
  },
  servicesHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  serviceLine: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  qtyGreen: {
    fontWeight: '900',
    color: colors.success,
  },
  commissionTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  commissionText: {
    fontWeight: '800',
    fontSize: 12,
  },
  pickupCommissionBg: {
    backgroundColor: '#fef3c7',
  },
  pickupCommissionText: {
    color: '#b45309',
    fontWeight: '800',
    fontSize: 12,
  },
  deliveryCommissionBg: {
    backgroundColor: '#eff6ff',
  },
  deliveryCommissionText: {
    color: '#1e40af',
    fontWeight: '800',
    fontSize: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 14,
  },
});
