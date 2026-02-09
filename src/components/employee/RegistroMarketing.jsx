import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Target, DollarSign } from "lucide-react";

export default function RegistroMarketing({ formData, onChange }) {
  const handleChange = (field, value) => {
    onChange({
      ...formData,
      [field]: value
    });
  };

  // Calcula custo por venda automaticamente
  const calcularCustoPorVenda = () => {
    const investido = parseFloat(formData.valor_investido_trafego) || 0;
    const vendidos = parseFloat(formData.leads_vendidos) || 0;
    return vendidos > 0 ? (investido / vendidos).toFixed(2) : "0.00";
  };

  return (
    <Card className="border-purple-200 bg-purple-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <TrendingUp className="w-5 h-5" />
          Dados de Marketing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="leads_gerados">Leads Gerados</Label>
            <Input
              id="leads_gerados"
              type="number"
              value={formData.leads_gerados || ""}
              onChange={(e) => handleChange("leads_gerados", e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <Label htmlFor="leads_agendados">Leads Agendados</Label>
            <Input
              id="leads_agendados"
              type="number"
              value={formData.leads_agendados || ""}
              onChange={(e) => handleChange("leads_agendados", e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <Label htmlFor="leads_compareceram">Comparecimentos</Label>
            <Input
              id="leads_compareceram"
              type="number"
              value={formData.leads_compareceram || ""}
              onChange={(e) => handleChange("leads_compareceram", e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <Label htmlFor="leads_vendidos">Leads Vendidos</Label>
            <Input
              id="leads_vendidos"
              type="number"
              value={formData.leads_vendidos || ""}
              onChange={(e) => handleChange("leads_vendidos", e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <Label htmlFor="valor_investido_trafego">Valor Investido Tráfego (R$)</Label>
            <Input
              id="valor_investido_trafego"
              type="number"
              step="0.01"
              value={formData.valor_investido_trafego || ""}
              onChange={(e) => handleChange("valor_investido_trafego", e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="valor_faturado_leads">Valor Faturado com Leads (R$)</Label>
            <Input
              id="valor_faturado_leads"
              type="number"
              step="0.01"
              value={formData.valor_faturado_leads || ""}
              onChange={(e) => handleChange("valor_faturado_leads", e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="bg-green-100 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-700" />
              <span className="font-semibold text-green-900">Custo por Venda (Automático)</span>
            </div>
            <span className="text-2xl font-bold text-green-700">
              R$ {calcularCustoPorVenda()}
            </span>
          </div>
          <p className="text-xs text-green-700 mt-2">
            Calculado: Valor Investido ÷ Leads Vendidos
          </p>
        </div>
      </CardContent>
    </Card>
  );
}