import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { History, GitBranch, Eye, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MAPVersionHistory({ mapId }) {
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [compareVersion, setCompareVersion] = useState(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (mapId) {
      loadVersions();
    }
  }, [mapId]);

  const loadVersions = async () => {
    try {
      const map = await base44.entities.ProcessDocument.get(mapId);
      const versionHistory = map.version_history || [];
      setVersions(versionHistory);
    } catch (error) {
      console.error("Erro ao carregar versões:", error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = (v1, v2) => {
    setSelectedVersion(v1);
    setCompareVersion(v2);
    setIsCompareOpen(true);
  };

  const originLabels = {
    auditoria: { label: "Auditoria", color: "bg-yellow-100 text-yellow-800" },
    indicador: { label: "Indicador", color: "bg-blue-100 text-blue-800" },
    nao_conformidade: { label: "Não Conformidade", color: "bg-red-100 text-red-800" },
    melhoria_continua: { label: "Melhoria Contínua", color: "bg-green-100 text-green-800" },
    outro: { label: "Outro", color: "bg-gray-100 text-gray-800" }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          Carregando versões...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Versões ({versions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {versions.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {versions.map((version, idx) => {
                const originInfo = originLabels[version.origin] || originLabels.outro;
                return (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">Rev. {version.revision}</Badge>
                          <Badge className={originInfo.color}>{originInfo.label}</Badge>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{version.changes}</p>
                        {version.reason && (
                          <p className="text-xs text-gray-600 mt-1">
                            Motivo: {version.reason}
                          </p>
                        )}
                        {version.expected_impact && (
                          <p className="text-xs text-blue-600 mt-1">
                            Impacto: {version.expected_impact}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span>Por: {version.changed_by}</span>
                          <span>•</span>
                          <span>
                            {format(new Date(version.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                      {idx < versions.length - 1 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCompare(version, versions[idx + 1])}
                        >
                          <GitBranch className="w-3 h-3 mr-1" />
                          Comparar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              Nenhuma versão registrada
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Comparação */}
      <Dialog open={isCompareOpen} onOpenChange={setIsCompareOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              Comparação de Versões
            </DialogTitle>
          </DialogHeader>
          {selectedVersion && compareVersion && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Badge>Rev. {compareVersion.revision} (Anterior)</Badge>
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-3 text-sm">
                    <p className="font-medium mb-1">{compareVersion.changes}</p>
                    <p className="text-xs text-gray-600">{compareVersion.reason}</p>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-2">
                <Badge>Rev. {selectedVersion.revision} (Atual)</Badge>
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-3 text-sm">
                    <p className="font-medium mb-1">{selectedVersion.changes}</p>
                    <p className="text-xs text-gray-600">{selectedVersion.reason}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}