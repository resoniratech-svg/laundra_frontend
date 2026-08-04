import { create } from 'zustand';
import { EarningSummary } from '../types/earning';

interface EarningState {
  summary: EarningSummary;
  setEarningSummary: (summary: EarningSummary) => void;
}

export const useEarningStore = create<EarningState>((set) => ({
  summary: {
    todayEarnings: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    lifetimeEarnings: 0,
    trips: [],
  },
  setEarningSummary: (summary) => set({ summary }),
}));
