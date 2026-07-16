# 🎫 TICKET — TASK 4: Comentários Colaborativos

**Status:** ✅ FECHADO  
**Data de fechamento:** 2026-07-16  
**Responsável:** Dev Senior  

---

## 📋 Objetivo

Adicionar seção de comentários colaborativos (com respostas encadeadas e notas internas) nos detalhes de TarefaBacklog e PedidoInterno.

---

## ✅ Entregas

| # | Item | Arquivo | Status |
|---|------|---------|--------|
| 1 | Componente CommentsSection (threaded + notas internas + realtime) | `src/components/aceleracao/CommentsSection.jsx` | ✅ |
| 2 | Wiring no TarefaBacklogDetalhe | `src/components/aceleracao/TarefaBacklogDetalhe.jsx` | ✅ |
| 3 | Wiring no PedidoInternoResponder | `src/components/aceleracao/PedidoInternoResponder.jsx` | ✅ |

---

## 🔄 Evolução (TASK 5)

Durante a implementação, identificamos que o componente `ActivityTimeline.jsx` já existia no codebase e era **mais completo** que o CommentsSection: unifica ActivityLog (eventos automáticos) + TaskComment (comentários com anexos, avatares, Markdown) em uma única timeline.

**Decisão de arquitetura:** Em TASK 5, o CommentsSection foi substituído pelo ActivityTimeline nos dois detalhes, e o arquivo CommentsSection.jsx foi removido para eliminar duplicação de código.

---

## 📐 Próximos Passos

TASK 4 fechada. Prosseguindo para **TASK 5: Timeline Unificada** — substituir CommentsSection pelo ActivityTimeline existente, dando ao usuário uma visão completa de eventos automáticos + comentários em um único feed.