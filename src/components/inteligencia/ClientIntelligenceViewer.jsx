import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { AlertCircle, Calendar, User, TrendingDown, Repeat2, FileText, Zap, Clock, CheckCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import ClientIntelligenceEvolutionForm from "./ClientIntelligenceEvolutionForm";
import ClientIntelligenceChecklistSection from "./ClientIntelligenceChecklistSection";

export default function ClientIntelligenceViewer({ open, onOpenChange, item, workshopId }) {
  const [fullData, setFullData] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [evolutionFormOpen, setEvolutionFormOpen] = useState(false);

  useEffect(() => {
    if (open && item?.id) {
      loadData();
    }
  }, [open, item?.id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Carregar dados completos da inteligência
      const completeData = await base44.entities.ClientIntelligence.get(item.id);
      setFullData(completeData);

      // Buscar histórico de inteligências similares
      if ((workshopId || item.workshop_id) && item) {
        const historyData = await base44.entities.ClientIntelligence.filter({
          workshop_id: workshopId || item.workshop_id,
          area: item.area,
          subcategory: item.subcategory,
        }, '-created_date', 50);
        
        setHistory(historyData || []);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados detalhados");
      setFullData(item);
    } finally {
      setIsLoading(false);
    }
  };

  if (!item) return null;
  const displayData = fullData || item;

  const gravityColors = {
    baixa: "bg-green-100 text-green-900 border-green-300",
    media: "bg-yellow-100 text-yellow-900 border-yellow-300",
    alta: "bg-orange-100 text-orange-900 border-orange-300",
    critica: "bg-red-100 text-red-900 border-red-300"
  };

  const frequencyLabel = {
    pontual: "Pontual",
    semanal: "Semanal",
    mensal: "Mensal",
    diaria: "Diária",
    recorrente: "Recorrente"
  };

  const statusLabel = {
    ativo: "Ativo",
    em_progresso: "Em Progresso",
    resolvido: "Resolvido",
    arquivado: "Arquivado"
  };

  const gravityLabel = {
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
    critica: "Crítica"
  };

  const renderIntelligenceDetails = (intel) => (
    <div className="space-y-6">
      {/* Grid de Informações Principais */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Classificação</span>
          </div>
          <p className="font-medium text-gray-900 mt-1">{intel.type || 'N/A'}</p>
        </div>

        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Repeat2 className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Frequência</span>
          </div>
          <p className="font-medium text-gray-900 mt-1">{frequencyLabel[intel.frequency] || 'N/A'}</p>
        </div>
      </div>

      {/* Descrição Detalhada */}
      {intel.description && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-gray-700" />
            <h4 className="font-semibold text-gray-900">Descrição Detalhada</h4>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{intel.description}</p>
          </div>
        </div>
      )}

      {/* Impacto */}
      {intel.impact && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <h4 className="font-semibold text-gray-900">Impacto Quantitativo</h4>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-red-900">{intel.impact}</p>
          </div>
        </div>
      )}

      {/* Responsáveis e Causas - lado a lado se os dois existirem */}
      {(intel.metadata?.responsibles || (intel.tags && intel.tags.length > 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {intel.metadata?.responsibles && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-purple-600" />
                <h4 className="font-semibold text-gray-900">Responsáveis</h4>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <p className="text-sm text-purple-900">{intel.metadata.responsibles}</p>
              </div>
            </div>
          )}

          {intel.tags && intel.tags.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-gray-700" />
                <h4 className="font-semibold text-gray-900">Possíveis Causas</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {intel.tags.map((cause) => (
                  <Badge key={cause} variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 shadow-none font-medium">
                    {cause}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Checklist */}
      {intel.area && intel.type && (
        <div className="mt-2">
          <ClientIntelligenceChecklistSection
            intelligenceId={intel.id}
            area={intel.area}
            type={intel.type}
            workshopId={workshopId || intel.workshop_id}
            onChecklistUpdated={() => {}}
          />
        </div>
      )}

      {/* Soluções Já Tentadas */}
      {intel.action_description && (
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Soluções Já Tentadas</h4>
          <div className="bg-green-50/60 border border-green-200 rounded-xl p-4">
            <p className="text-sm text-green-900 whitespace-pre-wrap">{intel.action_description}</p>
          </div>
        </div>
      )}

      {/* Prazo Desejado */}
      {intel.resolution_date && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-teal-600" />
            <h4 className="font-semibold text-gray-900">Prazo Desejado</h4>
          </div>
          <div className="bg-teal-50/50 border border-teal-200 rounded-xl p-4 max-w-sm">
            <p className="text-sm font-medium text-teal-900">
              {(() => { try { const d = parseISO(intel.resolution_date); return isNaN(d.getTime()) ? intel.resolution_date : format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }); } catch { return intel.resolution_date; } })()}
            </p>
          </div>
        </div>
      )}

      {/* Status */}
      <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</span>
        <div className="mt-2">
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-transparent shadow-none font-medium px-3 py-1">
            {statusLabel[intel.status] || 'Ativo'}
          </Badge>
        </div>
      </div>

      {/* Evoluções Registradas */}
      {intel.metadata?.evolution && (
        <div className="border-l-[3px] border-green-400 pl-4 mt-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <h4 className="font-semibold text-gray-900">Evolução Registrada</h4>
          </div>
          <div className="space-y-4 text-sm bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            {intel.metadata.evolution.impactBefore && (
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Impacto Antes</span>
                <p className="text-gray-800 mt-1">{intel.metadata.evolution.impactBefore}</p>
              </div>
            )}
            {intel.metadata.evolution.impactAfter && (
              <div>
                <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">Impacto Depois (Resultado)</span>
                <p className="text-gray-800 mt-1">{intel.metadata.evolution.impactAfter}</p>
              </div>
            )}
            {intel.metadata.evolution.learnings && (
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lições Aprendidas</span>
                <p className="text-gray-800 mt-1">{intel.metadata.evolution.learnings}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const historySimilar = history.filter(h => h.id !== item.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-full max-w-[800px] max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200 shrink-0 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-100">
              <AlertCircle className="w-5 h-5 text-indigo-600" />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900 m-0">
              Detalhes da Inteligência do Cliente
            </DialogTitle>
          </div>
          <div className="flex items-center gap-3 pr-8">
            <Button
              type="button"
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              onClick={() => setEvolutionFormOpen(true)}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Registrar Evolução
            </Button>
          </div>
        </div>

        <Tabs defaultValue="current" className="flex-1 overflow-hidden flex flex-col pt-4">
          <div className="flex items-center px-6 pb-2">
            <TabsList className="grid grid-cols-2 bg-gray-100/70 p-1">
              <TabsTrigger value="current" className="rounded-md">Captura Atual</TabsTrigger>
              <TabsTrigger value="history" className="rounded-md">
                Histórico ({historySimilar.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="current" className="p-6 space-y-6">
              {renderIntelligenceDetails(displayData)}
            </TabsContent>

            <TabsContent value="history" className="p-6">
              {historySimilar.length > 0 ? (
                <div className="space-y-6">
                  {historySimilar.map((hist, idx) => (
                    <div key={hist.id} className="border-l-4 border-gray-300 pl-6 py-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-semibold text-gray-600">
                          Registrado em {(() => { try { const d = parseISO(hist.created_date); return isNaN(d.getTime()) ? hist.created_date : format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }); } catch { return hist.created_date; } })()}
                        </span>
                      </div>
                      {renderIntelligenceDetails(hist)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">Nenhum histórico de problemas similares encontrado</p>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <ClientIntelligenceEvolutionForm
          open={evolutionFormOpen}
          onOpenChange={setEvolutionFormOpen}
          intelligenceId={item?.id}
          onSuccess={() => {
            setEvolutionFormOpen(false);
            loadData();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}