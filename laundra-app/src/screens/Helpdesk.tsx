import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { Header } from '../components/Header';
import { AppInput } from '../components/AppInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { Badge } from '../components/Badge';
import { HelpdeskService, Ticket } from '../services/HelpdeskService';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadow } from '../theme/shadow';
import { useNavigation } from '@react-navigation/native';

export const HelpdeskScreen = () => {
  const navigation = useNavigation();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const handleCallAdmin = () => {
    Linking.openURL('tel:+97455551234');
  };

  const handleEmailAdmin = () => {
    Linking.openURL('mailto:support@laundrahq.com');
  };

  const handleSubmitTicket = async () => {
    if (!subject || !description) {
      Alert.alert('Required Fields', 'Please enter subject and description.');
      return;
    }
    setLoading(true);
    await HelpdeskService.raiseTicket(subject, description);
    setLoading(false);
    
    const newTicket: Ticket = {
      id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      subject,
      description,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };
    setTickets([newTicket, ...tickets]);
    setSubject('');
    setDescription('');
    Alert.alert('Ticket Submitted', 'Support ticket raised successfully. Admin response will appear here.');
  };

  return (
    <ScreenContainer>
      <Header title="Helpdesk & Operations Support" showBack onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Quick Admin Contact Cards */}
        <View style={styles.contactRow}>
          <TouchableOpacity style={[styles.contactCard, shadow.card]} onPress={handleCallAdmin}>
            <Text style={styles.contactIcon}>📞</Text>
            <Text style={styles.contactTitle}>Call Admin</Text>
            <Text style={styles.contactSub}>+974 5555 1234</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.contactCard, shadow.card]} onPress={handleEmailAdmin}>
            <Text style={styles.contactIcon}>✉️</Text>
            <Text style={styles.contactTitle}>Email Support</Text>
            <Text style={styles.contactSub}>support@laundrahq.com</Text>
          </TouchableOpacity>
        </View>

        {/* Raise Ticket Form */}
        <Text style={styles.sectionTitle}>Raise Support Ticket</Text>
        <View style={[styles.formCard, shadow.card]}>
          <AppInput label="Subject / Issue Title" value={subject} onChangeText={setSubject} placeholder="e.g. Fuel Allowance / App Bug" />
          <AppInput label="Description" value={description} onChangeText={setDescription} placeholder="Describe the issue in detail..." multiline numberOfLines={4} />
          <PrimaryButton title="Submit Support Ticket" onPress={handleSubmitTicket} loading={loading} />
        </View>

        {/* Support Tickets History */}
        <Text style={styles.sectionTitle}>My Support Tickets</Text>
        {tickets.length === 0 ? (
          <Text style={styles.emptyText}>No support tickets raised yet.</Text>
        ) : (
          tickets.map((t) => (
            <View key={t.id} style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <Text style={styles.ticketId}>#{t.id}</Text>
                <Badge label={t.status} />
              </View>
              <Text style={styles.ticketSubject}>{t.subject}</Text>
              <Text style={styles.ticketDesc}>{t.description}</Text>
              {t.admin_response && (
                <View style={styles.replyBox}>
                  <Text style={styles.replyTitle}>🛡️ Admin Response:</Text>
                  <Text style={styles.replyText}>{t.admin_response}</Text>
                </View>
              )}
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
  contactRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  contactCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: radius.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  contactSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  formCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  ticketCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: radius.card,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ticketId: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  ticketSubject: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  ticketDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  replyBox: {
    backgroundColor: colors.primaryLight,
    padding: 10,
    borderRadius: radius.sm,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  replyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  replyText: {
    fontSize: 12,
    color: colors.textPrimary,
    marginTop: 2,
  },
});
