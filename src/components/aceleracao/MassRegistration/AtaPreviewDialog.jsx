import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function AtaPreviewDialog({ open, onOpenChange, ata, onSave, isLoading }) {
  const [formData, setFormData] = useState(ata || {});

  React.useEffect(() => {
    if (ata) {
      setFormData(ata);
    }
  }, [ata, open]);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSave = () => {
    onSave(formData);
    onOpenChange(false);
  };

  if (!ata) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Ata - {ata.workshop_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={formData.tipo_atendimento} onValueChange={(v) => handleChange("tipo_atendimento", v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acompanhamento_mensal">Acompanhamento Mensal</SelectItem>
                  <SelectItem value="diagnostico_inicial">Diagnóstico Inicial</SelectItem>
                  <SelectItem value="reuniao_estrategica">Reunião Estratégica</SelectItem>
                  <SelectItem value="treinamento">Treinamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={formData.status} onValueChange={(v) => handleChange("status", v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agendado">Agendado</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="realizado">Realizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Pauta</Label>
            <Textarea
              value={formData.pauta}
              onChange={(e) => handleChange("pauta", e.target.value)}
              rows={2}
              className="text-xs"
            />
          </div>

          <div>
            <Label className="text-xs">Objetivos</Label>
            <Textarea
              value={formData.objetivos}
              onChange={(e) => handleChange("objetivos", e.target.value)}
              rows={2}
              className="text-xs"
            />
          </div>

          <div>
            <Label className="text-xs">Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => handleChange("observacoes", e.target.value)}
              rows={2}
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Alterações"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}