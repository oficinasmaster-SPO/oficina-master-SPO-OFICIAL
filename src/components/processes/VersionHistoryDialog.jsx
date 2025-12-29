import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, GitBranch, AlertCircle } from "lucide-react";

export default function VersionHistoryDialog({ open, onClose, versionHistory, onAddVersion }) {
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
    onAddVersion(formData);
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
                Adicionar ao Histórico
              </Button>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Histórico</h4>
            {!versionHistory || versionHistory.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Nenhuma versão registrada</p>
            ) : (
              <div className="space-y-3">
                {versionHistory.map((version, idx) => (
                  <div key={idx} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">v{version.revision}</Badge>
                        {version.origin && (
                          <Badge className={getOriginColor(version.origin)} variant="outline">
                            {version.origin.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(version.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-1">
                      <strong>Alteração:</strong> {version.changes}
                    </p>
                    {version.reason && (
                      <p className="text-sm text-gray-600">
                        <strong>Motivo:</strong> {version.reason}
                      </p>
                    )}
                    {version.expected_impact && (
                      <p className="text-sm text-gray-600">
                        <strong>Impacto:</strong> {version.expected_impact}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Por: {version.changed_by}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}