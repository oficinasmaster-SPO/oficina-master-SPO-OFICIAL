# TASK 7 — Entidade `ActivityLog` + Timeline Unificada — FECHAMENTO

## Objetivo
Log de eventos automáticos + timeline que mistura ActivityLog + TaskComment (estilo Jira). ActivityLog NÃO substitui históricos existentes — é uma camada nova para eventos automáticos.

## Status: ✅ IMPLEMENTADO

---

## 1. Entidade `ActivityLog` (já existia)
Schema completo com RLS por `workshop_id`:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `entity_type` | enum: `tarefa_backlog` \| `pedido_interno` | Tipo da entidade rastreada |
| `entity_id` | string | ID da entidade |
| `workshop_id` | string | ID da oficina (RLS + filtros) |
| `entity_title` | string | Cache do título (exibição sem join) |
| `event_type` | enum: `created`, `status_changed`, `assigned`, `priority_changed`, `deadline_changed`, `title_changed`, `description_updated`, `response_added`, `completed`, `blocked`, `reopened`, `field_changed` | Tipo do evento |
| `actor_id` | string | ID do usuário que disparou o evento |
| `actor_name` | string | Nome do usuário (cache) |
| `field_changed` | string | Nome do campo alterado |
| `old_value` | string | Valor anterior (serializado) |
| `new_value` | string | Novo valor (serializado) |
| `summary` | string | Descrição legível do evento |
| `metadata` | object | Dados adicionais (payload livre) |
| `timestamp` | date-time | Momento exato do evento |

**RLS:** workshop_id match + admin + internal (read/create). Update/delete: admin only (logs são imutáveis por design).

**Princípio preservado:** `TarefaBacklogHistorico` e `PedidoInterno.historico` permanecem intactos como legado. ActivityLog é uma camada nova e paralela.

---

## 2. Função Reutilizável `registrarActivityLog` (NOVA)
Backend function criada em `base44/functions/registrarActivityLog/entry.ts`.

**Assinatura conceitual:** `registrarActivityLog(entity_type, entity_id, event_type, summary, user)`

O `actor` (user_id + user_name) é extraído automaticamente do token de autenticação — o caller não precisa passar esses dados.

**Uso no frontend:**
```js
await base44.functions.invoke('registrarActivityLog', {
  entity_type: 'tarefa_backlog',
  entity_id: taskId,
  workshop_id: workshopId,
  event_type: 'field_changed',
  summary: 'Checklist: item "X" concluído',
  field_changed: 'checklist_item',
  new_value: 'concluido',
});
```

---

## 3. Automação de Entidade `logActivityEvent` (já existia)
A função `logActivityEvent` (entity automation) dispara automaticamente em create/update de `TarefaBacklog` e `PedidoInterno`, registrando eventos no `ActivityLog`:

**Eventos automáticos cobertos:**
- **TarefaBacklog:** criado, status alterado, assignee alterado, prioridade alterada, prazo alterado, título alterado, descrição atualizada, bloqueado, concluído, reaberto
- **PedidoInterno:** criado, status alterado (pendente → em_analise → aprovado/recusado → concluído), resposta adicionada

A função mapeia campos alterados para event_types específicos (ex: `status` → `status_changed`/`completed`/`blocked`/`reopened`) e gera summaries legíveis em PT-BR.

---

## 4. Componente `ActivityTimeline.jsx` (já existia)
Timeline unificada estilo Jira que:

1. **Busca** `ActivityLog` (eventos automáticos) + `TaskComment` (comentários manuais) em paralelo
2. **Mescla** ambos por `timestamp` (ordem cronológica descendente)
3. **Renderiza:**
   - Eventos automáticos → ícone + texto cinza (sem bubble, sem avatar)
   - Comentários → bubble destacado com avatar, Markdown, anexos, reply
4. **Input** de comentário na parte inferior (com upload de anexos + nota interna)

**Props:** `entityType`, `entityId`, `workshopId`, `maxHeight`

---

## 5. Integração no `TarefaBacklogDetalhe` (já existia)
O `ActivityTimeline` já está renderizado como card "Timeline & Atividades" no detalhe da tarefa:
```jsx
<ActivityTimeline
  entityType="tarefa_backlog"
  entityId={tarefa.id}
  workshopId={tarefa.workshop_id}
/>
```

---

## 6. Hooks de Checklist (REFATORADO)
O `TarefaChecklist.jsx` foi refatorado para usar a função reutilizável `registrarActivityLog` em vez de criar registros `ActivityLog` inline:

**Antes:** `base44.entities.ActivityLog.create({...})` com actor_id/actor_name/timestamp passados manualmente
**Depois:** `base44.functions.invoke('registrarActivityLog', {...})` — actor extraído automaticamente do token

Evento registrado: `field_changed` com summary `Checklist: item "X" concluído` ao marcar um item como concluído.

---

## Eventos Automáticos Registrados (mapeamento completo)

### TarefaBacklog
| Trigger | event_type | summary gerado |
|---------|------------|----------------|
| create | `created` | "Item criado" |
| status → concluida | `completed` | "Item concluído" |
| status → bloqueada | `blocked` | "Item bloqueado" |
| status (sai de bloqueada) | `reopened` | "Item reaberto" |
| status (outros) | `status_changed` | "Status alterado de X para Y" |
| assignee_id | `assigned` | "Responsável atribuído" |
| prioridade | `priority_changed` | "Prioridade alterada de X para Y" |
| prazo | `deadline_changed` | "Prazo alterado de X para Y" |
| titulo | `title_changed` | "Título atualizado" |
| descricao | `description_updated` | "Descrição atualizada" |
| checklist item concluído | `field_changed` | "Checklist: item X concluído" |

### PedidoInterno
| Trigger | event_type | summary gerado |
|---------|------------|----------------|
| create | `created` | "Item criado" |
| status → concluido | `completed` | "Item concluído" |
| status (outros) | `status_changed` | "Status alterado de X para Y" |
| resposta | `response_added` | "Resposta adicionada" |

---

## Arquivos
| Arquivo | Papel | Status |
|---------|------|--------|
| `base44/entities/ActivityLog.jsonc` | Entidade com RLS | ✅ Já existia |
| `base44/functions/logActivityEvent/entry.ts` | Automação de entidade (create/update) | ✅ Já existia |
| `base44/functions/registrarActivityLog/entry.ts` | Função reutilizável callable | ✅ **NOVO** |
| `src/components/aceleracao/ActivityTimeline.jsx` | Timeline unificada (ActivityLog + TaskComment) | ✅ Já existia |
| `src/components/aceleracao/TarefaChecklist.jsx` | Hook de checklist → ActivityLog | ✅ **REFATORADO** |
| `src/components/aceleracao/TarefaBacklogDetalhe.jsx` | Integração (Card Timeline) | ✅ Já existia |

## Validação
- ✅ Entidade ActivityLog criada com RLS por workshop_id
- ✅ Automação `logActivityEvent` registra create/update automaticamente
- ✅ Função `registrarActivityLog` criada e reutilizável por qualquer módulo
- ✅ `ActivityTimeline` mescla ActivityLog + TaskComment por data
- ✅ Eventos automáticos renderizados como ícone+texto (cinza)
- ✅ Comentários renderizados como bubble (destacado, com avatar + Markdown)
- ✅ Checklist concluído registra no ActivityLog via função reutilizável
- ✅ Legados (`TarefaBacklogHistorico`, `PedidoInterno.historico`) preservados