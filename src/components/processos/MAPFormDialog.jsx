import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function MAPFormDialog({ 
  open, 
  onClose, 
  onSubmit, 
  map, 
  areaId,
  areas = [],
  isLoading,
  workshopId
}) {
  const [formData, setFormData] = useState({
    area_id: "",
    code: "",
    title: "",
    description: "",
    objective: "",
    scope: "",
    process_flow: "",
    flowchart_url: "",
    responsibilities: [],
    indicators: [],
    inter_relations: [],
    risk_matrix: [],
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
        flowchart_url: map.flowchart_url || "",
        responsibilities: map.responsibilities || [],
        indicators: map.indicators || [],
        inter_relations: map.inter_relations || [],
        risk_matrix: map.risk_matrix || [],
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
        flowchart_url: "",
        responsibilities: [],
        indicators: [],
        inter_relations: [],
        risk_matrix: [],
        status: "rascunho",
        version: "1.0"
      });
      
      if (areaId && !map) {
        generateCode(areaId);
      }
    }
  }, [map, areaId, open]);

  const generateCode = async (selectedAreaId) => {
    try {
      const existingMaps = await base44.entities.ProcessMAP.filter({ 
        area_id: selectedAreaId 
      });
      const areaPrefix = areas.find(a => a.id === selectedAreaId)?.name?.substring(0, 3).toUpperCase() || "MAP";
      const nextNumber = (existingMaps.length + 1).toString().padStart(2, '0');
      setFormData(prev => ({ ...prev, code: `${areaPrefix}${nextNumber}` }));
    } catch (e) {
      console.error(e);
    }
  };

  const addResponsibility = () => {
    setFormData({
      ...formData,
      responsibilities: [...formData.responsibilities, { activity: "", responsible: "", tools: "" }]
    });
  };

  const removeResponsibility = (index) => {
    setFormData({
      ...formData,
      responsibilities: formData.responsibilities.filter((_, i) => i !== index)
    });
  };

  const updateResponsibility = (index, field, value) => {
    const updated = [...formData.responsibilities];
    updated[index][field] = value;
    setFormData({ ...formData, responsibilities: updated });
  };

  const addIndicator = () => {
    setFormData({
      ...formData,
      indicators: [...formData.indicators, { name: "", target: "", measurement: "" }]
    });
  };

  const removeIndicator = (index) => {
    setFormData({
      ...formData,
      indicators: formData.indicators.filter((_, i) => i !== index)
    });
  };

  const updateIndicator = (index, field, value) => {
    const updated = [...formData.indicators];
    updated[index][field] = value;
    setFormData({ ...formData, indicators: updated });
  };

  const addInterRelation = () => {
    setFormData({
      ...formData,
      inter_relations: [...formData.inter_relations, { area: "", interaction: "" }]
    });
  };

  const removeInterRelation = (index) => {
    setFormData({
      ...formData,
      inter_relations: formData.inter_relations.filter((_, i) => i !== index)
    });
  };

  const updateInterRelation = (index, field, value) => {
    const updated = [...formData.inter_relations];
    updated[index][field] = value;
    setFormData({ ...formData, inter_relations: updated });
  };

  const addRisk = () => {
    setFormData({
      ...formData,
      risk_matrix: [...formData.risk_matrix, { 
        identification: "", 
        source: "", 
        impact: "", 
        category: "Baixo", 
        control: "" 
      }]
    });
  };

  const removeRisk = (index) => {
    setFormData({
      ...formData,
      risk_matrix: formData.risk_matrix.filter((_, i) => i !== index)
    });
  };

  const updateRisk = (index, field, value) => {
    const updated = [...formData.risk_matrix];
    updated[index][field] = value;
    setFormData({ ...formData, risk_matrix: updated });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{map ? "Editar MAP" : "Novo Mapa de Autogestão do Processo (MAP)"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basico" className="space-y-4">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="basico">Básico</TabsTrigger>
              <TabsTrigger value="processo">Processo</TabsTrigger>
              <TabsTrigger value="atividades">Atividades</TabsTrigger>
              <TabsTrigger value="riscos">Riscos</TabsTrigger>
              <TabsTrigger value="inter">Inter-relação</TabsTrigger>
              <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
            </TabsList>

            <TabsContent value="basico" className="space-y-3 mt-4">
              <div>
                <Label>Área/Categoria *</Label>
                <Select
                  value={formData.area_id}
                  onValueChange={(value) => {
                    setFormData({ ...formData, area_id: value });
                    if (!map) generateCode(value);
                  }}
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
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Código (auto) *</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="VEN01"
                    required
                  />
                </div>
                <div>
                  <Label>Revisão</Label>
                  <Input
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="1.0"
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
                <Label>Título do MAP *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Processo de Vendas"
                  required
                />
              </div>
              <div>
                <Label>Descrição Geral</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Breve descrição do processo..."
                  rows={2}
                />
              </div>
            </TabsContent>

            <TabsContent value="processo" className="space-y-3 mt-4">
              <div>
                <Label>Objetivo do Processo</Label>
                <Textarea
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  placeholder="Qual é o objetivo deste processo?"
                  rows={3}
                />
              </div>
              <div>
                <Label>Campo de Aplicação</Label>
                <Textarea
                  value={formData.scope}
                  onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                  placeholder="Onde este processo se aplica?"
                  rows={2}
                />
              </div>
              <div>
                <Label>Fluxo do Processo (Informações Complementares)</Label>
                <Textarea
                  value={formData.process_flow}
                  onChange={(e) => setFormData({ ...formData, process_flow: e.target.value })}
                  placeholder="Descreva o fluxo detalhado do processo..."
                  rows={5}
                />
              </div>
            </TabsContent>

            <TabsContent value="atividades" className="space-y-3 mt-4">
              <div className="flex justify-between items-center">
                <Label>Atividades e Responsabilidades</Label>
                <Button type="button" size="sm" onClick={addResponsibility}>
                  <Plus className="w-3 h-3 mr-1" /> Adicionar
                </Button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {formData.responsibilities.map((resp, i) => (
                  <div key={i} className="border rounded p-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">#{i + 1}</span>
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeResponsibility(i)}>
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Atividade"
                      value={resp.activity}
                      onChange={(e) => updateResponsibility(i, 'activity', e.target.value)}
                    />
                    <Input
                      placeholder="Responsável"
                      value={resp.responsible}
                      onChange={(e) => updateResponsibility(i, 'responsible', e.target.value)}
                    />
                    <Input
                      placeholder="Ferramentas/Recursos"
                      value={resp.tools}
                      onChange={(e) => updateResponsibility(i, 'tools', e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="riscos" className="space-y-3 mt-4">
              <div className="flex justify-between items-center">
                <Label>Matriz de Riscos</Label>
                <Button type="button" size="sm" onClick={addRisk}>
                  <Plus className="w-3 h-3 mr-1" /> Adicionar Risco
                </Button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {formData.risk_matrix.map((risk, i) => (
                  <div key={i} className="border rounded p-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Risco #{i + 1}</span>
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeRisk(i)}>
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Identificação do risco"
                      value={risk.identification}
                      onChange={(e) => updateRisk(i, 'identification', e.target.value)}
                    />
                    <Input
                      placeholder="Fonte/Origem"
                      value={risk.source}
                      onChange={(e) => updateRisk(i, 'source', e.target.value)}
                    />
                    <Textarea
                      placeholder="Impacto"
                      value={risk.impact}
                      onChange={(e) => updateRisk(i, 'impact', e.target.value)}
                      rows={2}
                    />
                    <Select value={risk.category} onValueChange={(val) => updateRisk(i, 'category', val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Baixo">Baixo</SelectItem>
                        <SelectItem value="Médio">Médio</SelectItem>
                        <SelectItem value="Alto">Alto</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="Controle/Mitigação"
                      value={risk.control}
                      onChange={(e) => updateRisk(i, 'control', e.target.value)}
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="inter" className="space-y-3 mt-4">
              <div className="flex justify-between items-center">
                <Label>Inter-relação com Outras Áreas</Label>
                <Button type="button" size="sm" onClick={addInterRelation}>
                  <Plus className="w-3 h-3 mr-1" /> Adicionar
                </Button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {formData.inter_relations.map((rel, i) => (
                  <div key={i} className="border rounded p-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">#{i + 1}</span>
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeInterRelation(i)}>
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Área relacionada"
                      value={rel.area}
                      onChange={(e) => updateInterRelation(i, 'area', e.target.value)}
                    />
                    <Textarea
                      placeholder="Tipo de interação"
                      value={rel.interaction}
                      onChange={(e) => updateInterRelation(i, 'interaction', e.target.value)}
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="indicadores" className="space-y-3 mt-4">
              <div className="flex justify-between items-center">
                <Label>Indicadores de Desempenho</Label>
                <Button type="button" size="sm" onClick={addIndicator}>
                  <Plus className="w-3 h-3 mr-1" /> Adicionar Indicador
                </Button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {formData.indicators.map((ind, i) => (
                  <div key={i} className="border rounded p-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Indicador #{i + 1}</span>
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeIndicator(i)}>
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Nome do indicador"
                      value={ind.name}
                      onChange={(e) => updateIndicator(i, 'name', e.target.value)}
                    />
                    <Input
                      placeholder="Meta"
                      value={ind.target}
                      onChange={(e) => updateIndicator(i, 'target', e.target.value)}
                    />
                    <Input
                      placeholder="Como medir"
                      value={ind.measurement}
                      onChange={(e) => updateIndicator(i, 'measurement', e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {map ? "Atualizar MAP" : "Criar MAP"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}