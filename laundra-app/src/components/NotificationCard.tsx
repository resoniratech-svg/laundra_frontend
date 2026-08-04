import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NotificationItem } from '../types/announcement';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';

interface NotificationCardProps {
  item: NotificationItem;
  onPress?: () => void;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({ item, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.card, item.unread && styles.unreadCard]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.icon}>🔔</Text>
      <View style={styles.content}>
        <Text style={styles.text}>{item.text}</Text>
        <Text style={styles.time}>{item.time}</Text>
      </View>
      {item.unread && <View style={styles.dot} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: radius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  unreadCard: {
    backgroundColor: colors.primaryLight,
    borderColor: '#bfdbfe',
  },
  icon: {
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  text: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    lineHeight: 18,
  },
  time: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
