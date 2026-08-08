import { create } from 'zustand';
import { User } from '../types/user';

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  activeCompanyId: string;
  language: 'en' | 'ar';
  loginUser: (user: User) => void;
  logoutUser: () => void;
  setCompanyId: (id: string) => void;
  setLanguage: (lang: 'en' | 'ar') => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  isAuthenticated: false,
  activeCompanyId: 'comp-101',
  language: 'en',
  loginUser: (user) => set({ currentUser: user, isAuthenticated: true, activeCompanyId: user.companyId || 'comp-101' }),
  logoutUser: () => set({ currentUser: null, isAuthenticated: false }),
  setCompanyId: (id) => set({ activeCompanyId: id }),
  setLanguage: (lang) => set({ language: lang }),
}));
