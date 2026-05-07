import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Download, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Modal leve para visualização da ATA de reunião.
 * Busca direto no MeetingMinutes sem depender do ConsultoriaAtendimento.
 * Z-index 60 para ficar acima do ProximoPassoModal (z-50).
 */
export default function AtaLeituraModal({ ataId, atendimentoId, onClose }) {
  const [ata, setAta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let found = null;

        // 1. Tenta buscar por ata_id direto
        if (ataId) {
          try {
            found = await base44.entities.MeetingMinutes.get(ataId);
          } catch (e) {
            // ATA não encontrada por ID, tenta pelo atendimento
          }
        }

        // 2. Fallback: busca pelo atendimento_id
        if (!found && atendimentoId) {
          const results = await base44.entities.MeetingMinutes.filter({ atendimento_id: atendimentoId }, '-created_date', 1);
          if (results?.length > 0) found = results[0];
        }

        if (found) {
          setAta(found);
        } else {
          setError("ATA não encontrada para este atendimento.");
        }
      } catch (e) {
        setError("Erro ao carregar ATA: " + e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [ataId, atendimentoId]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 60, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {ata?.code ? `ATA ${ata.code}` : "Ata da Reunião"}
            </h2>
            {ata?.meeting_date && (
              <p className="text-sm text-gray-500 mt-0.5">
                {format(new Date(ata.meeting_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                {ata?.meeting_time ? ` às ${ata.meeting_time}` : ""}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-3 text-gray-500">Carregando ATA...</span>
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">{error}</p>
              <p className="text-gray-400 text-sm mt-1">O atendimento original pode ter sido removido, mas a ATA pode estar disponível em outro local.</p>
            </div>
          )}

          {ata && !loading && (
            <div className="space-y-6 text-sm">
              {/* Tipo e consultor */}
              {(ata.tipo_aceleracao || ata.consultor_name) && (
                <div className="flex flex-wrap gap-2">
                  {ata.tipo_aceleracao && (
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">{ata.tipo_aceleracao}</span>
                  )}
                  {ata.consultor_name && (
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">👤 {ata.consultor_name}</span>
                  )}
                </div>
              )}

              {/* Participantes */}
              {ata.participantes?.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 border-l-4 border-blue-400 pl-3 mb-2">Participantes</h3>
                  <div className="pl-4 space-y-1">
                    {ata.participantes.map((p, i) => (
                      <p key={i} className="text-gray-600">{p.name || p.nome}{p.role ? ` — ${p.role || p.cargo}` : ""}</p>
                    ))}
                  </div>
                </section>
              )}

              {/* Objetivos */}
              {ata.objetivos_atendimento && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 border-l-4 border-blue-400 pl-3 mb-2">Objetivos</h3>
                  <p className="pl-4 text-gray-700 whitespace-pre-wrap">{ata.objetivos_atendimento}</p>
                </section>
              )}

              {/* Pautas / anotações */}
              {ata.pautas && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 border-l-4 border-blue-400 pl-3 mb-2">Pauta</h3>
                  <p className="pl-4 text-gray-700 whitespace-pre-wrap">{ata.pautas}</p>
                </section>
              )}

              {/* ATA gerada por IA */}
              {ata.ata_ia && (
                <section>
                  <h3 className="text-sm font-semibold text-purple-700 border-l-4 border-purple-400 pl-3 mb-2">Resumo Executivo (IA)</h3>
                  <div className="pl-4 prose prose-sm prose-slate max-w-none text-gray-700 bg-purple-50/30 p-4 rounded-lg border border-purple-100">
                    <ReactMarkdown>{ata.ata_ia}</ReactMarkdown>
                  </div>
                </section>
              )}

              {/* Próximos Passos */}
              {(ata.proximos_passos_list?.length > 0 || ata.proximos_passos) && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 border-l-4 border-green-400 pl-3 mb-2">Próximos Passos</h3>
                  <div className="pl-4 space-y-2">
                    {ata.proximos_passos_list?.filter(p => p.descricao).map((p, i) => (
                      <div key={i} className="flex items-start gap-2 bg-white border border-gray-100 p-3 rounded-lg shadow-sm">
                        <span className="bg-green-100 text-green-600 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                        <div>
                          <p className="font-medium text-gray-900">{p.descricao}</p>
                          <div className="flex gap-3 text-xs text-gray-500 mt-1">
                            {p.responsavel && <span>👤 {p.responsavel}</span>}
                            {p.prazo && <span>📅 {new Date(p.prazo).toLocaleDateString("pt-BR")}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                    {ata.proximos_passos && (
                      <p className="text-gray-700 whitespace-pre-wrap mt-2">{ata.proximos_passos}</p>
                    )}
                  </div>
                </section>
              )}

              {/* Decisões */}
              {ata.decisoes_tomadas?.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 border-l-4 border-blue-400 pl-3 mb-2">Decisões Tomadas</h3>
                  <div className="pl-4 space-y-2">
                    {ata.decisoes_tomadas.map((d, i) => (
                      <div key={i} className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                        <p className="font-medium text-gray-900">{d.decisao}</p>
                        <div className="flex gap-3 text-xs text-gray-500 mt-1">
                          {d.responsavel && <span>{d.responsavel}</span>}
                          {d.prazo && <span>📅 {new Date(d.prazo).toLocaleDateString("pt-BR")}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Observações consultor */}
              {ata.observacoes_consultor && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 border-l-4 border-blue-400 pl-3 mb-2">Observações do Consultor</h3>
                  <p className="pl-4 text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">{ata.observacoes_consultor}</p>
                </section>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end shrink-0">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  );
}