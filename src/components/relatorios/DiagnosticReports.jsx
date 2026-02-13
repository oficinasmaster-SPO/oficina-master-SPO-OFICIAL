import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Line, Bar } from "recharts";
import { ResponsiveContainer, LineChart, BarChart, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import jsPDF from "jspdf";
export default function DiagnosticReports({ filters }) {
  const [exporting, setExporting] = useState(false);

  const exportToPDF = (data) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Evolução de Diagnósticos', 14, 20);
    doc.setFontSize(10);
    doc.text(`${data.workshop} - ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
    
    let y = 40;
    data.data.forEach(item => {
      doc.text(`${item.month}: F1=${item.fase1}, F2=${item.fase2}, F3=${item.fase3}, F4=${item.fase4}`, 14, y);
      y += 7;
    });
    
    doc.save(`diagnosticos-${new Date().toISOString().split('T')[0]}.pdf`);
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

  const { data: diagnostics = [], isLoading } = useQuery({
    queryKey: ['diagnostics-report', workshop?.id, filters],
    queryFn: async () => {
      if (!workshop?.id) return [];
      
      const allDiagnostics = await base44.entities.Diagnostic.filter({ workshop_id: workshop.id });
      
      return allDiagnostics.filter(d => {
        if (!d.created_date) return false;
        
        const createdDate = new Date(d.created_date);
        if (filters.startDate && createdDate < new Date(filters.startDate)) return false;
        if (filters.endDate && createdDate > new Date(filters.endDate)) return false;
        
        return true;
      });
    },
    enabled: !!workshop?.id
  });

  const evolutionData = React.useMemo(() => {
    const grouped = diagnostics.reduce((acc, d) => {
      const date = new Date(d.created_date);
      const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      if (!acc[monthKey]) {
        acc[monthKey] = { 
          month: monthKey, 
          sortDate: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
          fase1: 0, 
          fase2: 0, 
          fase3: 0, 
          fase4: 0 
        };
      }
      acc[monthKey][`fase${d.phase}`] = (acc[monthKey][`fase${d.phase}`] || 0) + 1;
      return acc;
    }, {});
    
    return Object.values(grouped).sort((a, b) => a.sortDate - b.sortDate);
  }, [diagnostics]);

  const handleExportPDF = () => {
    setExporting(true);
    try {
      exportToPDF({
        data: evolutionData,
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
      exportToCSV(evolutionData, 'evolucao-diagnosticos.csv');
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
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Evolução de Fases ao Longo do Tempo
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
          {evolutionData.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhum diagnóstico encontrado no período selecionado</p>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="fase1" stroke="#ef4444" name="Fase 1" />
                <Line type="monotone" dataKey="fase2" stroke="#f59e0b" name="Fase 2" />
                <Line type="monotone" dataKey="fase3" stroke="#3b82f6" name="Fase 3" />
                <Line type="monotone" dataKey="fase4" stroke="#10b981" name="Fase 4" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distribuição Atual de Fases</CardTitle>
        </CardHeader>
        <CardContent>
          {diagnostics.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Sem dados disponíveis</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { fase: 'Fase 1', count: diagnostics.filter(d => d.phase === 1).length },
                { fase: 'Fase 2', count: diagnostics.filter(d => d.phase === 2).length },
                { fase: 'Fase 3', count: diagnostics.filter(d => d.phase === 3).length },
                { fase: 'Fase 4', count: diagnostics.filter(d => d.phase === 4).length }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fase" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}