import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";

export default function IntegrationMetricsChart() {
  const { data: metricsData = [] } = useQuery({
    queryKey: ["integration-metrics"],
    queryFn: async () => {
      return [
        { name: "Calendar", eventos: 45 },
        { name: "Meet", eventos: 28 },
        { name: "Kiwify", eventos: 0 },
        { name: "Asas", eventos: 67 },
        { name: "Webhook", eventos: 23 }
      ];
    }
  });

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={metricsData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="name" 
          tick={{ fontSize: 10 }}
        />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip />
        <Bar dataKey="eventos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}