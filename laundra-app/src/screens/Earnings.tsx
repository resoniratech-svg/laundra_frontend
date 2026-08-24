import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { useEarnings } from '../hooks/useEarnings';
import { useNavigation } from '@react-navigation/native';
import { radius } from '../theme/radius';
import { useAuthStore } from '../store/authStore';
import { tApp } from '../utils/i18n';

const WalletIllustration = () => (
  <View style={walletStyles.circleContainer}>
    {/* Tilted Cards Peeking Out */}
    <View style={walletStyles.cardBack} />
    <View style={walletStyles.cardFront} />
    {/* Wallet Main Body */}
    <View style={walletStyles.walletBody}>
      {/* Wallet Flap with Button Clasp */}
      <View style={walletStyles.walletFlap}>
        <View style={walletStyles.walletButton} />
      </View>
    </View>
  </View>
);

export const EarningsScreen = () => {
  const navigation = useNavigation();
  const earnings = useEarnings();
  const language = useAuthStore((state) => state.language);

  const pendingAmount = earnings.pendingEarnings || 0;
  const paidAmount = earnings.paidEarnings || 0;
  const lifetimeAmount = earnings.lifetimeEarnings || 0;
  const trips = earnings.trips || [];

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <ScreenContainer style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>{tApp('My Earnings', language)}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Two Earning Cards */}
        <View style={styles.cardsRow}>
          {/* Card 1: Amount Pending (Unpaid) */}
          <View style={styles.earningCard}>
            <Text style={styles.cardHeaderTitle}>
              {tApp('Amount Pending (Unpaid)', language)}
            </Text>
            <Text style={[styles.cardAmount, { color: '#f97316' }]}>
              QR {(Number(pendingAmount) || 0).toFixed(2)}
            </Text>
            <Text style={styles.cardSubtitle}>
              {tApp('Awaiting payout from Admin', language)}
            </Text>
          </View>

          {/* Card 2: Successfully Paid */}
          <View style={styles.earningCard}>
            <Text style={styles.cardHeaderTitle}>
              {tApp('Successfully Paid', language)}
            </Text>
            <Text style={[styles.cardAmount, { color: '#10b981' }]}>
              QR {(Number(paidAmount) || 0).toFixed(2)}
            </Text>
            <Text style={styles.cardSubtitle}>
              {tApp('Total payouts received', language)}
            </Text>
          </View>
        </View>

        {/* Earnings & Payout History Card */}
        <View style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Text style={{ fontSize: 18, marginRight: 8 }}>📑</Text>
            <Text style={styles.historyTitle}>{tApp('Earnings & Payout History', language)}</Text>
          </View>
          <Text style={styles.lifetimeText}>{tApp('Total Lifetime:', language)} QR {(Number(lifetimeAmount) || 0).toFixed(2)}</Text>

          {trips.length === 0 ? (
            <View style={styles.emptyContainer}>
              <WalletIllustration />
              <Text style={styles.emptyTitle}>No completed tasks yet.</Text>
              <Text style={styles.emptySubtitle}>
                Your earnings history will{'\n'}appear here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={trips}
              keyExtractor={(item, index) => `${item.orderId}-${index}`}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.transactionCard}>
                  <View style={styles.txLeft}>
                    <Text style={styles.txDate}>{item.date ? new Date(item.date).toLocaleDateString() : 'Today'}</Text>
                    <Text style={styles.txTaskId}>
                      {tApp('Task #', language)}{item.orderId}
                      {item.delivTaskId && item.delivTaskId !== item.orderId && item.delivTaskId !== 'undefined' ? ` (${tApp('Task #', language)}${item.delivTaskId.slice(0, 6)})` : ''}
                    </Text>
                    <Text style={styles.txType}>{tApp(item.type, language)} • {item.customerName}</Text>
                  </View>
                  <View style={styles.txRight}>
                    <Text style={styles.txAmount}>+QR {(Number(item.amount) || 0).toFixed(2)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'Paid' ? '#dcfce7' : '#ffedd5' }]}>
                      <Text style={[styles.statusText, { color: item.status === 'Paid' ? '#15803d' : '#c2410c' }]}>
                        {item.status === 'Paid' ? `${tApp('Paid via', language)} ${tApp(item.paidMethod || 'Cash', language)}` : tApp('Pending', language)}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const walletStyles = StyleSheet.create({
  circleContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  cardBack: {
    position: 'absolute',
    top: 22,
    width: 64,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#c7d2fe',
    transform: [{ rotate: '-15deg' }],
  },
  cardFront: {
    position: 'absolute',
    top: 28,
    width: 68,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#a5b4fc',
    transform: [{ rotate: '-5deg' }],
  },
  walletBody: {
    position: 'absolute',
    top: 40,
    width: 84,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#818cf8',
    elevation: 3,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  walletFlap: {
    position: 'absolute',
    right: 8,
    top: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#c7d2fe',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#818cf8',
  },
  walletButton: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
});

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
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  earningCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: radius.card || 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 160,
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
  },
  cardAmount: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: 8,
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
  },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.card || 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  lifetimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  txLeft: {
    gap: 2,
  },
  txDate: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  txTaskId: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  txType: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '900',
    color: '#10b981',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
