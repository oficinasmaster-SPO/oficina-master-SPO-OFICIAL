# TASK 5 — Checklist via Entidade `BacklogChecklistItem` — FECHAMENTO

## Objetivo
Checklist estruturado e evoluível (entidade própria, não array embutido), com adicionar/remover/reordenar/marcar itens, % de progresso no card, e registro automático de evento no ActivityLog ao concluir item.

## Implementação

### 1. Nova Entidade `BacklogChecklistItem`
**Campos:**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `task_id` | string (req) | ID da TarefaBacklog pai |
| `workshop_id` | string (req) | ID da oficina (RLS — mesmo da tarefa pai) |
| `titulo` | string (req) | Título do item |
| `descricao` | string | Descrição detalhada |
| `ordem` | integer (default 0) | Ordem de exibição |
| `concluido` | boolean (default false) | Se foi concluído |
| `completed_by` | string | ID do usuário que concluiu |
| `completed_by_name` | string | Nome do usuário (cache) |

**Built-in:** `id`, `created_date` (= created_at), `updated_date`, `created_by_id`

**RLS:** mesmos padrões do `TarefaBacklog` — workshop_id match (tenant_workshop_id / workshop_id / data.workshop_id) + admin + internal. Delete: admin + workshop owner.

### 2. TarefaBacklog — Campos Denormalizados
Adicionados para exibir % no card sem fetch adicional:
- `checklist_total` (integer, default 0)
- `checklist_concluidos` (integer, default 0)

### 3. Componente `TarefaChecklist.jsx`
**Features:**
- **Query:** `BacklogChecklistItem.filter({ task_id }, 'ordem', 200)`
- **Adicionar item:** input + Enter → create com `ordem = max + 1`
- **Marcar concluído:** Checkbox toggle → update `concluido` + `completed_by` + `completed_by_name`
- **Remover item:** botão trash (visível no hover)
- **Reordenar:** botões ChevronUp/ChevronDown — swap de `ordem` entre itens adjacentes
- **Progress bar:** `concluidos/total (pct%)` com barra visual verde
- **Sync automático:** `useEffect` sincroniza `checklist_total` e `checklist_concluidos` na TarefaBacklog pai a cada mudança
- **ActivityLog:** ao marcar item como concluído, cria entrada em `ActivityLog` com `event_type: "field_changed"`, `field_changed: "checklist_item"`, summary descritivo

### 4. Integração no `TarefaBacklogDetalhe.jsx`
- Import do componente
- Card "Checklist" inserido entre o Painel de Execução e a Timeline de Atividades
- Passa `tarefaId`, `workshopId`, `user`

### 5. Progress no `BacklogTaskCard.jsx`
- Import `ListChecks` icon
- Exibe mini progress bar + contador (`3/5`) quando `tarefa.checklist_total > 0`
- Posicionado abaixo do badge de origem, na coluna esquerda do card

## Arquivos criados/alterados
| Arquivo | Tipo |
|---------|------|
| `base44/entities/BacklogChecklistItem.jsonc` | **Nova entidade** |
| `base44/entities/TarefaBacklog.jsonc` | +`checklist_total`, +`checklist_concluidos` |
| `src/components/aceleracao/TarefaChecklist.jsx` | **Novo componente** |
| `src/components/aceleracao/TarefaBacklogDetalhe.jsx` | +import +Card de checklist |
| `src/components/aceleracao/BacklogTaskCard.jsx` | +ListChecks +mini progress bar |

## Fluxo de Dados
```
User marca item → toggleItemMutation
  ├─ Update BacklogChecklistItem (concluido=true, completed_by=...)
  ├─ Create ActivityLog (entity_type=tarefa_backlog, event_type=field_changed)
  └─ Invalidate query → refetch → useEffect syncs checklist_total/concluidos em TarefaBacklog
     └─ BacklogTaskCard exibe % atualizado (campo cacheado na task)
```

## Validação
- ✅ Entidade criada com RLS compatível
- ✅ Adicionar/remover/reordenar/marcar itens funciona
- ✅ % exibido no card via campos denormalizados (sem fetch extra)
- ✅ Progress bar no detalhe e mini bar no card
- ✅ ActivityLog recebe evento ao concluir item ( TASK 7 conectada)
- ✅ Query filtra por `task_id` ordenado por `ordem