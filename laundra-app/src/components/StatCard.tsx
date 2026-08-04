import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { radius } from '../theme/radius';
import { shadow } from '../theme/shadow';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  badgeLabel: string;
  bg: string;
  borderColor: string;
  textColor: string;
  badgeBg: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  badgeLabel,
  bg,
  borderColor,
  textColor,
  badgeBg,
}) => {
  return (
    <View style={[styles.card, { backgroundColor: bg, borderColor }, shadow.soft]}>
      <View style={styles.topRow}>
        <View style={styles.titleRow}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </View>
      </View>
      <Text style={[styles.value, { color: textColor }]}>{value}</Text>
      <Text style={[styles.subtitle, { color: textColor }]}>{subtitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 18,
    borderRadius: radius.card, // 16px Card Radius
    borderWidth: 1,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 22,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  value: {
    fontSize: 28,
    fontWeight: '900',
    marginVertical: 8,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.9,
  },
});
