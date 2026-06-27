// Tipos principais do app

export interface User {
  id: number;
  name: string;
  email: string;
  company_id: number;
}

export interface Branch {
  id: number;
  name: string;
  company_id: number;
  address?: string;
  phone?: string;
}

export interface Upload {
  id: number;
  url: string;
  file_url?: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  products_count?: number;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  sale_price: number;
  cost_price?: number;
  sku?: string;
  barcode?: string;
  upload?: Upload | null;
  uploads?: Upload[];
  category_id: number;
  category?: Category;
  stock_quantity?: number;
  active: boolean;
}

export function getImageUrl(item: { upload?: Upload | null; uploads?: Upload[] }): string | null {
  if (item.upload?.url) return item.upload.url;
  if (item.upload?.file_url) return item.upload.file_url;
  if (item.uploads?.[0]?.url) return item.uploads[0].url;
  if (item.uploads?.[0]?.file_url) return item.uploads[0].file_url;
  return null;
}

export interface CartItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  notes?: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
  type: 'cash' | 'credit' | 'debit' | 'pix' | 'other';
  active: boolean;
}

export interface Payment {
  payment_method_id: number;
  amount: number;
}

export interface Sale {
  id: number;
  sale_number: number;
  branch_id: number;
  user_id: number;
  customer_name?: string;
  subtotal: number;
  discount: number;
  total: number;
  notes?: string;
  status: 'pending' | 'completed' | 'cancelled';
  items: SaleItem[];
  payments: SalePayment[];
  created_at: string;
}

export interface SaleItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface SalePayment {
  id: number;
  payment_method_id: number;
  payment_method_name: string;
  amount: number;
}

export interface CashRegister {
  id: number;
  branch_id: number;
  user_id: number;
  opening_balance: number;
  closing_balance?: number;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at?: string;
}

// Stone SDK Types
export interface StonePaymentResult {
  success: boolean;
  transactionId?: string;
  authorizationCode?: string;
  cardBrand?: string;
  cardLastDigits?: string;
  message?: string;
  receipt?: string;
}

export interface PrinterConfig {
  enabled: boolean;
  printOnSale: boolean;
  copies: number;
}
