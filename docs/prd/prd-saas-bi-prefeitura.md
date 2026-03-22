# PRD — Sistema SaaS de Gestão de Compras, Estoque e Auditoria
### Prefeitura Municipal de Araçuaí/MG · Pregão Eletrônico nº 008/2026

> **Base legal:** Lei Federal nº 14.133/2021 · Processo Licitatório nº 019/2026
> **Critério:** Menor Taxa Administrativa
> **Regra crítica:** 100% dos requisitos abaixo devem ser implementados e demonstrados na Prova de Conceito (PoC). A ausência de qualquer item implica desclassificação imediata.

---

## Stack & Convenções de Implementação

```
Runtime      : Node.js 20+ / TypeScript 5+
HTTP Client  : axios  ← biblioteca obrigatória para todas chamadas HTTP/REST
Framework    : Next.js 14 (App Router) ou React 18 + Vite
Estado       : Zustand ou React Query (TanStack Query v5)
UI           : Tailwind CSS + shadcn/ui
Auth         : JWT + Biometria Facial (face-api.js / AWS Rekognition via axios)
DB           : PostgreSQL + Prisma ORM
Storage      : S3-compatible (via axios multipart)
Testes       : Vitest + Testing Library
```

### Padrão obrigatório para chamadas HTTP (axios)

```typescript
// src/lib/api.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'

export const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

// Interceptor de autenticação
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Interceptor de erros
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) window.location.href = '/login'
    return Promise.reject(err)
  }
)
```

---

## Módulos e Requisitos Funcionais

---

### `MOD-01` · Core / Infraestrutura

#### REQ-01 · Acesso Remoto, Responsividade e Identidade Visual

**Prioridade:** 🔴 Alta
**Item Checklist PoC:** Item 1 do Anexo III

**Descrição funcional:**
O sistema deve ser acessível remotamente via internet, compatível com navegadores modernos (Chrome, Firefox, Edge, Safari), com disponibilidade integral 24×7 e atualizações em tempo real via WebSocket ou SSE. A solução deve permitir personalização com a identidade visual da Contratante (logo, cores, favicon) e possuir interface responsiva para dispositivos móveis (breakpoints: 320px, 768px, 1024px, 1440px).

**Implementação com axios:**

```typescript
// src/services/config.service.ts
import { api } from '@/lib/api'

export interface BrandConfig {
  logoUrl: string
  primaryColor: string
  secondaryColor: string
  faviconUrl: string
  municipalityName: string
}

export async function fetchBrandConfig(): Promise<BrandConfig> {
  const { data } = await api.get<BrandConfig>('/config/brand')
  return data
}

export async function updateBrandConfig(
  payload: Partial<BrandConfig>
): Promise<BrandConfig> {
  const { data } = await api.patch<BrandConfig>('/config/brand', payload)
  return data
}
```

**Critérios de aceite PoC:**
- [ ] Abre corretamente em Chrome, Firefox e Edge sem erros de console
- [ ] Layout responsivo em tela de 375px (mobile) e 1440px (desktop)
- [ ] Logo e cores da Prefeitura de Araçuaí aplicados
- [ ] Sem acesso anônimo — redireciona para `/login`

---

### `MOD-02` · Dashboard Principal

#### REQ-02 · Painel de Controle Interativo na Tela Inicial

**Prioridade:** 🔴 Alta
**Item Checklist PoC:** Item 2 do Anexo III

**Descrição funcional:**
Tela inicial pós-login com painel interativo e responsivo exibindo:

| Campo | Descrição |
|---|---|
| `budgetTotal` | Orçamento total anual disponível (R$) |
| `budgetUsed` | Valor comprometido com propostas aceitas |
| `budgetRemaining` | Saldo restante (destaque visual por cor) |
| `secretaryList[]` | Listagem com barra de progresso individual |
| `ordersSummary` | Totalizadores por status (abertos, andamento, aguardando, finalizados, cancelados) |
| `statusChart` | Gráfico de proporção entre status |
| `recentOrders[]` | Últimos pedidos com status visual colorido |

**Implementação com axios:**

```typescript
// src/services/dashboard.service.ts
import { api } from '@/lib/api'

export interface DashboardData {
  budgetTotal: number
  budgetUsed: number
  budgetRemaining: number
  secretaryList: {
    id: string
    name: string
    budgetAllocated: number
    budgetUsed: number
    percentUsed: number
    ordersCount: number
  }[]
  ordersSummary: {
    open: number
    inProgress: number
    pendingApproval: number
    finished: number
    cancelled: number
  }
  recentOrders: {
    id: string
    code: string
    status: 'AWAITING_OFFERS' | 'AWAITING_NF' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED'
    createdAt: string
    secretaryName: string
    bestOffer?: number
  }[]
}

export async function fetchDashboard(): Promise<DashboardData> {
  const { data } = await api.get<DashboardData>('/dashboard')
  return data
}
```

**Componentes obrigatórios:**

```typescript
// src/components/dashboard/BudgetCard.tsx
// src/components/dashboard/SecretaryProgressList.tsx
// src/components/dashboard/OrderStatusChart.tsx   ← recharts ou chart.js
// src/components/dashboard/RecentOrdersTable.tsx
// src/components/dashboard/QuickActionButtons.tsx  ← "Nova OS" e "Acompanhar Pedidos"
```

**Critérios de aceite PoC:**
- [ ] Todos os 10 sub-itens (a–j) do item 2 visíveis imediatamente após login
- [ ] Cores distintas para saldo disponível vs comprometido
- [ ] Barra de progresso por secretaria funcional
- [ ] Gráfico de pizza/donut para status dos pedidos
- [ ] Botões de atalho navegam corretamente

---

### `MOD-03` · Gestão de Secretarias

#### REQ-03 · Interface de Cadastro de Secretarias

**Prioridade:** 🔴 Alta
**Item Checklist PoC:** Item 3 do Anexo III

**Descrição funcional:**
Interface CRUD completa para secretarias municipais, com vinculação a processos administrativos e pedidos.

#### REQ-04 · Formulário de Cadastro de Secretaria

**Prioridade:** 🔴 Alta
**Item Checklist PoC:** Item 4 do Anexo III

**Campos obrigatórios:** Nome da Secretaria · Telefone · CNPJ (máscara + validação) · Descrição (texto livre) · Nome do Secretário da Pasta

#### REQ-05 · Visualização e Gerenciamento de Secretarias

**Prioridade:** 🔴 Alta
**Item Checklist PoC:** Item 5 do Anexo III

**Campos exibidos:** Busca por nome · Subsecretarias vinculadas · Foto e nome dos responsáveis · Barra de progresso orçamentário (% + R$) · Número de pedidos associados

**Implementação com axios:**

```typescript
// src/services/secretary.service.ts
import { api } from '@/lib/api'

export interface Secretary {
  id: string
  name: string
  phone: string
  cnpj: string
  description?: string
  secretaryPersonName: string
  subSecretariesCount: number
  budgetAllocated: number
  budgetUsed: number
  percentUsed: number
  ordersCount: number
  responsibles: { id: string; name: string; photoUrl?: string }[]
}

export interface CreateSecretaryDto {
  name: string
  phone: string
  cnpj: string
  description?: string
  secretaryPersonName: string
}

export async function listSecretaries(search?: string): Promise<Secretary[]> {
  const { data } = await api.get<Secretary[]>('/secretaries', {
    params: search ? { search } : undefined,
  })
  return data
}

export async function createSecretary(
  dto: CreateSecretaryDto
): Promise<Secretary> {
  const { data } = await api.post<Secretary>('/secretaries', dto)
  return data
}

export async function updateSecretary(
  id: string,
  dto: Partial<CreateSecretaryDto>
): Promise<Secretary> {
  const { data } = await api.patch<Secretary>(`/secretaries/${id}`, dto)
  return data
}

export async function deleteSecretary(id: string): Promise<void> {
  await api.delete(`/secretaries/${id}`)
}
```

**Critérios de aceite PoC:**
- [ ] CNPJ com máscara XX.XXX.XXX/XXXX-XX e validação de dígito
- [ ] Sistema impede cadastro de secretaria com nome duplicado (erro amigável)
- [ ] Barra de progresso visual com % e R$
- [ ] Foto dos responsáveis exibida

---

#### REQ-06 · Resumo Financeiro por Secretaria

**Prioridade:** 🔴 Alta
**Item Checklist PoC:** Item 6 do Anexo III

```typescript
export interface SecretaryFinancialSummary {
  secretaryId: string
  budgetByCommitment: number
  usedInOrders: number
  distributedToSub: number
}

export async function getSecretaryFinancialSummary(
  id: string
): Promise<SecretaryFinancialSummary> {
  const { data } = await api.get<SecretaryFinancialSummary>(
    `/secretaries/${id}/financial-summary`
  )
  return data
}
```

---

### `MOD-04` · Gestão de Usuários

#### REQ-07 · Cadastro de Novos Usuários
#### REQ-08 · Campos Obrigatórios do Cadastro
#### REQ-09 · Perfis de Acesso
#### REQ-15 · Interface de Consulta de Usuários

**Prioridade:** 🔴 Alta
**Itens Checklist PoC:** 7, 8, 9, 15

**Campos obrigatórios:** Nome Completo · Data de Nascimento · Telefone/Celular · E-mail institucional · CPF · RG

**Perfis:**

| Perfil | Permissões |
|---|---|
| `MAIN_MANAGER` | Acesso integral — cria secretarias, usuários, aprova pedidos, define limites |
| `SECRETARY_MANAGER` | Acesso à sua secretaria — cria/edita dentro dela, aprova pedidos, define limites |
| `SECRETARY_USER` | Acesso limitado conforme parametrização do Responsável |
| `AUDIT_VIEWER` | Somente visualização (TCE/MP) |

**Implementação com axios:**

```typescript
// src/services/user.service.ts
import { api } from '@/lib/api'

export type UserRole =
  | 'MAIN_MANAGER'
  | 'SECRETARY_MANAGER'
  | 'SECRETARY_USER'
  | 'AUDIT_VIEWER'

export interface User {
  id: string
  fullName: string
  birthDate: string
  phone: string
  email: string
  cpf: string
  rg: string
  role: UserRole
  secretaryId?: string
  photoUrl?: string
  lastLogin?: string
  biometricVerified: boolean
  documentVerified: boolean
}

export interface CreateUserDto {
  fullName: string
  birthDate: string
  phone: string
  email: string
  cpf: string
  rg: string
  role: UserRole
  secretaryId?: string
}

export async function listUsers(params?: {
  search?: string
  email?: string
}): Promise<User[]> {
  const { data } = await api.get<User[]>('/users', { params })
  return data
}

export async function createUser(dto: CreateUserDto): Promise<User> {
  const { data } = await api.post<User>('/users', dto)
  return data
}

export async function getUserById(id: string): Promise<User> {
  const { data } = await api.get<User>(`/users/${id}`)
  return data
}

export async function updateUser(
  id: string,
  dto: Partial<CreateUserDto>
): Promise<User> {
  const { data } = await api.patch<User>(`/users/${id}`, dto)
  return data
}
```

**Critérios de aceite PoC:**
- [ ] Todos os 6 campos obrigatórios (a–f) presentes e validados
- [ ] Três perfis de acesso demonstráveis com permissões distintas
- [ ] Filtro por nome e e-mail funcional na listagem
- [ ] Foto, último login e tipo de acesso exibidos na listagem

---

### `MOD-05` · Segurança e Autenticação

#### REQ-10 · Autenticação com Biometria Facial e IA
#### REQ-11 · Liveness Detection e Anti-Fraude
#### REQ-12 · Verificação Biométrica Obrigatória no Login
#### REQ-13 · Histórico de Autenticações Biométricas
#### REQ-14 · Acesso para Órgãos de Controle Externo
#### REQ-21 · 2FA na Aprovação de Ordem de Serviço
#### REQ-47 · 2FA para Empenhos e Aditivos

**Prioridade:** 🔴🔴 CRÍTICA
**Itens Checklist PoC:** 10, 11, 12, 13, 14, 21, 47

**Fluxo de autenticação:**

```
1. Usuário insere login + senha
2. Backend valida credenciais → emite challenge token
3. Frontend captura frame via webcam
4. Envia frame + documento (RG/CNH) para API biométrica via axios (multipart)
5. API compara face com documento + liveness detection
6. Em caso de baixa similaridade, suspeita de fraude → bloqueia + registra log
7. Em caso de sucesso → emite JWT de acesso + refresh token
```

**Implementação com axios:**

```typescript
// src/services/auth.service.ts
import { api } from '@/lib/api'

export interface LoginCredentials {
  email: string
  password: string
}

export interface BiometricPayload {
  challengeToken: string
  faceImage: Blob
  documentImage?: Blob
}

export interface BiometricResult {
  success: boolean
  similarityScore: number
  livenessScore: number
  aiEstimatedAge?: number
  aiGender?: string
  fraudAlertLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
  accessToken?: string
  refreshToken?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export async function loginWithCredentials(
  credentials: LoginCredentials
): Promise<{ challengeToken: string }> {
  const { data } = await api.post('/auth/login', credentials)
  return data
}

export async function validateBiometric(
  payload: BiometricPayload
): Promise<BiometricResult> {
  const formData = new FormData()
  formData.append('challengeToken', payload.challengeToken)
  formData.append('faceImage', payload.faceImage, 'face.jpg')
  if (payload.documentImage) {
    formData.append('documentImage', payload.documentImage, 'document.jpg')
  }
  const { data } = await api.post<BiometricResult>(
    '/auth/biometric-verify',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return data
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<AuthTokens> {
  const { data } = await api.post<AuthTokens>('/auth/refresh', { refreshToken })
  return data
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

export async function requestTwoFactor(
  action: 'APPROVE_ORDER' | 'SUBMIT_COMMITMENT' | 'SUBMIT_ADDITIVE'
): Promise<{ otpToken: string; expiresIn: number }> {
  const { data } = await api.post('/auth/2fa/request', { action })
  return data
}

export async function validateTwoFactor(
  otpToken: string,
  code: string
): Promise<{ valid: boolean }> {
  const { data } = await api.post('/auth/2fa/validate', { otpToken, code })
  return data
}
```

**Histórico biométrico:**

```typescript
// src/services/biometric-history.service.ts
export interface BiometricRecord {
  id: string
  userId: string
  userName: string
  capturedImageUrl: string
  similarityScore: number
  livenessScore: number
  confidenceLevel: number
  fraudAlertLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
  aiEstimatedAge?: number
  ipAddress: string
  status: 'SUCCESS' | 'FAILED' | 'SUSPICIOUS'
  createdAt: string
}

export async function listBiometricHistory(params?: {
  userId?: string
  status?: BiometricRecord['status']
  from?: string
  to?: string
}): Promise<BiometricRecord[]> {
  const { data } = await api.get<BiometricRecord[]>(
    '/auth/biometric-history',
    { params }
  )
  return data
}
```

**Critérios de aceite PoC:**
- [ ] Login bloqueado sem passar pela verificação biométrica
- [ ] Liveness detection recusa foto estática (testar com printscreen em papel)
- [ ] IA gera alerta em caso de inconsistência detectada
- [ ] Histórico biométrico com imagem capturada, score e status visíveis
- [ ] Perfil AUDIT_VIEWER (TCE/MP) acessa apenas painel específico
- [ ] 2FA solicitado ao aprovar OS e ao enviar empenho/aditivo
- [ ] Logs de acesso bloqueado registrados e imutáveis

---

### `MOD-06` · Ordens de Serviço

#### REQ-16 · Listagem de Ordens de Serviço
#### REQ-17 · Abertura de Ordem de Serviço
#### REQ-18 · Pesquisa Inteligente de Itens
#### REQ-19 · Visão Completa da OS
#### REQ-20 · Notas Fiscais na OS
#### REQ-22–27 · Confirmação de Recebimento e Não Conformidades
#### REQ-28 · Geração/Impressão com Marcadores Digitais
#### REQ-29 · Chat na OS

**Prioridade:** 🔴 Alta
**Itens Checklist PoC:** 16–29

**Implementação com axios:**

```typescript
// src/services/order.service.ts
import { api } from '@/lib/api'

export type OrderStatus =
  | 'AWAITING_OFFERS'
  | 'AWAITING_NF'
  | 'IN_PROGRESS'
  | 'AWAITING_APPROVAL'
  | 'FINISHED'
  | 'CANCELLED'

export interface OrderItem {
  id?: string
  name: string
  imageUrl?: string
  unit: string
  quantity: number
  referenceValue: number
}

export interface CreateOrderDto {
  name: string
  category: string
  quotationStartDate: string
  quotationEndDate: string
  secretaryId: string
  subSecretaryId?: string
  investmentArea: string
  desiredDeliveryDate: string
  deliveryLocation: {
    name: string
    zipCode: string
    address: string
    city: string
    state: string
  }
  receiverName: string
  items: OrderItem[]
  observations?: string
  regionRadius?: number
  specificMunicipality?: string
}

export interface Order {
  id: string
  code: string
  name: string
  category: string
  status: OrderStatus
  secretaryId: string
  secretaryName: string
  bestOffer?: number
  proposalsCount: number
  createdAt: string
  createdByUserId: string
  createdByUserName: string
  createdByUserPhoto?: string
  items: OrderItem[]
  timeline: {
    step: string
    userId: string
    userName: string
    occurredAt: string
  }[]
  deliveryRecords: {
    id: string
    images: string[]
    deliveredByUserId: string
    receivedByUserId: string
    deliveredAt: string
    receivedAt?: string
    observations?: string
  }[]
  nonConformities: {
    id: string
    images: string[]
    registeredByUserId: string
    registeredAt: string
    observations: string
  }[]
  invoices: {
    id: string
    fileUrl: string
    establishmentName: string
    issuedAt: string
  }[]
}

export async function listOrders(params?: {
  code?: string
  status?: OrderStatus
  secretaryId?: string
  page?: number
  limit?: number
}): Promise<{ data: Order[]; total: number }> {
  const { data } = await api.get('/orders', { params })
  return data
}

export async function createOrder(dto: CreateOrderDto): Promise<Order> {
  const { data } = await api.post<Order>('/orders', dto)
  return data
}

export async function getOrderById(id: string): Promise<Order> {
  const { data } = await api.get<Order>(`/orders/${id}`)
  return data
}

export async function searchItems(query: string): Promise<{
  name: string
  category: string
  imageUrl: string
  referenceValue: number
}[]> {
  const { data } = await api.get('/items/search', { params: { q: query } })
  return data
}

export async function confirmDelivery(
  orderId: string,
  payload: { images: File[]; observations?: string }
): Promise<void> {
  const formData = new FormData()
  payload.images.forEach((img) => formData.append('images', img))
  if (payload.observations) formData.append('observations', payload.observations)
  await api.post(`/orders/${orderId}/confirm-delivery`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export async function registerNonConformity(
  orderId: string,
  payload: { images: File[]; observations: string }
): Promise<void> {
  const formData = new FormData()
  payload.images.forEach((img) => formData.append('images', img))
  formData.append('observations', payload.observations)
  await api.post(`/orders/${orderId}/non-conformities`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export async function approveOrder(
  orderId: string,
  otpCode: string,
  otpToken: string
): Promise<Order> {
  const { data } = await api.post<Order>(`/orders/${orderId}/approve`, {
    otpCode,
    otpToken,
  })
  return data
}

export async function generateOrderPdf(
  orderId: string,
  checkedItems: string[]
): Promise<Blob> {
  const { data } = await api.post(
    `/orders/${orderId}/print`,
    { checkedItems },
    { responseType: 'blob' }
  )
  return data
}
```

**Chat na OS:**

```typescript
// src/services/chat.service.ts
export interface ChatMessage {
  id: string
  orderId: string
  senderId: string
  senderName: string
  senderPhotoUrl?: string
  content: string
  imageUrl?: string
  sentAt: string
  senderType: 'MUNICIPALITY' | 'ESTABLISHMENT'
}

export async function listMessages(orderId: string): Promise<ChatMessage[]> {
  const { data } = await api.get<ChatMessage[]>(`/orders/${orderId}/chat`)
  return data
}

export async function sendMessage(
  orderId: string,
  payload: { content?: string; image?: File }
): Promise<ChatMessage> {
  const formData = new FormData()
  if (payload.content) formData.append('content', payload.content)
  if (payload.image) formData.append('image', payload.image)
  const { data } = await api.post<ChatMessage>(
    `/orders/${orderId}/chat`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return data
}
```

**Critérios de aceite PoC:**
- [ ] Listagem com todos os campos (a–i) do item 16 visíveis
- [ ] Formulário de abertura com todos os campos (a–m) do item 17 funcionais
- [ ] Pesquisa inteligente de itens com autocomplete + imagem + valor de referência
- [ ] Visão completa da OS com linha do tempo (timeline)
- [ ] Upload de fotos funcional no recebimento e não conformidade
- [ ] Registro automático de data, hora e responsável
- [ ] PDF gerado com checkboxes digitais
- [ ] Chat com envio de imagem em tempo real
- [ ] Notas fiscais visíveis na OS

---

### `MOD-07` · Controle de Estoque / Inventário

#### REQ-30 a REQ-38

**Prioridade:** 🔴 Alta
**Itens Checklist PoC:** 30–38

**Implementação com axios:**

```typescript
// src/services/inventory.service.ts
import { api } from '@/lib/api'

export interface StockItem {
  id: string
  name: string
  imageUrl?: string
  quantity: number
  unit: string
  unitPrice: number
  totalValue: number
  minimumAlert: number
  barcode?: string
  qrCode?: string
  storageLocationId: string
  storageLocationName: string
  abcClass: 'A' | 'B' | 'C'
  isLowStock: boolean
}

export interface StockDashboard {
  totalProducts: number
  totalItems: number
  totalValue: number
  lowStockItems: StockItem[]
}

export interface StockMovement {
  id: string
  type: 'IN' | 'OUT'
  itemId: string
  itemName: string
  quantity: number
  value: number
  userId: string
  userName: string
  occurredAt: string
}

export interface StockAnalytics {
  topMovedItems: { itemId: string; itemName: string; quantity: number }[]
  zeroMovementItems: StockItem[]
  frozenStockValue: number
  avgConsumptionBySecretary: { secretaryId: string; secretaryName: string; avgValue: number }[]
  atypicalMovements: StockMovement[]
  abcDistribution: { class: 'A' | 'B' | 'C'; count: number; totalValue: number }[]
  recommendations: string[]
}

export interface StorageLocation {
  id: string
  name: string
  secretaryId: string
  secretaryName: string
  observations?: string
  itemsCount: number
}

export async function getStockDashboard(): Promise<StockDashboard> {
  const { data } = await api.get<StockDashboard>('/stock/dashboard')
  return data
}

export async function listInventory(params?: {
  search?: string
  barcode?: string
  view?: 'GRID' | 'LIST'
  page?: number
  limit?: number
}): Promise<{ data: StockItem[]; total: number }> {
  const { data } = await api.get('/stock/inventory', { params })
  return data
}

export async function getStockItemById(id: string): Promise<StockItem> {
  const { data } = await api.get<StockItem>(`/stock/items/${id}`)
  return data
}

export async function createStockItem(payload: {
  name: string
  quantity: number
  unit: string
  minimumAlert: number
  unitPrice: number
  storageLocationId: string
  barcode?: string
  image?: File
}): Promise<StockItem> {
  const formData = new FormData()
  Object.entries(payload).forEach(([k, v]) => {
    if (k === 'image' && v instanceof File) formData.append('image', v)
    else if (v !== undefined) formData.append(k, String(v))
  })
  const { data } = await api.post<StockItem>('/stock/items', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function moveStock(payload: {
  itemId: string
  type: 'IN' | 'OUT'
  quantity: number
  targetLocationId?: string
}): Promise<StockMovement> {
  const { data } = await api.post<StockMovement>('/stock/movements', payload)
  return data
}

export async function listStockMovements(params?: {
  itemId?: string
  type?: 'IN' | 'OUT'
  from?: string
  to?: string
}): Promise<StockMovement[]> {
  const { data } = await api.get<StockMovement[]>('/stock/movements', { params })
  return data
}

export async function getStockAnalytics(params: {
  period: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
}): Promise<StockAnalytics> {
  const { data } = await api.get<StockAnalytics>('/stock/analytics', { params })
  return data
}

export async function listStorageLocations(): Promise<StorageLocation[]> {
  const { data } = await api.get<StorageLocation[]>('/stock/locations')
  return data
}

export async function createStorageLocation(payload: {
  name: string
  secretaryId: string
  observations?: string
}): Promise<StorageLocation> {
  const { data } = await api.post<StorageLocation>('/stock/locations', payload)
  return data
}
```

**Critérios de aceite PoC:**
- [ ] Dashboard com 4 indicadores (produtos, itens, valor total, estoque baixo)
- [ ] Inventário filtrável por nome E por código de barras
- [ ] Alternância galeria/lista funcional
- [ ] Alerta de estoque mínimo configurável por item e visível
- [ ] Histórico de movimentações com usuário, ação e valores
- [ ] Painel gerencial com Curva ABC e gráficos comparativos
- [ ] Indicadores de giro, estoque parado e recomendações automáticas
- [ ] QR-code e código de barras exibidos por item

---

### `MOD-08` · Auditoria e Logs

#### REQ-39 · Módulo de Logs e Monitoramento
#### REQ-40 · Imutabilidade dos Registros de Log

**Prioridade:** 🔴🔴 CRÍTICA
**Itens Checklist PoC:** 39, 40

```typescript
// src/services/audit.service.ts
import { api } from '@/lib/api'

export interface AuditLog {
  id: string
  action: string
  urlPath: string
  userId: string
  userName: string
  userPhotoUrl?: string
  ipAddress: string
  status: 'SUCCESS' | 'FAILED' | 'SUSPICIOUS'
  occurredAt: string
}

export async function listAuditLogs(params?: {
  userId?: string
  status?: AuditLog['status']
  from?: string
  to?: string
  page?: number
  limit?: number
}): Promise<{ data: AuditLog[]; total: number }> {
  const { data } = await api.get('/audit/logs', { params })
  return data
}
```

> ⚠️ **Regra de imutabilidade:** `DELETE /audit/logs/:id` e `PATCH /audit/logs/:id` devem retornar **403 Forbidden**. Implementar constraint via trigger ou RLS no PostgreSQL.

**Critérios de aceite PoC:**
- [ ] Todas as ações do sistema registradas em log
- [ ] Visualização cronológica com foto do usuário
- [ ] Filtro por status da ação funcional
- [ ] Tentativa de deletar log via API retorna 403
- [ ] IP do dispositivo registrado em cada ação

---

### `MOD-09` · Módulo Financeiro

#### REQ-41 · Módulo Financeiro Completo

**Prioridade:** 🔴 Alta
**Item Checklist PoC:** Item 41

```typescript
// src/services/financial.service.ts
import { api } from '@/lib/api'

export type InvoiceStatus = 'PAID' | 'OVERDUE' | 'PARTIALLY_PAID' | 'PENDING'

export interface Invoice {
  id: string
  secretaryId: string
  secretaryName: string
  subSecretaryId?: string
  periodStart: string
  periodEnd: string
  totalBilled: number
  totalNet: number
  totalPaid: number
  status: InvoiceStatus
  items: {
    orderId: string
    orderCode: string
    itemName: string
    quantity: number
    unitPrice: number
    total: number
  }[]
  paymentProofUrl?: string
}

export interface FinancialSummary {
  period: string
  totalBilled: number
  totalNet: number
  totalPaid: number
  invoices: Invoice[]
  paymentHistory: { id: string; amount: number; paidAt: string; proofUrl?: string }[]
  consumptionBySecretary: { secretaryId: string; secretaryName: string; amount: number }[]
}

export async function getFinancialSummary(params: {
  from: string
  to: string
}): Promise<FinancialSummary> {
  const { data } = await api.get<FinancialSummary>('/financial/summary', { params })
  return data
}

export async function listInvoices(params?: {
  secretaryId?: string
  status?: InvoiceStatus
  from?: string
  to?: string
}): Promise<Invoice[]> {
  const { data } = await api.get<Invoice[]>('/financial/invoices', { params })
  return data
}

export async function downloadInvoicePdf(invoiceId: string): Promise<Blob> {
  const { data } = await api.get(`/financial/invoices/${invoiceId}/pdf`, {
    responseType: 'blob',
  })
  return data
}

export async function uploadPaymentProof(
  invoiceId: string,
  file: File
): Promise<Invoice> {
  const formData = new FormData()
  formData.append('proof', file)
  const { data } = await api.post<Invoice>(
    `/financial/invoices/${invoiceId}/proof`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return data
}
```

**Critérios de aceite PoC:**
- [ ] Filtro por período com ciclos de faturamento configuráveis
- [ ] Totalizadores: faturado, líquido, pago visíveis
- [ ] Fatura visualizável no browser com opção de salvar PDF e imprimir
- [ ] Status com cores distintas (pago=verde, vencida=vermelho, parcial=amarelo)
- [ ] Upload de comprovante de pagamento funcional
- [ ] Gráfico de consumo por secretaria presente

---

### `MOD-10` · Business Intelligence (BI)

#### REQ-42–44

**Prioridade:** 🔴 Alta
**Itens Checklist PoC:** 42, 43, 44

```typescript
// src/services/bi.service.ts
import { api } from '@/lib/api'

export type BIPeriod = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'

export interface BIData {
  period: BIPeriod
  totalConsumed: number
  ordersInProgress: number
  ordersCancelledOrDisputed: number
  dailyAcceptedBudgets: { date: string; totalValue: number; proposalsCount: number }[]
  ordersByStatus: { status: string; count: number; percentage: number }[]
  consumptionBySecretary: { secretaryId: string; secretaryName: string; totalValue: number; percentage: number }[]
  topItems: { itemName: string; occurrences: number; totalValue: number }[]
}

export async function getBIData(period: BIPeriod): Promise<BIData> {
  const { data } = await api.get<BIData>('/bi/data', { params: { period } })
  return data
}

export async function exportBIData(
  period: BIPeriod,
  format: 'PDF' | 'EXCEL' | 'CSV'
): Promise<Blob> {
  const { data } = await api.get('/bi/export', {
    params: { period, format },
    responseType: 'blob',
  })
  return data
}

export async function exportChartPdf(
  chartId: string,
  period: BIPeriod
): Promise<Blob> {
  const { data } = await api.get(`/bi/charts/${chartId}/export`, {
    params: { period, format: 'PDF' },
    responseType: 'blob',
  })
  return data
}
```

**Critérios de aceite PoC:**
- [ ] Todos os 8 elementos (a–h) do item 42 visíveis
- [ ] Filtro de período altera TODOS os gráficos automaticamente
- [ ] Layout responsivo em 375px
- [ ] Exportação PDF, Excel e CSV funcional

---

### `MOD-11` · Gestão Orçamentária por Contrato

#### REQ-45–47

**Prioridade:** 🔴 Alta
**Itens Checklist PoC:** 45, 46, 47

```typescript
// src/services/budget.service.ts
import { api } from '@/lib/api'

export interface BudgetContract {
  id: string
  contractNumber: string
  initialValue: number
  additivesTotal: number
  currentTotal: number
  distributedToSecretaries: number
  allocatedViaCommitment: number
  consumedInOrders: number
  percentageContracted: number
  percentageConsumed: number
  additives: {
    id: string
    value: number
    description: string
    approvedAt: string
    fileUrl?: string
  }[]
  commitments: {
    id: string
    secretaryId: string
    secretaryName: string
    value: number
    usedValue: number
    percentUsed: number
    status: 'ACTIVE' | 'EXHAUSTED' | 'CANCELLED'
    registeredAt: string
    fileUrl?: string
  }[]
}

export async function getBudgetContract(contractId: string): Promise<BudgetContract> {
  const { data } = await api.get<BudgetContract>(`/budget/contracts/${contractId}`)
  return data
}

export async function addAdditive(
  contractId: string,
  payload: { value: number; description: string; file?: File; otpCode: string; otpToken: string }
): Promise<BudgetContract> {
  const formData = new FormData()
  formData.append('value', String(payload.value))
  formData.append('description', payload.description)
  formData.append('otpCode', payload.otpCode)
  formData.append('otpToken', payload.otpToken)
  if (payload.file) formData.append('file', payload.file)
  const { data } = await api.post<BudgetContract>(
    `/budget/contracts/${contractId}/additives`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return data
}

export async function submitCommitment(
  contractId: string,
  payload: { secretaryId: string; value: number; file?: File; otpCode: string; otpToken: string }
): Promise<BudgetContract> {
  const formData = new FormData()
  formData.append('secretaryId', payload.secretaryId)
  formData.append('value', String(payload.value))
  formData.append('otpCode', payload.otpCode)
  formData.append('otpToken', payload.otpToken)
  if (payload.file) formData.append('file', payload.file)
  const { data } = await api.post<BudgetContract>(
    `/budget/contracts/${contractId}/commitments`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return data
}
```

**Critérios de aceite PoC:**
- [ ] Valor inicial do contrato e aditivos aprovados visíveis
- [ ] Valores disponíveis vs alocados por secretaria
- [ ] Campo de cadastro de aditivo com upload de arquivo
- [ ] Histórico de empenhos com download do arquivo
- [ ] 2FA exigido para envio de empenho e aditivo

---

### `MOD-12` · Rede Credenciada

#### REQ-48

**Prioridade:** 🔴 Alta
**Item Checklist PoC:** 48

```typescript
// src/services/establishment.service.ts
import { api } from '@/lib/api'

export interface Establishment {
  id: string
  name: string
  cnpj: string
  address: string
  city: string
  state: string
  lat?: number
  lng?: number
  phone: string
  email?: string
  servicesDescription: string
  ordersCompleted: number
  rating: number
  isFavorite: boolean
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
}

export async function listEstablishments(params?: {
  search?: string
  city?: string
  state?: string
}): Promise<Establishment[]> {
  const { data } = await api.get<Establishment[]>('/establishments', { params })
  return data
}

export async function getEstablishmentById(id: string): Promise<Establishment> {
  const { data } = await api.get<Establishment>(`/establishments/${id}`)
  return data
}

export async function toggleFavorite(id: string, favorite: boolean): Promise<void> {
  await api.patch(`/establishments/${id}/favorite`, { favorite })
}
```

**Critérios de aceite PoC:**
- [ ] Filtros por nome, estado e município funcionais
- [ ] Endereço com opção de visualização no mapa
- [ ] Nota de avaliação exibida
- [ ] Quantidade de pedidos atendidos visível
- [ ] Favoritar funcional

---

### `MOD-13` · Mobile

#### REQ-49

**Prioridade:** 🔴 Alta
**Item Checklist PoC:** 49

```
Plataforma : iOS (App Store) — obrigatório conforme edital
Framework  : React Native / Expo ou Swift nativo
```

```typescript
// mobile/src/services/api.ts
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const mobileApi = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 30_000,
})

mobileApi.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```

**Critérios de aceite PoC:**
- [ ] App disponível na App Store (iOS) ou demonstrado em TestFlight
- [ ] Listagem de pedidos funcional no app
- [ ] Autenticação com biometria nativa do device (Face ID / Touch ID)

---

### `MOD-14` · Configurações do Sistema

#### REQ-50–52

**Prioridade:** 🔴 Alta
**Itens Checklist PoC:** 50, 51, 52

```typescript
// src/services/settings.service.ts
import { api } from '@/lib/api'

export type BillingMode = 'CENTRALIZED' | 'DECENTRALIZED'

export interface SystemSettings {
  billingMode: BillingMode
  billingClosingDay: number
  requireManagerApproval: boolean
  requireBudgetValidation: boolean
  minimumProposalsForApproval: number
  restrictOrderCreationToVerifiedUsers: boolean
}

export async function getSettings(): Promise<SystemSettings> {
  const { data } = await api.get<SystemSettings>('/settings')
  return data
}

export async function updateSettings(dto: Partial<SystemSettings>): Promise<SystemSettings> {
  const { data } = await api.patch<SystemSettings>('/settings', dto)
  return data
}
```

**Critérios de aceite PoC:**
- [ ] Toggle entre faturamento centralizado e descentralizado
- [ ] Campo de data de fechamento configurável
- [ ] Toggle para exigir aprovação do gestor em novas OS
- [ ] Campo de quantidade mínima de propostas configurável
- [ ] Restrição de criação de pedidos a usuários verificados funcional

---

### `MOD-15` · Relatórios Gerenciais

#### REQ-53–60

**Prioridade:** 🔴 Alta
**Itens Checklist PoC:** 53–60

| REQ | Relatório | Filtros | Campos-chave |
|---|---|---|---|
| 54 | Pedidos | Período, secretaria, situação | Nº pedido, data, solicitante, fornecedor, status |
| 55 | Lojas Credenciadas | Nome, CNPJ | Nome, CNPJ, endereço |
| 56 | Valor por Produto | Produto, período | Mínimo, médio, máximo |
| 57 | Gastos por Período | Mês / intervalo livre | Consolidado por período |
| 58 | Produtos Mais Comprados | Período | Ranking por volume ou valor |
| 59 | Operações Realizadas | Usuário, tipo, período | Log de ações administrativas |

```typescript
// src/services/reports.service.ts
import { api } from '@/lib/api'

export type ReportType =
  | 'ORDERS'
  | 'ESTABLISHMENTS'
  | 'PRODUCT_VALUE'
  | 'EXPENSES_BY_PERIOD'
  | 'TOP_PRODUCTS'
  | 'OPERATIONS_LOG'

export type ExportFormat = 'PDF' | 'EXCEL'

export interface ReportFilters {
  from?: string
  to?: string
  secretaryId?: string
  status?: string
  productName?: string
  userId?: string
  sortBy?: 'VOLUME' | 'VALUE'
}

export async function generateReport(
  type: ReportType,
  filters: ReportFilters,
  format: ExportFormat
): Promise<Blob> {
  const { data } = await api.get('/reports/export', {
    params: { type, format, ...filters },
    responseType: 'blob',
  })
  return data
}

export async function previewReport(
  type: ReportType,
  filters: ReportFilters
): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
  const { data } = await api.get('/reports/preview', {
    params: { type, ...filters },
  })
  return data
}
```

**Critérios de aceite PoC:**
- [ ] Todos os 6 tipos de relatório demonstrados
- [ ] Filtros e segmentações funcionais
- [ ] Exportação em PDF e Excel funcional para cada tipo

---

### `MOD-16` · Integrações e APIs

#### REQ-61

**Prioridade:** 🔴 Alta
**Item Checklist PoC:** 61

```typescript
// src/services/integrations.service.ts
import { api } from '@/lib/api'

export interface ApiKey {
  id: string
  name: string
  key: string
  createdAt: string
  lastUsedAt?: string
  permissions: string[]
}

export interface ApiCallLog {
  id: string
  endpoint: string
  method: string
  statusCode: number
  responseTimeMs: number
  occurredAt: string
  ipAddress: string
  apiKeyId: string
}

export interface IntegrationStats {
  totalCallsToday: number
  successRate: number
  avgResponseTimeMs: number
  failedCalls: number
  topEndpoints: { endpoint: string; count: number }[]
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const { data } = await api.get<ApiKey[]>('/integrations/api-keys')
  return data
}

export async function createApiKey(
  name: string,
  permissions: string[]
): Promise<ApiKey & { rawKey: string }> {
  const { data } = await api.post('/integrations/api-keys', { name, permissions })
  return data
}

export async function getApiCallLogs(params?: {
  apiKeyId?: string
  statusCode?: number
  from?: string
  to?: string
}): Promise<ApiCallLog[]> {
  const { data } = await api.get<ApiCallLog[]>('/integrations/logs', { params })
  return data
}

export async function getIntegrationStats(): Promise<IntegrationStats> {
  const { data } = await api.get<IntegrationStats>('/integrations/stats')
  return data
}
```

**Critérios de aceite PoC:**
- [ ] Documentação Swagger/OpenAPI acessível em `/api/docs`
- [ ] Painel de chamadas com status, tempo de resposta e falhas
- [ ] Endpoints de consulta de materiais e pedidos funcionais via API key
- [ ] Guia de boas práticas acessível no painel

---

## Estrutura de Pastas do Projeto

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (protected)/
│   │   ├── dashboard/page.tsx
│   │   ├── secretaries/
│   │   ├── users/
│   │   ├── orders/
│   │   ├── stock/
│   │   ├── financial/
│   │   ├── bi/
│   │   ├── budget/
│   │   ├── establishments/
│   │   ├── settings/
│   │   ├── reports/
│   │   ├── audit/
│   │   └── integrations/
│   └── api/
├── components/
│   ├── ui/                       # shadcn/ui base components
│   ├── dashboard/
│   ├── orders/
│   ├── stock/
│   ├── financial/
│   ├── bi/
│   ├── auth/
│   │   └── BiometricCapture.tsx
│   └── shared/
├── lib/
│   ├── api.ts                    # instância axios centralizada
│   ├── auth.ts
│   └── utils.ts
├── services/                     # todos os arquivos .service.ts
├── hooks/                        # React Query hooks
├── store/                        # Zustand stores
└── types/                        # TypeScript interfaces globais
```

---

## Endpoints Backend (Referência Rápida)

| Método | Endpoint | Módulo | REQ |
|---|---|---|---|
| GET | `/dashboard` | Dashboard | 02 |
| GET/POST/PATCH/DELETE | `/secretaries` | Secretarias | 03–06 |
| GET/POST/PATCH | `/users` | Usuários | 07–09, 15 |
| POST | `/auth/login` | Auth | 10–12 |
| POST | `/auth/biometric-verify` | Auth | 10–12 |
| POST | `/auth/refresh` | Auth | — |
| POST | `/auth/logout` | Auth | — |
| POST | `/auth/2fa/request` | Auth 2FA | 21, 47 |
| POST | `/auth/2fa/validate` | Auth 2FA | 21, 47 |
| GET | `/auth/biometric-history` | Auth Log | 13 |
| GET/POST | `/orders` | OS | 16, 17 |
| GET | `/orders/:id` | OS | 19 |
| GET | `/items/search` | OS | 18 |
| POST | `/orders/:id/confirm-delivery` | OS | 22–24 |
| POST | `/orders/:id/non-conformities` | OS | 25–27 |
| POST | `/orders/:id/approve` | OS | 21 |
| POST | `/orders/:id/print` | OS | 28 |
| GET/POST | `/orders/:id/chat` | Chat | 29 |
| GET | `/stock/dashboard` | Estoque | 30 |
| GET | `/stock/inventory` | Estoque | 31 |
| GET/POST/PATCH | `/stock/items` | Estoque | 32 |
| GET/POST | `/stock/movements` | Estoque | 33 |
| GET | `/stock/analytics` | Estoque BI | 34–37 |
| GET/POST | `/stock/locations` | Estoque | 43 |
| GET | `/audit/logs` | Auditoria | 39, 40 |
| GET | `/financial/summary` | Financeiro | 41 |
| GET/POST | `/financial/invoices` | Financeiro | 41 |
| GET | `/financial/invoices/:id/pdf` | Financeiro | 41 |
| POST | `/financial/invoices/:id/proof` | Financeiro | 41 |
| GET | `/bi/data` | BI | 42–44 |
| GET | `/bi/export` | BI | 44 |
| GET | `/budget/contracts/:id` | Orçamento | 45, 46 |
| POST | `/budget/contracts/:id/additives` | Orçamento | 45, 47 |
| POST | `/budget/contracts/:id/commitments` | Orçamento | 46, 47 |
| GET | `/establishments` | Credenciadas | 48 |
| GET/PATCH | `/establishments/:id` | Credenciadas | 48 |
| GET/PATCH | `/settings` | Configurações | 50–52 |
| GET | `/reports/preview` | Relatórios | 53–59 |
| GET | `/reports/export` | Relatórios | 60 |
| GET/POST | `/integrations/api-keys` | APIs | 61 |
| GET | `/integrations/logs` | APIs | 61 |
| GET | `/integrations/stats` | APIs | 61 |
| GET/PATCH | `/config/brand` | Core | 01 |

---

## Checklist de Validação para a PoC

> Preencher durante a sessão presencial. **Todos os itens devem ser Sim.**

| ID | Módulo | Requisito | Sim | Não | Obs |
|---|---|---|---|---|---|
| 01 | Core | Acesso remoto + responsividade + identidade visual | ☐ | ☐ | |
| 02 | Dashboard | Painel interativo com todos os 10 sub-itens | ☐ | ☐ | |
| 03 | Secretarias | Interface de cadastro | ☐ | ☐ | |
| 04 | Secretarias | Formulário com 5 campos | ☐ | ☐ | |
| 05 | Secretarias | Visualização com progresso orçamentário | ☐ | ☐ | |
| 06 | Secretarias | Resumo financeiro (empenho / pedidos / sub) | ☐ | ☐ | |
| 07 | Usuários | Cadastro por formulário | ☐ | ☐ | |
| 08 | Usuários | 6 campos obrigatórios | ☐ | ☐ | |
| 09 | Usuários | 3 perfis de acesso distintos | ☐ | ☐ | |
| 10 | Segurança | Biometria facial + IA | ☐ | ☐ | |
| 11 | Segurança | Liveness detection anti-fraude | ☐ | ☐ | |
| 12 | Segurança | Biometria obrigatória no login | ☐ | ☐ | |
| 13 | Segurança | Histórico biométrico auditável | ☐ | ☐ | |
| 14 | Segurança | Acesso TCE/MP com painel restrito | ☐ | ☐ | |
| 15 | Usuários | Listagem com filtro e último login | ☐ | ☐ | |
| 16 | OS | Listagem com 9 sub-itens | ☐ | ☐ | |
| 17 | OS | Abertura com 13 campos | ☐ | ☐ | |
| 18 | OS | Pesquisa inteligente de itens | ☐ | ☐ | |
| 19 | OS | Visão completa com timeline | ☐ | ☐ | |
| 20 | OS | Notas fiscais na OS | ☐ | ☐ | |
| 21 | Segurança | 2FA na aprovação de OS | ☐ | ☐ | |
| 22 | OS | Confirmação de recebimento com fotos | ☐ | ☐ | |
| 23 | OS | Registro automático data/hora/responsável | ☐ | ☐ | |
| 24 | OS | Campo de observações no recebimento | ☐ | ☐ | |
| 25 | OS | Não conformidades com fotos | ☐ | ☐ | |
| 26 | OS | Registro automático nas não conformidades | ☐ | ☐ | |
| 27 | OS | Observações nas não conformidades | ☐ | ☐ | |
| 28 | OS | PDF com marcadores digitais | ☐ | ☐ | |
| 29 | Chat | Chat com imagens em tempo real | ☐ | ☐ | |
| 30 | Estoque | Dashboard de estoque (4 indicadores) | ☐ | ☐ | |
| 31 | Estoque | Inventário com filtro e galeria/lista | ☐ | ☐ | |
| 32 | Estoque | Edição de itens com QR e código de barras | ☐ | ☐ | |
| 33 | Estoque | Histórico de movimentações | ☐ | ☐ | |
| 34 | Estoque | Painel gerencial dinâmico + Curva ABC | ☐ | ☐ | |
| 35 | Estoque | Indicadores estratégicos automáticos | ☐ | ☐ | |
| 36 | Estoque | Curva ABC automática | ☐ | ☐ | |
| 37 | Estoque | Recomendações gerenciais automáticas | ☐ | ☐ | |
| 38 | Estoque | Resumo semanal por e-mail e mensagens | ☐ | ☐ | |
| 39 | Auditoria | Módulo de logs com filtros | ☐ | ☐ | |
| 40 | Auditoria | Logs imutáveis (403 ao tentar deletar) | ☐ | ☐ | |
| 41 | Financeiro | Módulo financeiro completo | ☐ | ☐ | |
| 42 | BI | Módulo BI com 8 elementos | ☐ | ☐ | |
| 43 | BI | Layout responsivo mobile | ☐ | ☐ | |
| 44 | BI | Exportação PDF / Excel / CSV | ☐ | ☐ | |
| 45 | Orçamento | Gestão orçamentária por contrato | ☐ | ☐ | |
| 46 | Orçamento | Histórico de empenhos com download | ☐ | ☐ | |
| 47 | Segurança | 2FA para empenhos e aditivos | ☐ | ☐ | |
| 48 | Credenciadas | Consulta com mapa e avaliação | ☐ | ☐ | |
| 49 | Mobile | App iOS disponível | ☐ | ☐ | |
| 50 | Config | Regras de fatura (centralizado/descentralizado) | ☐ | ☐ | |
| 51 | Config | Data de fechamento para faturamento | ☐ | ☐ | |
| 52 | Config | Regras de aprovação de pedido | ☐ | ☐ | |
| 53 | Relatórios | Módulo de relatórios gerenciais | ☐ | ☐ | |
| 54 | Relatórios | Relatório de pedidos | ☐ | ☐ | |
| 55 | Relatórios | Relatório de lojas credenciadas | ☐ | ☐ | |
| 56 | Relatórios | Relatório de valor por produto | ☐ | ☐ | |
| 57 | Relatórios | Relatório de gastos por período | ☐ | ☐ | |
| 58 | Relatórios | Relatório de produtos mais comprados | ☐ | ☐ | |
| 59 | Relatórios | Relatório de operações realizadas | ☐ | ☐ | |
| 60 | Relatórios | Exportação PDF e Excel | ☐ | ☐ | |
| 61 | APIs | Módulo de integrações com painel e docs | ☐ | ☐ | |

---

*Prefeitura Municipal de Araçuaí/MG · Processo Licitatório nº 019/2026 · Pregão Eletrônico nº 008/2026*
*Base: Anexo III — Check List Prova de Conceito · Lei Federal nº 14.133/2021*
