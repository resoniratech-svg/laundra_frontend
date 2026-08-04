import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { Header } from '../components/Header';
import { Avatar } from '../components/Avatar';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadow } from '../theme/shadow';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MoreStackParamList } from '../navigation/MoreStack';

export const MoreScreen = () => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const logoutUser = useAuthStore((state) => state.logoutUser);
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of your driver session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logoutUser },
    ]);
  };

  const menuItems = [
    { id: 'DutyLeaves', title: '📅 Duty & Leave', desc: 'Clock In/Out attendance & leave requests' },
    { id: 'Helpdesk', title: '💬 Helpdesk Support', desc: 'Raise support tickets & contact admin' },
    { id: 'Announcements', title: '📢 Announcements', desc: 'Platform announcements & company notices' },
    { id: 'Profile', title: '👤 Driver Profile', desc: 'Vehicle details, license & account settings' },
  ];

  return (
    <ScreenContainer>
      <Header title="More Operations" subtitle="Operations hub & driver settings" />
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Driver Profile Header Card */}
        <View style={[styles.profileCard, shadow.card]}>
          <Avatar name={currentUser?.name || 'Driver'} uri={currentUser?.profilePhoto} size={54} />
          <View style={styles.profileText}>
            <Text style={styles.name}>{currentUser?.name || 'Driver'}</Text>
            <Text style={styles.email}>{currentUser?.email}</Text>
            <View style={styles.dutyPill}>
              <Text style={styles.dutyText}>🟢 Active Duty</Text>
            </View>
          </View>
        </View>

        {/* Menu Items Options */}
        <View style={styles.menuBox}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => navigation.navigate(item.id as any)}
            >
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDesc}>{item.desc}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 Logout Session</Text>
        </TouchableOpacity>

      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    gap: 16,
  },
  profileText: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  email: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dutyPill: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  dutyText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '800',
  },
  menuBox: {
    backgroundColor: '#ffffff',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  menuDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textMuted,
    marginLeft: 10,
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
