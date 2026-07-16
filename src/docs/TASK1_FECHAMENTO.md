# 🎫 TICKET — TASK 1: Pedido → Tarefas Auto-conversion

**Status:** ✅ FECHADO  
**Data de fechamento:** 2026-07-16  
**Responsável:** Dev Senior  

---

## 📋 Objetivo

Automatizar a conversão de `PedidoInterno` aprovado em `TarefaBacklog`, eliminando a criação manual de tarefas e garantindo rastreabilidade entre o pedido e a tarefa gerada.

---

## ✅ Entregas

| # | Item | Arquivo | Status |
|---|------|---------|--------|
| 1 | Backend function de conversão | `base44/functions/converterPedidoEmTarefas/entry.ts` | ✅ |
| 2 | Entity automation (update → aprovado) | Automation: "Pedido→Tarefas — Auto-convert on Approval" | ✅ |
| 3 | Botão "Aprovar e Gerar Tarefa" | `src/components/aceleracao/PedidoInternoResponder.jsx` | ✅ |
| 4 | Mapeamento de campos pedido→tarefa | Dentro da function | ✅ |
| 5 | Idempotência (não duplica) | Dentro da function | ✅ |
| 6 | Tratamento de erro (ID inválido) | Dentro da function | ✅ |

---

## 🔧 Detalhes Técnicos

### Fluxo
```
PedidoInterno criado (pendente)
  → responsável responde
  → clica "Aprovar e Gerar Tarefa" (status = aprovado)
  → entity automation dispara converterPedidoEmTarefas
  → TarefaBacklog criada (origin_type=pedido, origin_id=pedido.id, status=aberta)
  → solicitante notificado via notificarPedidoInterno
```

### Mapeamento de Campos
| PedidoInterno | TarefaBacklog |
|---------------|--------------|
| `titulo` | `titulo` |
| `descricao` | `descricao` |
| `prazo` | `prazo` |
| `prioridade` | `prioridade` |
| `assignee_id` / `assignee_name` | `assignee_id` / `assignee_name` |
| `workshop_id` / `workshop_nome` | `workshop_id` / `workshop_nome` |
| `requester_id` / `requester_name` | `requester_id` / `requester_name` |
| `id` | `origin_id` (origin_type=pedido) |
| `titulo` | `origin_title` (cache) |

### Idempotência
A function verifica se já existe `TarefaBacklog` com `origin_type='pedido'` e `origin_id=pedido.id` antes de criar. Segunda chamada retorna `{ created: false, message: "Tarefa já existe para este pedido" }`.

---

## 🧪 Validação

- ✅ Pedido aprovado → Tarefa criada com campos mapeados corretamente
- ✅ Idempotência: segunda chamada não duplica
- ✅ Tratamento de erro para IDs inválidos (404 graceful)
- ✅ Dados de teste limpos após validação

---

## 📐 Próximos Passos

TASK 1 fechada. Prosseguindo para **TASK 2: Banners de Rastreabilidade Bidirecional** — exibir banners visuais linkando Pedido ↔ Tarefa nas telas de detalhe de ambos.