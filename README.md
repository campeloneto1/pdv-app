# 📱 Cariri PDV POS - App para Máquinas PagBank

App React Native para vendas em máquinas POS PagBank (Moderninha Plus, Moderninha Smart).

## 🚀 Setup Inicial

### 1. Pré-requisitos

- Node.js 18+
- JDK 17
- Android Studio
- React Native CLI

### 2. Instalar Dependências

```bash
cd pdv-app
npm install
```

### 3. Configurar API

Edite o arquivo `src/api/api.ts`:

```typescript
const API_BASE_URL = 'https://api.cariripdv.com.br/api';
```

### 4. Executar em Desenvolvimento

```bash
# Terminal 1: Metro Bundler
npm start

# Terminal 2: Build Android
npm run android
```

---

## 📦 Estrutura do Projeto

```
pdv-app/
├── android/                    # Código nativo Android
├── src/
│   ├── api/
│   │   └── api.ts             # Cliente HTTP (Axios)
│   ├── screens/
│   │   ├── LoginScreen.tsx     # Tela de login
│   │   ├── BranchSelectionScreen.tsx  # Seleção de filial
│   │   ├── CashRegisterScreen.tsx     # Abertura/fechamento de caixa
│   │   ├── SalesScreen.tsx     # PDV - lista produtos
│   │   ├── CartScreen.tsx      # Carrinho de compras
│   │   ├── PaymentScreen.tsx   # Seleção de pagamento
│   │   └── HistoryScreen.tsx   # Histórico de vendas
│   ├── store/
│   │   ├── authStore.ts       # Autenticação (Zustand)
│   │   ├── cartStore.ts       # Carrinho
│   │   └── sessionStore.ts    # Sessão/Caixa/Filial
│   ├── services/
│   │   ├── payment/
│   │   │   └── pagbank.ts     # SDK PagBank (PlugPag)
│   │   └── printer/
│   │       └── thermalPrinter.ts
│   └── types/
│       └── index.ts
├── App.tsx                     # Navegação principal
├── index.js                    # Entry point
└── package.json
```

---

## 🔧 Integração PagBank (PlugPag SDK)

### 1. Adicionar SDK no Gradle

Edite `android/app/build.gradle` (versão e repositório a confirmar com o
parceiro PagBank no momento da integração real):

```gradle
dependencies {
    // PlugPag SDK
    implementation 'com.uol.pagseguro.plugpagservice.wrapper:plugpag-wrapper:x.x.x'
}
```

### 2. Adicionar repositório PagBank

Edite `android/build.gradle` com o Maven informado pelo programa de
parceiros PagBank.

### 3. Implementar o Módulo Nativo

O esqueleto já está pronto em
`android/app/src/main/java/br/com/cariripdv/posapp/pdv/pagbank/PlugPagModule.kt` —
falta apenas chamar a API real do SDK (`PlugPag`, `PlugPagPaymentData`,
`PlugPagActivationData`) dentro de cada método, usando as credenciais de
parceiro fornecidas pela PagBank.

---

## 📄 Funcionalidades

### ✅ Implementadas

- [x] Login
- [x] Seleção de filial
- [x] Abertura/fechamento de caixa
- [x] Listagem de categorias
- [x] Listagem de produtos
- [x] Carrinho de compras
- [x] Tela de pagamento (Crédito, Débito, PIX, Dinheiro)
- [x] Histórico de vendas
- [x] Reimpressão de comprovantes
- [x] Menu lateral com opções
- [x] Integração PagBank/PlugPag (estrutura)
- [x] Impressão térmica (estrutura)

### 📋 Pendentes

- [ ] Implementar módulo nativo PlugPag (Kotlin)
- [ ] Implementar módulo nativo de impressão
- [ ] Modo offline (SQLite)
- [ ] Sincronização offline
- [ ] Troco para pagamento em dinheiro
- [ ] Desconto por item/venda

---

## 🔐 Cadastro/Certificação PagBank

Para publicar como parceiro PagBank:

1. **Cadastro como desenvolvedor/parceiro PagBank**
   - https://dev.pagbank.uol.com.br/

2. **Solicitar SDK PlugPag**
   - Preencher formulário de parceiro
   - Receber credenciais sandbox

3. **Testes**
   - Testar em máquina de homologação
   - Validar todos os fluxos de pagamento

4. **Certificação**
   - Submeter app para análise
   - Passar nos testes de segurança
   - Publicar como app homologado PagBank

---

## 🖨️ Impressora Térmica

A impressora térmica está integrada na máquina. Suporte:

- **Moderninha Plus / Smart**: PlugPag SDK

O cupom é formatado para 32 caracteres (padrão POS).

---

## 📱 Build para Produção

```bash
# Gerar APK Release
cd android
./gradlew assembleRelease

# APK estará em:
# android/app/build/outputs/apk/release/app-release.apk
```

---

## 🔗 Links Úteis

- [PagBank Portal Desenvolvedores](https://dev.pagbank.uol.com.br/)
- [React Native Docs](https://reactnative.dev/)

---

## 📞 Suporte

- Email: suporte@cariripdv.com.br
- Docs: https://docs.cariripdv.com.br
