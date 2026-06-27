# 📱 Cariri PDV POS - App para Máquinas Stone/TON

App React Native para vendas em máquinas POS Stone (TON T2, T3, T3 Smart).

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
│   │   │   └── stone.ts       # SDK Stone
│   │   └── printer/
│   │       └── thermalPrinter.ts
│   └── types/
│       └── index.ts
├── App.tsx                     # Navegação principal
├── index.js                    # Entry point
└── package.json
```

---

## 🔧 Integração Stone SDK

### 1. Adicionar SDK no Gradle

Edite `android/app/build.gradle`:

```gradle
dependencies {
    // Stone SDK
    implementation 'com.stone.posandroid:pos-android-sdk:3.5.0'
}
```

### 2. Adicionar repositório Stone

Edite `android/build.gradle`:

```gradle
allprojects {
    repositories {
        google()
        mavenCentral()
        maven { url 'https://packagecloud.io/nicfrezza/pagseguro/maven2' }
        maven { url 'https://pkgs.dev.azure.com/nicfrezza/stone/_packaging/stone/maven/v1' }
    }
}
```

### 3. Criar Módulo Nativo

Crie `android/app/src/main/java/com/cariripvdpos/StoneModule.java`:

```java
package com.cariripvdpos;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

// Implementação do SDK Stone
public class StoneModule extends ReactContextBaseJavaModule {
    // Ver documentação Stone SDK
}
```

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
- [x] Integração Stone (estrutura)
- [x] Impressão térmica (estrutura)

### 📋 Pendentes

- [ ] Implementar módulo nativo Stone (Java/Kotlin)
- [ ] Implementar módulo nativo de impressão
- [ ] Modo offline (SQLite)
- [ ] Sincronização offline
- [ ] Troco para pagamento em dinheiro
- [ ] Desconto por item/venda

---

## 🔐 Certificação Stone

Para publicar na Stone Store:

1. **Cadastro no Portal Stone**
   - https://developers.stone.com.br/

2. **Solicitar SDK**
   - Preencher formulário de desenvolvedor
   - Receber credenciais sandbox

3. **Testes**
   - Testar em máquina de homologação
   - Validar todos os fluxos de pagamento

4. **Certificação**
   - Submeter app para análise
   - Passar nos testes de segurança
   - Publicar na Stone Store

---

## 🖨️ Impressora Térmica

A impressora térmica está integrada na máquina. Suporte:

- **Stone TON**: SDK nativo
- **Moderninha Smart**: PlugPag SDK

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

- [Stone SDK Docs](https://sdkandroid.stone.com.br/)
- [Stone Portal Desenvolvedores](https://developers.stone.com.br/)
- [React Native Docs](https://reactnative.dev/)

---

## 📞 Suporte

- Email: suporte@cariripdv.com.br
- Docs: https://docs.cariripdv.com.br
