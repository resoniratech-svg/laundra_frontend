import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Linking, Alert } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { HelpdeskService, Ticket } from '../services/HelpdeskService';
import { useNavigation } from '@react-navigation/native';
import { radius } from '../theme/radius';

export const HelpdeskScreen = () => {
  const navigation = useNavigation();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const [adminContact, setAdminContact] = useState({ email: 'kanikarapub@gmail.com', phone: '9638527411' });

  useEffect(() => {
    loadTickets();
    loadAdminContact();
  }, []);

  const loadAdminContact = async () => {
    const contact = await HelpdeskService.fetchAdminContact();
    if (contact) {
      setAdminContact(contact);
    }
  };

  const loadTickets = async () => {
    const data = await HelpdeskService.fetchTickets();
    if (Array.isArray(data) && data.length > 0) {
      setTickets(data);
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleCallAdmin = () => {
    Linking.openURL(`tel:${adminContact.phone}`);
  };

  const handleEmailAdmin = () => {
    Linking.openURL(`mailto:${adminContact.email}`);
  };

  const handleSubmitTicket = async () => {
    if (!subject || !description) {
      Alert.alert('Required Fields', 'Please enter subject and description.');
      return;
    }
    setLoading(true);
    const ok = await HelpdeskService.raiseTicket(subject, description);
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
    <ScreenContainer style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Helpdesk Support</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Card 1: Company Admin Contact */}
        <View style={styles.adminContactCard}>
          <View style={styles.adminHeaderRow}>
            <View style={styles.adminAvatar}>
              <Text style={{ fontSize: 18 }}>👤</Text>
            </View>
            <Text style={styles.adminTitle}>Company Admin{'\n'}Contact</Text>
          </View>

          <TouchableOpacity style={styles.contactRowItem} onPress={handleCallAdmin} activeOpacity={0.7}>
            <Text style={styles.contactIcon}>📞</Text>
            <Text style={styles.contactPhoneText}>{adminContact.phone}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactRowItem} onPress={handleEmailAdmin} activeOpacity={0.7}>
            <Text style={styles.contactIcon}>✉️</Text>
            <Text style={styles.contactEmailText}>{adminContact.email}</Text>
          </TouchableOpacity>
        </View>

        {/* Card 2: Support Ticket History */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={{ fontSize: 18, marginRight: 8 }}>📑</Text>
            <Text style={styles.cardHeaderTitle}>Support Ticket History</Text>
          </View>

          {tickets.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No previous{'\n'}support tickets.</Text>
            </View>
          ) : (
            tickets.map((t) => {
              const st = (t.status || 'PENDING').toUpperCase();
              const badgeBg = st === 'RESPONDED' || st === 'CLOSED' ? '#dcfce7' : st === 'OPEN' ? '#dbeafe' : '#ffedd5';
              const badgeTextColor = st === 'RESPONDED' || st === 'CLOSED' ? '#15803d' : st === 'OPEN' ? '#1d4ed8' : '#c2410c';

              return (
                <View key={t.id} style={styles.ticketRowCard}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.ticketMetaRow}>
                      <Text style={styles.ticketIdText}>Ticket #{t.id}</Text>
                      {t.created_at && (
                        <Text style={styles.ticketDateText}>{new Date(t.created_at).toLocaleDateString()}</Text>
                      )}
                    </View>
                    <Text style={styles.ticketSubjectText}>{t.subject}</Text>
                    <Text style={styles.ticketDescText} numberOfLines={2}>{t.description}</Text>
                    {t.admin_response && (
                      <View style={styles.replyBox}>
                        <Text style={styles.replyTitle}>🛡️ Response:</Text>
                        <Text style={styles.replyText}>{t.admin_response}</Text>
                      </View>
                    )}
                  </View>
                  <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                    <Text style={[styles.badgeText, { color: badgeTextColor }]}>
                      {st === 'PENDING' ? 'Pending' : st === 'OPEN' ? 'Open' : 'Closed'}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Card 3: Raise Support Ticket */}
        <View style={styles.card}>
          <Text style={[styles.cardHeaderTitle, { marginBottom: 14 }]}>Raise Support Ticket</Text>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Subject</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Issue title"
              placeholderTextColor="#94a3b8"
              value={subject}
              onChangeText={setSubject}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Describe your issue..."
              placeholderTextColor="#94a3b8"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity style={styles.raiseBtn} onPress={handleSubmitTicket} activeOpacity={0.85} disabled={loading}>
            <Text style={styles.raiseBtnText}>{loading ? 'Submitting...' : 'Raise Ticket'}</Text>
          </TouchableOpacity>
        </View>
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
  adminContactCard: {
    backgroundColor: '#eff6ff',
    borderRadius: radius.card || 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
    padding: 20,
    marginBottom: 16,
  },
  adminHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  adminAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  adminTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2563eb',
    lineHeight: 20,
  },
  contactRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingLeft: 6,
  },
  contactIcon: {
    fontSize: 16,
    marginRight: 10,
    color: '#3b82f6',
  },
  contactPhoneText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  contactEmailText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
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
    marginBottom: 12,
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
  ticketRowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  ticketMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  ticketIdText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563eb',
  },
  ticketDateText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  ticketSubjectText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  ticketDescText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  replyBox: {
    backgroundColor: '#f0f9ff',
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#0284c7',
  },
  replyTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284c7',
  },
  replyText: {
    fontSize: 12,
    color: '#0f172a',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
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
  textInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  textArea: {
    height: 90,
    paddingTop: 10,
  },
  raiseBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    boxShadow: '0 4px 10px rgba(239, 68, 68, 0.25)',
  },
  raiseBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
});

