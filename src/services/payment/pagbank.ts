/**
 * PagBank (PlugPag SDK) Integration for React Native
 *
 * Este módulo integra com o SDK nativo da PagBank (PlugPag) para:
 * - Pagamento por crédito
 * - Pagamento por débito
 * - Pagamento por PIX
 * - Cancelamento de transações
 *
 * IMPORTANTE: Para funcionar, você precisa:
 * 1. Adicionar o SDK PlugPag no android/app/build.gradle
 * 2. Criar o módulo nativo em android/app/src/main/java/.../PlugPagModule.kt
 * 3. Registrar o módulo no MainApplication.kt
 */

import { NativeModules, Platform } from 'react-native';
import { PaymentResult } from '../../types';

// O módulo nativo será criado depois
const { PlugPagModule } = NativeModules;

// Verifica se está rodando em uma máquina POS
const isPagBankDevice = Platform.OS === 'android' && PlugPagModule != null;

export const PagBankPayment = {
  /**
   * Verifica se o SDK PlugPag está disponível
   */
  isAvailable(): boolean {
    return isPagBankDevice;
  },

  /**
   * Inicializa o SDK PlugPag
   * Deve ser chamado no início do app
   */
  async initialize(): Promise<boolean> {
    if (!isPagBankDevice) {
      console.log('⚠️ PlugPag SDK não disponível (não é máquina POS)');
      return false;
    }

    try {
      const result = await PlugPagModule.initialize();
      console.log('✅ PlugPag SDK inicializado');
      return result;
    } catch (error) {
      console.error('❌ Erro ao inicializar PlugPag SDK:', error);
      return false;
    }
  },

  /**
   * Pagamento com cartão de crédito
   * @param amountInCents - Valor em centavos (ex: 1000 = R$ 10,00)
   * @param installments - Número de parcelas (1-12)
   */
  async payCredit(
    amountInCents: number,
    installments: number = 1
  ): Promise<PaymentResult> {
    if (!isPagBankDevice) {
      // Simular em desenvolvimento
      return simulatePayment('credit', amountInCents);
    }

    try {
      const result = await PlugPagModule.doPaymentCredit(amountInCents, installments);
      return {
        success: true,
        transactionId: result.transactionId,
        authorizationCode: result.authorizationCode,
        cardBrand: result.cardBrand,
        cardLastDigits: result.cardLastDigits,
        receipt: result.receipt,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erro no pagamento',
      };
    }
  },

  /**
   * Pagamento com cartão de débito
   * @param amountInCents - Valor em centavos
   */
  async payDebit(amountInCents: number): Promise<PaymentResult> {
    if (!isPagBankDevice) {
      return simulatePayment('debit', amountInCents);
    }

    try {
      const result = await PlugPagModule.doPaymentDebit(amountInCents);
      return {
        success: true,
        transactionId: result.transactionId,
        authorizationCode: result.authorizationCode,
        cardBrand: result.cardBrand,
        cardLastDigits: result.cardLastDigits,
        receipt: result.receipt,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erro no pagamento',
      };
    }
  },

  /**
   * Pagamento via PIX
   * @param amountInCents - Valor em centavos
   */
  async payPix(amountInCents: number): Promise<PaymentResult> {
    if (!isPagBankDevice) {
      return simulatePayment('pix', amountInCents);
    }

    try {
      const result = await PlugPagModule.doPaymentPix(amountInCents);
      return {
        success: true,
        transactionId: result.transactionId,
        receipt: result.receipt,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erro no pagamento PIX',
      };
    }
  },

  /**
   * Cancelar transação
   * @param transactionId - ID da transação a cancelar
   */
  async cancel(transactionId: string): Promise<PaymentResult> {
    if (!isPagBankDevice) {
      console.log('Cancelamento simulado:', transactionId);
      return { success: true };
    }

    try {
      await PlugPagModule.cancelTransaction(transactionId);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erro ao cancelar',
      };
    }
  },

  /**
   * Reimprimir último comprovante
   */
  async reprintLastReceipt(): Promise<boolean> {
    if (!isPagBankDevice) {
      console.log('Reimpressão simulada');
      return true;
    }

    try {
      await PlugPagModule.reprintLastReceipt();
      return true;
    } catch (error) {
      console.error('Erro ao reimprimir:', error);
      return false;
    }
  },
};

/**
 * Simula pagamento para desenvolvimento
 * Remove isso em produção
 */
function simulatePayment(
  type: string,
  amountInCents: number
): Promise<PaymentResult> {
  return new Promise((resolve) => {
    console.log(`💳 Simulando pagamento ${type}: R$ ${(amountInCents / 100).toFixed(2)}`);

    // Simular delay de processamento
    setTimeout(() => {
      resolve({
        success: true,
        transactionId: `SIM_${Date.now()}`,
        authorizationCode: '123456',
        cardBrand: 'VISA',
        cardLastDigits: '1234',
        message: 'Pagamento simulado (desenvolvimento)',
      });
    }, 2000);
  });
}

export default PagBankPayment;
