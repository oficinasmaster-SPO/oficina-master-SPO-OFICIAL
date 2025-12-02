import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Target, TrendingUp, Users, Save, Calculator, Percent, ArrowRight, Info } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatNumber } from "../components/utils/formatters";
import { Badge } from "@/components/ui/badge";

export default function DesdobramentoMeta() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workshop, setWorkshop] = useState(null);
  const [employees, setEmployees] = useState([]);
  
  const [formData, setFormData] = useState({
    target_month_date: new Date().toISOString().slice(0, 7) + "-01", // Start of current month
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
      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === user.id);
      setWorkshop(userWorkshop);

      const allEmployees = await base44.entities.Employee.list();
      const activeEmployees = allEmployees.filter(e => e.status === "ativo" && e.workshop_id === userWorkshop?.id);
      setEmployees(activeEmployees);

      // Process Employees into Areas and Calculate Baselines
      const areas = {
        vendas: { employees: [] },
        comercial: { employees: [] },
        tecnico: { employees: [] }
      };

      const areaMap = {
        vendas: "vendas",
        comercial: "comercial",
        tecnico: "tecnico",
        marketing: "comercial", // Map marketing to comercial for simplicity if needed, or separate
        administrativo: "comercial" // Default others
      };

      // 1. Distribute Employees
      activeEmployees.forEach(emp => {
        const areaKey = areaMap[emp.area] || "comercial"; // Default mapping
        if (areas[areaKey]) {
           areas[areaKey].employees.push({
             id: emp.id,
             name: emp.full_name,
             area: emp.area,
             best_month_history: emp.best_month_history,
             baseline_revenue: emp.best_month_history?.revenue || 0,
             baseline_clients: emp.best_month_history?.clients || 0,
             is_new: !emp.best_month_history?.revenue
           });
        }
      });

      // 2. Calculate Benchmarks for "New" employees (Average of existing)
      Object.keys(areas).forEach(areaKey => {
         const emps = areas[areaKey].employees;
         const empsWithHistory = emps.filter(e => !e.is_new);
         
         let avgRevenue = 0;
         let avgClients = 0;

         if (empsWithHistory.length > 0) {
            avgRevenue = empsWithHistory.reduce((sum, e) => sum + e.baseline_revenue, 0) / empsWithHistory.length;
            avgClients = empsWithHistory.reduce((sum, e) => sum + e.baseline_clients, 0) / empsWithHistory.length;
         }

         // Apply benchmark to new employees
         areas[areaKey].employees = emps.map(e => {
            if (e.is_new) {
               return { 
                 ...e, 
                 baseline_revenue: avgRevenue, 
                 baseline_clients: Math.round(avgClients),
                 is_benchmark: true
               };
            }
            return e;
         });
      });

      setFormData(prev => ({ ...prev, areas }));

    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const growthFactor = 1 + (formData.growth_percentage / 100);

  const calculateGlobalMetrics = () => {
    if (!workshop?.best_month_history) return null;

    const best = workshop.best_month_history;
    const target_revenue = best.revenue_total * growthFactor;
    const target_clients = Math.round(best.customer_volume * growthFactor);
    
    const best_avg_ticket = best.customer_volume > 0 ? best.revenue_total / best.customer_volume : 0;
    const target_avg_ticket = target_clients > 0 ? target_revenue / target_clients : 0;
    const ticket_difference = target_avg_ticket - best_avg_ticket;
    const target_daily_clients = target_clients / 22; // Avg working days

    return {
      best,
      target_revenue,
      target_clients,
      best_avg_ticket,
      target_avg_ticket,
      ticket_difference,
      target_daily_clients,
      global_bonus: ticket_difference * target_clients // Bonus pool calculation concept
    };
  };

  const calculateEmployeeMetrics = (emp) => {
    const target_revenue = emp.baseline_revenue * growthFactor;
    const target_clients = Math.round(emp.baseline_clients * growthFactor);
    
    const baseline_avg_ticket = emp.baseline_clients > 0 ? emp.baseline_revenue / emp.baseline_clients : 0;
    const target_avg_ticket = target_clients > 0 ? target_revenue / target_clients : 0;
    const ticket_difference = target_avg_ticket - baseline_avg_ticket;
    
    // Bonus calculation: Share of the ticket increase
    const bonus = ticket_difference > 0 ? ticket_difference * target_clients * 0.5 : 0; // Simple rule: 50% of ticket gain goes to bonus pool for that emp (Example)

    return {
       ...emp,
       target_revenue,
       target_clients,
       target_avg_ticket,
       bonus
    };
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const globalMetrics = calculateGlobalMetrics();
      
      // 1. Save Breakdown Record
      const breakdownData = {
         workshop_id: workshop.id,
         target_month_date: formData.target_month_date,
         growth_percentage: formData.growth_percentage,
         global_metrics: globalMetrics,
         areas: formData.areas
      };

      // Note: In a real app we'd save this to GoalBreakdown entity. 
      // For now, we focus on updating Employees as requested.

      // 2. Update Employees
      const updatePromises = [];
      
      Object.keys(formData.areas).forEach(areaKey => {
         formData.areas[areaKey].employees.forEach(emp => {
            const metrics = calculateEmployeeMetrics(emp);
            
            // Update monthly_goals and coex_data
            const monthlyGoal = {
                month: formData.target_month_date.slice(0, 7), // YYYY-MM
                individual_goal: metrics.target_revenue,
                bonus_potential: metrics.bonus,
                target_clients: metrics.target_clients
            };

            // Prepare COEX data update (appending to history or setting current)
            // We'll update the `monthly_goals` field which is structured
            const promise = base44.entities.Employee.update(emp.id, {
                monthly_goals: monthlyGoal,
                // Optionally update COEX text if needed, but structured data is better
            });
            updatePromises.push(promise);
         });
      });

      await Promise.all(updatePromises);

      toast.success("Metas desdobradas e COEX atualizados com sucesso!");
      navigate(createPageUrl("Home")); // Or to COEX list

    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar desdobramento");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const globalMetrics = calculateGlobalMetrics();
  const hasWorkshopHistory = !!workshop?.best_month_history;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 py-12 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Desdobramento de Metas</h1>
          <p className="text-gray-600">Defina o crescimento desejado e distribua as metas automaticamente para sua equipe.</p>
        </div>

        {/* Configuration Card */}
        <Card className="border-t-4 border-t-blue-600 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Configuração de Crescimento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-8 items-center">
               {/* Best Month Display */}
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">Melhor Mês da Oficina</Label>
                  {hasWorkshopHistory ? (
                    <div className="mt-2">
                        <div className="text-2xl font-bold text-slate-800">
                            {formatCurrency(workshop.best_month_history.revenue_total)}
                        </div>
                        <div className="text-sm text-slate-500">
                            {workshop.best_month_history.customer_volume} clientes • {formatNumber(workshop.best_month_history.date)}
                        </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-amber-600 text-sm flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        Sem histórico cadastrado na oficina.
                    </div>
                  )}
               </div>

               {/* Growth Input */}
               <div>
                  <Label className="mb-2 block font-semibold">Quanto deseja crescer? (Meta)</Label>
                  <div className="flex items-center gap-4">
                      <div className="relative flex-1">
                        <Input 
                            type="number" 
                            className="text-xl font-bold h-14 pr-12"
                            value={formData.growth_percentage}
                            onChange={(e) => setFormData({...formData, growth_percentage: parseInt(e.target.value) || 0})}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</div>
                      </div>
                  </div>
               </div>

               {/* Result Preview */}
               {globalMetrics && (
                   <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                      <Label className="text-green-600 text-xs uppercase tracking-wider">Nova Meta Calculada</Label>
                      <div className="mt-2">
                          <div className="text-3xl font-bold text-green-700">
                              {formatCurrency(globalMetrics.target_revenue)}
                          </div>
                          <div className="text-sm text-green-600 font-medium">
                              {globalMetrics.target_clients} clientes projetados
                          </div>
                      </div>
                   </div>
               )}
            </div>
          </CardContent>
        </Card>

        {/* Areas Breakdown */}
        {Object.entries(formData.areas).map(([areaKey, areaData]) => {
            if (areaData.employees.length === 0) return null;

            return (
                <Card key={areaKey} className="overflow-hidden border-t-4 border-t-indigo-500">
                    <CardHeader className="bg-slate-50 border-b">
                        <div className="flex justify-between items-center">
                            <CardTitle className="capitalize flex items-center gap-2">
                                <Users className="w-5 h-5 text-indigo-600" />
                                Equipe {areaKey}
                            </CardTitle>
                            <Badge variant="secondary">{areaData.employees.length} colaboradores</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-xs">
                                    <tr>
                                        <th className="p-4">Colaborador</th>
                                        <th className="p-4">Base (Melhor Mês)</th>
                                        <th className="p-4 bg-green-50/50 text-green-800">Nova Meta (+{formData.growth_percentage}%)</th>
                                        <th className="p-4">Comissão/Bônus Est.</th>
                                        <th className="p-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {areaData.employees.map((emp) => {
                                        const metrics = calculateEmployeeMetrics(emp);
                                        return (
                                            <tr key={emp.id} className="hover:bg-slate-50">
                                                <td className="p-4 font-medium text-slate-900">
                                                    {emp.name}
                                                    {emp.is_new && <Badge variant="outline" className="ml-2 text-amber-600 border-amber-200 bg-amber-50">Novo</Badge>}
                                                </td>
                                                <td className="p-4 text-slate-600">
                                                    <div className="font-mono">{formatCurrency(emp.baseline_revenue)}</div>
                                                    <div className="text-xs">{emp.baseline_clients} clientes</div>
                                                    {emp.is_benchmark && <div className="text-[10px] text-amber-600 italic">Média da área</div>}
                                                </td>
                                                <td className="p-4 bg-green-50/30">
                                                    <div className="font-bold text-green-700 text-lg">{formatCurrency(metrics.target_revenue)}</div>
                                                    <div className="text-xs text-green-600 font-medium">{metrics.target_clients} clientes</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-medium text-purple-600">{formatCurrency(metrics.bonus)}</div>
                                                    <div className="text-xs text-slate-400">Potencial Bônus</div>
                                                </td>
                                                <td className="p-4">
                                                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Calculado</Badge>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            );
        })}

        <div className="flex justify-end gap-4 pt-4">
           <Button variant="outline" size="lg" onClick={() => navigate(-1)}>Cancelar</Button>
           <Button 
              size="lg" 
              onClick={handleSave} 
              disabled={saving || !hasWorkshopHistory}
              className="bg-green-600 hover:bg-green-700 text-white px-8 shadow-xl"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
              Confirmar e Atualizar COEX
           </Button>
        </div>

      </div>
    </div>
  );
}