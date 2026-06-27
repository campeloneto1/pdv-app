import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CashRegister } from '../types';

interface SessionState {
  selectedBranchId: number | null;
  selectedBranchName: string | null;
  cashRegister: CashRegister | null;
  isOfflineMode: boolean;

  // Actions
  setBranch: (id: number, name: string) => void;
  setCashRegister: (cashRegister: CashRegister) => void;
  closeCashRegister: () => void;
  setOfflineMode: (value: boolean) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      selectedBranchId: null,
      selectedBranchName: null,
      cashRegister: null,
      isOfflineMode: false,

      setBranch: (id: number, name: string) => {
        set({ selectedBranchId: id, selectedBranchName: name });
        console.log('🏪 Filial selecionada:', name);
      },

      setCashRegister: (cashRegister: CashRegister) => {
        set({ cashRegister });
        console.log('💰 Caixa aberto:', cashRegister.id);
      },

      closeCashRegister: () => {
        set({ cashRegister: null });
        console.log('💰 Caixa fechado');
      },

      setOfflineMode: (value: boolean) => {
        set({ isOfflineMode: value });
        console.log(value ? '📴 Modo offline' : '📶 Modo online');
      },

      clearSession: () => {
        set({
          selectedBranchId: null,
          selectedBranchName: null,
          cashRegister: null,
          isOfflineMode: false,
        });
      },
    }),
    {
      name: 'session-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
