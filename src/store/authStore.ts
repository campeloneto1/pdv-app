import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Branch } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  selectedBranch: Branch | null;
  _hydrated: boolean;

  // Actions
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  setSelectedBranch: (branch: Branch) => void;
  setHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      selectedBranch: null,
      _hydrated: false,

      login: async (token: string, user: User) => {
        await AsyncStorage.setItem('auth_token', token);
        await AsyncStorage.setItem('company_id', user.company_id.toString());

        set({
          user,
          token,
          isAuthenticated: true,
        });

        console.log('✅ Login realizado:', user.name);
      },

      logout: async () => {
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('company_id');

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          selectedBranch: null,
        });

        console.log('👋 Logout realizado');
      },

      setSelectedBranch: (branch: Branch) => {
        set({ selectedBranch: branch });
        console.log('🏪 Filial selecionada:', branch.name);
      },

      setHydrated: (value: boolean) => {
        set({ _hydrated: value });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
