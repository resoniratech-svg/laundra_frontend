import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { Header } from '../components/Header';
import { AnnouncementCard } from '../components/AnnouncementCard';
import { EmptyState } from '../components/EmptyState';
import { Announcement } from '../types/announcement';
import { useNavigation } from '@react-navigation/native';

export const AnnouncementsScreen = () => {
  const navigation = useNavigation();

  const announcements: Announcement[] = [
    {
      id: 'ann-1',
      title: '🚚 Peak Shift Express Delivery Notice',
      content: 'All driver staff must prioritize ready express orders before 4 PM. Ensure customer OTP is verified upon drop-off.',
      created_at: new Date().toISOString(),
      priority: 'High',
    },
    {
      id: 'ann-2',
      title: '⛽ Monthly Fuel Allowance Disbursement',
      content: 'Fuel allowances for the month have been processed and added to driver commission settlements.',
      created_at: new Date().toISOString(),
      priority: 'Low',
    },
  ];

  return (
    <ScreenContainer>
      <Header title="Company Announcements" showBack onBack={() => navigation.goBack()} />
      <View style={styles.container}>
        <FlatList
          data={announcements}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AnnouncementCard item={item} />}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <EmptyState icon="📢" title="No Active Announcements" message="Check back later for company broadcasts and notices." />
          }
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
