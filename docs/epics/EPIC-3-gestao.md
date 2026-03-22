# EPIC-3 · Gestão — Estoque, Financeiro e Orçamento

**Status:** Draft
**Wave:** 3 (requer EPIC-1 e EPIC-2 concluídos)
**Módulos PRD:** MOD-07 · MOD-09 · MOD-11
**REQs cobertos:** REQ-30, REQ-31, REQ-32, REQ-33, REQ-34, REQ-35, REQ-36, REQ-37, REQ-38, REQ-41, REQ-45, REQ-46, REQ-47
**Checklist PoC:** Itens 30, 31, 32, 33, 34, 35, 36, 37, 38, 41, 45, 46, 47

---

## Objetivo

Implementar os módulos de gestão operacional: controle de estoque com Curva ABC automática, indicadores estratégicos e recomendações de IA; módulo financeiro com faturamento, faturas e comprovantes; e gestão orçamentária por contrato com empenhos e aditivos protegidos por 2FA.

## Critério de Conclusão do Epic

- Dashboard de estoque com 4 indicadores operacionais
- Curva ABC calculada automaticamente
- Fatura visualizável e exportável em PDF
- Empenhos e aditivos com 2FA obrigatório
- Histórico de movimentações de estoque com usuário e valores

---

## Stories

### Story 3.1 · Schema do Banco — Módulos 7, 9 e 11

**Como** desenvolvedor,
**quero** o schema completo de Estoque, Financeiro e Orçamento,
**para que** todos os dados de gestão sejam persistidos corretamente.

**Tarefas:**
- [ ] Schema Prisma: `StorageLocation` (id, name, secretaryId, observations, createdAt)
- [ ] Schema Prisma: `StockItem` (id, name, imageUrl, quantity, unit, unitPrice, minimumAlert, barcode, qrCode, storageLocationId, abcClass, createdAt, updatedAt)
- [ ] Schema Prisma: `StockMovement` (id, type[IN/OUT], itemId, quantity, value, userId, targetLocationId, occurredAt)
- [ ] Schema Prisma: `Invoice` (id, secretaryId, subSecretaryId, periodStart, periodEnd, totalBilled, totalNet, totalPaid, status, paymentProofUrl, createdAt)
- [ ] Schema Prisma: `InvoiceItem` (id, invoiceId, orderId, itemName, quantity, unitPrice, total)
- [ ] Schema Prisma: `PaymentHistory` (id, invoiceId, amount, paidAt, proofUrl)
- [ ] Schema Prisma: `BudgetContract` (id, contractNumber, initialValue, additivesTotal, currentTotal, distributedToSecretaries, allocatedViaCommitment, consumedInOrders)
- [ ] Schema Prisma: `BudgetAdditive` (id, contractId, value, description, approvedAt, fileUrl)
- [ ] Schema Prisma: `BudgetCommitment` (id, contractId, secretaryId, value, usedValue, status, registeredAt, fileUrl)
- [ ] Migration executada sem erros

**Critérios de aceite:**
- [ ] `npx prisma migrate dev` executa sem erros
- [ ] Relacionamentos entre StockItem, StorageLocation e Secretary corretos
- [ ] BudgetContract relacionado com Secretary via Commitment

---

### Story 3.2 · Dashboard e Inventário de Estoque (REQ-30, 31)

**Como** gestor de almoxarifado,
**quero** visualizar o painel de estoque e navegar pelo inventário,
**para que** eu tenha visão rápida do status atual dos itens.

**Tarefas:**
- [ ] Implementar `inventory.service.ts`: getStockDashboard, listInventory (conforme PRD)
- [ ] `GET /api/stock/dashboard` — retorna: totalProducts, totalItems, totalValue, lowStockItems
- [ ] `GET /api/stock/inventory` com filtros: search (nome), barcode, view (GRID/LIST), paginação
- [ ] Página `/stock` com 4 cards de indicadores: total de produtos, total de itens, valor total, alertas de estoque baixo
- [ ] Listagem em modo GALERIA (grid de cards com foto, nome, quantidade, alerta) e LISTA (tabela)
- [ ] Toggle galeria/lista persistido em localStorage
- [ ] Filtro por nome (tempo real) e por código de barras
- [ ] Badge de alerta vermelho em itens com `quantity <= minimumAlert`

**Critérios de aceite:**
- [ ] Dashboard com 4 indicadores (item 30)
- [ ] Inventário filtrável por nome E por código de barras (item 31)
- [ ] Alternância galeria/lista funcional (item 31)
- [ ] Alerta de estoque mínimo visível (item 31)

---

### Story 3.3 · Detalhamento, Edição e Movimentação de Itens (REQ-32, 33)

**Como** operador de estoque,
**quero** cadastrar itens, editá-los e registrar movimentações de entrada e saída,
**para que** o estoque reflita a realidade física.

**Tarefas:**
- [ ] Implementar: getStockItemById, createStockItem, moveStock, listStockMovements, listStorageLocations, createStorageLocation
- [ ] `GET/POST /api/stock/items` + `GET/PATCH /api/stock/items/:id`
- [ ] `POST /api/stock/movements` + `GET /api/stock/movements`
- [ ] `GET/POST /api/stock/locations`
- [ ] Página `/stock/items/:id` com: foto, nome, quantidade, unidade, valor unitário, valor total, alerta mínimo, local de armazenamento, **QR-code gerado** (lib `qrcode`), **código de barras exibido** (lib `jsbarcode`)
- [ ] Formulário de criação/edição com upload de foto (S3)
- [ ] Modal "Movimentar Estoque": tipo (ENTRADA/SAÍDA), quantidade, local destino
- [ ] Página `/stock/movements` com histórico: tipo, item, quantidade, valor, usuário, data/hora
- [ ] Gestão de locais de armazenamento (CRUD simples)

**Critérios de aceite:**
- [ ] QR-code exibido na página do item (item 32)
- [ ] Código de barras exibido na página do item (item 32)
- [ ] Histórico de movimentações com usuário, ação e valores (item 33)
- [ ] Alerta mínimo configurável por item (item 32)

---

### Story 3.4 · Painel Gerencial, Curva ABC e Recomendações (REQ-34–38)

**Como** gestor estratégico,
**quero** visualizar análises avançadas do estoque com Curva ABC e recomendações automáticas,
**para que** decisões de compra sejam baseadas em dados.

**Tarefas:**
- [ ] Implementar `getStockAnalytics(period)` conforme PRD
- [ ] `GET /api/stock/analytics?period=` — calcula e retorna: topMovedItems, zeroMovementItems, frozenStockValue, avgConsumptionBySecretary, atypicalMovements, abcDistribution, recommendations
- [ ] Algoritmo Curva ABC: classifica itens por valor acumulado (A=80%, B=15%, C=5%) e atualiza `abcClass` no banco
- [ ] Página `/stock/analytics` com:
  - Gráfico de barras: top 10 itens mais movimentados
  - Tabela de itens sem movimentação (estoque parado)
  - Card: valor de estoque parado em R$
  - Gráfico de barras: consumo médio por secretaria
  - Tabela: movimentações atípicas (desvio > 2σ)
  - Gráfico de pizza: distribuição Curva ABC (A/B/C com %)
  - Lista de recomendações gerenciais geradas automaticamente
- [ ] Filtro de período: SEMANAL / MENSAL / TRIMESTRAL / ANUAL
- [ ] Job agendado (cron): recalcular Curva ABC semanalmente
- [ ] Job agendado: enviar resumo semanal por e-mail (REQ-38) com: top movimentados, alertas de estoque baixo, recomendações

**Critérios de aceite:**
- [ ] Curva ABC calculada e exibida com distribuição % (item 34, 36)
- [ ] Indicadores de giro e estoque parado visíveis (item 35)
- [ ] Recomendações automáticas geradas (item 37)
- [ ] Resumo semanal configurável (item 38)
- [ ] Filtro de período altera todos os gráficos (item 34)

---

### Story 3.5 · Módulo Financeiro — Faturas e Faturamento (REQ-41)

**Como** gestor financeiro,
**quero** acompanhar faturas, status de pagamento e histórico financeiro,
**para que** o controle de custos do contrato seja preciso.

**Tarefas:**
- [ ] Implementar `financial.service.ts` completo conforme PRD
- [ ] `GET /api/financial/summary?from=&to=` — resumo financeiro do período
- [ ] `GET/POST /api/financial/invoices` + `GET /api/financial/invoices/:id/pdf` + `POST /api/financial/invoices/:id/proof`
- [ ] Página `/financial` com:
  - Cards: total faturado, total líquido, total pago (com cores distintas)
  - Listagem de faturas com status colorido: PAID=verde / OVERDUE=vermelho / PARTIALLY_PAID=amarelo / PENDING=cinza
  - Filtros: secretaria, status, período
- [ ] Página `/financial/invoices/:id` com: todos os itens da fatura (orderId, itemName, quantity, unitPrice, total), totalizadores, botão "Visualizar PDF" e "Imprimir"
- [ ] Geração de PDF da fatura (puppeteer ou @react-pdf/renderer)
- [ ] Upload de comprovante de pagamento (S3 via axios multipart)
- [ ] Gráfico de barras: consumo por secretaria no período

**Critérios de aceite:**
- [ ] Filtro por período funcional (item 41)
- [ ] Totalizadores: faturado, líquido, pago visíveis (item 41)
- [ ] Fatura com todos os itens de cada pedido (item 41)
- [ ] Status com cores distintas (item 41)
- [ ] PDF da fatura visualizável e imprimível (item 41)
- [ ] Upload de comprovante funcional (item 41)
- [ ] Gráfico de consumo por secretaria (item 41)

---

### Story 3.6 · Gestão Orçamentária — Contrato, Empenhos e Aditivos (REQ-45, 46, 47)

**Como** gestor do contrato,
**quero** controlar o orçamento do contrato com empenhos e aditivos protegidos por 2FA,
**para que** o uso dos recursos seja rastreável e seguro.

**Tarefas:**
- [ ] Implementar `budget.service.ts` completo conforme PRD
- [ ] `GET /api/budget/contracts/:id` — retorna contrato com additives e commitments
- [ ] `POST /api/budget/contracts/:id/additives` — exige otpCode + otpToken (integrado com Story 1.7)
- [ ] `POST /api/budget/contracts/:id/commitments` — exige otpCode + otpToken
- [ ] Página `/budget` com:
  - Card: valor inicial do contrato, total de aditivos, valor atual, % contratado, % consumido
  - Barras de progresso: valor distribuído a secretarias / alocado via empenho / consumido em pedidos
  - Seção "Aditivos": lista histórica + formulário de novo aditivo (valor, descrição, upload de arquivo, 2FA)
  - Seção "Empenhos": lista por secretaria (valor, % utilizado, status, arquivo) + formulário de novo empenho (secretaria, valor, upload, 2FA)
- [ ] Download de arquivo em empenhos e aditivos

**Critérios de aceite:**
- [ ] Valor inicial e aditivos aprovados visíveis (item 45)
- [ ] Valores disponíveis vs alocados por secretaria (item 45)
- [ ] % contratado e % consumido visíveis (item 45)
- [ ] Campo de cadastro de aditivo com upload de arquivo (item 45)
- [ ] Histórico de empenhos com download do arquivo (item 46)
- [ ] 2FA exigido para empenho e aditivo (item 47)

---

## Ordem de execução das stories

```
3.1 (schema) → 3.2 → 3.3 → 3.4 (em sequência — cada uma depende da anterior)
             → 3.5 (pode rodar em paralelo com 3.2/3.3)
             → 3.6 (pode rodar em paralelo com 3.5, requer Story 1.7 do EPIC-1)
```
