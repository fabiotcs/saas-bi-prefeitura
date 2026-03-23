# BI Araçuaí — App Mobile iOS

App iOS para o Sistema de BI da Prefeitura Municipal de Araçuaí, desenvolvido com **Expo** e **React Native**.

---

## Pré-requisitos

- **Node.js** 20 ou superior
- **npm** 9 ou superior
- **Expo CLI**: `npm install -g expo-cli`
- **EAS CLI**: `npm install -g eas-cli`
- **Apple Developer Account** (USD 99/ano) — necessário para builds e TestFlight
- **Xcode** 15+ (para simulador iOS — macOS apenas)

---

## Configuração de Variáveis de Ambiente

1. Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env
   ```

2. Edite `.env` e configure a URL da API:
   ```env
   EXPO_PUBLIC_API_URL=https://sua-api.exemplo.com
   ```

3. Para builds no servidor EAS, configure o secret:
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value https://sua-api.exemplo.com
   ```

---

## Instalação

```bash
npm install
```

---

## Desenvolvimento

### Iniciar servidor de desenvolvimento

```bash
npx expo start
```

- Pressione `i` para abrir no simulador iOS
- Pressione `a` para abrir no emulador Android
- Escaneie o QR code com o app **Expo Go** no dispositivo físico

### Verificação de tipos

```bash
npx tsc --noEmit
```

### Diagnóstico de configuração

```bash
npx expo-doctor
```

---

## Build EAS

### Build de desenvolvimento (device físico)

```bash
eas build --platform ios --profile development
```

### Build de preview (TestFlight — internal testing)

```bash
eas build --platform ios --profile preview --non-interactive
```

### Build de produção (App Store)

```bash
eas build --platform ios --profile production
```

---

## Submissão ao TestFlight

### Via EAS Submit (automático)

```bash
eas submit --platform ios --profile production
```

### Via upload manual

1. Baixe o `.ipa` no [dashboard EAS](https://expo.dev)
2. Abra o **Transporter** (macOS App Store) ou **Application Loader**
3. Arraste o `.ipa` para enviar ao App Store Connect
4. Acesse [App Store Connect](https://appstoreconnect.apple.com) → TestFlight
5. Aguarde o processamento (~30 minutos) e adicione testadores internos

---

## Checklist de Submissão App Store

- [ ] Apple Developer Account ativa (USD 99/ano)
- [ ] Bundle ID registrado: `br.gov.aracuai.saasbi`
- [ ] Certificado de distribuição iOS configurado no EAS
- [ ] Provisioning profile configurado no EAS
- [ ] App criado no App Store Connect
- [ ] Screenshots obrigatórias (iPhone 6.7" e 5.5")
- [ ] Política de privacidade (URL pública obrigatória)
- [ ] Descrição do app em português
- [ ] Categoria: Business ou Productivity

---

## Estrutura do Projeto

```
mobile/
├── src/
│   ├── app/              # Telas (expo-router file-based routing)
│   │   ├── (auth)/       # Telas de autenticação
│   │   │   ├── login.tsx
│   │   │   └── biometric.tsx
│   │   └── (app)/        # Telas protegidas
│   │       ├── index.tsx    # Dashboard home
│   │       ├── orders.tsx   # Listagem de pedidos
│   │       └── orders/
│   │           └── [id].tsx # Detalhe do pedido
│   ├── components/       # Componentes reutilizáveis
│   ├── services/         # Serviços de API e armazenamento
│   └── ...
├── app.json              # Configuração do Expo
├── eas.json              # Configuração do EAS Build
├── .env.example          # Variáveis de ambiente (exemplo)
└── package.json
```

---

## Informações do App

| Campo | Valor |
|-------|-------|
| Nome | BI Araçuaí |
| Bundle ID | `br.gov.aracuai.saasbi` |
| Versão | 1.0.0 |
| Build Number | 1 |
| Plataforma | iOS (iPhone apenas) |
| SDK Expo | 52.x |

---

## Lead Time

- **TestFlight (internal):** Disponível ~30 min após o build ser processado pela Apple
- **App Store Review:** 2–7 dias úteis

---

*Desenvolvido por Synkra para a Prefeitura Municipal de Araçuaí — PoC 2026*
