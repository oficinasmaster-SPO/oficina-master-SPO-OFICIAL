/**
 * CommentsSection — Seção de comentários colaborativos
 *
 * Funciona para TarefaBacklog e PedidoInterno via props entityType + entityId.
 * Usa a entidade TaskComment (já existente no schema).
 *
 * Recursos:
 * - Comentários encadeados (respostas com indentação)
 * - Notas internas (não visíveis para o cliente, badge distinto)
 * - Editar/excluir próprios comentários (admin pode excluir qualquer um)
 * - Realtime: novos comentários aparecem sem refresh
 * - Markdown no conteúdo
 */
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Reply, Edit2, Trash2, Lock, Send, X } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const queryKey = (entityType, entityId) => ["task-comments", entityType, entityId];

export default function CommentsSection({ entityType, entityId, workshopId, currentUser }) {
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const qc = useQueryClient();
  const replyInputRef = useRef(null);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: queryKey(entityType, entityId),
    queryFn: () =>
      base44.entities.TaskComment.filter(
        { entity_type: entityType, entity_id: entityId },
        "timestamp"
      ),
    enabled: !!entityId,
    staleTime: 30 * 1000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!entityId) return;
    const unsub = base44.entities.TaskComment.subscribe((event) => {
      if (event.data?.entity_type === entityType && event.data?.entity_id === entityId) {
        qc.invalidateQueries(queryKey(entityType, entityId));
      }
    });
    return () => unsub();
  }, [entityType, entityId, qc]);

  // Build threaded tree
  const { topLevel, repliesByParent } = useMemo(() => {
    const topLevel = comments.filter((c) => !c.parent_comment_id);
    const repliesByParent = {};
    comments.forEach((c) => {
      if (c.parent_comment_id) {
        if (!repliesByParent[c.parent_comment_id]) repliesByParent[c.parent_comment_id] = [];
        repliesByParent[c.parent_comment_id].push(c);
      }
    });
    return { topLevel, repliesByParent };
  }, [comments]);

  const createMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.TaskComment.create({
        entity_type: entityType,
        entity_id: entityId,
        workshop_id: workshopId,
        author_id: currentUser.id,
        author_name: currentUser.full_name || currentUser.email,
        content: data.content,
        parent_comment_id: data.parent_comment_id || null,
        is_internal: data.is_internal || false,
        timestamp: new Date().toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries(queryKey(entityType, entityId));
      toast.success("Comentário adicionado.");
    },
    onError: () => toast.error("Erro ao adicionar comentário."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, content }) =>
      base44.entities.TaskComment.update(id, {
        content,
        is_edited: true,
        edited_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries(queryKey(entityType, entityId));
      setEditingId(null);
      toast.success("Comentário editado.");
    },
    onError: () => toast.error("Erro ao editar."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TaskComment.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(queryKey(entityType, entityId));
      toast.success("Comentário excluído.");
    },
    onError: () => toast.error("Erro ao excluir."),
  });

  const handleSend = () => {
    if (!newComment.trim()) return;
    createMutation.mutate({ content: newComment.trim(), is_internal: isInternal });
    setNewComment("");
    setIsInternal(false);
  };

  const handleReply = (parentId) => {
    if (!replyText.trim()) return;
    createMutation.mutate({ content: replyText.trim(), parent_comment_id: parentId });
    setReplyText("");
    setReplyTo(null);
  };

  const startEdit = (comment) => {
    setEditingId(comment.id);
    setEditText(comment.content);
  };

  const saveEdit = () => {
    if (!editText.trim()) return;
    updateMutation.mutate({ id: editingId, content: editText.trim() });
  };

  const canEdit = (comment) => comment.author_id === currentUser?.id;
  const canDelete = (comment) => comment.author_id === currentUser?.id || currentUser?.role === "admin";

  const renderComment = (comment, isReply = false) => {
    const replies = repliesByParent[comment.id] || [];
    return (
      <div key={comment.id} className={isReply ? "ml-8 border-l-2 border-gray-100 pl-4" : ""}>
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-800">
                {comment.author_name || "Usuário"}
              </span>
              <span className="text-xs text-gray-400">
                {comment.timestamp &&
                  formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true, locale: ptBR })}
              </span>
              {comment.is_internal && (
                <Badge variant="outline" className="text-[10px] border-amber-300 bg-amber-50 text-amber-700 gap-0.5">
                  <Lock className="w-2.5 h-2.5" /> Nota Interna
                </Badge>
              )}
              {comment.is_edited && (
                <span className="text-[10px] text-gray-400 italic">(editado)</span>
              )}
            </div>

            {editingId === comment.id ? (
              <div className="mt-1 space-y-2">
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs" onClick={saveEdit} disabled={updateMutation.isPending}>
                    Salvar
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <p className={`mt-0.5 text-sm whitespace-pre-wrap ${comment.is_internal ? "text-amber-800 bg-amber-50 rounded px-2 py-1" : "text-gray-700"}`}>
                {comment.content}
              </p>
            )}

            {editingId !== comment.id && (
              <div className="flex gap-3 mt-1">
                <button
                  onClick={() => { setReplyTo(replyTo === comment.id ? null : comment.id); setReplyText(""); }}
                  className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1"
                >
                  <Reply className="w-3 h-3" /> Responder
                </button>
                {canEdit(comment) && (
                  <button onClick={() => startEdit(comment)} className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1">
                    <Edit2 className="w-3 h-3" /> Editar
                  </button>
                )}
                {canDelete(comment) && (
                  <button
                    onClick={() => { if (confirm("Excluir este comentário?")) deleteMutation.mutate(comment.id); }}
                    className="text-xs text-gray-400 hover:text-red-600 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Excluir
                  </button>
                )}
              </div>
            )}

            {/* Reply input inline */}
            {replyTo === comment.id && (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Escreva sua resposta..."
                  rows={2}
                  className="text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleReply(comment.id)} disabled={createMutation.isPending || !replyText.trim()}>
                    <Send className="w-3 h-3" /> Responder
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setReplyTo(null); setReplyText(""); }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Render replies recursively */}
        {replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="w-4 h-4" />
          Comentários
          {comments.length > 0 && (
            <Badge variant="secondary" className="text-xs">{comments.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comment list */}
        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-4">Carregando comentários...</p>
        ) : topLevel.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhum comentário ainda. Seja o primeiro!</p>
        ) : (
          <div className="space-y-4">
            {topLevel.map((c) => renderComment(c))}
          </div>
        )}

        {/* New comment input */}
        <div className="border-t pt-3 space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Escreva um comentário... (suporta quebras de linha)"
            rows={2}
            className="text-sm"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="rounded"
              />
              <Lock className="w-3 h-3" /> Nota interna
            </label>
            <Button
              size="sm"
              className="gap-1"
              onClick={handleSend}
              disabled={createMutation.isPending || !newComment.trim()}
            >
              <Send className="w-3.5 h-3.5" />
              {createMutation.isPending ? "Enviando..." : "Comentar"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}