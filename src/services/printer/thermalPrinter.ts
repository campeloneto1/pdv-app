/**
 * Thermal Printer Service for POS Machines
 *
 * Este módulo integra com a impressora térmica da máquina POS.
 * Funciona com Moderninha (PagBank) e outras máquinas Android.
 */

import { NativeModules, Platform } from 'react-native';

const { PrinterModule } = NativeModules;

interface ReceiptItem {
  product?: { name: string } | null;
  product_name?: string;
  quantity: number;
  unit_price: number;
  total: number;
  notes?: string;
}

interface ReceiptPayment {
  payment_method?: { name: string } | null;
  payment_method_name?: string;
  amount: number;
}

interface ReceiptSale {
  order_number: string;
  customer_name?: string | null;
  subtotal: number;
  discount: number;
  total: number;
  items: ReceiptItem[];
  payments: ReceiptPayment[];
  created_at: string;
}

const isPrinterAvailable = Platform.OS === 'android' && PrinterModule !== undefined;

export const ThermalPrinter = {
  /**
   * Verifica se a impressora está disponível
   */
  isAvailable(): boolean {
    return isPrinterAvailable;
  },

  /**
   * Imprime texto simples
   */
  async print(text: string): Promise<boolean> {
    if (!isPrinterAvailable) {
      console.log('🖨️ Impressão simulada:\n', text);
      return true;
    }

    try {
      await PrinterModule.print(text);
      return true;
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      return false;
    }
  },

  /**
   * Imprime cupom de venda formatado
   */
  async printReceipt(sale: ReceiptSale): Promise<boolean> {
    const receipt = formatReceipt(sale);
    return this.print(receipt);
  },

  /**
   * Avança papel (feed)
   */
  async feedPaper(lines: number = 3): Promise<boolean> {
    if (!isPrinterAvailable) {
      return true;
    }

    try {
      await PrinterModule.feedPaper(lines);
      return true;
    } catch (error) {
      console.error('Erro ao avançar papel:', error);
      return false;
    }
  },

  /**
   * Corta o papel (se disponível)
   */
  async cutPaper(): Promise<boolean> {
    if (!isPrinterAvailable) {
      return true;
    }

    try {
      await PrinterModule.cutPaper();
      return true;
    } catch (error) {
      console.error('Erro ao cortar papel:', error);
      return false;
    }
  },
};

/**
 * Formata o cupom de venda para impressão térmica
 * Largura padrão: 32 ou 48 caracteres dependendo da máquina
 */
function formatReceipt(sale: ReceiptSale): string {
  const LINE_WIDTH = 32;
  const SEPARATOR = '='.repeat(LINE_WIDTH);
  const THIN_SEPARATOR = '-'.repeat(LINE_WIDTH);

  const lines: string[] = [];

  // Header
  lines.push(centerText('CARIRI PDV', LINE_WIDTH));
  lines.push(centerText('Sistema de Vendas', LINE_WIDTH));
  lines.push(SEPARATOR);

  // Info da venda
  lines.push(`Venda #${sale.order_number}`);
  lines.push(`Data: ${formatDate(sale.created_at)}`);
  if (sale.customer_name) {
    lines.push(`Cliente: ${sale.customer_name}`);
  }
  lines.push(THIN_SEPARATOR);

  // Itens
  lines.push(centerText('ITENS', LINE_WIDTH));
  lines.push(THIN_SEPARATOR);

  sale.items.forEach((item) => {
    // Nome do produto (pode quebrar linha)
    const productName = truncateText(
      item.product?.name || item.product_name || 'Produto',
      LINE_WIDTH - 10
    );
    lines.push(productName);

    // Quantidade x Preço = Total
    const qty = `${item.quantity}x`;
    const price = formatCurrency(item.unit_price);
    const total = formatCurrency(item.total);
    const itemLine = `  ${qty} ${price}`.padEnd(LINE_WIDTH - total.length) + total;
    lines.push(itemLine);

    if (item.notes) {
      lines.push(`  Obs: ${item.notes}`);
    }
  });

  lines.push(THIN_SEPARATOR);

  // Totais
  if (sale.discount > 0) {
    lines.push(formatLineItem('Subtotal:', formatCurrency(sale.subtotal), LINE_WIDTH));
    lines.push(formatLineItem('Desconto:', `-${formatCurrency(sale.discount)}`, LINE_WIDTH));
  }
  lines.push(SEPARATOR);
  lines.push(formatLineItem('TOTAL:', formatCurrency(sale.total), LINE_WIDTH, true));
  lines.push(SEPARATOR);

  // Pagamentos
  if (sale.payments && sale.payments.length > 0) {
    lines.push(centerText('PAGAMENTO', LINE_WIDTH));
    sale.payments.forEach((payment) => {
      const methodName = payment.payment_method?.name || payment.payment_method_name || 'Pagamento';
      lines.push(
        formatLineItem(
          methodName + ':',
          formatCurrency(payment.amount),
          LINE_WIDTH
        )
      );
    });
    lines.push(THIN_SEPARATOR);
  }

  // Footer
  lines.push('');
  lines.push(centerText('Obrigado pela preferencia!', LINE_WIDTH));
  lines.push(centerText('Volte sempre!', LINE_WIDTH));
  lines.push('');
  lines.push('');
  lines.push('');

  return lines.join('\n');
}

// Helpers
function centerText(text: string, width: number): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatLineItem(
  label: string,
  value: string,
  width: number,
  bold: boolean = false
): string {
  const text = label.padEnd(width - value.length) + value;
  return bold ? text.toUpperCase() : text;
}

export default ThermalPrinter;
