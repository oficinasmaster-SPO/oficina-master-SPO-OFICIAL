import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Checkbox } from "@/components/ui/checkbox";

const METRICS = [
  { key: "faturamento_mes", label: "Faturamento", color: "#2563eb" },
  { key: "faturado_kit_master", label: "Kit Master", color: "#f59e0b" },
  { key: "faturado_trafego_pago", label: "Tráfego Pago", color: "#a855f7" },
  { key: "lucro_operacional", label: "Lucro", color: "#16a34a" },
];

// Agrupa os registros por mês de referência, mantendo sempre o registro
// com o MAIOR faturamento_mes de cada mês (evita distorção por captura duplicada/errada)
function groupByMonthKeepHighestRevenue(indicators) {
  const byMonth = new Map();
  for (const ind of indicators) {
    const monthKey = ind.mes_referencia || (ind.data_registro ? ind.data_registro.slice(0, 7) : null);
    if (!monthKey) continue;
    const current = byMonth.get(monthKey);
    if (!current || Number(ind.faturamento_mes || 0) > Number(current.faturamento_mes || 0)) {
      byMonth.set(monthKey, { ...ind, monthKey });
    }
  }
  return Array.from(byMonth.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-");
  return `${month}/${year}`;
}

export default function ClientIndicatorsChart({ workshopId }) {
  const [active, setActive] = useState(["faturamento_mes"]);

  const { data: indicators = [], isLoading } = useQuery({
    queryKey: ["client-indicators", workshopId],
    queryFn: () => base44.entities.ClientIndicator.filter({ workshop_id: workshopId }, "data_registro", 200),
    enabled: !!workshopId,
  });

  if (!workshopId) return null;
  if (isLoading) return <p className="text-xs text-gray-400">Carregando indicadores...</p>;
  if (indicators.length === 0) {
    return <p className="text-xs text-gray-400 italic">Nenhum indicador registrado ainda para este cliente.</p>;
  }

  const chartData = groupByMonthKeepHighestRevenue(indicators).map((i) => ({
    ...i,
    data: formatMonthLabel(i.monthKey),
  }));

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Evolução do Cliente (mês a mês)</p>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="data" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v) => `R$ ${Number(v).toLocaleString("pt-BR")}`} />
            {METRICS.filter((m) => active.includes(m.key)).map((m) => (
              <Line key={m.key} type="monotone" dataKey={m.key} name={m.label} stroke={m.color} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-3">
        {METRICS.map((m) => (
          <label key={m.key} className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Checkbox
              checked={active.includes(m.key)}
              onCheckedChange={(checked) => {
                setActive((prev) => (checked ? [...prev, m.key] : prev.filter((k) => k !== m.key)));
              }}
            />
            <span style={{ color: m.color }} className="font-medium">{m.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}