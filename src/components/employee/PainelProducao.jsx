import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Award } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function PainelProducao({ employee }) {
  const productionHistory = employee.production_history || [];

  const chartData = productionHistory.map(h => ({
    mes: h.month,
    peças: h.parts,
    serviços: h.services,
    total: h.total
  }));

  const totalProduction = employee.production_parts + employee.production_parts_sales + employee.production_services;
  const totalCost = employee.salary + (employee.commission || 0) + (employee.bonus || 0);
  const productivity = totalCost > 0 ? ((totalProduction / totalCost) * 100).toFixed(0) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-lg border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg">Produção Total Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              R$ {totalProduction.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-2 border-green-200">
          <CardHeader>
            <CardTitle className="text-lg">Produtividade</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${productivity >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
              {productivity}%
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-2 border-purple-200">
          <CardHeader>
            <CardTitle className="text-lg">Engajamento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">
              {employee.engagement_score || 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 ? (
        <>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Evolução de Produção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} name="Total" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Produção por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="peças" fill="#10b981" name="Peças" />
                  <Bar dataKey="serviços" fill="#8b5cf6" name="Serviços" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="shadow-lg">
          <CardContent className="p-12 text-center">
            <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhum histórico de produção disponível</p>
            <p className="text-sm text-gray-500 mt-2">
              Os dados de produção mensal aparecerão aqui quando registrados
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}