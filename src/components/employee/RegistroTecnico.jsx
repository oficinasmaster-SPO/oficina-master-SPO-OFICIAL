import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, DollarSign } from "lucide-react";

export default function RegistroTecnico({ formData, onChange }) {
  const handleChange = (field, value) => {
    onChange({
      ...formData,
      [field]: value
    });
  };

  const calcularTotalFaturamento = () => {
    const pecas = parseFloat(formData.faturamento_pecas) || 0;
    const servicos = parseFloat(formData.faturamento_servicos) || 0;
    return (pecas + servicos).toFixed(2);
  };

  return (
    <Card className="border-orange-200 bg-orange-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-900">
          <Wrench className="w-5 h-5" />
          Dados Técnicos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="faturamento_pecas">Faturamento Peças (R$)</Label>
            <Input
              id="faturamento_pecas"
              type="number"
              step="0.01"
              value={formData.faturamento_pecas || ""}
              onChange={(e) => handleChange("faturamento_pecas", e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="faturamento_servicos">Faturamento Serviços (R$)</Label>
            <Input
              id="faturamento_servicos"
              type="number"
              step="0.01"
              value={formData.faturamento_servicos || ""}
              onChange={(e) => handleChange("faturamento_servicos", e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="qgp_aplicados">QGP Aplicados</Label>
            <Input
              id="qgp_aplicados"
              type="number"
              value={formData.qgp_aplicados || ""}
              onChange={(e) => handleChange("qgp_aplicados", e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">Quantidade de GPSs aplicados no dia</p>
          </div>

          <div>
            <Label htmlFor="clientes_atendidos">Clientes Atendidos</Label>
            <Input
              id="clientes_atendidos"
              type="number"
              value={formData.clientes_atendidos || ""}
              onChange={(e) => handleChange("clientes_atendidos", e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div className="bg-orange-100 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-orange-700" />
              <span className="font-semibold text-orange-900">Faturamento Total do Dia</span>
            </div>
            <span className="text-2xl font-bold text-orange-700">
              R$ {calcularTotalFaturamento()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}