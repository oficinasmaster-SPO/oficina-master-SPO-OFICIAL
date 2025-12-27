import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function MAPFormDialog({ 
  open, 
  onClose, 
  onSubmit, 
  map, 
  areaId,
  areas,
  isLoading 
}) {
  const [formData, setFormData] = useState({
    area_id: areaId || "",
    code: "",
    title: "",
    description: "",
    objective: "",
    scope: "",
    process_flow: "",
    flowchart_url: "",
    status: "rascunho"
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (map) {
      setFormData({
        area_id: map.area_id,
        code: map.code,
        title: map.title,
        description: map.description || "",
        objective: map.objective || "",
        scope: map.scope || "",
        process_flow: map.process_flow || "",
        flowchart_url: map.flowchart_url || "",
        status: map.status || "rascunho"
      });
    } else if (areaId) {
      setFormData(prev => ({ ...prev, area_id: areaId }));
    }
  }, [map, areaId, open]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, flowchart_url: file_url }));
      toast.success("Fluxograma enviado!");
    } catch (error) {
      toast.error("Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.area_id || !formData.code || !formData.title) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{map ? "Editar MAP" : "Novo MAP"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Área *</Label>
              <Select value={formData.area_id} onValueChange={v => setFormData({...formData, area_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {areas?.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Código *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Ex: MAP01"
                required
              />
            </div>
          </div>
          <div>
            <Label>Título *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: GPS de Vendas"
              required
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>
          <div>
            <Label>Objetivo</Label>
            <Textarea
              value={formData.objective}
              onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
              rows={3}
            />
          </div>
          <div>
            <Label>Campo de Aplicação</Label>
            <Textarea
              value={formData.scope}
              onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
              rows={2}
            />
          </div>
          <div>
            <Label>Fluxo do Processo</Label>
            <Textarea
              value={formData.process_flow}
              onChange={(e) => setFormData({ ...formData, process_flow: e.target.value })}
              rows={3}
            />
          </div>
          <div>
            <Label>Fluxograma (Imagem)</Label>
            <Input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
            {uploading && <p className="text-xs text-blue-600 mt-1">Enviando...</p>}
          </div>
          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="revisao">Revisão</SelectItem>
                <SelectItem value="obsoleto">Obsoleto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isLoading || uploading}>
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar MAP
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}