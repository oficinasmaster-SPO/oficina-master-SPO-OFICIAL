import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";

export default function ScriptPreview({
  script,
  candidate,
  workshop,
  onReactionChange,
  candidateReaction,
  onSave,
  isLoading
}) {
  if (!script) {
    return <Card className="p-12 text-center text-gray-500">Nenhum script configurado</Card>;
  }

  return (
    <Card className="p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{workshop.name}</h2>
        <p className="text-gray-600">{script.company_history}</p>
      </div>
      
      {script.mission && (
        <div>
          <h3 className="font-bold text-lg mb-2">Nossa Missão</h3>
          <p className="text-gray-700">{script.mission}</p>
        </div>
      )}

      {script.vision && (
        <div>
          <h3 className="font-bold text-lg mb-2">Nossa Visão</h3>
          <p className="text-gray-700">{script.vision}</p>
        </div>
      )}

      {script.values && script.values.length > 0 && (
        <div>
          <h3 className="font-bold text-lg mb-2">Nossos Valores</h3>
          <ul className="list-disc list-inside space-y-1">
            {script.values.map((v, idx) => (
              <li key={idx} className="text-gray-700">{v}</li>
            ))}
          </ul>
        </div>
      )}

      {script.growth_opportunities && (
        <div>
          <h3 className="font-bold text-lg mb-2">Oportunidades de Crescimento</h3>
          <p className="text-gray-700">{script.growth_opportunities}</p>
        </div>
      )}

      {script.not_fit_profile && (
        <div className="border-t pt-6">
          <h3 className="font-bold text-lg mb-2">Perfis que não se adaptam</h3>
          <p className="text-gray-600">{script.not_fit_profile}</p>
        </div>
      )}

      <div className="border-t pt-6">
        <Label>Como o candidato reagiu ao script?</Label>
        <Select value={candidateReaction} onValueChange={onReactionChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a reação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="interessado">✅ Interessado</SelectItem>
            <SelectItem value="neutro">😐 Neutro</SelectItem>
            <SelectItem value="desalinhado">❌ Desalinhado</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={onSave} disabled={isLoading || !candidateReaction} className="w-full mt-4">
          <Save className="w-4 h-4 mr-2" />
          Salvar Reação
        </Button>
      </div>
    </Card>
  );
}