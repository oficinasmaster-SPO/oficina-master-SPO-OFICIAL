import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";

export default function IntegrationMetricsChart() {
  const { data: metricsData = [] } = useQuery({
    queryKey: ["integration-metrics"],
    queryFn: async () => {
      // Mock data - substituir por dados reais
      return [
        { name: "Google Calendar", eventos: 45, syncs: 12 },
        { name: "Google Meet", eventos: 28, syncs: 8 },
        { name: "Kiwify", eventos: 0, syncs: 0 },
        { name: "Asas", eventos: 67, syncs: 15 },
        { name: "Webhook", eventos: 23, syncs: 23 }
      ];
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Uso das Integrações (Últimos 7 dias)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={metricsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip 
              contentStyle={{ fontSize: 12 }}
              formatter={(value) => [`${value} eventos`, "Total"]}
            />
            <Bar dataKey="eventos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}