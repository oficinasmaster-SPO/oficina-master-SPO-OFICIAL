import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { Line, Bar } from "recharts";
import { ResponsiveContainer, LineChart, BarChart, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { formatCurrency } from "../utils/formatters";
import jsPDF from "jspdf";

export default function FinancialReports({ filters }) {
  const [exporting, setExporting] = useState(false);

  const exportToPDF = (data) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Performance Financeira', 14, 20);
    doc.setFontSize(10);
    doc.text(`${data.workshop} - ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
    
    let y = 40;
    data.data.revenueData.forEach(item => {
      doc.text(`${item.month}: Proj=R$${item.projetado.toFixed(0)}, Real=R$${item.realizado.toFixed(0)}`, 14, y);
      y += 7;
    });
    
    doc.save(`financeiro-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToCSV = (data, filename) => {
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => row[h]).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const { data: workshop } = useQuery({
    queryKey: ['workshop-current'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const workshops = await base44.entities.Workshop.filter({ owner_id: user.id });
      return workshops[0];
    }
  });

  const { data: monthlyGoals = [], isLoading } = useQuery({
    queryKey: ['monthly-goals-history', workshop?.id, filters],
    queryFn: async () => {
      if (!workshop?.id) return [];
      
      const history = await base44.entities.MonthlyGoalHistory.filter({ workshop_id: workshop.id });
      
      return history.filter(h => {
        if (!h.month) return false;
        
        const monthDate = new Date(h.month + '-01');
        if (filters.startDate && monthDate < new Date(filters.startDate)) return false;
        if (filters.endDate && monthDate > new Date(filters.endDate)) return false;
        
        return true;
      }).sort((a, b) => a.month.localeCompare(b.month));
    },
    enabled: !!workshop?.id
  });

  const revenueData = React.useMemo(() => {
    return monthlyGoals.map(m => ({
      month: new Date(m.month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      projetado: m.projected_revenue || 0,
      realizado: m.actual_revenue || 0,
      pecas: m.revenue_parts || 0,
      servicos: m.revenue_services || 0
    }));
  }, [monthlyGoals]);

  const profitabilityData = React.useMemo(() => {
    return monthlyGoals.map(m => ({
      month: new Date(m.month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      lucro: m.profit_percentage || 0,
      rentabilidade: m.profitability_percentage || 0
    }));
  }, [monthlyGoals]);

  const ticketData = React.useMemo(() => {
    return monthlyGoals.map(m => ({
      month: new Date(m.month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      ticketMedio: m.average_ticket || 0,
      clientes: m.customer_volume || 0
    }));
  }, [monthlyGoals]);

  const handleExportPDF = () => {
    setExporting(true);
    try {
      exportToPDF({
        data: { revenueData, profitabilityData, ticketData },
        workshop: workshop?.name || 'Oficina'
      });
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      toast.error("Erro ao exportar PDF");
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = () => {
    try {
      const flatData = monthlyGoals.map(m => ({
        mes: m.month,
        projetado: m.projected_revenue,
        realizado: m.actual_revenue,
        pecas: m.revenue_parts,
        servicos: m.revenue_services,
        lucro_percentual: m.profit_percentage,
        rentabilidade: m.profitability_percentage,
        ticket_medio: m.average_ticket,
        clientes: m.customer_volume
      }));
      
      exportToCSV(flatData, 'performance-financeira.csv');
      toast.success("CSV exportado com sucesso!");
    } catch (error) {
      toast.error("Erro ao exportar CSV");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Evolução de Faturamento
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={handleExportCSV} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button onClick={handleExportPDF} disabled={exporting} size="sm">
                {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {revenueData.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhum dado financeiro encontrado</p>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="projetado" stroke="#3b82f6" name="Projetado" />
                <Line type="monotone" dataKey="realizado" stroke="#10b981" name="Realizado" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Lucratividade e Rentabilidade</CardTitle>
          </CardHeader>
          <CardContent>
            {profitabilityData.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={profitabilityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                  <Legend />
                  <Bar dataKey="lucro" fill="#10b981" name="Lucro %" />
                  <Bar dataKey="rentabilidade" fill="#3b82f6" name="Rentabilidade %" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ticket Médio e Volume de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            {ticketData.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={ticketData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" tickFormatter={(value) => formatCurrency(value)} />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="ticketMedio" stroke="#8b5cf6" name="Ticket Médio" />
                  <Line yAxisId="right" type="monotone" dataKey="clientes" stroke="#f59e0b" name="Clientes" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}