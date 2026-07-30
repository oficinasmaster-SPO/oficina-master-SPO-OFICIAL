import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import ReactMarkdown from "react-markdown";
import {
  Paperclip, Loader2, ArrowRight, Send,
  ChevronRight, Copy, FileText, Check, Reply
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import useEmployeeResolver from "@/hooks/useEmployeeResolver";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================================================
// CONSTANTES DE ARQUITETURA VISUAL
// ============================================================================
const CONTENT_WIDTH = "max-w-[760px]";

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
  response_added:      "bg-indigo-500",
  completed:           "bg-green-500",
  blocked:             "bg-red-500",
  reopened:            "bg-yellow-500",
  field_changed:       "bg-slate-400",
};

// ============================================================================
// HELPERS VISUAIS E DE DATA
// ============================================================================

function formatTime(timestamp) {
  if (!timestamp) return "";
  const ts = new Date(timestamp);
  return String(ts.getHours()).padStart(2, "0") + ":" + String(ts.getMinutes()).padStart(2, "0");
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

function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function getFileExtension(filename) {
  if (!filename) return "ARQUIVO";
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop().toUpperCase() : "ARQUIVO";
}

// ============================================================================
// DESIGN SYSTEM: TIMELINE ARQUITETURA
// ============================================================================

function Timeline({ children, className }) {
  return <div className={cn("flex flex-col w-full relative", className)}>{children}</div>;
}

function TimelineSection({ label, count, children }) {
  return (
    <div className="mb-1 w-full">
      {/* ⚠️ TimelineSection compacta: gap-2 e pb-1 */}
      <div className="flex items-center gap-2 pt-4 pb-1 select-none relative z-10 px-2 animate-in fade-in w-full">
        <div className="w-full h-px bg-slate-200" />
        <span className="text-[12px] font-semibold text-gray-800 shrink-0">
          {label}
          {count > 0 && (
            <span className="font-normal text-gray-400 ml-1">
              · {count} {count === 1 ? 'atividade' : 'atividades'}
            </span>
          )}
        </span>
        <div className="w-full h-px bg-slate-200" />
      </div>
      <div className="space-y-1 w-full">{children}</div>
    </div>
  );
}

function TimelineItem({ variant = "default", id, time, showTime = true, isLast, isHighlighted = false, children }) {
  const isNested = variant === "nested";
  return (
    <div
      id={id}
      className={cn(
        // ⚠️ Hover atualizado para gray-50 estilo Slack
        "group w-full relative flex gap-3 rounded-lg transition-colors duration-200 animate-in fade-in slide-in-from-bottom-2 scroll-mt-24",
        isNested ? "py-1.5" : "py-3 px-1",
        isHighlighted ? "bg-blue-50/60 transition-none" : "hover:bg-gray-50"
      )}
    >
      {!isNested && (
        <div className="w-10 pt-1.5 shrink-0 text-right">
          {showTime && <span className="text-[11px] font-normal text-gray-400">{time}</span>}
        </div>
      )}
      
      {children}
    </div>
  );
}

function TimelineNode({ children, isLast }) {
  return (
    <div className="relative z-10 flex w-9 shrink-0 items-start justify-center mt-0.5">
      {children}
      {!isLast && (
        <div className="absolute top-9 bottom-[-24px] w-px bg-slate-200 z-0" />
      )}
    </div>
  );
}

function TimelineContent({ children, className }) {
  return <div className={cn("flex-1 min-w-0 pb-1", className)}>{children}</div>;
}

function TimelineSkeleton() {
  return (
    <div className="w-full pt-8 px-2 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex gap-3 mb-8 w-full">
          <div className="w-10 pt-1 shrink-0 text-right">
            <div className="h-2.5 w-8 bg-slate-100 rounded inline-block" />
          </div>
          <div className="w-9 shrink-0 flex justify-center mt-1 relative">
            <div className="w-8 h-8 bg-slate-100 rounded-full z-10" />
            {i !== 4 && <div className="absolute top-8 bottom-[-32px] w-px bg-slate-100 z-0" />}
          </div>
          <div className={cn("flex-1 py-1.5 space-y-3", CONTENT_WIDTH)}>
            <div className="h-3 w-1/4 bg-slate-100 rounded" />
            <div className="h-4 w-3/4 bg-slate-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MICRO-INTERAÇÕES
// ============================================================================

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!text || copied) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      onClick={handleCopy}
      title="Copiar texto"
      className={cn(
        // ⚠️ Hit area aumentada para 32px (w-8 h-8) mantendo UX refinada
        "relative flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200 outline-none opacity-45 hover:opacity-100",
        copied
          ? "bg-green-50/80 text-green-600 border border-transparent opacity-100"
          : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 border border-transparent"
      )}
    >
      <Check
        strokeWidth={2.5}
        className={cn(
          "absolute w-3.5 h-3.5 transition-all duration-200",
          copied ? "opacity-100 scale-100" : "opacity-0 scale-50"
        )}
      />
      <Copy
        strokeWidth={2}
        className={cn(
          "absolute w-3.5 h-3.5 transition-all duration-200",
          !copied ? "opacity-100 scale-100" : "opacity-0 scale-50"
        )}
      />
    </button>
  );
}

// ============================================================================
// ELEMENTOS DA TIMELINE (Comentários e Logs)
// ============================================================================

function CommentEntry({ comment, replies = [], getName, getPhoto, allowReply, entityType, entityId, workshopId, isNested = false, isLast = false, onReplyClick, showTime = true, formattedTime, isHighlighted = false }) {
  const [showReplies, setShowReplies] = useState(false);
  
  const isInternal = comment.is_internal;
  const resolvedName = getName ? getName(comment.author_id, comment.author_name) : (comment.author_name || "Usuário");
  const photoUrl = getPhoto ? getPhoto(comment.author_id) : null;
  const replyCount = replies.length;

  const ContentNode = (
    <div className="pt-0.5 w-full">
      
      {/* ⚠️ Cabeçalho com espaçamento mb-2 para respiro ideal */}
      <div className="flex items-center justify-between w-full mb-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className="text-[13px] font-semibold text-gray-900">{resolvedName}</span>
          {isInternal && (
            <>
              <span className="text-gray-400">·</span>
              {/* ⚠️ Badge Interno limpo sem fundo pesado */}
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Interno
              </span>
            </>
          )}
        </div>
        
        <div className="ml-3 shrink-0 flex items-center">
          <CopyButton text={comment.content} />
        </div>
      </div>
      
      {/* Texto do Comentário */}
      <div className={cn("text-[14px] font-normal text-gray-800 prose prose-sm max-w-none leading-relaxed prose-a:text-blue-600 hover:prose-a:text-blue-700 [&>p]:mb-1.5 [&>p:last-child]:mb-0", CONTENT_WIDTH)}>
        <ReactMarkdown>{comment.content || ""}</ReactMarkdown>
      </div>
      
      {/* ⚠️ Rich Cards com microinteração de levitação (translateY e shadow-md) */}
      {comment.attachments && comment.attachments.length > 0 && (
        <div className={cn("mt-3 flex flex-col gap-2", CONTENT_WIDTH)}>
          {comment.attachments.map((att, idx) => {
            const ext = getFileExtension(att.file_name);
            const sizeStr = formatFileSize(att.file_size);
            return (
              <a 
                key={idx} 
                href={att.file_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="group/card flex items-center gap-3 p-3 bg-white border border-gray-200/80 hover:border-blue-300 rounded-xl transition-all duration-200 shadow-xs hover:shadow-md hover:-translate-y-[1px] max-w-[340px]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover/card:bg-blue-100 transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[13px] font-medium text-gray-900 truncate">{att.file_name || "arquivo"}</span>
                  <span className="text-[11px] text-gray-400 font-medium tracking-wide uppercase mt-0.5">
                    {ext} {sizeStr && `• ${sizeStr}`}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}
      
      {/* ⚠️ Botão Responder com transição de opacidade e underline discreto */}
      {allowReply && !isNested && (
        <div className="mt-2.5">
          <button
            onClick={() => onReplyClick(comment.id)}
            title="Responder"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-500 hover:text-blue-600 hover:underline transition-all outline-none opacity-45 hover:opacity-100"
          >
            <Reply strokeWidth={2} className="w-3.5 h-3.5" /> Responder
          </button>
        </div>
      )}
      
      {replyCount > 0 && (
        <button onClick={() => setShowReplies(!showReplies)}
          className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-blue-600 hover:text-blue-700 transition-colors outline-none">
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
    <Avatar
      src={photoUrl}
      name={resolvedName}
      size="sm"
      className={cn("shrink-0 ring-4 ring-white", isNested ? "w-6 h-6 mt-0.5" : "w-8 h-8")}
    />
  );

  return (
    <TimelineItem
      id={"comment-" + comment.id}
      variant={isNested ? "nested" : "default"}
      time={formattedTime}
      showTime={showTime}
      isLast={isLast}
      isHighlighted={isHighlighted}
    >
      <TimelineNode isLast={isLast}>{AvatarNode}</TimelineNode>
      <TimelineContent className="flex-1">{ContentNode}</TimelineContent>
    </TimelineItem>
  );
}

function CommentThread({ comment, replies, getName, getPhoto, allowReply, entityType, entityId, workshopId, isLast, showTime, formattedTime, highlightedId, onSubmitted }) {
  const [activeReplyId, setActiveReplyId] = useState(null);

  return (
    <div className="w-full">
      <CommentEntry
        comment={comment}
        replies={replies}
        getName={getName}
        getPhoto={getPhoto}
        allowReply={allowReply}
        entityType={entityType}
        entityId={entityId}
        workshopId={workshopId}
        isLast={isLast && activeReplyId !== comment.id}
        onReplyClick={(id) => setActiveReplyId(activeReplyId === id ? null : id)}
        showTime={showTime}
        formattedTime={formattedTime}
        isHighlighted={highlightedId === comment.id}
      />
      {activeReplyId === comment.id && (
        <div className="pl-[52px] pr-2 pb-3 pt-1 animate-in fade-in slide-in-from-top-2 duration-200 relative w-full">
          <div className={cn(CONTENT_WIDTH)}>
            <CommentInput
              entityType={entityType} entityId={entityId} workshopId={workshopId}
              parentCommentId={comment.id}
              onSubmitted={(newId) => { setActiveReplyId(null); onSubmitted(newId); }}
              onCancel={() => setActiveReplyId(null)}
              compact getName={getName} getPhoto={getPhoto}
            />
          </div>
        </div>
      )}
    </div>
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
          {idx > 0 && <span className="text-gray-300 mx-1">•</span>}
          {log.summary}
          {log.old_value && log.new_value && (
            <span className="inline-flex items-center gap-1 mx-1">
              <span className="line-through text-gray-400 decoration-gray-300">{log.old_value}</span>
              <ArrowRight className="w-3 h-3 text-gray-400" />
              <span className="font-medium text-gray-600">{log.new_value}</span>
            </span>
          )}
        </React.Fragment>
      ));
    }
    if (itemsCount > 4 && !expanded) {
      return (
        <button onClick={() => setExpanded(true)} className="italic text-gray-400 hover:text-gray-700 transition-colors">
          alterou {itemsCount} propriedades
        </button>
      );
    }
    const fields = group.items.map(l => l.summary.replace(/^(Alterou|Mudou|Atualizou) (o |a |)/i, '').trim());
    const joinedFields = fields.slice(0, -1).join(', ') + ' e ' + fields.slice(-1);
    return <span className="italic">alterou: {joinedFields}</span>;
  };

  const LogNode = (
    <div className="flex h-8 w-8 items-center justify-center bg-gray-50 rounded-full shrink-0 border border-gray-100">
      <div className={cn("w-2 h-2 rounded-full", dotColor)} />
    </div>
  );

  return (
    <TimelineItem time={formattedTime} showTime={showTime} isLast={isLast}>
      <TimelineNode isLast={isLast}>{LogNode}</TimelineNode>
      <TimelineContent className="flex-1">
        <div className={cn("flex flex-wrap items-baseline gap-x-1.5 pt-2 text-[13px] text-gray-500", CONTENT_WIDTH)}>
          <span className="font-medium text-gray-700">{resolvedName}</span>
          <span>{renderLogSummaries()}</span>
        </div>
      </TimelineContent>
    </TimelineItem>
  );
}

// ============================================================================
// COMPONENTE DE INPUT (Exportado Separadamente com Padrão Discord-Style)
// ============================================================================

export function CommentInput({ entityType, entityId, workshopId, parentCommentId = null, onSubmitted, onCancel, compact = false, getName, getPhoto }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const textareaRef = useRef(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0";
    var scrollH = el.scrollHeight;
    var maxH = 120;
    el.style.height = Math.min(scrollH, maxH) + "px";
  }, []);

  useEffect(() => { autoResize(); }, [content, autoResize]);

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
      setContent("");
      setAttachments([]);
      setIsInternal(false);
      setSubmitSuccess(true);
      // Guarda contra retorno inesperado da API (undefined/null)
      onSubmitted?.(newComment?.id);
      setTimeout(() => setSubmitSuccess(false), 1200);
    },
    onError: (error) => {
      console.error('Erro ao enviar comentário:', error);
      toast.error('Não foi possível enviar o comentário. Tente novamente.');
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

  const hasContent = content.trim().length > 0;

  return (
    <div className="w-full">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1 pb-2 animate-in fade-in">
          {attachments.map((att, idx) => (
            <span key={idx} className="inline-flex items-center gap-1.5 text-[12px] text-gray-700 bg-gray-50 border border-gray-200 px-2 py-1 rounded-md">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              <span className="max-w-[120px] truncate">{att.file_name}</span>
              <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500 ml-0.5 transition-colors">×</button>
            </span>
          ))}
        </div>
      )}
      
      {/* ⚠️ Card do Editor estruturado no Padrão Discord-Style (Textarea no topo, Ações embaixo) */}
      <div className={cn("w-full flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm transition-all focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-blue-500/15 p-2.5")}>
        
        {/* Textarea no topo ocupando toda largura */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={compact ? "Responder..." : "Escreva uma atualização deste pedido..."}
          rows={1}
          className="w-full resize-none border-0 bg-transparent text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-0 py-1.5 px-1 leading-[1.4] text-left"
          style={{ minHeight: "40px", maxHeight: "120px" }}
        />

        {/* Barra inferior de ferramentas/ações invertida */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-1">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsInternal(!isInternal)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[12px] font-medium transition-colors shrink-0",
                isInternal ? "text-amber-700 bg-amber-50" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              )}
              title={isInternal ? "Nota interna (clique para desativar)" : "Marcar como nota interna"}>
              <div className={cn("w-2 h-2 rounded-full", isInternal ? "bg-amber-500" : "border border-gray-400")} /> Interno
            </button>
            
            <label className="cursor-pointer shrink-0">
              <input type="file" multiple className="hidden" disabled={isUploading} onChange={(e) => handleFileUpload(Array.from(e.target.files || []))} />
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            {onCancel && (<button onClick={onCancel} className="px-2 h-7 rounded-md text-[12px] font-medium text-gray-500 hover:bg-gray-100 transition-colors shrink-0">Cancelar</button>)}
            <span className="text-[10px] text-gray-300 hidden sm:inline select-none">Ctrl+↵</span>
            
            <button onClick={handleSubmit} disabled={(!hasContent && !submitSuccess) || createMutation.isPending}
              className={cn(
                "flex items-center justify-center h-7 p-0 rounded-[8px] transition-all duration-300 shrink-0 overflow-hidden",
                submitSuccess 
                  ? "bg-emerald-500 text-white shadow-sm px-2.5 w-auto" 
                  : hasContent
                    ? "w-8 bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow" 
                    : "w-8 bg-gray-100 text-gray-300 cursor-default"
              )}
              title="Enviar comentário">
              {createMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : submitSuccess ? (
                <div className="flex items-center gap-1.5 whitespace-nowrap animate-in fade-in zoom-in-95 duration-200">
                  <Check className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium pr-0.5">Enviado</span>
                </div>
              ) : (
                <Send className="w-3.5 h-3.5 ml-0.5" />
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL (ActivityFeed)
// ============================================================================

export default function ActivityFeed({
  entityType, entityId, workshopId,
  showLogs = true, showComments = true, showAttachments = true, allowReply = true, compact = false,
}) {
  const { getName, getPhoto } = useEmployeeResolver();
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
    <div className="flex flex-col w-full relative min-h-full">
      <div className="w-full pb-2">
        {isLoading ? (
          <TimelineSkeleton />
        ) : timelineByDay.length === 0 ? (
          <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center animate-in fade-in px-4">
            <h3 className="text-[14px] font-medium text-gray-900 mb-1">Nenhuma atividade ainda</h3>
            <p className="text-[13px] text-gray-500 max-w-[320px] text-center leading-relaxed">
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
                        <CommentThread 
                          key={"comment-wrap-" + el.comment.id}
                          comment={el.comment}
                          replies={repliesByParent[el.comment.id] || []}
                          getName={getName}
                          getPhoto={getPhoto}
                          allowReply={allowReply}
                          entityType={entityType}
                          entityId={entityId}
                          workshopId={workshopId}
                          isLast={isLastElement}
                          showTime={el.showTime}
                          formattedTime={el.formattedTime}
                          highlightedId={highlightedId}
                          onSubmitted={(newId) => { if(newId) setPendingHighlightId(newId); }}
                        />
                      );
                    }
                  })}
                </Timeline>
              </TimelineSection>
            ))}
          </div>
        )}
      </div>

      {/* ⚠️ Footer Fixo no Rodapé (Sticky) com Divisor Discreto border-t border-slate-100 */}
      {showComments && !isLoading && (
        <div className="sticky bottom-0 z-30 w-full bg-white pt-4 px-4 border-t border-slate-100 mt-auto">
          <CommentInput entityType={entityType} entityId={entityId} workshopId={workshopId}
            getName={getName} getPhoto={getPhoto}
            onSubmitted={(newId) => { if(newId) setPendingHighlightId(newId); }}
          />
        </div>
      )}
    </div>
  );
}