import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export default function MAPFormDialog({ 
  open, 
  onClose, 
  onSubmit, 
  map, 
  areaId,
  areas = [],
  isLoading 
}) {
  const [formData, setFormData] = useState({
    area_id: "",
    code: "",
    title: "",
    description: "",
    objective: "",
    scope: "",
    process_flow: "",
    status: "rascunho",
    version: "1.0"
  });

  useEffect(() => {
    if (map) {
      setFormData({
        area_id: map.area_id || areaId || "",
        code: map.code || "",
        title: map.title || "",
        description: map.description || "",
        objective: map.objective || "",
        scope: map.scope || "",
        process_flow: map.process_flow || "",
        status: map.status || "rascunho",
        version: map.version || "1.0"
      });
    } else {
      setFormData({
        area_id: areaId || "",
        code: "",
        title: "",
        description: "",
        objective: "",
        scope: "",
        process_flow: "",
        status: "rascunho",
        version: "1.0"
      });
    }
  }, [map, areaId, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{map ? "Editar MAP" : "Novo MAP"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList>
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="content">Conteúdo</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-3">
              <div>
                <Label>Área</Label>
                <Select
                  value={formData.area_id}
                  onValueChange={(value) => setFormData({ ...formData, area_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a área" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Código</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="MAP01"
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
            </TabsContent>

            <TabsContent value="content" className="space-y-3">
              <div>
                <Label>Objetivo do Processo</Label>
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
                  rows={4}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {map ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}