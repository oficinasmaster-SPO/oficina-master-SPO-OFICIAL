# TASK 3 — Status `aguardando_cliente` + Métricas — FECHAMENTO

## Objetivo
Fluxo mais rico de ciclo de vida da tarefa com rastreabilidade temporal do aguardo do cliente, integrado ao painel de execução, dashboard, filtros e log de atividades.

## Implementação

### 1. Entity Schema (`TarefaBacklog.jsonc`)
- **Status enum** — adicionado `aguardando_cliente` entre `em_execucao` e `bloqueada`:
  ```
  ["aberta", "em_execucao", "aguardando_cliente", "bloqueada", "concluida"]
  ```
- **Novo campo** `usuario_aguardo` (string): ID do usuário que marcou a tarefa como aguardando cliente
- **Campo reutilizado** `aguardando_cliente_desde` como timestamp `data_aguardo` (já existia, agora preenchido junto com a mudança de status)

### 2. Painel de Execução (`TarefaBacklogDetalhe.jsx`)
- **STATUS_CONFIG**: adicionado `aguardando_cliente` com label "Aguardando Cliente" e classe amber
- **Estado**: `motivoAguardando` + `showAguardarForm`
- **Mutations**:
  - `aguardarClienteMutation`: `em_execucao → aguardando_cliente` (seta status + boolean + timestamp + motivo + `usuario_aguardo`)
  - `retomarMutation`: `aguardando_cliente → em_execucao` (limpa boolean + timestamp + motivo + usuario_aguardo)
- **Botões no painel**:
  - "Aguardar Cliente" (visível quando `status === 'em_execucao'`) → abre form de motivo
  - "Retomar" (visível quando `status === 'aguardando_cliente'`) → volta para `em_execucao`
  - Badge "Aguardando cliente" exibido quando status ativo
- **Form de aguardo**: Textarea para motivo + Confirmar/Cancelar

### 3. Banner `AguardandoClienteBanner.jsx`
- Assinatura atualizada para receber `user`
- `marcarMutation`: agora também seta `status: 'aguardando_cliente'` + `usuario_aguardo: user?.id`
- `desmarcarMutation`: agora também seta `status: 'em_execucao'` + limpa `usuario_aguardo`
- Compatibilidade: banner verifica boolean `aguardando_cliente` (que é setado junto com o status)

### 4. Card (`BacklogTaskCard.jsx`)
- Map de status: adicionado `aguardando_cliente: "Aguardando Cliente"`
- `sideTone`: adicionado `border-l-amber-400` para status aguardando_cliente
- Badge existente de "Aguardando Cliente" (boolean) continua funcionando

### 5. Dashboard (`BacklogDashboard.jsx`)
- `getStatusBadge`: adicionado `aguardando_cliente` com classe amber
- **Novo KPI**: "Aguardando Cliente" com ícone `Hourglass` — conta tarefas com `status === 'aguardando_cliente'`
- Grid de KPIs expandido de 4 para 5 colunas em desktop

### 6. Filtros (`BacklogFilters.jsx`)
- Dropdown de Status: adicionado `<option value="aguardando_cliente">Aguardando Cliente</option>`

### 7. Log de Atividades (`logActivityEvent/entry.ts`)
- `STATUS_LABELS`: adicionado `aguardando_cliente: 'Aguardando Cliente'`
- Mudanças de status para/de `aguardando_cliente` são registradas automaticamente como `status_changed` no `ActivityLog` (via entity automation)
- Summary gerado: `Status alterado de "Em Execução" para "Aguardando Cliente"`

## Fluxo de Status
```
aberta → em_execucao → aguardando_cliente → em_execucao (retomar) → concluida
                         ↘ bloqueada
```

## Arquivos alterados
| Arquivo | Tipo |
|---------|------|
| `base44/entities/TarefaBacklog.jsonc` | Schema: +status enum, +usuario_aguardo |
| `src/components/aceleracao/TarefaBacklogDetalhe.jsx` | STATUS_CONFIG + mutations + botões + form |
| `src/components/aceleracao/banners/AguardandoClienteBanner.jsx` | Mutations setam status + usuario_aguardo |
| `src/components/aceleracao/BacklogTaskCard.jsx` | Status map + sideTone |
| `src/components/aceleracao/BacklogDashboard.jsx` | getStatusBadge + KPI + import Hourglass |
| `src/components/aceleracao/BacklogFilters.jsx` | Option no dropdown de status |
| `base44/functions/logActivityEvent/entry.ts` | STATUS_LABELS + aguardando_cliente |

## Validação
- ✅ Status `aguardando_cliente` aparece em badges, cards, filtros e dashboard
- ✅ Botão "Aguardar Cliente" disponível no painel de execução quando em_execucao
- ✅ Botão "Retomar" disponível quando aguardando_cliente
- ✅ KPI "Aguardando Cliente" no dashboard
- ✅ Mudanças de status logadas automaticamente no ActivityLog
- ✅ `usuario_aguardo` rastreia quem marcou o aguardo
- ✅ Banner existente continua funcionando (compatibilidade com boolean)