import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CHART_INDICATORS,
  formatIndicatorValue,
  formatAxisValue,
  groupByMonth,
  formatMonthLabel,
} from "./indicatorConstants";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover p-2 shadow-md text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry) => {
        const ind = CHART_INDICATORS.find((i) => i.key === entry.dataKey);
        return (
          <p key={entry.dataKey} style={{ color: entry.color }}>
            {ind?.shortLabel}: {formatIndicatorValue(entry.value, ind?.type)}
          </p>
        );
      })}
    </div>
  );
}

export default function ClientIndicatorsChart({ workshopId }) {
  const [active, setActive] = useState(["faturamento_mes"]);

  const { data: indicators = [], isLoading } = useQuery({
    queryKey: ["client-indicators", workshopId],
    queryFn: () => base44.entities.ClientIndicator.filter({ workshop_id: workshopId }, "data_registro", 200),
    enabled: !!workshopId,
  });

  if (!workshopId) return null;
  if (isLoading) return <p className="text-xs text-muted-foreground">Carregando indicadores...</p>;
  if (indicators.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Nenhum indicador registrado ainda para este cliente.</p>;
  }

  const chartData = groupByMonth(indicators).map((i) => ({
    ...i,
    data: formatMonthLabel(i.monthKey),
  }));

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
        Evolução do Cliente (mês a mês)
      </p>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="data" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 9 }} tickFormatter={formatAxisValue} width={65} />
            <Tooltip content={<CustomTooltip />} />
            {CHART_INDICATORS.filter((m) => active.includes(m.key)).map((m) => (
              <Line
                key={m.key}
                type="monotone"
                dataKey={m.key}
                name={m.shortLabel}
                stroke={m.color}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-3">
        {CHART_INDICATORS.map((m) => (
          <label key={m.key} className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Checkbox
              checked={active.includes(m.key)}
              onCheckedChange={(checked) => {
                setActive((prev) => (checked ? [...prev, m.key] : prev.filter((k) => k !== m.key)));
              }}
            />
            <span style={{ color: m.color }} className="font-medium">{m.shortLabel}</span>
          </label>
        ))}
      </div>
    </div>
  );
}