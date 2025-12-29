import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Upload, Loader2, Trash2, Calendar, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ImplementationTab({ processId, workshopId }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = React.useState(false);

  const { data: implementation, isLoading } = useQuery({
    queryKey: ['implementation', processId],
    queryFn: async () => {
      const impls = await base44.entities.ProcessImplementation.filter({ process_id: processId });
      return impls[0] || null;
    },
    enabled: !!processId
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (implementation?.id) {
        return await base44.entities.ProcessImplementation.update(implementation.id, data);
      } else {
        return await base44.entities.ProcessImplementation.create({
          process_id: processId,
          workshop_id: workshopId,
          ...data
        });
      }
    },
    onSuccess: () => {
      toast.success("Implementação atualizada!");
      queryClient.invalidateQueries(['implementation', processId]);
    }
  });

  const handleChecklistChange = (field, value) => {
    const newChecklist = { ...implementation?.checklist, [field]: value };
    const totalItems = 4;
    const completedItems = Object.values(newChecklist).filter(Boolean).length;
    const percentage = Math.round((completedItems / totalItems) * 100);

    saveMutation.mutate({
      checklist: newChecklist,
      completion_percentage: percentage
    });
  };

  const handleEvidenceUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const newEvidence = {
        type,
        title: file.name,
        file_url,
        uploaded_at: new Date().toISOString(),
        uploaded_by: (await base44.auth.me()).full_name
      };

      const updatedEvidences = [...(implementation?.evidences || []), newEvidence];
      await saveMutation.mutateAsync({
        evidences: updatedEvidences,
        checklist: { ...implementation?.checklist, evidencias_anexadas: true }
      });
      toast.success("Evidência enviada!");
    } catch (error) {
      toast.error("Erro ao enviar evidência");
    } finally {
      setUploading(false);
    }
  };

  const removeEvidence = (index) => {
    const updatedEvidences = [...(implementation?.evidences || [])];
    updatedEvidences.splice(index, 1);
    saveMutation.mutate({ evidences: updatedEvidences });
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  const checklist = implementation?.checklist || {
    treinamento_realizado: false,
    comunicacao_interna: false,
    processo_em_uso: false,
    evidencias_anexadas: false
  };

  const percentage = implementation?.completion_percentage || 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            Status da Implementação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <Label>Progresso Geral</Label>
              <span className="text-sm font-semibold text-blue-600">{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div>
              <Label>Responsável</Label>
              <Input
                value={implementation?.responsible_name || ""}
                onChange={(e) => saveMutation.mutate({ responsible_name: e.target.value })}
                placeholder="Nome do responsável"
              />
            </div>
            <div>
              <Label>Data de Início</Label>
              <Input
                type="date"
                value={implementation?.start_date || ""}
                onChange={(e) => saveMutation.mutate({ start_date: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Checklist de Implementação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: 'treinamento_realizado', label: 'Treinamento realizado com a equipe' },
            { key: 'comunicacao_interna', label: 'Comunicação interna feita' },
            { key: 'processo_em_uso', label: 'Processo está em uso no dia a dia' },
            { key: 'evidencias_anexadas', label: 'Evidências documentadas' }
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center space-x-2">
              <Checkbox
                id={key}
                checked={checklist[key]}
                onCheckedChange={(checked) => handleChecklistChange(key, checked)}
              />
              <label htmlFor={key} className="text-sm cursor-pointer">{label}</label>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Evidências da Implementação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { type: 'lista_presenca', label: 'Lista de Presença' },
              { type: 'ata_treinamento', label: 'Ata de Treinamento' },
              { type: 'registro_operacional', label: 'Registro Operacional' },
              { type: 'foto', label: 'Fotos/Prints' }
            ].map(({ type, label }) => (
              <div key={type}>
                <Label htmlFor={`upload-${type}`} className="cursor-pointer">
                  <div className="border-2 border-dashed rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50 transition-colors text-center">
                    <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                    <span className="text-sm text-gray-700">{label}</span>
                  </div>
                </Label>
                <Input
                  id={`upload-${type}`}
                  type="file"
                  className="hidden"
                  onChange={(e) => handleEvidenceUpload(e, type)}
                  disabled={uploading}
                />
              </div>
            ))}
          </div>

          {implementation?.evidences?.length > 0 && (
            <div className="mt-6 space-y-2">
              <h4 className="font-semibold text-sm text-gray-900">Evidências Anexadas</h4>
              {implementation.evidences.map((evidence, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">{evidence.title}</p>
                    <p className="text-xs text-gray-500">
                      {evidence.type.replace(/_/g, ' ')} • {new Date(evidence.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => window.open(evidence.file_url, '_blank')}>
                      Ver
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeEvidence(idx)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}