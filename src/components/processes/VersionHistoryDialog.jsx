import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, GitBranch, AlertCircle } from "lucide-react";

export default function VersionHistoryDialog({ open, onClose, versionHistory, onAddVersion, currentRevision }) {
  const [formData, setFormData] = React.useState({
    reason: "",
    origin: "melhoria_continua",
    expected_impact: ""
  });

  const handleSubmit = () => {
    if (!formData.reason.trim()) {
      alert("Por favor, informe o motivo da alteração");
      return;
    }
    
    // Incrementar versão automaticamente
    const nextRevision = String(parseInt(currentRevision || "1") + 1);
    
    onAddVersion({
      ...formData,
      revision: nextRevision
    });
    
    setFormData({ reason: "", origin: "melhoria_continua", expected_impact: "" });
  };

  const getOriginColor = (origin) => {
    const colors = {
      'auditoria': 'bg-orange-100 text-orange-800',
      'indicador': 'bg-blue-100 text-blue-800',
      'nao_conformidade': 'bg-red-100 text-red-800',
      'melhoria_continua': 'bg-green-100 text-green-800',
      'outro': 'bg-gray-100 text-gray-800'
    };
    return colors[origin] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Histórico de Versões
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="border rounded-lg p-4 bg-blue-50">
            <h4 className="font-semibold mb-3">Registrar Nova Versão</h4>
            <p className="text-sm text-gray-600 mb-3">
              Nova versão será: <strong className="text-blue-700">v{String(parseInt(currentRevision || "1") + 1)}</strong>
            </p>
            <div className="space-y-3">
              <div>
                <Label>Motivo da Alteração *</Label>
                <Textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Descreva o que foi alterado e por quê..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Origem da Mudança</Label>
                  <Select value={formData.origin} onValueChange={(v) => setFormData({ ...formData, origin: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auditoria">Auditoria</SelectItem>
                      <SelectItem value="indicador">Indicador/KPI</SelectItem>
                      <SelectItem value="nao_conformidade">Não Conformidade</SelectItem>
                      <SelectItem value="melhoria_continua">Melhoria Contínua</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Impacto Esperado</Label>
                  <Input
                    value={formData.expected_impact}
                    onChange={(e) => setFormData({ ...formData, expected_impact: e.target.value })}
                    placeholder="Ex: Redução de 20% no tempo"
                  />
                </div>
              </div>
              <Button onClick={handleSubmit} className="w-full bg-blue-600 hover:bg-blue-700">
                Criar Nova Versão e Editar Documento
              </Button>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Histórico de Versões</h4>
            {!versionHistory || versionHistory.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Nenhuma versão registrada</p>
            ) : (
              <div className="space-y-2">
                {versionHistory.slice().reverse().map((version, idx) => {
                  const [expanded, setExpanded] = React.useState(false);
                  
                  return (
                    <div key={idx} className="border rounded-lg overflow-hidden hover:shadow-sm transition-shadow">
                      <button
                        onClick={() => setExpanded(!expanded)}
                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 text-left"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Badge variant="outline" className="font-mono">v{version.revision}</Badge>
                          {version.origin && (
                            <Badge className={getOriginColor(version.origin)} variant="outline">
                              {version.origin.replace(/_/g, ' ')}
                            </Badge>
                          )}
                          <span className="text-sm text-gray-700 truncate flex-1">
                            {version.changes || version.reason || 'Sem descrição'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {new Date(version.date).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="text-xs text-gray-400">
                            {expanded ? '▼' : '▶'}
                          </span>
                        </div>
                      </button>
                      
                      {expanded && (
                        <div className="px-4 pb-3 bg-gray-50 border-t space-y-2">
                          {version.changes && (
                            <div>
                              <p className="text-xs font-semibold text-gray-700">Alteração:</p>
                              <p className="text-sm text-gray-600">{version.changes}</p>
                            </div>
                          )}
                          {version.reason && (
                            <div>
                              <p className="text-xs font-semibold text-gray-700">Motivo:</p>
                              <p className="text-sm text-gray-600">{version.reason}</p>
                            </div>
                          )}
                          {version.expected_impact && (
                            <div>
                              <p className="text-xs font-semibold text-gray-700">Impacto Esperado:</p>
                              <p className="text-sm text-gray-600">{version.expected_impact}</p>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
                            <span>👤 {version.changed_by}</span>
                            <span>•</span>
                            <span>🕐 {new Date(version.date).toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}