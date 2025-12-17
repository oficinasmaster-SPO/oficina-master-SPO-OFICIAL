import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#84cc16'];

export function ModuleDistributionChart({ data }) {
  const chartData = data.map((item, idx) => ({
    name: item.module.charAt(0).toUpperCase() + item.module.slice(1),
    value: item.permissions,
    color: COLORS[idx % COLORS.length]
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição de Permissões por Módulo</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={(entry) => `${entry.name}: ${entry.value}`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function CoverageChart({ data }) {
  const chartData = data.map((item) => ({
    module: item.module.charAt(0).toUpperCase() + item.module.slice(1),
    coverage: item.coverage
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cobertura de Permissões (%)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="module" angle={-45} textAnchor="end" height={100} />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(value) => `${value}%`} />
            <Bar dataKey="coverage" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function RoleAnalyticsChart({ data }) {
  const chartData = data.map((item, idx) => ({
    name: item.role_name,
    permissions: item.system_roles_count,
    modules: item.modules_accessible,
    color: COLORS[idx % COLORS.length]
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise por Role Customizada</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="permissions" fill="#8b5cf6" name="Permissões" />
            <Bar dataKey="modules" fill="#10b981" name="Módulos" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}