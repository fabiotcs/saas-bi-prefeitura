# EPIC-4 · Inteligência — BI, Relatórios e Rede Credenciada

**Status:** Draft
**Wave:** 4 (requer EPIC-1, EPIC-2 e EPIC-3 concluídos — dados precisam existir)
**Módulos PRD:** MOD-10 · MOD-12 · MOD-15
**REQs cobertos:** REQ-42, REQ-43, REQ-44, REQ-48, REQ-53, REQ-54, REQ-55, REQ-56, REQ-57, REQ-58, REQ-59, REQ-60
**Checklist PoC:** Itens 42, 43, 44, 48, 53, 54, 55, 56, 57, 58, 59, 60

---

## Objetivo

Implementar as camadas de inteligência e visualização de dados: módulo BI com gráficos interativos e exportação multi-formato; consulta e gestão da rede de estabelecimentos credenciados; e módulo de relatórios gerenciais com 6 tipos distintos exportáveis em PDF e Excel.

## Critério de Conclusão do Epic

- Módulo BI com todos os 8 elementos do item 42 visíveis e responsivos
- Filtro de período alterando todos os gráficos simultaneamente
- Exportação PDF, Excel e CSV funcional
- 6 tipos de relatório demonstráveis com filtros e exportação
- Rede credenciada com mapa, avaliação e favoritos

---

## Stories

### Story 4.1 · Schema do Banco — Módulos 10, 12 e 15

**Como** desenvolvedor,
**quero** o schema de Estabelecimentos e dados auxiliares para BI,
**para que** os módulos de inteligência e rede credenciada sejam persistidos.

**Tarefas:**
- [ ] Schema Prisma: `Establishment` (id, name, cnpj, address, city, state, lat, lng, phone, email, servicesDescription, ordersCompleted, rating, isFavorite, status, createdAt)
- [ ] Schema Prisma: `EstablishmentFavorite` (id, establishmentId, userId, createdAt) — tabela de favoritos por usuário
- [ ] View/Materialized View: `bi_daily_metrics` — pré-agregação de dados para consultas BI rápidas
- [ ] Índices de performance nas colunas de filtro frequente (status, secretaryId, createdAt)
- [ ] Migration executada sem erros

**Critérios de aceite:**
- [ ] Migration executa sem erros
- [ ] Estabelecimento com lat/lng para uso no mapa
- [ ] View de métricas BI consultável

---

### Story 4.2 · Módulo BI — Gráficos e KPIs (REQ-42, 43)

**Como** gestor estratégico,
**quero** visualizar dashboards de inteligência com múltiplos gráficos e KPIs,
**para que** decisões gerenciais sejam baseadas em dados consolidados.

**Tarefas:**
- [ ] Implementar `bi.service.ts`: getBIData conforme PRD
- [ ] `GET /api/bi/data?period=` — retorna BIData com todos os campos do PRD
- [ ] Página `/bi` com os 8 elementos obrigatórios do item 42:
  - **a)** Card: total consumido no período (R$)
  - **b)** Card: pedidos em andamento (contagem)
  - **c)** Card: pedidos cancelados ou em disputa (contagem)
  - **d)** Gráfico de linha/barras: orçamentos aceitos por dia (mínimo 7 datas no eixo X)
  - **e)** Gráfico de pizza/donut: pedidos por status (com % e contagem)
  - **f)** Gráfico de barras horizontais: consumo por secretaria (valor R$ + %)
  - **g)** Tabela: top itens mais solicitados (nome, ocorrências, valor total)
  - **h)** Filtro de período global: SEMANAL / MENSAL / TRIMESTRAL / ANUAL
- [ ] Filtro de período altera TODOS os gráficos simultaneamente via React Query
- [ ] Gráficos com `recharts` ou `chart.js` + responsividade
- [ ] Layout totalmente responsivo: testado e funcional em 375px (item 43)

**Critérios de aceite:**
- [ ] Todos os 8 elementos (a–h) do item 42 visíveis
- [ ] Filtro de período altera TODOS os gráficos automaticamente (item 42)
- [ ] Gráfico diário exibe mínimo 7 datas no eixo X (item 42)
- [ ] Layout responsivo funcional em 375px (item 43)

---

### Story 4.3 · Exportação de Dados BI (REQ-44)

**Como** gestor,
**quero** exportar os dados do BI em PDF, Excel e CSV,
**para que** eu possa compartilhar relatórios com stakeholders externos.

**Tarefas:**
- [ ] Implementar `exportBIData(period, format)` e `exportChartPdf(chartId, period)`
- [ ] `GET /api/bi/export?period=&format=` — retorna Blob com Content-Type correto
- [ ] Exportação **PDF**: relatório completo com todos os gráficos renderizados (puppeteer ou html-pdf)
- [ ] Exportação **Excel**: planilha com abas por KPI (xlsx via `exceljs`)
- [ ] Exportação **CSV**: dados tabulares flat (via `csv-stringify`)
- [ ] Botões de exportação no header da página `/bi`: "PDF", "Excel", "CSV"
- [ ] Download automático via `URL.createObjectURL(blob)`
- [ ] Exportação de gráfico individual em PDF (clique no ícone de download em cada gráfico)

**Critérios de aceite:**
- [ ] Exportação PDF, Excel e CSV funcional (item 44)
- [ ] Arquivo baixado com nome e período corretos (ex: `bi-mensal-2026-03.pdf`)
- [ ] Exportação de gráfico individual funcional

---

### Story 4.4 · Rede Credenciada (REQ-48)

**Como** gestor de compras,
**quero** consultar a rede de estabelecimentos credenciados com mapa e avaliações,
**para que** eu identifique os melhores fornecedores para cada pedido.

**Tarefas:**
- [ ] Implementar `establishment.service.ts` completo conforme PRD
- [ ] `GET /api/establishments` com filtros: search, city, state
- [ ] `GET /api/establishments/:id` — detalhes completos
- [ ] `PATCH /api/establishments/:id/favorite` — toggling de favorito por usuário
- [ ] Página `/establishments` com:
  - Listagem em cards: nome, CNPJ, cidade/estado, telefone, serviços, rating (estrelas), pedidos atendidos, status (badge), botão favoritar (coração)
  - Filtros: busca por nome, filtro por estado (select), filtro por município
  - Botão "Ver no Mapa" — abre mapa com `react-leaflet` (OpenStreetMap gratuito) ou Google Maps embed
- [ ] Página `/establishments/:id` com todos os detalhes e mapa do endereço
- [ ] Favoritos persistidos por usuário no banco

**Critérios de aceite:**
- [ ] Filtros por nome, estado e município funcionais (item 48)
- [ ] Endereço com opção de visualização no mapa (item 48)
- [ ] Nota de avaliação (estrelas) exibida (item 48)
- [ ] Quantidade de pedidos atendidos visível (item 48)
- [ ] Favoritar funcional e persistido (item 48)

---

### Story 4.5 · Módulo de Relatórios Gerenciais (REQ-53–60)

**Como** gestor ou auditor,
**quero** gerar relatórios gerenciais com filtros e exportar em PDF e Excel,
**para que** análises específicas sejam produzidas sob demanda.

**Tarefas:**
- [ ] Implementar `reports.service.ts`: generateReport, previewReport conforme PRD
- [ ] `GET /api/reports/preview?type=&...filters` — retorna dados tabulares para preview
- [ ] `GET /api/reports/export?type=&format=&...filters` — retorna Blob
- [ ] Página `/reports` com seletor de tipo de relatório (6 tipos em cards ou tabs):

  **Relatório 1 — Pedidos (REQ-54):**
  - Filtros: período (data início/fim), secretaria (select), situação (status multi-select)
  - Colunas: Nº pedido, data, solicitante, fornecedor, status, valor

  **Relatório 2 — Lojas Credenciadas (REQ-55):**
  - Filtros: nome, CNPJ
  - Colunas: Nome, CNPJ, endereço, cidade, estado, telefone

  **Relatório 3 — Valor por Produto (REQ-56):**
  - Filtros: nome do produto, período
  - Colunas: Produto, valor mínimo, valor médio, valor máximo, ocorrências

  **Relatório 4 — Gastos por Período (REQ-57):**
  - Filtros: mês específico ou intervalo livre
  - Colunas: Período, secretaria, valor total gasto

  **Relatório 5 — Produtos Mais Comprados (REQ-58):**
  - Filtros: período, ordenação (por volume ou valor)
  - Colunas: Produto, quantidade total, valor total, ranking

  **Relatório 6 — Operações Realizadas (REQ-59):**
  - Filtros: usuário, tipo de operação, período
  - Colunas: Data/hora, usuário, operação, resultado

- [ ] Tabela de preview com dados reais antes de exportar
- [ ] Botões "Exportar PDF" e "Exportar Excel" em cada relatório
- [ ] Geração PDF com cabeçalho institucional (logo + nome da prefeitura)
- [ ] Excel com formatação de colunas e totalizadores

**Critérios de aceite:**
- [ ] Todos os 6 tipos de relatório demonstráveis (item 53)
- [ ] Filtros e segmentações funcionais em cada tipo (itens 54–59)
- [ ] Exportação PDF funcional para cada tipo (item 60)
- [ ] Exportação Excel funcional para cada tipo (item 60)
- [ ] Preview de dados antes de exportar funcional

---

## Ordem de execução das stories

```
4.1 (schema) → 4.2 → 4.3 (em sequência — exportação depende dos gráficos)
             → 4.4 (pode rodar em paralelo com 4.2)
             → 4.5 (pode rodar em paralelo com 4.2/4.4 — independente de BI)
```
