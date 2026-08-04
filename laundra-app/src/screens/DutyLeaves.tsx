import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { Header } from '../components/Header';
import { AppInput } from '../components/AppInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { Badge } from '../components/Badge';
import { useAttendance } from '../hooks/useAttendance';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadow } from '../theme/shadow';
import { useNavigation } from '@react-navigation/native';

export const DutyLeavesScreen = () => {
  const navigation = useNavigation();
  const { leaveRequests, addLeaveRequest } = useAttendance();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const handleApplyLeave = () => {
    if (!startDate || !reason) {
      Alert.alert('Required Fields', 'Please specify leave start date and reason.');
      return;
    }
    addLeaveRequest({
      deliveryBoyName: 'Driver',
      startDate,
      endDate: endDate || startDate,
      reason,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    });
    setStartDate('');
    setEndDate('');
    setReason('');
    Alert.alert('Leave Submitted', 'Your leave request has been submitted to company management for review.');
  };

  return (
    <ScreenContainer>
      <Header title="Leave Management" showBack onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Apply for Leave Form */}
        <Text style={styles.sectionTitle}>Apply for Leave</Text>
        <View style={[styles.formCard, shadow.card]}>
          <AppInput label="Start Date (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} placeholder="2026-08-05" />
          <AppInput label="End Date (YYYY-MM-DD)" value={endDate} onChangeText={setEndDate} placeholder="2026-08-07" />
          <AppInput label="Reason for Leave" value={reason} onChangeText={setReason} placeholder="Medical / Personal leave..." multiline numberOfLines={3} />
          <PrimaryButton title="Submit Leave Request" onPress={handleApplyLeave} />
        </View>

        {/* Leave Requests History */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Leave Requests History</Text>
        {leaveRequests.length === 0 ? (
          <Text style={styles.emptyText}>No leave requests submitted yet.</Text>
        ) : (
          leaveRequests.map((req, idx) => (
            <View key={idx} style={styles.leaveCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.leaveDates}>{req.startDate} to {req.endDate}</Text>
                <Text style={styles.leaveReason}>{req.reason}</Text>
              </View>
              <Badge label={req.status} />
            </View>
          ))
        )}

      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  formCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  leaveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: radius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  leaveDates: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  leaveReason: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
