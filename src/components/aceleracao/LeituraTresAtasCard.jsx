import React, { useState, useEffect, useMemo } from "react";
import { Loader2, ChevronDown, BookOpen, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * LeituraTresAtasCard
 *
 * Card de leitura rápida das últimas 3 atas do cliente. A IA lê, para cada ATA:
 * pautas + observações do consultor + inteligência de negócio + decisões + próximos passos
 * e gera um resumo curto (teaser) + resumo detalhado + próximos passos acordados.
 *
 * Comportamento:
 *  - 3 blocos empilhados (ANTEPENÚLTIMA / PENÚLTIMA / ÚLTIMA)
 *  - Cada bloco mostra o resumo curto por padrão
 *  - Clica no bloco → expande o detalhado (acordeão — só um aberto por vez)
 *  - Dados ficam em memória após carregar (reabrir é instantâneo)
 *
 * Props:
 *  - workshop_id: string (obrigatório)
 *  - atendimento_id_atual: string (opcional — exclui a ATA do atendimento atual)
 *  - autoLoad: boolean (default false) — se true, carrega imediatamente
 */
const POSICAO_LABEL = {
  antepenúltima: "ANTEPENÚLTIMA",
  penúltima: "PENÚLTIMA",
  última: "ÚLTIMA"
};
const POSICAO_COLOR = {
  antepenúltima: "bg-gray-100 text-gray-600 border-gray-300",
  penúltima: "bg-blue-100 text-blue-700 border-blue-300",
  última: "bg-green-100 text-green-700 border-green-300"
};

export default function LeituraTresAtasCard({ workshop_id, atendimento_id_atual, autoLoad = false }) {
  const [data, setData] = useState(null);   // { atas: [...] }
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const fetchLeitura = async () => {
    if (!workshop_id) {
      toast.error("Selecione uma oficina primeiro");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("gerarLeituraTresAtas", {
        workshop_id,
        atendimento_id_atual: atendimento_id_atual || null
      });
      const payload = res?.data || res;
      if (payload?.success === false) throw new Error(payload.error || "Erro ao gerar leitura");
      setData(payload);
      setLoaded(true);
    } catch (e) {
      setError(e.message || "Erro ao gerar leitura das atas");
      toast.error("Erro ao gerar leitura das atas: " + (e.message || ""));
    } finally {
      setLoading(false);
    }
  };

  // Auto-load controlado (usado pelo painel do rail, que abre direto)
  useEffect(() => {
    if (autoLoad && workshop_id && !loaded && !loading) {
      fetchLeitura();
    }
  }, [autoLoad, workshop_id]);

  const atas = useMemo(() => data?.atas || [], [data]);

  const handleToggle = (ata_id) => {
    setExpandedId(prev => (prev === ata_id ? null : ata_id));
  };

  // Loading inicial
  if (loading && !loaded) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
        <p className="text-xs">Gerando leitura das últimas 3 atas...</p>
      </div>
    );
  }

  // Erro
  if (error && !loaded) {
    return (
      <div className="py-6 text-center">
        <p className="text-xs text-red-600 mb-3">{error}</p>
        <Button size="sm" variant="outline" onClick={fetchLeitura}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Tentar novamente
        </Button>
      </div>
    );
  }

  // Sem dados ainda (botão para iniciar)
  if (!loaded) {
    return (
      <div className="py-4 text-center">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start border-purple-300 text-purple-700 hover:bg-purple-50"
          onClick={fetchLeitura}
          disabled={loading || !workshop_id}
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Leitura das últimas 3 atas
        </Button>
        <p className="text-[11px] text-gray-400 mt-2">
          A IA lê as 3 atas mais recentes (pautas, observações, inteligência de negócio e próximos passos) e gera um resumo por reunião.
        </p>
      </div>
    );
  }

  // Sem histórico
  if (atas.length === 0) {
    return (
      <div className="py-4 text-center text-xs text-gray-500 italic">
        Sem histórico de reuniões anteriores registradas para este cliente.
      </div>
    );
  }

  // Card com 3 blocos (acordeão)
  return (
    <div className="rounded-lg border border-purple-200 bg-[#f8fafc] border-l-4 border-l-purple-500 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-purple-600 text-white">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          <span className="text-sm font-semibold">Leitura das últimas 3 atas</span>
        </div>
        <button
          onClick={fetchLeitura}
          disabled={loading}
          title="Regenerar"
          className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Blocos */}
      <div className="divide-y divide-purple-100">
        {atas.map((ata) => {
          const isOpen = expandedId === ata.ata_id;
          const posLabel = POSICAO_LABEL[ata.posicao] || ata.posicao;
          const posColor = POSICAO_COLOR[ata.posicao] || POSICAO_COLOR.antepenúltima;
          return (
            <div key={ata.ata_id} className="bg-white">
              {/* Cabeçalho do bloco (clicável) */}
              <button
                onClick={() => handleToggle(ata.ata_id)}
                className="w-full text-left px-3 py-3 hover:bg-purple-50/60 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${posColor}`}>
                      {posLabel}
                    </span>
                    <span className="text-xs font-semibold text-gray-800">
                      {ata.meeting_date ? new Date(ata.meeting_date).toLocaleDateString("pt-BR") : "—"}
                    </span>
                    <span className="text-[11px] text-gray-500">— {ata.tipo}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </div>
                {/* Resumo curto (sempre visível) */}
                <p className="text-[12px] text-gray-600 leading-snug line-clamp-3">
                  {ata.resumo_curto}
                </p>
              </button>

              {/* Detalhado (expandido) */}
              {isOpen && (
                <div className="px-3 pb-3 space-y-2 bg-purple-50/40 border-t border-purple-100">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-700 mb-1">O que foi definido</p>
                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                      {ata.resumo_detalhado}
                    </p>
                  </div>
                  {ata.proximos_passos_acordados && ata.proximos_passos_acordados.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-700 mb-1">
                        Próximos passos acordados
                      </p>
                      <ul className="space-y-1">
                        {ata.proximos_passos_acordados.map((p, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                            <span className="flex-1">
                              {p.descricao || "—"}
                              {p.responsavel && <span className="text-gray-500"> · Resp.: {p.responsavel}</span>}
                              {p.prazo && <span className="text-gray-500"> · Prazo: {new Date(p.prazo).toLocaleDateString("pt-BR")}</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}