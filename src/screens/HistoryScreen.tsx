import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useSessionStore } from '../store/sessionStore';
import { ThermalPrinter } from '../services/printer/thermalPrinter';
import api from '../api/api';

interface SaleItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total: number;
  notes?: string;
  product?: {
    id: number;
    name: string;
  };
}

interface SalePayment {
  id: number;
  payment_method_id: number;
  amount: number;
  payment_method: {
    id: number;
    name: string;
  };
}

interface Sale {
  id: number;
  order_number: string;
  customer_name?: string;
  subtotal: number;
  discount: number;
  total: number;
  created_at: string;
  items: SaleItem[];
  payments: SalePayment[];
}

interface Props {
  navigation: any;
}

export default function HistoryScreen({ navigation }: Props) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [printingId, setPrintingId] = useState<number | null>(null);

  const { logout } = useAuthStore();
  const { selectedBranchName, cashRegister, closeCashRegister } = useSessionStore();

  useEffect(() => {
    fetchSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cashRegister?.id]);

  const fetchSales = async () => {
    try {
      if (!cashRegister?.id) {
        navigation.navigate('CashRegister');
        return;
      }

      const response = await api.get(`/cash-registers/${cashRegister.id}/sales`);

      const salesData = Array.isArray(response.data?.sales)
        ? response.data.sales
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];

      setSales(salesData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar histórico de vendas');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    closeCashRegister();
    logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const handleBack = () => {
    navigation.navigate('Sales');
  };

  const handleReprint = async (sale: Sale) => {
    setPrintingId(sale.id);

    try {
      await ThermalPrinter.printReceipt(sale);

      Alert.alert('Sucesso', `Comprovante #${sale.order_number} enviado para impressão!`);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Erro ao reimprimir');
    } finally {
      setPrintingId(null);
    }
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalSales = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Carregando histórico...</Text>
      </View>
    );
  }

  const renderSaleItem = ({ item: sale }: { item: Sale }) => (
    <View style={styles.saleCard}>
      {/* Sale Header */}
      <View style={styles.saleHeader}>
        <View>
          <Text style={styles.orderNumber}>Pedido #{sale.order_number}</Text>
          {sale.customer_name && (
            <Text style={styles.customerName}>{sale.customer_name}</Text>
          )}
          <Text style={styles.dateText}>
            {sale.created_at ? formatDateTime(sale.created_at) : '-'}
          </Text>
        </View>
        <Text style={styles.saleTotal}>{formatCurrency(sale.total || 0)}</Text>
      </View>

      {/* Items */}
      <View style={styles.itemsContainer}>
        {sale.items.map((item) => (
          <View key={item.id}>
            <View style={styles.itemRow}>
              <Text style={styles.itemName}>
                {item.quantity}x {item.product?.name || 'Produto'}
              </Text>
              <Text style={styles.itemTotal}>{formatCurrency(item.total || 0)}</Text>
            </View>
            {item.notes && (
              <Text style={styles.itemNotes}>📝 {item.notes}</Text>
            )}
          </View>
        ))}
      </View>

      {/* Discount */}
      {(sale.discount || 0) > 0 && (
        <View style={styles.discountRow}>
          <Text style={styles.discountLabel}>Desconto</Text>
          <Text style={styles.discountValue}>- {formatCurrency(sale.discount || 0)}</Text>
        </View>
      )}

      {/* Payments */}
      <View style={styles.paymentsContainer}>
        {(sale.payments || []).map((payment) => (
          <View key={payment.id} style={styles.paymentRow}>
            <Text style={styles.paymentMethod}>{payment.payment_method.name}</Text>
            <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
          </View>
        ))}
      </View>

      {/* Reprint Button */}
      <TouchableOpacity
        style={[styles.reprintButton, printingId === sale.id && styles.reprintButtonDisabled]}
        onPress={() => handleReprint(sale)}
        disabled={printingId === sale.id}
        activeOpacity={0.8}
      >
        {printingId === sale.id ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Text style={styles.reprintIcon}>🖨️</Text>
            <Text style={styles.reprintButtonText}>Reimprimir Comprovante</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>← Vendas</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Histórico</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, styles.headerButtonTextDanger]}>Sair</Text>
        </TouchableOpacity>
      </View>

      {/* Branch Name */}
      <View style={styles.branchBar}>
        <Text style={styles.branchName}>{selectedBranchName}</Text>
      </View>

      {/* Content */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : sales.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>Nenhuma venda registrada neste caixa</Text>
        </View>
      ) : (
        <>
          {/* Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total de Vendas</Text>
              <Text style={styles.summaryValue}>{sales.length}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Valor Total</Text>
              <Text style={[styles.summaryValue, styles.summaryValueSuccess]}>
                {formatCurrency(totalSales)}
              </Text>
            </View>
          </View>

          {/* Sales List */}
          <FlatList
            data={sales}
            renderItem={renderSaleItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#6b7280',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerButton: {
    padding: 8,
  },
  headerButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  headerButtonTextDanger: {
    color: '#ef4444',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  branchBar: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  branchName: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563eb',
  },
  summaryValueSuccess: {
    color: '#22c55e',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#bfdbfe',
    marginHorizontal: 16,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  saleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  customerName: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  dateText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  saleTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#22c55e',
  },
  itemsContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  itemNotes: {
    fontSize: 12,
    color: '#ea580c',
    fontStyle: 'italic',
    paddingLeft: 12,
    marginTop: -4,
    marginBottom: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#fdba74',
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  discountLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#dc2626',
  },
  discountValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#dc2626',
  },
  paymentsContainer: {
    marginBottom: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  paymentMethod: {
    fontSize: 14,
    color: '#6b7280',
  },
  paymentAmount: {
    fontSize: 14,
    color: '#6b7280',
  },
  reprintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  reprintButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  reprintIcon: {
    fontSize: 16,
  },
  reprintButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
