import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem } from '../types';

interface CartState {
  items: CartItem[];
  customerName: string;

  // Computed
  total: number;
  itemCount: number;

  // Actions
  addItem: (item: CartItem) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  updateNotes: (productId: number, notes: string) => void;
  updateDiscount: (productId: number, discount: number) => void;
  setCustomerName: (name: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      customerName: '',

      get total() {
        return get().items.reduce(
          (sum, item) =>
            sum + Math.max(0, item.unit_price * item.quantity - (item.discount || 0)),
          0
        );
      },

      get itemCount() {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      addItem: (item: CartItem) => {
        const { items } = get();
        const existingIndex = items.findIndex(
          (i) => i.product_id === item.product_id
        );

        if (existingIndex >= 0) {
          // Atualizar quantidade se já existe
          const newItems = [...items];
          newItems[existingIndex].quantity += item.quantity;
          set({ items: newItems });
        } else {
          // Adicionar novo item
          set({ items: [...items, item] });
        }

        console.log('🛒 Item adicionado:', item.product_name);
      },

      removeItem: (productId: number) => {
        const { items } = get();
        set({ items: items.filter((item) => item.product_id !== productId) });
        console.log('🗑️ Item removido:', productId);
      },

      updateQuantity: (productId: number, quantity: number) => {
        const { items } = get();

        if (quantity <= 0) {
          set({ items: items.filter((item) => item.product_id !== productId) });
        } else {
          const newItems = items.map((item) =>
            item.product_id === productId ? { ...item, quantity } : item
          );
          set({ items: newItems });
        }
      },

      updateNotes: (productId: number, notes: string) => {
        const { items } = get();
        set({
          items: items.map((item) =>
            item.product_id === productId ? { ...item, notes } : item
          ),
        });
      },

      updateDiscount: (productId: number, discount: number) => {
        const { items } = get();
        set({
          items: items.map((item) =>
            item.product_id === productId
              ? { ...item, discount: Math.max(0, discount) }
              : item
          ),
        });
      },

      setCustomerName: (name: string) => {
        set({ customerName: name });
      },

      clearCart: () => {
        set({ items: [], customerName: '' });
        console.log('🧹 Carrinho limpo');
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
