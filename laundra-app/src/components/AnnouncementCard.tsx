import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Announcement } from '../types/announcement';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';

interface AnnouncementCardProps {
  item: Announcement;
}

export const AnnouncementCard: React.FC<AnnouncementCardProps> = ({ item }) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{item.title}</Text>
        {item.priority === 'High' && (
          <View style={styles.highPill}>
            <Text style={styles.highText}>HIGH PRIORITY</Text>
          </View>
        )}
      </View>
      <Text style={styles.content}>{item.content}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: radius.card,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
  },
  highPill: {
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  highText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '800',
  },
  content: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
