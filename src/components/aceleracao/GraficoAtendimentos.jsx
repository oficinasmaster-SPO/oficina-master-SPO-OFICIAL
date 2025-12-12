import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ClipboardList } from "lucide-react";

export default function GraficoAtendimentos({ atendimentos = [] }) {
  const contarPorStatus = () => {
    const counts = {
      realizado: 0,
      faltou: 0,
      desmarcou: 0,
      participando: 0
    };

    atendimentos.forEach(a => {
      if (counts.hasOwnProperty(a.status)) {
        counts[a.status]++;
      }
    });

    return [
      { name: 'Realizados', value: counts.realizado, fill: '#10b981' },
      { name: 'Faltou', value: counts.faltou, fill: '#ef4444' },
      { name: 'Desmarcou', value: counts.desmarcou, fill: '#f59e0b' },
      { name: 'Participando', value: counts.participando, fill: '#8b5cf6' }
    ];
  };

  const data = contarPorStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          Status dos Atendimentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}