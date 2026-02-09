import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function RitualFormDialog({ open, onClose, ritual, employees, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    pillar: "rituais_cultura",
    frequency: "semanal",
    responsible_role: "",
    responsible_user_id: "",
    implementation_steps: [],
    active: true
  });

  useEffect(() => {
    if (ritual) {
      setFormData({
        name: ritual.name || "",
        description: ritual.description || "",
        pillar: ritual.pillar || "rituais_cultura",
        frequency: ritual.frequency || "semanal",
        responsible_role: ritual.responsible_role || "",
        responsible_user_id: ritual.responsible_user_id || "",
        implementation_steps: ritual.implementation_steps || [],
        active: ritual.active !== undefined ? ritual.active : true
      });
    } else {
      setFormData({
        name: "",
        description: "",
        pillar: "rituais_cultura",
        frequency: "semanal",
        responsible_role: "",
        responsible_user_id: "",
        implementation_steps: [],
        active: true
      });
    }
  }, [ritual, open]);

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert("Nome do ritual é obrigatório");
      return;
    }
    onSave(formData);
  };

  const pillars = [
    { value: "proposito", label: "Propósito" },
    { value: "missao", label: "Missão" },
    { value: "visao", label: "Visão" },
    { value: "valores", label: "Valores" },
    { value: "postura_atitudes", label: "Postura e Atitudes" },
    { value: "comportamentos_inaceitaveis", label: "Comportamentos Inaceitáveis" },
    { value: "rituais_cultura", label: "Rituais de Cultura" },
    { value: "sistemas_regras", label: "Sistemas e Regras" },
    { value: "comunicacao_interna", label: "Comunicação Interna" },
    { value: "lideranca", label: "Liderança" },
    { value: "foco_cliente", label: "Foco no Cliente" },
    { value: "performance_responsabilidade", label: "Performance e Responsabilidade" },
    { value: "desenvolvimento_continuo", label: "Desenvolvimento Contínuo" },
    { value: "identidade_pertencimento", label: "Identidade e Pertencimento" }
  ];

  const frequencies = [
    { value: "diario", label: "Diário" },
    { value: "semanal", label: "Semanal" },
    { value: "quinzenal", label: "Quinzenal" },
    { value: "mensal", label: "Mensal" },
    { value: "trimestral", label: "Trimestral" },
    { value: "continuo", label: "Contínuo" },
    { value: "eventual", label: "Eventual" }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ritual ? "Editar Ritual" : "Novo Ritual"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome do Ritual *</Label>
            <Input
              placeholder="Ex: Reunião de Alinhamento Semanal"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              placeholder="Descreva o objetivo e importância deste ritual..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pilar Cultural</Label>
              <Select value={formData.pillar} onValueChange={(value) => setFormData({ ...formData, pillar: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pillars.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frequencies.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Papel/Área Responsável</Label>
              <Input
                placeholder="Ex: Gerente, RH"
                value={formData.responsible_role}
                onChange={(e) => setFormData({ ...formData, responsible_role: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Responsável Principal</Label>
              <Select 
                value={formData.responsible_user_id} 
                onValueChange={(value) => setFormData({ ...formData, responsible_user_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Nenhum</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.user_id || emp.id}>
                      {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <Label>Ritual Ativo</Label>
              <p className="text-xs text-gray-500">Desative para arquivar temporariamente</p>
            </div>
            <Switch
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>{ritual ? "Atualizar" : "Criar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}