import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ScriptEditor({ script, workshopId, position }) {
  const [formData, setFormData] = useState(script || {
    company_history: "",
    mission: "",
    vision: "",
    values: [],
    growth_opportunities: "",
    not_fit_profile: ""
  });

  const handleSave = async () => {
    try {
      const data = { ...formData, workshop_id: workshopId, position, is_active: true };
      if (script) {
        await base44.entities.CultureScript.update(script.id, data);
      } else {
        await base44.entities.CultureScript.create(data);
      }
      toast.success("Script salvo!");
    } catch (error) {
      toast.error("Erro ao salvar script");
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <Label>História da Empresa</Label>
        <Textarea
          value={formData.company_history}
          onChange={(e) => setFormData({...formData, company_history: e.target.value})}
          rows={3}
          placeholder="Como tudo começou..."
        />
      </div>
      <div>
        <Label>Missão</Label>
        <Textarea
          value={formData.mission}
          onChange={(e) => setFormData({...formData, mission: e.target.value})}
          rows={2}
        />
      </div>
      <div>
        <Label>Visão</Label>
        <Textarea
          value={formData.vision}
          onChange={(e) => setFormData({...formData, vision: e.target.value})}
          rows={2}
        />
      </div>
      <div>
        <Label>Valores (um por linha)</Label>
        <Textarea
          value={formData.values?.join('\n') || ""}
          onChange={(e) => setFormData({...formData, values: e.target.value.split('\n').filter(v => v)})}
          rows={3}
        />
      </div>
      <div>
        <Label>Oportunidades de Crescimento</Label>
        <Textarea
          value={formData.growth_opportunities}
          onChange={(e) => setFormData({...formData, growth_opportunities: e.target.value})}
          rows={3}
        />
      </div>
      <div>
        <Label>Perfil de Quem Não Se Adapta</Label>
        <Textarea
          value={formData.not_fit_profile}
          onChange={(e) => setFormData({...formData, not_fit_profile: e.target.value})}
          rows={2}
        />
      </div>
      <Button onClick={handleSave} className="w-full">
        <Save className="w-4 h-4 mr-2" />
        Salvar Script
      </Button>
    </Card>
  );
}