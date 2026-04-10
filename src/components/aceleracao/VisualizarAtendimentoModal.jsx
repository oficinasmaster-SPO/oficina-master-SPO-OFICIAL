import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDateTimeBR } from "@/utils/timezone";
import { ATENDIMENTO_STATUS_COLORS, ATENDIMENTO_STATUS_LABELS } from "@/components/lib/ataConstants";
import { User, Calendar, Clock, MapPin, Target, CheckSquare, FileText, CheckCircle2, ChevronRight, CheckSquare2 } from "lucide-react";
import WheelLoader from "@/components/ui/WheelLoader";

export default function VisualizarAtendimentoModal({ atendimentoId, onClose }) {
  const [atendimento, setAtendimento] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const att = await base44.entities.ConsultoriaAtendimento.get(atendimentoId);
        setAtendimento(att);
        if (att?.workshop_id) {
          const ws = await base44.entities.Workshop.get(att.workshop_id);
          setWorkshop(ws);
        }
      } catch (error) {
        console.error("Erro ao carregar atendimento:", error);
      } finally {
        setLoading(false);
      }
    }
    if (atendimentoId) {
      loadData();
    }
  }, [atendimentoId]);

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl h-[80vh] flex items-center justify-center">
          <WheelLoader size="lg" text="Carregando detalhes..." />
        </DialogContent>
      </Dialog>
    );
  }

  if (!atendimento) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Atendimento não encontrado</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden bg-gray-50/50">
        <DialogHeader className="px-6 py-4 border-b bg-white">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-gray-900">Detalhes do Atendimento</DialogTitle>
            <Badge className={`${ATENDIMENTO_STATUS_COLORS[atendimento.status] || 'bg-gray-100 text-gray-800'}`}>
              {ATENDIMENTO_STATUS_LABELS[atendimento.status] || atendimento.status || 'Indefinido'}
            </Badge>
          </div>
          <DialogDescription className="text-sm text-gray-500 mt-1">
            Visualização de todas as informações registradas (Somente Leitura)
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-8">
            
            {/* Cabeçalho de Informações Básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <MapPin className="w-4 h-4" /> Oficina
                </div>
                <div className="font-semibold text-gray-900 truncate" title={workshop?.name}>
                  {workshop?.name || 'N/A'}
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <User className="w-4 h-4" /> Consultor
                </div>
                <div className="font-semibold text-gray-900 truncate" title={atendimento.consultor_nome}>
                  {atendimento.consultor_nome || '-'}
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Calendar className="w-4 h-4" /> Data Agendada
                </div>
                <div className="font-semibold text-gray-900">
                  {formatDateTimeBR(atendimento.data_agendada)}
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Clock className="w-4 h-4" /> Tipo
                </div>
                <div className="font-semibold text-gray-900 capitalize truncate">
                  {atendimento.tipo_atendimento?.replace(/_/g, ' ') || '-'}
                </div>
              </div>
            </div>

            {/* Participantes */}
            {atendimento.participantes && atendimento.participantes.length > 0 && (
              <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-500" />
                  <h3 className="font-semibold text-gray-800">Participantes ({atendimento.participantes.length})</h3>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {atendimento.participantes.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50/50 border border-gray-100 p-3 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">
                        {(p.nome || p.name || 'P')[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.nome || p.name}</p>
                        <p className="text-xs text-gray-500">{p.cargo || p.role || 'Sem cargo definido'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Pauta e Objetivos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {atendimento.pauta && atendimento.pauta.length > 0 && (
                <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-800">Pauta da Reunião</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {atendimento.pauta.map((p, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{p.titulo}</p>
                          {p.descricao && <p className="text-xs text-gray-500 mt-1">{p.descricao}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {atendimento.objetivos && atendimento.objetivos.length > 0 && (
                <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
                    <Target className="w-5 h-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-800">Objetivos</h3>
                  </div>
                  <div className="p-4 space-y-2">
                    {atendimento.objetivos.map((obj, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-gray-700">{obj}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Decisões, Ações e Próximos Passos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {atendimento.decisoes_tomadas && atendimento.decisoes_tomadas.length > 0 && (
                <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-gray-500" />
                    <h3 className="font-semibold text-gray-800 text-sm">Decisões Tomadas</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {atendimento.decisoes_tomadas.map((d, i) => (
                      <div key={i} className="text-sm border-l-2 border-amber-400 pl-3 py-1">
                        <p className="font-medium text-gray-800">{d.decisao}</p>
                        <p className="text-xs text-gray-500 mt-1">Resp: {d.responsavel || '-'} • Prazo: {d.prazo || '-'}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {atendimento.acoes_geradas && atendimento.acoes_geradas.length > 0 && (
                <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
                    <CheckSquare2 className="w-4 h-4 text-gray-500" />
                    <h3 className="font-semibold text-gray-800 text-sm">Ações Geradas</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {atendimento.acoes_geradas.map((a, i) => (
                      <div key={i} className="text-sm border-l-2 border-blue-400 pl-3 py-1">
                        <p className="font-medium text-gray-800">{a.acao}</p>
                        <p className="text-xs text-gray-500 mt-1">Resp: {a.responsavel || '-'} • Prazo: {a.prazo || '-'}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {atendimento.proximos_passos_list && atendimento.proximos_passos_list.length > 0 && (
                <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                    <h3 className="font-semibold text-gray-800 text-sm">Próximos Passos</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {atendimento.proximos_passos_list.map((p, i) => (
                      <div key={i} className="text-sm border-l-2 border-green-400 pl-3 py-1">
                        <p className="font-medium text-gray-800">{p.descricao}</p>
                        <p className="text-xs text-gray-500 mt-1">Resp: {p.responsavel || '-'} • Prazo: {p.prazo || '-'}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Observações Gerais */}
            {atendimento.observacoes_consultor && (
              <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <h3 className="font-semibold text-gray-800">Observações do Consultor</h3>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{atendimento.observacoes_consultor}</p>
                </div>
              </section>
            )}

            {(!atendimento.participantes?.length && !atendimento.pauta?.length && !atendimento.objetivos?.length && !atendimento.observacoes_consultor) && (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Atendimento sem detalhes preenchidos</p>
              </div>
            )}
            
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}