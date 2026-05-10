import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function GraficoTempo({ porCliente }) {
  // Top 8 clientes por total de minutos
  const data = (porCliente || [])
    .slice(0, 8)
    .map((c) => ({
      name: c.workshop_name?.length > 14 ? c.workshop_name.slice(0, 13) + "…" : c.workshop_name,
      Reuniões: Math.round(c.minutos_reuniao / 60 * 10) / 10,
      "Follow-ups": Math.round(c.minutos_followup / 60 * 10) / 10,
    }));

  if (!data.length) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-gray-400 text-sm">
          Sem dados no período selecionado.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top Clientes por Horas Dedicadas</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit="h" />
            <Tooltip formatter={(v) => `${v}h`} />
            <Legend />
            <Bar dataKey="Reuniões" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Follow-ups" stackId="a" fill="#F97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}