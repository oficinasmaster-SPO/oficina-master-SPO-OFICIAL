# 🎫 TICKET — TASK 6: Comentários via Entidade TaskComment

**Status:** ✅ FECHADO  
**Data de fechamento:** 2026-07-16  
**Responsável:** Dev Senior  

---

## 📋 Objetivo

Implementar thread de comentários estilo Jira (via entidade dedicada, não array embutido), com suporte a anexos, respostas encadeadas e notificação de participantes.

---

## 🔍 Auditoria de Código (Senior Dev)

Antes de implementar do zero, foi realizada uma auditoria do codebase existente. Resultado:

| Item do Escopo | Já Existe? | Onde |
|---|---|---|
| Entidade `TaskComment` com RLS | ✅ | `base44/entities/TaskComment.jsonc` |
| Campo `attachments` (array estruturado) | ✅ | `file_url`, `file_name`, `file_type`, `file_size` |
| Campo `parent_comment_id` (reply_to) | ✅ | Threading por `parent_comment_id` |
| Componente com input + lista + reply + anexar | ✅ | `src/components/aceleracao/ActivityTimeline.jsx` |
| Integração no `TarefaBacklogDetalhe` | ✅ | Feito em TASK 5 |
| Upload de anexos via `UploadFile` | ✅ | `TaskCommentInput.handleFileUpload()` |
| Markdown rendering | ✅ | `ReactMarkdown` em `CommentEntry` |
| Notas internas (`is_internal`) | ✅ | Badge amber + fundo destacado |
| **Notificar participantes** | ❌ **GAP** | — |

**Conclusão:** A entidade e o componente já existem e cobriam 90% do escopo. A única lacuna era a **notificação de participantes** quando um comentário é criado.

---

## ✅ Entrega (Lacuna Preenchida)

| # | Ação | Arquivo | Status |
|---|------|---------|--------|
| 1 | Criada função backend `notificarNovoComentario` | `base44/functions/notificarNovoComentario/entry.ts` | ✅ |
| 2 | Wired no `TaskCommentInput.createMutation` (best-effort) | `src/components/aceleracao/ActivityTimeline.jsx` | ✅ |

---

## 🏗️ Como Funciona a Notificação

### Fluxo

1. Usuário escreve comentário no `ActivityTimeline` → `TaskCommentInput`
2. `createMutation.mutationFn` cria o `TaskComment` (entidade)
3. Em paralelo (best-effort, try/catch), invoca `notificarNovoComentario`
4. A função backend:
   - Autentica o usuário (`base44.auth.me()`)
   - Busca a entidade pai (TarefaBacklog ou PedidoInterno) via `filter({ id: entity_id })`
   - Coleta IDs de participantes: `assignee_id`, `created_by_id`, `requester_id`, `assigned_to_id`
   - Remove duplicatas e exclui o autor do comentário
   - Cria `Notification` in-app para cada participante
5. Participantes veem a notificação no sino (header)

### Decisões de Design

- **Best-effort:** A notificação é envolvida em try/catch no frontend — se falhar, o comentário já foi criado. O usuário não perde o comentário por um erro de notificação.
- **In-app only:** Comentários geram apenas notificação in-app (sem e-mail) para evitar ruído excessivo. E-mail fica reservado para eventos de criação/atribuição de tarefas.
- **Exclusão do autor:** O autor do comentário nunca recebe notificação da própria ação.
- **Dedup de participantes:** `Set` elimina duplicação quando assignee_id = created_by_id, etc.

---

## 📐 Mapeamento de Campos (Especificação vs Implementação)

| Especificação do Ticket | Implementação Atual | Nota |
|---|---|---|
| `task_id` | `entity_id` (+ `entity_type`) | Mais genérico — funciona para tarefa E pedido |
| `usuario_id` | `author_id` | Mesma semântica |
| `usuario_nome` | `author_name` | Mesma semântica |
| `comentario` | `content` | Suporta Markdown |
| `reply_to` | `parent_comment_id` | Threading por ID do comentário pai |
| `attachments[].type` | `attachments[].file_type` | MIME type real (mais flexível que enum) |
| `attachments[].url` | `attachments[].file_url` | — |
| `attachments[].nome` | `attachments[].file_name` | — |
| `attachments[].uploaded_at` | `timestamp` do comentário | Herda do comentário pai |
| `created_at` | `timestamp` | — |
| `edited_at` | `edited_at` (+ `is_edited`) | Tracking de edição |
| — | `is_internal` | **Bônus:** notas internas não visíveis ao cliente |
| — | `workshop_id` | **Bônus:** RLS por oficina |

---

## ✅ Critérios de Aceite

- [x] Entidade `TaskComment` existe com RLS por workshop
- [x] Componente com input, lista, reply e anexos de arquivo
- [x] Integrado no `TarefaBacklogDetalhe`
- [x] Respostas encadeadas via `parent_comment_id`
- [x] Upload de anexos via `base44.integrations.Core.UploadFile`
- [x] `attachments` estruturado para imagem/PDF/planilha/arquivo
- [x] Participantes notificados in-app quando comentário é criado
- [x] Autor do comentário não recebe notificação da própria ação
- [x] Falha na notificação não impede criação do comentário (best-effort)

---

## 📊 Resumo do Sistema Completo (TASKS 1-6)

| Task | Funcionalidade | Status |
|------|---------------|--------|
| TASK 1 | Conversão automática Pedido → Tarefa | ✅ |
| TASK 2 | Banners de rastreabilidade bidirecional | ✅ |
| TASK 3 | Estado "Aguardando Cliente" com tracking temporal | ✅ |
| TASK 4 | Comentários colaborativos (unificado em TASK 5) | ✅ |
| TASK 5 | Timeline unificada (eventos + comentários) | ✅ |
| TASK 6 | Notificação de participantes em comentários | ✅ |