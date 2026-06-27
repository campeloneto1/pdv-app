import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useSessionStore } from '../store/sessionStore';
import { StonePayment } from '../services/payment/stone';
import { ThermalPrinter } from '../services/printer/thermalPrinter';
import api from '../api/api';

type PaymentType = 'credit' | 'debit' | 'pix' | 'cash';

interface Props {
  navigation: any;
}

export default function PaymentScreen({ navigation }: Props) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentType | null>(null);
  const [processing, setProcessing] = useState(false);
  const [installments, setInstallments] = useState(1);

  const { items, clearCart } = useCartStore();
  const { selectedBranch } = useAuthStore();
  const { cashRegister } = useSessionStore();

  const total = items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );

  const paymentMethods = [
    { id: 'credit' as PaymentType, label: 'Crédito', icon: '💳', color: '#8b5cf6' },
    { id: 'debit' as PaymentType, label: 'Débito', icon: '💳', color: '#06b6d4' },
    { id: 'pix' as PaymentType, label: 'PIX', icon: '📱', color: '#22c55e' },
    { id: 'cash' as PaymentType, label: 'Dinheiro', icon: '💵', color: '#f59e0b' },
  ];

  const handlePayment = async () => {
    if (!selectedMethod) {
      Alert.alert('Atenção', 'Selecione uma forma de pagamento');
      return;
    }

    setProcessing(true);

    try {
      let paymentResult;
      const amountInCents = Math.round(total * 100);

      // Processar pagamento pela máquina
      switch (selectedMethod) {
        case 'credit':
          paymentResult = await StonePayment.payCredit(amountInCents, installments);
          break;
        case 'debit':
          paymentResult = await StonePayment.payDebit(amountInCents);
          break;
        case 'pix':
          paymentResult = await StonePayment.payPix(amountInCents);
          break;
        case 'cash':
          paymentResult = { success: true, transactionId: `CASH_${Date.now()}` };
          break;
      }

      if (!paymentResult?.success) {
        Alert.alert('Erro', paymentResult?.message || 'Pagamento não aprovado');
        return;
      }

      // Registrar venda no backend
      const saleData = {
        branch_id: selectedBranch?.id,
        cash_register_id: cashRegister?.id,
        items: items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        payments: [
          {
            payment_method: selectedMethod,
            amount: total,
            transaction_id: paymentResult.transactionId,
          },
        ],
        total,
      };

      const response = await api.post('/sales', saleData);
      const sale = response.data.sale || response.data.data;

      // Imprimir cupom
      try {
        await ThermalPrinter.printReceipt(sale);
      } catch (printError) {
        console.warn('Erro ao imprimir:', printError);
      }

      // Limpar carrinho
      clearCart();

      // Mostrar sucesso
      Alert.alert(
        '✅ Venda Realizada!',
        `Venda #${sale.sale_number} finalizada com sucesso.`,
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

      <ScrollView contentContainerStyle={styles.content}>
        {/* Total */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total a Pagar</Text>
          <Text style={styles.totalValue}>
            R$ {total.toFixed(2).replace('.', ',')}
          </Text>
        </View>

        {/* Payment Methods */}
        <Text style={styles.sectionTitle}>Forma de Pagamento</Text>
        <View style={styles.methodsGrid}>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodCard,
                selectedMethod === method.id && styles.methodCardSelected,
                selectedMethod === method.id && { borderColor: method.color },
              ]}
              onPress={() => setSelectedMethod(method.id)}
              disabled={processing}
            >
              <Text style={styles.methodIcon}>{method.icon}</Text>
              <Text
                style={[
                  styles.methodLabel,
                  selectedMethod === method.id && { color: method.color },
                ]}
              >
                {method.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Installments (only for credit) */}
        {selectedMethod === 'credit' && (
          <View style={styles.installmentsContainer}>
            <Text style={styles.sectionTitle}>Parcelas</Text>
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
                    installments === num && styles.installmentButtonActive,
                  ]}
                  onPress={() => setInstallments(num)}
                >
                  <Text
                    style={[
                      styles.installmentText,
                      installments === num && styles.installmentTextActive,
                    ]}
                  >
                    {num}x
                  </Text>
                  <Text
                    style={[
                      styles.installmentValue,
                      installments === num && styles.installmentValueActive,
                    ]}
                  >
                    R$ {(total / num).toFixed(2).replace('.', ',')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            (!selectedMethod || processing) && styles.confirmButtonDisabled,
          ]}
          onPress={handlePayment}
          disabled={!selectedMethod || processing}
          activeOpacity={0.8}
        >
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>
              {selectedMethod ? 'Confirmar Pagamento' : 'Selecione uma forma'}
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
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  totalContainer: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  totalLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  totalValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  methodCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  methodCardSelected: {
    backgroundColor: '#eff6ff',
  },
  methodIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  methodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  installmentsContainer: {
    marginBottom: 24,
  },
  installmentsList: {
    paddingRight: 16,
  },
  installmentButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  installmentButtonActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  installmentText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  installmentTextActive: {
    color: '#2563eb',
  },
  installmentValue: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  installmentValueActive: {
    color: '#2563eb',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  confirmButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
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
