import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function RitualMAPCreator({ ritual, workshopId, onMAPCreated, onClose }) {
  const [steps, setSteps] = useState([""]);
  const [epis, setEpis] = useState([""]);
  const [duration, setDuration] = useState("");
  const [risks, setRisks] = useState([{ risk: "", control: "" }]);
  const [saving, setSaving] = useState(false);

  const handleAddStep = () => setSteps([...steps, ""]);
  const handleRemoveStep = (index) => setSteps(steps.filter((_, i) => i !== index));
  const handleStepChange = (index, value) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    setSteps(newSteps);
  };

  const handleAddEPI = () => setEpis([...epis, ""]);
  const handleRemoveEPI = (index) => setEpis(epis.filter((_, i) => i !== index));
  const handleEPIChange = (index, value) => {
    const newEpis = [...epis];
    newEpis[index] = value;
    setEpis(newEpis);
  };

  const handleAddRisk = () => setRisks([...risks, { risk: "", control: "" }]);
  const handleRemoveRisk = (index) => setRisks(risks.filter((_, i) => i !== index));
  const handleRiskChange = (index, field, value) => {
    const newRisks = [...risks];
    newRisks[index][field] = value;
    setRisks(newRisks);
  };

  const handleSave = async () => {
    const validSteps = steps.filter(s => s.trim());
    if (validSteps.length === 0) {
      toast.error("Adicione pelo menos um passo do processo");
      return;
    }

    setSaving(true);
    try {
      // Criar código único para o MAP do ritual
      const code = `MAP-RIT-${Date.now().toString().slice(-6)}`;

      const mapData = {
        title: `MAP - ${ritual.name}`,
        code,
        category: "Ritual",
        description: `Mapeamento de Processo do Ritual: ${ritual.name}`,
        workshop_id: workshopId,
        is_template: false,
        operational_status: "operacional",
        content_json: {
          objetivo: `Executar o ritual "${ritual.name}" de forma padronizada e eficaz`,
          campo_aplicacao: "Cultura Organizacional - Aculturamento",
          informacoes_complementares: ritual.description || "",
          duracao_estimada: duration ? `${duration} minutos` : "A definir",
          atividades: validSteps.map((step, index) => ({
            atividade: step,
            responsavel: "Conforme agendamento",
            ordem: index + 1
          })),
          epis_necessarios: epis.filter(e => e.trim()).map(epi => ({
            item: epi,
            obrigatorio: true
          })),
          matriz_riscos: risks.filter(r => r.risk.trim()).map(risk => ({
            identificacao: risk.risk,
            controle: risk.control || "A definir",
            categoria: "Operacional"
          })),
          checklist_execucao: validSteps.map((step, index) => ({
            item: step,
            ordem: index + 1,
            obrigatorio: true
          }))
        }
      };

      const createdMAP = await base44.entities.ProcessDocument.create(mapData);
      toast.success("MAP criado com sucesso!");
      onMAPCreated(createdMAP.id);
      onClose();
    } catch (error) {
      console.error("Erro ao criar MAP:", error);
      toast.error("Erro ao criar MAP do ritual");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!ritual} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Criar MAP para: {ritual?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Alert sobre obrigatoriedade */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900">MAP Obrigatório</h4>
                <p className="text-sm text-blue-800 mt-1">
                  Todo ritual precisa de um Mapeamento de Processo (MAP) documentando como executá-lo de forma padronizada.
                </p>
              </div>
            </div>
          </div>

          {/* Duração Estimada */}
          <div>
            <Label>Duração Estimada (minutos)</Label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Ex: 30"
            />
          </div>

          {/* Passo a Passo */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">Passo a Passo do Ritual *</Label>
              <Button size="sm" variant="outline" onClick={handleAddStep}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div key={index} className="flex gap-2">
                  <Badge variant="secondary" className="flex-shrink-0 h-9 px-3">
                    {index + 1}
                  </Badge>
                  <Input
                    value={step}
                    onChange={(e) => handleStepChange(index, e.target.value)}
                    placeholder="Descreva a atividade..."
                  />
                  {steps.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveStep(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* EPIs Necessários */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">EPIs Necessários (se aplicável)</Label>
              <Button size="sm" variant="outline" onClick={handleAddEPI}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {epis.map((epi, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={epi}
                    onChange={(e) => handleEPIChange(index, e.target.value)}
                    placeholder="Ex: Luvas de proteção, Óculos de segurança..."
                  />
                  {epis.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveEPI(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Riscos e Controles */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">Riscos e Controles</Label>
              <Button size="sm" variant="outline" onClick={handleAddRisk}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </div>
            <div className="space-y-3">
              {risks.map((risk, index) => (
                <div key={index} className="p-3 border rounded-lg space-y-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline">Risco {index + 1}</Badge>
                    {risks.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveRisk(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <Input
                    value={risk.risk}
                    onChange={(e) => handleRiskChange(index, "risk", e.target.value)}
                    placeholder="Identifique o risco..."
                  />
                  <Input
                    value={risk.control}
                    onChange={(e) => handleRiskChange(index, "control", e.target.value)}
                    placeholder="Como controlar este risco?"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Criar MAP"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}