import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Line, Bar } from "recharts";
import { ResponsiveContainer, LineChart, BarChart, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import jsPDF from "jspdf";

export default function DiagnosticReports({ filters }) {
  const [exporting, setExporting] = useState(false);
  const isEntrepreneur = filters.diagnosticType === 'empresario';
  const isMaturity = filters.diagnosticType === 'maturidade';
  const isProductivity = filters.diagnosticType === 'producao';
  const isPerformance = filters.diagnosticType === 'desempenho';

  const [productivityTeamFilter, setProductivityTeamFilter] = useState('all'); // 'all', 'commercial', 'technical'

  const exportToPDF = (data) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    let title = 'Evolução de Diagnósticos';
    if (isEntrepreneur) title = 'Evolução de Perfil Empresário';
    if (isMaturity) title = 'Evolução de Maturidade do Colaborador';
    if (isProductivity) title = 'Evolução de Produtividade vs Salário';
    if (isPerformance) title = 'Evolução de Desempenho Comportamental e Técnico';
    
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.text(`${data.workshop} - ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
    
    let y = 40;
    data.data.forEach(item => {
      if (isEntrepreneur) {
        doc.text(`${item.month}: Adv=${item.aventureiro}%, Emp=${item.empreendedor}%, Ges=${item.gestor}%`, 14, y);
      } else if (isMaturity) {
        doc.text(`${item.month}: Aux=${item.auxiliar}%, Jr=${item.junior}%, Pl=${item.pleno}%, Sr=${item.senior}%`, 14, y);
      } else if (isProductivity) {
        doc.text(`${item.month}: Lim=${item.limit}%, Ide=${item.ideal}%, Exc=${item.excess}%`, 14, y);
      } else if (isPerformance) {
        doc.text(`${item.month}: Dem=${item.dismissal}%, Obs=${item.observation}%, TT=${item.technical_training}%, TE=${item.emotional_training}%, Inv=${item.investment}%, Pro=${item.promotion}%, Rec=${item.recognition}%`, 14, y);
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
    queryKey: ['diagnostics-report', workshop?.id, filters, isEntrepreneur, isMaturity, isProductivity, isPerformance],
    queryFn: async () => {
      if (!workshop?.id) return [];
      
      let allDiagnostics = [];
      if (isEntrepreneur) {
        allDiagnostics = await base44.entities.EntrepreneurDiagnostic.filter({ workshop_id: workshop.id });
      } else if (isMaturity) {
        allDiagnostics = await base44.entities.CollaboratorMaturityDiagnostic.filter({ workshop_id: workshop.id });
      } else if (isProductivity) {
        allDiagnostics = await base44.entities.ProductivityDiagnostic.filter({ workshop_id: workshop.id });
      } else if (isPerformance) {
        allDiagnostics = await base44.entities.PerformanceMatrixDiagnostic.filter({ workshop_id: workshop.id });
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
        } else if (isMaturity) {
          acc[key].auxiliar = 0;
          acc[key].junior = 0;
          acc[key].pleno = 0;
          acc[key].senior = 0;
        } else if (isProductivity) {
          acc[key].limit = 0;
          acc[key].ideal = 0;
          acc[key].excess = 0;
        } else if (isPerformance) {
          acc[key].dismissal = 0;
          acc[key].observation = 0;
          acc[key].technical_training = 0;
          acc[key].emotional_training = 0;
          acc[key].investment = 0;
          acc[key].promotion = 0;
          acc[key].recognition = 0;
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
        } else if (isMaturity) {
        const level = d.maturity_level;
        if (level === 'bebe') acc[key].auxiliar++;
        else if (level === 'crianca') acc[key].junior++;
        else if (level === 'adolescente') acc[key].pleno++;
        else if (level === 'adulto') acc[key].senior++;
        } else if (isProductivity) {
           // Ensure counters exist even if key existed before
           if (acc[key].limit === undefined) acc[key].limit = 0;
           if (acc[key].ideal === undefined) acc[key].ideal = 0;
           if (acc[key].excess === undefined) acc[key].excess = 0;

           const role = d.employee_role || 'outros';
           const isSales = ['vendas', 'comercial', 'consultor_vendas'].includes(role);
           const isTech = ['tecnico', 'tecnico_lider', 'funilaria_pintura'].includes(role);

           // Apply Team Filter
           let skip = false;
           if (productivityTeamFilter === 'commercial' && !isSales) skip = true;
           if (productivityTeamFilter === 'technical' && !isTech) skip = true;

           if (!skip) {
               let target = 9; // Default target
               if (isSales) target = 4;
               else if (isTech) target = 9;

               // Force float conversion for safety
               const totalCost = parseFloat(d.total_cost || 0);
               const totalProd = parseFloat(d.total_productivity || 0);
               const percentage = totalProd > 0 ? (totalCost / totalProd) * 100 : 0;

               if (percentage > target) {
                   acc[key].excess = (acc[key].excess || 0) + 1;
               } else if (percentage >= (target / 2)) {
                   acc[key].ideal = (acc[key].ideal || 0) + 1;
               } else {
                   acc[key].limit = (acc[key].limit || 0) + 1;
               }
           } else {
               // Decrement total because this record was skipped
               acc[key].total -= 1;
               return acc; 
           }

        } else if (isPerformance) {
          const classification = d.classification;
          if (classification === 'demissao') acc[key].dismissal++;
          else if (classification === 'observacao') acc[key].observation++;
          else if (classification === 'treinamento_tecnico') acc[key].technical_training++;
          else if (classification === 'treinamento_emocional') acc[key].emotional_training++;
          else if (classification === 'investimento') acc[key].investment++;
          else if (classification === 'reconhecimento') acc[key].recognition++;
          else if (classification === 'promocao') acc[key].promotion++; // Assuming potential future value
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
        } else if (isMaturity) {
          result.auxiliar = parseFloat(((item.auxiliar / total) * 100).toFixed(1));
          result.junior = parseFloat(((item.junior / total) * 100).toFixed(1));
          result.pleno = parseFloat(((item.pleno / total) * 100).toFixed(1));
          result.senior = parseFloat(((item.senior / total) * 100).toFixed(1));
        } else if (isProductivity) {
          result.limit = parseFloat(((item.limit / total) * 100).toFixed(1));
          result.ideal = parseFloat(((item.ideal / total) * 100).toFixed(1));
          result.excess = parseFloat(((item.excess / total) * 100).toFixed(1));
        } else if (isPerformance) {
          result.dismissal = parseFloat(((item.dismissal / total) * 100).toFixed(1));
          result.observation = parseFloat(((item.observation / total) * 100).toFixed(1));
          result.technical_training = parseFloat(((item.technical_training / total) * 100).toFixed(1));
          result.emotional_training = parseFloat(((item.emotional_training / total) * 100).toFixed(1));
          result.investment = parseFloat(((item.investment / total) * 100).toFixed(1));
          result.promotion = parseFloat(((item.promotion / total) * 100).toFixed(1));
          result.recognition = parseFloat(((item.recognition / total) * 100).toFixed(1));
        } else {
          result.fase1 = parseFloat(((item.fase1 / total) * 100).toFixed(1));
          result.fase2 = parseFloat(((item.fase2 / total) * 100).toFixed(1));
          result.fase3 = parseFloat(((item.fase3 / total) * 100).toFixed(1));
          result.fase4 = parseFloat(((item.fase4 / total) * 100).toFixed(1));
        }
        return result;
        });
        }, [diagnostics, filters, isEntrepreneur, isMaturity, isProductivity, isPerformance, productivityTeamFilter]);

  const currentDistributionData = useMemo(() => {
    if (diagnostics.length === 0) return [];
    const total = diagnostics.length;

    if (isEntrepreneur) {
      return [
        { label: 'Aventureiro', percentage: parseFloat(((diagnostics.filter(d => d.dominant_profile === 'aventureiro').length / total) * 100).toFixed(1)) },
        { label: 'Empreendedor', percentage: parseFloat(((diagnostics.filter(d => d.dominant_profile === 'empreendedor').length / total) * 100).toFixed(1)) },
        { label: 'Gestor', percentage: parseFloat(((diagnostics.filter(d => d.dominant_profile === 'gestor').length / total) * 100).toFixed(1)) }
      ];
    } else if (isMaturity) {
      return [
        { label: 'Auxiliar', percentage: parseFloat(((diagnostics.filter(d => d.maturity_level === 'bebe').length / total) * 100).toFixed(1)) },
        { label: 'Júnior', percentage: parseFloat(((diagnostics.filter(d => d.maturity_level === 'crianca').length / total) * 100).toFixed(1)) },
        { label: 'Pleno', percentage: parseFloat(((diagnostics.filter(d => d.maturity_level === 'adolescente').length / total) * 100).toFixed(1)) },
        { label: 'Sênior', percentage: parseFloat(((diagnostics.filter(d => d.maturity_level === 'adulto').length / total) * 100).toFixed(1)) }
      ];
    } else if (isProductivity) {
        // Calculate distribution based on same logic
        let limit = 0, ideal = 0, excess = 0, count = 0;
        
        diagnostics.forEach(d => {
           const role = d.employee_role || 'outros';
           const isSales = ['vendas', 'comercial', 'consultor_vendas'].includes(role);
           const isTech = ['tecnico', 'tecnico_lider', 'funilaria_pintura'].includes(role);
           
           let skip = false;
           if (productivityTeamFilter === 'commercial' && !isSales) skip = true;
           if (productivityTeamFilter === 'technical' && !isTech) skip = true;
           
           if (!skip) {
               count++;
               let target = 9;
               if (isSales) target = 4;
               else if (isTech) target = 9;
               
               const totalCost = parseFloat(d.total_cost || 0);
               const totalProd = parseFloat(d.total_productivity || 0);
               const percentage = totalProd > 0 ? (totalCost / totalProd) * 100 : 0;
               
               if (percentage > target) {
                   excess++;
               } else if (percentage >= (target / 2)) {
                   ideal++;
               } else {
                   limit++;
               }
           }
        });
        
        const safeTotal = count || 1;
        return [
            { label: 'Limite', percentage: parseFloat(((limit / safeTotal) * 100).toFixed(1)) },
            { label: 'Ideal', percentage: parseFloat(((ideal / safeTotal) * 100).toFixed(1)) },
            { label: 'Excesso', percentage: parseFloat(((excess / safeTotal) * 100).toFixed(1)) }
        ];
    } else if (isPerformance) {
      return [
        { label: 'Demissão', percentage: parseFloat(((diagnostics.filter(d => d.classification === 'demissao').length / total) * 100).toFixed(1)) },
        { label: 'Observação', percentage: parseFloat(((diagnostics.filter(d => d.classification === 'observacao').length / total) * 100).toFixed(1)) },
        { label: 'Treinamento Técnico', percentage: parseFloat(((diagnostics.filter(d => d.classification === 'treinamento_tecnico').length / total) * 100).toFixed(1)) },
        { label: 'Treinamento Emocional', percentage: parseFloat(((diagnostics.filter(d => d.classification === 'treinamento_emocional').length / total) * 100).toFixed(1)) },
        { label: 'Investimento', percentage: parseFloat(((diagnostics.filter(d => d.classification === 'investimento').length / total) * 100).toFixed(1)) },
        { label: 'Promoção', percentage: parseFloat(((diagnostics.filter(d => d.classification === 'promocao').length / total) * 100).toFixed(1)) },
        { label: 'Reconhecimento', percentage: parseFloat(((diagnostics.filter(d => d.classification === 'reconhecimento').length / total) * 100).toFixed(1)) }
      ];
    } else {
      return [
        { label: 'Fase 1', percentage: parseFloat(((diagnostics.filter(d => parseInt(d.phase) === 1).length / total) * 100).toFixed(1)) },
        { label: 'Fase 2', percentage: parseFloat(((diagnostics.filter(d => parseInt(d.phase) === 2).length / total) * 100).toFixed(1)) },
        { label: 'Fase 3', percentage: parseFloat(((diagnostics.filter(d => parseInt(d.phase) === 3).length / total) * 100).toFixed(1)) },
        { label: 'Fase 4', percentage: parseFloat(((diagnostics.filter(d => parseInt(d.phase) === 4).length / total) * 100).toFixed(1)) }
      ];
    }
  }, [diagnostics, isEntrepreneur, isMaturity, isProductivity, isPerformance, productivityTeamFilter]);

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
              {isEntrepreneur ? "Evolução do Perfil Empresarial" : isMaturity ? "Evolução da Maturidade dos Colaboradores" : isProductivity ? "Evolução Produtividade vs Salário" : isPerformance ? "Evolução de Desempenho Comportamental e Técnico" : "Evolução de Fases ao Longo do Tempo"}
            </CardTitle>
            <div className="flex gap-2 items-center">
              {isProductivity && (
                <Select value={productivityTeamFilter} onValueChange={setProductivityTeamFilter}>
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue placeholder="Filtro de Equipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Equipes</SelectItem>
                    <SelectItem value="commercial">Equipe Comercial</SelectItem>
                    <SelectItem value="technical">Equipe Técnica</SelectItem>
                  </SelectContent>
                </Select>
              )}
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
                ) : isMaturity ? (
                  <>
                    <Line type="monotone" dataKey="auxiliar" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} name="Auxiliar" connectNulls />
                    <Line type="monotone" dataKey="junior" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} name="Júnior" connectNulls />
                    <Line type="monotone" dataKey="pleno" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} name="Pleno" connectNulls />
                    <Line type="monotone" dataKey="senior" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Sênior" connectNulls />
                  </>
                ) : isProductivity ? (
                  <>
                    <Line type="monotone" dataKey="limit" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} name="Limite" connectNulls />
                    <Line type="monotone" dataKey="ideal" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Ideal" connectNulls />
                    <Line type="monotone" dataKey="excess" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} name="Excesso" connectNulls />
                  </>
                ) : isPerformance ? (
                  <>
                    <Line type="monotone" dataKey="dismissal" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} name="Demissão" connectNulls />
                    <Line type="monotone" dataKey="observation" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} name="Observação" connectNulls />
                    <Line type="monotone" dataKey="technical_training" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} name="Treinamento Técnico" connectNulls />
                    <Line type="monotone" dataKey="emotional_training" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} name="Treinamento Emocional" connectNulls />
                    <Line type="monotone" dataKey="investment" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Investimento" connectNulls />
                    <Line type="monotone" dataKey="promotion" stroke="#eab308" strokeWidth={3} dot={{ r: 4 }} name="Promoção" connectNulls />
                    <Line type="monotone" dataKey="recognition" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4 }} name="Reconhecimento" connectNulls />
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
            {isEntrepreneur ? "Distribuição Atual de Perfis" : isMaturity ? "Distribuição Atual da Maturidade" : isProductivity ? "Distribuição Atual de Produtividade" : isPerformance ? "Distribuição Comportamental e Técnica" : "Distribuição Atual de Fases"}
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