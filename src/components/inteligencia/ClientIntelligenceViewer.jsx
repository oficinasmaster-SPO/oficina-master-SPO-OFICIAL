import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { AlertCircle, Calendar, User, TrendingDown, Repeat2, FileText, Zap, Clock, CheckCircle2 } from "lucide-react";
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
    <div className="space-y-8">
      {/* Informações Principais */}
      <div>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-gray-900">{intel.area || intel.title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${gravityColors[intel.gravity || 'media']} font-medium`}>
              {gravityLabel[intel.gravity] || 'Média'}
            </Badge>
            <Badge variant="secondary" className="font-medium">
              {statusLabel[intel.status] || 'Ativo'}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-4 rounded-xl bg-gray-50/50 border border-gray-100">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">Classificação</span>
            <span className="text-sm text-gray-900 font-medium">{intel.type || 'N/A'}</span>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">Frequência</span>
            <span className="text-sm text-gray-900 font-medium">{frequencyLabel[intel.frequency] || 'N/A'}</span>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">Prazo Desejado</span>
            <span className="text-sm text-gray-900 font-medium">
              {intel.resolution_date ? (() => { try { const d = parseISO(intel.resolution_date); return isNaN(d.getTime()) ? intel.resolution_date : format(d, "dd/MM/yyyy", { locale: ptBR }); } catch { return intel.resolution_date; } })() : 'Não definido'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid de detalhes extras */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* Descrição Detalhada */}
          {intel.description && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                Descrição Detalhada
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed bg-white p-4 rounded-xl border border-gray-200 shadow-sm whitespace-pre-wrap">{intel.description}</p>
            </div>
          )}

          {/* Soluções Já Tentadas */}
          {intel.action_description && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-gray-500" />
                Soluções Já Tentadas
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed bg-white p-4 rounded-xl border border-gray-200 shadow-sm whitespace-pre-wrap">{intel.action_description}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Impacto */}
          {intel.impact && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-gray-500" />
                Impacto Quantitativo
              </h4>
              <p className="text-sm text-gray-700 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">{intel.impact}</p>
            </div>
          )}

          {/* Responsáveis */}
          {intel.metadata?.responsibles && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                Responsáveis
              </h4>
              <p className="text-sm text-gray-700 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">{intel.metadata.responsibles}</p>
            </div>
          )}
          
          {/* Possíveis Causas */}
          {intel.tags && intel.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-gray-500" />
                Possíveis Causas
              </h4>
              <div className="flex flex-wrap gap-2">
                {intel.tags.map((cause) => (
                  <Badge key={cause} variant="secondary" className="bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200 px-3 py-1">
                    {cause}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Checklist */}
      {intel.area && intel.type && (
        <div className="pt-6 border-t border-gray-100">
          <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-gray-500" />
            Checklist de Acompanhamento
          </h4>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-2">
            <ClientIntelligenceChecklistSection
              intelligenceId={intel.id}
              area={intel.area}
              type={intel.type}
              workshopId={workshopId || intel.workshop_id}
              onChecklistUpdated={() => {}}
            />
          </div>
        </div>
      )}

      {/* Evoluções Registradas */}
      {intel.metadata?.evolution && (
        <div className="pt-6 border-t border-gray-100">
          <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-gray-500" />
            Evolução Registrada
          </h4>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-5 text-sm">
            {intel.metadata.evolution.impactBefore && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">Impacto Antes</span>
                <p className="text-gray-900">{intel.metadata.evolution.impactBefore}</p>
              </div>
            )}
            {intel.metadata.evolution.impactAfter && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">Impacto Depois (Resultado)</span>
                <p className="text-gray-900">{intel.metadata.evolution.impactAfter}</p>
              </div>
            )}
            {intel.metadata.evolution.learnings && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">Lições Aprendidas</span>
                <p className="text-gray-900">{intel.metadata.evolution.learnings}</p>
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
        className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 py-4 border-b border-gray-100">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertCircle className="w-5 h-5 text-indigo-600" />
            Detalhes da Inteligência do Cliente
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="current" className="flex-1 overflow-hidden flex flex-col pt-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 pb-2">
            <TabsList className="w-full sm:w-auto grid grid-cols-2 bg-gray-100/50 p-1">
              <TabsTrigger value="current" className="rounded-md">Captura Atual</TabsTrigger>
              <TabsTrigger value="history" className="rounded-md">
                Histórico ({historySimilar.length})
              </TabsTrigger>
            </TabsList>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto shadow-sm border-gray-200"
              onClick={() => setEvolutionFormOpen(true)}
            >
              <CheckCircle2 className="w-4 h-4 mr-2 text-gray-500" />
              Registrar Evolução
            </Button>
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