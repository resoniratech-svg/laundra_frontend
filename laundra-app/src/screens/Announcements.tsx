import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { Header } from '../components/Header';
import { AnnouncementCard } from '../components/AnnouncementCard';
import { EmptyState } from '../components/EmptyState';
import { Announcement } from '../types/announcement';
import { useNavigation } from '@react-navigation/native';
import { AnnouncementService } from '../services/AnnouncementService';

export const AnnouncementsScreen = () => {
  const navigation = useNavigation();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAnnouncements = async () => {
    setLoading(true);
    const data = await AnnouncementService.fetchAnnouncements();
    if (Array.isArray(data)) {
      setAnnouncements(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  return (
    <ScreenContainer>
      <Header title="Company Announcements" showBack onBack={() => navigation.goBack()} />
      <View style={styles.container}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : (
          <FlatList
            data={announcements}
            keyExtractor={(item, index) => item.id || String(index)}
            renderItem={({ item }) => <AnnouncementCard item={item} />}
            contentContainerStyle={{ padding: 16 }}
            onRefresh={loadAnnouncements}
            refreshing={loading}
            ListEmptyComponent={
              <EmptyState icon="📢" title="No Active Announcements" message="Check back later for company broadcasts and notices." />
            }
          />
        )}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
