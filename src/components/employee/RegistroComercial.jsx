import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Target, TrendingUp } from "lucide-react";

export default function RegistroComercial({ formData, onChange }) {
  const handleChange = (field, value) => {
    onChange({
      ...formData,
      [field]: value
    });
  };

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Users className="w-5 h-5" />
          Dados Comercial / Marketing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="clientes_agendados_base">Clientes Agendados da Base</Label>
            <Input
              id="clientes_agendados_base"
              type="number"
              value={formData.clientes_agendados_base || ""}
              onChange={(e) => handleChange("clientes_agendados_base", e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <Label htmlFor="clientes_agendados_marketing">Clientes Agendados de Marketing</Label>
            <Input
              id="clientes_agendados_marketing"
              type="number"
              value={formData.clientes_agendados_marketing || ""}
              onChange={(e) => handleChange("clientes_agendados_marketing", e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <Label htmlFor="clientes_entregues_marketing">Clientes Entregues de Marketing</Label>
            <Input
              id="clientes_entregues_marketing"
              type="number"
              value={formData.clientes_entregues_marketing || ""}
              onChange={(e) => handleChange("clientes_entregues_marketing", e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <Label htmlFor="vendas_leads_marketing">Vendas de Leads de Marketing (R$)</Label>
            <Input
              id="vendas_leads_marketing"
              type="number"
              step="0.01"
              value={formData.vendas_leads_marketing || ""}
              onChange={(e) => handleChange("vendas_leads_marketing", e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="bg-blue-100 p-3 rounded-lg text-sm text-blue-800">
          <p className="font-semibold mb-1">💡 Dica:</p>
          <p>Preencha os dados conforme o desempenho do dia. Estas informações alimentam seu dashboard e comissões.</p>
        </div>
      </CardContent>
    </Card>
  );
}