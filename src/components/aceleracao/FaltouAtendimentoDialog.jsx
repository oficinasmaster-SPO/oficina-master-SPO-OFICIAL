import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UserX, Loader2, Upload, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function FaltouAtendimentoDialog({ open, onOpenChange, atendimento }) {
  const [info, setInfo] = useState("");
  const [evidencias, setEvidencias] = useState([]);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const uploaded = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploaded.push({ url: file_url, nome: file.name });
    }
    setEvidencias(prev => [...prev, ...uploaded]);
    setUploading(false);
  };

  const removeEvidence = (idx) => setEvidencias(prev => prev.filter((_, i) => i !== idx));

  const mutation = useMutation({
    mutationFn: async () => {
      if (!info.trim()) throw new Error("Informe os detalhes da falta");
      const evidenciasTexto = evidencias.map(e => `- ${e.nome}: ${e.url}`).join('\n');
      await base44.entities.ConsultoriaAtendimento.update(atendimento.id, {
        status: 'faltou',
        midias_anexas: [...(atendimento.midias_anexas || []), ...evidencias],
        observacoes_consultor: `${atendimento.observacoes_consultor || ''}\n\n--- REGISTRO DE FALTA ---\n${info}${evidenciasTexto ? `\n\nEvidências:\n${evidenciasTexto}` : ''}`.trim()
      });
      await base44.functions.invoke('gerarAtaConsultoria', {
        atendimento_id: atendimento.id
      });
    },
    onSuccess: () => {
      toast.success("Falta registrada e ATA gerada com evidências");
      queryClient.invalidateQueries({ queryKey: ['atendimentos-acelerador'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-minutes'] });
      setInfo("");
      setEvidencias([]);
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message)
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-700">
            <UserX className="w-5 h-5" />
            Registrar Falta
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
            O cliente não compareceu ao atendimento. Registre as informações e anexe evidências (print do WhatsApp, etc).
          </div>
          <div>
            <Label>Informações sobre a falta *</Label>
            <Textarea
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              placeholder="Descreva as tentativas de contato, horário esperado, etc..."
              rows={4}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Evidências (prints, screenshots)</Label>
            <div className="mt-1 space-y-2">
              {evidencias.map((ev, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-gray-50 border rounded p-2 text-sm">
                  <span className="flex-1 truncate">{ev.nome}</span>
                  <button type="button" onClick={() => removeEvidence(idx)} className="text-gray-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <label className="flex items-center gap-2 cursor-pointer border border-dashed border-gray-300 rounded-lg p-3 hover:border-orange-400 hover:bg-orange-50/30 transition-colors">
                <Upload className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">{uploading ? 'Enviando...' : 'Anexar evidência'}</span>
                <Input type="file" className="hidden" multiple accept="image/*,.pdf" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Voltar</Button>
          <Button
            className="bg-orange-600 hover:bg-orange-700 text-white"
            disabled={mutation.isPending || !info.trim()}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Registrando...</> : 'Confirmar Falta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}