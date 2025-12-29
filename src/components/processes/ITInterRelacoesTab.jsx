import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Sparkles, Network } from "lucide-react";
import AIFieldAssist from "./AIFieldAssist";

export default function ITInterRelacoesTab({ interRelacoes = [], onChange, itData, mapData }) {
  const addInterRelation = () => {
    onChange([...interRelacoes, { area: "", interacao: "" }]);
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
            if (parts.length >= 2 && !line.includes('Área') && !line.includes('---')) {
              parsed.push({
                area: parts[0] || "",
                interacao: parts[1] || ""
              });
            }
          }
        }
      }

      if (Array.isArray(parsed) && parsed.length > 0) {
        onChange(parsed);
      } else {
        throw new Error("Formato inválido");
      }
    } catch (err) {
      console.error("Erro ao parsear inter-relações:", err);
      alert("Não foi possível aplicar automaticamente. Copie e cole manualmente.");
    }
  };

  const updateInterRelation = (index, field, value) => {
    const updated = [...interRelacoes];
    updated[index][field] = value;
    onChange(updated);
  };

  const removeInterRelation = (index) => {
    onChange(interRelacoes.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4 relative">
      <div className="flex justify-between items-center">
        <Label>Inter-relação entre Áreas</Label>
        <Button size="sm" onClick={addInterRelation} variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Área
        </Button>
      </div>

      {interRelacoes.length === 0 ? (
        <div className="relative">
          <p className="text-sm text-gray-500 text-center py-8">Nenhuma inter-relação definida</p>
          <AIFieldAssist
            fieldName="Inter-relações"
            fieldValue=""
            itData={itData}
            mapData={mapData}
            onApply={handleAIGenerate}
            suggestions={[
              { type: 'interrelacoes_gerar', label: 'Gerar Inter-relações', icon: Sparkles },
              { type: 'interrelacoes_areas', label: 'Mapear Áreas Envolvidas', icon: Network }
            ]}
          />
        </div>
      ) : (
        <div className="space-y-2">
          {interRelacoes.map((rel, idx) => (
            <Card key={idx}>
              <CardContent className="p-3">
                <div className="flex gap-3 items-center">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Área</Label>
                      <Input
                        value={rel.area}
                        onChange={(e) => updateInterRelation(idx, 'area', e.target.value)}
                        placeholder="Ex: Comercial"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Interação</Label>
                      <Input
                        value={rel.interacao}
                        onChange={(e) => updateInterRelation(idx, 'interacao', e.target.value)}
                        placeholder="Como interagem"
                      />
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeInterRelation(idx)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}