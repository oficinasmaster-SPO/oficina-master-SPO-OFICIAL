import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2, Upload, TrendingUp, FileText, Image, AlertCircle } from "lucide-react";

export default function UpdateProgressModal({ open, onClose, challenge, onSuccess }) {
  const [currentValue, setCurrentValue] = useState("");
  const [notes, setNotes] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      const isValid = isImage || isPdf;
      const isUnder10MB = file.size <= 10 * 1024 * 1024;
      
      if (!isValid) {
        toast.error(`${file.name}: Apenas imagens ou PDF`);
        return false;
      }
      if (!isUnder10MB) {
        toast.error(`${file.name}: Máx 10MB`);
        return false;
      }
      return true;
    });
    
    setEvidenceFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const valueNumber = parseFloat(currentValue);
    
    if (!currentValue || isNaN(valueNumber) || valueNumber < 0) {
      toast.error("Informe um valor válido para o progresso");
      return;
    }

    if (evidenceFiles.length === 0) {
      toast.error("Anexe pelo menos uma evidência");
      return;
    }

    setSaving(true);
    try {
      // Upload das evidências
      const uploadedUrls = [];
      for (const file of evidenceFiles) {
        const { data } = await base44.functions.invoke('uploadEvidence', { file });
        uploadedUrls.push(data.file_url);
      }

      // Buscar participant ou criar novo
      const participants = challenge.participants || [];
      const user = await base44.auth.me();
      
      const existingParticipant = participants.find(p => p.user_id === user.id);
      
      let updatedParticipants;
      if (existingParticipant) {
        // Atualizar existente
        updatedParticipants = participants.map(p => 
          p.user_id === user.id 
            ? {
                ...p,
                current_value: valueNumber,
                evidence_url: uploadedUrls[0],
                evidence_urls: uploadedUrls,
                evidence_notes: notes,
                last_update: new Date().toISOString()
              }
            : p
        );
      } else {
        // Adicionar novo
        updatedParticipants = [
          ...participants,
          {
            user_id: user.id,
            current_value: valueNumber,
            completed: valueNumber >= challenge.goal_value,
            evidence_url: uploadedUrls[0],
            evidence_urls: uploadedUrls,
            evidence_notes: notes,
            last_update: new Date().toISOString()
          }
        ];
      }

      // Atualizar challenge
      await base44.entities.Challenge.update(challenge.id, {
        participants: updatedParticipants
      });

      toast.success("Progresso atualizado com sucesso!");
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Erro ao atualizar progresso:", error);
      toast.error(`Erro: ${error?.message || 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  const progressPercentage = currentValue && challenge?.goal_value 
    ? Math.min((parseFloat(currentValue) / challenge.goal_value) * 100, 100).toFixed(1)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Atualizar Progresso do Desafio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info do Desafio */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">{challenge?.title}</h3>
            <p className="text-sm text-blue-800 mb-3">{challenge?.description}</p>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-600 text-white">
                Meta: {challenge?.goal_value}
              </Badge>
              <Badge className="bg-purple-600 text-white">
                Métrica: {challenge?.metric}
              </Badge>
            </div>
          </div>

          {/* Alerta */}
          <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-700 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-900">
              <p className="font-semibold mb-1">ℹ️ Importante</p>
              <p>O progresso será registrado e ficará pendente de aprovação pelo gestor. Anexe evidências claras.</p>
            </div>
          </div>

          {/* Campo de Valor Atual */}
          <div className="space-y-2">
            <Label className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Valor Atual Alcançado *
            </Label>
            <Input
              type="number"
              placeholder={`Ex: ${challenge?.goal_value ? (challenge.goal_value * 0.5).toFixed(0) : '50'}`}
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              className="text-lg"
              min="0"
              step="0.01"
            />
            {currentValue && (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-green-900">
                  Progresso: {progressPercentage}% da meta
                </span>
                {parseFloat(currentValue) >= challenge?.goal_value && (
                  <Badge className="bg-green-600 text-white">
                    ✓ Meta Atingida!
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Campo de Observações */}
          <div className="space-y-2">
            <Label className="text-base font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              Observações (Opcional)
            </Label>
            <Textarea
              placeholder="Descreva como o progresso foi alcançado, contexto, desafios enfrentados..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px]"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 text-right">
              {notes.length}/500 caracteres
            </p>
          </div>

          {/* Upload de Evidências */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Image className="w-4 h-4 text-green-600" />
              Evidências (Fotos ou PDF) *
            </Label>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept="image/*,.pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="progress-evidence-upload"
              />
              <label htmlFor="progress-evidence-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-1">
                  Clique para adicionar evidências
                </p>
                <p className="text-xs text-gray-500">
                  JPG, PNG, PDF (máx 10MB cada)
                </p>
              </label>
            </div>

            {/* Lista de Arquivos */}
            {evidenceFiles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Arquivos Selecionados ({evidenceFiles.length})
                </Label>
                {evidenceFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      {file.type.startsWith('image/') ? (
                        <Image className="w-5 h-5 text-blue-600" />
                      ) : (
                        <FileText className="w-5 h-5 text-red-600" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[300px]">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(idx)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      Remover
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !currentValue || evidenceFiles.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                Salvar Progresso
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}