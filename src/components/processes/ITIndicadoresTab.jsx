import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, TrendingUp } from "lucide-react";
import AIFieldAssist from "./AIFieldAssist";
import { toast } from "sonner";

export default function ITIndicadoresTab({ indicadores = [], onChange, itData, mapData }) {
  const addIndicator = () => {
    onChange([...indicadores, { nome: "", formula: "", meta: "", frequencia: "mensal" }]);
  };

  const updateIndicator = (index, field, value) => {
    const updated = [...indicadores];
    updated[index][field] = value;
    onChange(updated);
  };

  const removeIndicator = (index) => {
    onChange(indicadores.filter((_, i) => i !== index));
  };

  const filledIndicators = indicadores.filter(i => i.nome?.trim());

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <Label>Indicadores da IT</Label>
          <p className="text-xs text-gray-600 mt-1">
            <TrendingUp className="w-3 h-3 inline mr-1 text-blue-600" />
            Mínimo 1 indicador preenchido - Atual: {filledIndicators.length}
          </p>
        </div>
        <div className="flex gap-2">
          {indicadores.filter(i => i.nome).length === 0 && (
            <div className="relative">
              <Button size="sm" variant="ghost" className="text-purple-600">
                <span className="mr-2">Gerar com IA</span>
              </Button>
              <AIFieldAssist
                fieldName="Indicadores"
                fieldValue=""
                itData={itData}
                mapData={mapData}
                onApply={(suggestion) => {
                  toast.info("Aplicar sugestões manualmente");
                }}
                suggestions={[
                  { type: 'indicadores_gerar', label: '📊 Gerar indicadores-chave' }
                ]}
              />
            </div>
          )}
          <Button size="sm" onClick={addIndicator} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Indicador
          </Button>
        </div>
      </div>

      {indicadores.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">Nenhum indicador cadastrado</p>
      ) : (
        <div className="space-y-3">
          {indicadores.map((ind, idx) => (
            <Card key={idx} className="border-l-4 border-blue-500">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">Indicador {idx + 1}</span>
                  <Button size="sm" variant="ghost" onClick={() => removeIndicator(idx)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs">Nome do Indicador</Label>
                    <Input
                      value={ind.nome}
                      onChange={(e) => updateIndicator(idx, 'nome', e.target.value)}
                      placeholder="Ex: Tempo médio de execução"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Fórmula de Cálculo</Label>
                    <Input
                      value={ind.formula}
                      onChange={(e) => updateIndicator(idx, 'formula', e.target.value)}
                      placeholder="Como calcular este indicador"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Meta</Label>
                    <Input
                      value={ind.meta}
                      onChange={(e) => updateIndicator(idx, 'meta', e.target.value)}
                      placeholder="Ex: < 10 minutos"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Frequência de Medição</Label>
                    <Select value={ind.frequencia} onValueChange={(v) => updateIndicator(idx, 'frequencia', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diario">Diário</SelectItem>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="mensal">Mensal</SelectItem>
                        <SelectItem value="trimestral">Trimestral</SelectItem>
                      </SelectContent>
                    </Select>
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