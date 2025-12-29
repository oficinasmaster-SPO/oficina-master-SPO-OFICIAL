import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import AIFieldAssist from "./AIFieldAssist";
import { toast } from "sonner";

export default function ITRiscosTab({ riscos = [], onChange, itData, mapData }) {
  const addRisk = () => {
    onChange([...riscos, { risco: "", categoria: "", causa: "", impacto: "", controle: "" }]);
  };

  const updateRisk = (index, field, value) => {
    const updated = [...riscos];
    updated[index][field] = value;
    onChange(updated);
  };

  const removeRisk = (index) => {
    onChange(riscos.filter((_, i) => i !== index));
  };

  const handleAIGenerate = (aiText) => {
    try {
      let parsed;
      try {
        parsed = JSON.parse(aiText);
      } catch {
        const jsonMatch = aiText.match(/```json\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1]);
        } else {
          const lines = aiText.split('\n').filter(l => l.trim());
          parsed = [];
          
          for (let line of lines) {
            const parts = line.split('|').map(p => p.trim());
            if (parts.length >= 4 && !line.includes('Risco') && !line.includes('---')) {
              parsed.push({
                risco: parts[0] || "",
                categoria: parts[1] || "",
                causa: parts[2] || "",
                impacto: parts[3] || "",
                controle: parts[4] || ""
              });
            }
          }
        }
      }

      if (Array.isArray(parsed) && parsed.length > 0) {
        onChange(parsed);
        toast.success(`${parsed.length} riscos adicionados!`);
      } else {
        throw new Error("Formato inválido");
      }
    } catch (err) {
      console.error("Erro ao parsear riscos:", err);
      toast.error("Não foi possível aplicar automaticamente. Copie e cole manualmente.");
    }
  };

  const filledRisks = riscos.filter(r => r.risco?.trim());

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <Label>Matriz de Riscos Operacionais</Label>
          <p className="text-xs text-gray-600 mt-1">
            <AlertTriangle className="w-3 h-3 inline mr-1 text-red-600" />
            Mínimo 3 riscos preenchidos - Atual: {filledRisks.length}
          </p>
        </div>
        <Button size="sm" onClick={addRisk} variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Risco
        </Button>
      </div>

      {riscos.length === 0 ? (
        <div className="relative">
          <p className="text-sm text-gray-500 text-center py-8">Nenhum risco cadastrado</p>
          <AIFieldAssist
            fieldName="Riscos"
            fieldValue=""
            itData={itData}
            mapData={mapData}
            onApply={handleAIGenerate}
            suggestions={[
              { type: 'riscos_gerar', label: 'Gerar Matriz de Riscos (3-5)', icon: AlertTriangle }
            ]}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {riscos.map((risco, idx) => (
            <Card key={idx} className="border-l-4 border-red-500">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">Risco {idx + 1}</span>
                  <Button size="sm" variant="ghost" onClick={() => removeRisk(idx)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs">Risco</Label>
                    <Input
                      value={risco.risco}
                      onChange={(e) => updateRisk(idx, 'risco', e.target.value)}
                      placeholder="Descrição do risco"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Categoria</Label>
                    <Input
                      value={risco.categoria}
                      onChange={(e) => updateRisk(idx, 'categoria', e.target.value)}
                      placeholder="Ex: Qualidade, Prazo"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Causa</Label>
                    <Input
                      value={risco.causa}
                      onChange={(e) => updateRisk(idx, 'causa', e.target.value)}
                      placeholder="O que causa este risco"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Impacto</Label>
                    <Input
                      value={risco.impacto}
                      onChange={(e) => updateRisk(idx, 'impacto', e.target.value)}
                      placeholder="Consequências"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Controle/Prevenção</Label>
                    <Input
                      value={risco.controle}
                      onChange={(e) => updateRisk(idx, 'controle', e.target.value)}
                      placeholder="Como prevenir"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}