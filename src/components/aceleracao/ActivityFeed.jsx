/**
 * ActivityFeed - Timeline unificada cronologica (estilo GitHub/Linear).
 * Logs e comentarios coexistem em uma unica timeline cronologica.
 * Linha vertical continua conecta todos os itens.
 */
import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import ReactMarkdown from "react-markdown";
import {
  MessageSquare, User, Plus, Paperclip, Loader2, StickyNote,
  CheckCircle2, AlertCircle, Clock, ArrowRight, Flag, Edit3, Send,
  ChevronDown, ChevronRight, Eye, MoreHorizontal, Copy, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import useEmployeeResolver from "@/hooks/useEmployeeResolver";
import { toast } from "sonner";

const IGNORED_FIELDS = new Set([
  "created_by_id", "is_sample", "updated_date", "created_date",
  "data_primeira_resposta", "updated_at", "created_at",
]);

const EVENT_COLORS = {
  created:             "bg-blue-500",
  status_changed:      "bg-amber-500",
  assigned:            "bg-purple-500",
  priority_changed:    "bg-orange-500",
  deadline_changed:    "bg-cyan-500",
  title_changed:       "bg-gray-400",
  description_updated: "bg-gray-400",
  response_added:      "bg-indigo-500",
  completed:           "bg-green-500",
  blocked:             "bg-red-500",
  reopened:            "bg-yellow-500",
  field_changed:       "bg-gray-300",
};

function formatTimestamp(timestamp) {
  if (!timestamp) return "";
  const ts = new Date(timestamp);
  const now = new Date();
  const hours = String(ts.getHours()).padStart(2, "0");
  const mins = String(ts.getMinutes()).padStart(2, "0");
  const time = hours + ":" + mins;
  const isToday = ts.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = ts.toDateString() === yesterday.toDateString();
  if (isToday) return "Hoje - " + time;
  if (isYesterday) return "Ontem - " + time;
  const day = String(ts.getDate()).padStart(2, "0");
  const month = ts.toLocaleString("pt-BR", { month: "short" }).replace(".", "");
  return day + " " + month + " - " + time;
}

function getDayLabel(timestamp) {
  if (!timestamp) return "SEM DATA";
  const ts = new Date(timestamp);
  const now = new Date();
  const isToday = ts.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = ts.toDateString() === yesterday.toDateString();
  if (isToday) return "HOJE";
  if (isYesterday) return "ONTEM";
  return ts.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase().replace(".", "");
}

function getDayKey(timestamp) {
  if (!timestamp) return "none";
  return new Date(timestamp).toDateString();
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function groupConsecutiveLogs(logs) {
  const groups = [];
  let current = null;
  for (const log of logs) {
    const actor = log.actor_id || log.actor_name;
    if (current === null) {
      current = { actor: actor, items: [log], timestamp: log.timestamp };
    } else {
      const timeDiff = Math.abs(new Date(log.timestamp) - new Date(current.timestamp)) / 60000;
      if (actor === current.actor && timeDiff <= 5) {
        current.items.push(log);
      } else {
        groups.push(current);
        current = { actor: actor, items: [log], timestamp: log.timestamp };
      }
    }
  }
  if (current) groups.push(current);
  return groups;
}

function DaySeparator({ label }) {
  return (
    <div className="flex items-center py-3 select-none">
      <div className="h-px flex-1 bg-gray-200" />
      <span className="px-3 text-[10px] font-bold uppercase tracking-[.1em] text-gray-400">{label}</span>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  );
}

function LogGroup({ group, showLine, getName }) {
  const firstLog = group.items[0];
  const resolvedName = getName ? getName(firstLog.actor_id, firstLog.actor_name) : (firstLog.actor_name || "Sistema");
  const dotColor = EVENT_COLORS[firstLog.event_type] || EVENT_COLORS.field_changed;
  const isSingle = group.items.length === 1;

  return (
    <div className="relative flex gap-3 items-start py-1 px-2">
      <div className="flex flex-col items-center shrink-0 w-5">
        <div className={"w-[7px] h-[7px] rounded-full " + dotColor + " shrink-0 z-[1] ring-2 ring-white mt-[6px]"} />
        {showLine && <div className="flex-1 w-px bg-gray-200 mt-0" />}
      </div>
      <div className="flex-1 min-w-0 pb-3">
        {isSingle ? (
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-[13px] font-medium text-gray-800">{resolvedName}</span>
            <span className="text-[13px] text-gray-500">{firstLog.summary}</span>
            {firstLog.old_value && firstLog.new_value && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                <span className="line-through">{firstLog.old_value}</span>
                <ArrowRight className="w-2.5 h-2.5" />
                <span className="font-medium text-gray-600">{firstLog.new_value}</span>
              </span>
            )}
            <span className="text-[11px] text-gray-400 ml-auto shrink-0">{formatTimestamp(firstLog.timestamp)}</span>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-[13px] font-medium text-gray-800">{resolvedName}</span>
              <span className="text-[11px] text-gray-400 ml-auto shrink-0">{formatTimestamp(firstLog.timestamp)}</span>
            </div>
            <ul className="space-y-0.5">
              {group.items.map((log, idx) => (
                <li key={idx} className="flex items-center gap-1.5 text-[12px] text-gray-500">
                  <span className="text-gray-300">*</span>
                  <span>{log.summary}</span>
                  {log.old_value && log.new_value && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                      <span className="line-through">{log.old_value}</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                      <span className="font-medium text-gray-600">{log.new_value}</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function CommentEntry({ comment, replies, getName, getPhoto, allowReply, entityType, entityId, workshopId, showLine }) {
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const isInternal = comment.is_internal;
  const resolvedName = getName ? getName(comment.author_id, comment.author_name) : (comment.author_name || "Usuario");
  const photoUrl = getPhoto ? getPhoto(comment.author_id) : null;
  const replyCount = replies ? replies.length : 0;

  return (
    <div className="group relative flex gap-3 items-start py-1 px-2">
      <div className="flex flex-col items-center shrink-0 w-5">
        <Avatar className="shrink-0 w-5 h-5 mt-[3px] z-[1] ring-2 ring-white">
          {photoUrl && <AvatarImage src={photoUrl} alt={resolvedName} />}
          <AvatarFallback className={"text-[9px] font-semibold " + (isInternal ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700")}>
            {getInitials(resolvedName)}
          </AvatarFallback>
        </Avatar>
        {showLine && <div className="flex-1 w-px bg-gray-200 mt-0" />}
      </div>
      <div className="flex-1 min-w-0 pb-3">
        <div className="relative rounded-lg hover:bg-gray-50/80 transition-colors duration-150 group/card">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-gray-900">{resolvedName}</span>
            {isInternal && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-500">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Interno
              </span>
            )}
            <span className="text-[11px] text-gray-400 ml-auto shrink-0">{formatTimestamp(comment.timestamp)}</span>
          </div>
          <div className="mt-0.5 text-[13px] text-gray-700 prose prose-sm max-w-none">
            <ReactMarkdown>{comment.content || ""}</ReactMarkdown>
          </div>
          {comment.attachments && comment.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {comment.attachments.map((att, idx) => (
                <a key={idx} href={att.file_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 px-2 py-1 rounded-md transition-colors">
                  <FileText className="w-3.5 h-3.5 text-gray-400" />
                  <span className="truncate max-w-[120px]">{att.file_name || "arquivo"}</span>
                  {att.file_size && <span className="text-[10px] text-gray-400 shrink-0">{formatFileSize(att.file_size)}</span>}
                </a>
              ))}
            </div>
          )}
          {replyCount > 0 && (
            <button onClick={() => setShowReplies(!showReplies)}
              className="mt-2 flex items-center gap-1 text-[12px] font-medium text-blue-600 hover:text-blue-700 transition-colors">
              {showReplies ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {replyCount} {replyCount === 1 ? "resposta" : "respostas"}
            </button>
          )}
          {showReplies && replies.map(reply => (
            <div key={reply.id} className="mt-2 ml-2 pl-3 border-l-2 border-gray-100">
              <CommentEntry comment={reply} replies={[]} getName={getName} getPhoto={getPhoto}
                allowReply={false} entityType={entityType} entityId={entityId} workshopId={workshopId} showLine={false} />
            </div>
          ))}
          {allowReply && !showReplyInput && (
            <button onClick={() => setShowReplyInput(true)}
              className="mt-1 text-[12px] text-gray-400 hover:text-gray-600 opacity-0 group-hover/card:opacity-100 transition-opacity duration-150">
              Responder
            </button>
          )}
          {showReplyInput && (
            <div className="mt-2">
              <CommentInput entityType={entityType} entityId={entityId} workshopId={workshopId}
                parentCommentId={comment.id} onSubmitted={() => setShowReplyInput(false)}
                onCancel={() => setShowReplyInput(false)} compact getName={getName} getPhoto={getPhoto} />
            </div>
          )}
        </div>
      </div>
      <div className="absolute right-1 top-1 flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-150 bg-white border border-gray-200 rounded-md px-0.5 py-0.5 shadow-sm">
        <button className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Copiar">
          <Copy className="h-3 w-3" />
        </button>
        <button className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Mais">
          <MoreHorizontal className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function CommentInput({ entityType, entityId, workshopId, parentCommentId, onSubmitted, onCancel, compact, getName, getPhoto }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const comment = await base44.entities.TaskComment.create(data);
      try {
        await base44.functions.invoke("notificarNovoComentario", {
          entity_type: data.entity_type, entity_id: data.entity_id,
          author_id: data.author_id, author_name: data.author_name, content: data.content
        });
      } catch (e) { console.error("Erro ao notificar participantes:", e); }
      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskComments", entityType, entityId] });
      setContent(""); setAttachments([]); setIsInternal(false);
      if (onSubmitted) onSubmitted();
    },
  });

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        uploaded.push({ file_url: result.file_url, file_name: file.name, file_type: file.type, file_size: file.size });
      }
      setAttachments(prev => [...prev, ...uploaded]);
    } catch (error) {
      console.error("Erro ao enviar arquivo:", error);
      toast.error("Erro ao enviar arquivo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!content.trim()) return;
    const authorName = getName ? getName(user?.id, user?.full_name || user?.email) : (user?.full_name || user?.email);
    createMutation.mutate({
      entity_type: entityType, entity_id: entityId, workshop_id: workshopId,
      author_id: user?.id, author_name: authorName, content: content.trim(),
      parent_comment_id: parentCommentId || null, attachments, is_internal: isInternal,
      timestamp: new Date().toISOString(),
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmit(); }
    if (e.key === "Escape" && onCancel) { onCancel(); }
  };

  return (
    <div className={"rounded-lg border border-gray-200 bg-white focus-within:border-blue-300 focus-within:ring-1 focus-within:ring-blue-100 transition-all " + (compact ? "" : "mt-3")}>
      <Textarea value={content} onChange={(e) => setContent(e.target.value)} onKeyDown={handleKeyDown}
        placeholder={compact ? "Responder..." : "Escreva um comentario..."}
        className="border-0 focus-visible:ring-0 resize-none min-h-[48px] text-[13px] px-3 py-2 placeholder:text-gray-400" />
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-1">
          {attachments.map((att, idx) => (
            <span key={idx} className="inline-flex items-center gap-1 text-[11px] text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md">
              <FileText className="w-3 h-3 text-gray-400" />{att.file_name}
              <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500 ml-0.5">x</button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1 px-2 py-1.5 border-t border-gray-100">
        <label className="cursor-pointer">
          <input type="file" multiple className="hidden" disabled={isUploading} onChange={(e) => handleFileUpload(Array.from(e.target.files || []))} />
          <span className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
          </span>
        </label>
        <button onClick={() => setIsInternal(!isInternal)}
          className={"inline-flex items-center gap-1 px-1.5 h-7 rounded text-[11px] transition-colors " + (isInternal ? "bg-amber-50 text-amber-600" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600")}
          title={isInternal ? "Nota interna (clique para desativar)" : "Marcar como nota interna"}>
          <span className={"w-1.5 h-1.5 rounded-full " + (isInternal ? "bg-amber-400" : "bg-gray-300")} />Interno
        </button>
        <span className="text-[10px] text-gray-400 ml-1 hidden sm:inline">Markdown</span>
        <div className="ml-auto flex items-center gap-1">
          {onCancel && (<button onClick={onCancel} className="px-2 h-7 rounded text-[12px] text-gray-500 hover:bg-gray-100 transition-colors">Cancelar</button>)}
          <button onClick={handleSubmit} disabled={!content.trim() || createMutation.isPending}
            className="inline-flex items-center gap-1 px-3 h-7 rounded-md bg-blue-600 text-white text-[12px] font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ActivityFeed({
  entityType, entityId, workshopId, maxHeight,
  showLogs, showComments, showAttachments, allowReply, compact,
}) {
  const { getName, getPhoto } = useEmployeeResolver();

  const { data: logs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ["activityLogs", entityType, entityId],
    queryFn: async () => {
      const result = await base44.entities.ActivityLog.filter({ entity_type: entityType, entity_id: entityId }, "-timestamp", 200);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!entityId && showLogs !== false,
    staleTime: 30 * 1000,
  });

  const { data: comments = [], isLoading: isLoadingComments } = useQuery({
    queryKey: ["taskComments", entityType, entityId],
    queryFn: async () => {
      const result = await base44.entities.TaskComment.filter({ entity_type: entityType, entity_id: entityId }, "-timestamp", 200);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!entityId && showComments !== false,
    staleTime: 30 * 1000,
  });

  const isLoading = isLoadingLogs || isLoadingComments;

  const filteredLogs = useMemo(() => {
    if (showLogs === false) return [];
    return logs.filter(l => {
      if (l.event_type === "field_changed" && l.field_name && IGNORED_FIELDS.has(l.field_name)) return false;
      if (l.summary && IGNORED_FIELDS.has(l.summary.match(/Campo "([^"]+)"/)?.[1])) return false;
      return true;
    });
  }, [logs, showLogs]);

  const topLevelComments = useMemo(() => {
    if (showComments === false) return [];
    return comments.filter(c => !c.parent_comment_id);
  }, [comments, showComments]);

  const repliesByParent = useMemo(() => {
    return comments.reduce((acc, c) => {
      if (c.parent_comment_id) {
        if (!acc[c.parent_comment_id]) acc[c.parent_comment_id] = [];
        acc[c.parent_comment_id].push(c);
      }
      return acc;
    }, {});
  }, [comments]);

  Object.keys(repliesByParent).forEach(k => {
    repliesByParent[k].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  });

  const timelineByDay = useMemo(() => {
    const unified = [
      ...filteredLogs.map(l => ({ type: "log", timestamp: l.timestamp, data: l })),
      ...topLevelComments.map(c => ({ type: "comment", timestamp: c.timestamp, data: c })),
    ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (unified.length === 0) return [];

    const dayMap = new Map();
    unified.forEach(item => {
      const key = getDayKey(item.timestamp);
      if (!dayMap.has(key)) {
        dayMap.set(key, { label: getDayLabel(item.timestamp), items: [] });
      }
      dayMap.get(key).items.push(item);
    });

    const result = [];
    dayMap.forEach(({ label, items }) => {
      const processed = [];
      let currentLogs = [];

      const flushLogs = () => {
        if (currentLogs.length > 0) {
          const groups = groupConsecutiveLogs(currentLogs);
          groups.forEach(g => processed.push({ type: "logGroup", data: g }));
          currentLogs = [];
        }
      };

      items.forEach(item => {
        if (item.type === "comment") {
          flushLogs();
          processed.push({ type: "comment", data: item.data });
        } else {
          currentLogs.push(item.data);
        }
      });
      flushLogs();

      result.push({ label: label, items: processed });
    });

    return result;
  }, [filteredLogs, topLevelComments]);

  const totalItems = useMemo(() => {
    return timelineByDay.reduce((sum, day) => sum + day.items.length, 0);
  }, [timelineByDay]);

  let itemCounter = 0;

  const maxHeightStyle = maxHeight || "600px";

  return (
    <div className="flex flex-col overflow-x-hidden" style={{ maxHeight: maxHeightStyle }}>
      <div className="flex-1 overflow-y-auto overflow-x-hidden pr-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : timelineByDay.length === 0 ? (
          <div className="text-center py-8 text-[13px] text-gray-400">Nenhuma atividade registrada ainda.</div>
        ) : (
          <div className="relative">
            <div className="relative z-10">
              {timelineByDay.map((day, dayIdx) => (
                <div key={dayIdx}>
                  <DaySeparator label={day.label} />
                  <div className="space-y-1">
                    {day.items.map((el, elIdx) => {
                      itemCounter++;
                      const isLast = itemCounter === totalItems;
                      if (el.type === "logGroup") {
                        return <LogGroup key={"log-" + elIdx} group={el.data} showLine={!isLast} getName={getName} />;
                      } else {
                        return (
                          <CommentEntry
                            key={"comment-" + el.data.id}
                            comment={el.data}
                            replies={repliesByParent[el.data.id] || []}
                            getName={getName}
                            getPhoto={getPhoto}
                            allowReply={allowReply !== false}
                            entityType={entityType}
                            entityId={entityId}
                            workshopId={workshopId}
                            showLine={!isLast}
                          />
                        );
                      }
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {showComments !== false && !isLoading && (
        <div className="border-t border-gray-200 pt-3 mt-2 px-2">
          <CommentInput entityType={entityType} entityId={entityId} workshopId={workshopId}
            getName={getName} getPhoto={getPhoto} />
        </div>
      )}
    </div>
  );
}