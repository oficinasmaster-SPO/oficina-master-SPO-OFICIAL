import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import ReactMarkdown from "react-markdown";
import {
  MessageSquare,
  GitBranch,
  User,
  Plus,
  Paperclip,
  Loader2,
  StickyNote,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Flag,
  Edit3,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const EVENT_ICONS = {
  created: { icon: Plus, color: "text-blue-500", bg: "bg-blue-50" },
  status_changed: { icon: ArrowRight, color: "text-amber-500", bg: "bg-amber-50" },
  assigned: { icon: User, color: "text-purple-500", bg: "bg-purple-50" },
  priority_changed: { icon: Flag, color: "text-orange-500", bg: "bg-orange-50" },
  deadline_changed: { icon: Clock, color: "text-cyan-500", bg: "bg-cyan-50" },
  title_changed: { icon: Edit3, color: "text-gray-500", bg: "bg-gray-50" },
  description_updated: { icon: Edit3, color: "text-gray-500", bg: "bg-gray-50" },
  response_added: { icon: MessageSquare, color: "text-indigo-500", bg: "bg-indigo-50" },
  completed: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50" },
  blocked: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-50" },
  reopened: { icon: ArrowRight, color: "text-yellow-500", bg: "bg-yellow-50" },
  field_changed: { icon: Edit3, color: "text-gray-400", bg: "bg-gray-50" },
};

function formatTimeAgo(timestamp) {
  const now = new Date();
  const ts = new Date(timestamp);
  const diffMs = now - ts;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min atrás`;
  if (diffHr < 24) return `${diffHr}h atrás`;
  if (diffDay < 7) return `${diffDay}d atrás`;
  return ts.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function ActivityLogEntry({ log }) {
  const config = EVENT_ICONS[log.event_type] || EVENT_ICONS.field_changed;
  const Icon = config.icon;

  return (
    <div className="flex gap-3 py-3">
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${config.bg}`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900">
            {log.actor_name || "Sistema"}
          </span>
          <span className="text-sm text-gray-600">{log.summary}</span>
        </div>
        {log.old_value && log.new_value && (
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
            <span className="line-through">{log.old_value}</span>
            <ArrowRight className="w-3 h-3" />
            <span className="font-medium text-gray-700">{log.new_value}</span>
          </div>
        )}
        <span className="text-xs text-gray-400 mt-1 block">{formatTimeAgo(log.timestamp)}</span>
      </div>
    </div>
  );
}

function CommentEntry({ comment, onReply, depth = 0 }) {
  const [showReply, setShowReply] = useState(false);
  const isInternal = comment.is_internal;

  return (
    <div className={`py-3 ${depth > 0 ? "ml-11 border-l-2 border-gray-100 pl-4" : ""}`}>
      <div className="flex gap-3">
        <Avatar className="flex-shrink-0 w-8 h-8">
          <AvatarFallback className={isInternal ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}>
            {getInitials(comment.author_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900">
              {comment.author_name || "Usuário"}
            </span>
            {isInternal && (
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                <StickyNote className="w-3 h-3 mr-1" />
                Nota interna
              </Badge>
            )}
            {comment.is_edited && (
              <span className="text-xs text-gray-400">(editado)</span>
            )}
            <span className="text-xs text-gray-400">{formatTimeAgo(comment.timestamp)}</span>
          </div>
          <div className="mt-1 text-sm text-gray-700 prose prose-sm max-w-none">
            <ReactMarkdown>{comment.content || ""}</ReactMarkdown>
          </div>
          {comment.attachments && comment.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {comment.attachments.map((att, idx) => (
                <a
                  key={idx}
                  href={att.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded-md"
                >
                  <Paperclip className="w-3 h-3" />
                  {att.file_name || "arquivo"}
                </a>
              ))}
            </div>
          )}
          {depth < 2 && (
            <button
              onClick={() => setShowReply(!showReply)}
              className="mt-1 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
            >
              <GitBranch className="w-3 h-3" />
              Responder
            </button>
          )}
          {showReply && (
            <TaskCommentInput
              entityType={comment.entity_type}
              entityId={comment.entity_id}
              workshopId={comment.workshop_id}
              parentCommentId={comment.id}
              onSubmitted={() => setShowReply(false)}
              compact
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TaskCommentInput({ entityType, entityId, workshopId, parentCommentId = null, onSubmitted, compact = false }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [attachments, setAttachments] = useState([]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.TaskComment.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskComments", entityType, entityId] });
      setContent("");
      setAttachments([]);
      setIsInternal(false);
      onSubmitted?.();
    },
  });

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    const uploaded = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploaded.push({
        file_url,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
      });
    }
    setAttachments((prev) => [...prev, ...uploaded]);
  };

  const handleSubmit = () => {
    if (!content.trim()) return;
    createMutation.mutate({
      entity_type: entityType,
      entity_id: entityId,
      workshop_id: workshopId,
      author_id: user?.id,
      author_name: user?.full_name || user?.email,
      content: content.trim(),
      parent_comment_id: parentCommentId,
      attachments,
      is_internal: isInternal,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <div className={`flex gap-3 ${compact ? "mt-2" : "mt-4"}`}>
      {!compact && (
        <Avatar className="flex-shrink-0 w-8 h-8">
          <AvatarFallback className="bg-gray-100 text-gray-600">
            {getInitials(user?.full_name || user?.email)}
          </AvatarFallback>
        </Avatar>
      )}
      <div className="flex-1 space-y-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escreva um comentário... (suporta Markdown)"
          className="min-h-[60px] resize-y text-sm"
        />
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((att, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs gap-1">
                <Paperclip className="w-3 h-3" />
                {att.file_name}
                <button
                  onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  className="ml-1 text-gray-400 hover:text-red-500"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(Array.from(e.target.files || []))}
              />
              <Button variant="ghost" size="sm" type="button" className="text-gray-500">
                <Paperclip className="w-4 h-4" />
                Anexar
              </Button>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-500">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="rounded"
              />
              Nota interna
            </label>
          </div>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!content.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Comentar
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ActivityTimeline({ entityType, entityId, workshopId, maxHeight = "600px" }) {
  const { data: logs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ["activityLogs", entityType, entityId],
    queryFn: async () => {
      const result = await base44.entities.ActivityLog.filter(
        { entity_type: entityType, entity_id: entityId },
        "-timestamp",
        200
      );
      return Array.isArray(result) ? result : [];
    },
    enabled: !!entityId,
    staleTime: 30 * 1000,
  });

  const { data: comments = [], isLoading: isLoadingComments } = useQuery({
    queryKey: ["taskComments", entityType, entityId],
    queryFn: async () => {
      const result = await base44.entities.TaskComment.filter(
        { entity_type: entityType, entity_id: entityId },
        "-timestamp",
        200
      );
      return Array.isArray(result) ? result : [];
    },
    enabled: !!entityId,
    staleTime: 30 * 1000,
  });

  const isLoading = isLoadingLogs || isLoadingComments;

  // Separar comentários de topo e respostas
  const topLevelComments = comments.filter((c) => !c.parent_comment_id);
  const repliesByParent = comments.reduce((acc, c) => {
    if (c.parent_comment_id) {
      if (!acc[c.parent_comment_id]) acc[c.parent_comment_id] = [];
      acc[c.parent_comment_id].push(c);
    }
    return acc;
  }, {});

  // Merge: ActivityLogs + top-level TaskComments, ordenados por timestamp desc
  const timeline = [
    ...logs.map((l) => ({ type: "log", data: l, sortKey: l.timestamp })),
    ...topLevelComments.map((c) => ({ type: "comment", data: c, sortKey: c.timestamp })),
  ].sort((a, b) => new Date(b.sortKey) - new Date(a.sortKey));

  return (
    <div className="flex flex-col" style={{ maxHeight }}>
      {/* Timeline */}
      <div className="flex-1 overflow-y-auto scrollbar-thin pr-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : timeline.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">
            Nenhuma atividade registrada ainda.
          </div>
        ) : (
          timeline.map((entry, idx) => {
            if (entry.type === "log") {
              return <ActivityLogEntry key={`log-${idx}`} log={entry.data} />;
            }
            const replies = repliesByParent[entry.data.id] || [];
            return (
              <div key={`comment-${entry.data.id}`}>
                <CommentEntry
                  comment={entry.data}
                  depth={0}
                />
                {replies.map((reply) => (
                  <CommentEntry key={reply.id} comment={reply} depth={1} />
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* Comment input */}
      {!isLoading && (
        <div className="border-t border-gray-100 pt-3">
          <TaskCommentInput
            entityType={entityType}
            entityId={entityId}
            workshopId={workshopId}
          />
        </div>
      )}
    </div>
  );
}