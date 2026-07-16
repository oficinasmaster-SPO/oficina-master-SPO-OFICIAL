# TASK 2 — Banner de Origem "Pedido" na Tarefa — FECHAMENTO

## Objetivo
Rastreabilidade bidirecional tarefa → pedido: exibir no detalhe da tarefa de backlog a origem em um Pedido Interno, com ID, status colorido e modal de visualização rápida.

## Implementação

### Componente: `OrigemPedidoBanner.jsx` (refatorado)
- **Busca do pedido**: `useQuery` busca `PedidoInterno` por `tarefa.origin_id` quando `origin_type === 'pedido'`
- **Exibição no banner**:
  - Ícone + label "Originada de um Pedido Interno"
  - `#ID` (últimos 6 caracteres do origin_id para legibilidade)
  - Título do pedido (fallback para `origin_title` ou `tarefa.titulo`)
  - Badge de status colorido conforme enum do `PedidoInterno.status`:
    - `pendente` → cinza
    - `em_analise` → azul
    - `aprovado` → verde
    - `recusado` → vermelho
    - `concluido` → teal
- **Botão "Ver Pedido Original"**: abre `Dialog` (modal) com detalhes completos:
  - Status badge, título, descrição, solicitante, responsável, tipo, prazo
  - Link "Abrir página do pedido" → `/ControleAceleracao?tab=pedidos&pedido_id=...`

### Condição de exibição
```
tarefa.origin_type === 'pedido' && tarefa.origin_id
```

## Arquivos alterados
| Arquivo | Tipo |
|---------|------|
| `src/components/aceleracao/banners/OrigemPedidoBanner.jsx` | Refatorado (full rewrite) |

## Dependências
- `PedidoInterno` entity (leitura via `base44.entities.PedidoInterno.filter`)
- `Dialog` component (`@/components/ui/dialog`)
- `useQuery` (`@tanstack/react-query`)

## Validação
- ✅ Banner renderiza quando `origin_type === 'pedido'`
- ✅ Badge de status reflete o status real do pedido (buscado dinamicamente)
- ✅ Modal abre com detalhes do pedido
- ✅ Link externo para página de pedidos funciona
- ✅ `e.stopPropagation()` previne conflito com cliques do card pai