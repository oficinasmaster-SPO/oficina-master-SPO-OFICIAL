import React, { useState, useMemo } from "react";
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
  const isEntrepreneur = filters.diagnosticType === 'empresario';

  const exportToPDF = (data) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(isEntrepreneur ? 'Evolução de Perfil Empresário' : 'Evolução de Diagnósticos', 14, 20);
    doc.setFontSize(10);
    doc.text(`${data.workshop} - ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
    
    let y = 40;
    data.data.forEach(item => {
      if (isEntrepreneur) {
        doc.text(`${item.month}: Adv=${item.aventureiro}%, Emp=${item.empreendedor}%, Ges=${item.gestor}%`, 14, y);
      } else {
        doc.text(`${item.month}: F1=${item.fase1}%, F2=${item.fase2}%, F3=${item.fase3}%, F4=${item.fase4}%`, 14, y);
      }
      y += 7;
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });
    
    doc.save(`diagnosticos-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return;
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
    queryKey: ['diagnostics-report', workshop?.id, filters, isEntrepreneur],
    queryFn: async () => {
      if (!workshop?.id) return [];
      
      let allDiagnostics = [];
      if (isEntrepreneur) {
        allDiagnostics = await base44.entities.EntrepreneurDiagnostic.filter({ workshop_id: workshop.id });
      } else {
        allDiagnostics = await base44.entities.Diagnostic.filter({ workshop_id: workshop.id });
      }
      
      return allDiagnostics.filter(d => {
        if (!d.created_date) return false;
        
        const createdDate = new Date(d.created_date);
        if (filters.startDate) {
          const startDate = new Date(filters.startDate);
          startDate.setHours(0, 0, 0, 0);
          if (createdDate < startDate) return false;
        }
        
        if (filters.endDate) {
          const endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59, 999);
          if (createdDate > endDate) return false;
        }
        
        return true;
      });
    },
    enabled: !!workshop?.id
  });

  const evolutionData = useMemo(() => {
    // Determine grouping based on date range
    let groupBy = 'month';
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 60) groupBy = 'day';
      else if (diffDays > 730) groupBy = 'year';
    }

    const grouped = diagnostics.reduce((acc, d) => {
      const date = new Date(d.created_date);
      let key, sortDate, label;

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
        sortDate = date.getTime();
        label = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      } else if (groupBy === 'year') {
        key = date.getFullYear().toString();
        sortDate = new Date(date.getFullYear(), 0, 1).getTime();
        label = key;
      } else {
        // Default to month
        key = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        sortDate = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
        label = key;
      }
      
      if (!acc[key]) {
        acc[key] = { 
          month: label, 
          sortDate: sortDate,
          total: 0
        };
        if (isEntrepreneur) {
          acc[key].aventureiro = 0;
          acc[key].empreendedor = 0;
          acc[key].gestor = 0;
        } else {
          acc[key].fase1 = 0;
          acc[key].fase2 = 0;
          acc[key].fase3 = 0;
          acc[key].fase4 = 0;
        }
      }
      
      if (isEntrepreneur) {
        const profile = d.dominant_profile;
        if (profile === 'aventureiro') acc[key].aventureiro++;
        else if (profile === 'empreendedor') acc[key].empreendedor++;
        else if (profile === 'gestor') acc[key].gestor++;
      } else {
        const phase = parseInt(d.phase, 10);
        if ([1, 2, 3, 4].includes(phase)) {
          acc[key][`fase${phase}`] = (acc[key][`fase${phase}`] || 0) + 1;
        }
      }
      acc[key].total += 1;
      return acc;
    }, {});
    
    // Convert counts to percentages
    return Object.values(grouped)
      .sort((a, b) => a.sortDate - b.sortDate)
      .map(item => {
        const total = item.total || 1; // Avoid division by zero
        const result = { ...item };
        
        if (isEntrepreneur) {
          result.aventureiro = parseFloat(((item.aventureiro / total) * 100).toFixed(1));
          result.empreendedor = parseFloat(((item.empreendedor / total) * 100).toFixed(1));
          result.gestor = parseFloat(((item.gestor / total) * 100).toFixed(1));
        } else {
          result.fase1 = parseFloat(((item.fase1 / total) * 100).toFixed(1));
          result.fase2 = parseFloat(((item.fase2 / total) * 100).toFixed(1));
          result.fase3 = parseFloat(((item.fase3 / total) * 100).toFixed(1));
          result.fase4 = parseFloat(((item.fase4 / total) * 100).toFixed(1));
        }
        return result;
      });
  }, [diagnostics, filters, isEntrepreneur]);

  const currentDistributionData = useMemo(() => {
    if (diagnostics.length === 0) return [];
    const total = diagnostics.length;

    if (isEntrepreneur) {
      return [
        { label: 'Aventureiro', percentage: parseFloat(((diagnostics.filter(d => d.dominant_profile === 'aventureiro').length / total) * 100).toFixed(1)) },
        { label: 'Empreendedor', percentage: parseFloat(((diagnostics.filter(d => d.dominant_profile === 'empreendedor').length / total) * 100).toFixed(1)) },
        { label: 'Gestor', percentage: parseFloat(((diagnostics.filter(d => d.dominant_profile === 'gestor').length / total) * 100).toFixed(1)) }
      ];
    } else {
      return [
        { label: 'Fase 1', percentage: parseFloat(((diagnostics.filter(d => parseInt(d.phase) === 1).length / total) * 100).toFixed(1)) },
        { label: 'Fase 2', percentage: parseFloat(((diagnostics.filter(d => parseInt(d.phase) === 2).length / total) * 100).toFixed(1)) },
        { label: 'Fase 3', percentage: parseFloat(((diagnostics.filter(d => parseInt(d.phase) === 3).length / total) * 100).toFixed(1)) },
        { label: 'Fase 4', percentage: parseFloat(((diagnostics.filter(d => parseInt(d.phase) === 4).length / total) * 100).toFixed(1)) }
      ];
    }
  }, [diagnostics, isEntrepreneur]);

  const handleExportPDF = () => {
    setExporting(true);
    try {
      exportToPDF({
        data: evolutionData,
        workshop: workshop?.name || 'Oficina'
      });
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error(error);
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
      console.error(error);
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
              {isEntrepreneur ? "Evolução do Perfil Empresarial" : "Evolução de Fases ao Longo do Tempo"}
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
                <YAxis domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                <Legend />
                {isEntrepreneur ? (
                  <>
                    <Line type="monotone" dataKey="aventureiro" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} name="Aventureiro" connectNulls />
                    <Line type="monotone" dataKey="empreendedor" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} name="Empreendedor" connectNulls />
                    <Line type="monotone" dataKey="gestor" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Gestor" connectNulls />
                  </>
                ) : (
                  <>
                    <Line type="monotone" dataKey="fase1" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} name="Fase 1" connectNulls />
                    <Line type="monotone" dataKey="fase2" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} name="Fase 2" connectNulls />
                    <Line type="monotone" dataKey="fase3" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} name="Fase 3" connectNulls />
                    <Line type="monotone" dataKey="fase4" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Fase 4" connectNulls />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {isEntrepreneur ? "Distribuição Atual de Perfis" : "Distribuição Atual de Fases"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {diagnostics.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Sem dados disponíveis</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={currentDistributionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                <Tooltip formatter={(value) => [`${value}%`, 'Porcentagem']} />
                <Bar dataKey="percentage" fill="#3b82f6" name="Porcentagem">
                  {/* Optional: Customize bar colors if desired, using Cell from recharts */}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}