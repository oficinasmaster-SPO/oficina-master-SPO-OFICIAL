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
  const isDISC = filters.diagnosticType === 'disc';
  const isWorkload = filters.diagnosticType === 'carga';

  const [productivityTeamFilter, setProductivityTeamFilter] = useState('all'); // 'all', 'commercial', 'technical'

  const exportToPDF = (data) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    let title = 'Evolução de Diagnósticos';
    if (isEntrepreneur) title = 'Evolução de Perfil Empresário';
    if (isMaturity) title = 'Evolução de Maturidade do Colaborador';
    if (isProductivity) title = 'Evolução de Produtividade vs Salário';
    if (isPerformance) title = 'Evolução de Desempenho Comportamental e Técnico';
    if (isDISC) title = 'Evolução de Perfil Comportamental (DISC)';
    if (isWorkload) title = 'Evolução de Carga de Trabalho';
    
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
      } else if (isDISC) {
        doc.text(`${item.month}: Dom=${item.dominant}%, Inf=${item.influential}%, Est=${item.stable}%, Conf=${item.conscientious}%`, 14, y);
      } else if (isWorkload) {
        doc.text(`${item.month}: Bal=${item.balanced}%, Sob=${item.overloaded}%, Oci=${item.underutilized}%`, 14, y);
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

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-workload', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id || !isWorkload) return [];
      return await base44.entities.Employee.filter({ workshop_id: workshop.id, status: 'ativo' });
    },
    enabled: !!workshop?.id && isWorkload
  });

  const { data: diagnostics = [], isLoading } = useQuery({
    queryKey: ['diagnostics-report', workshop?.id, filters, isEntrepreneur, isMaturity, isProductivity, isPerformance, isDISC, isWorkload],
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
      } else if (isDISC) {
        allDiagnostics = await base44.entities.DISCDiagnostic.filter({ workshop_id: workshop.id });
      } else if (isWorkload) {
        allDiagnostics = await base44.entities.WorkloadDiagnostic.filter({ workshop_id: workshop.id });
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
        } else if (isDISC) {
          acc[key].dominant = 0;
          acc[key].influential = 0;
          acc[key].stable = 0;
          acc[key].conscientious = 0;
        } else if (isWorkload) {
          acc[key].balanced = 0;
          acc[key].overloaded = 0;
          acc[key].underutilized = 0;
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
          else if (classification === 'promocao') acc[key].promotion++;
        } else if (isDISC) {
          // Identify primary profile (highest score)
          // In DISCDiagnostic entity: 
          // dominant_profile enum: ["executor_d", "comunicador_i", "planejador_s", "analista_c"]
          const profile = d.dominant_profile;
          
          if (profile === 'executor_d') acc[key].dominant++;
          else if (profile === 'comunicador_i') acc[key].influential++;
          else if (profile === 'planejador_s') acc[key].stable++;
          else if (profile === 'analista_c') acc[key].conscientious++;
        } else if (isWorkload) {
          // Process workload_data array
          const workloadData = d.workload_data || [];
          if (workloadData.length === 0) {
             acc[key].total -= 1; 
             return acc;
          }
          
          let hasData = false;
          workloadData.forEach(w => {
             const worked = parseFloat(w.weekly_hours_worked || 0);
             const ideal = parseFloat(w.ideal_weekly_hours || 40); // Default 40 if missing
             
             if (ideal > 0) {
               hasData = true;
               const ratio = worked / ideal;
               if (ratio > 1.1) acc[key].overloaded++;
               else if (ratio < 0.9) acc[key].underutilized++;
               else acc[key].balanced++;
             }
          });
          
          if (!hasData) {
             acc[key].total -= 1;
             return acc;
          }
          // Note: total here refers to diagnostic records, but for percentage calculation in map we need total employees.
          // The current structure counts diagnostic records as 'total' for other types (one record per employee usually).
          // But WorkloadDiagnostic is aggregated. 
          // So we need to override 'total' with the number of evaluated items in this record.
          acc[key].total = (acc[key].total - 1) + workloadData.length; // Replace the incremented 1 with actual count
          return acc; 
          
        } else {
        const phase = parseInt(d.phase, 10);
        if ([1, 2, 3, 4].includes(phase)) {
          acc[key][`fase${phase}`] = (acc[key][`fase${phase}`] || 0) + 1;
        }
        }
        if (!isWorkload) acc[key].total += 1;
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
        } else if (isDISC) {
          result.dominant = parseFloat(((item.dominant / total) * 100).toFixed(1));
          result.influential = parseFloat(((item.influential / total) * 100).toFixed(1));
          result.stable = parseFloat(((item.stable / total) * 100).toFixed(1));
          result.conscientious = parseFloat(((item.conscientious / total) * 100).toFixed(1));
        } else {
          result.fase1 = parseFloat(((item.fase1 / total) * 100).toFixed(1));
          result.fase2 = parseFloat(((item.fase2 / total) * 100).toFixed(1));
          result.fase3 = parseFloat(((item.fase3 / total) * 100).toFixed(1));
          result.fase4 = parseFloat(((item.fase4 / total) * 100).toFixed(1));
        }
        return result;
        });
        }, [diagnostics, filters, isEntrepreneur, isMaturity, isProductivity, isPerformance, isDISC, productivityTeamFilter]);

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
    } else if (isDISC) {
      return [
        { label: 'Dominante', percentage: parseFloat(((diagnostics.filter(d => d.dominant_profile === 'executor_d').length / total) * 100).toFixed(1)) },
        { label: 'Influente', percentage: parseFloat(((diagnostics.filter(d => d.dominant_profile === 'comunicador_i').length / total) * 100).toFixed(1)) },
        { label: 'Estável', percentage: parseFloat(((diagnostics.filter(d => d.dominant_profile === 'planejador_s').length / total) * 100).toFixed(1)) },
        { label: 'Conforme', percentage: parseFloat(((diagnostics.filter(d => d.dominant_profile === 'analista_c').length / total) * 100).toFixed(1)) }
      ];
    } else if (isWorkload) {
      // Get latest diagnostic
      const latest = diagnostics.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
      if (!latest || !latest.workload_data) return [];
      
      const workloadData = latest.workload_data;
      let balanced = 0, overloaded = 0, underutilized = 0, count = 0;
      
      workloadData.forEach(w => {
         const worked = parseFloat(w.weekly_hours_worked || 0);
         const ideal = parseFloat(w.ideal_weekly_hours || 40); 
         if (ideal > 0) {
           count++;
           const ratio = worked / ideal;
           if (ratio > 1.1) overloaded++;
           else if (ratio < 0.9) underutilized++;
           else balanced++;
         }
      });
      
      const safeTotal = count || 1;
      
      return [
        { label: 'Equilibrado', percentage: parseFloat(((balanced / safeTotal) * 100).toFixed(1)) },
        { label: 'Sobrecaregado', percentage: parseFloat(((overloaded / safeTotal) * 100).toFixed(1)) },
        { label: 'Ocioso', percentage: parseFloat(((underutilized / safeTotal) * 100).toFixed(1)) }
      ];
    } else {
      return [
        { label: 'Fase 1', percentage: parseFloat(((diagnostics.filter(d => parseInt(d.phase) === 1).length / total) * 100).toFixed(1)) },
        { label: 'Fase 2', percentage: parseFloat(((diagnostics.filter(d => parseInt(d.phase) === 2).length / total) * 100).toFixed(1)) },
        { label: 'Fase 3', percentage: parseFloat(((diagnostics.filter(d => parseInt(d.phase) === 3).length / total) * 100).toFixed(1)) },
        { label: 'Fase 4', percentage: parseFloat(((diagnostics.filter(d => parseInt(d.phase) === 4).length / total) * 100).toFixed(1)) }
      ];
    }
  }, [diagnostics, isEntrepreneur, isMaturity, isProductivity, isPerformance, isDISC, isWorkload, productivityTeamFilter]);

  // Partner Comparison Data
  const partnerComparisonData = useMemo(() => {
    if (!isWorkload || !diagnostics.length || !employees.length) return null;
    
    const partners = employees.filter(e => e.is_partner || e.job_role === 'socio');
    if (partners.length < 2) return null; 
    
    const latest = diagnostics.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
    if (!latest || !latest.workload_data) return null;
    
    return partners.map(partner => {
      const entry = latest.workload_data.find(w => w.employee_id === partner.id);
      
      let status = "Sem dados";
      let load = 0;
      
      if (entry) {
         const worked = parseFloat(entry.weekly_hours_worked || 0);
         const ideal = parseFloat(entry.ideal_weekly_hours || 40);
         if (ideal > 0) {
           const ratio = worked / ideal;
           load = Math.round(ratio * 100);
           if (ratio > 1.1) status = "Sobrecaregado";
           else if (ratio < 0.9) status = "Ocioso";
           else status = "Equilibrado";
         }
      }
      
      return {
        name: partner.full_name,
        role: partner.position || "Sócio",
        status,
        load
      };
    }).filter(p => p.status !== "Sem dados"); 
    
  }, [isWorkload, diagnostics, employees]);

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

  // Partner Comparison Data
  const partnerComparisonData = useMemo(() => {
    if (!isWorkload || !diagnostics.length || !employees.length) return null;
    
    // Filter partners
    const partners = employees.filter(e => e.is_partner || e.job_role === 'socio');
    if (partners.length < 2) return null; // Only show if more than 1 partner
    
    // Get latest diagnostic
    const latest = diagnostics.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
    if (!latest || !latest.workload_data) return null;
    
    // Map partners to workload data
    return partners.map(partner => {
      // Find workload entry for this partner
      // First try by employee_id, then by name match if possible (risky), or assume workload_data has metadata
      // The sample data had employee_id: None. We need to handle this.
      // If no employee_id in workload_data, we can't reliably map. 
      // But let's try to find by employee_id if it exists.
      const entry = latest.workload_data.find(w => w.employee_id === partner.id);
      
      let status = "Sem dados";
      let load = 0;
      
      if (entry) {
         const worked = parseFloat(entry.weekly_hours_worked || 0);
         const ideal = parseFloat(entry.ideal_weekly_hours || 40);
         if (ideal > 0) {
           const ratio = worked / ideal;
           load = Math.round(ratio * 100);
           if (ratio > 1.1) status = "Sobrecaregado";
           else if (ratio < 0.9) status = "Ocioso";
           else status = "Equilibrado";
         }
      }
      
      return {
        name: partner.full_name,
        role: partner.position || "Sócio",
        status,
        load
      };
    }).filter(p => p.status !== "Sem dados"); // Only show partners with data
    
  }, [isWorkload, diagnostics, employees]);

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
              {isEntrepreneur ? "Evolução do Perfil Empresarial" : isMaturity ? "Evolução da Maturidade dos Colaboradores" : isProductivity ? "Evolução Produtividade vs Salário" : isPerformance ? "Evolução de Desempenho Comportamental e Técnico" : isDISC ? "Evolução de Perfil Comportamental (DISC)" : isWorkload ? "Evolução de Carga de Trabalho" : "Evolução de Fases ao Longo do Tempo"}
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
                ) : isDISC ? (
                  <>
                    <Line type="monotone" dataKey="dominant" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} name="Dominante" connectNulls />
                    <Line type="monotone" dataKey="influential" stroke="#eab308" strokeWidth={3} dot={{ r: 4 }} name="Influente" connectNulls />
                    <Line type="monotone" dataKey="stable" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Estável" connectNulls />
                    <Line type="monotone" dataKey="conscientious" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} name="Conforme" connectNulls />
                  </>
                ) : isWorkload ? (
                  <>
                    <Line type="monotone" dataKey="balanced" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Equilibrado" connectNulls />
                    <Line type="monotone" dataKey="overloaded" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} name="Sobrecaregado" connectNulls />
                    <Line type="monotone" dataKey="underutilized" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} name="Ocioso" connectNulls />
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
            {isEntrepreneur ? "Distribuição Atual de Perfis" : isMaturity ? "Distribuição Atual da Maturidade" : isProductivity ? "Distribuição Atual de Produtividade" : isPerformance ? "Distribuição Comportamental e Técnica" : isDISC ? "Distribuição de Perfil Comportamental" : isWorkload ? "Distribuição de Carga de Trabalho" : "Distribuição Atual de Fases"}
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

      {partnerComparisonData && partnerComparisonData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Comparativo de Sócios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {partnerComparisonData.map((partner, index) => (
                <div key={index} className="p-4 border rounded-lg shadow-sm">
                  <h3 className="font-bold text-lg">{partner.name}</h3>
                  <p className="text-sm text-gray-500 mb-2">{partner.role}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm font-medium">Carga:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      partner.status === 'Equilibrado' ? 'bg-green-100 text-green-800' :
                      partner.status === 'Sobrecaregado' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {partner.status} ({partner.load}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}