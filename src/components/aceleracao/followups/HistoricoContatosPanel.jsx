import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Phone, MessageCircle, Mail, Video, MapPin, ChevronDown, ChevronUp, X, Clock, User, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import FollowUpConcluidoCard from "./FollowUpConcluidoCard";
import { agruparFUsPorBatch } from "./FollowUpBatchClosureHelper";

const CANAL_ICONS = {
  ligacao: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  video: Video,
  meet: Video,
  presencial: MapPin,
};

const CANAL_LABELS = {
  ligacao: "Ligação", whatsapp: "WhatsApp", email: "E-mail",
  video: "Meet", meet: "Meet", presencial: "Presencial",
};

const RESULTADO_COLORS = {
  atendeu: "bg-green-100 text-green-700 border-green-300",
  nao_atendeu: "bg-red-100 text-red-700 border-red-300",
  retornar: "bg-amber-100 text-amber-700 border-amber-300",
  aguardando: "bg-blue-100 text-blue-700 border-blue-300",
  agendou: "bg-blue-100 text-blue-700 border-blue-300",
  reagendou: "bg-purple-100 text-purple-700 border-purple-300",
  desistiu: "bg-gray-100 text-gray-700 border-gray-300",
};

const RESULTADO_LABELS = {
  atendeu: "Atendeu", nao_atendeu: "Não atendeu", retornar: "Retornar",
  aguardando: "Aguardando resposta", agendou: "Agendou",
  reagendou: "Reagendou", desistiu: "Desistiu",
};

const PROXIMO_PASSO_LABELS = {
  reagendar: "Reagendar follow-up", agendar: "Agendar sessão",
  enviar: "Enviar material", escalar: "Escalar para gestor",
  concluir: "Concluir programa", cancelar: "Cancelamento",
};

const HUMOR_EMOJI = {
  Receptivo: "😊", Neutro: "😐", Resistente: "😤",
  Animado: "🎉", Preocupado: "😟",
};

const ENGAJAMENTO_COLORS = {
  Alto: "text-green-600 font-bold", Médio: "text-amber-600 font-bold", Baixo: "text-red-600 font-bold",
};

function ImageModal({ src, onClose }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="relative max-w-4xl max-h-[90vh] p-2">
        <button onClick={onClose} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg z-10">
          <X className="w-4 h-4 text-gray-700" />
        </button>
        <img src={src} alt="Screenshot" className="max-w-full max-h-[85vh] rounded-lg object-contain" onClick={e => e.stopPropagation()} />
      </div>
    </div>
  );
}

function ContatoCard({ contato, isFirst, workshopName }) {
  const [expanded, setExpanded] = useState(isFirst);
  const [imgModalSrc, setImgModalSrc] = useState(null);

  const canais = contato.canal ? contato.canal.split(", ").filter(Boolean) : [];
  const dataFormatada = contato.completedAt
    ? format(new Date(contato.completedAt), "dd/MM/yyyy 'às' HH:mm")
    : contato.dataContato
    ? format(new Date(contato.dataContato + "T00:00:00"), "dd/MM/yyyy")
    : "—";

  // Detecta se é um suporte pelo campo observacoes ou pelo origin_type
  const isSuporte = (contato.observacoes?.match(/\[SUPORTE\s+SUP-/i)) || false;
  const suporteId = isSuporte
    ? contato.observacoes.match(/\[SUPORTE\s+(SUP-[^\]]+)\]/i)?.[1]
    : null;

  return (
    <>
      {imgModalSrc && <ImageModal src={imgModalSrc} onClose={() => setImgModalSrc(null)} />}
      <div className={`border rounded-lg overflow-hidden transition-all ${
        isSuporte
          ? (isFirst ? "border-amber-300 bg-amber-50" : "border-amber-200 bg-white")
          : (isFirst ? "border-red-200 bg-red-50" : "border-gray-200 bg-white")
      }`}>
        {/* Header do card — sempre visível */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-black/5 transition-colors text-left"
        >
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {isFirst && <span className={`text-[9px] rounded px-1.5 py-0.5 font-bold flex-shrink-0 ${isSuporte ? "bg-amber-500 text-white" : "bg-red-600 text-white"}`}>ÚLTIMO</span>}
            {/* Badge suporte */}
            {isSuporte ? (
              <span className="text-[9px] bg-amber-100 text-amber-700 border border-amber-300 rounded px-1.5 py-0.5 font-bold flex-shrink-0">
                🛟 SUPORTE
              </span>
            ) : (
              /* Canais */
              <div className="flex items-center gap-1">
                {canais.slice(0, 2).map(c => {
                  const Icon = CANAL_ICONS[c] || MessageCircle;
                  return <Icon key={c} className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />;
                })}
              </div>
            )}
            {/* ID do suporte */}
            {suporteId && (
              <span className="text-[9px] text-amber-600 font-mono flex-shrink-0">{suporteId}</span>
            )}
            {/* Resultado */}
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${RESULTADO_COLORS[contato.resultado] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
              {RESULTADO_LABELS[contato.resultado] || contato.resultado || "—"}
            </span>
            {/* Data */}
            <span className="text-[10px] text-gray-400 flex-shrink-0">{dataFormatada}</span>
          </div>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
        </button>

        {/* Corpo expandido */}
        {expanded && (
          <div className="px-3 pb-3 pt-1 space-y-2.5 border-t border-gray-100">

            {/* Linha de metadados */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
              {contato.duracao && (
                <div className="flex items-center gap-1 text-gray-600">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span>{contato.duracao} min</span>
                </div>
              )}
              {contato.humor && (
                <div className="flex items-center gap-1 text-gray-600">
                  <span>{HUMOR_EMOJI[contato.humor] || "—"}</span>
                  <span>{contato.humor}</span>
                </div>
              )}
              {contato.engajamento && (
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3 text-gray-400" />
                  <span className={ENGAJAMENTO_COLORS[contato.engajamento] || "text-gray-600"}>{contato.engajamento}</span>
                </div>
              )}
              {contato.consultor_nome && (
                <div className="flex items-center gap-1 text-gray-500">
                  <span className="truncate">{contato.consultor_nome}</span>
                </div>
              )}
            </div>

            {/* Observações — remove tag [SUPORTE xxx] do display */}
            {contato.observacoes && (
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Observações</p>
                <p className="text-[11px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {contato.observacoes.replace(/^\[SUPORTE\s+SUP-[^\]]+\]\s*/i, '')}
                </p>
              </div>
            )}

            {/* Compromissos */}
            {contato.compromissos && (
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Compromissos do cliente</p>
                <p className="text-[11px] text-gray-700 leading-relaxed whitespace-pre-wrap">{contato.compromissos}</p>
              </div>
            )}

            {/* Próximo passo */}
            {contato.proximoPasso && (
              <div className="flex items-center gap-2">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Próximo passo:</p>
                <span className="text-[10px] bg-gray-900 text-white rounded px-2 py-0.5 font-medium">
                  {PROXIMO_PASSO_LABELS[contato.proximoPasso] || contato.proximoPasso}
                </span>
                {contato.proxData && (
                  <span className="text-[10px] text-blue-600 font-medium">
                    → {format(new Date(contato.proxData + "T00:00:00"), "dd/MM")}{contato.proxHora ? ` ${contato.proxHora}` : ""}
                  </span>
                )}
              </div>
            )}

            {/* Imagens/Screenshots */}
            {contato.pastedImages?.length > 0 && (
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                  Screenshots ({contato.pastedImages.length})
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {contato.pastedImages.map((img, idx) => (
                    <button
                      key={img.id || idx}
                      onClick={() => setImgModalSrc(img.src)}
                      className="relative group rounded overflow-hidden border border-gray-200 bg-gray-50 hover:border-red-400 transition-colors"
                    >
                      <img src={img.src} alt={img.name || `Screenshot ${idx + 1}`} className="w-full h-14 object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <span className="text-white text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">Ver</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default function HistoricoContatosPanel({ workshopId, workshopName }) {
  const { data: historico = [], isLoading } = useQuery({
    queryKey: ["historico-contatos", workshopId],
    queryFn: () => base44.entities.FollowUpConcluido.filter(
      { workshop_id: workshopId },
      "-completedAt",
      50
    ),
    enabled: !!workshopId,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="px-3 py-6 flex flex-col items-center gap-2">
        <div className="w-5 h-5 border-2 border-gray-200 border-t-red-500 rounded-full animate-spin" />
        <p className="text-xs text-gray-400">Carregando histórico...</p>
      </div>
    );
  }

  if (historico.length === 0) {
    return (
      <div className="px-3 py-8 flex flex-col items-center gap-2 text-center">
        <MessageSquare className="w-8 h-8 text-gray-200" />
        <p className="text-xs text-gray-400 font-medium">Nenhum contato registrado ainda</p>
        <p className="text-[10px] text-gray-300">Os atendimentos finalizados aparecerão aqui</p>
      </div>
    );
  }

  // Agrupar conclusões em massa
  const batchesAgrupadas = agruparFUsPorBatch(historico);
  const contatosIndividuais = historico.filter(c => !c.is_batch_close || !c.batch_group_id);

  // Resumo para IA (texto simplificado dos últimos 5 contatos)
  const resumoIA = historico.slice(0, 5).map((c, i) =>
    `Contato ${i + 1} (${c.completedAt ? format(new Date(c.completedAt), "dd/MM/yy") : "—"}): canal=${c.canal || "?"}, resultado=${RESULTADO_LABELS[c.resultado] || c.resultado || "?"}, humor=${c.humor || "não informado"}, engajamento=${c.engajamento || "não informado"}, próximo passo=${PROXIMO_PASSO_LABELS[c.proximoPasso] || c.proximoPasso || "?"}, obs="${c.observacoes?.slice(0, 100) || "—"}"`
  ).join(" | ");

  return (
    <div className="px-3 py-3 space-y-2">
      {/* Cabeçalho com contador */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
          {historico.length} contato{historico.length !== 1 ? "s" : ""} registrado{historico.length !== 1 ? "s" : ""}
        </p>
        <Badge className="bg-gray-100 text-gray-600 border-0 text-[9px]">
          mais recente primeiro
        </Badge>
      </div>

      {/* Resumo para IA — oculto visualmente, mas disponível como data-attr para referência */}
      <div data-ia-context={resumoIA} className="hidden" aria-hidden="true" />

      {/* Conclusões em Massa (Batches) */}
      {batchesAgrupadas.map(batch => (
        <FollowUpConcluidoCard
          key={batch.batch_group_id}
          registro={batch}
          isBatch={true}
        />
      ))}

      {/* Cards de contato individual */}
      {contatosIndividuais.map((contato, idx) => (
        <ContatoCard
          key={contato.id}
          contato={contato}
          isFirst={idx === 0 && batchesAgrupadas.length === 0}
          workshopName={workshopName}
        />
      ))}
    </div>
  );
}

// Exporta o resumoIA como utilitário para a IA usar no buildSystemPrompt
export function buildHistoricoResumoIA(historico = []) {
  if (!historico.length) return "Nenhum contato registrado.";
  return historico.slice(0, 5).map((c, i) =>
    `Contato ${i + 1} (${c.completedAt ? format(new Date(c.completedAt), "dd/MM/yy") : "—"}): canal=${c.canal || "?"}, resultado=${RESULTADO_LABELS[c.resultado] || c.resultado || "?"}, humor=${c.humor || "não informado"}, engajamento=${c.engajamento || "não informado"}, próximo passo=${PROXIMO_PASSO_LABELS[c.proximoPasso] || c.proximoPasso || "?"}, obs="${c.observacoes?.slice(0, 120) || "—"}"`
  ).join("\n");
}