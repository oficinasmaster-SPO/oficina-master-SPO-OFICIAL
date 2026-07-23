import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart3 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { CHART_INDICATORS } from "@/components/clientIndicators/indicatorConstants";

export const INDICATOR_OPTIONS = CHART_INDICATORS.map((i) => ({
  key: i.key,
  label: i.label,
}));

export default function AtaIndicatorSelector({ atendimentoId, selected, onChange }) {
  const [saving, setSaving] = useState(false);

  if (!atendimentoId) return null;

  const toggle = async (key, checked) => {
    const next = checked ? [...selected, key] : selected.filter((k) => k !== key);
    onChange(next);
    setSaving(true);
    try {
      await base44.entities.ConsultoriaAtendimento.update(atendimentoId, { indicadores_selecionados: next });
    } catch (err) {
      toast.error("Erro ao salvar configuração de indicadores: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="print:hidden border-blue-100 bg-blue-50/40">
      <CardContent className="pt-4 pb-4">
        <p className="text-xs font-bold text-blue-800 uppercase tracking-wide flex items-center gap-1.5 mb-2">
          <BarChart3 className="w-3.5 h-3.5" />
          Indicadores que aparecem na tabela de evolução da ATA {saving && "(salvando...)"}
        </p>
        <div className="flex flex-wrap gap-3">
          {INDICATOR_OPTIONS.map((opt) => (
            <label key={opt.key} className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Checkbox
                checked={selected.includes(opt.key)}
                onCheckedChange={(checked) => toggle(opt.key, checked)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}