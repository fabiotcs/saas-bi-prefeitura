# EPIC-2 · Core Business — Secretarias, Ordens de Serviço e Auditoria

**Status:** Draft
**Wave:** 2 (requer EPIC-1 concluído)
**Módulos PRD:** MOD-03 · MOD-06 · MOD-08
**REQs cobertos:** REQ-03, REQ-04, REQ-05, REQ-06, REQ-16, REQ-17, REQ-18, REQ-19, REQ-20, REQ-22, REQ-23, REQ-24, REQ-25, REQ-26, REQ-27, REQ-28, REQ-29, REQ-39, REQ-40
**Checklist PoC:** Itens 03, 04, 05, 06, 16, 17, 18, 19, 20, 22, 23, 24, 25, 26, 27, 28, 29, 39, 40

---

## Objetivo

Implementar os módulos de negócio central: gestão de secretarias municipais com controle orçamentário, o ciclo completo de Ordens de Serviço (criação → cotação → recebimento → aprovação → conclusão), e o módulo de auditoria com imutabilidade de logs garantida por banco de dados.

## Critério de Conclusão do Epic

- CRUD de secretarias com validação de CNPJ e barra de progresso orçamentário
- Ciclo completo de OS demonstrável do início ao fim
- Chat em tempo real funcional
- PDF com checkboxes digitais gerado
- Logs de auditoria registrando todas as ações, imutáveis

---

## Stories

### Story 2.1 · Schema do Banco — Módulos 3, 6 e 8

**Como** desenvolvedor,
**quero** o schema completo de Secretarias, OS e Auditoria,
**para que** todos os dados do core business sejam persistidos corretamente.

**Tarefas:**
- [ ] Schema Prisma: `Secretary` (id, name, phone, cnpj, description, secretaryPersonName, budgetAllocated, budgetUsed, parentId, createdAt)
- [ ] Schema Prisma: `Order` (id, code, name, category, status, secretaryId, subSecretaryId, investmentArea, quotationStartDate, quotationEndDate, desiredDeliveryDate, regionRadius, specificMunicipality, receiverName, observations, createdByUserId, createdAt)
- [ ] Schema Prisma: `OrderItem` (id, orderId, name, imageUrl, unit, quantity, referenceValue)
- [ ] Schema Prisma: `OrderTimeline` (id, orderId, step, userId, occurredAt)
- [ ] Schema Prisma: `DeliveryRecord` (id, orderId, images[], deliveredByUserId, receivedByUserId, deliveredAt, receivedAt, observations)
- [ ] Schema Prisma: `NonConformity` (id, orderId, images[], registeredByUserId, registeredAt, observations)
- [ ] Schema Prisma: `OrderInvoice` (id, orderId, fileUrl, establishmentName, issuedAt)
- [ ] Schema Prisma: `ChatMessage` (id, orderId, senderId, content, imageUrl, sentAt, senderType)
- [ ] Schema Prisma: `DeliveryLocation` (id, orderId, name, zipCode, address, city, state)
- [ ] Migration + gerador de código de OS (ex: `OS-2026-0001`)
- [ ] Trigger de auditoria automática: toda INSERT/UPDATE em tabelas críticas registra em `AuditLog`

**Critérios de aceite:**
- [ ] Migration executa sem erros
- [ ] Código de OS gerado automaticamente e único
- [ ] Trigger de auditoria ativa para tabelas Order, Secretary, User

---

### Story 2.2 · CRUD de Secretarias (REQ-03, 04, 05)

**Como** gestor principal,
**quero** cadastrar e gerenciar secretarias municipais,
**para que** os pedidos sejam vinculados às unidades administrativas corretas.

**Tarefas:**
- [ ] Implementar `secretary.service.ts` completo conforme PRD (listSecretaries, createSecretary, updateSecretary, deleteSecretary)
- [ ] `GET/POST /api/secretaries` + `PATCH/DELETE /api/secretaries/:id`
- [ ] Página `/secretaries` com listagem em cards/tabela: nome, CNPJ, secretário, subsecretarias, pedidos, barra de progresso orçamentário
- [ ] Busca por nome (filtro em tempo real)
- [ ] Formulário de criação/edição: nome, telefone, CNPJ (máscara + validação dígito), descrição, nome do secretário
- [ ] Validação: impedir nome duplicado (erro amigável "Secretaria já cadastrada")
- [ ] Upload de foto dos responsáveis (S3 via axios multipart)
- [ ] Componente `<BudgetProgressBar>` reutilizável (% + R$, cor varia por %)
- [ ] Gestão de subsecretarias (vínculo com secretaria pai)

**Critérios de aceite:**
- [ ] CNPJ com máscara XX.XXX.XXX/XXXX-XX e validação de dígito verificador (item 4)
- [ ] Nome duplicado retorna erro amigável (item 5)
- [ ] Barra de progresso visual com % e R$ (item 5)
- [ ] Foto dos responsáveis exibida (item 5)

---

### Story 2.3 · Resumo Financeiro por Secretaria (REQ-06)

**Como** gestor financeiro,
**quero** ver o resumo financeiro detalhado de cada secretaria,
**para que** eu acompanhe empenhos, pedidos e distribuição para subsecretarias.

**Tarefas:**
- [ ] `GET /api/secretaries/:id/financial-summary` conforme `SecretaryFinancialSummary` do PRD
- [ ] Painel lateral ou página `/secretaries/:id/financial` com: valor por empenho, valor utilizado em pedidos, valor distribuído a subsecretarias
- [ ] Gráfico de barras comparando os três valores

**Critérios de aceite:**
- [ ] Três campos financeiros (budgetByCommitment, usedInOrders, distributedToSub) visíveis (item 6)
- [ ] Dados consistentes com os empenhos registrados no EPIC-3

---

### Story 2.4 · Listagem e Abertura de OS (REQ-16, 17, 18)

**Como** usuário autorizado,
**quero** listar ordens de serviço e abrir novas,
**para que** o processo de compras seja iniciado com todos os dados necessários.

**Tarefas:**
- [ ] Implementar `order.service.ts`: listOrders, createOrder, getOrderById, searchItems
- [ ] `GET/POST /api/orders` + `GET /api/orders/:id`
- [ ] `GET /api/items/search?q=` com autocomplete (busca em catálogo de itens + valor de referência + imagem)
- [ ] Página `/orders` com listagem: código OS, status (badge colorido), secretaria, criador (foto + nome), data, melhor oferta, qtd propostas, ações
- [ ] Filtros: código, status, secretaria, paginação
- [ ] Formulário de criação `/orders/new` com todos os 13 campos do item 17:
  - nome, categoria, período de cotação (data início/fim), secretaria, subsecretaria
  - área de investimento, data desejada de entrega
  - local de entrega (nome, CEP, endereço, cidade, estado) com busca por CEP via ViaCEP
  - nome do responsável pelo recebimento
  - itens (pesquisa inteligente: autocomplete com imagem + valor de referência + unidade + quantidade)
  - observações, raio de busca de estabelecimentos (km) ou município específico
- [ ] Campo de adição de múltiplos itens dinamicamente

**Critérios de aceite:**
- [ ] Listagem com todos os campos (a–i) do item 16 visíveis
- [ ] Formulário com todos os 13 campos (a–m) do item 17 funcionais
- [ ] Pesquisa inteligente de itens com autocomplete + imagem + valor de referência (item 18)

---

### Story 2.5 · Visão Completa da OS, Aprovação e PDF (REQ-19, 20, 21, 28)

**Como** gestor,
**quero** ver todos os detalhes de uma OS, aprovar com 2FA e gerar PDF,
**para que** o processo de aprovação seja seguro e rastreável.

**Tarefas:**
- [ ] Página `/orders/:id` com visão completa: dados gerais, itens, timeline (linha do tempo vertical), notas fiscais, registros de entrega, não conformidades
- [ ] Componente `<OrderTimeline>` — exibe cada etapa com data, hora, usuário e foto
- [ ] Seção de notas fiscais: lista de NFs com estabelecimento, data e link para visualizar arquivo
- [ ] Botão "Aprovar OS" — abre `<TwoFactorModal>` (Story 1.7), chama `POST /api/orders/:id/approve`
- [ ] `POST /api/orders/:id/print` — gera PDF com: dados da OS, tabela de itens com checkboxes digitais, linha do tempo, assinaturas
- [ ] Geração de PDF via `@react-pdf/renderer` ou `puppeteer`
- [ ] Checkboxes no PDF são digitais (marcáveis antes de imprimir)

**Critérios de aceite:**
- [ ] Timeline visível com todos os passos (item 19)
- [ ] Notas fiscais listadas na OS (item 20)
- [ ] 2FA exigido ao aprovar OS (item 21)
- [ ] PDF gerado com checkboxes digitais (item 28)

---

### Story 2.6 · Recebimento, Não Conformidades e Fotos (REQ-22–27)

**Como** responsável pelo recebimento,
**quero** confirmar entrega ou registrar problemas com fotos,
**para que** o histórico físico do pedido fique documentado.

**Tarefas:**
- [ ] `POST /api/orders/:id/confirm-delivery` — upload multipart de fotos + observações (conforme PRD)
- [ ] `POST /api/orders/:id/non-conformities` — upload multipart de fotos + observações obrigatórias
- [ ] Componente `<PhotoUploader>` — seleção múltipla de fotos, preview, upload para S3
- [ ] Modal "Confirmar Recebimento": campo de observações + upload de fotos + botão confirmar
- [ ] Modal "Registrar Não Conformidade": observações obrigatórias + upload de fotos
- [ ] Registro automático: data/hora do servidor + userId do usuário logado
- [ ] Seção na página da OS exibindo todos os registros de entrega e não conformidades com fotos

**Critérios de aceite:**
- [ ] Upload de fotos funcional no recebimento (item 22)
- [ ] Data, hora e responsável registrados automaticamente (item 23)
- [ ] Campo de observações funcional no recebimento (item 24)
- [ ] Não conformidades com fotos (item 25)
- [ ] Registro automático nas não conformidades (item 26)
- [ ] Observações nas não conformidades (item 27)

---

### Story 2.7 · Chat em Tempo Real na OS (REQ-29)

**Como** usuário da prefeitura ou estabelecimento,
**quero** trocar mensagens em tempo real dentro da OS,
**para que** dúvidas e negociações sejam registradas no contexto do pedido.

**Tarefas:**
- [ ] Implementar `chat.service.ts`: listMessages, sendMessage (conforme PRD)
- [ ] `GET /api/orders/:id/chat` + `POST /api/orders/:id/chat` (multipart para imagens)
- [ ] WebSocket ou SSE para entrega em tempo real (usar `socket.io` ou Next.js SSE Route Handler)
- [ ] Componente `<OrderChat>` — exibe histórico de mensagens com foto do remetente, hora, lado (prefeitura / estabelecimento)
- [ ] Input com botão de envio de texto + botão de upload de imagem
- [ ] Preview da imagem antes de enviar
- [ ] Badge de mensagens não lidas na listagem de OS

**Critérios de aceite:**
- [ ] Mensagem enviada aparece em tempo real para ambos os lados (item 29)
- [ ] Envio de imagem funcional (item 29)
- [ ] Foto e nome do remetente exibidos em cada mensagem

---

### Story 2.8 · Módulo de Auditoria e Logs Imutáveis (REQ-39, 40)

**Como** auditor ou órgão de controle,
**quero** visualizar todos os logs de ação do sistema,
**para que** qualquer operação seja rastreável e os registros sejam imutáveis.

**Tarefas:**
- [ ] Implementar `audit.service.ts`: listAuditLogs (conforme PRD)
- [ ] `GET /api/audit/logs` com filtros: userId, status, from, to, paginação
- [ ] `DELETE /api/audit/logs/:id` → retorna **403 Forbidden** para qualquer usuário
- [ ] `PATCH /api/audit/logs/:id` → retorna **403 Forbidden** para qualquer usuário
- [ ] Middleware de auditoria automática: registra todas as requisições autenticadas em `AuditLog`
- [ ] Página `/audit/logs` com tabela cronológica: foto do usuário, nome, ação, URL, IP, status (badge colorido), data/hora
- [ ] Filtro por status: SUCCESS / FAILED / SUSPICIOUS
- [ ] Filtro por período e usuário

**Critérios de aceite:**
- [ ] Todas as ações registradas automaticamente (item 39)
- [ ] Foto do usuário visível em cada log (item 39)
- [ ] Filtro por status funcional (item 39)
- [ ] `DELETE /api/audit/logs/:id` retorna 403 (item 40)
- [ ] IP registrado em cada ação (item 39)

---

## Ordem de execução das stories

```
2.1 (schema) → 2.2 → 2.3 (em paralelo com 2.2)
             → 2.4 → 2.5 → 2.6 → 2.7 (em paralelo com 2.5/2.6)
             → 2.8 (pode rodar em paralelo desde o início após 2.1)
```
