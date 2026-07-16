# TASK 4 — Expandir `origin_type` — FECHAMENTO

## Objetivo
Cobrir todas as origens da arquitetura no enum `origin_type` da entidade `TarefaBacklog`, com labels e filtros atualizados em todos os componentes.

## Implementação

### 1. Entity Schema (`TarefaBacklog.jsonc`)
Enum `origin_type` expandido de 5 para 10 valores:
```
["reuniao", "contrato", "pedido", "diagnostico", "manual",
 "followup", "cronograma", "consultoria", "automacao", "projeto"]
```

### 2. Tabela de Labels
| Valor | Label |
|-------|-------|
| `reuniao` | Reunião |
| `contrato` | Contrato |
| `pedido` | Pedido |
| `diagnostico` | Diagnóstico |
| `manual` | Manual |
| `followup` | Follow-up |
| `cronograma` | Cronograma |
| `consultoria` | Consultoria |
| `automacao` | Automação |
| `projeto` | Projeto |

### 3. Componentes Atualizados

| Componente | Alteração |
|------------|-----------|
| `TarefaBacklogForm.jsx` | Select de Origem: +5 SelectItems (followup, cronograma, consultoria, automacao, projeto). Select de Status: +aguardando_cliente (consistência com TASK 3). |
| `BacklogTaskCard.jsx` | Map `origin` atualizado com todos os 10 valores (removidos valores inexistentes `entrega`/`material`). |
| `BacklogFilters.jsx` | Dropdown de Origem: +5 `<option>` para novos valores. |
| `TarefaBacklogDetalhe.jsx` | Constante `ORIGIN_LABELS` adicionada. Badge de origem usa label legível em vez de `capitalize` (que não aplicava acentos nem hifens). |

## Arquivos alterados
| Arquivo | Tipo |
|---------|------|
| `base44/entities/TarefaBacklog.jsonc` | Schema: +5 enum values em origin_type |
| `src/components/aceleracao/TarefaBacklogForm.jsx` | +5 SelectItems origem + 1 SelectItem status |
| `src/components/aceleracao/BacklogTaskCard.jsx` | Map origin atualizado |
| `src/components/aceleracao/BacklogFilters.jsx` | +5 options origem |
| `src/components/aceleracao/TarefaBacklogDetalhe.jsx` | +ORIGIN_LABELS, badge usa label |

## Validação
- ✅ Novos valores aceitos pelo schema (create/update)
- ✅ Labels com acentuação correta (Automação, Diagnóstico, Follow-up)
- ✅ Filtros cobrem todas as origens
- ✅ Form permite selecionar todas as origens
- ✅ Detalhe exibe label legível em vez de string cru/capitalizada
- ✅ Status `aguardando_cliente` (TASK 3) adicionado ao form para consistência