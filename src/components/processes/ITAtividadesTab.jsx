import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Sparkles, List } from "lucide-react";
import AIFieldAssist from "./AIFieldAssist";

export default function ITAtividadesTab({ atividades = [], onChange, itData, mapData }) {
  const addActivity = () => {
    onChange([...atividades, { atividade: "", responsavel: "", frequencia: "", observacao: "" }]);
  };

  const handleAIGenerate = (aiText) => {
    try {
      // Tentar parsear como JSON primeiro
      let parsed;
      try {
        parsed = JSON.parse(aiText);
      } catch {
        // Se não for JSON, tentar extrair do markdown
        const jsonMatch = aiText.match(/```json\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1]);
        } else {
          // Parsing manual de lista
          const lines = aiText.split('\n').filter(l => l.trim());
          parsed = [];
          
          for (let line of lines) {
            // Formato esperado: "Atividade | Responsável | Frequência | Observação"
            const parts = line.split('|').map(p => p.trim());
            if (parts.length >= 2 && !line.includes('Atividade') && !line.includes('---')) {
              parsed.push({
                atividade: parts[0] || "",
                responsavel: parts[1] || "",
                frequencia: parts[2] || "",
                observacao: parts[3] || ""
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
      console.error("Erro ao parsear atividades:", err);
      alert("Não foi possível aplicar automaticamente. Copie e cole manualmente.");
    }
  };

  const updateActivity = (index, field, value) => {
    const updated = [...atividades];
    updated[index][field] = value;
    onChange(updated);
  };

  const removeActivity = (index) => {
    onChange(atividades.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4 relative">
      <div className="flex justify-between items-center">
        <Label>Atividades e Responsabilidades</Label>
        <Button size="sm" onClick={addActivity} variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Atividade
        </Button>
      </div>

      {atividades.length === 0 ? (
        <div className="relative">
          <p className="text-sm text-gray-500 text-center py-8">Nenhuma atividade definida</p>
          <AIFieldAssist
            fieldName="Atividades"
            fieldValue=""
            itData={itData}
            mapData={mapData}
            onApply={handleAIGenerate}
            suggestions={[
              { type: 'atividades_gerar', label: 'Gerar Lista de Atividades', icon: Sparkles },
              { type: 'atividades_completa', label: 'Atividades Completas (3-5)', icon: List }
            ]}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {atividades.map((ativ, idx) => (
            <Card key={idx}>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">Atividade {idx + 1}</span>
                  <Button size="sm" variant="ghost" onClick={() => removeActivity(idx)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs">Atividade</Label>
                    <Input
                      value={ativ.atividade}
                      onChange={(e) => updateActivity(idx, 'atividade', e.target.value)}
                      placeholder="Descreva a atividade"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Responsável</Label>
                    <Input
                      value={ativ.responsavel}
                      onChange={(e) => updateActivity(idx, 'responsavel', e.target.value)}
                      placeholder="Cargo/função"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Frequência</Label>
                    <Input
                      value={ativ.frequencia}
                      onChange={(e) => updateActivity(idx, 'frequencia', e.target.value)}
                      placeholder="Ex: Diária, Semanal"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Observação</Label>
                    <Input
                      value={ativ.observacao}
                      onChange={(e) => updateActivity(idx, 'observacao', e.target.value)}
                      placeholder="Detalhes adicionais"
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