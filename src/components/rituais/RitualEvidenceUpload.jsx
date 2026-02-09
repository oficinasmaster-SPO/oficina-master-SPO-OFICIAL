import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Image as ImageIcon, FileText, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function RitualEvidenceUpload({ schedule, open, onClose, onComplete }) {
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [notes, setNotes] = useState("");
  const [effectiveness, setEffectiveness] = useState(5);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (evidenceFiles.length + files.length > 5) {
      toast.error("Máximo 5 arquivos permitidos");
      return;
    }
    setEvidenceFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleComplete = async () => {
    if (evidenceFiles.length === 0) {
      toast.error("Adicione ao menos uma evidência");
      return;
    }

    setUploading(true);
    try {
      const uploadedUrls = [];

      for (const file of evidenceFiles) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }

      await base44.entities.ScheduledRitual.update(schedule.id, {
        status: "concluido",
        completion_date: new Date().toISOString(),
        completion_notes: notes,
        effectiveness_rating: effectiveness,
        evidence_urls: uploadedUrls
      });

      toast.success("Ritual concluído com evidências!");
      onComplete && onComplete();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao fazer upload das evidências");
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith("image/")) return <ImageIcon className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-green-600" />
            Concluir Ritual com Evidências
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-semibold">{schedule?.ritual_name}</p>
            <p className="text-xs text-gray-600 mt-1">
              {new Date(schedule?.scheduled_date).toLocaleDateString()}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Upload de Evidências (Fotos, Documentos, etc.)</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-green-400 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
                id="evidence-upload"
              />
              <label htmlFor="evidence-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Clique para adicionar arquivos
                </p>
                <p className="text-xs text-gray-500">
                  Máximo 5 arquivos (Imagens, PDFs, Docs)
                </p>
              </label>
            </div>

            {evidenceFiles.length > 0 && (
              <div className="space-y-2 mt-3">
                {evidenceFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                    <div className="flex items-center gap-2">
                      {getFileIcon(file)}
                      <span className="text-sm">{file.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {(file.size / 1024).toFixed(1)} KB
                      </Badge>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFile(idx)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Avaliação de Efetividade (1-10)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="range"
                min="1"
                max="10"
                value={effectiveness}
                onChange={(e) => setEffectiveness(parseInt(e.target.value))}
                className="flex-1"
              />
              <Badge className="bg-blue-600">{effectiveness}/10</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas de Execução</Label>
            <Textarea
              placeholder="Descreva como foi a execução do ritual, participantes presentes, pontos positivos..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button 
            onClick={handleComplete} 
            disabled={uploading || evidenceFiles.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {uploading ? "Enviando..." : "Concluir Ritual"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}