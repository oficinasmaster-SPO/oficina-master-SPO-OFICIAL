# TASK 6 — Comentários via Entidade `TaskComment` — FECHAMENTO

## Objetivo
Thread de comentários estilo Jira (não array), com suporte a anexos, reply aninhado, e notificação de participantes.

## Status: ✅ JÁ IMPLEMENTADO

Esta task já estava completamente implementada em sprints anteriores. Nenhuma alteração de código foi necessária — apenas validação e documentação.

---

## Implementação Existente

### 1. Entidade `TaskComment` (já existe)
**Schema atual (mais completo que o especificado na task):**

| Campo task | Campo existente | Tipo | Descrição |
|------------|-----------------|------|-----------|
| `task_id` | `entity_id` + `entity_type` | string + enum | Suporta tanto `tarefa_backlog` quanto `pedido_interno` |
| `usuario_id` | `author_id` | string | ID do autor |
| `usuario_nome` | `author_name` | string | Nome do autor (cache) |
| `comentario` | `content` | string | Conteúdo (suporta Markdown) |
| `attachments` | `attachments` | array | `[{ file_url, file_name, file_type, file_size }]` |
| `created_at` | `timestamp` + built-in `created_date` | date-time | Momento da criação |
| `edited_at` | `edited_at` | date-time | Data da última edição |
| `reply_to` | `parent_comment_id` | string | ID do comentário pai (null = topo) |
| — | `is_internal` | boolean | Nota interna (não visível para cliente) — **extra** |
| — | `is_edited` | boolean | Se foi editado — **extra** |

**RLS:** workshop_id match (tenant_workshop_id / workshop_id / data.workshop_id) + admin + internal. Update/delete: próprio autor + admin.

**Decisão arquitetural:** O schema existente usa `entity_type` + `entity_id` (polimórfico) em vez de `task_id` fixo, permitindo que o mesmo componente de comentários sirva para TarefaBacklog E PedidoInterno. Isso é mais flexível que o schema proposto na task.

### 2. Componente (já existe em `ActivityTimeline.jsx`)
O componente `ActivityTimeline` já implementa **tudo** que a task pedia, em uma unified timeline (activity logs + comentários mesclados):

**`TaskCommentInput` (input de comentários):**
- ✅ Textarea com suporte a Markdown
- ✅ Upload de anexos via `base44.integrations.Core.UploadFile`
- ✅ Anexos exibidos como badges removíveis antes do envio
- ✅ Checkbox "Nota interna"
- ✅ Botão "Comentar" com loading state

**`CommentEntry` (exibição de comentário):**
- ✅ Avatar com iniciais do autor
- ✅ Conteúdo renderizado como Markdown (`ReactMarkdown`)
- ✅ Anexos como links clicáveis
- ✅ Badge "Nota interna" quando aplicável
- ✅ Indicador "(editado)" quando `is_edited`
- ✅ Timestamp relativo ("5min atrás", "2h atrás")
- ✅ Botão "Responder" com aninhamento visual (border-l + indentação)
- ✅ Threading limitado a depth 2 (topo + 1 nível de reply)

**`ActivityTimeline` (container):**
- ✅ Query: `TaskComment.filter({ entity_type, entity_id }, '-timestamp', 200)`
- ✅ Merge de ActivityLogs + TaskComments ordenados por timestamp desc
- ✅ Respostas agrupadas por `parent_comment_id`
- ✅ Scroll com maxHeight configurável

### 3. Notificação de Participantes (já existe)
Backend function `notificarNovoComentario` já implementada e invocada no `onSuccess` do `createMutation`:
```js
await base44.functions.invoke('notificarNovoComentario', {
  entity_type, entity_id, author_id, author_name, content
});
```
A função identifica participantes (assignee, creator, requester), deduplica (exclui o autor), e cria registros em `Notification` com `type: "novo_comentario"`.

### 4. Integração no `TarefaBacklogDetalhe` (já existe)
O `ActivityTimeline` já está renderizado no detalhe da tarefa:
```jsx
<Card>
  <CardHeader>
    <CardTitle>Timeline & Atividades</CardTitle>
  </CardHeader>
  <CardContent>
    <ActivityTimeline
      entityType="tarefa_backlog"
      entityId={tarefa.id}
      workshopId={tarefa.workshop_id}
    />
  </CardContent>
</Card>
```

---

## Comparação: Task vs Implementação Existente

| Requisito da Task | Status | Notas |
|-------------------|--------|-------|
| Criar entidade + RLS | ✅ Já existe | Schema polimórfico (entity_type + entity_id) |
| Componente com input + lista + responder + anexar | ✅ Já existe | Em `ActivityTimeline.jsx` |
| Integrar no TarefaBacklogDetalhe | ✅ Já existe | Card "Timeline & Atividades" |
| Notificar via `notificarNovoComentario` | ✅ Já existe | Backend function + invocação no mutation |
| Suporte a reply (aninhamento por reply_to) | ✅ Já existe | `parent_comment_id` com depth limit |
| Upload via `Core.UploadFile` | ✅ Já existe | Multi-file upload |
| attachments estruturado | ✅ Já existe | `{ file_url, file_name, file_type, file_size }` |

### Diferença de nomenclatura
A task especifica `attachments` com `{ type: "imagem"|"pdf"|..., url, nome, uploaded_at }`. A implementação existente usa `{ file_url, file_name, file_type (MIME), file_size }` — que é mais padronizada (MIME type é mais granular que categorias fixas e já é o formato usado pelos componentes de upload em toda a app). **Não foi alterado** para manter consistência com o resto do sistema.

---

## Arquivos (já existentes, sem alterações)
| Arquivo | Papel |
|---------|-------|
| `base44/entities/TaskComment.jsonc` | Entidade com RLS |
| `base44/functions/notificarNovoComentario/entry.ts` | Notificação de participantes |
| `src/components/aceleracao/ActivityTimeline.jsx` | Componente com input + lista + reply + anexos |
| `src/components/aceleracao/TarefaBacklogDetalhe.jsx` | Integração (Card "Timeline & Atividades") |

## Validação
- ✅ Entidade criada e com RLS funcional
- ✅ Comentários são criados e listados corretamente
- ✅ Threading funciona (reply com indentação visual)
- ✅ Anexos são uploaded via Core.UploadFile e exibidos como links
- ✅ Notificações são disparadas para participantes
- ✅ Markdown é renderizado nos comentários
- ✅ Notas internas são suportadas