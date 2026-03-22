# EXECUTION PLAN — SaaS BI Prefeitura de Araçuaí/MG
## Pregão Eletrônico nº 008/2026 · Processo nº 019/2026

---

## Mapa de Epics e Waves

```
┌─────────────────────────────────────────────────────────────────────┐
│  WAVE 1 — FUNDAÇÃO (bloqueante)                                     │
│  EPIC-1: Core + Auth + Usuários                                     │
│  Stories: 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7 → 1.8         │
│  PoC Items: 01, 07, 08, 09, 10, 11, 12, 13, 14, 15, 21, 47        │
│                                    ┌──────────────────────┐         │
│                                    │ PARALELO: Story 5.4  │         │
│                                    │ Mobile iOS scaffold  │         │
│                                    └──────────────────────┘         │
├─────────────────────────────────────────────────────────────────────┤
│  WAVE 2 — CORE BUSINESS (requer Wave 1)                             │
│  EPIC-2: Secretarias + OS + Auditoria                               │
│  Stories: 2.1 → 2.2 ┬ 2.3                                          │
│                      └ 2.4 → 2.5 → 2.6                             │
│                      └ 2.7 (paralelo)                               │
│                      └ 2.8 (paralelo desde 2.1)                     │
│  PoC Items: 03–06, 16–29, 39–40                                    │
├─────────────────────────────────────────────────────────────────────┤
│  WAVE 3 — GESTÃO (requer Wave 2)                                    │
│  EPIC-3: Estoque + Financeiro + Orçamento                           │
│  Stories: 3.1 → 3.2 → 3.3 → 3.4                                    │
│                └ 3.5 (paralelo)                                      │
│                └ 3.6 (paralelo, requer Story 1.7)                   │
│  PoC Items: 30–38, 41, 45–47                                       │
├─────────────────────────────────────────────────────────────────────┤
│  WAVE 4 — INTELIGÊNCIA (requer Wave 3)                              │
│  EPIC-4: BI + Relatórios + Credenciadas                             │
│  Stories: 4.1 → 4.2 → 4.3                                          │
│                └ 4.4 (paralelo)                                      │
│                └ 4.5 (paralelo)                                      │
│  PoC Items: 42–44, 48, 53–60                                       │
├─────────────────────────────────────────────────────────────────────┤
│  WAVE 5 — FINALIZAÇÃO (requer Wave 4 + Mobile Wave 1)              │
│  EPIC-5: Dashboard + Config + APIs + Mobile                         │
│  Stories: 5.1 (após Wave 3) + 5.2 + 5.3 (paralelo Wave 1+)        │
│           5.5 (após 5.4)                                             │
│  PoC Items: 02, 49, 50–52, 61                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Resumo por Epic

| Epic | Módulos | Stories | PoC Items | Wave |
|------|---------|---------|-----------|------|
| EPIC-1 Foundation | MOD-01, 04, 05 | 8 | 12 itens | 1 |
| EPIC-2 Core Business | MOD-03, 06, 08 | 8 | 20 itens | 2 |
| EPIC-3 Gestão | MOD-07, 09, 11 | 6 | 13 itens | 3 |
| EPIC-4 Inteligência | MOD-10, 12, 15 | 5 | 12 itens | 4 |
| EPIC-5 Finalização | MOD-02, 13, 14, 16 | 5 | 6 itens | 5 |
| **Total** | **16 módulos** | **32 stories** | **61 itens** | — |

---

## Caminho Crítico

```
Story 5.4 (Mobile iOS) → iniciar HOJE (lead time App Store)
    ↓
Story 1.1 (Scaffolding) → Story 1.3 (Schema) → Story 1.4 (Auth+Biometria)
    ↓
Story 2.4 (OS) → Story 2.5 (Aprovação) → Story 3.5 (Financeiro)
    ↓
Story 5.1 (Dashboard) → PoC pronta
```

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| App Store review delay (2–7 dias) | Alta | Crítico | Submeter na Wave 1, usar TestFlight para PoC |
| Provider biométrico indisponível | Média | Crítico | Definir AWS Rekognition vs face-api.js antes de Story 1.4 |
| Liveness detection falso-positivo | Média | Alto | Testar com múltiplas fotos e ajustar threshold |
| Performance BI com muitos dados | Baixa | Médio | Usar views materializadas (Story 4.1) |
| Integração ViaCEP (CEP) offline | Baixa | Baixo | Fallback manual de endereço |

---

## Como Executar

### Via @pm (este agente)
```
*execute-epic docs/epics/EPIC-1-foundation.md
*execute-epic docs/epics/EPIC-2-core-business.md
*execute-epic docs/epics/EPIC-3-gestao.md
*execute-epic docs/epics/EPIC-4-intelligence.md
*execute-epic docs/epics/EPIC-5-finalizacao.md
```

### Via @sm (para detalhar stories)
```
@sm *draft docs/epics/EPIC-1-foundation.md story 1.1
```

### Via @dev (para implementar)
```
@dev *develop docs/stories/1.1.story.md
```

### Via @qa (para validar)
```
@qa *qa-gate docs/stories/1.1.story.md
```

---

## Checklist Final PoC (61/61 itens obrigatórios)

Todos os 61 itens do Anexo III devem estar ✅ antes da apresentação.
Ver checklist completo em: `docs/prd/prd-saas-bi-prefeitura.md`
