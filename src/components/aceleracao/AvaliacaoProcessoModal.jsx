import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, Star, Upload } from "lucide-react";
import { toast } from "sonner";

export default function AvaliacaoProcessoModal({ client, process, onClose, onSave }) {
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [anexos, setAnexos] = useState([]);

  const salvarAvaliacaoMutation = useMutation({
    mutationFn: async (data) => {
      // Criar registro de avaliação (pode ser uma nova entity ou adicionar no CronogramaProgresso)
      return await base44.entities.ConsultoriaAvaliacao.create({
        workshop_id: client.id,
        processo_codigo: process.codigo,
        processo_nome: process.nome,
        nota: data.nota,
        comentario: data.comentario,
        anexos: data.anexos
      });
    },
    onSuccess: () => {
      toast.success('Avaliação salva com sucesso!');
      onSave();
    },
    onError: (error) => {
      toast.error('Erro ao salvar avaliação: ' + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (nota === 0) {
      toast.error('Por favor, selecione uma nota.');
      return;
    }

    salvarAvaliacaoMutation.mutate({
      nota,
      comentario,
      anexos
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAnexos([...anexos, { nome: file.name, url: file_url }]);
      toast.success('Arquivo anexado!');
    } catch (error) {
      toast.error('Erro ao fazer upload: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Avaliar Processo</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Cliente: <span className="font-medium">{client.name}</span>
          </p>
          <p className="text-sm text-gray-600">
            Processo: <span className="font-medium">{process.nome || process.codigo}</span>
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sistema de Notas */}
            <div>
              <Label className="mb-3 block">Avaliação (1-5 estrelas) *</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNota(n)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star 
                      className={`w-10 h-10 ${
                        n <= nota 
                          ? 'fill-yellow-400 text-yellow-400' 
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {nota > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  Você selecionou: <span className="font-medium">{nota} estrela(s)</span>
                </p>
              )}
            </div>

            {/* Comentário */}
            <div>
              <Label>Comentários e Observações</Label>
              <Textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows={5}
                placeholder="Descreva como foi o processo, pontos positivos, áreas de melhoria..."
                className="mt-2"
              />
            </div>

            {/* Upload de Anexos */}
            <div>
              <Label>Anexar Arquivos (opcional)</Label>
              <div className="mt-2">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <label htmlFor="file-upload">
                  <Button type="button" variant="outline" className="w-full" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      Anexar Arquivo
                    </span>
                  </Button>
                </label>
              </div>
              {anexos.length > 0 && (
                <div className="mt-3 space-y-2">
                  {anexos.map((anexo, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                      <span>{anexo.nome}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setAnexos(anexos.filter((_, i) => i !== idx))}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvarAvaliacaoMutation.isPending || nota === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {salvarAvaliacaoMutation.isPending ? 'Salvando...' : 'Salvar Avaliação'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}