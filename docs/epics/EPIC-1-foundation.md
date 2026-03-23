# EPIC-1 · Fundação — Core, Autenticação e Usuários

**Status:** Draft
**Wave:** 1 (bloqueante — deve ser concluído antes de todos os outros epics)
**Módulos PRD:** MOD-01 · MOD-05 · MOD-04
**REQs cobertos:** REQ-01, REQ-07, REQ-08, REQ-09, REQ-10, REQ-11, REQ-12, REQ-13, REQ-14, REQ-15, REQ-21, REQ-47
**Checklist PoC:** Itens 01, 07, 08, 09, 10, 11, 12, 13, 14, 15, 21, 47

---

## Objetivo

Estabelecer a fundação técnica completa do sistema: scaffolding do projeto, identidade visual, sistema de autenticação com biometria facial + liveness detection, 2FA e gestão de usuários com perfis de acesso. Todos os demais epics dependem deste.

## Critério de Conclusão do Epic

- Projeto Next.js 14 rodando com Tailwind + shadcn/ui
- Login com biometria obrigatória funcionando end-to-end
- Liveness detection recusando foto estática
- 4 perfis de acesso distintos e funcionais
- Identidade visual da Prefeitura de Araçuaí aplicada

---

## Stories

### Story 1.1 · Scaffolding do Projeto e Configuração Base

**Como** desenvolvedor,
**quero** o projeto Next.js 14 configurado com toda a stack definida no PRD,
**para que** todos os demais módulos possam ser implementados sobre uma base sólida.

**Tarefas:**
- [ ] Criar projeto Next.js 14 com App Router e TypeScript 5+
- [ ] Configurar Tailwind CSS + shadcn/ui (instalar componentes base: Button, Input, Card, Dialog, Table, Badge, Progress, Select, Form)
- [ ] Criar `src/lib/api.ts` com instância axios centralizada (interceptors de auth + erro conforme PRD)
- [ ] Configurar Prisma ORM + conexão PostgreSQL
- [ ] Configurar variáveis de ambiente (`.env.local`, `.env.example`)
- [ ] Estrutura de pastas conforme PRD: `app/`, `components/`, `lib/`, `services/`, `hooks/`, `store/`, `types/`
- [ ] Configurar Zustand store base
- [ ] Configurar TanStack Query (React Query v5) com QueryClient provider
- [ ] Configurar Vitest + Testing Library
- [ ] ESLint + Prettier + TypeScript strict mode
- [ ] `package.json` com scripts: `dev`, `build`, `test`, `lint`, `typecheck`

**Critérios de aceite:**
- [ ] `npm run dev` sobe sem erros
- [ ] `npm run typecheck` passa sem erros
- [ ] `npm run lint` passa sem erros
- [ ] Estrutura de pastas conforme PRD criada

---

### Story 1.2 · Identidade Visual e Layout Base (REQ-01)

**Como** gestor da Prefeitura de Araçuaí,
**quero** ver o logo, cores e identidade visual do município no sistema,
**para que** a solução reflita a instituição contratante.

**Tarefas:**
- [ ] Criar schema Prisma: `BrandConfig` (logoUrl, primaryColor, secondaryColor, faviconUrl, municipalityName)
- [ ] Criar `src/services/config.service.ts` com `fetchBrandConfig` e `updateBrandConfig` (axios)
- [ ] Implementar `GET /api/config/brand` e `PATCH /api/config/brand` (Route Handlers)
- [ ] Criar layout root com aplicação dinâmica de cores via CSS variables
- [ ] Componente `<BrandProvider>` que carrega config e injeta no tema
- [ ] Favicon dinâmico via `app/icon.tsx`
- [ ] Layout responsivo base: breakpoints 320px, 768px, 1024px, 1440px
- [ ] Sidebar responsiva (colapsa em mobile)
- [ ] Rota `/login` pública — todas as demais redirecionam para `/login` se não autenticado

**Critérios de aceite:**
- [ ] Logo e cores da Prefeitura de Araçuaí visíveis
- [ ] Layout não quebra em 375px e 1440px
- [ ] Rota `/dashboard` sem token redireciona para `/login`
- [ ] Chrome, Firefox e Edge sem erros de console

---

### Story 1.3 · Schema do Banco de Dados — Módulos 1, 4 e 5

**Como** desenvolvedor,
**quero** o schema completo do banco para os módulos de fundação,
**para que** Auth, Usuários e Config tenham estrutura persistente imutável desde o início.

**Tarefas:**
- [ ] Schema Prisma: `User` (id, fullName, birthDate, phone, email, cpf, rg, role, secretaryId, photoUrl, lastLogin, biometricVerified, documentVerified, passwordHash, createdAt, updatedAt)
- [ ] Schema Prisma: `Session` (id, userId, refreshToken, expiresAt, ipAddress, userAgent)
- [ ] Schema Prisma: `BiometricRecord` (id, userId, capturedImageUrl, similarityScore, livenessScore, confidenceLevel, fraudAlertLevel, aiEstimatedAge, ipAddress, status, createdAt) — **SEM UPDATE/DELETE via trigger**
- [ ] Schema Prisma: `AuditLog` (id, action, urlPath, userId, ipAddress, status, occurredAt) — **SEM UPDATE/DELETE via trigger**
- [ ] Schema Prisma: `TwoFactorRequest` (id, userId, action, otpHash, expiresAt, used)
- [ ] Migration inicial com triggers de imutabilidade no PostgreSQL para `BiometricRecord` e `AuditLog`
- [ ] Seed de usuário `MAIN_MANAGER` inicial para testes

**Critérios de aceite:**
- [ ] `npx prisma migrate dev` executa sem erros
- [ ] Trigger bloqueia UPDATE/DELETE em `audit_logs` e `biometric_records`
- [ ] Seed cria usuário admin funcional

---

### Story 1.4 · Autenticação JWT + Biometria Facial (REQ-10, 12)

**Como** usuário do sistema,
**quero** fazer login com e-mail/senha + verificação biométrica facial,
**para que** apenas eu, com meu rosto confirmado, possa acessar o sistema.

**Tarefas:**
- [ ] `POST /api/auth/login` — valida email/senha, emite challengeToken (JWT curto, 5min)
- [ ] Componente `<BiometricCapture>` — acessa webcam via `getUserMedia`, captura frame como Blob
- [ ] `POST /api/auth/biometric-verify` — recebe multipart (challengeToken + faceImage + documentImage opcional), chama provider biométrico, retorna BiometricResult
- [ ] Integração com provider biométrico: **AWS Rekognition** (via axios) ou **face-api.js** (client-side)
- [ ] Emissão de JWT accessToken (15min) + refreshToken (7d) em caso de sucesso
- [ ] `POST /api/auth/refresh` — renova accessToken com refreshToken válido
- [ ] `POST /api/auth/logout` — invalida refreshToken
- [ ] Middleware Next.js protegendo todas as rotas `/(protected)/*`
- [ ] Registro automático em `BiometricRecord` a cada tentativa (sucesso ou falha)
- [ ] Registro em `AuditLog` a cada autenticação

**Critérios de aceite:**
- [ ] Login sem biometria é bloqueado pelo backend
- [ ] Login com credenciais válidas + biometria retorna JWT funcional
- [ ] Registro biométrico salvo com similarityScore, livenessScore e imagem capturada
- [ ] IP registrado em cada tentativa

---

### Story 1.5 · Liveness Detection e Anti-Fraude (REQ-11)

**Como** gestor de segurança,
**quero** que o sistema detecte tentativas de fraude com fotos estáticas,
**para que** apenas uma pessoa real e presente possa autenticar.

**Tarefas:**
- [ ] Implementar liveness detection no fluxo biométrico (challenge de movimento: piscar, virar cabeça, ou análise de textura)
- [ ] Lógica de fraudAlertLevel: NONE (<5% risco) / LOW (5-20%) / MEDIUM (20-50%) / HIGH (>50%)
- [ ] Bloqueio automático quando fraudAlertLevel = HIGH
- [ ] Alerta visual no frontend quando fraudAlertLevel = MEDIUM
- [ ] Campo `aiEstimatedAge` preenchido pelo provider
- [ ] Teste manual documentado: foto impressa em papel deve retornar FAILED ou SUSPICIOUS

**Critérios de aceite:**
- [ ] Foto estática impressa recusada com status FAILED ou SUSPICIOUS
- [ ] fraudAlertLevel registrado em BiometricRecord
- [ ] Sistema bloqueia acesso com HIGH fraud alert

---

### Story 1.6 · Histórico de Autenticações Biométricas (REQ-13)

**Como** auditor,
**quero** visualizar o histórico completo de autenticações biométricas,
**para que** qualquer tentativa de acesso seja rastreável.

**Tarefas:**
- [ ] `GET /api/auth/biometric-history` com filtros: userId, status, from, to (paginado)
- [ ] Página `/audit/biometric` com tabela: imagem capturada, similarityScore, livenessScore, fraudAlertLevel, IP, status, data/hora
- [ ] Filtros de status: SUCCESS / FAILED / SUSPICIOUS
- [ ] Exportação da listagem em PDF

**Critérios de aceite:**
- [ ] Histórico exibe imagem capturada miniaturizada
- [ ] Filtros por status e período funcionais
- [ ] Registros não podem ser deletados (403 na tentativa)

---

### Story 1.7 · 2FA para Aprovação de OS e Empenhos (REQ-21, REQ-47)

**Como** gestor aprovador,
**quero** confirmar ações críticas com código 2FA,
**para que** aprovações de OS e empenhos tenham dupla confirmação.

**Tarefas:**
- [ ] `POST /api/auth/2fa/request` — gera OTP (6 dígitos, 5min), envia por e-mail ou SMS, persiste hash em `TwoFactorRequest`
- [ ] `POST /api/auth/2fa/validate` — valida OTP, marca como usado, retorna `{ valid: boolean }`
- [ ] Componente `<TwoFactorModal>` reutilizável para OS e empenhos
- [ ] Integrar no fluxo de aprovação de OS (Story 2.5) e empenhos (Story 3.6)

**Critérios de aceite:**
- [ ] OTP expira após 5 minutos
- [ ] OTP só pode ser usado uma vez
- [ ] Modal aparece ao clicar em "Aprovar OS" e "Enviar Empenho"

---

### Story 1.8 · Gestão de Usuários — CRUD + Perfis (REQ-07, 08, 09, 15)

**Como** gestor principal,
**quero** cadastrar, visualizar e gerenciar usuários com perfis de acesso distintos,
**para que** cada colaborador tenha acesso adequado ao sistema.

**Tarefas:**
- [ ] `GET/POST/PATCH /api/users` + `GET /api/users/:id` conforme `user.service.ts` do PRD
- [ ] Página `/users` com listagem: foto, nome, e-mail, perfil (badge colorido), último login, status biométrico
- [ ] Filtros: busca por nome e e-mail
- [ ] Formulário de criação: fullName, birthDate, phone, email, cpf (máscara), rg, role, secretaryId (select)
- [ ] Validações: CPF válido (dígito verificador), e-mail único, todos os 6 campos obrigatórios
- [ ] Upload de foto de perfil (S3-compatible via axios multipart)
- [ ] Perfil `AUDIT_VIEWER` redireciona para `/audit/viewer` ao logar (painel restrito TCE/MP — REQ-14)
- [ ] Guards de rota por perfil: `MAIN_MANAGER` acessa tudo; demais têm restrições via middleware

**Critérios de aceite:**
- [ ] Todos os 6 campos obrigatórios presentes e validados (a–f do item 8)
- [ ] 4 perfis demonstráveis com permissões distintas (item 9)
- [ ] AUDIT_VIEWER só acessa painel de auditoria (item 14)
- [ ] Filtro por nome e e-mail funcional (item 15)
- [ ] Foto, último login e tipo de acesso exibidos na listagem

---

## Dependências Externas

| Dependência | Ação necessária |
|---|---|
| Provider biométrico (AWS Rekognition ou face-api.js) | Definir e configurar credenciais no `.env` antes de Story 1.4 |
| Serviço de e-mail/SMS para 2FA | Configurar (SendGrid, AWS SES ou similar) antes de Story 1.7 |
| Bucket S3-compatible para fotos | Configurar antes de Story 1.8 |

## Ordem de execução das stories

```
1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7 → 1.8
(scaffolding deve vir primeiro; 1.3 antes de 1.4)
```
