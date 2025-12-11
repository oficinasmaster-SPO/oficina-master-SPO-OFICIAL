import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AvaliarProcessoModal({ processo, onClose, onSave }) {
  const queryClient = useQueryClient();
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [arquivoUrl, setArquivoUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const salvarAvaliacaoMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.CronogramaProgresso.update(processo.id, {
        avaliacao_programa: {
          resultado: nota >= 8 ? 'excelente' : nota >= 6 ? 'bom' : nota >= 4 ? 'regular' : 'necessita_melhoria',
          observacoes: comentario,
          data: new Date().toISOString()
        }
      });
    },
    onSuccess: () => {
      toast.success('Avaliação salva com sucesso!');
      queryClient.invalidateQueries(['todos-progressos']);
      onSave();
      onClose();
    },
    onError: (error) => {
      toast.error('Erro ao salvar avaliação: ' + error.message);
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data } = await base44.integrations.Core.UploadFile({ file });
      setArquivoUrl(data.file_url);
      toast.success('Arquivo anexado!');
    } catch (error) {
      toast.error('Erro ao fazer upload: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Avaliar Processo</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-2">{processo.modulo_nome}</p>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Nota */}
          <div>
            <Label>Nota (0-10)</Label>
            <div className="flex items-center gap-2 mt-2">
              {[...Array(11)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setNota(i)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    nota === i
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* Comentário */}
          <div>
            <Label>Comentário</Label>
            <Textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Descreva como foi a execução deste processo..."
              rows={4}
              className="mt-2"
            />
          </div>

          {/* Upload */}
          <div>
            <Label>Anexar Evidência (Opcional)</Label>
            <div className="mt-2">
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                accept=".pdf,.jpg,.jpeg,.png"
              />
              <label htmlFor="file-upload">
                <Button variant="outline" className="w-full" asChild>
                  <span>
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        {arquivoUrl ? 'Arquivo Anexado ✓' : 'Selecionar Arquivo'}
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={() => salvarAvaliacaoMutation.mutate()}
              disabled={nota === 0 || salvarAvaliacaoMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {salvarAvaliacaoMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Star className="w-4 h-4 mr-2" />
                  Salvar Avaliação
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}