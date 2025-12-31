import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Target, Activity, AlertTriangle, TrendingUp, Image } from "lucide-react";

export default function MAPViewerDialog({ map, open, onClose }) {
  if (!map) return null;

  const content = map.content_json || {};

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            {map.title}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">{map.code}</Badge>
            <Badge className="bg-purple-100 text-purple-800">
              {map.operational_status}
            </Badge>
            <Badge variant="secondary">Rev. {map.revision}</Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="basics" className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basics">
              <Target className="w-4 h-4 mr-1" />
              Básico
            </TabsTrigger>
            <TabsTrigger value="activities">
              <Activity className="w-4 h-4 mr-1" />
              Atividades
            </TabsTrigger>
            <TabsTrigger value="risks">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Riscos
            </TabsTrigger>
            <TabsTrigger value="indicators">
              <TrendingUp className="w-4 h-4 mr-1" />
              Indicadores
            </TabsTrigger>
            <TabsTrigger value="flow">
              <Image className="w-4 h-4 mr-1" />
              Fluxo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basics" className="space-y-4 mt-4">
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-2">Descrição</h4>
              <p className="text-sm text-gray-600">{map.description}</p>
            </div>
            {content.objetivo && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Objetivo</h4>
                <p className="text-sm text-gray-600">{content.objetivo}</p>
              </div>
            )}
            {content.campo_aplicacao && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Campo de Aplicação</h4>
                <p className="text-sm text-gray-600">{content.campo_aplicacao}</p>
              </div>
            )}
            {content.informacoes_complementares && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Informações Complementares</h4>
                <p className="text-sm text-gray-600">{content.informacoes_complementares}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activities" className="mt-4">
            {content.atividades && content.atividades.length > 0 ? (
              <div className="space-y-3">
                {content.atividades.map((atv, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg border">
                    <h5 className="font-semibold text-sm text-gray-900">{atv.atividade}</h5>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                      <div>
                        <span className="text-gray-500">Responsável:</span>
                        <span className="ml-1 text-gray-700">{atv.responsavel}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Ferramentas:</span>
                        <span className="ml-1 text-gray-700">{atv.ferramentas}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                Nenhuma atividade cadastrada
              </p>
            )}
          </TabsContent>

          <TabsContent value="risks" className="mt-4">
            {content.matriz_riscos && content.matriz_riscos.length > 0 ? (
              <div className="space-y-3">
                {content.matriz_riscos.map((risco, idx) => (
                  <div key={idx} className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <h5 className="font-semibold text-sm text-red-900">{risco.identificacao}</h5>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                      <div>
                        <span className="text-gray-600">Categoria:</span>
                        <span className="ml-1 text-gray-800">{risco.categoria}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Impacto:</span>
                        <span className="ml-1 text-gray-800">{risco.impacto}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-600">Controle:</span>
                        <span className="ml-1 text-gray-800">{risco.controle}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                Nenhum risco cadastrado
              </p>
            )}
          </TabsContent>

          <TabsContent value="indicators" className="mt-4">
            {content.indicadores && content.indicadores.length > 0 ? (
              <div className="space-y-3">
                {content.indicadores.map((ind, idx) => (
                  <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h5 className="font-semibold text-sm text-blue-900">{ind.indicador}</h5>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                      <div>
                        <span className="text-gray-600">Meta:</span>
                        <span className="ml-1 text-gray-800">{ind.meta}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Como Medir:</span>
                        <span className="ml-1 text-gray-800">{ind.como_medir}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                Nenhum indicador cadastrado
              </p>
            )}
          </TabsContent>

          <TabsContent value="flow" className="mt-4">
            {content.fluxo_descricao && (
              <div className="mb-4">
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Descrição do Fluxo</h4>
                <p className="text-sm text-gray-600">{content.fluxo_descricao}</p>
              </div>
            )}
            {content.fluxo_image_url ? (
              <div className="border rounded-lg p-4 bg-gray-50">
                <img 
                  src={content.fluxo_image_url} 
                  alt="Fluxograma" 
                  className="w-full h-auto rounded"
                />
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                Nenhum fluxograma cadastrado
              </p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}