import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { INTELLIGENCE_AREAS } from "@/components/lib/clientIntelligenceConstants";

export default function AnalyticsByArea({ analytics }) {
  if (!analytics?.dorasPorArea) return null;

  const chartData = analytics.dorasPorArea.map(item => ({
    area: INTELLIGENCE_AREAS[item.area]?.label || item.area,
    dores: item.count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📊 Dores por Área
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Sem dados para análise</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="area" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="dores" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}