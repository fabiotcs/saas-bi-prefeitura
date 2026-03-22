# EPIC-5 · Finalização — Dashboard, Configurações, APIs e Mobile

**Status:** Draft
**Wave:** 5 (Dashboard, Config e APIs requerem EPIC-1 a EPIC-4; Mobile pode iniciar na Wave 1)
**Módulos PRD:** MOD-02 · MOD-14 · MOD-16 · MOD-13
**REQs cobertos:** REQ-02, REQ-49, REQ-50, REQ-51, REQ-52, REQ-61
**Checklist PoC:** Itens 02, 49, 50, 51, 52, 61

---

## Objetivo

Finalizar o sistema com o Dashboard principal (consolida dados de todos os módulos), configurações operacionais do sistema, módulo de integrações e APIs com documentação Swagger, e o aplicativo mobile iOS com biometria nativa. O Mobile deve ser iniciado em paralelo desde a Wave 1 por conta do lead time da App Store.

## Critério de Conclusão do Epic

- Dashboard com todos os 10 sub-itens do item 2 visíveis após login
- Todas as configurações do sistema funcionais com toggles
- Swagger/OpenAPI acessível em `/api/docs`
- App iOS funcional em TestFlight ou App Store
- Biometria nativa (Face ID / Touch ID) no app mobile

---

## Stories

### Story 5.1 · Dashboard Principal (REQ-02) ⚠️ Inicia após EPIC-3

**Como** usuário logado,
**quero** ver um painel interativo completo ao fazer login,
**para que** eu tenha visão imediata do estado do sistema.

**Tarefas:**
- [ ] Implementar `dashboard.service.ts`: fetchDashboard conforme PRD
- [ ] `GET /api/dashboard` — agrega dados de todos os módulos: budgetTotal, budgetUsed, budgetRemaining, secretaryList, ordersSummary, recentOrders
- [ ] Componente `<BudgetCard>` — orçamento total / usado / disponível com cores (verde=OK, amarelo=alerta, vermelho=crítico)
- [ ] Componente `<SecretaryProgressList>` — lista de secretarias com `<BudgetProgressBar>` individual (% + R$)
- [ ] Componente `<OrderStatusChart>` — gráfico de pizza/donut com recharts: pedidos por status
- [ ] Componente `<RecentOrdersTable>` — últimos pedidos com: código, status (badge colorido), secretaria, data, melhor oferta
- [ ] Componente `<QuickActionButtons>` — botões "Nova OS" (→ `/orders/new`) e "Acompanhar Pedidos" (→ `/orders`)
- [ ] Página `/dashboard` com todos os 10 sub-itens (a–j) do item 2 do Anexo III
- [ ] Atualização em tempo real via SSE ou polling de 30s
- [ ] Cores distintas para saldo disponível (verde) vs comprometido (amarelo/vermelho)

**Critérios de aceite:**
- [ ] Todos os 10 sub-itens (a–j) do item 2 visíveis imediatamente após login
- [ ] Cores distintas para saldo disponível vs comprometido (item 2)
- [ ] Barra de progresso por secretaria funcional (item 2)
- [ ] Gráfico de pizza/donut para status dos pedidos (item 2)
- [ ] Botões de atalho navegam corretamente (item 2)
- [ ] Layout responsivo em 375px e 1440px

---

### Story 5.2 · Configurações do Sistema (REQ-50, 51, 52)

**Como** gestor principal,
**quero** configurar regras de faturamento, datas de fechamento e regras de aprovação,
**para que** o sistema se adapte aos processos da prefeitura.

**Tarefas:**
- [ ] Schema Prisma: `SystemSettings` (id, billingMode, billingClosingDay, requireManagerApproval, requireBudgetValidation, minimumProposalsForApproval, restrictOrderCreationToVerifiedUsers, updatedAt)
- [ ] Implementar `settings.service.ts`: getSettings, updateSettings conforme PRD
- [ ] `GET /api/settings` + `PATCH /api/settings`
- [ ] Página `/settings` com formulário de configuração:
  - Toggle: "Faturamento Centralizado" / "Descentralizado" (BillingMode)
  - Input numérico: "Dia de fechamento para faturamento" (1–28)
  - Toggle: "Exigir aprovação do gestor para novas OS"
  - Toggle: "Validar orçamento antes de aceitar proposta"
  - Input numérico: "Quantidade mínima de propostas para aprovação"
  - Toggle: "Restringir criação de pedidos a usuários verificados"
- [ ] Salvar com feedback visual (toast de sucesso/erro)
- [ ] Seed de configuração padrão na migration inicial

**Critérios de aceite:**
- [ ] Toggle faturamento centralizado/descentralizado funcional (item 50)
- [ ] Campo de data de fechamento configurável (item 51)
- [ ] Toggle aprovação do gestor funcional (item 52)
- [ ] Campo de quantidade mínima de propostas funcional (item 52)
- [ ] Restrição de criação de pedidos a usuários verificados funcional (item 52)

---

### Story 5.3 · Módulo de Integrações e APIs (REQ-61)

**Como** integrador técnico,
**quero** gerenciar API keys, monitorar chamadas e acessar a documentação,
**para que** o sistema possa ser integrado com outros softwares municipais.

**Tarefas:**
- [ ] Schema Prisma: `ApiKey` (id, name, keyHash, permissions[], createdAt, lastUsedAt, userId)
- [ ] Schema Prisma: `ApiCallLog` (id, endpoint, method, statusCode, responseTimeMs, occurredAt, ipAddress, apiKeyId)
- [ ] Implementar `integrations.service.ts` completo conforme PRD
- [ ] `GET/POST /api/integrations/api-keys` + `GET /api/integrations/logs` + `GET /api/integrations/stats`
- [ ] Autenticação por API key nos endpoints públicos: `GET /api/public/orders` e `GET /api/public/items`
- [ ] Middleware de API key: valida header `X-API-Key`, registra em `ApiCallLog`
- [ ] Página `/integrations` com:
  - Cards de estatísticas: total de chamadas hoje, taxa de sucesso, tempo médio de resposta, falhas
  - Tabela de API keys: nome, key mascarada (sk_****), criada em, último uso, permissões
  - Formulário: criar nova API key (nome + permissões checkbox) — exibe key completa APENAS na criação
  - Tabela de logs de chamadas: endpoint, método, status HTTP, tempo de resposta, IP, data/hora
  - Link para "Guia de Boas Práticas"
- [ ] **Swagger/OpenAPI** acessível em `/api/docs` (via `swagger-ui-react` ou `@scalar/nextjs`)
- [ ] Documentação auto-gerada cobrindo todos os 61+ endpoints do PRD

**Critérios de aceite:**
- [ ] Swagger/OpenAPI acessível em `/api/docs` (item 61)
- [ ] Painel de chamadas com status, tempo e falhas visíveis (item 61)
- [ ] Endpoints de consulta funcionais via API key (item 61)
- [ ] Guia de boas práticas acessível no painel (item 61)
- [ ] API key exibida completa apenas no momento da criação

---

### Story 5.4 · App Mobile iOS — Scaffolding e Auth (REQ-49) ⚠️ Iniciar na Wave 1

**Como** usuário mobile,
**quero** acessar o sistema pelo iPhone com biometria nativa,
**para que** eu possa usar o sistema em campo.

> ⚠️ **ATENÇÃO:** Esta story deve ser iniciada na Wave 1, em paralelo com EPIC-1, para garantir tempo hábil de submissão à App Store (2–7 dias úteis de revisão Apple).

**Tarefas:**
- [ ] Criar projeto `mobile/` com Expo + React Native + TypeScript
- [ ] Configurar `mobile/src/services/api.ts` com mobileApi (axios + AsyncStorage conforme PRD)
- [ ] Implementar tela de login: campos e-mail/senha + captura biométrica (câmera frontal)
- [ ] Integrar `expo-local-authentication` para Face ID / Touch ID (biometria nativa do device)
- [ ] Fluxo de autenticação: login → biometric-verify (mesmos endpoints do web)
- [ ] Navegação base com `expo-router` ou `react-navigation`
- [ ] Configurar `app.json` / `app.config.ts` com nome "SaaS-BI Araçuaí", bundle ID, ícone
- [ ] Configurar EAS Build para geração do IPA (iOS)
- [ ] Submeter para TestFlight assim que o build básico funcionar

**Critérios de aceite:**
- [ ] App roda em simulador iOS sem erros
- [ ] Tela de login com autenticação funcional (mesmos endpoints do web)
- [ ] Face ID / Touch ID funcional no device real
- [ ] Build IPA gerado via EAS Build
- [ ] App submetido ao TestFlight

---

### Story 5.5 · App Mobile iOS — Listagem de Pedidos (REQ-49)

**Como** usuário mobile,
**quero** visualizar e acompanhar pedidos pelo app,
**para que** eu tenha acesso às OS em campo sem precisar do computador.

**Tarefas:**
- [ ] Tela `/orders` no app: lista de OS com código, status (badge colorido), secretaria, data
- [ ] Filtros de status no app (tabs ou select)
- [ ] Tela `/orders/:id` no app: visão básica da OS com itens e timeline
- [ ] Pull-to-refresh para atualizar lista
- [ ] Indicador de loading e estado vazio
- [ ] Compatibilidade com iOS 16+

**Critérios de aceite:**
- [ ] Listagem de pedidos funcional no app (item 49)
- [ ] Tela de detalhe da OS acessível
- [ ] App disponível no TestFlight para demonstração na PoC

---

## Ordem de execução das stories

```
Story 5.4 → iniciar IMEDIATAMENTE (Wave 1, paralelo com EPIC-1)
Story 5.5 → após 5.4 estar funcional

Aguardar EPIC-3 concluído:
Story 5.1 → Dashboard (consolida todos os dados)

Em paralelo após EPIC-1:
Story 5.2 → Configurações (independente de dados reais)
Story 5.3 → APIs + Swagger (pode ser construída incrementalmente)
```

---

## ⚠️ Checklist de Submissão App Store

Itens a preparar antes da submissão:

- [ ] Apple Developer Account ativa (USD 99/ano)
- [ ] Bundle ID registrado no Apple Developer Portal
- [ ] Certificados de distribuição e provisioning profiles configurados no EAS
- [ ] Screenshots obrigatórias: iPhone 6.7" e 6.5" (mínimo)
- [ ] Descrição do app em português
- [ ] Política de privacidade (URL obrigatória)
- [ ] Formulário de conformidade de exportação
- [ ] Build submetido via `eas submit --platform ios`
