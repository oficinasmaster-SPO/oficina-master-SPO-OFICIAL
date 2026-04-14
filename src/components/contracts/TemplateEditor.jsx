import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Save } from "lucide-react";

export default function TemplateEditor({ template, open, onOpenChange, onSave }) {
  const [content, setContent] = useState(template?.content || "");
  const [changeNote, setChangeNote] = useState("");

  const handleSave = () => {
    if (!content.trim()) return;
    onSave({
      templateId: template.id,
      content,
      changeNote: changeNote.trim() || "Edição manual"
    });
    setChangeNote("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Template: {template?.name}</DialogTitle>
          <p className="text-sm text-gray-500">
            Uma nova versão será criada automaticamente. A versão anterior ficará no histórico.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              Variáveis disponíveis: {"{{razao_social}}"}, {"{{cnpj}}"}, {"{{city}}"}, {"{{state}}"}, {"{{contract_value}}"}, {"{{duration}}"}, {"{{installments}}"}, {"{{installment_value}}"}, {"{{contract_date}}"}, etc.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Nota da Alteração</Label>
            <Input
              placeholder="Ex: Atualização da cláusula 5 sobre multa rescisória"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Conteúdo do Template</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[400px] font-mono text-xs"
            />
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Salvar Nova Versão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}