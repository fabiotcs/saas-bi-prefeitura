# Dicionário de Dados — SaaS BI Prefeitura

**Banco de dados:** `saas_bi_prefeitura`
**SGBD:** PostgreSQL 16
**ORM:** Prisma
**Data de geração:** 25/03/2026

---

## Sumário

1. [Enumerações (ENUMs)](#1-enumerações-enums)
2. [Tabelas](#2-tabelas)
   - [BrandConfig](#21-brandconfig)
   - [User](#22-user)
   - [Session](#23-session)
   - [TwoFactorRequest](#24-twofactorrequest)
   - [AuditLog](#25-auditlog)
   - [BiometricRecord](#26-biometricrecord)
   - [Secretary](#27-secretary)
   - [Order](#28-order)
   - [OrderItem](#29-orderitem)
   - [OrderTimeline](#210-ordertimeline)
   - [DeliveryRecord](#211-deliveryrecord)
   - [NonConformity](#212-nonconformity)
   - [OrderInvoice](#213-orderinvoice)
   - [ChatMessage](#214-chatmessage)
   - [DeliveryLocation](#215-deliverylocation)
   - [StorageLocation](#216-storagelocation)
   - [StockItem](#217-stockitem)
   - [StockMovement](#218-stockmovement)
   - [Invoice](#219-invoice)
   - [InvoiceItem](#220-invoiceitem)
   - [PaymentHistory](#221-paymenthistory)
   - [BudgetContract](#222-budgetcontract)
   - [BudgetAdditive](#223-budgetadditive)
   - [BudgetCommitment](#224-budgetcommitment)
   - [Establishment](#225-establishment)
   - [EstablishmentFavorite](#226-establishmentfavorite)
   - [SystemSettings](#227-systemsettings)
   - [ApiKey](#228-apikey)
   - [ApiCallLog](#229-apicalllog)
3. [Views](#3-views)
4. [Functions e Procedures](#4-functions-e-procedures)
5. [Triggers](#5-triggers)
6. [Diagrama de Relacionamentos](#6-diagrama-de-relacionamentos)

---

## 1. Enumerações (ENUMs)

Enumerações são tipos fixos de valores aceitos em determinadas colunas.

| Enum | Valores | Descrição |
|------|---------|-----------|
| `UserRole` | `MAIN_MANAGER`, `SECRETARY_MANAGER`, `SECRETARY_USER`, `AUDIT_VIEWER` | Perfil de acesso do usuário no sistema |
| `AuditStatus` | `SUCCESS`, `FAILED`, `SUSPICIOUS` | Resultado de uma ação registrada no log de auditoria |
| `FraudAlertLevel` | `NONE`, `LOW`, `MEDIUM`, `HIGH` | Nível de alerta de fraude detectado na verificação biométrica |
| `BiometricStatus` | `SUCCESS`, `FAILED`, `SUSPICIOUS` | Resultado da verificação biométrica |
| `TwoFactorAction` | `APPROVE_ORDER`, `SUBMIT_COMMITMENT`, `SUBMIT_ADDITIVE` | Ação que exige confirmação via segundo fator (OTP) |
| `StockMovementType` | `IN`, `OUT`, `TRANSFER` | Tipo de movimentação de estoque |
| `AbcClass` | `A`, `B`, `C` | Classificação ABC de itens de estoque por importância/giro |
| `InvoiceStatus` | `PENDING`, `PARTIALLY_PAID`, `PAID`, `OVERDUE` | Status de pagamento de uma fatura |
| `BudgetCommitmentStatus` | `ACTIVE`, `CONSUMED`, `CANCELLED` | Status do empenho orçamentário |
| `EstablishmentStatus` | `ACTIVE`, `INACTIVE`, `SUSPENDED` | Situação do estabelecimento credenciado |
| `BillingMode` | `CENTRALIZED`, `DECENTRALIZED` | Modo de faturamento: centralizado (prefeitura) ou descentralizado (por secretaria) |
| `OrderStatus` | `DRAFT`, `OPEN`, `IN_QUOTATION`, `APPROVED`, `DELIVERED`, `COMPLETED`, `CANCELLED` | Status da ordem de serviço/compra |
| `OrderCategory` | `MATERIAL`, `SERVICE`, `EQUIPMENT` | Categoria do pedido |
| `ChatSenderType` | `PREFECTURE`, `ESTABLISHMENT` | Identificação do remetente no chat da ordem |
| `TimelineStep` | `CREATED`, `QUOTATION_OPENED`, `QUOTATION_CLOSED`, `APPROVED`, `DELIVERED`, `COMPLETED`, `CANCELLED` | Etapas da linha do tempo de uma ordem |

---

## 2. Tabelas

### 2.1 BrandConfig

**Descrição:** Armazena a identidade visual personalizada do município (logotipo, cores, nome). Existe apenas um registro ativo por instalação.

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | UUID | NÃO | `uuid()` | Identificador único do registro |
| `logoUrl` | TEXT | NÃO | — | URL do logotipo do município |
| `primaryColor` | TEXT | NÃO | `#1E40AF` | Cor primária da interface (hex) |
| `secondaryColor` | TEXT | NÃO | `#1E3A8A` | Cor secundária da interface (hex) |
| `faviconUrl` | TEXT | NÃO | — | URL do favicon da aplicação |
| `municipalityName` | TEXT | NÃO | `Prefeitura Municipal de Araçuaí` | Nome do município exibido na interface |
| `createdAt` | TIMESTAMP | NÃO | `now()` | Data/hora de criação do registro |
| `updatedAt` | TIMESTAMP | NÃO | auto | Data/hora da última atualização |

**Relacionamentos:** Nenhum.

---

### 2.2 User

**Descrição:** Usuários do sistema. Cada usuário possui um perfil de acesso (role) e pode estar vinculado a uma secretaria. Concentra dados pessoais, de autenticação e verificação biométrica.

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | UUID | NÃO | `uuid()` | Identificador único do usuário |
| `fullName` | TEXT | NÃO | — | Nome completo |
| `birthDate` | TIMESTAMP | NÃO | — | Data de nascimento |
| `phone` | TEXT | NÃO | — | Telefone de contato |
| `email` | TEXT | NÃO | — | E-mail (único no sistema, usado para login) |
| `cpf` | TEXT | NÃO | — | CPF do usuário (único no sistema) |
| `rg` | TEXT | NÃO | — | RG do usuário |
| `role` | `UserRole` | NÃO | — | Perfil de acesso: `MAIN_MANAGER`, `SECRETARY_MANAGER`, `SECRETARY_USER`, `AUDIT_VIEWER` |
| `secretaryId` | UUID | SIM | — | FK para `Secretary`. Vínculo do usuário com uma secretaria |
| `photoUrl` | TEXT | SIM | — | URL da foto de perfil |
| `lastLogin` | TIMESTAMP | SIM | — | Data/hora do último login realizado |
| `biometricVerified` | BOOLEAN | NÃO | `false` | Indica se a verificação biométrica foi concluída com sucesso |
| `documentVerified` | BOOLEAN | NÃO | `false` | Indica se o documento de identidade foi verificado |
| `approvalLimit` | FLOAT | NÃO | `0` | Valor máximo (R$) que o usuário pode aprovar em pedidos |
| `documentPhotoUrl` | TEXT | SIM | — | URL da foto do documento (RG/CNH) enviado |
| `passwordHash` | TEXT | NÃO | — | Hash bcrypt da senha do usuário |
| `createdAt` | TIMESTAMP | NÃO | `now()` | Data/hora de criação da conta |
| `updatedAt` | TIMESTAMP | NÃO | auto | Data/hora da última atualização |

**Índices:** `email`, `secretaryId`

**Relacionamentos:**
- Pertence a uma `Secretary` (opcional)
- Possui muitas `Session`
- Possui muitos `TwoFactorRequest`
- Possui muitos `AuditLog`
- Possui muitos `BiometricRecord`
- Criou muitos `Order`
- Registrou entradas em `OrderTimeline`
- Recebeu `DeliveryRecord`
- Registrou `NonConformity`
- Enviou `ChatMessage`
- Realizou `StockMovement`
- Aprovou `BudgetAdditive`
- Registrou `BudgetCommitment`
- Possui `EstablishmentFavorite`
- Criou `ApiKey`

---

### 2.3 Session

**Descrição:** Sessões ativas de autenticação dos usuários. Controla tokens de refresh e metadados de acesso.

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | UUID | NÃO | `uuid()` | Identificador único da sessão |
| `userId` | UUID | NÃO | — | FK para `User`. Usuário dono da sessão |
| `refreshToken` | TEXT | NÃO | — | Token de refresh (único). Usado para renovar o JWT de acesso |
| `expiresAt` | TIMESTAMP | NÃO | — | Data/hora de expiração do refresh token |
| `ipAddress` | TEXT | NÃO | — | IP de origem da sessão |
| `userAgent` | TEXT | NÃO | — | User-agent do navegador/dispositivo |
| `createdAt` | TIMESTAMP | NÃO | `now()` | Data/hora de criação da sessão |

**Relacionamentos:** Pertence a um `User`.

---

### 2.4 TwoFactorRequest

**Descrição:** Requisições de segundo fator de autenticação (OTP). Geradas antes de ações críticas como aprovação de pedidos e empenhos.

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | UUID | NÃO | `uuid()` | Identificador único da requisição |
| `userId` | UUID | NÃO | — | FK para `User`. Usuário que solicitou o 2FA |
| `action` | `TwoFactorAction` | NÃO | — | Ação que requer validação: `APPROVE_ORDER`, `SUBMIT_COMMITMENT`, `SUBMIT_ADDITIVE` |
| `otpHash` | TEXT | NÃO | — | Hash do código OTP gerado |
| `expiresAt` | TIMESTAMP | NÃO | — | Data/hora de expiração do OTP |
| `used` | BOOLEAN | NÃO | `false` | Indica se o OTP já foi utilizado |
| `failCount` | INT | NÃO | `0` | Contador de tentativas erradas |
| `blockedUntil` | TIMESTAMP | SIM | — | Data/hora até quando novas tentativas estão bloqueadas |
| `createdAt` | TIMESTAMP | NÃO | `now()` | Data/hora de criação da requisição |

**Relacionamentos:** Pertence a um `User`.

---

### 2.5 AuditLog

**Descrição:** Log imutável de auditoria. Registra todas as ações relevantes do sistema (login, criação, aprovação, falhas etc.). Registros não podem ser alterados ou excluídos (protegido por trigger).

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | UUID | NÃO | `uuid()` | Identificador único do log |
| `action` | TEXT | NÃO | — | Nome da ação realizada (ex: `AUTH_LOGIN_FAILED`, `INSERT_ORDER`) |
| `urlPath` | TEXT | NÃO | — | Endpoint ou caminho da ação |
| `userId` | UUID | SIM | — | FK para `User`. Usuário que realizou a ação (null para ações do sistema) |
| `userAgent` | TEXT | NÃO | — | User-agent do cliente |
| `ipAddress` | TEXT | NÃO | — | IP de origem da ação |
| `status` | `AuditStatus` | NÃO | — | Resultado: `SUCCESS`, `FAILED`, `SUSPICIOUS` |
| `metadata` | JSON | SIM | — | Dados adicionais em JSON (ex: campos alterados, contexto da ação) |
| `occurredAt` | TIMESTAMP | NÃO | `now()` | Data/hora da ocorrência |

**Índices:** `userId`, `status`, `occurredAt`

**Restrição:** Imutável — UPDATE e DELETE bloqueados por trigger.

**Relacionamentos:** Pertence a um `User` (opcional).

---

### 2.6 BiometricRecord

**Descrição:** Histórico de verificações biométricas realizadas. Armazena scores de similaridade facial, vivacidade (liveness), estimativas de IA e nível de alerta de fraude. Registros são imutáveis.

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | UUID | NÃO | `uuid()` | Identificador único do registro |
| `userId` | UUID | NÃO | — | FK para `User`. Usuário verificado |
| `capturedImageUrl` | TEXT | NÃO | — | URL da imagem capturada na verificação |
| `documentPhotoUrl` | TEXT | SIM | — | URL da foto do documento usado na comparação |
| `similarityScore` | FLOAT | NÃO | — | Score de similaridade facial (0 a 1) |
| `livenessScore` | FLOAT | NÃO | — | Score de vivacidade/anti-spoofing (0 a 1) |
| `confidenceLevel` | FLOAT | NÃO | — | Nível de confiança geral da verificação (0 a 1) |
| `fraudAlertLevel` | `FraudAlertLevel` | NÃO | — | Nível de alerta: `NONE`, `LOW`, `MEDIUM`, `HIGH` |
| `aiEstimatedAge` | INT | SIM | — | Idade estimada pela IA |
| `aiEstimatedGender` | TEXT | SIM | — | Gênero estimado pela IA |
| `documentMatch` | BOOLEAN | NÃO | `false` | Indica se a face corresponde ao documento apresentado |
| `ipAddress` | TEXT | NÃO | — | IP de origem da verificação |
| `status` | `BiometricStatus` | NÃO | — | Resultado: `SUCCESS`, `FAILED`, `SUSPICIOUS` |
| `createdAt` | TIMESTAMP | NÃO | `now()` | Data/hora da verificação |

**Índices:** `userId`, `status`, `createdAt`

**Restrição:** Imutável — UPDATE e DELETE bloqueados por trigger.

**Relacionamentos:** Pertence a um `User`.

---

### 2.7 Secretary

**Descrição:** Secretarias municipais. Suporta hierarquia (secretaria-mãe e subsecretarias) via auto-relacionamento. Controla orçamento alocado e utilizado.

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | UUID | NÃO | `uuid()` | Identificador único da secretaria |
| `name` | TEXT | NÃO | — | Nome da secretaria (único no sistema) |
| `phone` | TEXT | NÃO | — | Telefone de contato |
| `cnpj` | TEXT | NÃO | — | CNPJ da secretaria (único no sistema) |
| `description` | TEXT | SIM | — | Descrição da secretaria |
| `secretaryPersonName` | TEXT | NÃO | — | Nome do responsável/secretário |
| `photoUrl` | TEXT | SIM | — | URL da foto do responsável |
| `budgetAllocated` | FLOAT | NÃO | `0` | Valor total alocado de orçamento (R$) |
| `budgetUsed` | FLOAT | NÃO | `0` | Valor já utilizado do orçamento (R$) |
| `parentId` | UUID | SIM | — | FK para `Secretary`. ID da secretaria-mãe (null = secretaria raiz) |
| `createdAt` | TIMESTAMP | NÃO | `now()` | Data/hora de criação |
| `updatedAt` | TIMESTAMP | NÃO | auto | Data/hora da última atualização |

**Índices:** `parentId`

**Relacionamentos:**
- Pertence a uma `Secretary` (secretaria-mãe, opcional)
- Possui muitas `Secretary` (subsecretarias)
- Possui muitos `User`
- Possui muitas `Order`
- Possui muitas `Invoice`
- Possui muitos `BudgetCommitment`
- Possui muitos `StorageLocation`

---

### 2.8 Order

**Descrição:** Ordens de serviço ou compra emitidas pelas secretarias. Representa o ciclo completo de uma demanda: da criação ao recebimento e conclusão.

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | UUID | NÃO | `uuid()` | Identificador único da ordem |
| `code` | TEXT | NÃO | — | Código único gerado automaticamente (formato: `OS-AAAA-NNNN`) |
| `name` | TEXT | NÃO | — | Descrição/nome da ordem |
| `category` | `OrderCategory` | NÃO | — | Categoria: `MATERIAL`, `SERVICE`, `EQUIPMENT` |
| `status` | `OrderStatus` | NÃO | `DRAFT` | Status atual: `DRAFT`, `OPEN`, `IN_QUOTATION`, `APPROVED`, `DELIVERED`, `COMPLETED`, `CANCELLED` |
| `secretaryId` | UUID | NÃO | — | FK para `Secretary`. Secretaria solicitante |
| `subSecretaryId` | UUID | SIM | — | FK para `Secretary`. Subsecretaria solicitante (opcional) |
| `investmentArea` | TEXT | NÃO | — | Área de investimento da ordem |
| `quotationStartDate` | TIMESTAMP | SIM | — | Data de início do período de cotação |
| `quotationEndDate` | TIMESTAMP | SIM | — | Data de encerramento do período de cotação |
| `desiredDeliveryDate` | TIMESTAMP | SIM | — | Data desejada para entrega |
| `regionRadius` | INT | SIM | — | Raio geográfico (km) para busca de fornecedores |
| `specificMunicipality` | TEXT | SIM | — | Município específico para atendimento |
| `receiverName` | TEXT | NÃO | — | Nome do responsável pelo recebimento |
| `observations` | TEXT | SIM | — | Observações gerais da ordem |
| `createdByUserId` | UUID | NÃO | — | FK para `User`. Usuário que criou a ordem |
| `createdAt` | TIMESTAMP | NÃO | `now()` | Data/hora de criação |
| `updatedAt` | TIMESTAMP | NÃO | auto | Data/hora da última atualização |

**Índices:** `secretaryId`, `status`, `createdByUserId`, `code`

**Restrição:** Campos `name`, `category` e `secretaryId` são imutáveis quando status é `APPROVED`, `DELIVERED` ou `COMPLETED` (protegido por trigger).

**Relacionamentos:**
- Pertence a uma `Secretary`
- Pertence a uma `Secretary` (subsecretaria, opcional)
- Pertence a um `User` (criador)
- Possui muitos `OrderItem`
- Possui muitos `OrderTimeline`
- Possui muitos `DeliveryRecord`
- Possui muitos `NonConformity`
- Possui muitos `OrderInvoice`
- Possui muitos `ChatMessage`
- Possui muitos `DeliveryLocation`

---

### 2.9 OrderItem

**Descrição:** Itens que compõem uma ordem. Cada item representa um produto ou serviço com quantidade e valor de referência.

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | UUID | NÃO | `uuid()` | Identificador único do item |
| `orderId` | UUID | NÃO | — | FK para `Order`. Ordem à qual o item pertence |
| `name` | TEXT | NÃO | — | Nome/descrição do item |
| `imageUrl` | TEXT | SIM | — | URL de imagem ilustrativa do item |
| `unit` | TEXT | NÃO | — | Unidade de medida (ex: un, kg, L, m²) |
| `quantity` | FLOAT | NÃO | — | Quantidade solicitada |
| `referenceValue` | FLOAT | NÃO | — | Valor unitário de referência (R$) |

**Índices:** `orderId`

**Cascade:** Excluído automaticamente ao excluir a ordem.

**Relacionamentos:** Pertence a uma `Order`.

---

### 2.10 OrderTimeline

**Descrição:** Histórico de etapas da ordem. Cada registro representa uma mudança de estado na linha do tempo da ordem.

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | UUID | NÃO | `uuid()` | Identificador único da entrada |
| `orderId` | UUID | NÃO | — | FK para `Order` |
| `step` | `TimelineStep` | NÃO | — | Etapa registrada: `CREATED`, `QUOTATION_OPENED`, `QUOTATION_CLOSED`, `APPROVED`, `DELIVERED`, `COMPLETED`, `CANCELLED` |
| `userId` | UUID | NÃO | — | FK para `User`. Usuário que gerou a transição |
| `occurredAt` | TIMESTAMP | NÃO | `now()` | Data/hora da ocorrência |

**Índices:** `orderId`

**Cascade:** Excluído automaticamente ao excluir a ordem.

**Relacionamentos:** Pertence a uma `Order` e a um `User`.

---

### 2.11 DeliveryRecord

**Descrição:** Registro de entregas realizadas para uma ordem. Pode conter fotos e observações do recebimento.

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | UUID | NÃO | `uuid()` | Identificador único do registro |
| `orderId` | UUID | NÃO | — | FK para `Order` |
| `images` | TEXT[] | NÃO | — | Lista de URLs de fotos da entrega |
| `deliveredByUserId` | UUID | SIM | — | ID do usuário/entregador (opcional) |
| `receivedByUserId` | UUID | NÃO | — | FK para `User`. Usuário que recebeu a entrega |
| `deliveredAt` | TIMESTAMP | SIM | — | Data/hora da entrega pelo fornecedor |
| `receivedAt` | TIMESTAMP | NÃO | `now()` | Data/hora do recebimento na prefeitura |
| `observations` | TEXT | SIM | — | Observações sobre a entrega |

**Índices:** `orderId`

**Cascade:** Excluído automaticamente ao excluir a ordem.

**Relacionamentos:** Pertence a uma `Order` e a um `User`.

---

### 2.12 NonConformity

**Descrição:** Registro de não conformidades identificadas em uma entrega. Documenta problemas com fotos e observações.

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | UUID | NÃO | `uuid()` | Identificador único |
| `orderId` | UUID | NÃO | — | FK para `Order` |
| `images` | TEXT[] | NÃO | — | Lista de URLs de fotos da não conformidade |
| `registeredByUserId` | UUID | NÃO | — | FK para `User`. Usuário que registrou |
| `registeredAt` | TIMESTAMP | NÃO | `now()` | Data/hora do registro |
| `observations` | TEXT | NÃO | — | Descrição detalhada da não conformidade |

**Índices:** `orderId`

**Cascade:** Excluído automaticamente ao excluir a ordem.

**Relacionamentos:** Pertence a uma `Order` e a um `User`.

---

### 2.13 OrderInvoice

**Descrição:** Notas fiscais vinculadas a uma ordem. Armazena o arquivo e dados básicos da nota emitida pelo estabelecimento.

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | UUID | NÃO | `uuid()` | Identificador único |
| `orderId` | UUID | NÃO | — | FK para `Order` |
| `fileUrl` | TEXT | NÃO | — | URL do arquivo da nota fiscal |
| `establishmentName` | TEXT | NÃO | — | Nome do estabelecimento emitente |
| `issuedAt` | TIMESTAMP | NÃO | — | Data de emissão da nota fiscal |

**Índices:** `orderId`

**Cascade:** Excluído automaticamente ao excluir a ordem.

**Relacionamentos:** Pertence a uma `Order`.

---

### 2.14 ChatMessage

**Descrição:** Mensagens do chat interno de uma ordem. Permite comunicação entre a prefeitura e o estabelecimento durante o ciclo da ordem.

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | UUID | NÃO | `uuid()` | Identificador único |
| `orderId` | UUID | NÃO | — | FK para `Order` |
| `senderId` | UUID | NÃO | — | FK para `User`. Usuário que enviou a mensagem |
| `content` | TEXT | SIM | — | Conteúdo textual da mensagem |
| `imageUrl` | TEXT | SIM | — | URL de imagem anexada (opcional) |
| `senderType` | `ChatSenderType` | NÃO | — | Tipo do remetente: `PREFECTURE` ou `ESTABLISHMENT` |
| `sentAt` | TIMESTAMP | NÃO | `now()` | Data/hora do envio |

**Índices:** `orderId`, `sentAt`

**Cascade:** Excluído automaticamente ao excluir a ordem.

**Relacionamentos:** Pertence a uma `Order` e a um `User`.

---

### 2.15 DeliveryLocation

**Descrição:** Locais de entrega vinculados a uma ordem. Uma ordem pode ter múltiplos endereços de entrega.

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | UUID | NÃO | `uuid()` | Identificador único |
| `orderId` | UUID | NÃO | — | FK para `Order` |
| `name` | TEXT | NÃO | — | Nome do local de entrega |
| `zipCode` | TEXT | NÃO | — | CEP do endereço |
| `address` | TEXT | NÃO | — | Logradouro e número |
| `city` | TEXT | NÃO | — | Cidade |
| `state` | TEXT | NÃO | — | Estado (sigla) |

**Índices:** `orderId`

**Cascade:** Excluído automaticamente ao excluir a ordem.

**Relacionamentos:** Pertence a uma `Order`.

---

### 2.16 StorageLocation

**Descrição:** Locais de armazenamento (depósitos, almoxarifados). Pode estar vinculado a uma secretaria específica.

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | UUID | NÃO | `uuid()` | Identificador único |
| `name` | TEXT | NÃO | — | Nome do local de armazenamento |
| `secretaryId` | UUID | SIM | — | FK para `Secretary`. Secretaria responsável (opcional) |
| `observations` | TEXT | SIM | — | Observações sobre o local |
| `createdAt` | TIMESTAMP | NÃO | `now()` | Data/hora de criação |
| `updatedAt` | TIMESTAMP | NÃO | auto | Data/hora da última atualização |

**Índices:** `secretaryId`

**Relacionamentos:**
- Pertence a uma `Secretary` (opcional)
- Possui muitos `StockItem`

---

### 2.17 StockItem

**Descrição:** Itens do estoque. Cada item possui quantidade atual, preço unitário, alerta de estoque mínimo e classificação ABC.

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | UUID | NÃO | `uuid()` | Identificador único |
| `name` | TEXT | NÃO | — | Nome do item |
| `imageUrl` | TEXT | SIM | — | URL de imagem do item |
| `quantity` | FLOAT | NÃO | `0` | Quantidade atual em estoque |
| `unit` | TEXT | NÃO | — | Unidade de medida |
| `unitPrice` | FLOAT | NÃO | `0` | Preço unitário (R$) |
| `minimumAlert` | FLOAT | NÃO | `0` | Quantidade mínima para disparo de alerta |
| `barcode` | TEXT | SIM | — | Código de barras do item |
| `qrCode` | TEXT | SIM | — | Código QR do item |
| `storageLocationId` | UUID | SIM | — | FK para `StorageLocation`. Local de armazenamento |
| `abcClass` | `AbcClass` | SIM | — | Classificação ABC: `A` (alto valor/giro), `B` (médio), `C` (baixo) |
| `createdAt` | TIMESTAMP | NÃO | `now()` | Data/hora de criação |
| `updatedAt` | TIMESTAMP | NÃO | auto | Data/hora da última atualização |

**Índices:** `storageLocationId`, `abcClass`

**Relacionamentos:**
- Pertence a um `StorageLocation` (opcional)
- Possui muitos `StockMovement`

---

### 2.18 StockMovement

**Descrição:** Movimentações de estoque (entrada, saída, transferência). Registros são imutáveis — para corrigir, deve-se criar um novo movimento.

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | UUID | NÃO | `uuid()` | Identificador único |
| `type` | `StockMovementType` | NÃO | — | Tipo: `IN` (entrada), `OUT` (saída), `TRANSFER` (transferência) |
| `itemId` | UUID | NÃO | — | FK para `StockItem`. Item movimentado |
| `quantity` | FLOAT | NÃO | — | Quantidade movimentada |
| `value` | FLOAT | NÃO | — | Valor total da movimentação (R$) |
| `userId` | UUID | NÃO | — | FK para `User`. Usuário responsável pela movimentação |
| `targetLocationId` | UUID | SIM | — | Local de destino (usado em transferências) |
| `notes` | TEXT | SIM | — | Observações da movimentação |
| `occurredAt` | TIMESTAMP | NÃO | `now()` | Data/hora da movimentação |

**Índices:** `itemId`, `userId`, `occurredAt`

**Restrição:** Imutável — UPDATE e DELETE bloqueados por trigger.

**Relacionamentos:** Pertence a um `StockItem` e a um `User`.

---

### 2.19 Invoice

**Descrição:** Faturas geradas para uma secretaria por um período de competência. Consolida o total faturado, líquido e pago.

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | UUID | NÃO | `uuid()` | Identificador único da fatura |
| `secretaryId` | UUID | NÃO | — | FK para `Secretary`. Secretaria faturada |
| `subSecretaryId` | UUID | SIM | — | FK implícita (não relacional). Subsecretaria (opcional) |
| `periodStart` | TIMESTAMP | NÃO | — | Início do período de competência |
| `periodEnd` | TIMESTAMP | NÃO | — | Fim do período de competência |
| `totalBilled` | FLOAT | NÃO | `0` | Valor bruto faturado (R$) |
| `totalNet` | FLOAT | NÃO | `0` | Valor líquido após deduções (R$) |
| `totalPaid` | FLOAT | NÃO | `0` | Valor já pago (R$) |
| `status` | `InvoiceStatus` | NÃO | `PENDING` | Status: `PENDING`, `PARTIALLY_PAID`, `PAID`, `OVERDUE` |
| `paymentProofUrl` | TEXT | SIM | — | URL do comprovante de pagamento |
| `createdAt` | TIMESTAMP | NÃO | `now()` | Data/hora de criação |
| `updatedAt` | TIMESTAMP | NÃO | auto | Data/hora da última atualização |

**Índices:** `secretaryId`, `status`

**Relacionamentos:**
- Pertence a uma `Secretary`
- Possui muitos `InvoiceItem`
- Possui muitos `PaymentHistory`

---

### 2.20 InvoiceItem

**Descrição:** Itens detalhados de uma fatura. Cada linha representa um produto/serviço cobrado no período.

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | UUID | NÃO | `uuid()` | Identificador único |
| `invoiceId` | UUID | NÃO | — | FK para `Invoice` |
| `orderId` | UUID | SIM | — | ID da ordem relacionada (referência, sem FK formal) |
| `itemName` | TEXT | NÃO | — | Nome do item cobrado |
| `quantity` | FLOAT | NÃO | — | Quantidade |
| `unitPrice` | FLOAT | NÃO | — | Preço unitário (R$) |
| `total` | FLOAT | NÃO | — | Total do item (R$) |

**Índices:** `invoiceId`

**Cascade:** Excluído automaticamente ao excluir a fatura.

**Relacionamentos:** Pertence a uma `Invoice`.

---

### 2.21 PaymentHistory

**Descrição:** Histórico de pagamentos de uma fatura. Permite pagamentos parciais com rastreabilidade.

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | UUID | NÃO | `uuid()` | Identificador único |
| `invoiceId` | UUID | NÃO | — | FK para `Invoice` |
| `amount` | FLOAT | NÃO | — | Valor pago neste registro (R$) |
| `paidAt` | TIMESTAMP | NÃO | — | Data/hora do pagamento |
| `proofUrl` | TEXT | SIM | — | URL do comprovante deste pagamento |

**Índices:** `invoiceId`

**Cascade:** Excluído automaticamente ao excluir a fatura.

**Relacionamentos:** Pertence a uma `Invoice`.

---

### 2.22 BudgetContract

**Descrição:** Contratos orçamentários que originam o saldo disponível para distribuição às secretarias. Controla o total inicial, aditivos e saldo distribuído/consumido.

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | UUID | NÃO | `uuid()` | Identificador único |
| `contractNumber` | TEXT | NÃO | — | Número do contrato (único no sistema) |
| `initialValue` | FLOAT | NÃO | — | Valor inicial do contrato (R$) |
| `additivesTotal` | FLOAT | NÃO | `0` | Soma de todos os aditivos aprovados (R$) |
| `currentTotal` | FLOAT | NÃO | — | Valor atual: `initialValue + additivesTotal` (R$) |
| `distributedToSecretaries` | FLOAT | NÃO | `0` | Total distribuído às secretarias (R$) |
| `allocatedViaCommitment` | FLOAT | NÃO | `0` | Total emenhado (R$) |
| `consumedInOrders` | FLOAT | NÃO | `0` | Total consumido em ordens concluídas (R$) |
| `createdAt` | TIMESTAMP | NÃO | `now()` | Data/hora de criação |
| `updatedAt` | TIMESTAMP | NÃO | auto | Data/hora da última atualização |

**Relacionamentos:**
- Possui muitos `BudgetAdditive`
- Possui muitos `BudgetCommitment`

---

### 2.23 BudgetAdditive

**Descrição:** Aditivos ao contrato orçamentário. Cada aditivo aumenta o valor total do contrato e requer aprovação de um usuário autorizado.

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | UUID | NÃO | `uuid()` | Identificador único |
| `contractId` | UUID | NÃO | — | FK para `BudgetContract` |
| `value` | FLOAT | NÃO | — | Valor do aditivo (R$) |
| `description` | TEXT | NÃO | — | Justificativa do aditivo |
| `approvedAt` | TIMESTAMP | NÃO | `now()` | Data/hora de aprovação |
| `fileUrl` | TEXT | SIM | — | URL do documento do aditivo |
| `approvedById` | UUID | NÃO | — | FK para `User`. Usuário que aprovou |

**Índices:** `contractId`

**Relacionamentos:** Pertence a um `BudgetContract` e a um `User`.

---

### 2.24 BudgetCommitment

**Descrição:** Empenhos orçamentários. Representa a reserva de um valor do contrato para uma secretaria específica.

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | UUID | NÃO | `uuid()` | Identificador único |
| `contractId` | UUID | NÃO | — | FK para `BudgetContract` |
| `secretaryId` | UUID | NÃO | — | FK para `Secretary`. Secretaria beneficiada |
| `value` | FLOAT | NÃO | — | Valor empenhado (R$) |
| `usedValue` | FLOAT | NÃO | `0` | Valor já consumido do empenho (R$) |
| `status` | `BudgetCommitmentStatus` | NÃO | `ACTIVE` | Status: `ACTIVE`, `CONSUMED`, `CANCELLED` |
| `registeredAt` | TIMESTAMP | NÃO | `now()` | Data/hora do empenho |
| `fileUrl` | TEXT | SIM | — | URL do documento do empenho |
| `registeredById` | UUID | NÃO | — | FK para `User`. Usuário que registrou |

**Índices:** `contractId`, `secretaryId`

**Relacionamentos:** Pertence a um `BudgetContract`, a uma `Secretary` e a um `User`.

---

### 2.25 Establishment

**Descrição:** Estabelecimentos credenciados (fornecedores, prestadores de serviço). Armazena dados cadastrais, localização geográfica e métricas de desempenho.

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | CUID | NÃO | `cuid()` | Identificador único |
| `name` | TEXT | NÃO | — | Razão social do estabelecimento |
| `cnpj` | TEXT | NÃO | — | CNPJ (único no sistema) |
| `address` | TEXT | NÃO | — | Endereço completo |
| `city` | TEXT | NÃO | — | Cidade |
| `state` | TEXT | NÃO | — | Estado (sigla) |
| `lat` | FLOAT | SIM | — | Latitude (geolocalização) |
| `lng` | FLOAT | SIM | — | Longitude (geolocalização) |
| `phone` | TEXT | NÃO | — | Telefone de contato |
| `email` | TEXT | SIM | — | E-mail de contato |
| `servicesDescription` | TEXT | NÃO | — | Descrição dos serviços/produtos oferecidos |
| `ordersCompleted` | INT | NÃO | `0` | Total de ordens concluídas pelo estabelecimento |
| `rating` | FLOAT | NÃO | `0` | Avaliação média (0 a 5) |
| `status` | `EstablishmentStatus` | NÃO | `ACTIVE` | Situação: `ACTIVE`, `INACTIVE`, `SUSPENDED` |
| `createdAt` | TIMESTAMP | NÃO | `now()` | Data/hora de criação |
| `updatedAt` | TIMESTAMP | NÃO | auto | Data/hora da última atualização |

**Índices:** `status`, `cnpj`

**Relacionamentos:** Possui muitos `EstablishmentFavorite`.

---

### 2.26 EstablishmentFavorite

**Descrição:** Favoritos de estabelecimentos por usuário. Cada usuário pode marcar estabelecimentos como favoritos.

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | CUID | NÃO | `cuid()` | Identificador único |
| `userId` | UUID | NÃO | — | FK para `User` |
| `establishmentId` | CUID | NÃO | — | FK para `Establishment` |
| `createdAt` | TIMESTAMP | NÃO | `now()` | Data/hora do favorito |

**Índices:** `userId`, `establishmentId`

**Restrição:** Um usuário não pode favoritar o mesmo estabelecimento mais de uma vez (`UNIQUE userId + establishmentId`).

**Relacionamentos:** Pertence a um `User` e a um `Establishment`.

---

### 2.27 SystemSettings

**Descrição:** Configurações globais do sistema. Existe apenas um registro com ID fixo `"system"`.

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | TEXT | NÃO | `"system"` | ID fixo do registro único |
| `billingMode` | `BillingMode` | NÃO | `CENTRALIZED` | Modo de faturamento: `CENTRALIZED` (único faturamento) ou `DECENTRALIZED` (por secretaria) |
| `billingClosingDay` | INT | NÃO | `25` | Dia do mês para fechamento da fatura |
| `requireManagerApproval` | BOOLEAN | NÃO | `true` | Exige aprovação de gestor para pedidos |
| `requireBudgetValidation` | BOOLEAN | NÃO | `true` | Exige validação de orçamento antes de aprovar pedidos |
| `minimumProposalsForApproval` | INT | NÃO | `3` | Número mínimo de propostas para aprovar uma cotação |
| `restrictOrderCreationToVerifiedUsers` | BOOLEAN | NÃO | `false` | Restringe criação de ordens apenas a usuários com biometria verificada |
| `updatedAt` | TIMESTAMP | NÃO | auto | Data/hora da última atualização |

**Relacionamentos:** Nenhum.

---

### 2.28 ApiKey

**Descrição:** Chaves de API para integrações externas. Cada chave possui permissões específicas e pode ser revogada.

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | CUID | NÃO | `cuid()` | Identificador único |
| `name` | TEXT | NÃO | — | Nome descritivo da chave |
| `keyHash` | TEXT | NÃO | — | Hash da chave (a chave em si não é armazenada) |
| `permissions` | TEXT[] | NÃO | — | Lista de permissões concedidas à chave |
| `lastUsedAt` | TIMESTAMP | SIM | — | Data/hora do último uso |
| `revoked` | BOOLEAN | NÃO | `false` | Indica se a chave foi revogada |
| `createdAt` | TIMESTAMP | NÃO | `now()` | Data/hora de criação |
| `createdById` | UUID | NÃO | — | FK para `User`. Usuário que criou a chave |

**Índices:** `createdById`, `revoked`

**Relacionamentos:**
- Pertence a um `User`
- Possui muitos `ApiCallLog`

---

### 2.29 ApiCallLog

**Descrição:** Log de chamadas realizadas via API Key. Registra endpoint, método, status e tempo de resposta.

| Coluna | Tipo | Nulo | Padrão | Descrição |
|--------|------|------|--------|-----------|
| `id` | CUID | NÃO | `cuid()` | Identificador único |
| `endpoint` | TEXT | NÃO | — | Endpoint chamado |
| `method` | TEXT | NÃO | — | Método HTTP (GET, POST, etc.) |
| `statusCode` | INT | NÃO | — | Código de status HTTP da resposta |
| `responseTimeMs` | INT | NÃO | — | Tempo de resposta em milissegundos |
| `occurredAt` | TIMESTAMP | NÃO | `now()` | Data/hora da chamada |
| `ipAddress` | TEXT | NÃO | — | IP de origem da chamada |
| `apiKeyId` | CUID | NÃO | — | FK para `ApiKey` |

**Índices:** `apiKeyId`, `occurredAt`

**Relacionamentos:** Pertence a uma `ApiKey`.

---

## 3. Views

Não existem views criadas no banco de dados. Toda a lógica de agregação é realizada via queries da aplicação (Prisma ORM).

---

## 4. Functions e Procedures

### 4.1 generate_order_code()

**Tipo:** FUNCTION (retorna TEXT)
**Descrição:** Gera o código único de uma ordem no formato `OS-AAAA-NNNN`, com numeração sequencial reiniciada a cada ano.

**Lógica:**
1. Obtém o ano atual (`YYYY`)
2. Busca o maior número sequencial já usado no ano (`MAX` do 3º fragmento do código)
3. Incrementa em 1 e formata com 4 dígitos (`LPAD`)
4. Retorna o código no formato `OS-AAAA-NNNN`

**Exemplo de saída:** `OS-2026-0001`, `OS-2026-0042`

---

### 4.2 audit_order_changes()

**Tipo:** FUNCTION TRIGGER (retorna TRIGGER)
**Descrição:** Registra automaticamente no `AuditLog` toda inserção ou atualização na tabela `Order`. Acionado pelo trigger `order_audit_trigger`.

**Dados registrados no AuditLog:**
- `action`: `INSERT_ORDER` ou `UPDATE_ORDER`
- `urlPath`: `/api/orders/{id}`
- `userId`: ID do criador da ordem
- `metadata`: `orderId`, `code`, `status`, `trigger: true`

---

### 4.3 audit_secretary_changes()

**Tipo:** FUNCTION TRIGGER (retorna TRIGGER)
**Descrição:** Registra automaticamente no `AuditLog` toda inserção ou atualização na tabela `Secretary`. Acionado pelo trigger `secretary_audit_trigger`.

**Dados registrados no AuditLog:**
- `action`: `INSERT_SECRETARY` ou `UPDATE_SECRETARY`
- `urlPath`: `/api/secretaries/{id}`
- `userId`: null (operação administrativa)
- `metadata`: `secretaryId`, `name`, `trigger: true`

---

### 4.4 prevent_approved_order_mutation()

**Tipo:** FUNCTION TRIGGER (retorna TRIGGER)
**Descrição:** Impede a modificação dos campos críticos (`name`, `category`, `secretaryId`) de ordens que já estão em status `APPROVED`, `DELIVERED` ou `COMPLETED`. Acionado pelo trigger `prevent_approved_order_mutation_trigger`.

**Comportamento:** Lança exceção `'Cannot modify approved order fields'` se algum desses campos for alterado após aprovação.

---

### 4.5 prevent_audit_log_modification()

**Tipo:** FUNCTION TRIGGER (retorna TRIGGER)
**Descrição:** Bloqueia qualquer tentativa de UPDATE ou DELETE na tabela `AuditLog`. Garante a imutabilidade do log de auditoria. Acionado pelo trigger `audit_logs_immutable`.

**Comportamento:** Lança exceção `'audit_logs records are immutable. DELETE and UPDATE are forbidden.'`

---

### 4.6 prevent_biometric_record_modification()

**Tipo:** FUNCTION TRIGGER (retorna TRIGGER)
**Descrição:** Bloqueia qualquer tentativa de UPDATE ou DELETE na tabela `BiometricRecord`. Garante a integridade do histórico biométrico. Acionado pelo trigger `biometric_records_immutable`.

**Comportamento:** Lança exceção `'biometric_records records are immutable. DELETE and UPDATE are forbidden.'`

---

### 4.7 prevent_stock_movement_update()

**Tipo:** FUNCTION TRIGGER (retorna TRIGGER)
**Descrição:** Bloqueia UPDATE e DELETE na tabela `StockMovement`. Movimentações de estoque são imutáveis — para corrigir, deve-se registrar um novo movimento. Acionado pelo trigger `prevent_stock_movement_update_trigger`.

**Comportamento:** Lança exceção `'Stock movements are immutable — register a new movement to correct'`

---

## 5. Triggers

| Trigger | Tabela | Evento | Function | Descrição |
|---------|--------|--------|----------|-----------|
| `audit_logs_immutable` | `AuditLog` | UPDATE, DELETE | `prevent_audit_log_modification` | Impede alteração ou exclusão de logs de auditoria |
| `biometric_records_immutable` | `BiometricRecord` | UPDATE, DELETE | `prevent_biometric_record_modification` | Impede alteração ou exclusão de registros biométricos |
| `order_audit_trigger` | `Order` | INSERT, UPDATE | `audit_order_changes` | Registra automaticamente no AuditLog toda mudança em ordens |
| `secretary_audit_trigger` | `Secretary` | INSERT, UPDATE | `audit_secretary_changes` | Registra automaticamente no AuditLog toda mudança em secretarias |
| `prevent_approved_order_mutation_trigger` | `Order` | UPDATE | `prevent_approved_order_mutation` | Bloqueia alteração de campos críticos em ordens aprovadas |
| `prevent_stock_movement_update_trigger` | `StockMovement` | UPDATE, DELETE | `prevent_stock_movement_update` | Impede alteração ou exclusão de movimentações de estoque |

---

## 6. Diagrama de Relacionamentos

```
BrandConfig          (independente)
SystemSettings       (independente)

User ──────────────── Secretary (N:1, opcional)
User ──────────────── Session (1:N)
User ──────────────── TwoFactorRequest (1:N)
User ──────────────── AuditLog (1:N, opcional)
User ──────────────── BiometricRecord (1:N)
User ──────────────── Order [criador] (1:N)
User ──────────────── OrderTimeline (1:N)
User ──────────────── DeliveryRecord [recebedor] (1:N)
User ──────────────── NonConformity [registrador] (1:N)
User ──────────────── ChatMessage (1:N)
User ──────────────── StockMovement (1:N)
User ──────────────── BudgetAdditive [aprovador] (1:N)
User ──────────────── BudgetCommitment [registrador] (1:N)
User ──────────────── EstablishmentFavorite (1:N)
User ──────────────── ApiKey (1:N)

Secretary ─────────── Secretary [parent/sub] (1:N auto-relacionamento)
Secretary ─────────── Order (1:N)
Secretary ─────────── Invoice (1:N)
Secretary ─────────── BudgetCommitment (1:N)
Secretary ─────────── StorageLocation (1:N)

Order ──────────────── OrderItem (1:N, cascade)
Order ──────────────── OrderTimeline (1:N, cascade)
Order ──────────────── DeliveryRecord (1:N, cascade)
Order ──────────────── NonConformity (1:N, cascade)
Order ──────────────── OrderInvoice (1:N, cascade)
Order ──────────────── ChatMessage (1:N, cascade)
Order ──────────────── DeliveryLocation (1:N, cascade)

StorageLocation ────── StockItem (1:N)
StockItem ─────────── StockMovement (1:N)

Invoice ────────────── InvoiceItem (1:N, cascade)
Invoice ────────────── PaymentHistory (1:N, cascade)

BudgetContract ──────── BudgetAdditive (1:N)
BudgetContract ──────── BudgetCommitment (1:N)

Establishment ──────── EstablishmentFavorite (1:N)

ApiKey ─────────────── ApiCallLog (1:N)
```

---

*Dicionário gerado em 25/03/2026 — SaaS BI Prefeitura Municipal de Araçuaí*
