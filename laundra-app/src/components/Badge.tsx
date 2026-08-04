import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { getStatusColor } from '../utils/statusColor';
import { radius } from '../theme/radius';

interface BadgeProps {
  label: string;
  type?: 'status' | 'custom';
  bg?: string;
  color?: string;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ label, type = 'status', bg, color, style }) => {
  const statusTheme = getStatusColor(label);
  const backgroundColor = bg || statusTheme.bg;
  const textColor = color || statusTheme.text;

  return (
    <View style={[styles.badge, { backgroundColor }, style]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
});
