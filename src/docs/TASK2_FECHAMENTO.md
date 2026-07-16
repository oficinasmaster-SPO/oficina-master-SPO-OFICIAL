# 🎫 TICKET — TASK 2: Banners de Rastreabilidade Bidirecional

**Status:** ✅ FECHADO  
**Data de fechamento:** 2026-07-16  
**Responsável:** Dev Senior  

---

## 📋 Objetivo

Exibir banners visuais linkando PedidoInterno ↔ TarefaBacklog nas telas de detalhe de ambos, tornando a rastreabilidade da auto-conversão (TASK 1) visível para o usuário.

---

## ✅ Entregas

| # | Item | Arquivo | Status |
|---|------|---------|--------|
| 1 | Banner na TarefaBacklogDetalhe (origem=pedido) | `src/components/aceleracao/banners/OrigemPedidoBanner.jsx` | ✅ |
| 2 | Banner no PedidoInternoResponder (tarefa convertida) | `src/components/aceleracao/banners/TarefaConvertidaBanner.jsx` | ✅ |
| 3 | Wiring no TarefaBacklogDetalhe | `src/components/aceleracao/TarefaBacklogDetalhe.jsx` | ✅ |
| 4 | Wiring no PedidoInternoResponder | `src/components/aceleracao/PedidoInternoResponder.jsx` | ✅ |

---

## 🔧 Detalhes Técnicos

### OrigemPedidoBanner
- Renderiza quando `tarefa.origin_type === 'pedido'` e `tarefa.origin_id` existe
- Usa campos em cache (`origin_title`) — sem query adicional
- Link para `/ControleAceleracao?tab=pedidos&pedido_id=...`
- Paleta teal (distinta do banner azul de ATA)

### TarefaConvertidaBanner
- Query lazy em `TarefaBacklog` por `{ origin_type: 'pedido', origin_id: pedido.id }`
- Loading state graceful (spinner)
- Só renderiza se a tarefa existe (pedido já foi convertido)
- Mostra status da tarefa com badge colorido
- Link para `/ControleAceleracao?tab=backlog&tarefa_id=...`

---

## 📐 Próximos Passos

TASK 2 fechada. Prosseguindo para **TASK 3: Aguardando Cliente** — estado de tarefa bloqueada aguardando resposta/entrega do cliente, com banner visual, tracking de dias e toggle.