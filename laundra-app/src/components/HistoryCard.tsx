import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EarningTrip } from '../types/earning';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { Badge } from './Badge';

interface HistoryCardProps {
  trip: EarningTrip;
}

export const HistoryCard: React.FC<HistoryCardProps> = ({ trip }) => {
  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <Text style={styles.orderId}>Order #{trip.orderId}</Text>
        <Text style={styles.subText}>{trip.type} • {trip.customerName}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>+QR {trip.amount.toFixed(2)}</Text>
        <Badge label={trip.status} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: radius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  left: {
    gap: 2,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amount: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.success,
  },
});
