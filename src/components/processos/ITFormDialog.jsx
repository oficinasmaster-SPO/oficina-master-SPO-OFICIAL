import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function ITFormDialog({ 
  open, 
  onClose, 
  onSubmit, 
  it, 
  mapCode,
  isLoading 
}) {
  const [formData, setFormData] = useState({
    code: "",
    title: "",
    description: "",
    status: "rascunho",
    version: "1.0"
  });

  useEffect(() => {
    if (it) {
      setFormData({
        code: it.code || "",
        title: it.title || "",
        description: it.description || "",
        status: it.status || "rascunho",
        version: it.version || "1.0"
      });
    } else {
      setFormData({
        code: mapCode ? `${mapCode}.01` : "",
        title: "",
        description: "",
        status: "rascunho",
        version: "1.0"
      });
    }
  }, [it, mapCode, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{it ? "Editar IT" : "Nova Instrução de Trabalho"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Código da IT</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="MAP01.01"
                required
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="revisao">Em Revisão</SelectItem>
                  <SelectItem value="obsoleto">Obsoleto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Título</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Nome da instrução de trabalho"
              required
            />
          </div>
          <div>
            <Label>Como Executar a Atividade</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva passo a passo como executar..."
              rows={6}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {it ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}