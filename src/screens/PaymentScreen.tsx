import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useCartStore } from '../store/cartStore';
import { useSessionStore } from '../store/sessionStore';
import { StonePayment } from '../services/payment/stone';
import { ThermalPrinter } from '../services/printer/thermalPrinter';
import api, { extractArrayData } from '../api/api';
import { PaymentMethod } from '../types';
import { enqueueSale } from '../services/offline/offlineQueue';

type PaymentKind = 'credit' | 'debit' | 'pix' | 'cash';

interface PaymentEntry {
  key: string;
  kind: PaymentKind;
  methodId: number;
  methodName: string;
  amountText: string;
  installments: number;
}

interface Props {
  navigation: any;
}

const QUICK_METHODS: { kind: PaymentKind; label: string; icon: string; color: string }[] = [
  { kind: 'credit', label: 'Crédito', icon: '💳', color: '#8b5cf6' },
  { kind: 'debit', label: 'Débito', icon: '💳', color: '#06b6d4' },
  { kind: 'pix', label: 'PIX', icon: '📱', color: '#22c55e' },
  { kind: 'cash', label: 'Dinheiro', icon: '💵', color: '#f59e0b' },
];

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function inferKind(name: string): PaymentKind | null {
  const n = normalize(name);
  if (n.includes('dinheiro') || n.includes('cash')) return 'cash';
  if (n.includes('credito') || n.includes('credit')) return 'credit';
  if (n.includes('debito') || n.includes('debit')) return 'debit';
  if (n.includes('pix')) return 'pix';
  return null;
}

export default function PaymentScreen({ navigation }: Props) {
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [processing, setProcessing] = useState(false);
  const [discount, setDiscount] = useState('');

  const { items, clearCart } = useCartStore();
  const { selectedBranchId } = useSessionStore();

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const response = await api.get('/payment-methods');
      const data = extractArrayData(response).filter((m: PaymentMethod) => m.active);
      setMethods(data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar as formas de pagamento');
    } finally {
      setLoadingMethods(false);
    }
  };

  const methodByKind = useMemo(() => {
    const map: Partial<Record<PaymentKind, PaymentMethod>> = {};
    methods.forEach((method) => {
      const kind = inferKind(method.name);
      if (kind && !map[kind]) {
        map[kind] = method;
      }
    });
    return map;
  }, [methods]);

  const subtotal = items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );
  const itemsDiscountTotal = items.reduce((sum, item) => sum + (item.discount || 0), 0);
  const discountValue = parseFloat(discount.replace(',', '.')) || 0;
  const total = Math.max(0, subtotal - itemsDiscountTotal - discountValue);

  const totalInformed = payments.reduce(
    (sum, p) => sum + (parseFloat(p.amountText.replace(',', '.')) || 0),
    0
  );
  const remaining = total - totalInformed;

  const handleAddMethod = (kind: PaymentKind) => {
    const method = methodByKind[kind];
    if (!method) {
      Alert.alert(
        'Forma indisponível',
        'Essa forma de pagamento não está cadastrada para a empresa. Cadastre no sistema web antes de usar.'
      );
      return;
    }

    const amount = Math.max(0, remaining);
    setPayments((prev) => [
      ...prev,
      {
        key: `${kind}_${Date.now()}`,
        kind,
        methodId: method.id,
        methodName: method.name,
        amountText: amount > 0 ? amount.toFixed(2).replace('.', ',') : '',
        installments: 1,
      },
    ]);
  };

  const handleRemovePayment = (key: string) => {
    setPayments((prev) => prev.filter((p) => p.key !== key));
  };

  const handleChangeAmount = (key: string, text: string) => {
    setPayments((prev) =>
      prev.map((p) => (p.key === key ? { ...p, amountText: text } : p))
    );
  };

  const handleChangeInstallments = (key: string, installments: number) => {
    setPayments((prev) =>
      prev.map((p) => (p.key === key ? { ...p, installments } : p))
    );
  };

  const canConfirm =
    !processing &&
    !loadingMethods &&
    payments.length > 0 &&
    payments.every((p) => (parseFloat(p.amountText.replace(',', '.')) || 0) > 0) &&
    remaining <= 0.009;

  const handlePayment = async () => {
    if (!canConfirm) return;

    setProcessing(true);

    const succeeded: { transactionId: string }[] = [];

    try {
      for (const entry of payments) {
        const amount = parseFloat(entry.amountText.replace(',', '.')) || 0;
        const amountInCents = Math.round(amount * 100);
        let result;

        switch (entry.kind) {
          case 'credit':
            result = await StonePayment.payCredit(amountInCents, entry.installments);
            break;
          case 'debit':
            result = await StonePayment.payDebit(amountInCents);
            break;
          case 'pix':
            result = await StonePayment.payPix(amountInCents);
            break;
          case 'cash':
            result = { success: true, transactionId: `CASH_${Date.now()}` };
            break;
        }

        if (!result?.success) {
          // Desfaz pagamentos com cartão já aprovados antes de abortar
          for (const done of succeeded) {
            await StonePayment.cancel(done.transactionId);
          }
          Alert.alert(
            'Erro',
            `${result?.message || 'Pagamento não aprovado'} (${entry.methodName})`
          );
          setProcessing(false);
          return;
        }

        if (result.transactionId) {
          succeeded.push({ transactionId: result.transactionId });
        }
      }

      const saleData = {
        items: items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount || 0,
          notes: item.notes || '',
        })),
        payments: payments.map((p) => ({
          payment_method_id: p.methodId,
          amount: parseFloat(p.amountText.replace(',', '.')) || 0,
        })),
        discount: discountValue,
      };

      let sale: any = null;
      let queuedOffline = false;

      try {
        const response = await api.post(`/branches/${selectedBranchId}/sales`, saleData);
        sale = response.data.sale || response.data.data;
      } catch (saleError: any) {
        if (!saleError.response && selectedBranchId) {
          // Sem resposta do servidor = provável falta de conexão.
          // O pagamento (cartão/pix) já foi aprovado na maquininha, então
          // a venda é guardada localmente e sincronizada quando a rede voltar.
          await enqueueSale(selectedBranchId, saleData);
          queuedOffline = true;
        } else {
          throw saleError;
        }
      }

      try {
        await ThermalPrinter.printReceipt(
          sale || {
            order_number: 'PENDENTE',
            subtotal,
            discount: itemsDiscountTotal + discountValue,
            total,
            items: items.map((i) => ({
              product_name: i.product_name,
              quantity: i.quantity,
              unit_price: i.unit_price,
              total: i.unit_price * i.quantity - (i.discount || 0),
            })),
            payments: payments.map((p) => ({
              payment_method_name: p.methodName,
              amount: parseFloat(p.amountText.replace(',', '.')) || 0,
            })),
            created_at: new Date().toISOString(),
          }
        );
      } catch (printError) {
        console.warn('Erro ao imprimir:', printError);
      }

      clearCart();

      Alert.alert(
        queuedOffline ? '📴 Venda Salva Offline' : '✅ Venda Realizada!',
        queuedOffline
          ? 'Sem conexão com o servidor. A venda foi salva no aparelho e será enviada automaticamente quando a internet voltar.'
          : `Venda #${sale.sale_number} finalizada com sucesso.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Sales'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Erro no pagamento:', error);
      Alert.alert(
        'Erro',
        error.response?.data?.message || 'Erro ao processar pagamento'
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pagamento</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Total + Desconto */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>
            {itemsDiscountTotal + discountValue > 0
              ? `Subtotal: R$ ${subtotal.toFixed(2).replace('.', ',')}  •  Total a Pagar`
              : 'Total a Pagar'}
          </Text>
          <Text style={styles.totalValue}>
            R$ {total.toFixed(2).replace('.', ',')}
          </Text>
          <View style={styles.discountRow}>
            <Text style={styles.discountRowLabel}>Desconto</Text>
            <TextInput
              style={styles.discountInput}
              placeholder="0,00"
              keyboardType="decimal-pad"
              value={discount}
              onChangeText={setDiscount}
              editable={!processing}
              placeholderTextColor="rgba(255,255,255,0.5)"
            />
          </View>
        </View>

        {/* Quick methods */}
        <Text style={styles.sectionTitle}>Adicionar Forma de Pagamento</Text>
        {loadingMethods ? (
          <ActivityIndicator color="#2563eb" style={{ marginBottom: 16 }} />
        ) : (
          <View style={styles.methodsGrid}>
            {QUICK_METHODS.map((method) => {
              const available = !!methodByKind[method.kind];
              return (
                <TouchableOpacity
                  key={method.kind}
                  style={[styles.methodCard, !available && styles.methodCardDisabled]}
                  onPress={() => handleAddMethod(method.kind)}
                  disabled={processing}
                >
                  <Text style={styles.methodIcon}>{method.icon}</Text>
                  <Text style={styles.methodLabel} numberOfLines={1}>
                    {method.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Payments list */}
        {payments.map((entry) => (
          <View key={entry.key} style={styles.paymentEntryCard}>
            <View style={styles.paymentEntryHeader}>
              <Text style={styles.paymentEntryName}>{entry.methodName}</Text>
              <TouchableOpacity onPress={() => handleRemovePayment(entry.key)}>
                <Text style={styles.removeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.entryAmountInput}
              placeholder="0,00"
              keyboardType="decimal-pad"
              value={entry.amountText}
              onChangeText={(text) => handleChangeAmount(entry.key, text)}
              editable={!processing}
            />

            {entry.kind === 'credit' && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.installmentsList}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.installmentButton,
                      entry.installments === num && styles.installmentButtonActive,
                    ]}
                    onPress={() => handleChangeInstallments(entry.key, num)}
                  >
                    <Text
                      style={[
                        styles.installmentText,
                        entry.installments === num && styles.installmentTextActive,
                      ]}
                    >
                      {num}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        ))}

        {/* Summary */}
        {payments.length > 0 && (
          <View style={styles.changeRow}>
            <Text style={styles.changeLabel}>
              {remaining > 0.009 ? 'Falta Pagar' : 'Troco'}
            </Text>
            <Text
              style={[
                styles.changeValue,
                remaining > 0.009 && styles.changeValueNegative,
              ]}
            >
              R$ {Math.abs(remaining).toFixed(2).replace('.', ',')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, !canConfirm && styles.confirmButtonDisabled]}
          onPress={handlePayment}
          disabled={!canConfirm}
          activeOpacity={0.8}
        >
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>
              {payments.length === 0 ? 'Adicione uma forma' : 'Confirmar Pagamento'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
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
  backArrow: {
    fontSize: 28,
    color: '#374151',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerRight: {
    width: 28,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 16,
  },
  totalContainer: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 30,
    fontWeight: '700',
    color: '#fff',
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  discountRowLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  methodsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  methodCard: {
    width: '23.5%',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  methodCardDisabled: {
    opacity: 0.4,
  },
  methodIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  methodLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  paymentEntryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  paymentEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentEntryName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  removeButton: {
    fontSize: 16,
    color: '#9ca3af',
    padding: 4,
  },
  entryAmountInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  installmentsList: {
    paddingTop: 10,
    paddingRight: 16,
  },
  installmentButton: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  installmentButtonActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  installmentText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  installmentTextActive: {
    color: '#2563eb',
  },
  discountInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    minWidth: 90,
    textAlign: 'right',
  },
  changeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
  },
  changeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  changeValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#22c55e',
  },
  changeValueNegative: {
    color: '#ef4444',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  confirmButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
