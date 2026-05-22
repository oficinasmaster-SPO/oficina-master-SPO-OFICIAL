import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function DashboardFinanceiro() {
  const { workshop } = useWorkshopContext();

  const { data: kpis, isLoading } = useQuery({
    queryKey: ['dashboard-financeiro', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return null;
      return await base44.functions.invoke('getFinancialDashboard', {
        workshopId: workshop.id,
        mes: new Date().toISOString().slice(0, 7)
      });
    },
    enabled: !!workshop?.id
  });

  if (isLoading || !kpis) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard Financeiro</h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Faturamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {kpis.kpis?.faturamento?.toFixed(2) || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">R$ {kpis.kpis?.lucro_liquido?.toFixed(2) || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Margem Líquida</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.kpis?.margem_liquida?.toFixed(1) || 0}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">TCMP²</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {kpis.kpis?.tcmp2?.toFixed(2) || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico DRE vs DFC */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>DRE - Receitas vs Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { name: 'Receitas', valor: kpis.kpis?.faturamento || 0 },
                { name: 'Despesas', valor: kpis.kpis?.despesas_totais || 0 },
                { name: 'Lucro', valor: kpis.kpis?.lucro_liquido || 0 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="valor" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fluxo de Caixa</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={[
                { name: 'Saldo Inicial', valor: kpis.cash_flow?.saldo_atual || 0 },
                { name: 'Entradas', valor: kpis.kpis?.entradas || 0 },
                { name: 'Saídas', valor: kpis.kpis?.saidas || 0 },
                { name: 'Saldo Final', valor: kpis.cash_flow?.projecao_30d || 0 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="valor" stroke="#82ca9d" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Contas a Receber */}
      <Card>
        <CardHeader>
          <CardTitle>Contas a Receber</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Aberto</p>
              <p className="text-xl font-bold">R$ {kpis.contas_receber?.valor_aberto?.toFixed(2) || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Vencido</p>
              <p className="text-xl font-bold text-red-600">R$ {kpis.contas_receber?.valor_vencido?.toFixed(2) || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-xl font-bold">{kpis.contas_receber?.total || 0} contas</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}