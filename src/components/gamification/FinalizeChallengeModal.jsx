import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2, Upload, CheckCircle2, FileText, Image, AlertCircle } from "lucide-react";

export default function FinalizeChallengeModal({ open, onClose, challenge, onSuccess }) {
  const [justification, setJustification] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      const isValid = isImage || isPdf;
      const isUnder10MB = file.size <= 10 * 1024 * 1024;
      
      if (!isValid) {
        toast.error(`${file.name}: Apenas imagens ou PDF são permitidos`);
        return false;
      }
      if (!isUnder10MB) {
        toast.error(`${file.name}: Arquivo muito grande (máx 10MB)`);
        return false;
      }
      return true;
    });
    
    setEvidenceFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFinalize = async () => {
    if (!justification.trim()) {
      toast.error("A justificativa é obrigatória");
      return;
    }

    if (evidenceFiles.length === 0) {
      toast.error("É necessário anexar pelo menos uma evidência (foto ou PDF)");
      return;
    }

    setSaving(true);
    try {
      // Upload das evidências
      const uploadedUrls = [];
      for (const file of evidenceFiles) {
        const formData = new FormData();
        formData.append('file', file);
        
        const { data } = await base44.functions.invoke('uploadEvidence', { file });
        uploadedUrls.push(data.file_url);
      }

      // Atualizar challenge para status "concluido"
      await base44.entities.Challenge.update(challenge.id, {
        status: 'concluido',
        completion_justification: justification,
        completion_evidence_urls: uploadedUrls,
        completion_date: new Date().toISOString()
      });

      toast.success("Desafio finalizado com sucesso!");
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Erro ao finalizar desafio:", error);
      toast.error(`Erro ao finalizar: ${error?.message || 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Finalizar Desafio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info do Desafio */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">{challenge?.title}</h3>
            <p className="text-sm text-blue-800">{challenge?.description}</p>
            <div className="flex items-center gap-2 mt-3">
              <Badge className="bg-blue-600 text-white">
                Meta: {challenge?.goal_value}
              </Badge>
              <Badge className="bg-yellow-600 text-white">
                Recompensa: {challenge?.reward_xp} XP
              </Badge>
            </div>
          </div>

          {/* Alerta de Responsabilidade */}
          <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-700 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-900">
              <p className="font-semibold mb-1">⚠️ Atenção</p>
              <p>Apenas donos de oficina podem finalizar desafios. A justificativa e evidências serão registradas permanentemente no histórico.</p>
            </div>
          </div>

          {/* Justificativa Obrigatória */}
          <div className="space-y-2">
            <Label className="text-base font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              Justificativa da Conclusão *
            </Label>
            <Textarea
              placeholder="Descreva como o desafio foi concluído, quais resultados foram alcançados e por que merece ser finalizado..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="min-h-[120px]"
              maxLength={1000}
            />
            <p className="text-xs text-gray-500 text-right">
              {justification.length}/1000 caracteres
            </p>
          </div>

          {/* Upload de Evidências */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Image className="w-4 h-4 text-green-600" />
              Evidências (Fotos ou PDF) *
            </Label>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
              <input
                type="file"
                accept="image/*,.pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="evidence-upload"
              />
              <label htmlFor="evidence-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-1">
                  Clique para adicionar evidências
                </p>
                <p className="text-xs text-gray-500">
                  Aceita: JPG, PNG, PDF (máx 10MB cada)
                </p>
              </label>
            </div>

            {/* Lista de Arquivos Selecionados */}
            {evidenceFiles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Arquivos Selecionados ({evidenceFiles.length})
                </Label>
                {evidenceFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      {file.type.startsWith('image/') ? (
                        <Image className="w-5 h-5 text-green-600" />
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

          {/* Validações */}
          {justification.trim() && evidenceFiles.length > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-900 font-medium">
                Tudo pronto para finalizar!
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleFinalize}
            disabled={saving || !justification.trim() || evidenceFiles.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Finalizando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Confirmar Finalização
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}