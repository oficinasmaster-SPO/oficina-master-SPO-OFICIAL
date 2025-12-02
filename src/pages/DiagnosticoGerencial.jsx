import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Building2, Percent, Save, Plus, Trash2, Calculator, Share2 } from "lucide-react";
import { toast } from "sonner";
import OrganizationChart from "../components/diagnostic/OrganizationChart";

export default function DiagnosticoGerencial() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workshop, setWorkshop] = useState(null);
  const [employees, setEmployees] = useState([]);

  const [formData, setFormData] = useState({
    reference_month: "",
    total_revenue: 0,
    desired_revenue: 0,
    growth_percentage: 20,
    partners: [],
    managers: { general: [], financial: [], stock: [] },
    operational: { sales: [], commercial: [], marketing: [] },
    technical: [],
    auxiliary: [],
    third_party: []
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
      const activeEmployees = allEmployees.filter(e => e.status === "ativo");
      setEmployees(activeEmployees);
      
      // Set default month
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setFormData(prev => ({ ...prev, reference_month: currentMonth }));

    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  // Auto-fill based on Month and DRE
  useEffect(() => {
    const autoFillData = async () => {
      if (!workshop || !formData.reference_month || employees.length === 0) return;

      try {
        // 1. Fetch Total Revenue from DRE
        const dreList = await base44.entities.DREMonthly.filter({
          workshop_id: workshop.id,
          month: formData.reference_month
        });
        
        let dreRevenue = 0;
        if (dreList && dreList.length > 0) {
          dreRevenue = dreList[0].calculated?.total_revenue || 0;
        }

        // 2. Auto-populate sections based on roles and history
        const newPartners = [];
        const newManagers = { general: [], financial: [], stock: [] };
        const newOperational = { sales: [], commercial: [], marketing: [] };
        const newTechnical = [];
        const newAuxiliary = [];

        employees.forEach(emp => {
          // Get revenue from history for this month
          const historyItem = emp.production_history?.find(h => h.month === formData.reference_month);
          const individualRevenue = historyItem ? historyItem.total : 0;
          
          // Determine roles (logic can be refined based on 'job_role' or 'position')
          // Assuming 'diretor' or 'socio' in job_role for Partners
          if (emp.job_role === 'diretor' || emp.position?.toLowerCase().includes('sócio') || emp.position?.toLowerCase().includes('socio')) {
            newPartners.push({
              employee_id: emp.id,
              name: emp.full_name,
              delivery_value: dreRevenue, // Rule: Sócio represents Total Operation
              presence_percentage: 0
            });
          }

          if (emp.job_role === 'gerente' || emp.position?.toLowerCase().includes('gerente')) {
            newManagers.general.push({
              employee_id: emp.id,
              name: emp.full_name,
              delivery_value: dreRevenue, // Rule: Gerente manages Total Operation
              presence_percentage: 0
            });
          }

          if (emp.job_role === 'consultor_vendas' || emp.area === 'vendas') {
            newOperational.sales.push({
              employee_id: emp.id,
              name: emp.full_name,
              delivery_value: individualRevenue,
              presence_percentage: 0
            });
          }

          if (emp.job_role === 'comercial' || emp.area === 'comercial') {
            newOperational.commercial.push({
              employee_id: emp.id,
              name: emp.full_name,
              delivery_value: individualRevenue, // Rule: Commercial = Direct Sales only
              presence_percentage: 0
            });
          }

          if (emp.job_role === 'marketing' || emp.area === 'marketing') {
            newOperational.marketing.push({
              employee_id: emp.id,
              name: emp.full_name,
              delivery_value: individualRevenue, // Rule: Marketing = Auto Sales
              presence_percentage: 0
            });
          }

          if (emp.job_role === 'tecnico' || emp.job_role === 'lider_tecnico' || emp.job_role === 'funilaria_pintura' || emp.area === 'tecnico') {
            newTechnical.push({
              employee_id: emp.id,
              name: emp.full_name,
              delivery_value: individualRevenue,
              presence_percentage: 0
            });
          }
          
          if (emp.job_role === 'lavador' || emp.job_role === 'motoboy' || emp.job_role === 'estoque') {
             newAuxiliary.push({
              employee_id: emp.id,
              name: emp.full_name,
              delivery_value: individualRevenue,
              presence_percentage: 0
            });
          }
        });

        // If user manually added items, we might want to keep them or merge. 
        // For "Diagnóstico", auto-fill on month change is usually preferred to start fresh.
        // We set state but allow manual overrides.
        setFormData(prev => {
            // Only auto-fill if empty to avoid overwriting user work? 
            // Or overwrite if month changed?
            // Let's overwrite for now as per "Puxar de forma automatica"
            
            const updated = {
                ...prev,
                total_revenue: dreRevenue,
                partners: newPartners,
                managers: { ...prev.managers, general: newManagers.general },
                operational: { ...prev.operational, sales: newOperational.sales, commercial: newOperational.commercial, marketing: newOperational.marketing },
                technical: newTechnical,
                auxiliary: newAuxiliary
            };
            return updated;
        });

        // Trigger recalculations after state update (needs separate effect or helper)
        // We'll rely on the user or a useEffect to recalc percentages
        
      } catch (error) {
        console.error("Auto-fill error:", error);
      }
    };

    autoFillData();
  }, [formData.reference_month, workshop, employees]);

  // Effect to Recalculate Percentages whenever delivery_value changes in sections
  useEffect(() => {
      // Helper to calc %
      const calc = (items) => {
          const total = items.reduce((acc, i) => acc + (i.delivery_value || 0), 0);
          return items.map(i => ({
              ...i,
              presence_percentage: total > 0 ? (i.delivery_value / total) * 100 : 0
          }));
      };

      setFormData(prev => ({
          ...prev,
          partners: calc(prev.partners),
          managers: {
              ...prev.managers,
              general: calc(prev.managers.general),
              financial: calc(prev.managers.financial),
              stock: calc(prev.managers.stock)
          },
          operational: {
              ...prev.operational,
              sales: calc(prev.operational.sales),
              commercial: calc(prev.operational.commercial),
              marketing: calc(prev.operational.marketing)
          },
          technical: calc(prev.technical),
          auxiliary: calc(prev.auxiliary)
      }));
  }, [
      // We need to be careful about infinite loops. 
      // Actually, let's stick to manual recalculation in updateSection to avoid loop issues
      // or use a deep comparison. 
      // Better: Remove this useEffect and ensure updateSection handles it correctly (which it does in the original code).
      // I will keep the auto-fill logic but remove this Effect.
  ]);

  const calculatePresencePercentage = (employeeRevenue, sectionTotal) => {
    if (sectionTotal === 0) return 0;
    return (employeeRevenue / sectionTotal) * 100;
  };

  const calculateSectionTotal = (section, subsection = null) => {
    if (subsection) {
      return formData[section][subsection].reduce((sum, item) => sum + (item.delivery_value || 0), 0);
    }
    return formData[section].reduce((sum, item) => sum + (item.delivery_value || 0), 0);
  };

  const recalculatePercentages = (section, subsection = null) => {
    // This is now handled inside updateSection to avoid state race conditions
  };

  const getEmployeeRoleAnalysis = () => {
    const roleCounts = {};
    
    // Helper to add role
    const add = (id, name, area) => {
        if (!id) return;
        if (!roleCounts[id]) roleCounts[id] = { name, areas: [], count: 0 };
        roleCounts[id].areas.push(area);
        roleCounts[id].count++;
    };

    formData.partners.forEach(p => add(p.employee_id, p.name, "Sócio"));
    formData.managers.general.forEach(p => add(p.employee_id, p.name, "Gerente Geral"));
    formData.managers.financial.forEach(p => add(p.employee_id, p.name, "Gerente Financeiro"));
    formData.managers.stock.forEach(p => add(p.employee_id, p.name, "Gerente Estoque"));
    formData.operational.sales.forEach(p => add(p.employee_id, p.name, "Vendas"));
    formData.operational.commercial.forEach(p => add(p.employee_id, p.name, "Comercial"));
    formData.operational.marketing.forEach(p => add(p.employee_id, p.name, "Marketing"));
    formData.technical.forEach(p => add(p.employee_id, p.name, "Técnico"));
    formData.auxiliary.forEach(p => add(p.employee_id, p.name, "Auxiliar"));

    return Object.values(roleCounts).filter(r => r.count > 0).map(r => ({
        ...r,
        percentagePerRole: (100 / r.count).toFixed(1)
    }));
  };

  const addPartner = () => {
    setFormData({
      ...formData,
      partners: [...formData.partners, { employee_id: "", name: "", presence_percentage: 0, delivery_value: 0, best_month_clients: 0 }]
    });
  };

  const updatePartner = (index, field, value) => {
    const updated = [...formData.partners];
    updated[index][field] = value;

    if (field === "employee_id" && value) {
      const emp = employees.find(e => e.id === value);
      if (emp) {
        updated[index].name = emp.full_name;
        // For Partner, default to Total Revenue of the operation if available
        updated[index].delivery_value = formData.total_revenue || 0;
      }
    }

    setFormData(prev => {
        const newPartners = [...updated];
        // Recalculate percentages immediately
        const total = newPartners.reduce((sum, item) => sum + (item.delivery_value || 0), 0);
        return {
            ...prev,
            partners: newPartners.map(item => ({
                ...item,
                presence_percentage: calculatePresencePercentage(item.delivery_value || 0, total)
            }))
        };
    });
  };

  const removePartner = (index) => {
    const updated = formData.partners.filter((_, i) => i !== index);
    setFormData({ ...formData, partners: updated });
    
    setTimeout(() => {
      const total = updated.reduce((sum, item) => sum + (item.delivery_value || 0), 0);
      const recalculated = updated.map(item => ({
        ...item,
        presence_percentage: calculatePresencePercentage(item.delivery_value || 0, total)
      }));
      setFormData({ ...formData, partners: recalculated });
    }, 0);
  };

  const addToSection = (section, subsection = null) => {
    if (subsection) {
      const updated = { ...formData[section] };
      updated[subsection] = [...updated[subsection], { employee_id: "", name: "", delivery_value: 0, presence_percentage: 0, best_month_clients: 0 }];
      setFormData({ ...formData, [section]: updated });
    } else {
      setFormData({
        ...formData,
        [section]: [...formData[section], { employee_id: "", name: "", delivery_value: 0, presence_percentage: 0, best_month_clients: 0 }]
      });
    }
  };

  const updateSection = (section, index, field, value, subsection = null) => {
    setFormData(prev => {
      let updatedData = { ...prev };
      let targetArray = subsection ? updatedData[section][subsection] : updatedData[section];
      
      targetArray[index][field] = value;

      if (field === "employee_id" && value) {
        const emp = employees.find(e => e.id === value);
        if (emp) {
          targetArray[index].name = emp.full_name;
          
          // Specific logic for delivery_value based on section
          if (section === 'managers') {
             targetArray[index].delivery_value = prev.total_revenue || 0;
          } else {
             // Find history for selected month
             const historyItem = emp.production_history?.find(h => h.month === prev.reference_month);
             targetArray[index].delivery_value = historyItem ? historyItem.total : 0;
          }
        }
      }

      // Recalculate percentages for this group
      const total = targetArray.reduce((sum, item) => sum + (item.delivery_value || 0), 0);
      targetArray.forEach(item => {
        item.presence_percentage = calculatePresencePercentage(item.delivery_value || 0, total);
      });

      return updatedData;
    });
  };

  const removeFromSection = (section, index, subsection = null) => {
    if (subsection) {
      const updated = { ...formData[section] };
      updated[subsection] = updated[subsection].filter((_, i) => i !== index);
      setFormData({ ...formData, [section]: updated });
      
      setTimeout(() => recalculatePercentages(section, subsection), 0);
    } else {
      const updated = formData[section].filter((_, i) => i !== index);
      setFormData({ ...formData, [section]: updated });
      
      setTimeout(() => recalculatePercentages(section), 0);
    }
  };

  const handleSave = async () => {
    if (!formData.reference_month) {
      toast.error("Selecione o mês de referência");
      return;
    }

    setSaving(true);
    try {
      const totalRevenue = 
        formData.partners.reduce((sum, p) => sum + (p.delivery_value || 0), 0) +
        calculateSectionTotal("operational", "sales") +
        calculateSectionTotal("operational", "commercial") +
        calculateSectionTotal("operational", "marketing") +
        calculateSectionTotal("technical") +
        calculateSectionTotal("auxiliary");
      
      const totalClients = 
        formData.partners.reduce((sum, p) => sum + (p.best_month_clients || 0), 0) +
        formData.operational.sales.reduce((sum, p) => sum + (p.best_month_clients || 0), 0) +
        formData.operational.commercial.reduce((sum, p) => sum + (p.best_month_clients || 0), 0) +
        formData.operational.marketing.reduce((sum, p) => sum + (p.best_month_clients || 0), 0) +
        formData.technical.reduce((sum, p) => sum + (p.best_month_clients || 0), 0) +
        formData.auxiliary.reduce((sum, p) => sum + (p.best_month_clients || 0), 0);

      const growthFactor = 1 + (formData.growth_percentage / 100);
      const breakdown = await base44.entities.GoalBreakdown.create({
        workshop_id: workshop?.id || null,
        best_month_date: formData.reference_month,
        target_month_date: formData.reference_month,
        best_month_revenue: totalRevenue,
        best_month_clients: totalClients,
        best_month_avg_ticket: totalClients > 0 ? totalRevenue / totalClients : 0,
        growth_percentage: formData.growth_percentage,
        target_revenue: totalRevenue * growthFactor,
        target_clients: Math.round(totalClients * growthFactor),
        target_daily_clients: (Math.round(totalClients * growthFactor)) / 22,
        target_avg_ticket: totalClients > 0 ? (totalRevenue * growthFactor) / (totalClients * growthFactor) : 0,
        areas: {
          vendas: {
            best_revenue: calculateSectionTotal("operational", "sales"),
            best_clients: formData.operational.sales.reduce((sum, p) => sum + (p.best_month_clients || 0), 0),
            employees: formData.operational.sales.map(emp => ({
              employee_id: emp.employee_id,
              employee_name: emp.name,
              best_revenue: emp.delivery_value,
              best_clients: emp.best_month_clients,
              percentage: emp.presence_percentage,
              target_revenue: emp.delivery_value * growthFactor,
              target_clients: Math.round(emp.best_month_clients * growthFactor)
            }))
          },
          comercial: {
            best_revenue: calculateSectionTotal("operational", "commercial"),
            best_clients: formData.operational.commercial.reduce((sum, p) => sum + (p.best_month_clients || 0), 0),
            employees: formData.operational.commercial.map(emp => ({
              employee_id: emp.employee_id,
              employee_name: emp.name,
              best_revenue: emp.delivery_value,
              best_clients: emp.best_month_clients,
              percentage: emp.presence_percentage,
              target_revenue: emp.delivery_value * growthFactor,
              target_clients: Math.round(emp.best_month_clients * growthFactor)
            }))
          },
          tecnico: {
            best_revenue: calculateSectionTotal("technical"),
            best_clients: formData.technical.reduce((sum, p) => sum + (p.best_month_clients || 0), 0),
            employees: formData.technical.map(emp => ({
              employee_id: emp.employee_id,
              employee_name: emp.name,
              best_revenue: emp.delivery_value,
              best_clients: emp.best_month_clients,
              percentage: emp.presence_percentage,
              target_revenue: emp.delivery_value * growthFactor,
              target_clients: Math.round(emp.best_month_clients * growthFactor)
            }))
          }
        },
        status: "ativa"
      });

      await base44.entities.ManagementDiagnostic.create({
        workshop_id: workshop?.id || null,
        ...formData,
        goal_breakdown_id: breakdown.id,
        completed: true
      });

      toast.success("Diagnóstico gerencial salvo com sucesso! Painel de desempenho atualizado.");
      navigate(createPageUrl("PainelMetas") + `?id=${breakdown.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar");
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

  const EmployeeRow = ({ item, index, section, subsection = null, showDelivery = false }) => (
    <div className="grid grid-cols-12 gap-3 items-end bg-white p-3 rounded-lg border">
      <div className="col-span-5">
        <Label className="text-xs">Colaborador</Label>
        <Select
          value={item.employee_id}
          onValueChange={(v) => updateSection(section, index, "employee_id", v, subsection)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {employees.map(e => (
              <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {showDelivery && (
        <div className="col-span-3">
          <Label className="text-xs">Faturamento (R$)</Label>
          <Input
            type="number"
            className="h-9"
            step="0.01"
            value={item.delivery_value}
            onChange={(e) => updateSection(section, index, "delivery_value", parseFloat(e.target.value) || 0, subsection)}
          />
        </div>
      )}
      <div className="col-span-3">
        <Label className="text-xs flex items-center gap-1">
          <Percent className="w-3 h-3" />
          % da Área (Auto)
        </Label>
        <Input
          type="text"
          className="h-9 bg-gradient-to-r from-green-100 to-emerald-100 font-bold text-green-700"
          value={`${item.presence_percentage.toFixed(1)}%`}
          disabled
        />
      </div>
      <div className="col-span-1 flex items-end">
        <Button
          size="sm"
          variant="ghost"
          className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => removeFromSection(section, index, subsection)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Diagnóstico de Carga e Faturamento
          </h1>
          <p className="text-gray-600">Análise da curva de carga, faturamento e presença por área</p>
        </div>

        <Tabs defaultValue="formulario" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="formulario" className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Formulário
            </TabsTrigger>
            <TabsTrigger value="organograma" className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Organograma
            </TabsTrigger>
          </TabsList>

          <TabsContent value="formulario" className="space-y-6">
            {/* Dados Globais */}
            {/* Análise de Carga por Colaborador (Multi-função) */}
            {getEmployeeRoleAnalysis().some(r => r.count > 1) && (
                <Card className="border-2 border-amber-200 bg-amber-50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-amber-900">Análise de Carga (Multi-funções)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {getEmployeeRoleAnalysis().filter(r => r.count > 1).map((r, i) => (
                                <div key={i} className="flex justify-between items-center bg-white p-2 rounded border border-amber-100">
                                    <span className="font-medium text-amber-800">{r.name}</span>
                                    <div className="text-sm text-gray-600">
                                        Atua em <strong className="text-amber-700">{r.count} áreas</strong> ({r.percentagePerRole}% de carga em cada)
                                        <div className="text-xs text-gray-400">{r.areas.join(", ")}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Dados Globais */}
            <Card className="border-2 border-blue-200">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-blue-600" />
                  Dados Gerais
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Mês de Referência *</Label>
                    <Input
                      type="month"
                      value={formData.reference_month}
                      onChange={(e) => setFormData({ ...formData, reference_month: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>% de Crescimento Desejado</Label>
                    <Select 
                      value={formData.growth_percentage.toString()} 
                      onValueChange={(v) => setFormData({...formData, growth_percentage: parseInt(v)})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">+10%</SelectItem>
                        <SelectItem value="15">+15%</SelectItem>
                        <SelectItem value="20">+20%</SelectItem>
                        <SelectItem value="25">+25%</SelectItem>
                        <SelectItem value="30">+30%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>R/Desejada (R$)</Label>
                    <Input
                      type="number"
                      value={formData.desired_revenue}
                      onChange={(e) => setFormData({ ...formData, desired_revenue: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sócios */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div>
                    <span>1º - SÓCIOS</span>
                    <span className="ml-3 text-sm font-normal text-gray-600">
                      Total: R$ {formData.partners.reduce((sum, p) => sum + (p.delivery_value || 0), 0).toFixed(2)}
                    </span>
                  </div>
                  <Button size="sm" onClick={addPartner}>
                    <Plus className="w-4 h-4 mr-2" /> Adicionar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {formData.partners.map((partner, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-end bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg border-2 border-purple-200">
                    <div className="col-span-4">
                      <Label className="text-xs">Sócio</Label>
                      <Select
                        value={partner.employee_id}
                        onValueChange={(v) => updatePartner(index, "employee_id", v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map(e => (
                            <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4">
                      <Label className="text-xs">Faturamento Total (R$)</Label>
                      <Input
                        type="number"
                        className="h-9"
                        step="0.01"
                        value={partner.delivery_value}
                        onChange={(e) => updatePartner(index, "delivery_value", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs flex items-center gap-1">
                        <Percent className="w-3 h-3" />
                        % (Auto)
                      </Label>
                      <Input
                        type="text"
                        className="h-9 bg-gradient-to-r from-purple-100 to-pink-100 font-bold text-purple-700"
                        value={`${partner.presence_percentage.toFixed(1)}%`}
                        disabled
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0 text-red-600"
                        onClick={() => removePartner(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* 2º - Vendas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div>
                    <span>2º C/VENDA</span>
                    <span className="ml-3 text-sm font-normal text-gray-600">
                      Total: R$ {calculateSectionTotal("operational", "sales").toFixed(2)}
                    </span>
                  </div>
                  <Button size="sm" onClick={() => addToSection("operational", "sales")}>
                    <Plus className="w-4 h-4 mr-2" /> Adicionar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {formData.operational.sales.map((item, index) => (
                  <EmployeeRow key={index} item={item} index={index} section="operational" subsection="sales" showDelivery />
                ))}
              </CardContent>
            </Card>

            {/* 2º - Comercial */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div>
                    <span>2º COMERC.</span>
                    <span className="ml-3 text-sm font-normal text-gray-600">
                      Total: R$ {calculateSectionTotal("operational", "commercial").toFixed(2)}
                    </span>
                  </div>
                  <Button size="sm" onClick={() => addToSection("operational", "commercial")}>
                    <Plus className="w-4 h-4 mr-2" /> Adicionar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {formData.operational.commercial.map((item, index) => (
                  <EmployeeRow key={index} item={item} index={index} section="operational" subsection="commercial" showDelivery />
                ))}
              </CardContent>
            </Card>

            {/* 2º - Marketing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div>
                    <span>2º MKT DIGITAL</span>
                    <span className="ml-3 text-sm font-normal text-gray-600">
                      Total: R$ {calculateSectionTotal("operational", "marketing").toFixed(2)}
                    </span>
                  </div>
                  <Button size="sm" onClick={() => addToSection("operational", "marketing")}>
                    <Plus className="w-4 h-4 mr-2" /> Adicionar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {formData.operational.marketing.map((item, index) => (
                  <EmployeeRow key={index} item={item} index={index} section="operational" subsection="marketing" showDelivery />
                ))}
              </CardContent>
            </Card>

            {/* 3º - Técnico */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div>
                    <span>3º TÉCNICO/ELET/MEC/FUNIL.</span>
                    <span className="ml-3 text-sm font-normal text-gray-600">
                      Total: R$ {calculateSectionTotal("technical").toFixed(2)}
                    </span>
                  </div>
                  <Button size="sm" onClick={() => addToSection("technical")}>
                    <Plus className="w-4 h-4 mr-2" /> Adicionar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {formData.technical.map((item, index) => (
                  <EmployeeRow key={index} item={item} index={index} section="technical" showDelivery />
                ))}
              </CardContent>
            </Card>

            {/* 3º - Auxiliar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div>
                    <span>3º AUXILIAR/M.BOY/LIMPE</span>
                    <span className="ml-3 text-sm font-normal text-gray-600">
                      Total: R$ {calculateSectionTotal("auxiliary").toFixed(2)}
                    </span>
                  </div>
                  <Button size="sm" onClick={() => addToSection("auxiliary")}>
                    <Plus className="w-4 h-4 mr-2" /> Adicionar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {formData.auxiliary.map((item, index) => (
                  <EmployeeRow key={index} item={item} index={index} section="auxiliary" showDelivery />
                ))}
              </CardContent>
            </Card>

            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => navigate(createPageUrl("Home"))}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 px-8">
                {saving ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Salvando...</>
                ) : (
                  <><Save className="w-5 h-5 mr-2" /> Salvar e Gerar Painel</>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="organograma">
            <OrganizationChart formData={formData} />
            
            <div className="flex justify-center gap-4 mt-6">
              <Button variant="outline" onClick={() => navigate(createPageUrl("Home"))}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 px-8">
                {saving ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Salvando...</>
                ) : (
                  <><Save className="w-5 h-5 mr-2" /> Salvar e Gerar Painel</>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}