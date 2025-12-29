import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

export default function ITInterRelacoesTab({ interRelacoes = [], onChange }) {
  const addInterRelation = () => {
    onChange([...interRelacoes, { area: "", interacao: "" }]);
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label>Inter-relação entre Áreas</Label>
        <Button size="sm" onClick={addInterRelation} variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Área
        </Button>
      </div>

      {interRelacoes.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">Nenhuma inter-relação definida</p>
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