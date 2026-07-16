# 🎫 TICKET — TASK 5: Timeline Unificada de Atividades

**Status:** ✅ FECHADO  
**Data de fechamento:** 2026-07-16  
**Responsável:** Dev Senior  

---

## 📋 Objetivo

Eliminar a duplicação de componentes de comentário/timeline criada na TASK 4, consolidando a visualização de atividades manuais (comentários) e automáticas (eventos de sistema) em um único feed unificado nos detalhes de TarefaBacklog e PedidoInterno.

---

## 🔍 Contexto Técnico

Durante a TASK 4, foi criado o componente `CommentsSection.jsx` para adicionar comentários encadeados. Porém, uma auditoria de código revelou que o componente `ActivityTimeline.jsx` já existia no codebase e era **significativamente mais completo**:

| Recurso | CommentsSection (TASK 4) | ActivityTimeline (pré-existente) |
|---|---|---|
| Comentários encadeados | ✅ | ✅ |
| Notas internas | ✅ | ✅ |
| Eventos automáticos (ActivityLog) | ❌ | ✅ |
| Anexos nos comentários | ❌ | ✅ |
| Avatares | ❌ | ✅ |
| Markdown rendering | ❌ | ✅ |
| Merge cronológico logs + comentários | ❌ | ✅ |

**Decisão de arquitetura:** Substituir CommentsSection pelo ActivityTimeline em ambos os detalhes e remover o arquivo obsoleto.

---

## ✅ Entregas

| # | Ação | Arquivo | Status |
|---|------|---------|--------|
| 1 | Substituído import e JSX CommentsSection → ActivityTimeline | `src/components/aceleracao/TarefaBacklogDetalhe.jsx` | ✅ |
| 2 | Substituído import e JSX CommentsSection → ActivityTimeline | `src/components/aceleracao/PedidoInternoResponder.jsx` | ✅ |
| 3 | Adicionado ícone `Activity` ao lucide-react import em ambos os arquivos | — | ✅ |
| 4 | ActivityTimeline envolvido em Card com título "Timeline & Atividades" | — | ✅ |
| 5 | Removido arquivo obsoleto | `src/components/aceleracao/CommentsSection.jsx` (deletado) | ✅ |

---

## 🏗️ Como Funciona

O `ActivityTimeline` recebe três props:
- `entityType`: `"tarefa_backlog"` ou `"pedido_interno"`
- `entityId`: ID da entidade
- `workshopId`: ID da oficina (para RLS)

Internamente, ele:
1. Busca `ActivityLog.filter({ entity_type, entity_id })` ordenado por `-timestamp`
2. Busca `TaskComment.filter({ entity_type, entity_id })` ordenado por `-timestamp`
3. Separa comentários de topo de respostas
4. Faz merge dos logs + comentários de topo em uma única lista cronológica descendente
5. Renderiza cada item com ícone contextual (status_changed, assigned, blocked, etc.)
6. Exibe o input de comentário na base, com suporte a anexos e notas internas

---

## ✅ Critérios de Aceite

- [x] Timeline unificada aparece no detalhe da tarefa
- [x] Timeline unificada aparece no detalhe do pedido
- [x] Eventos automáticos (mudança de status, atribuição, bloqueio) aparecem no feed
- [x] Comentários com anexos e Markdown funcionam
- [x] Notas internas destacadas com badge amber
- [x] Respostas encadeadas com indentação visual
- [x] Sem código duplicado (CommentsSection removido)

---

## 📊 Resumo do Sistema Completo (TASKS 1-5)

| Task | Funcionalidade | Status |
|------|---------------|--------|
| TASK 1 | Conversão automática Pedido → Tarefa | ✅ |
| TASK 2 | Banners de rastreabilidade bidirecional | ✅ |
| TASK 3 | Estado "Aguardando Cliente" com tracking temporal | ✅ |
| TASK 4 | Comentários colaborativos (entregue e depois unificado) | ✅ |
| TASK 5 | Timeline unificada (eventos + comentários) | ✅ |

O sistema de backlog está completo: pedidos são convertidos automaticamente em tarefas, ambas as entidades são rastreáveis bidirecionalmente, tarefas bloqueadas pelo cliente têm tracking temporal, e toda atividade (manual e automática) aparece em uma timeline unificada.