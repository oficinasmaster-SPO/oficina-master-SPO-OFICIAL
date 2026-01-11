import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { AlertCircle, Calendar, User, TrendingDown, Repeat2, FileText, Zap, Clock, CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import ClientIntelligenceEvolutionForm from "./ClientIntelligenceEvolutionForm";

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
      if (workshopId && item) {
        const historyData = await base44.entities.ClientIntelligence.filter({
          workshop_id: workshopId,
          area: item.area,
          subcategory: item.subcategory,
        });
        
        setHistory(historyData || []);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
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

  const renderIntelligenceDetails = (intel) => (
    <div className="space-y-6">
      {/* Cabeçalho com Classificação */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-indigo-600 p-4 rounded-lg">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{intel.area || intel.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{intel.description}</p>
          </div>
          <Badge className={`${gravityColors[intel.gravity || 'media']} border`}>
            {({ baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica' }[intel.gravity] || 'Média')}
          </Badge>
        </div>
      </div>

      {/* Grid de Informações Principais */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase">Classificação</span>
          </div>
          <p className="font-semibold text-gray-900">{intel.type || 'N/A'}</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Repeat2 className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase">Frequência</span>
          </div>
          <p className="font-semibold text-gray-900">{frequencyLabel[intel.frequency] || 'N/A'}</p>
        </div>
      </div>

      {/* Descrição Detalhada */}
      {intel.description && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-gray-700" />
            <h4 className="font-semibold text-gray-900">Descrição Detalhada</h4>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{intel.description}</p>
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-red-900">{intel.impact}</p>
          </div>
        </div>
      )}

      {/* Possíveis Causas */}
      {intel.tags && intel.tags.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Possíveis Causas</h4>
          <div className="flex flex-wrap gap-2">
            {intel.tags.map((cause) => (
              <Badge key={cause} variant="outline" className="bg-blue-50 text-blue-800 border-blue-300">
                {cause}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Soluções Já Tentadas */}
      {intel.action_description && (
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Soluções Já Tentadas</h4>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-900 whitespace-pre-wrap">{intel.action_description}</p>
          </div>
        </div>
      )}

      {/* Responsáveis e Prazo */}
      <div className="grid grid-cols-2 gap-4">
        {intel.metadata?.responsibles && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-purple-600" />
              <h4 className="font-semibold text-gray-900">Responsáveis</h4>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-sm text-purple-900">{intel.metadata.responsibles}</p>
            </div>
          </div>
        )}

        {intel.resolution_date && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-teal-600" />
              <h4 className="font-semibold text-gray-900">Prazo Desejado</h4>
            </div>
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-teal-900">
                {format(parseISO(intel.resolution_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Status */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <span className="text-xs font-semibold text-gray-600 uppercase">Status</span>
        <p className="font-semibold text-gray-900 mt-1">
          <Badge className="bg-blue-100 text-blue-900">
            {({ ativo: 'Ativo', em_progresso: 'Em Progresso', resolvido: 'Resolvido', arquivado: 'Arquivado' }[intel.status] || 'Ativo')}
          </Badge>
        </p>
      </div>

      {/* Evoluções Registradas */}
      {intel.metadata?.evolution && (
        <div className="border-l-4 border-green-400 pl-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <h4 className="font-semibold text-gray-900">Evolução Registrada</h4>
          </div>
          <div className="space-y-3 text-sm">
            {intel.metadata.evolution.impactBefore && (
              <div>
                <span className="font-semibold text-gray-700">Impacto Antes:</span>
                <p className="text-gray-600">{intel.metadata.evolution.impactBefore}</p>
              </div>
            )}
            {intel.metadata.evolution.impactAfter && (
              <div>
                <span className="font-semibold text-green-700">Impacto Depois:</span>
                <p className="text-green-600">{intel.metadata.evolution.impactAfter}</p>
              </div>
            )}
            {intel.metadata.evolution.learnings && (
              <div>
                <span className="font-semibold text-gray-700">Lições Aprendidas:</span>
                <p className="text-gray-600">{intel.metadata.evolution.learnings}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const historySimilar = history.filter(h => h.id !== item.id && h.status !== 'ativo');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-indigo-600" />
            Detalhes da Inteligência do Cliente
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="current" className="flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between border-b">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="current">Captura Atual</TabsTrigger>
              <TabsTrigger value="history">
                Histórico ({historySimilar.length})
              </TabsTrigger>
            </TabsList>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEvolutionFormOpen(true)}
              className="mr-4"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
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
                          Registrado em {format(parseISO(hist.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
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
      </DialogContent>
    </Dialog>
  );
}