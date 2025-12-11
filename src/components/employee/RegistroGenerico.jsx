import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

export default function RegistroGenerico({ formData, onChange, jobRole }) {
  const handleChange = (field, value) => {
    onChange({
      ...formData,
      [field]: value
    });
  };

  const roleLabels = {
    financeiro: "Financeiro",
    rh: "Recursos Humanos",
    administrativo: "Administrativo",
    estoque: "Estoque",
    outros: "Outros"
  };

  return (
    <Card className="border-gray-200 bg-gray-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Activity className="w-5 h-5" />
          Dados {roleLabels[jobRole] || "Gerais"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="atividades_concluidas">Atividades Concluídas</Label>
            <Input
              id="atividades_concluidas"
              type="number"
              value={formData.atividades_concluidas || ""}
              onChange={(e) => handleChange("atividades_concluidas", e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <Label htmlFor="horas_trabalhadas">Horas Trabalhadas</Label>
            <Input
              id="horas_trabalhadas"
              type="number"
              step="0.5"
              value={formData.horas_trabalhadas || ""}
              onChange={(e) => handleChange("horas_trabalhadas", e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="observacoes">Observações do Dia</Label>
          <Textarea
            id="observacoes"
            value={formData.observacoes || ""}
            onChange={(e) => handleChange("observacoes", e.target.value)}
            placeholder="Descreva suas atividades do dia..."
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
}