import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { ScreenContainer } from '../components/ScreenContainer';
import { useAttendance } from '../hooks/useAttendance';
import { useNavigation } from '@react-navigation/native';
import { LeaveService } from '../services/LeaveService';
import { LeaveRequest } from '../types/leave';
import { radius } from '../theme/radius';

export const DutyLeavesScreen = () => {
  const navigation = useNavigation();
  const { attendanceLogs = [] } = useAttendance();

  const [startDateObj, setStartDateObj] = useState<Date | null>(null);
  const [endDateObj, setEndDateObj] = useState<Date | null>(null);
  const [startDate, setStartDate] = useState(''); // Display format dd-mm-yyyy
  const [endDate, setEndDate] = useState('');     // Display format dd-mm-yyyy
  const [reason, setReason] = useState('');
  const [backendLeaves, setBackendLeaves] = useState<LeaveRequest[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Fallback picker state for non-Android platforms
  const [showPicker, setShowPicker] = useState<'start' | 'end' | null>(null);

  const loadLeaves = async () => {
    const data = await LeaveService.fetchMyLeaves();
    if (data) {
      setBackendLeaves(data);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, []);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const formatDateToDDMMYYYY = (d: Date): string => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatDateToYYYYMMDD = (d: Date): string => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const openStartDatePicker = () => {
    const initialDate = startDateObj || new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initialDate,
        mode: 'date',
        is24Hour: true,
        onChange: (event, selectedDate) => {
          if (event.type === 'set' && selectedDate) {
            setStartDateObj(selectedDate);
            const formatted = formatDateToDDMMYYYY(selectedDate);
            setStartDate(formatted);
            if (!endDateObj || endDateObj < selectedDate) {
              setEndDateObj(selectedDate);
              setEndDate(formatted);
            }
          }
        },
      });
    } else {
      setShowPicker('start');
    }
  };

  const openEndDatePicker = () => {
    const minDate = startDateObj || new Date();
    const initialDate = endDateObj && endDateObj >= minDate ? endDateObj : minDate;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initialDate,
        minimumDate: minDate,
        mode: 'date',
        is24Hour: true,
        onChange: (event, selectedDate) => {
          if (event.type === 'set' && selectedDate) {
            setEndDateObj(selectedDate);
            setEndDate(formatDateToDDMMYYYY(selectedDate));
          }
        },
      });
    } else {
      setShowPicker('end');
    }
  };

  const handleNonAndroidDateChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowPicker(null);
      return;
    }
    const current = selectedDate || (showPicker === 'start' ? startDateObj : endDateObj) || new Date();
    setShowPicker(null);
    const formatted = formatDateToDDMMYYYY(current);

    if (showPicker === 'start') {
      setStartDateObj(current);
      setStartDate(formatted);
      if (!endDateObj || endDateObj < current) {
        setEndDateObj(current);
        setEndDate(formatted);
      }
    } else if (showPicker === 'end') {
      setEndDateObj(current);
      setEndDate(formatted);
    }
  };

  const handleApplyLeave = async () => {
    if (!startDate || !reason) {
      Alert.alert('Required Fields', 'Please specify leave start date and reason.');
      return;
    }
    const payloadStart = startDateObj ? formatDateToYYYYMMDD(startDateObj) : startDate;
    const payloadEnd = endDateObj ? formatDateToYYYYMMDD(endDateObj) : (startDateObj ? formatDateToYYYYMMDD(startDateObj) : startDate);
    setSubmitting(true);
    try {
      await LeaveService.applyLeave(payloadStart, payloadEnd, reason);
      setStartDateObj(null);
      setEndDateObj(null);
      setStartDate('');
      setEndDate('');
      setReason('');
      await loadLeaves();
      Alert.alert('Leave Submitted', 'Your leave request has been submitted to company management for review.');
    } catch (e: any) {
      Alert.alert('Submission Failed', e?.message || 'Unable to submit leave request to server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Duty & Leave Log</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Card 1: Apply for Leave */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={{ fontSize: 18, marginRight: 8 }}>📑</Text>
            <Text style={styles.cardHeaderTitle}>Apply for Leave</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Start Date</Text>
            <TouchableOpacity onPress={openStartDatePicker} activeOpacity={0.7} style={styles.inputRow}>
              <Text style={[styles.textInputFlex, !startDate && { color: '#94a3b8' }]}>
                {startDate || 'dd-mm-yyyy'}
              </Text>
              <Text style={styles.inputIcon}>📅</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>End Date</Text>
            <TouchableOpacity onPress={openEndDatePicker} activeOpacity={0.7} style={styles.inputRow}>
              <Text style={[styles.textInputFlex, !endDate && { color: '#94a3b8' }]}>
                {endDate || 'dd-mm-yyyy'}
              </Text>
              <Text style={styles.inputIcon}>📅</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Reason</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInputFlex}
                placeholder="Reason for leave"
                placeholderTextColor="#94a3b8"
                value={reason}
                onChangeText={setReason}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleApplyLeave} disabled={submitting} activeOpacity={0.85}>
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Request</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Card 3: Leave History Status */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={{ fontSize: 18, marginRight: 8 }}>📑</Text>
            <Text style={styles.cardHeaderTitle}>Leave History Status</Text>
          </View>

          {backendLeaves.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No requested{'\n'}leaves yet.</Text>
            </View>
          ) : (
            backendLeaves.map((req, idx) => {
              const st = (req.status || 'Pending').toLowerCase();
              const badgeBg = st === 'approved' ? '#dcfce7' : st === 'rejected' ? '#fee2e2' : '#fef3c7';
              const badgeTextColor = st === 'approved' ? '#15803d' : st === 'rejected' ? '#b91c1c' : '#b45309';

              return (
                <View key={idx} style={styles.leaveRowCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.leaveDatesText}>
                      {req.startDate} to {req.endDate}
                    </Text>
                    <Text style={styles.leaveReasonText}>{req.reason}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                    <Text style={[styles.badgeText, { color: badgeTextColor }]}>
                      {req.status}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {showPicker && Platform.OS !== 'android' && (
          <DateTimePicker
            value={(showPicker === 'start' ? startDateObj : endDateObj) || new Date()}
            minimumDate={showPicker === 'end' ? (startDateObj || new Date()) : undefined}
            mode="date"
            display="default"
            onChange={handleNonAndroidDateChange}
          />
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#f8fafc',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  backIcon: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: radius.card || 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptyBox: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  logType: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  logTime: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284c7',
  },
  formGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  textInputFlex: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    padding: 0,
  },
  inputIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  submitBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    boxShadow: '0 4px 10px rgba(99, 102, 241, 0.25)',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  leaveRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  leaveDatesText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  leaveReasonText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
});

