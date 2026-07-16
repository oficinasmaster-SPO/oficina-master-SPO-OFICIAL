# 🎫 TICKET — TASK 3: Aguardando Cliente

**Status:** ✅ FECHADO  
**Data de fechamento:** 2026-07-16  
**Responsável:** Dev Senior  

---

## 📋 Objetivo

Permitir marcar tarefas do backlog como "Aguardando Cliente" — estado em que a execução está parada aguardando resposta, entrega ou decisão do cliente — com tracking de dias, motivo e botão de desmarcação.

---

## ✅ Entregas

| # | Item | Arquivo | Status |
|---|------|---------|--------|
| 1 | Schema: 3 novos campos em TarefaBacklog | `base44/entities/TarefaBacklog.jsonc` | ✅ |
| 2 | Banner interativo (marcar/desmarcar + motivo + dias) | `src/components/aceleracao/banners/AguardandoClienteBanner.jsx` | ✅ |
| 3 | Badge na listagem de tarefas | `src/components/aceleracao/BacklogTaskCard.jsx` | ✅ |
| 4 | Wiring no detalhe da tarefa | `src/components/aceleracao/TarefaBacklogDetalhe.jsx` | ✅ |

---

## 🔧 Detalhes Técnicos

### Novos Campos (TarefaBacklog)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `aguardando_cliente` | boolean (default false) | Flag de estado |
| `aguardando_cliente_desde` | date-time | Início do aguardo (para cálculo de dias) |
| `aguardando_cliente_motivo` | string | O que foi solicitado ao cliente |

### UX do Banner
- **Estado ativo:** banner amber (normal) → orange (após 3 dias de espera)
- Mostra motivo, data de início e dias decorridos
- Botão "Cliente Respondeu" para desmarcar (limpa os 3 campos)
- **Estado inativo:** botão dashed "Marcar como Aguardando Cliente"
- Ao clicar, abre formulário com campo de motivo (opcional)
- Confirmação cria o registro com timestamp atual

### Badge na Listagem
- Badge amber com ícone de relógio ao lado do status
- Visível sem precisar abrir a tarefa
- Filtro visual rápido no BacklogDashboard

---

## 📐 Próximos Passos

TASK 3 fechada. Prosseguindo para **TASK 4: Comentários Colaborativos** — seção de comentários com respostas encadeadas e notas internas para TarefaBacklog e PedidoInterno, usando a entidade `TaskComment` já existente.