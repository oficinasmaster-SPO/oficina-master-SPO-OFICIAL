import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

export default function ITAtividadesTab({ atividades = [], onChange }) {
  const addActivity = () => {
    onChange([...atividades, { atividade: "", responsavel: "", frequencia: "", observacao: "" }]);
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label>Atividades e Responsabilidades</Label>
        <Button size="sm" onClick={addActivity} variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Atividade
        </Button>
      </div>

      {atividades.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">Nenhuma atividade definida</p>
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