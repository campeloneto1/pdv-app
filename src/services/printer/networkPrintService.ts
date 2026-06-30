import TcpSocket from 'react-native-tcp-socket';
import { Buffer } from 'buffer';

/**
 * Impressão direta (sem Print Server) numa impressora de rede ESC/POS
 * (ex: Elgin i9, Epson, Bematech) via socket TCP raw na porta 9100 -
 * mesmo protocolo "JetDirect" que qualquer impressora de rede aceita.
 *
 * Diferente do ThermalPrinter (impressora interna da maquininha via SDK
 * PlugPag), este serviço fala direto com uma impressora de rede separada
 * (ex: a impressora da produção/cozinha), usando o IP:porta cadastrado em
 * /branches/{id}/printers.
 */

const ESC = '\x1b';
const GS = '\x1d';
const LF = '\n';

const CMD_INIT = `${ESC}@`;
const ALIGN_LEFT = `${ESC}a\x00`;
const ALIGN_CENTER = `${ESC}a\x01`;
const FONT_NORMAL = `${ESC}!\x00`;
const FONT_BOLD = `${ESC}!\x08`;
const FONT_BOLD_LARGE = `${ESC}!\x38`;
const CUT_PAPER = `${GS}V\x41\x00`;
const LINE_WIDTH = 48;

interface PrintItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
  notes?: string;
}

interface PrintPayment {
  method: string;
  amount: number;
}

export interface NetworkReceiptData {
  company_name: string;
  branch_name: string;
  order_number: string | number;
  date: string;
  customer_name?: string;
  user_name?: string;
  items: PrintItem[];
  subtotal: number;
  discount?: number;
  total: number;
  payments?: PrintPayment[];
  notes?: string;
  via: 'CLIENTE' | 'PRODUÇÃO';
}

function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function line(text: string, width = LINE_WIDTH): string {
  return stripAccents(text).slice(0, width) + LF;
}

function line2col(left: string, right: string, width = LINE_WIDTH): string {
  const leftMax = Math.max(0, width - right.length - 1);
  const leftText = stripAccents(left).slice(0, leftMax).padEnd(leftMax);
  return `${leftText} ${right}${LF}`;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function buildReceipt(data: NetworkReceiptData): string {
  let r = '';
  r += CMD_INIT;
  r += ALIGN_CENTER + FONT_BOLD_LARGE;
  r += line(data.company_name || 'EMPRESA');
  r += FONT_NORMAL;
  r += line(data.branch_name || '');
  r += line('='.repeat(LINE_WIDTH));

  r += ALIGN_LEFT + FONT_BOLD;
  r += line(`PEDIDO #${data.order_number}`);
  r += FONT_NORMAL;
  r += line(`Data: ${data.date}`);
  if (data.customer_name) r += line(`Cliente: ${data.customer_name}`);
  if (data.user_name) r += line(`Atendente: ${data.user_name}`);
  r += line('-'.repeat(LINE_WIDTH));

  r += FONT_BOLD;
  r += line('ITENS');
  r += FONT_NORMAL;
  data.items.forEach((item) => {
    r += line(`${item.quantity}x ${item.name}`);
    r += line2col('', formatCurrency(item.total));
    if (item.notes) r += line(`   Obs: ${item.notes}`);
  });
  r += line('-'.repeat(LINE_WIDTH));

  r += line2col('Subtotal:', formatCurrency(data.subtotal));
  if (data.discount && data.discount > 0) {
    r += line2col('Desconto:', `-${formatCurrency(data.discount)}`);
  }
  r += FONT_BOLD_LARGE;
  r += line2col('TOTAL:', formatCurrency(data.total));
  r += FONT_NORMAL;

  if (data.payments && data.payments.length > 0) {
    r += line('-'.repeat(LINE_WIDTH));
    r += line('PAGAMENTO');
    data.payments.forEach((p) => {
      r += line2col(p.method, formatCurrency(p.amount));
    });
  }

  if (data.notes) {
    r += line('-'.repeat(LINE_WIDTH));
    r += line(`Obs: ${data.notes}`);
  }

  r += line('='.repeat(LINE_WIDTH));
  r += ALIGN_CENTER;
  r += line('Obrigado pela preferencia!');
  r += line('');
  r += line('');
  r += FONT_BOLD;
  r += line(`*** VIA ${data.via} ***`);
  r += FONT_NORMAL;
  r += line('');
  r += line('');
  r += CUT_PAPER;

  return r;
}

/**
 * Envia o cupom direto para a impressora de rede via TCP (porta padrão 9100).
 * `printerConnection` é o "connection" cadastrado em /branches/{id}/printers,
 * ex: "192.168.1.100:9100" ou só "192.168.1.100".
 */
export function printOnNetworkPrinter(
  printerConnection: string,
  data: NetworkReceiptData
): Promise<{ success: boolean; message: string }> {
  const [host, portStr] = printerConnection.split(':');
  const port = portStr ? parseInt(portStr, 10) : 9100;
  const payload = Buffer.from(buildReceipt(data), 'latin1').toString('base64');

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: { success: boolean; message: string }) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const client = TcpSocket.createConnection({ host, port }, () => {
      client.write(payload, 'base64');
      client.end();
    });

    const timeout = setTimeout(() => {
      client.destroy();
      finish({ success: false, message: `Timeout ao conectar em ${host}:${port}` });
    }, 5000);

    client.on('close', () => {
      clearTimeout(timeout);
      finish({ success: true, message: 'Impresso com sucesso' });
    });

    client.on('error', (error: any) => {
      clearTimeout(timeout);
      finish({ success: false, message: error?.message || `Erro ao conectar em ${host}:${port}` });
    });
  });
}

/** Imprime a via de PRODUÇÃO numa impressora de rede separada. */
export function printProductionCopy(
  printerConnection: string,
  saleData: Omit<NetworkReceiptData, 'via'>
): Promise<{ success: boolean; message: string }> {
  return printOnNetworkPrinter(printerConnection, { ...saleData, via: 'PRODUÇÃO' });
}
