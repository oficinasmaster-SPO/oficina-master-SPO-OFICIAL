import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, Shield, CheckCircle, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function RitualMAPViewer({ mapId, onClose }) {
  const navigate = useNavigate();
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mapId) return;
    loadMAP();
  }, [mapId]);

  const loadMAP = async () => {
    try {
      const doc = await base44.entities.ProcessDocument.get(mapId);
      setMapData(doc);
    } catch (error) {
      console.error("Erro ao carregar MAP:", error);
      toast.error("Erro ao carregar documento");
    } finally {
      setLoading(false);
    }
  };

  if (!mapId) return null;

  if (loading) {
    return (
      <Dialog open={!!mapId} onOpenChange={onClose}>
        <DialogContent>
          <div className="text-center py-8">Carregando MAP...</div>
        </DialogContent>
      </Dialog>
    );
  }

  const content = mapData?.content_json || {};

  return (
    <Dialog open={!!mapId} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              {mapData?.title}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(createPageUrl(`VisualizarProcesso?id=${mapId}`))}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Ver Completo
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informações Gerais */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Código MAP</p>
              <p className="font-semibold text-gray-900">{mapData?.code}</p>
            </div>
            {content.duracao_estimada && (
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Duração Estimada
                </p>
                <p className="font-semibold text-gray-900">{content.duracao_estimada}</p>
              </div>
            )}
          </div>

          {/* Objetivo */}
          {content.objetivo && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Objetivo</h4>
              <p className="text-gray-700">{content.objetivo}</p>
            </div>
          )}

          {/* Passo a Passo */}
          {content.atividades && content.atividades.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Passo a Passo
              </h4>
              <div className="space-y-2">
                {content.atividades.map((ativ, index) => (
                  <div key={index} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                    <Badge variant="secondary" className="flex-shrink-0">
                      {ativ.ordem || index + 1}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-gray-900">{ativ.atividade}</p>
                      {ativ.responsavel && (
                        <p className="text-sm text-gray-600 mt-1">
                          Responsável: {ativ.responsavel}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EPIs Necessários */}
          {content.epis_necessarios && content.epis_necessarios.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-600" />
                EPIs Necessários
              </h4>
              <div className="flex flex-wrap gap-2">
                {content.epis_necessarios.map((epi, index) => (
                  <Badge key={index} variant="outline" className="px-3 py-1.5">
                    {epi.item || epi}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Riscos */}
          {content.matriz_riscos && content.matriz_riscos.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Riscos e Controles</h4>
              <div className="space-y-2">
                {content.matriz_riscos.map((risk, index) => (
                  <div key={index} className="p-3 border border-orange-200 bg-orange-50 rounded-lg">
                    <p className="font-medium text-orange-900">
                      ⚠️ {risk.identificacao}
                    </p>
                    {risk.controle && (
                      <p className="text-sm text-orange-800 mt-1">
                        <strong>Controle:</strong> {risk.controle}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}