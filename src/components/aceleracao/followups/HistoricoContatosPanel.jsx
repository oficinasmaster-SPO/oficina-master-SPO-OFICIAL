import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Phone, MessageCircle, Mail, Video, MapPin, ChevronDown,
  X, Clock, User, Inbox, History, Search, ArrowRight,
  LifeBuoy, Image as ImageIcon, CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import FollowUpConcluidoCard from "./FollowUpConcluidoCard";
import { agruparFUsPorBatch } from "./FollowUpBatchClosureHelper";

// ── Constantes ──

const CANAL_ICONS = {
  ligacao: Phone, whatsapp: MessageCircle, email: Mail,
  video: Video, meet: Video, presencial: MapPin,
};

const CANAL_LABELS = {
  ligacao: "Ligação", whatsapp: "WhatsApp", email: "E-mail",
  video: "Meet", meet: "Meet", presencial: "Presencial",
};

const RESULTADO_COLORS = {
  atendeu:     "bg-green-100 text-green-700 border-green-300",
  nao_atendeu: "bg-red-100 text-red-700 border-red-300",
  retornar:    "bg-amber-100 text-amber-700 border-amber-300",
  aguardando:  "bg-blue-100 text-blue-700 border-blue-300",
  agendou:     "bg-blue-100 text-blue-700 border-blue-300",
  reagendou:   "bg-purple-100 text-purple-700 border-purple-300",
  desistiu:    "bg-gray-100 text-gray-700 border-gray-300",
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

const ENGAJAMENTO_CHIP = {
  Alto:  "bg-green-100 text-green-700 border-green-300",
  Médio: "bg-amber-100 text-amber-700 border-amber-300",
  Baixo: "bg-red-100 text-red-700 border-red-300",
};

const FILTROS = [
  { key: "todos",       label: "Todos" },
  { key: "atendeu",     label: "Com retorno" },
  { key: "pendente",    label: "Pendentes" },
  { key: "sem_contato", label: "Sem contato" },
];

function matchFiltro(c, f) {
  if (f === "todos") return true;
  if (f === "atendeu") return ["atendeu", "agendou", "reagendou"].includes(c.resultado);
  if (f === "pendente") return ["aguardando", "retornar"].includes(c.resultado);
  return ["nao_atendeu", "desistiu"].includes(c.resultado);
}

function labelProximoPasso(pp) {
  if (!pp) return null;
  if (typeof pp === "string") return PROXIMO_PASSO_LABELS[pp] || pp;
  if (typeof pp === "object" && pp !== null) return pp.descricao || JSON.stringify(pp);
  return String(pp);
}

// ── Chip genérico ──

function Chip({ tone, children }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide",
      tone || "bg-gray-100 text-gray-600 border-gray-200"
    )}>
      {children}
    </span>
  );
}

// ── Image modal ──

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

// ── Card de contato (timeline) ──

function ContatoCard({ contato, isFirst }) {
  const [expanded, setExpanded] = useState(!!isFirst);
  const [imgModalSrc, setImgModalSrc] = useState(null);

  const canais = contato.canal ? contato.canal.split(", ").filter(Boolean) : [];
  const date = contato.completedAt
    ? new Date(contato.completedAt)
    : contato.dataContato
    ? new Date(contato.dataContato + "T00:00:00")
    : null;
  const dataCurta = date ? format(date, "dd MMM", { locale: ptBR }) : "—";
  const dataLonga = date
    ? format(date, contato.completedAt ? "dd/MM/yyyy 'às' HH:mm" : "dd/MM/yyyy", { locale: ptBR })
    : "Sem data";

  const suporteId = contato.observacoes?.match(/\[SUPORTE\s+(SUP-[^\]]+)\]/i)?.[1] ?? null;
  const observacoes = contato.observacoes?.replace(/^\[SUPORTE\s+SUP-[^\]]+\]\s*/i, "");
  const proximo = labelProximoPasso(contato.proximoPasso);

  return (
    <>
      {imgModalSrc && <ImageModal src={imgModalSrc} onClose={() => setImgModalSrc(null)} />}
      <li className="relative pl-10">
        {/* Timeline node */}
        <span className={cn(
          "absolute left-2.5 top-5 z-10 flex size-4 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white",
          isFirst ? "bg-red-500 ring-4 ring-red-500/15" : "bg-gray-300"
        )} />

        <article className={cn(
          "overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow",
          expanded && "shadow-md",
          isFirst && "border-red-200"
        )}>
          {/* Header colapsado */}
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50/60"
          >
            {/* Ícones de canal */}
            <div className="flex shrink-0 items-center gap-1 pt-0.5">
              {suporteId ? (
                <span className="flex size-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700 border border-amber-200">
                  <LifeBuoy className="size-3.5" />
                </span>
              ) : (
                canais.slice(0, 2).map(c => {
                  const Icon = CANAL_ICONS[c] || MessageCircle;
                  return (
                    <span key={c} title={CANAL_LABELS[c] || c} className="flex size-7 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                      <Icon className="size-3.5" />
                    </span>
                  );
                })
              )}
            </div>

            {/* Conteúdo central */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Chip tone={RESULTADO_COLORS[contato.resultado]}>
                  {RESULTADO_LABELS[contato.resultado] || contato.resultado || "—"}
                </Chip>
                {isFirst && <Chip tone="bg-red-100 text-red-700 border-red-300">Último contato</Chip>}
                {suporteId && <Chip tone="bg-amber-100 text-amber-700 border-amber-300">{suporteId}</Chip>}
                {contato.duracao != null && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                    <Clock className="size-3" />
                    {contato.duracao} min
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-sm text-gray-500">
                {observacoes || "Sem observações registradas"}
              </p>
            </div>

            {/* Data + chevron */}
            <div className="flex shrink-0 items-center gap-2 pt-0.5">
              <div className="text-right">
                <div className="text-xs font-semibold text-gray-800">{dataCurta}</div>
                {date && <div className="text-[11px] text-gray-400">{format(date, "yyyy")}</div>}
              </div>
              <ChevronDown className={cn(
                "size-4 text-gray-400 transition-transform",
                expanded && "rotate-180"
              )} />
            </div>
          </button>

          {/* Corpo expandido */}
          {expanded && (
            <div className="space-y-4 border-t bg-gray-50/30 px-4 py-4">
              {/* Meta-dados */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                <span className="inline-flex items-center gap-1.5 text-gray-500">
                  <CalendarClock className="size-3.5" />
                  {dataLonga}
                </span>
                {contato.humor && (
                  <span className="inline-flex items-center gap-1.5 text-gray-500">
                    <span>{HUMOR_EMOJI[contato.humor] || "—"}</span>
                    {contato.humor}
                  </span>
                )}
                {contato.engajamento && (
                  <span className="inline-flex items-center gap-1.5 text-gray-500">
                    Engajamento
                    <Chip tone={ENGAJAMENTO_CHIP[contato.engajamento]}>{contato.engajamento}</Chip>
                  </span>
                )}
                {(contato.consultor_principal_nome || contato.consultor_nome) && (
                  <span className="inline-flex items-center gap-1.5 text-gray-500">
                    <User className="size-3.5" />
                    <span className="font-medium text-gray-800">
                      {contato.consultor_principal_nome || contato.consultor_nome}
                    </span>
                    {contato.consultor_executor_nome &&
                      contato.consultor_executor_nome !== (contato.consultor_principal_nome || contato.consultor_nome) && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span>atendeu</span>
                        <span className="font-medium text-gray-800">
                          {contato.consultor_executor_nome}
                        </span>
                      </>
                    )}
                  </span>
                )}
              </div>

              {/* Observações */}
              {observacoes && (
                <section>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Observações</h4>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-700">{observacoes}</p>
                </section>
              )}

              {/* Compromissos */}
              {contato.compromissos && (
                <section className="rounded-lg border-l-2 border-l-red-400 bg-white px-3 py-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Compromissos do cliente</h4>
                  <p className="mt-1 text-sm text-gray-700">{contato.compromissos}</p>
                </section>
              )}

              {/* Próximo passo */}
              {proximo && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm">
                  <ArrowRight className="size-4 text-red-500" />
                  <span className="text-gray-500">Próximo passo:</span>
                  <span className="font-medium text-gray-800">{proximo}</span>
                  {contato.proxData && (
                    <Chip tone="bg-blue-100 text-blue-700 border-blue-300">
                      {format(new Date(contato.proxData + "T00:00:00"), "dd/MM")}
                      {contato.proxHora ? ` · ${contato.proxHora}` : ""}
                    </Chip>
                  )}
                </div>
              )}

              {/* Screenshots */}
              {contato.pastedImages?.length > 0 && (
                <section>
                  <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    <ImageIcon className="size-3.5" />
                    Screenshots ({contato.pastedImages.length})
                  </h4>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {contato.pastedImages.map((img, idx) => (
                      <button
                        key={img.id || idx}
                        onClick={(e) => { e.stopPropagation(); setImgModalSrc(img.src); }}
                        className="relative group rounded-md overflow-hidden border border-gray-200 bg-gray-50 hover:border-red-400 transition-colors"
                      >
                        <img src={img.src} alt={img.name || `Screenshot ${idx + 1}`} className="w-full h-14 object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <span className="text-white text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">Ver</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </article>
      </li>
    </>
  );
}

// ── Painel principal ──

export default function HistoricoContatosPanel({ workshopId, workshopName }) {
  const [filtro, setFiltro] = useState("todos");
  const [busca, setBusca] = useState("");

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

  const batchesAgrupadas = useMemo(() => agruparFUsPorBatch(historico), [historico]);
  const contatosIndividuais = useMemo(() => historico.filter(c => !c.is_batch_close || !c.batch_group_id), [historico]);

  const lista = useMemo(() => {
    return contatosIndividuais.filter(c => {
      if (!matchFiltro(c, filtro)) return false;
      if (!busca.trim()) return true;
      const q = busca.toLowerCase();
      return (
        (c.observacoes || "").toLowerCase().includes(q) ||
        (c.compromissos || "").toLowerCase().includes(q) ||
        (c.consultor_principal_nome || c.consultor_nome || "").toLowerCase().includes(q) ||
        (RESULTADO_LABELS[c.resultado] || "").toLowerCase().includes(q)
      );
    });
  }, [contatosIndividuais, filtro, busca]);

  const contagem = (f) => contatosIndividuais.filter(c => matchFiltro(c, f)).length;

  // IA context (hidden)
  const resumoIA = useMemo(() => {
    return historico.slice(0, 5).map((c, i) => {
      const ppStr = labelProximoPasso(c.proximoPasso) || "?";
      return `Contato ${i + 1} (${c.completedAt ? format(new Date(c.completedAt), "dd/MM/yy") : "—"}): canal=${c.canal || "?"}, resultado=${RESULTADO_LABELS[c.resultado] || c.resultado || "?"}, humor=${c.humor || "não informado"}, engajamento=${c.engajamento || "não informado"}, próximo passo=${ppStr}, obs="${c.observacoes?.slice(0, 100) || "—"}"`;
    }).join(" | ");
  }, [historico]);

  if (isLoading) {
    return (
      <div className="px-3 py-6 flex flex-col items-center gap-2">
        <div className="w-5 h-5 border-2 border-gray-200 border-t-red-500 rounded-full animate-spin" />
        <p className="text-xs text-gray-400">Carregando histórico...</p>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-red-50 text-red-500">
            <History className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Histórico de contatos</h2>
            <p className="text-xs text-gray-400">
              {historico.length} registro{historico.length !== 1 ? "s" : ""}
              {workshopName ? ` · ${workshopName}` : ""} · mais recente primeiro
            </p>
          </div>
        </div>
        <div className="relative w-full sm:w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar no histórico…"
            className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-colors"
          />
        </div>
      </header>

      {/* Filtros */}
      <div className="flex flex-wrap gap-1.5 border-b border-gray-100 px-5 py-3">
        {FILTROS.map(f => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFiltro(f.key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filtro === f.key
                ? "border-red-400 bg-red-500 text-white"
                : "border-gray-200 text-gray-500 hover:bg-gray-50"
            )}
          >
            {f.label}
            <span className="ml-1.5 opacity-70">{contagem(f.key)}</span>
          </button>
        ))}
      </div>

      {/* IA hidden context */}
      <div data-ia-context={resumoIA} className="hidden" aria-hidden="true" />

      {/* Batches (se houver) */}
      {batchesAgrupadas.length > 0 && filtro === "todos" && !busca && (
        <div className="px-5 pt-4 space-y-2">
          {batchesAgrupadas.map(batch => (
            <FollowUpConcluidoCard key={batch.batch_group_id} registro={batch} isBatch={true} />
          ))}
        </div>
      )}

      {/* Lista / Empty */}
      {lista.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
          <Inbox className="size-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">Nenhum contato encontrado</p>
          <p className="text-xs text-gray-400">
            {historico.length === 0
              ? "Os atendimentos finalizados aparecerão aqui"
              : "Ajuste a busca ou os filtros para ver outros atendimentos."}
          </p>
        </div>
      ) : (
        <ol className="relative space-y-3 px-5 py-5">
          {/* Timeline line */}
          <span className="absolute bottom-8 left-7 top-8 w-px bg-gray-200" aria-hidden />
          {lista.map((contato, idx) => (
            <ContatoCard
              key={contato.id}
              contato={contato}
              isFirst={idx === 0 && filtro === "todos" && !busca}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

export function buildHistoricoResumoIA(historico = []) {
  if (!historico.length) return "Nenhum contato registrado.";
  return historico.slice(0, 5).map((c, i) => {
    const ppStr = labelProximoPasso(c.proximoPasso) || "?";
    return `Contato ${i + 1} (${c.completedAt ? format(new Date(c.completedAt), "dd/MM/yy") : "—"}): canal=${c.canal || "?"}, resultado=${RESULTADO_LABELS[c.resultado] || c.resultado || "?"}, humor=${c.humor || "não informado"}, engajamento=${c.engajamento || "não informado"}, próximo passo=${ppStr}, obs="${c.observacoes?.slice(0, 120) || "—"}"`;
  }).join("\n");
}
