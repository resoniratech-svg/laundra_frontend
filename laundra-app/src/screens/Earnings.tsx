import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { Header } from '../components/Header';
import { HistoryCard } from '../components/HistoryCard';
import { EmptyState } from '../components/EmptyState';
import { useEarnings } from '../hooks/useEarnings';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadow } from '../theme/shadow';
import { STRINGS } from '../constants/strings';

export const EarningsScreen = () => {
  const earnings = useEarnings();
  const [periodFilter, setPeriodFilter] = useState<'today' | 'weekly' | 'monthly' | 'lifetime'>('today');

  const filteredTrips = earnings.trips;

  return (
    <ScreenContainer>
      <Header title="My Commission Earnings" subtitle="Track trip payouts & commission ledger" />

      <View style={styles.content}>
        {/* Total Summary Card */}
        <View style={[styles.summaryCard, shadow.card]}>
          <Text style={styles.summaryLabel}>Total Driver Earnings</Text>
          <Text style={styles.summaryValue}>{STRINGS.CURRENCY} {earnings.todayEarnings.toFixed(2)}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statSub}>Paid Out</Text>
              <Text style={[styles.statVal, { color: colors.success }]}>
                {STRINGS.CURRENCY} {earnings.paidEarnings.toFixed(2)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statSub}>Pending Settlement</Text>
              <Text style={[styles.statVal, { color: colors.warning }]}>
                {STRINGS.CURRENCY} {earnings.pendingEarnings.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Period Filter Buttons */}
        <View style={styles.filterRow}>
          {(['today', 'weekly', 'monthly', 'lifetime'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterBtn, periodFilter === filter && styles.activeFilterBtn]}
              onPress={() => setPeriodFilter(filter)}
            >
              <Text style={[styles.filterText, periodFilter === filter && styles.activeFilterText]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Trips History FlatList */}
        <Text style={styles.historyTitle}>Trip Commissions History</Text>
        <FlatList
          data={filteredTrips}
          keyExtractor={(item, idx) => `${item.orderId}-${idx}`}
          renderItem={({ item }) => <HistoryCard trip={item} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <EmptyState
              icon="💵"
              title="No Trips Completed Yet"
              message="Complete pickups or delivery drops to earn trip commissions!"
            />
          }
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.card,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.primary,
    marginVertical: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    marginTop: 4,
  },
  statCol: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
  statSub: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  statVal: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  activeFilterBtn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  activeFilterText: {
    color: '#ffffff',
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 10,
  },
});
