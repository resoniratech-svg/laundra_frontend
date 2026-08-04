import { create } from 'zustand';
import { User } from '../types/user';

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  activeCompanyId: string;
  loginUser: (user: User) => void;
  logoutUser: () => void;
  setCompanyId: (id: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  isAuthenticated: false,
  activeCompanyId: 'comp-101',
  loginUser: (user) => set({ currentUser: user, isAuthenticated: true, activeCompanyId: user.companyId || 'comp-101' }),
  logoutUser: () => set({ currentUser: null, isAuthenticated: false }),
  setCompanyId: (id) => set({ activeCompanyId: id }),
}));
