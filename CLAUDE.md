# Cariri PDV POS - App React Native para Maquininhas Stone/TON

> **Contexto**: App mobile para vendas em maquininhas POS (Stone TON T2, T3, Moderninha Plus, etc.)
> **Tecnologia**: React Native com integração Stone SDK

---

## Nomenclatura

| Termo | Significa |
|-------|-----------|
| **"App"** ou **"Mobile"** | Este projeto React Native para maquininhas |
| **"Web"** | Sistema Web Principal (pdv-front) |
| **"Backend"** ou **"API"** | API Laravel (api.cariripdv.com.br) |

---

## Stack Tecnológico

```json
{
  "runtime": "React Native 0.73+",
  "language": "TypeScript",
  "navigation": "React Navigation 6",
  "state": "Zustand 4.4 (com persist + AsyncStorage)",
  "http": "Axios",
  "payment": "Stone SDK (nativo)",
  "printer": "Impressora térmica integrada"
}
```

---

## Estrutura de Pastas

```
pdv-app/
├── android/                    # Código nativo Android
│   └── app/
│       └── src/main/java/      # Módulos nativos (Stone, Printer)
├── src/
│   ├── api/
│   │   └── api.ts             # Cliente HTTP (Axios) com interceptors
│   │
│   ├── screens/
│   │   ├── LoginScreen.tsx           # Login com email/senha
│   │   ├── BranchSelectionScreen.tsx # Seleção de filial
│   │   ├── CashRegisterScreen.tsx    # Abertura/fechamento de caixa
│   │   ├── SalesScreen.tsx           # PDV principal (categorias + produtos)
│   │   ├── CartScreen.tsx            # Carrinho de compras
│   │   ├── PaymentScreen.tsx         # Seleção de pagamento
│   │   └── HistoryScreen.tsx         # Histórico de vendas do caixa
│   │
│   ├── store/
│   │   ├── authStore.ts       # Autenticação (user, token, branch)
│   │   ├── cartStore.ts       # Carrinho de compras
│   │   └── sessionStore.ts    # Sessão (filial, caixa aberto)
│   │
│   ├── services/
│   │   ├── payment/
│   │   │   └── stone.ts       # Integração Stone SDK
│   │   └── printer/
│   │       └── thermalPrinter.ts  # Impressão de cupons
│   │
│   └── types/
│       └── index.ts           # Interfaces TypeScript
│
├── App.tsx                     # Navegação principal (Stack Navigator)
├── index.js                    # Entry point
├── package.json
├── tsconfig.json
├── babel.config.js
└── app.json
```

---

## Gerenciamento de Estado (Zustand)

### 1. authStore - Autenticação

```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  selectedBranch: Branch | null;
  _hydrated: boolean;

  // Actions
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  setSelectedBranch: (branch: Branch) => void;
}
```

**Persistência**: `auth-storage` no AsyncStorage
**Token**: Salvo também em `auth_token` no AsyncStorage

### 2. sessionStore - Sessão da Filial/Caixa

```typescript
interface SessionState {
  selectedBranchId: number | null;
  selectedBranchName: string | null;
  cashRegister: CashRegister | null;
  isOfflineMode: boolean;

  // Actions
  setBranch: (id: number, name: string) => void;
  setCashRegister: (cashRegister: CashRegister) => void;
  closeCashRegister: () => void;
  setOfflineMode: (value: boolean) => void;
  clearSession: () => void;
}
```

**Persistência**: `session-storage` no AsyncStorage

### 3. cartStore - Carrinho

```typescript
interface CartState {
  items: CartItem[];

  // Actions
  addItem: (item: CartItem) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
}
```

**Persistência**: `cart-storage` no AsyncStorage

---

## Telas e Fluxos

### Fluxo Principal

```
Login → BranchSelection → CashRegister → Sales → Cart → Payment
                              ↑                           ↓
                              └─────────────────────────────┘
```

### 1. LoginScreen

- Campos: email, senha
- Ação: POST `/auth/login`
- Sucesso: Salva token e user no authStore
- Navegação: → BranchSelection

### 2. BranchSelectionScreen

- Lista filiais do usuário
- Ação: GET `/branches`
- Ao selecionar: Salva branch em authStore e sessionStore
- Navegação: → CashRegister

### 3. CashRegisterScreen

- Verifica se há caixa aberto: GET `/cash-registers/branch/{id}/current`
- **Caixa fechado**: Mostra formulário de abertura (saldo inicial)
  - Ação: POST `/cash-registers/open`
- **Caixa aberto**: Mostra botão "Começar a Vender"
- Menu: Fechar caixa (abre modal com resumo)
  - Ação: POST `/cash-registers/{id}/close`
- Navegação: → Sales

### 4. SalesScreen

- Lista categorias horizontalmente
- Grid de produtos (2 colunas)
- Botão de adicionar ao carrinho
- Menu lateral (modal) com opções:
  - Histórico de Vendas
  - Trocar Filial
  - Fechar Caixa
  - Sair
- Navegação: → Cart (quando clica no carrinho)

### 5. CartScreen

- Lista itens do carrinho
- Controles de quantidade (+/-)
- Botão remover item
- Total do pedido
- Navegação: → Payment

### 6. PaymentScreen

- Métodos de pagamento:
  - Crédito (com seleção de parcelas 1-12x)
  - Débito
  - PIX
  - Dinheiro
- Ação: Processa pagamento via Stone SDK
- Ação: POST `/sales` (registra venda no backend)
- Ação: Imprime cupom via ThermalPrinter
- Navegação: → Sales (após sucesso)

### 7. HistoryScreen

- Lista vendas do caixa atual
- Resumo: total de vendas e valor total
- Cada venda mostra:
  - Número do pedido
  - Itens com quantidades
  - Pagamentos
  - Botão reimprimir

---

## API Client (api.ts)

```typescript
const api = axios.create({
  baseURL: 'https://api.cariripdv.com.br/api',
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use((config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const companyId = await AsyncStorage.getItem('company_id');
  if (companyId) {
    config.headers['X-Company-ID'] = companyId;
  }

  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Logout e redireciona para login
    }
    return Promise.reject(error);
  }
);
```

### Headers Obrigatórios

| Header | Descrição |
|--------|-----------|
| `Authorization` | `Bearer {token}` |
| `X-Company-ID` | ID da empresa do usuário |

### Helper de Extração

```typescript
// Para listas
export function extractArrayData(response: any): any[] {
  return response.data?.data || response.data || [];
}

// Para item único
export function extractSingleData(response: any): any {
  return response.data?.data || response.data;
}
```

---

## Integração Stone SDK

### Arquivo: `src/services/payment/stone.ts`

```typescript
interface PaymentResult {
  success: boolean;
  transactionId?: string;
  message?: string;
  authorizationCode?: string;
}

class StonePaymentService {
  async initialize(): Promise<void>;
  async payCredit(amountCents: number, installments: number): Promise<PaymentResult>;
  async payDebit(amountCents: number): Promise<PaymentResult>;
  async payPix(amountCents: number): Promise<PaymentResult>;
  async cancelTransaction(transactionId: string): Promise<PaymentResult>;
}
```

**IMPORTANTE**: Atualmente em modo simulação. Para produção:

1. Criar módulo nativo Java/Kotlin em `android/app/src/main/java/`
2. Adicionar Stone SDK no `android/app/build.gradle`
3. Implementar bridge React Native ↔ Java

### Gradle Dependencies (a adicionar)

```gradle
// android/app/build.gradle
dependencies {
    implementation 'com.stone.posandroid:pos-android-sdk:3.5.0'
}
```

---

## Impressora Térmica

### Arquivo: `src/services/printer/thermalPrinter.ts`

```typescript
interface ReceiptData {
  id: number;
  sale_number: string;
  items: Array<{ name: string; quantity: number; unit_price: number }>;
  total: number;
  discount?: number;
  payments: Array<{ method: string; amount: number }>;
  created_at: string;
}

class ThermalPrinterService {
  async printReceipt(sale: ReceiptData): Promise<void>;
  async printText(text: string): Promise<void>;
  async cutPaper(): Promise<void>;
}
```

**Formato**: 32 caracteres por linha (padrão POS)

**IMPORTANTE**: Atualmente em modo simulação. Para produção:
1. Criar módulo nativo para impressora da máquina
2. Stone TON usa SDK próprio para impressão
3. Moderninha usa PlugPag SDK

---

## Types (types/index.ts)

```typescript
export interface User {
  id: number;
  name: string;
  email: string;
  company_id: number;
}

export interface Branch {
  id: number;
  name: string;
  address?: string;
  company_id: number;
}

export interface CashRegister {
  id: number;
  branch_id: number;
  opening_balance: number;
  closing_balance?: number;
  status: 'open' | 'closed';
}

export interface Category {
  id: number;
  name: string;
  image_url?: string;
}

export interface Product {
  id: number;
  name: string;
  sale_price: number;
  image_url?: string;
  category_id: number;
}

export interface CartItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  notes?: string;
}
```

---

## Navegação (App.tsx)

```typescript
const Stack = createNativeStackNavigator();

// Screens registradas
<Stack.Screen name="Login" component={LoginScreen} />
<Stack.Screen name="BranchSelection" component={BranchSelectionScreen} />
<Stack.Screen name="CashRegister" component={CashRegisterScreen} />
<Stack.Screen name="Sales" component={SalesScreen} />
<Stack.Screen name="Cart" component={CartScreen} />
<Stack.Screen name="Payment" component={PaymentScreen} />
<Stack.Screen name="History" component={HistoryScreen} />
```

### Navegação entre telas

```typescript
// Navegação simples
navigation.navigate('Sales');

// Substituir tela (sem voltar)
navigation.replace('CashRegister');

// Reset completo (volta para início)
navigation.reset({
  index: 0,
  routes: [{ name: 'Login' }],
});

// Voltar
navigation.goBack();
```

---

## Padrões de Código

### Estrutura de Screen

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';
import api from '../api/api';

interface Props {
  navigation: any;
}

export default function MyScreen({ navigation }: Props) {
  // 1. Estados
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  // 2. Stores
  const { user } = useAuthStore();

  // 3. Effects
  useEffect(() => {
    loadData();
  }, []);

  // 4. Funções
  const loadData = async () => {
    try {
      const response = await api.get('/endpoint');
      setData(response.data.data);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  // 5. Render
  return (
    <View style={styles.container}>
      {/* JSX */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
});
```

### Cores do Design System

```typescript
const colors = {
  primary: '#2563eb',      // Azul principal
  primaryLight: '#93c5fd', // Azul claro (disabled)
  success: '#22c55e',      // Verde
  error: '#ef4444',        // Vermelho
  warning: '#f59e0b',      // Amarelo
  background: '#f3f4f6',   // Cinza fundo
  surface: '#ffffff',      // Branco
  text: '#111827',         // Texto principal
  textSecondary: '#6b7280',// Texto secundário
  border: '#e5e7eb',       // Bordas
};
```

---

## Comandos de Desenvolvimento

```bash
# Instalar dependências
npm install

# Iniciar Metro Bundler
npm start

# Build Android (outro terminal)
npm run android

# Limpar cache
npm start -- --reset-cache

# Build Release APK
cd android && ./gradlew assembleRelease
```

---

## Checklist de Funcionalidades

### Implementadas

- [x] Login com email/senha
- [x] Seleção de filial
- [x] Abertura de caixa com saldo inicial
- [x] Fechamento de caixa com resumo
- [x] Listagem de categorias
- [x] Grid de produtos
- [x] Adicionar ao carrinho
- [x] Carrinho com controle de quantidade
- [x] Tela de pagamento (Crédito, Débito, PIX, Dinheiro)
- [x] Seleção de parcelas (crédito)
- [x] Histórico de vendas do caixa
- [x] Reimpressão de comprovante
- [x] Menu lateral com opções
- [x] Logout
- [x] Persistência de estado (AsyncStorage)

### Pendentes

- [ ] Módulo nativo Stone SDK (Java/Kotlin)
- [ ] Módulo nativo impressora térmica
- [ ] Modo offline (SQLite)
- [ ] Sincronização de vendas offline
- [ ] Troco para pagamento em dinheiro
- [ ] Desconto por item/venda
- [ ] Busca de produtos
- [ ] Código de barras (scanner)
- [ ] Feature flags (auto_cash_register)
- [ ] Observações no item do carrinho

---

## Endpoints da API Utilizados

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/login` | Login |
| GET | `/branches` | Lista filiais |
| GET | `/branches/{id}/categories` | Categorias da filial |
| GET | `/branches/{id}/categories/{catId}/products` | Produtos da categoria |
| GET | `/cash-registers/branch/{id}/current` | Caixa aberto atual |
| POST | `/cash-registers/open` | Abrir caixa |
| POST | `/cash-registers/{id}/close` | Fechar caixa |
| GET | `/cash-registers/{id}/sales` | Vendas do caixa |
| POST | `/sales` | Registrar venda |

---

## Problemas Conhecidos e Soluções

### 1. Token não persiste após reload

**Causa**: AsyncStorage é assíncrono
**Solução**: Usar `_hydrated` flag no store

```typescript
if (!_hydrated) {
  return <LoadingScreen />;
}
```

### 2. Navegação antes do estado carregar

**Causa**: Zustand ainda não hidratou
**Solução**: Verificar `_hydrated` antes de navegar

### 3. 401 em requisições

**Causa**: Token expirado ou inválido
**Solução**: Interceptor faz logout automático

---

## Certificação Stone

Para publicar na Stone Store:

1. Cadastro em https://developers.stone.com.br/
2. Solicitar SDK e credenciais sandbox
3. Implementar módulos nativos
4. Testar em máquina de homologação
5. Submeter para certificação
6. Aprovação e publicação

---

## Relacionamento com Outros Projetos

| Projeto | Pasta | Descrição |
|---------|-------|-----------|
| **pdv-front** | `/home/campelo/campelo/pdv-front` | Web App (React + Vite) |
| **pdv-app** | `/home/campelo/campelo/pdv-app` | Mobile (React Native) - ESTE |
| **Backend** | API remota | Laravel API |

O pdv-app é uma versão mobile simplificada do pdv-front, focada apenas em:
- Vendas
- Abertura/fechamento de caixa
- Histórico

Não inclui funcionalidades administrativas (gestão de produtos, usuários, relatórios, etc.)

---

**Última atualização**: 2026-06-27
**Versão**: 1.0.0
