# 🔍 AUDITORIA SERVICE DESK — Relatório Completo

> Data: 16/07/2026 · Analisado por: Dev Senior · Escopo: Domínio PedidoInterno + TarefaBacklog + ActivityLog + TaskComment + BacklogChecklistItem

---

## 📊 SCORECARD EXECUTIVO

| Dimensão | Nota | Estrelas |
|----------|------|----------|
| **Arquitetura** | 7.5 | ★★★★☆ |
| **Fluxos** | 7.0 | ★★★★☆ |
| **UX** | 6.0 | ★★★☆☆ |
| **Performance** | 7.0 | ★★★★☆ |
| **Escalabilidade** | 9.0 | ★★★★☆ |
| **Permissões** | 7.5 | ★★★★☆ |
| **Código** | 7.0 | ★★★★☆ |
| **MÉDIA GERAL** | **7.3** | ★★★★☆ |

---

## AUDITORIA 1 — Arquitetura (7.5/10)

### ✅ Pontos Fortes
- **Relacionamentos corretos**: Pedido→Tarefa via `origin_type:'pedido'` + `origin_id`; Tarefa→ActivityLog/TaskComment/Checklist via `entity_type` + `entity_id` / `task_id`
- **Enums padronizados**: Prioridade (baixa/media/alta/critica) consistente em Pedido e Tarefa
- **origin_type expandido**: 10 valores cobrindo todas as origens possíveis
- **RLS por workshop_id**: Todas as entidades têm isolamento por tenant correto
- **ActivityLog imutável**: update/delete = admin only (trilha de auditoria sólida)

### ❌ Problemas

**CRÍTICO — Field names inconsistentes entre schema e código:**

| Campo no Schema | Campo usado no Código | Arquivo | Impacto |
|----------------|---------------------|---------|---------|
| `created_by_id` | `criado_por_id` | BacklogTaskCard.jsx:13 | `canAct` sempre false → botões Iniciar/Concluir não aparecem |
| `assignee_id` | `consultor_id` | TarefaBacklogDetalhe.jsx:126 | `ehExecutor` sempre false → painel de execução não aparece |
| `assigned_to_id` | `atribuido_para_id` | BacklogTaskCard.jsx:13 | Mesmo problema do `canAct` |
| — (não existe) | `anexos` | TarefaBacklogDetalhe.jsx:91,146,215 | Upload de anexos é salvo em campo inexistente → **dados perdidos** |
| — (não existe) | `categoria` | BacklogTaskCard.jsx:19 | Mostra "—" sempre |
| — (não existe) | `assigned_to_name` | BacklogTaskCard.jsx:19 | Mostra fallback para assignee_name |

**MÉDIO — Nomenclatura de usuário fragmentada:**

| Entidade | Campo ID | Campo Nome |
|----------|---------|-----------|
| TarefaBacklog | `assignee_id`, `created_by_id`, `requester_id`, `assigned_to_id` | `assignee_name` |
| PedidoInterno | `requester_id`, `assignee_id` | `requester_name`, `assignee_name` |
| ActivityLog | `actor_id` | `actor_name` |
| TaskComment | `author_id` | `author_name` |

4 convenções diferentes para o mesmo conceito (usuário que executou ação). Padronizar para `actor_id`/`actor_name` ou `user_id`/`user_name`.

**MÉDIO — Campos duplicados / legados:**
- `PedidoInterno.midias_anexas` (array) + `PedidoInterno.arquivos_anexos` (legacy) — dois campos de anexo
- `PedidoInterno.historico` (array inline) + `ActivityLog` — duas fontes de histórico
- `TarefaBacklog.notas` (campo) + `TaskComment` (entidade) — dois lugares para notas/comentários
- `TarefaBacklogHistorico` (entidade) + `ActivityLog` (entidade) — **timeline duplicada**

**BAIXO — `tempo_estimado_horas: 2` hardcoded** em `converterPedidoEmTarefas` — deveria virar configurável ou calcular baseado no tipo de pedido.

---

## AUDITORIA 2 — Fluxos (7.0/10)

### Fluxograma Geral

```
┌─────────────────────────────────────────────────────────┐
│                    FLUXO 1: PEDIDO INTERNO               │
│                                                         │
│  PedidoInternoForm ──create──► [pendente]               │
│         │                                               │
│         ▼                                               │
│  PedidoInternoResponder (resposta + evidências)         │
│         │                                               │
│    ┌────┴────┐                                          │
│    ▼         ▼                                          │
│  Aprovar   ❌ Recusar (sem botão!)                      │
│    │                                                    │
│    ▼                                                    │
│  [aprovado] ──auto──► converterPedidoEmTarefas          │
│    │                    │                               │
│    │                    ▼                               │
│    │              TarefaBacklog.create                   │
│    │              (origin_type='pedido', origin_id=...) │
│    │                    │                               │
│    ▼                    ▼                               │
│  [concluido]     [aberta]                               │
│                         │                               │
│                         ▼                               │
│                  TarefaBacklogDetalhe                    │
│                  (Iniciar → Executar → Concluir)         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                FLUXO 2: TAREFA MANUAL                   │
│                                                         │
│  TarefaBacklogForm (origin_type='manual')              │
│         │                                               │
│         ▼                                               │
│  [aberta] ──Iniciar──► [em_execucao]                    │
│         │                    │                          │
│         │              ┌─────┼──────────┐               │
│         │              ▼     ▼          ▼               │
│         │        Checklist  Comentários  Bloquear       │
│         │        (TarefaChecklist) (ActivityTimeline)    │
│         │              │                                │
│         │              ▼                                │
│         └──Concluir──► [concluida]                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│           FLUXO 3: TAREFA DE FOLLOW-UP                  │
│                                                         │
│  FollowUpReminder (origin_type='followup')              │
│         │                                               │
│    ⚠️ SEM código que cria TarefaBacklog a partir de FU  │
│    ⚠️ origin_type existe no enum mas não há trigger     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│           FLUXO 4: TAREFA DE CRONOGRAMA                 │
│                                                         │
│  CronogramaImplementacao (origin_type='cronograma')     │
│         │                                               │
│    ⚠️ SEM código que cria TarefaBacklog a partir de     │
│       Cronograma. origin_type existe mas não há trigger │
└─────────────────────────────────────────────────────────┘
```

### ✅ Fluxos Funcionais
- **Fluxo 1 (Pedido→Tarefa)**: ✅ Create → Responder → Aprovar → Auto-gerar Tarefa → Executar → Concluir
  - `converterPedidoEmTarefas` tem idempotência (não cria duplicata) ✅
  - Banner de rastreabilidade `OrigemPedidoBanner` bidirecional ✅
- **Fluxo 2 (Manual)**: ✅ Create → Iniciar → Checklist + Comentários → Concluir

### ❌ Problemas

**CRÍTICO — Fluxo 3 e 4 não implementados:**
- `origin_type: 'followup'` existe no enum mas **nenhum código** cria TarefaBacklog a partir de FollowUpReminder
- `origin_type: 'cronograma'` existe no enum mas **nenhum código** cria TarefaBacklog a partir de CronogramaImplementacao
- Estes fluxos são "vazios" — o usuário pode selecionar a origem no formulário, mas não há geração automática

**MÉDIO — Falta botão "Recusar" no PedidoInternoResponder:**
- O enum `PedidoInterno.status` tem `recusado`, mas o componente `PedidoInternoResponder` só tem "Aprovar e Gerar Tarefa" e "Concluir"
- Não há caminho de UI para rejeitar um pedido

**MÉDIO — PedidoInternoForm usa Employee.id como assignee_id:**
- Linha 188: `<SelectItem key={u.id} value={u.id}>` — usa Employee.id (não User.id)
- Linha 100: `assignee_id: empId` — salva Employee.id no campo que deveria ser User.id
- **Bug de integridade**: `assignee_id` em PedidoInterno deveria referenciar User.id, não Employee.id

**BAIXO — Sem botão "Em Análise":**
- O status `em_analise` existe mas não há transição explícita no fluxo de resposta

---

## AUDITORIA 3 — UX Técnica (6.0/10)

### ❌ Problemas Identificados (sem redesenhar, só listar)

**CRÍTICO:**
1. **Timeline duplicada no TarefaBacklogDetalhe**: Card "Histórico de Alterações" (TarefaBacklogHistorico) + Card "Timeline & Atividades" (ActivityLog + TaskComment) — **dois timelines sobrepostos** mostrando os mesmos eventos
2. **Comentários duplicados**: Card "Comentários" mostra `tarefa.notas` (texto simples) + ActivityTimeline tem input de comentários estruturados — **duas formas de comentar na mesma tela**

**MÉDIO:**
3. **Scroll excessivo no TarefaBacklogDetalhe**: 9+ cards empilhados verticalmente (Cabeçalho, Banner ATA, Banner Pedido, Banner Aguardando, Dados Gerais, Responsáveis, Motivo Bloqueio, Histórico, Comentários/Notas, Anexos, Painel Execução, Checklist, Timeline)
4. **Modais enormes**: `TarefaBacklogModal` renderiza o `TarefaBacklogDetalhe` inteiro dentro de um modal — scroll dentro de scroll
5. **Muitos cliques para aprovar pedido**: Digitar resposta → clicar "Aprovar e Gerar Tarefa" → toast → fechar modal → ir para backlog
6. **Painel de Execução escondido**: Só aparece para `ehExecutor` (que está QUEBRADO por causa do `consultor_id`), mas o botão "Concluir" aparece no header para todos
7. **Botões escondidos**: `canAct` no BacklogTaskCard está quebrado (`criado_por_id`/`consultor_id`/`atribuido_para_id` não existem) → botões Iniciar/Concluir nunca aparecem no card
8. **Workshop ID hardcoded**: `TarefaBacklogForm:77` tem `workshop_id: '695408b3ed74bfeb60d708c0'` — só lista consultores da oficina matriz

**BAIXO:**
9. **Cards gigantes**: Cada Card tem `p-4 sm:p-6` + `rounded-xl/2xl` — muito espaçoso
10. **Sem tabs/accordion**: Tudo empilhado, sem agrupar seções relacionadas
11. **Sem paginação no dashboard**: Lista carrega todas as tarefas sem lazy load

---

## AUDITORIA 4 — Componentização (7.0/10)

### Componentes Repetidos Identificados

| Padrão | Onde aparece | Recomendação |
|--------|-------------|--------------|
| **StatusBadge** | TarefaBacklogDetalhe, PedidoInternoResponder, BacklogDashboard, BacklogTaskCard, BacklogFilters | Extrair `<StatusBadge entity="tarefa" status="aberta" />` |
| **PriorityBadge** | TarefaBacklogDetalhe, PedidoInternoResponder, BacklogDashboard, BacklogTaskCard | Extrair `<PriorityBadge prioridade="alta" />` |
| **OriginBadge** | TarefaBacklogDetalhe, TarefaBacklogForm, BacklogTaskCard, BacklogFilters | Extrair `<OriginBadge origin_type="reuniao" />` |
| **UserAvatar** | ActivityTimeline (getInitials inline) | Extrair `<UserAvatar name={...} size="sm" />` |
| **Timeline** | ActivityTimeline (shared) ✅ + TarefaBacklogDetalhe TimelineItem (duplicado) | Remover TimelineItem duplicado do detalhe |
| **AttachmentList** | ActivityTimeline (inline), TarefaBacklogAnexosVisualizador, PedidoInternoVisualizador | Extrair `<AttachmentList items={[...]} />` |
| **MediaUpload** | TarefaBacklogMediaUpload, PedidoInternoMediaUpload | Unificar em `<MediaUpload value={...} onChange={...} />` |
| **formatTimeAgo** | ActivityTimeline (inline) | Mover para `@/utils/formatters` |
| **CONFIG maps** | STATUS_CONFIG, PRIORIDADE_CONFIG, ORIGIN_LABELS, ACAO_CONFIG | Centralizar em `@/components/lib/backlogConstants.jsx` |
| **Combobox+Select de cliente** | TarefaBacklogForm, PedidoInternoForm | Extrair `<ClienteSelect value={...} onChange={...} />` |
| **Combobox+Select de consultor** | TarefaBacklogForm, PedidoInternoForm | Extrair `<ConsultorSelect value={...} onChange={...} />` |

### Oportunidade de Design System
```
src/components/shared/
├── badges/
│   ├── StatusBadge.jsx        (entity + status → badge colorido)
│   ├── PriorityBadge.jsx       (prioridade → badge)
│   └── OriginBadge.jsx         (origin_type → badge)
├── UserAvatar.jsx              (name → initials + cor)
├── AttachmentList.jsx          (items → links com ícone por tipo)
├── MediaUpload.jsx             (unificado Tarefa + Pedido)
├── Timeline.jsx               (já existe como ActivityTimeline ✅)
└── form/
    ├── ClienteSelect.jsx       (workshop combobox)
    └── ConsultorSelect.jsx    (employee/user combobox)
```

**Constantes centralizadas:**
```
src/components/lib/backlogConstants.jsx
├── TAREFA_STATUS_CONFIG
├── PEDIDO_STATUS_CONFIG
├── PRIORIDADE_CONFIG
├── ORIGIN_LABELS
├── TIPO_PEDIDO_LABELS
└── ACAO_HISTORICO_CONFIG
```

---

## AUDITORIA 5 — Performance (7.0/10)

### Queries por Tela

| Tela | Queries | Problemas |
|------|---------|-----------|
| **BacklogDashboard** | 2 (tarefas + workshops) | ❌ `TarefaBacklog.filter()` sem limit — carrega TODAS as tarefas; ❌ `Workshop.list()` sem limit |
| **TarefaBacklogDetalhe** | 1 (historico) + N (users) | ❌ 3 chamadas `User.filter({id})` sequenciais no useEffect; ❌ `TarefaBacklogHistorico.filter()` sem limit; ❌ ActivityTimeline faz +2 queries |
| **TarefaBacklogForm** | 2 (workshops + employees) | ❌ `Employee.filter(..., 1000)` limit 1000; ❌ `workshop_id` hardcoded |
| **PedidoInternoForm** | 2 (employees + workshops) | ❌ `Employee.filter({user_type:'internal'})` sem workshop_id — carrega todos globais; ❌ `Workshop.list()` sem limit |
| **ActivityTimeline** | 2 (ActivityLog + TaskComment) | ⚠️ limit 200 + staleTime 30s — aceitável mas sem realtime |

### Invalidates Problemáticos
- `BacklogDashboard`: `invalidateQueries(['tarefas-backlog'])` — invalida lista inteira a cada mutation ✅ correto
- `TarefaBacklogDetalhe`: `invalidateQueries(['tarefa-historico', tarefa.id])` — invalida só o histórico ✅
- ❌ **Faltam invalidates**: mutations em TarefaBacklogDetalhe (concluir, bloquear, aguardar) NÃO invalidam `['tarefas-backlog']` — a lista do dashboard não atualiza após concluir/bloquear

### useEffects
- `TarefaBacklogDetalhe`: 1 useEffect com 3 chamadas `User.filter` sequenciais — deveria ser 1 chamada com `$in`
- `TarefaChecklist`: 1 useEffect que faz `TarefaBacklog.update` a cada mudança de itens — pode causar loops

### Re-renderizações
- `BacklogTaskCard`: ✅ `React.memo` com comparação por `updated_date` — bom
- `BacklogDashboard`: `filteredTarefas` recalcula a cada render (não memoizado)
- `TarefaBacklogDetalhe`: re-renderiza a cada mudança de estado local (notas, motivo, etc.)

---

## AUDITORIA 6 — Permissões (7.5/10)

### Matriz de Permissões (RLS + Frontend)

#### PedidoInterno

| Ação | Quem pode (RLS) | Quem pode (UI) | Gap? |
|------|----------------|----------------|------|
| **Ver** | workshop_id match, requester, assignee, admin | Qualquer usuário logado | ⚠️ Frontend não filtra |
| **Criar** | workshop_id match, admin | Qualquer usuário | ✅ OK |
| **Responder** | workshop_id match, requester, assignee, admin | Sem check explícito | ❌ Qualquer um pode responder |
| **Aprovar** | workshop_id match, requester, assignee, admin | Sem check de role | ❌ Solicitante pode aprovar próprio pedido |
| **Recusar** | workshop_id match, requester, assignee, admin | ❌ Sem botão na UI | ❌ Não implementado |
| **Fechar** | admin only (delete) | Sem check | ⚠️ |
| **Comentar** | workshop_id match, admin, internal | Sem check | ✅ OK (RLS cobre) |

#### TarefaBacklog

| Ação | Quem pode (RLS) | Quem pode (UI) | Gap? |
|------|----------------|----------------|------|
| **Ver** | workshop_id, assignee, created_by, requester, assigned_to, admin | Qualquer um | ⚠️ |
| **Editar** | workshop_id, assignee, created_by, assigned_to, admin | `ehCriador` (criador/admin) | ❌ RLS permite update por workshop_id — frontend restritivo mas backend permissivo |
| **Concluir** | workshop_id, assignee, created_by, assigned_to, admin | Header: todos; Painel: ehExecutor (quebrado) | ❌ |
| **Comentar** | workshop_id, admin, internal | Sem check | ✅ |
| **Bloquear** | Mesmo que update | `ehExecutor` (quebrado) | ❌ |

#### Checklist

| Ação | Quem pode (RLS) | Quem pode (UI) | Gap? |
|------|----------------|----------------|------|
| **Alterar (toggle)** | workshop_id, admin, internal | Sem check de assignee | ⚠️ Qualquer interno pode marcar |
| **Criar/Remover** | workshop_id, admin | Sem check | ⚠️ |

#### Comentários (TaskComment)

| Ação | Quem pode (RLS) | Gap? |
|------|----------------|------|
| **Ver** | workshop_id, author, admin, internal | ✅ |
| **Criar** | workshop_id, admin, internal | ✅ |
| **Editar** | author only, admin | ✅ |
| **Remover** | author only, admin | ⚠️ Assignee da tarefa não pode moderar |

### Problemas

**CRÍTICO:**
- `ehExecutor` em TarefaBacklogDetalhe:126 usa `tarefa.consultor_id` (não existe no schema) — **painel de execução nunca aparece**
- `canAct` em BacklogTaskCard:13 usa `criado_por_id`/`consultor_id`/`atribuido_para_id` (não existem) — **botões de ação nunca aparecem no card**
- RLS de update em TarefaBacklog permite update por `workshop_id` match — qualquer usuário do mesmo workshop pode alterar qualquer tarefa (não só assignee/criador)

**MÉDIO:**
- Sem verificação de que o solicitante não pode aprovar seu próprio pedido (conflito de interesse)
- Checklist delete: qualquer interno do workshop pode deletar itens de qualquer tarefa

---

## AUDITORIA 7 — Escalabilidade (9.0/10)

### Features Futuras — Suporte Arquitetural

| Feature | Suportado? | Como | Gap |
|---------|-----------|------|-----|
| **Meu Dia** | ✅ Sim | `TarefaBacklog.filter({assignee_id: user.id, status: {$in: ['aberta','em_execucao']}})` | Nenhum — só criar a view |
| **Inbox** | ✅ Sim | `Notification.filter({user_id, is_read: false})` + `TaskComment` + `ActivityLog` por `actor_id` | Nenhum — dados já existem |
| **WhatsApp** | ⚠️ Parcial | `FollowUpReminder.canal_origem: 'whatsapp'` + função `webhookEvolutionAPI` existe | Sem connector configurado; sem webhook ativo |
| **Push** | ⚠️ Parcial | `NotificationListener` component existe | Sem PWA/service worker; sem push real |
| **Email** | ✅ Sim | `SendEmail` integration + `notificarTarefaBacklog`/`notificarPedidoInterno` já enviam | Limitado a usuários registrados |
| **Dashboard pessoal** | ✅ Sim | Todas as entidades têm `user_id`/`workshop_id` scoping | Nenhum — só criar a view |

### Avaliação
A arquitetura suporta todas as features futuras listadas. Os dados estão corretamente modelados com user_id e workshop_id em todas as entidades relevantes. As notificações já têm o pipeline (Notification entity → NotificationListener → email fallback). Para WhatsApp e Push, a estrutura existe mas precisa de configuração de infraestrutura (Evolution API webhook / PWA service worker).

---

## 📋 LISTA DE ISSUES PRIORIZADA

### 🔴 CRÍTICO (bloqueia funcionalidade)

| # | Issue | Arquivo | Impacto |
|---|-------|---------|---------|
| C1 | `BacklogTaskCard` usa `criado_por_id`/`consultor_id`/`atribuido_para_id` — campos não existem no schema | BacklogTaskCard.jsx:13 | Botões Iniciar/Concluir nunca aparecem no card |
| C2 | `TarefaBacklogDetalhe` usa `tarefa.consultor_id` — campo não existe | TarefaBacklogDetalhe.jsx:126 | Painel de Execução nunca aparece |
| C3 | `tarefa.anexos` referenciado mas não existe no schema TarefaBacklog | TarefaBacklogDetalhe.jsx:91,146,215 | Upload de anexos é perdido |
| C4 | Fluxo 3 (Follow-up→Tarefa) não implementado | — | `origin_type:'followup'` é dead code |
| C5 | Fluxo 4 (Cronograma→Tarefa) não implementado | — | `origin_type:'cronograma'` é dead code |
| C6 | `PedidoInternoForm` salva `Employee.id` em `assignee_id` (deveria ser `User.id`) | PedidoInternoForm.jsx:100,188 | Referência quebrada — assignee nunca resolve para um usuário |

### 🟡 MÉDIO (UX ruim mas não bloqueia)

| # | Issue | Arquivo |
|---|-------|---------|
| M1 | Timeline duplicada: "Histórico" (TarefaBacklogHistorico) + "Timeline & Atividades" (ActivityLog) | TarefaBacklogDetalhe.jsx:400-424 |
| M2 | Comentários duplicados: `tarefa.notas` card + ActivityTimeline comment input | TarefaBacklogDetalhe.jsx:426-431 |
| M3 | Sem botão "Recusar" no PedidoInternoResponder (enum tem `recusado`) | PedidoInternoResponder.jsx |
| M4 | Workshop ID hardcoded: `695408b3ed74bfeb60d708c0` | TarefaBacklogForm.jsx:77 |
| M5 | `Employee.filter` sem workshop_id em PedidoInternoForm | PedidoInternoForm.jsx:49 |
| M6 | 3 chamadas `User.filter({id})` sequenciais no useEffect | TarefaBacklogDetalhe.jsx:108-117 |
| M7 | Mutations no TarefaBacklogDetalhe não invalidam `['tarefas-backlog']` | TarefaBacklogDetalhe.jsx:134-136 |
| M8 | RLS update TarefaBacklog permite update por workshop_id (permissivo demais) | TarefaBacklog.jsonc RLS |
| M9 | Nomenclatura de usuário inconsistente (actor/author/assignee/requester) | Múltiplos |
| M10 | Scroll excessivo (9+ cards empilhados no detalhe) | TarefaBacklogDetalhe.jsx |

### 🟢 BAIXO (tech debt / polish)

| # | Issue | Arquivo |
|---|-------|---------|
| B1 | Config maps duplicadas em 6+ arquivos (STATUS, PRIORIDADE, ORIGIN) | Múltiplos |
| B2 | `formatTimeAgo` inline em ActivityTimeline | ActivityTimeline.jsx:42 |
| B3 | `getInitials` inline em ActivityTimeline | ActivityTimeline.jsx:57 |
| B4 | Sem paginação no BacklogDashboard | BacklogDashboard.jsx:35 |
| B5 | `tempo_estimado_horas: 2` hardcoded no converterPedidoEmTarefas | converterPedidoEmTarefas:87 |
| B6 | `PedidoInterno.midias_anexas` + `arquivos_anexos` (legacy duplicado) | PedidoInterno.jsonc |
| B7 | Cards muito espaçosos (p-4 sm:p-6 + rounded-2xl) | Múltiplos |
| B8 | Sem tabs/accordion para agrupar seções do detalhe | TarefaBacklogDetalhe.jsx |

---

## 🎯 PRÓXIMOS PASSOS RECOMENDADOS

1. **Fix C1-C3** (field names errados) — bloqueia UX, 15min de correção
2. **Fix C6** (Employee.id vs User.id) — bug de integridade de dados
3. **Implementar C4-C5** (triggers de Follow-up e Cronograma → Tarefa)
4. **Remover M1** (timeline duplicada) — remover card de TarefaBacklogHistorico, usar só ActivityTimeline
5. **Adicionar M3** (botão Recusar)
6. **Criar Design System** (B1-B3) — economizará muito tempo nas próximas tasks