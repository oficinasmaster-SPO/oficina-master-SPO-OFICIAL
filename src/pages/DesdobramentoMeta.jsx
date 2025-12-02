import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Target, TrendingUp, Users, Save, Printer, RefreshCw, Info } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatNumber } from "../components/utils/formatters";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function DesdobramentoMeta() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workshop, setWorkshop] = useState(null);
  
  const [formData, setFormData] = useState({
    target_month_date: new Date().toISOString().slice(0, 7) + "-01",
    growth_percentage: 20,
    areas: {
      vendas: { employees: [] },
      comercial: { employees: [] },
      tecnico: { employees: [] }
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const workshops = await base44.entities.Workshop.filter({ owner_id: user.id });
      const userWorkshop = workshops[0];
      
      if (!userWorkshop) {
          toast.error("Oficina não encontrada");
          setLoading(false);
          return;
      }
      
      setWorkshop(userWorkshop);

      const activeEmployees = await base44.entities.Employee.filter({ workshop_id: userWorkshop.id, status: "ativo" });

      // Initialize Areas
      const areas = {
        vendas: { title: "Área de Vendas", employees: [] },
        comercial: { title: "Área Comercial", employees: [] },
        tecnico: { title: "Área Técnica", employees: [] }
      };

      const areaMap = {
        vendas: "vendas",
        comercial: "comercial",
        tecnico: "tecnico",
        marketing: "comercial",
        administrativo: "comercial"
      };

      // Distribute Employees
      activeEmployees.forEach(emp => {
        const areaKey = areaMap[emp.area] || "comercial";
        if (areas[areaKey]) {
           areas[areaKey].employees.push({
             id: emp.id,
             name: emp.full_name,
             area: emp.area,
             // Use history or defaults
             best_revenue: emp.best_month_history?.revenue || 0,
             best_clients: emp.best_month_history?.clients || 0,
             is_new: !emp.best_month_history?.revenue
           });
        }
      });

      setFormData(prev => ({ ...prev, areas }));

    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  // Helper to calculate employee metrics row
  const calculateRow = (emp, growthPct) => {
    const factor = 1 + (growthPct / 100);
    
    const best_revenue = emp.best_revenue || 0;
    const best_clients = emp.best_clients || 0;
    const best_avg_ticket = best_clients > 0 ? best_revenue / best_clients : 0;

    const target_revenue = best_revenue * factor;
    const target_clients = Math.round(best_clients * factor);
    // Ensure minimum 1 client if revenue exists to avoid div by zero or weird stats
    const safe_target_clients = target_clients === 0 && target_revenue > 0 ? 1 : target_clients;
    
    const target_daily_clients = safe_target_clients / 22;
    const target_avg_ticket = safe_target_clients > 0 ? target_revenue / safe_target_clients : 0;
    
    // Difference in Ticket (Target Ticket - Best Ticket)
    // User prompt: "Diferença Ticket M + %"
    const ticket_difference = target_avg_ticket - best_avg_ticket;
    
    // Bonus: "Bonificação Global da Meta"
    // User logic: "precisa deixar uma área para estabelecer BONIFICAÇÃO... ou a cada x faturamento"
    // For now, simple calculation based on ticket increase or revenue volume
    // Example: 10% of the REVENUE INCREASE goes to bonus pool? Or fixed?
    // Prompt image has "R$ 200,50" etc.
    // Let's assume a formula: (Revenue Increase * 0.5%) + (Ticket Increase * Clients * 10%)?
    // Let's keep it simple: Difference in Ticket * Clients * 0.5
    const bonus = Math.max(0, ticket_difference * safe_target_clients);

    return {
        ...emp,
        best_revenue,
        best_clients,
        best_avg_ticket,
        target_revenue,
        target_clients: safe_target_clients,
        target_daily_clients,
        target_avg_ticket,
        ticket_difference,
        bonus
    };
  };

  const calculateAreaTotal = (employees, growthPct) => {
      const rows = employees.map(e => calculateRow(e, growthPct));
      return rows.reduce((acc, curr) => ({
          best_revenue: acc.best_revenue + curr.best_revenue,
          best_clients: acc.best_clients + curr.best_clients,
          target_revenue: acc.target_revenue + curr.target_revenue,
          target_clients: acc.target_clients + curr.target_clients,
          bonus: acc.bonus + curr.bonus
      }), { best_revenue: 0, best_clients: 0, target_revenue: 0, target_clients: 0, bonus: 0 });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [];
      
      // Iterate all areas and employees to update their goals
      Object.values(formData.areas).forEach(area => {
          area.employees.forEach(emp => {
              const row = calculateRow(emp, formData.growth_percentage);
              
              // Update Employee Record with new goal
              // Logic: Update 'monthly_goals' for current month target
              const monthlyGoal = {
                  month: formData.target_month_date.slice(0, 7),
                  individual_goal: row.target_revenue,
                  target_clients: row.target_clients,
                  bonus_potential: row.bonus
              };

              // Also update 'best_month_history' if needed? No, user said "automatically update when collaborator beats goal".
              // That happens elsewhere (daily log/sales input). Here we just set the goal.
              
              updates.push(base44.entities.Employee.update(emp.id, {
                  monthly_goals: monthlyGoal
              }));
          });
      });

      // Also save the breakdown snapshot if needed, but updating employees is the key
      await Promise.all(updates);
      
      toast.success("Metas desdobradas e distribuídas com sucesso!");
      
      // Notify (Stub)
      toast.info("Notificações de atualização enviadas para a equipe (Simulação)");

    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar metas");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
    
    // Header
    doc.setFontSize(18);
    doc.text(workshop?.name || "Oficina", 14, 15);
    doc.setFontSize(12);
    doc.text("Desdobramento Completo de Metas", 14, 22);
    
    let yPos = 30;

    Object.entries(formData.areas).forEach(([key, area]) => {
        if (area.employees.length === 0) return;

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 255);
        doc.text(area.title, 14, yPos);
        yPos += 5;

        const headers = [
            ["Colaborador", "Melhor Mês (R$)", "Clientes", "Ticket Médio", "Meta (R$)", "Meta Clientes", "Média Diária", "Ticket Meta", "Diferença", "Bônus"]
        ];

        const data = area.employees.map(emp => {
            const r = calculateRow(emp, formData.growth_percentage);
            return [
                emp.name,
                formatCurrency(r.best_revenue),
                r.best_clients,
                formatCurrency(r.best_avg_ticket),
                formatCurrency(r.target_revenue),
                r.target_clients,
                r.target_daily_clients.toFixed(1),
                formatCurrency(r.target_avg_ticket),
                formatCurrency(r.ticket_difference),
                formatCurrency(r.bonus)
            ];
        });

        doc.autoTable({
            startY: yPos,
            head: headers,
            body: data,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
            styles: { fontSize: 8, cellPadding: 2 }
        });

        yPos = doc.lastAutoTable.finalY + 15;
        
        // Add a new page if running out of space
        if (yPos > 180) {
            doc.addPage();
            yPos = 20;
        }
    });

    doc.save("desdobramento-metas.pdf");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-lg shadow-sm border">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Target className="w-6 h-6 text-blue-600" />
                    Desdobramento Completo de Metas
                </h1>
                <p className="text-gray-500 text-sm mt-1">Defina o crescimento e espelhe o melhor resultado histórico.</p>
            </div>
            
            <div className="flex items-center gap-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                <div>
                    <Label className="text-blue-800 text-xs uppercase font-bold">Crescimento Alvo</Label>
                    <div className="flex items-center mt-1">
                        <Input 
                            type="number" 
                            value={formData.growth_percentage} 
                            onChange={e => setFormData({...formData, growth_percentage: Number(e.target.value)})}
                            className="w-20 h-8 font-bold text-right border-blue-300"
                        />
                        <span className="ml-2 text-blue-700 font-bold text-lg">%</span>
                    </div>
                </div>
                <div className="h-8 w-px bg-blue-200 mx-2"></div>
                <div>
                    <Label className="text-blue-800 text-xs uppercase font-bold">Mês Alvo</Label>
                    <Input 
                        type="month" 
                        value={formData.target_month_date.slice(0, 7)}
                        onChange={e => setFormData({...formData, target_month_date: e.target.value + "-01"})}
                        className="h-8 border-blue-300"
                    />
                </div>
            </div>

            <div className="flex gap-2">
                <Button variant="outline" onClick={handlePrint}>
                    <Printer className="w-4 h-4 mr-2" /> PDF
                </Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Salvar Distribuição
                </Button>
            </div>
        </div>

        {/* Content - The Big Table */}
        <div className="space-y-8">
            {Object.entries(formData.areas).map(([key, area]) => {
                if (area.employees.length === 0) return null;
                const totals = calculateAreaTotal(area.employees, formData.growth_percentage);
                const totalFactor = 1 + (formData.growth_percentage / 100);
                
                return (
                    <Card key={key} className="border-t-4 border-t-blue-600 shadow-md overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b pb-2">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-lg font-bold text-blue-900">{area.title}</CardTitle>
                                <div className="flex gap-4 text-sm">
                                    <div className="bg-white px-3 py-1 rounded border text-gray-600">
                                        Melhor Histórico: <span className="font-bold text-gray-900">{formatCurrency(totals.best_revenue)}</span>
                                    </div>
                                    <div className="bg-green-100 px-3 py-1 rounded border border-green-200 text-green-800">
                                        Meta da Área: <span className="font-bold">{formatCurrency(totals.target_revenue)}</span>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
                                    <tr>
                                        <th className="p-3 border-b w-64">Nome do Colaborador</th>
                                        <th className="p-3 border-b text-right bg-blue-50/50 text-blue-800 border-l border-blue-100">Faturamento<br/>Melhor Mês</th>
                                        <th className="p-3 border-b text-right bg-blue-50/50 text-blue-800">Qtd.<br/>Clientes</th>
                                        <th className="p-3 border-b text-right bg-blue-50/50 text-blue-800 border-r border-blue-100">Ticket<br/>Médio</th>
                                        
                                        <th className="p-3 border-b text-right bg-green-50/50 text-green-800 border-l border-green-100">Meta<br/>Faturamento (+{formData.growth_percentage}%)</th>
                                        <th className="p-3 border-b text-right bg-green-50/50 text-green-800">Meta<br/>Clientes</th>
                                        <th className="p-3 border-b text-right bg-green-50/50 text-green-800">Média<br/>Diária</th>
                                        <th className="p-3 border-b text-right bg-green-50/50 text-green-800 border-r border-green-100">Ticket<br/>Desejado</th>
                                        
                                        <th className="p-3 border-b text-right text-purple-700">Diferença<br/>Ticket</th>
                                        <th className="p-3 border-b text-right text-amber-700 font-bold">Bonificação<br/>Estimada</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {area.employees.map(emp => {
                                        const row = calculateRow(emp, formData.growth_percentage);
                                        return (
                                            <tr key={emp.id} className="hover:bg-slate-50 group transition-colors">
                                                <td className="p-3 font-medium text-gray-900 border-r">{emp.name}</td>
                                                
                                                {/* Historical Data */}
                                                <td className="p-3 text-right text-gray-600 font-mono border-r bg-blue-50/10 group-hover:bg-blue-50/30">{formatCurrency(row.best_revenue)}</td>
                                                <td className="p-3 text-right text-gray-600 border-r bg-blue-50/10 group-hover:bg-blue-50/30">{row.best_clients}</td>
                                                <td className="p-3 text-right text-gray-600 border-r bg-blue-50/10 group-hover:bg-blue-50/30">{formatCurrency(row.best_avg_ticket)}</td>
                                                
                                                {/* Target Data */}
                                                <td className="p-3 text-right font-bold text-green-700 border-r bg-green-50/10 group-hover:bg-green-50/30">{formatCurrency(row.target_revenue)}</td>
                                                <td className="p-3 text-right text-green-700 border-r bg-green-50/10 group-hover:bg-green-50/30">{row.target_clients}</td>
                                                <td className="p-3 text-right text-green-700 border-r bg-green-50/10 group-hover:bg-green-50/30">{row.target_daily_clients.toFixed(1)}</td>
                                                <td className="p-3 text-right text-green-700 border-r bg-green-50/10 group-hover:bg-green-50/30">{formatCurrency(row.target_avg_ticket)}</td>
                                                
                                                {/* Analysis */}
                                                <td className="p-3 text-right text-purple-600 border-r">{formatCurrency(row.ticket_difference)}</td>
                                                <td className="p-3 text-right font-bold text-amber-600 bg-amber-50/20">{formatCurrency(row.bonus)}</td>
                                            </tr>
                                        );
                                    })}
                                    {/* Total Row */}
                                    <tr className="bg-gray-100 font-bold border-t-2 border-gray-200">
                                        <td className="p-3 text-gray-800 border-r">TOTAL DA ÁREA</td>
                                        <td className="p-3 text-right border-r">{formatCurrency(totals.best_revenue)}</td>
                                        <td className="p-3 text-right border-r">{totals.best_clients}</td>
                                        <td className="p-3 text-right border-r">-</td>
                                        <td className="p-3 text-right text-green-800 border-r">{formatCurrency(totals.target_revenue)}</td>
                                        <td className="p-3 text-right text-green-800 border-r">{totals.target_clients}</td>
                                        <td className="p-3 text-right text-green-800 border-r">{(totals.target_clients / 22).toFixed(1)}</td>
                                        <td className="p-3 text-right border-r">-</td>
                                        <td className="p-3 text-right border-r">-</td>
                                        <td className="p-3 text-right text-amber-700">{formatCurrency(totals.bonus)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                );
            })}
        </div>

      </div>
    </div>
  );
}