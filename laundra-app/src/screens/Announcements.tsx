import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { Header } from '../components/Header';
import { AnnouncementCard } from '../components/AnnouncementCard';
import { EmptyState } from '../components/EmptyState';
import { Announcement } from '../types/announcement';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AnnouncementService } from '../services/AnnouncementService';
import { useAuthStore } from '../store/authStore';
import { tApp } from '../utils/i18n';

export const AnnouncementsScreen = () => {
  const navigation = useNavigation();
  const language = useAuthStore((state) => state.language);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAnnouncements = async () => {
    const data = await AnnouncementService.fetchAnnouncements();
    if (Array.isArray(data)) {
      setAnnouncements(data);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadAnnouncements();
      const interval = setInterval(() => {
        loadAnnouncements();
      }, 15000);
      return () => clearInterval(interval);
    }, [])
  );

  return (
    <ScreenContainer>
      <Header title={tApp('Company Announcements', language)} showBack onBack={() => navigation.goBack()} />
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
              <EmptyState icon="📢" title={tApp('No Active Announcements', language)} message={tApp('Check back later for company broadcasts and notices.', language)} />
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
