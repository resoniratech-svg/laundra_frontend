import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { Header } from '../components/Header';
import { Avatar } from '../components/Avatar';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadow } from '../theme/shadow';
import { useNavigation } from '@react-navigation/native';

export const ProfileScreen = () => {
  const navigation = useNavigation();
  const currentUser = useAuthStore((state) => state.currentUser);
  const logoutUser = useAuthStore((state) => state.logoutUser);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of your driver session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          const { AuthService } = require('../services/AuthService');
          await AuthService.logout();
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      <Header title="Driver Profile & Vehicle" showBack onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Profile Card */}
        <View style={[styles.card, shadow.card, { alignItems: 'center' }]}>
          <Avatar name={currentUser?.name || 'Driver'} uri={currentUser?.profilePhoto} size={70} />
          <Text style={styles.name}>{currentUser?.name || 'Driver'}</Text>
          <Text style={styles.role}>🚚 Laundry Delivery Staff</Text>
          <Text style={styles.email}>{currentUser?.email}</Text>
        </View>

        {/* Employee Details Card */}
        <Text style={styles.sectionTitle}>Employee Information</Text>
        <View style={[styles.card, shadow.card]}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Company ID:</Text>
            <Text style={styles.infoValue}>{currentUser?.companyId || 'comp-101'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone Number:</Text>
            <Text style={styles.infoValue}>+974 5512 3456</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vehicle Type:</Text>
            <Text style={styles.infoValue}>Delivery Van (Toyota HiAce)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Plate Number:</Text>
            <Text style={styles.infoValue}>QA-89412</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Version:</Text>
            <Text style={styles.infoValue}>v2.4.0 (Expo SDK 54)</Text>
          </View>
        </View>

        {/* Account Actions */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 Sign Out of Driver Account</Text>
        </TouchableOpacity>

      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: radius.card,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  name: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 10,
  },
  role: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  email: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  logoutBtn: {
    backgroundColor: colors.dangerLight,
    paddingVertical: 14,
    borderRadius: radius.button,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  logoutText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '800',
  },
});
