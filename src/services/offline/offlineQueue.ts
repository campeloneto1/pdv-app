import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/api';

const STORAGE_KEY = 'pending_sales';

export interface PendingSale {
  localId: string;
  branchId: number;
  saleData: any;
  createdAt: string;
}

export async function getPendingSales(): Promise<PendingSale[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function savePendingSales(sales: PendingSale[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
}

export async function enqueueSale(branchId: number, saleData: any): Promise<PendingSale> {
  const sales = await getPendingSales();
  const entry: PendingSale = {
    localId: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    branchId,
    saleData,
    createdAt: new Date().toISOString(),
  };
  sales.push(entry);
  await savePendingSales(sales);
  return entry;
}

export async function getPendingCount(): Promise<number> {
  return (await getPendingSales()).length;
}

/**
 * Tenta enviar todas as vendas pendentes ao backend.
 * Vendas que falharem por erro de validação (não rede) são descartadas
 * da fila e reportadas, pra não travar a sincronização indefinidamente.
 */
export async function syncPendingSales(): Promise<{ synced: number; failed: number }> {
  const sales = await getPendingSales();
  if (sales.length === 0) return { synced: 0, failed: 0 };

  const remaining: PendingSale[] = [];
  let synced = 0;
  let failed = 0;

  for (const sale of sales) {
    try {
      await api.post(`/branches/${sale.branchId}/sales`, sale.saleData);
      synced += 1;
    } catch (error: any) {
      if (!error.response) {
        // Ainda sem rede, mantém na fila para tentar depois
        remaining.push(sale);
      } else {
        // Backend rejeitou a venda (ex: dado inválido) - não há como reenviar igual
        failed += 1;
      }
    }
  }

  await savePendingSales(remaining);
  return { synced, failed };
}
