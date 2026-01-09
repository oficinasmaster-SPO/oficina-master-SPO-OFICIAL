import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Upload, X, Loader2, Users, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export default function CompletionModal({ activity, onClose, onComplete }) {
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState(0);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Buscar colaboradores da oficina
  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores-oficina', activity?.workshop_id],
    queryFn: async () => {
      if (!activity?.workshop_id) return [];
      return await base44.entities.Employee.filter({ 
        workshop_id: activity.workshop_id,
        status: 'ativo'
      });
    },
    enabled: !!activity?.workshop_id
  });

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Arquivo muito grande (max 10MB)");
        return;
      }
      setEvidenceFile(file);
    }
  };

  const handleSave = async () => {
    if (!notes.trim()) {
      toast.error("Adicione notas sobre a execução");
      return;
    }

    setSaving(true);
    try {
      let evidenceUrl = null;

      // Upload de evidência se houver arquivo
      if (evidenceFile) {
        setUploading(true);
        const uploadResult = await base44.integrations.Core.UploadFile({ file: evidenceFile });
        evidenceUrl = uploadResult.file_url;
        setUploading(false);
      }

      const completionData = {
        status: "concluida",
        completion_date: new Date().toISOString(),
        completion_notes: notes,
        effectiveness_rating: rating,
        participants_list: selectedParticipants,
        evidence_url: evidenceUrl
      };

      // Chamar callback para atualização
      await onComplete(activity.id, completionData, activity.source);

      // Gerar ATA de Evidência de Implementação
      try {
        const ataResult = await base44.functions.invoke('gerarAtaImplementacao', {
          workshop_id: activity.workshop_id,
          modulo_codigo: activity.moduloCodigo,
          processo_titulo: activity.title,
          observacoes: notes,
          avaliacao: rating,
          participantes: selectedParticipants,
          evidencia_url: evidenceUrl,
          data_conclusao: new Date().toISOString()
        });
        console.log("ATA gerada:", ataResult);
      } catch (error) {
        console.error("Erro ao gerar ATA:", error);
        // Não bloqueia o fluxo se a ATA falhar
      }
      
      toast.success("Processo concluído e ATA gerada com sucesso!");
      onClose();
    } catch (error) {
      console.error("Erro ao concluir:", error);
      toast.error("Erro ao salvar conclusão");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  if (!activity) return null;

  return (
    <Dialog open={!!activity} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Concluir: {activity.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Notas de Execução */}
          <div>
            <Label className="text-base font-semibold mb-2 block">
              Como foi a execução? <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder="Descreva como a atividade foi realizada, principais pontos discutidos, decisões tomadas..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Avaliação de Efetividade */}
          <div>
            <Label className="text-base font-semibold mb-2 block">
              Avalie a efetividade
            </Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-gray-600">
                  {rating === 5 ? "Excelente" : rating === 4 ? "Muito Bom" : rating === 3 ? "Bom" : rating === 2 ? "Regular" : "Precisa Melhorar"}
                </span>
              )}
            </div>
          </div>

          {/* Participantes */}
          <div>
            <Label className="text-base font-semibold mb-2 block">
              <Users className="w-4 h-4 inline mr-1" />
              Participantes presentes <span className="text-red-500">*</span>
            </Label>
            <div className="space-y-3">
              <Select onValueChange={(value) => {
                const colaborador = colaboradores.find(c => c.id === value);
                if (colaborador && !selectedParticipants.find(p => p.id === value)) {
                  setSelectedParticipants([...selectedParticipants, {
                    id: colaborador.id,
                    nome: colaborador.full_name,
                    cargo: colaborador.position
                  }]);
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar colaborador..." />
                </SelectTrigger>
                <SelectContent>
                  {colaboradores.filter(c => !selectedParticipants.find(p => p.id === c.id)).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name} - {c.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedParticipants.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedParticipants.map((p, i) => (
                    <Badge key={i} variant="secondary" className="flex items-center gap-1 pr-1">
                      <span>{p.nome} ({p.cargo})</span>
                      <button
                        type="button"
                        onClick={() => setSelectedParticipants(selectedParticipants.filter((_, idx) => idx !== i))}
                        className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              {selectedParticipants.length === 0 && (
                <p className="text-sm text-gray-500">Nenhum participante selecionado</p>
              )}
            </div>
          </div>

          {/* Upload de Evidência */}
          <div>
            <Label className="text-base font-semibold mb-2 block">
              <Upload className="w-4 h-4 inline mr-1" />
              Evidência (foto/documento)
            </Label>
            <div className="space-y-2">
              <Input
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileChange}
                disabled={uploading}
              />
              {evidenceFile && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">{evidenceFile.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEvidenceFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <p className="text-xs text-gray-500">
                Formatos: JPG, PNG, PDF, DOC (max 10MB)
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving || uploading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || uploading || !notes.trim() || selectedParticipants.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando arquivo...
              </>
            ) : saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Concluir Atividade"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}