/**
 * ActivityFeed — Timeline unificada cronológica (Padrão Enterprise SaaS).
 *
 * Versão Final (Frozen API):
 * 1. Design System Consolidado: Timeline, TimelineSection, TimelineItem, TimelineNode, TimelineContent.
 * 2. Prevenção de Race Conditions: Highlight e Auto-scroll baseados na resolução real do DOM.
 * 3. Skeleton Loading: UI Placeholder imitando a estrutura real da timeline.
 * 4. Acessibilidade e Deep Linking: IDs injetados nos comentários (ex: #comment-123).
 * 5. Eixo Ultra Discreto: bg-slate-200 para focar na leitura dos eventos.
 */
import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import ReactMarkdown from "react-markdown";
import {
  Paperclip, Loader2, ArrowRight, Edit3, Send,
  ChevronDown, ChevronRight, MoreHorizontal, Copy, FileText,
  Check, Link2, Trash2, Reply
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import useEmployeeResolver from "@/hooks/useEmployeeResolver";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  title_changed:       "bg-slate-400",
  description_updated: "bg-slate-400",
  response_added:     "bg-indigo-500",
  completed:           "bg-green-500",
  blocked:             "bg-red-500",
  reopened:            "bg-yellow-500",
  field_changed:       "bg-slate-400",
};

function formatTime(timestamp) {
  if (!timestamp) return "";
  const ts = new Date(timestamp);
  const hours = String(ts.getHours()).padStart(2, "0");
  const mins = String(ts.getMinutes()).padStart(2, "0");
  return hours + ":" + mins;
}

function getDayLabel(timestamp) {
  if (!timestamp) return "SEM DATA";
  const ts = new Date(timestamp);
  const now = new Date();
  if (ts.toDateString() === now.toDateString()) return "Hoje";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (ts.toDateString() === yesterday.toDateString()) return "Ontem";
  return ts.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
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

function Timeline({ children }) {
  return <div className="flex flex-col w-full relative">{children}</div>;
}

function TimelineSection({ label, count, children }) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-3 pt-6 pb-4 select-none relative z-10 px-2 animate-in fade-in">
        <div className="w-full h-px bg-slate-200" />
        <span className="text-[12px] font-semibold text-gray-900 shrink-0">
          {label}
          {count > 0 && (
            <span className="font-normal text-gray-400 ml-1">
              · {count} {count === 1 ? 'atividade' : 'atividades'}
            </span>
          )}
        </span>
        <div className="w-full h-px bg-slate-200" />
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function TimelineItem({ variant = "default", id, time, showTime = true, isLast, actions, isHighlighted = false, children }) {
  const isNested = variant === "nested";
  return (
    <div
      id={id}
      className={cn(
        "group relative flex gap-3 rounded-lg transition-colors duration-1000 animate-in fade-in slide-in-from-bottom-2 scroll-mt-24",
        isNested ? "py-1" : "py-1.5 px-1",
        isHighlighted ? "bg-blue-50/60 transition-none" : "hover:bg-[#3b82f6]/[0.02]"
      )}
    >
      {!isLast && !isNested && (
        <div className="absolute left-[70px] top-[30px] bottom-[-6px] w-px bg-slate-200 z-0" />
      )}
      {!isNested && (
        <div className="w-10 pt-1.5 shrink-0 text-right">
          {showTime && <span className="text-[10px] font-normal text-gray-400">{time}</span>}
        </div>
      )}
      {children}
      {actions && (
        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white border border-gray-200 rounded-md shadow-sm flex items-center p-0.5 z-20">
          {actions}
        </div>
      )}
    </div>
  );
}

function TimelineNode({ children }) {
  return (
    <div className="relative z-10 flex w-7 shrink-0 items-start justify-center mt-1">{children}</div>
  );
}

function TimelineContent({ children }) {
  return <div className="flex-1 min-w-0 pb-1">{children}</div>;
}

function TimelineSkeleton() {
  return (
    <div className="w-full pt-8 px-2 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex gap-3 mb-8">
          <div className="w-10 pt-1 shrink-0 text-right">
            <div className="h-2.5 w-8 bg-slate-100 rounded inline-block" />
          </div>
          <div className="w-7 shrink-0 flex justify-center mt-1 relative">
            <div className="w-7 h-7 bg-slate-100 rounded-full z-10" />
            {i !== 4 && <div className="absolute top-8 bottom-[-32px] w-px bg-slate-100 z-0" />}
          </div>
          <div className="flex-1 py-1.5 space-y-3">
            <div className="h-3 w-1/4 bg-slate-100 rounded" />
            <div className="h-3 w-3/4 bg-slate-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CommentEntry({ comment, replies = [], getName, getPhoto, allowReply, entityType, entityId, workshopId, isNested = false, isLast = false, onReplyClick, showTime = true, formattedTime, isHighlighted = false }) {
  const [showReplies, setShowReplies] = useState(false);
  const [copied, setCopied] = useState(false);
  const isInternal = comment.is_internal;
  const resolvedName = getName ? getName(comment.author_id, comment.author_name) : (comment.author_name || "Usuário");
  const photoUrl = getPhoto ? getPhoto(comment.author_id) : null;
  const replyCount = replies.length;

  const handleCopy = () => {
    navigator.clipboard.writeText(comment.content || "");
    setCopied(true);
    toast.success("Comentário copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const ActionsMenu = (
    <>
      <button onClick={handleCopy} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title="Copiar">
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title="Mais opções">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40 text-xs">
          <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(window.location.origin + window.location.pathname + "#comment-" + comment.id); toast.success("Link copiado!"); }} className="cursor-pointer text-gray-700">
            <Link2 className="w-3.5 h-3.5 mr-2" /> Copiar link
          </DropdownMenuItem>
          {allowReply && !isNested && (
            <DropdownMenuItem onClick={() => onReplyClick(comment.id)} className="cursor-pointer text-gray-700">
              <Reply className="w-3.5 h-3.5 mr-2" /> Responder
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer text-gray-700">
            <Edit3 className="w-3.5 h-3.5 mr-2" /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50">
            <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  const ContentNode = (
    <div className="pt-0.5">
      <div className="flex items-baseline gap-1.5 mb-0.5 flex-wrap">
        <span className="text-[13px] font-semibold text-gray-900">{resolvedName}</span>
        {isInternal && (
          <>
            <span className="text-gray-400">·</span>
            <span className="text-[11px] font-medium text-amber-500">Interno</span>
          </>
        )}
      </div>
      <div className="text-[13px] text-gray-700 prose prose-sm max-w-none leading-relaxed prose-a:text-blue-600 hover:prose-a:text-blue-700 [&>p]:mb-1 [&>p:last-child]:mb-0">
        <ReactMarkdown>{comment.content || ""}</ReactMarkdown>
      </div>
      {comment.attachments && comment.attachments.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {comment.attachments.map((att, idx) => (
            <a key={idx} href={att.file_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] text-gray-700 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 px-2.5 py-1.5 rounded-md transition-all shadow-sm">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-medium truncate max-w-[150px]">{att.file_name || "arquivo"}</span>
              {att.file_size && <span className="text-[10px] text-gray-400 shrink-0 ml-1">{formatFileSize(att.file_size)}</span>}
            </a>
          ))}
        </div>
      )}
      {replyCount > 0 && (
        <button onClick={() => setShowReplies(!showReplies)}
          className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-blue-600 hover:text-blue-700 transition-colors">
          <ChevronRight className={cn("w-3.5 h-3.5 transition-transform duration-200", showReplies && "rotate-90")} />
          {replyCount} {replyCount === 1 ? "resposta" : "respostas"}
        </button>
      )}
      <div className={cn("grid transition-all duration-200 ease-in-out", showReplies ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0 mt-0")}>
        <div className="overflow-hidden space-y-1.5">
          {replies.map((reply) => (
            <CommentEntry key={reply.id} comment={reply} replies={[]} getName={getName} getPhoto={getPhoto}
              allowReply={false} entityType={entityType} entityId={entityId} workshopId={workshopId} isNested={true} isHighlighted={isHighlighted} />
          ))}
        </div>
      </div>
    </div>
  );

  const AvatarNode = (
    <Avatar className={cn("shrink-0 ring-4 ring-white", isNested ? "w-6 h-6 mt-0.5" : "w-7 h-7")}>
      {photoUrl && <AvatarImage src={photoUrl} alt={resolvedName} />}
      <AvatarFallback className={cn("text-[10px] font-bold", isInternal ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700")}>
        {getInitials(resolvedName)}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <TimelineItem
      id={"comment-" + comment.id}
      variant={isNested ? "nested" : "default"}
      time={formattedTime}
      showTime={showTime}
      isLast={isLast}
      actions={ActionsMenu}
      isHighlighted={isHighlighted}
    >
      <TimelineNode>{AvatarNode}</TimelineNode>
      <TimelineContent>{ContentNode}</TimelineContent>
    </TimelineItem>
  );
}

function LogGroupItem({ group, getName, isLast, showTime = true, formattedTime }) {
  const [expanded, setExpanded] = useState(false);
  const firstLog = group.items[0];
  const resolvedName = getName ? getName(firstLog.actor_id, firstLog.actor_name) : (firstLog.actor_name || "Sistema");
  var dotColor = EVENT_COLORS[firstLog.event_type] || EVENT_COLORS.field_changed;

  const renderLogSummaries = () => {
    const itemsCount = group.items.length;
    if (itemsCount <= 2 || expanded) {
      return group.items.map((log, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <span className="text-gray-400 font-bold mx-1.5">•</span>}
          {log.summary}
          {log.old_value && log.new_value && (
            <span className="inline-flex items-center gap-1 mx-1.5">
              <span className="line-through text-gray-400 decoration-gray-300">{log.old_value}</span>
              <ArrowRight className="w-3 h-3 text-gray-400" />
              <span className="font-medium text-gray-700">{log.new_value}</span>
            </span>
          )}
        </React.Fragment>
      ));
    }
    if (itemsCount > 4 && !expanded) {
      return (
        <button onClick={() => setExpanded(true)} className="italic text-gray-500 hover:text-gray-800 transition-colors">
          alterou {itemsCount} propriedades
        </button>
      );
    }
    const fields = group.items.map(l => l.summary.replace(/^(Alterou|Mudou|Atualizou) (o |a |)/i, '').trim());
    const joinedFields = fields.slice(0, -1).join(', ') + ' e ' + fields.slice(-1);
    return <span className="italic">alterou: {joinedFields}</span>;
  };

  return (
    <TimelineItem time={formattedTime} showTime={showTime} isLast={isLast}>
      <TimelineNode>
        <div className="flex h-7 w-7 items-center justify-center bg-white rounded-full">
          <div className={cn("w-[9px] h-[9px] rounded-full ring-[3px] ring-white", dotColor)} />
        </div>
      </TimelineNode>
      <TimelineContent>
        <div className="flex flex-wrap items-baseline gap-x-1.5 pt-1">
          <span className="text-[13px] font-semibold text-gray-900">{resolvedName}</span>
          <span className="text-[13px] text-gray-700">{renderLogSummaries()}</span>
        </div>
      </TimelineContent>
    </TimelineItem>
  );
}

function CommentInput({ entityType, entityId, workshopId, parentCommentId = null, onSubmitted, onCancel, compact = false, getName, getPhoto }) {
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
        await base44.functions.invoke('notificarNovoComentario', {
          entity_type: data.entity_type, entity_id: data.entity_id,
          author_id: data.author_id, author_name: data.author_name, content: data.content
        });
      } catch (e) { console.error('Erro ao notificar participantes:', e); }
      return comment;
    },
    onSuccess: (newComment) => {
      queryClient.invalidateQueries({ queryKey: ["taskComments", entityType, entityId] });
      setContent(""); setAttachments([]); setIsInternal(false);
      onSubmitted?.(newComment.id);
    },
  });

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploaded.push({ file_url, file_name: file.name, file_type: file.type, file_size: file.size });
      }
      setAttachments(prev => [...prev, ...uploaded]);
    } catch (error) { toast.error("Erro ao enviar arquivo"); }
    finally { setIsUploading(false); }
  };

  const handleSubmit = () => {
    if (!content.trim()) return;
    const authorName = getName ? getName(user?.id, user?.full_name || user?.email) : (user?.full_name || user?.email);
    createMutation.mutate({
      entity_type: entityType, entity_id: entityId, workshop_id: workshopId,
      author_id: user?.id, author_name: authorName, content: content.trim(),
      parent_comment_id: parentCommentId, attachments, is_internal: isInternal,
      timestamp: new Date().toISOString(),
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmit(); }
    if (e.key === "Escape" && onCancel) { onCancel(); }
  };

  return (
    <div className={cn("rounded-xl border border-gray-200 bg-white transition-all shadow-sm focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-400", compact ? "" : "mt-3")}>
      <Textarea value={content} onChange={(e) => setContent(e.target.value)} onKeyDown={handleKeyDown}
        placeholder={compact ? "Responder..." : "Deixe um comentário..."}
        className="border-0 focus-visible:ring-0 resize-none min-h-[56px] text-[13px] px-4 py-3 text-gray-800 placeholder:text-gray-400" />
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pb-2 animate-in fade-in">
          {attachments.map((att, idx) => (
            <span key={idx} className="inline-flex items-center gap-1.5 text-[12px] text-gray-700 bg-gray-50 border border-gray-200 px-2 py-1 rounded-md">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              <span className="max-w-[120px] truncate">{att.file_name}</span>
              <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500 ml-0.5 transition-colors">×</button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
        <label className="cursor-pointer">
          <input type="file" multiple className="hidden" disabled={isUploading} onChange={(e) => handleFileUpload(Array.from(e.target.files || []))} />
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer">
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
          </span>
        </label>
        <button onClick={() => setIsInternal(!isInternal)}
          className={cn(
            "inline-flex items-center gap-1.5 px-2 h-8 rounded-md text-[12px] font-medium transition-colors",
            isInternal ? "text-amber-700 bg-amber-50" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          )}
          title={isInternal ? "Nota interna (clique para desativar)" : "Marcar como nota interna"}>
          <div className={cn("w-2 h-2 rounded-full", isInternal ? "bg-amber-500" : "border border-gray-400")} /> Interno
        </button>
        <div className="ml-auto flex items-center gap-2">
          {onCancel && (<button onClick={onCancel} className="px-3 h-8 rounded-md text-[13px] font-medium text-gray-600 hover:bg-gray-200 transition-colors">Cancelar</button>)}
          <button onClick={handleSubmit} disabled={!content.trim() || createMutation.isPending}
            className="flex items-center justify-center w-8 h-8 p-0 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all duration-200 hover:shadow"
            title="Enviar comentário">
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5 ml-0.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ActivityFeed({
  entityType, entityId, workshopId, maxHeight = "600px",
  showLogs = true, showComments = true, showAttachments = true, allowReply = true, compact = false,
}) {
  const { getName, getPhoto } = useEmployeeResolver();
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [pendingHighlightId, setPendingHighlightId] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);

  const { data: logs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ["activityLogs", entityType, entityId],
    queryFn: async () => {
      const result = await base44.entities.ActivityLog.filter({ entity_type: entityType, entity_id: entityId }, "-timestamp", 200);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!entityId && showLogs, staleTime: 30 * 1000,
  });

  const { data: comments = [], isLoading: isLoadingComments } = useQuery({
    queryKey: ["taskComments", entityType, entityId],
    queryFn: async () => {
      const result = await base44.entities.TaskComment.filter({ entity_type: entityType, entity_id: entityId }, "-timestamp", 200);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!entityId && showComments, staleTime: 30 * 1000,
  });

  const isLoading = isLoadingLogs || isLoadingComments;

  const filteredLogs = useMemo(() => {
    if (!showLogs) return [];
    return logs.filter(l => {
      if (l.event_type === "field_changed" && l.field_name && IGNORED_FIELDS.has(l.field_name)) return false;
      if (l.summary && IGNORED_FIELDS.has(l.summary.match(/Campo "([^"]+)"/)?.[1])) return false;
      return true;
    });
  }, [logs, showLogs]);

  const topLevelComments = useMemo(() => {
    if (!showComments) return [];
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
    const unifiedItems = [
      ...filteredLogs.map(l => ({ type: 'log', timestamp: l.timestamp, data: l })),
      ...topLevelComments.map(c => ({ type: 'comment', timestamp: c.timestamp, data: c }))
    ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (unifiedItems.length === 0) return [];

    const dayMap = new Map();
    unifiedItems.forEach(item => {
      const key = getDayKey(item.timestamp);
      if (!dayMap.has(key)) {
        dayMap.set(key, { label: getDayLabel(item.timestamp), rawItems: [] });
      }
      dayMap.get(key).rawItems.push(item);
    });

    const result = [];
    dayMap.forEach(({ label, rawItems }) => {
      const processedElements = [];
      let currentLogGroup = null;

      rawItems.forEach((item) => {
        if (item.type === 'comment') {
          if (currentLogGroup) {
            processedElements.push({ type: 'log_group', group: currentLogGroup, timestamp: currentLogGroup.items[0].timestamp });
            currentLogGroup = null;
          }
          processedElements.push({ type: 'comment', comment: item.data, timestamp: item.timestamp });
        } else {
          const log = item.data;
          const actor = log.actor_id || log.actor_name;
          if (!currentLogGroup) {
            currentLogGroup = { actor, items: [log], timestamp: log.timestamp };
          } else {
            const timeDiff = Math.abs(new Date(log.timestamp) - new Date(currentLogGroup.timestamp)) / 60000;
            if (actor === currentLogGroup.actor && timeDiff <= 5) {
              currentLogGroup.items.push(log);
            } else {
              processedElements.push({ type: 'log_group', group: currentLogGroup, timestamp: currentLogGroup.items[0].timestamp });
              currentLogGroup = { actor, items: [log], timestamp: log.timestamp };
            }
          }
        }
      });

      if (currentLogGroup) {
        processedElements.push({ type: 'log_group', group: currentLogGroup, timestamp: currentLogGroup.items[0].timestamp });
      }

      processedElements.forEach((el, idx) => {
        var showTime = true;
        var currTime = formatTime(el.type === 'log_group' ? el.group.items[0].timestamp : el.comment.timestamp);
        if (idx > 0) {
          var prevEl = processedElements[idx - 1];
          var prevTime = formatTime(prevEl.type === 'log_group' ? prevEl.group.items[0].timestamp : prevEl.comment.timestamp);
          if (currTime === prevTime) showTime = false;
        }
        el.showTime = showTime;
        el.formattedTime = currTime;
      });

      result.push({ label, elements: processedElements });
    });

    return result;
  }, [filteredLogs, topLevelComments]);

  useEffect(() => {
    if (pendingHighlightId) {
      const el = document.getElementById("comment-" + pendingHighlightId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedId(pendingHighlightId);
        setPendingHighlightId(null);
      }
    }
  }, [timelineByDay, pendingHighlightId]);

  useEffect(() => {
    if (highlightedId) {
      const timer = setTimeout(() => setHighlightedId(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [highlightedId]);

  return (
    <div className="flex flex-col mx-auto w-full max-w-[720px] relative" style={{ maxHeight }}>
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2">
        {isLoading ? (
          <TimelineSkeleton />
        ) : timelineByDay.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in px-4">
            <h3 className="text-[14px] font-medium text-gray-900 mb-1">Nenhuma atividade ainda</h3>
            <p className="text-[13px] text-gray-500 max-w-[320px] leading-relaxed">
              Este espaço registrará automaticamente comentários, alterações e todo o histórico deste pedido.
            </p>
          </div>
        ) : (
          <div className="w-full">
            {timelineByDay.map((day, dayIdx) => (
              <TimelineSection key={dayIdx} label={day.label} count={day.elements.length}>
                <Timeline>
                  {day.elements.map((el, elIdx) => {
                    const isLastElement = dayIdx === timelineByDay.length - 1 && elIdx === day.elements.length - 1;
                    if (el.type === 'log_group') {
                      return <LogGroupItem key={"log-" + elIdx} group={el.group} getName={getName} isLast={isLastElement} showTime={el.showTime} formattedTime={el.formattedTime} />;
                    } else {
                      return (
                        <React.Fragment key={"comment-wrap-" + el.comment.id}>
                          <CommentEntry
                            comment={el.comment}
                            replies={repliesByParent[el.comment.id] || []}
                            getName={getName}
                            getPhoto={getPhoto}
                            allowReply={allowReply}
                            entityType={entityType}
                            entityId={entityId}
                            workshopId={workshopId}
                            isLast={isLastElement && activeReplyId !== el.comment.id}
                            onReplyClick={(id) => setActiveReplyId(activeReplyId === id ? null : id)}
                            showTime={el.showTime}
                            formattedTime={el.formattedTime}
                            isHighlighted={highlightedId === el.comment.id}
                          />
                          {activeReplyId === el.comment.id && (
                            <div className="pl-[82px] pr-2 pb-3 pt-1 animate-in fade-in slide-in-from-top-2 duration-200 relative">
                              {!isLastElement && <div className="absolute left-[70px] top-0 bottom-0 w-px bg-slate-200 z-0" />}
                              <div className="relative z-10">
                                <CommentInput
                                  entityType={entityType} entityId={entityId} workshopId={workshopId}
                                  parentCommentId={el.comment.id}
                                  onSubmitted={(newId) => { setActiveReplyId(null); if(newId) setPendingHighlightId(newId); }}
                                  onCancel={() => setActiveReplyId(null)}
                                  compact getName={getName} getPhoto={getPhoto}
                                />
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    }
                  })}
                </Timeline>
              </TimelineSection>
            ))}
          </div>
        )}
      </div>
      {showComments && !isLoading && (
        <div className="pt-4 pb-2 px-2 w-full mt-auto bg-white/95 backdrop-blur-sm sticky bottom-0 z-30 shadow-[0_-8px_20px_rgba(0,0,0,0.03)] border-t border-gray-100">
          <CommentInput entityType={entityType} entityId={entityId} workshopId={workshopId}
            getName={getName} getPhoto={getPhoto}
            onSubmitted={(newId) => { if(newId) setPendingHighlightId(newId); }}
          />
        </div>
      )}
    </div>
  );
}