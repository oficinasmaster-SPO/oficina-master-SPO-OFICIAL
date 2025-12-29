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
        <div className="flex gap-2">
          {riscos.length === 0 && (
            <div className="relative">
              <Button size="sm" variant="ghost" className="text-purple-600">
                <span className="mr-2">Gerar com IA</span>
              </Button>
              <AIFieldAssist
                fieldName="Matriz de Riscos"
                fieldValue=""
                itData={itData}
                mapData={mapData}
                onApply={(suggestion) => {
                  // Parse sugestão e adicionar riscos
                  toast.info("Aplicar sugestões manualmente ou melhorar parse");
                }}
                suggestions={[
                  { type: 'riscos_gerar', label: '⚠️ Gerar matriz de riscos (mín. 3)' }
                ]}
              />
            </div>
          )}
          <Button size="sm" onClick={addRisk} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Risco
          </Button>
        </div>
      </div>

      {riscos.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">Nenhum risco cadastrado</p>
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