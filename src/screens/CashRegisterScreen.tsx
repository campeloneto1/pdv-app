import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { useSessionStore } from '../store/sessionStore';
import { useCartStore } from '../store/cartStore';
import api from '../api/api';

interface Props {
  navigation: any;
}

export default function CashRegisterScreen({ navigation }: Props) {
  const [openingBalance, setOpeningBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasOpenCashRegister, setHasOpenCashRegister] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [totalSales, setTotalSales] = useState(0);
  const [closingBalance, setClosingBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [closeLoading, setCloseLoading] = useState(false);

  const { logout } = useAuthStore();
  const {
    selectedBranchId,
    selectedBranchName,
    cashRegister,
    setCashRegister,
    closeCashRegister,
    setFeatureFlags,
  } = useSessionStore();
  const { items, clearCart } = useCartStore();

  // Check if there's already an open cash register (only when this screen gains focus)
  useFocusEffect(
    useCallback(() => {
      // If there are cart items and open cash register, go to sales
      if (items.length > 0 && cashRegister?.id) {
        navigation.navigate('Sales');
        return;
      }

      checkOpenCashRegister();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedBranchId])
  );

  const checkOpenCashRegister = async () => {
    try {
      if (!selectedBranchId) {
        navigation.navigate('BranchSelection');
        return;
      }

      const featureFlags = await loadFeatureFlags(selectedBranchId);

      const response = await api.get(
        `/cash-registers/branch/${selectedBranchId}/current`
      );

      const responseData = response.data;
      const cashRegisterCandidate =
        responseData?.cash_register ||
        responseData?.data?.cash_register ||
        responseData?.current_cash_register ||
        responseData?.cashRegister ||
        responseData?.data;

      const existingCashRegister =
        cashRegisterCandidate && !Array.isArray(cashRegisterCandidate)
          ? cashRegisterCandidate
          : null;

      if (existingCashRegister?.id) {
        setHasOpenCashRegister(true);
        setCashRegister({
          id: existingCashRegister.id,
          branch_id: existingCashRegister.branch?.id ?? existingCashRegister.branch_id,
          user_id: existingCashRegister.user?.id,
          opening_balance: existingCashRegister.opening_balance || 0,
          status: 'open',
          opened_at: existingCashRegister.opened_at,
        });
      } else if (featureFlags.auto_cash_register) {
        // Filial com abertura automática de caixa: abre silenciosamente e segue pra venda
        await autoOpenCashRegister(selectedBranchId);
        return;
      } else {
        setHasOpenCashRegister(false);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) {
        setError('Você não tem acesso a essa empresa.');
      }
      setHasOpenCashRegister(false);
    } finally {
      setCheckingStatus(false);
    }
  };

  const loadFeatureFlags = async (branchId: number): Promise<Record<string, boolean>> => {
    try {
      const response = await api.get(`/branches/${branchId}/features`);
      const flags = response.data?.feature_flags || {};
      setFeatureFlags(flags);
      return flags;
    } catch {
      return {};
    }
  };

  const autoOpenCashRegister = async (branchId: number) => {
    try {
      const response = await api.post('/cash-registers/open', {
        branch_id: branchId,
        opening_balance: 0,
      });

      const newCashRegister = response.data?.cash_register;
      if (newCashRegister) {
        setCashRegister({
          id: newCashRegister.id,
          branch_id: newCashRegister.branch?.id ?? branchId,
          user_id: newCashRegister.user?.id,
          opening_balance: 0,
          status: 'open',
          opened_at: newCashRegister.opened_at,
        });
      }
      navigation.navigate('Sales');
    } catch {
      // Se a abertura automática falhar, cai no fluxo manual normalmente
      setHasOpenCashRegister(false);
      setCheckingStatus(false);
    }
  };

  const handleOpenCashRegister = async () => {
    setError('');
    setLoading(true);

    try {
      const balance = parseFloat(openingBalance.replace(',', '.')) || 0;

      const response = await api.post('/cash-registers/open', {
        branch_id: selectedBranchId,
        opening_balance: balance,
      });

      const newCashRegister = response.data?.cash_register;
      if (newCashRegister) {
        setCashRegister({
          id: newCashRegister.id,
          branch_id: newCashRegister.branch?.id ?? selectedBranchId!,
          user_id: newCashRegister.user?.id,
          opening_balance: balance,
          status: 'open',
          opened_at: newCashRegister.opened_at,
        });
        navigation.navigate('Sales');
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('Você não tem acesso a essa empresa.');
      } else {
        setError(
          err.response?.data?.message || 'Erro ao abrir caixa. Tente novamente.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContinueWithOpenCashRegister = () => {
    navigation.navigate('Sales');
  };

  const handleLogout = () => {
    closeCashRegister();
    clearCart();
    logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const handleBackBranch = () => {
    closeCashRegister();
    clearCart();
    navigation.navigate('BranchSelection');
  };

  const handleCloseCashRegister = async () => {
    if (!cashRegister?.id) return;

    try {
      const response = await api.get(
        `/cash-registers/${cashRegister.id}/sales`
      );

      const salesData = Array.isArray(response.data?.sales)
        ? response.data.sales
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];

      const total = salesData.reduce(
        (sum: number, sale: any) => sum + (sale.total || 0),
        0
      );
      setTotalSales(total);
      setShowCloseModal(true);
    } catch {
      Alert.alert('Erro', 'Erro ao carregar informações de vendas');
    }
  };

  const handleSubmitCloseCash = async () => {
    if (!cashRegister?.id) return;

    setCloseLoading(true);

    try {
      const balance = parseFloat(closingBalance.replace(',', '.')) || 0;

      await api.post(`/cash-registers/${cashRegister.id}/close`, {
        closing_balance: balance,
        notes: notes,
      });

      closeCashRegister();
      clearCart();
      setHasOpenCashRegister(false);
      setShowCloseModal(false);
      setClosingBalance('');
      setNotes('');

      Alert.alert('Sucesso', 'Caixa fechado com sucesso!');
    } catch (err: any) {
      Alert.alert(
        'Erro',
        err.response?.data?.message || 'Erro ao fechar caixa. Tente novamente.'
      );
    } finally {
      setCloseLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Verificando caixa...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackBranch} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>← Filiais</Text>
        </TouchableOpacity>
        <Text style={styles.branchName}>{selectedBranchName}</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, styles.headerButtonTextDanger]}>Sair</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.divider} />

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content}>
        {hasOpenCashRegister ? (
          <View style={styles.centerContent}>
            {/* Cash Register Open */}
            <View style={[styles.iconContainer, styles.iconContainerSuccess]}>
              <Text style={styles.checkIcon}>✓</Text>
            </View>
            <Text style={styles.title}>Caixa já está aberto</Text>
            <Text style={styles.subtitle}>Você pode começar a fazer vendas</Text>

            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Saldo de Abertura</Text>
              <Text style={styles.infoValue}>
                R$ {(cashRegister?.opening_balance || 0).toFixed(2).replace('.', ',')}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleContinueWithOpenCashRegister}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Começar a Vender</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleCloseCashRegister}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Fechar Caixa</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.centerContent}>
            {/* Open Cash Register Form */}
            <View style={styles.iconContainer}>
              <Text style={styles.cashIcon}>💰</Text>
            </View>
            <Text style={styles.title}>Abrir Caixa</Text>
            <Text style={styles.subtitle}>Defina o saldo inicial do seu caixa</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Saldo Inicial (R$)</Text>
              <TextInput
                style={styles.input}
                value={openingBalance}
                onChangeText={setOpeningBalance}
                placeholder="0,00"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
              />
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleOpenCashRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Abrir Caixa</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Close Cash Register Modal */}
      <Modal
        visible={showCloseModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCloseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Fechar Caixa</Text>

            {/* Summary */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Saldo de Abertura</Text>
                <Text style={styles.summaryValue}>
                  R$ {(cashRegister?.opening_balance || 0).toFixed(2).replace('.', ',')}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total de Vendas</Text>
                <Text style={[styles.summaryValue, styles.summaryValueSuccess]}>
                  R$ {totalSales.toFixed(2).replace('.', ',')}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Text style={styles.summaryTotalLabel}>Saldo Esperado</Text>
                <Text style={styles.summaryTotalValue}>
                  R$ {((cashRegister?.opening_balance || 0) + totalSales).toFixed(2).replace('.', ',')}
                </Text>
              </View>
            </View>

            {/* Closing Balance Input */}
            <View style={styles.modalInputContainer}>
              <Text style={styles.modalInputLabel}>Saldo de Fechamento (R$)</Text>
              <TextInput
                style={styles.modalInput}
                value={closingBalance}
                onChangeText={setClosingBalance}
                placeholder="0,00"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
              />
            </View>

            {/* Notes Input */}
            <View style={styles.modalInputContainer}>
              <Text style={styles.modalInputLabel}>Observações (opcional)</Text>
              <TextInput
                style={[styles.modalInput, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Adicione observações..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Modal Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowCloseModal(false);
                  setClosingBalance('');
                  setNotes('');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, closeLoading && styles.buttonDisabled]}
                onPress={handleSubmitCloseCash}
                disabled={closeLoading}
                activeOpacity={0.8}
              >
                {closeLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  branchName: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  centerContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainerSuccess: {
    backgroundColor: '#f0fdf4',
  },
  checkIcon: {
    fontSize: 40,
    color: '#22c55e',
  },
  cashIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  infoLabel: {
    color: '#6b7280',
    fontSize: 14,
    marginBottom: 4,
  },
  infoValue: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '700',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  inputLabel: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    color: '#6b7280',
    fontSize: 14,
  },
  summaryValue: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryValueSuccess: {
    color: '#22c55e',
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
    paddingTop: 16,
  },
  summaryTotalLabel: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  summaryTotalValue: {
    color: '#2563eb',
    fontSize: 20,
    fontWeight: '700',
  },
  modalInputContainer: {
    marginBottom: 16,
  },
  modalInputLabel: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#111827',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
