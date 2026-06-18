import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputMoeda } from "@/components/ui/InputMoeda";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Loader2, Calculator, DollarSign, TrendingUp, TrendingDown, 
  Save, ArrowLeft, Plus, FileText, Users, Clock, AlertCircle,
  CheckCircle, XCircle, Printer, BarChart3
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { formatCurrency, formatNumber } from "../components/utils/formatters";
import { toast } from "sonner";
import { useMemo } from "react";
import AdminViewBanner from "../components/shared/AdminViewBanner";
import { useSyncData } from "../components/hooks/useSyncData";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";
import DiscrepancyAlert from "../components/sync/DiscrepancyAlert";
import { markModuleCompleted } from "@/components/hooks/useModuleTracking";
import DREAvancadoTab from "@/components/dre/DREAvancadoTab";
import DFCTab from "@/components/dre/DFCTab";
import BudgetMetaTab from "@/components/budgetcontrol/BudgetMetaTab";
import VencimentosCard from "@/components/dre/VencimentosCard";
import FASE2EditorModal from "@/components/budgetcontrol/FASE2EditorModal";
import HistoricoMetasModal from "@/components/budgetcontrol/HistoricoMetasModal";
import FecharMesModal from "@/components/budgetcontrol/FecharMesModal";

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export default function DRETCMP2() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [viewMode, setViewMode] = useState("month");
  const [activeTab, setActiveTab] = useState("receitas");
  const [formData, setFormData] = useState(getEmptyDRE());
  const [savedFormData, setSavedFormData] = useState(getEmptyDRE());
  const [isAdminView, setIsAdminView] = useState(false);
  const [syncAlert, setSyncAlert] = useState(null);
  const hasSyncedOnMount = useRef(false);
  const { syncDRETOMetas, resolveDiscrepancy, updateDREFromMonthlyGoals, isSyncing } = useSyncData();

  // Usa o contexto global de workshop — reage automaticamente à troca de oficina no seletor
  const { workshop, isLoading: isLoadingWorkshop } = useWorkshopContext();

  // B4: removida redefinição interna de getCurrentMonth

  function getEmptyDRE() {
    return {
      productive_technicians: 1,
      monthly_hours: 219,
      revenue: { parts_applied: 0, services: 0, other: 0 },
      costs_tcmp2: {
        operational: 0, people: 0, prolabore: 0, marketing: 0,
        maintenance: 0, third_party: 0, administrative: 0
      },
      costs_not_tcmp2: {
        financing: 0, consortium: 0, equipment_installments: 0,
        parts_invoices: 0, legal_processes: 0, land_purchase: 0, investments: 0
      },
      parts_cost: { parts_applied_cost: 0, parts_stock_purchase: 0 },
      notes: ""
    };
  }

  // Escuta mudança de mês disparada pelos FiltroPeriodo internos (DRE Avançado e DFC)
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.mes) setSelectedMonth(e.detail.mes);
    };
    window.addEventListener('dre-mudar-mes', handler);
    window.addEventListener('dfc-mudar-mes', handler);
    return () => {
      window.removeEventListener('dre-mudar-mes', handler);
      window.removeEventListener('dfc-mudar-mes', handler);
    };
  }, []);

  // Carrega usuário para verificar admin view via URL
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Detecta admin view via URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const adminWorkshopId = urlParams.get('workshop_id');
    if (adminWorkshopId && user?.role === 'admin') {
      setIsAdminView(true);
    } else {
      setIsAdminView(false);
    }
  }, [user]);

  const { data: dreList = [], isLoading } = useQuery({
    queryKey: ['dre-list', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      try {
        const response = await base44.functions.invoke('getDREData', { workshop_id: workshop.id });
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
    enabled: !!workshop?.id,
    retry: 1
  });

  const currentDRE = dreList.find(d => d.month === selectedMonth);

  // B2/B3: sync na montagem/troca de mês sem setTimeout e sem closure stale
  // B12: flag hasSyncedOnMount evita double-sync com botão manual
  useEffect(() => {
    if (!workshop || viewMode !== 'month') return;
    hasSyncedOnMount.current = false;
    const syncData = async () => {
      hasSyncedOnMount.current = true;
      await updateDREFromMonthlyGoals(workshop.id, selectedMonth);
      await queryClient.invalidateQueries({ queryKey: ['dre-list', workshop?.id] });
    };
    syncData();
  }, [workshop?.id, selectedMonth, viewMode]);

  // B2/B3: syncDRETOMetas em useEffect separado que lê currentDRE como dependência explícita
  useEffect(() => {
    if (!workshop || !currentDRE || viewMode !== 'month') return;
    syncDRETOMetas(currentDRE.id, workshop.id, selectedMonth).then(result => {
      if (result?.requiresConfirmation) {
        setSyncAlert({ discrepancies: result.discrepancies, dre_id: currentDRE.id });
      }
    });
  }, [currentDRE?.id]);

  // Calculate Average DRE
  const averageData = useMemo(() => {
    if (!dreList.length) return null;
    
    const sum = (arr, keyPath) => arr.reduce((acc, item) => {
      const val = keyPath.split('.').reduce((obj, key) => obj?.[key] || 0, item);
      return acc + (parseFloat(val) || 0);
    }, 0);

    const count = dreList.length;
    
    return {
      productive_technicians: Math.round(sum(dreList, 'productive_technicians') / count),
      monthly_hours: sum(dreList, 'monthly_hours') / count,
      revenue: {
        parts_applied: sum(dreList, 'revenue.parts_applied') / count,
        services: sum(dreList, 'revenue.services') / count,
        other: sum(dreList, 'revenue.other') / count
      },
      costs_tcmp2: {
        operational: sum(dreList, 'costs_tcmp2.operational') / count,
        people: sum(dreList, 'costs_tcmp2.people') / count,
        prolabore: sum(dreList, 'costs_tcmp2.prolabore') / count,
        marketing: sum(dreList, 'costs_tcmp2.marketing') / count,
        maintenance: sum(dreList, 'costs_tcmp2.maintenance') / count,
        third_party: sum(dreList, 'costs_tcmp2.third_party') / count,
        administrative: sum(dreList, 'costs_tcmp2.administrative') / count
      },
      costs_not_tcmp2: {
        financing: sum(dreList, 'costs_not_tcmp2.financing') / count,
        consortium: sum(dreList, 'costs_not_tcmp2.consortium') / count,
        equipment_installments: sum(dreList, 'costs_not_tcmp2.equipment_installments') / count,
        parts_invoices: sum(dreList, 'costs_not_tcmp2.parts_invoices') / count,
        legal_processes: sum(dreList, 'costs_not_tcmp2.legal_processes') / count,
        land_purchase: sum(dreList, 'costs_not_tcmp2.land_purchase') / count,
        investments: sum(dreList, 'costs_not_tcmp2.investments') / count
      },
      parts_cost: {
        parts_applied_cost: sum(dreList, 'parts_cost.parts_applied_cost') / count,
        parts_stock_purchase: sum(dreList, 'parts_cost.parts_stock_purchase') / count
      },
      notes: "Média Geral Calculada"
    };
  }, [dreList]);

  useEffect(() => {
    let data;
    if (viewMode === 'average' && averageData) {
      data = averageData;
    } else if (currentDRE) {
      data = {
        productive_technicians: currentDRE.productive_technicians || 1,
        monthly_hours: currentDRE.monthly_hours || 219,
        revenue: currentDRE.revenue || { parts_applied: 0, services: 0, other: 0 },
        costs_tcmp2: currentDRE.costs_tcmp2 || getEmptyDRE().costs_tcmp2,
        costs_not_tcmp2: currentDRE.costs_not_tcmp2 || getEmptyDRE().costs_not_tcmp2,
        parts_cost: currentDRE.parts_cost || { parts_applied_cost: 0, parts_stock_purchase: 0 },
        notes: currentDRE.notes || ""
      };
    } else {
      data = getEmptyDRE();
    }
    setFormData(data);
    setSavedFormData(data); // marca estado "salvo" sincronizado
  }, [currentDRE, selectedMonth, viewMode, averageData]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const calculated = calculateDRE(data);
      const dreData = {
        workshop_id: workshop.id,
        month: selectedMonth,
        ...data,
        calculated
      };

      if (currentDRE) {
        return await base44.entities.DREMonthly.update(currentDRE.id, dreData);
      } else {
        return await base44.entities.DREMonthly.create(dreData);
      }
    },
    onSuccess: async (savedData) => {
      queryClient.invalidateQueries({ queryKey: ['dre-list'] });
      toast.success("DRE salvo com sucesso!");
      setSavedFormData(formData); // atualiza baseline "salvo" para remover badge "Não salvo"
      await markModuleCompleted(workshop.id, 'DRE', 'DRE mensal salvo com sucesso');
    },
    onError: () => {
      toast.error("Erro ao salvar DRE");
    }
  });

  const calculateDRE = (data) => {
    // Receitas
    const totalRevenue = (data.revenue.parts_applied || 0) + 
                         (data.revenue.services || 0) + 
                         (data.revenue.other || 0);

    // Custos que ENTRAM no TCMP²
    const totalCostsTcmp2 = Object.values(data.costs_tcmp2).reduce((sum, v) => sum + (v || 0), 0);

    // Custos que NÃO entram no TCMP²
    const totalCostsNotTcmp2 = Object.values(data.costs_not_tcmp2).reduce((sum, v) => sum + (v || 0), 0);

    // Custo de peças aplicadas
    const partsAppliedCost = data.parts_cost.parts_applied_cost || 0;

    // TCMP² = (Custos TCMP²) / (Técnicos × Horas)
    const totalHours = (data.productive_technicians || 1) * (data.monthly_hours || 219);
    const tcmp2Value = totalHours > 0 ? totalCostsTcmp2 / totalHours : 0;

    // R70/I30 = (Receita Total - Receita de Peças Aplicadas) / Receita Total
    // R70 mede a proporção de receita gerada por serviços/mão de obra (vs produto/peças)
    const partsStockPurchase = data.parts_cost.parts_stock_purchase || 0;
    const r70Base = totalRevenue - (data.revenue.parts_applied || 0);
    const r70Percentage = totalRevenue > 0 ? (r70Base / totalRevenue) * 100 : 0;
    const i30Percentage = 100 - r70Percentage;

    // B1: partsStockPurchase incluído no totalCosts para cálculo correto de Lucro
    const totalCosts = totalCostsTcmp2 + totalCostsNotTcmp2 + partsAppliedCost + partsStockPurchase;
    const profit = totalRevenue - totalCosts;
    const profitPercentage = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return {
      total_revenue: totalRevenue,
      total_costs_tcmp2: totalCostsTcmp2,
      total_costs_not_tcmp2: totalCostsNotTcmp2,
      tcmp2_value: tcmp2Value,
      r70_percentage: r70Percentage,
      i30_percentage: i30Percentage,
      profit: profit,
      profit_percentage: profitPercentage
    };
  };

  const calculated = calculateDRE(formData);

  // 9: flag de dados não salvos (comparação rasa por JSON)
  const hasUnsavedChanges = JSON.stringify(formData) !== JSON.stringify(savedFormData);

  const updateRevenue = (field, value) => {
    setFormData({
      ...formData,
      revenue: { ...formData.revenue, [field]: parseFloat(value) || 0 }
    });
  };

  const updateCostsTcmp2 = (field, value) => {
    setFormData({
      ...formData,
      costs_tcmp2: { ...formData.costs_tcmp2, [field]: parseFloat(value) || 0 }
    });
  };

  const updateCostsNotTcmp2 = (field, value) => {
    setFormData({
      ...formData,
      costs_not_tcmp2: { ...formData.costs_not_tcmp2, [field]: parseFloat(value) || 0 }
    });
  };

  const updatePartsCost = (field, value) => {
    setFormData({
      ...formData,
      parts_cost: { ...formData.parts_cost, [field]: parseFloat(value) || 0 }
    });
  };

  // Chart Data — 8: inclui fullMonth para gráfico clicável
  const chartData = [...dreList]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(d => {
      const [year, month] = d.month.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return {
        name: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        tcmp2: d.calculated?.tcmp2_value || 0,
        fullMonth: d.month
      };
    });

  const tcmp2Values = dreList.map(d => d.calculated?.tcmp2_value || 0).filter(v => v > 0);
  const averageTcmp2 = tcmp2Values.length > 0 
    ? tcmp2Values.reduce((a, b) => a + b, 0) / tcmp2Values.length 
    : 0;

  if (!workshop || isLoadingWorkshop || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const handleResolveDiscrepancy = async (use_source) => {
    if (!syncAlert) return;
    
    const result = await resolveDiscrepancy(
      workshop.id,
      selectedMonth,
      use_source,
      syncAlert.dre_id
    );

    if (result.success) {
      setSyncAlert(null);
      queryClient.invalidateQueries({ queryKey: ['dre-list'] });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        
        {isAdminView && workshop && (
          <AdminViewBanner workshopName={workshop.name} />
        )}

        {syncAlert && (
          <DiscrepancyAlert
            discrepancies={syncAlert.discrepancies}
            onResolve={handleResolveDiscrepancy}
            onDismiss={() => setSyncAlert(null)}
            isLoading={isSyncing}
          />
        )}
        
        {/* Modal FASE 2 — B5: passar workshopId e mes */}
        <FASE2EditorModal workshopId={workshop?.id} mes={selectedMonth} />

        {/* 9: banner de dados não salvos */}
        {hasUnsavedChanges && viewMode === 'month' && (
          <div className="mb-4 flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm print:hidden">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Existem alterações não salvas neste mês.
          </div>
        )}

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate(createPageUrl("GestaoOficina"))}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">DRE & TCMP²</h1>
              <p className="text-gray-600">{workshop.name}</p>
            </div>
          </div>
          {/* 14: flex-wrap para mobile */}
          <div className="flex flex-wrap items-center gap-3 justify-end">
            <Button variant="outline" onClick={() => window.print()} className="print:hidden">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            
            <div className="flex flex-wrap gap-2 print:hidden">
              <Select value={viewMode} onValueChange={setViewMode}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Modo de Visualização" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Mensal</SelectItem>
                  <SelectItem value="average">Média Geral</SelectItem>
                </SelectContent>
              </Select>

              {viewMode === 'month' && (
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[240px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const d = new Date();
                      d.setMonth(d.getMonth() - i);
                      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                      const hasDRE = dreList.some(x => x.month === val);
                      const dreForMonth = dreList.find(x => x.month === val);
                      const tcmp2Value = dreForMonth?.calculated?.tcmp2_value;
                      
                      return (
                        <SelectItem key={val} value={val}>
                          {/* 7: badge visual de meses com/sem DRE */}
                          <span className="flex items-center justify-between w-full gap-3">
                            <span className="flex items-center gap-1.5">
                              <span className={hasDRE ? 'text-green-500' : 'text-gray-300'}>●</span>
                              {d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                            </span>
                            {tcmp2Value ? (
                              <span className="text-gray-400 font-mono text-xs">
                                {formatCurrency(tcmp2Value)}
                              </span>
                            ) : null}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>

            {viewMode === 'month' && (
              <div className="flex flex-wrap gap-2 print:hidden">
                {/* 12: botão manual com flag para evitar double-sync */}
                <Button 
                  onClick={async () => {
                    hasSyncedOnMount.current = true;
                    await updateDREFromMonthlyGoals(workshop.id, selectedMonth);
                    queryClient.invalidateQueries({ queryKey: ['dre-list', workshop?.id] });
                    toast.success("Receitas sincronizadas com sucesso!");
                  }}
                  disabled={isSyncing}
                  variant="outline"
                >
                  {isSyncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                  Sincronizar Receitas
                </Button>
                {/* 9: badge "Não salvo" junto ao botão Salvar */}
                <Button 
                  onClick={() => saveMutation.mutate(formData)}
                  disabled={saveMutation.isPending}
                  className={`${hasUnsavedChanges ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'} relative`}
                >
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar DRE
                  {hasUnsavedChanges && (
                    <span className="ml-2 bg-yellow-200 text-yellow-900 text-xs font-semibold px-1.5 py-0.5 rounded">
                      Não salvo
                    </span>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Gráfico de Evolução TCMP² */}
        <Card className="mb-6 print:break-inside-avoid print:block">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Evolução do TCMP² (Valor Hora)
                </CardTitle>
                <CardDescription>
                  Acompanhe a variação do valor da hora técnica ao longo dos meses.
                </CardDescription>
              </div>
              <div className="text-right">
                 <p className="text-sm text-gray-500">Média Geral</p>
                 <p className="text-2xl font-bold text-blue-600">{formatCurrency(averageTcmp2)}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip 
                    formatter={(value) => formatCurrency(value)}
                    labelStyle={{ color: '#1f2937' }}
                  />
                  <Legend />
                  <ReferenceLine y={averageTcmp2} label="Média" stroke="red" strokeDasharray="3 3" />
                  {/* 8: gráfico clicável — muda mês e vai para aba receitas */}
                  <Line 
                    type="monotone" 
                    dataKey="tcmp2" 
                    name="TCMP²" 
                    stroke="#2563eb" 
                    strokeWidth={3}
                    activeDot={{ 
                      r: 8, 
                      onClick: (_, payload) => {
                        if (payload?.payload?.fullMonth) {
                          setSelectedMonth(payload.payload.fullMonth);
                          setViewMode('month');
                          setActiveTab('receitas');
                        }
                      },
                      style: { cursor: 'pointer' }
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* KPIs Principais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">TCMP² (Valor Hora)</p>
                  <p className="text-3xl font-bold">{formatCurrency(calculated.tcmp2_value)}</p>
                </div>
                <Calculator className="w-10 h-10 opacity-80" />
              </div>
              <p className="text-xs mt-2 opacity-70">
                {formData.productive_technicians} técnicos × {formData.monthly_hours}h
              </p>
              {/* 11: dica inline quando TCMP² é zero */}
              {calculated.tcmp2_value === 0 && (
                <p className="text-xs mt-2 bg-white/20 rounded px-2 py-1">
                  💡 Lance os custos na aba Custos TCMP² para calcular o valor hora
                </p>
              )}
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${calculated.r70_percentage >= 70 ? 'from-blue-500 to-indigo-600' : 'from-orange-500 to-red-600'} text-white`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">R70 (Renda)</p>
                  <p className="text-3xl font-bold">{formatNumber(calculated.r70_percentage, 1)}%</p>
                </div>
                {calculated.r70_percentage >= 70 ? <CheckCircle className="w-10 h-10 opacity-80" /> : <AlertCircle className="w-10 h-10 opacity-80" />}
              </div>
              <p className="text-xs mt-2 opacity-70">Meta: ≥ 70%</p>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${calculated.i30_percentage <= 30 ? 'from-purple-500 to-pink-600' : 'from-orange-500 to-red-600'} text-white`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">I30 (Investimento)</p>
                  <p className="text-3xl font-bold">{formatNumber(calculated.i30_percentage, 1)}%</p>
                </div>
                {calculated.i30_percentage <= 30 ? <CheckCircle className="w-10 h-10 opacity-80" /> : <AlertCircle className="w-10 h-10 opacity-80" />}
              </div>
              <p className="text-xs mt-2 opacity-70">Meta: ≤ 30%</p>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${calculated.profit >= 0 ? 'from-emerald-500 to-teal-600' : 'from-red-500 to-rose-600'} text-white`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Lucro</p>
                  <p className="text-3xl font-bold">{formatCurrency(calculated.profit)}</p>
                </div>
                {calculated.profit >= 0 ? <TrendingUp className="w-10 h-10 opacity-80" /> : <TrendingDown className="w-10 h-10 opacity-80" />}
              </div>
              <p className="text-xs mt-2 opacity-70">{formatNumber(calculated.profit_percentage, 1)}% do faturamento</p>
            </CardContent>
          </Card>
        </div>

        {/* Card de alertas de vencimento (Fase 4) */}
        {viewMode === 'month' && workshop && (
          <VencimentosCard workshopId={workshop.id} mes={selectedMonth} />
        )}

        {/* Formulário DRE — 8: controlled tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white shadow-md">
            <TabsTrigger value="receitas">💰 Receitas</TabsTrigger>
            <TabsTrigger value="custos_tcmp2">⚙️ Custos TCMP² (Entram)</TabsTrigger>
            <TabsTrigger value="custos_nao_tcmp2">🚫 Custos NÃO TCMP²</TabsTrigger>
            <TabsTrigger value="pecas">📦 Peças</TabsTrigger>
            <TabsTrigger value="resumo">📊 Resumo DRE</TabsTrigger>
            <TabsTrigger value="avancado">📋 DRE Avançado</TabsTrigger>
            <TabsTrigger value="dfc">💵 DFC</TabsTrigger>
            <TabsTrigger value="orcamento">💳 Controle Orçamentário</TabsTrigger>
          </TabsList>

          {/* Receitas */}
           <TabsContent value="receitas">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Receitas do Mês
                </CardTitle>
                <CardDescription>Informe o faturamento do mês</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label>Técnicos Produtivos</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.productive_technicians}
                      onChange={(e) => setFormData({ ...formData, productive_technicians: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <Label>Horas Disponíveis/Mês (por técnico)</Label>
                    <Input
                      type="number"
                      value={formData.monthly_hours}
                      onChange={(e) => setFormData({ ...formData, monthly_hours: parseFloat(e.target.value) || 219 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Faturamento Peças Aplicadas (R$)</Label>
                    <InputMoeda
                      value={formData.revenue.parts_applied}
                      onChange={(e) => updateRevenue('parts_applied', e.target.value)}
                      className="text-right"
                    />
                  </div>
                  <div>
                    <Label>Faturamento Serviços (R$)</Label>
                    <InputMoeda
                      value={formData.revenue.services}
                      onChange={(e) => updateRevenue('services', e.target.value)}
                      className="text-right"
                    />
                  </div>
                  <div>
                    <Label>Outras Receitas (R$)</Label>
                    <InputMoeda
                      value={formData.revenue.other}
                      onChange={(e) => updateRevenue('other', e.target.value)}
                      className="text-right"
                    />
                  </div>
                </div>

                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">Receita Total</p>
                  <p className="text-3xl font-bold text-green-900">{formatCurrency(calculated.total_revenue)}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Custos TCMP² */}
          <TabsContent value="custos_tcmp2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  Custos que ENTRAM no TCMP²
                </CardTitle>
                <CardDescription>
                  Estes custos são usados para calcular o valor hora ideal (TCMP²)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label>Operacionais (Aluguel, Energia, Água, Tel)</Label>
                    <InputMoeda
                      value={formData.costs_tcmp2.operational}
                      onChange={(e) => updateCostsTcmp2('operational', e.target.value)}
                      className="text-right"
                    />
                  </div>
                  <div>
                    <Label>Pessoas (Salários, Encargos, Benefícios)</Label>
                    <InputMoeda
                      value={formData.costs_tcmp2.people}
                      onChange={(e) => updateCostsTcmp2('people', e.target.value)}
                      className="text-right"
                    />
                  </div>
                  <div>
                    <Label>Pró-labore dos Sócios</Label>
                    <InputMoeda
                      value={formData.costs_tcmp2.prolabore}
                      onChange={(e) => updateCostsTcmp2('prolabore', e.target.value)}
                      className="text-right"
                    />
                  </div>
                  <div>
                    <Label>Marketing e Propaganda</Label>
                    <InputMoeda
                      value={formData.costs_tcmp2.marketing}
                      onChange={(e) => updateCostsTcmp2('marketing', e.target.value)}
                      className="text-right"
                    />
                  </div>
                  <div>
                    <Label>Manutenção (Predial e Equipamentos)</Label>
                    <InputMoeda
                      value={formData.costs_tcmp2.maintenance}
                      onChange={(e) => updateCostsTcmp2('maintenance', e.target.value)}
                      className="text-right"
                    />
                  </div>
                  <div>
                    <Label>Serviços Terceirizados</Label>
                    <InputMoeda
                      value={formData.costs_tcmp2.third_party}
                      onChange={(e) => updateCostsTcmp2('third_party', e.target.value)}
                      className="text-right"
                    />
                  </div>
                  <div>
                    <Label>Despesas Administrativas</Label>
                    <InputMoeda
                      value={formData.costs_tcmp2.administrative}
                      onChange={(e) => updateCostsTcmp2('administrative', e.target.value)}
                      className="text-right"
                    />
                  </div>
                </div>

                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">Total Custos TCMP²</p>
                  <p className="text-3xl font-bold text-blue-900">{formatCurrency(calculated.total_costs_tcmp2)}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Custos NÃO TCMP² */}
          <TabsContent value="custos_nao_tcmp2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-orange-600" />
                  Custos que NÃO ENTRAM no TCMP²
                </CardTitle>
                <CardDescription>
                  Estes custos são financeiros/investimentos e não devem compor o valor hora
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label>Financiamentos</Label>
                    <InputMoeda
                      value={formData.costs_not_tcmp2.financing}
                      onChange={(e) => updateCostsNotTcmp2('financing', e.target.value)}
                      className="text-right"
                    />
                  </div>
                  <div>
                    <Label>Consórcios</Label>
                    <InputMoeda
                      value={formData.costs_not_tcmp2.consortium}
                      onChange={(e) => updateCostsNotTcmp2('consortium', e.target.value)}
                      className="text-right"
                    />
                  </div>
                  <div>
                    <Label>Equipamentos Parcelados</Label>
                    <InputMoeda
                      value={formData.costs_not_tcmp2.equipment_installments}
                      onChange={(e) => updateCostsNotTcmp2('equipment_installments', e.target.value)}
                      className="text-right"
                    />
                  </div>
                  <div>
                    <Label>Boletos de Peças (Estoque)</Label>
                    <InputMoeda
                      value={formData.costs_not_tcmp2.parts_invoices}
                      onChange={(e) => updateCostsNotTcmp2('parts_invoices', e.target.value)}
                      className="text-right"
                    />
                  </div>
                  <div>
                    <Label>Processos Judiciais</Label>
                    <InputMoeda
                      value={formData.costs_not_tcmp2.legal_processes}
                      onChange={(e) => updateCostsNotTcmp2('legal_processes', e.target.value)}
                      className="text-right"
                    />
                  </div>
                  <div>
                    <Label>Compra de Terreno/Imóvel</Label>
                    <InputMoeda
                      value={formData.costs_not_tcmp2.land_purchase}
                      onChange={(e) => updateCostsNotTcmp2('land_purchase', e.target.value)}
                      className="text-right"
                    />
                  </div>
                  <div>
                    <Label>Investimentos Diversos</Label>
                    <InputMoeda
                      value={formData.costs_not_tcmp2.investments}
                      onChange={(e) => updateCostsNotTcmp2('investments', e.target.value)}
                      className="text-right"
                    />
                  </div>
                </div>

                <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-700">Total Custos NÃO TCMP²</p>
                  <p className="text-3xl font-bold text-orange-900">{formatCurrency(calculated.total_costs_not_tcmp2)}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Peças */}
          <TabsContent value="pecas">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Custos com Peças
                </CardTitle>
                <CardDescription>
                  Separar peças aplicadas de peças compradas para estoque (afeta R70/I30)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Custo das Peças APLICADAS no Mês (R$)</Label>
                    <InputMoeda
                      value={formData.parts_cost.parts_applied_cost}
                      onChange={(e) => updatePartsCost('parts_applied_cost', e.target.value)}
                      className="text-right text-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Peças que foram efetivamente usadas em serviços
                    </p>
                  </div>
                  <div>
                    <Label>Peças Compradas para ESTOQUE (R$)</Label>
                    <InputMoeda
                      value={formData.parts_cost.parts_stock_purchase}
                      onChange={(e) => updatePartsCost('parts_stock_purchase', e.target.value)}
                      className="text-right text-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Peças compradas mas ainda em estoque
                    </p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-2">Cálculo R70/I30</h4>
                  <p className="text-sm text-purple-700 mb-2">
                    R70 = (Receita Total - Receita de Peças Aplicadas) / Receita Total
                  </p>
                  <p className="text-xs text-purple-600 mb-2">
                    R70 mede quanto da receita vem de serviços/mão de obra. I30 é a parcela de peças/produtos.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-sm text-gray-600">R70 (Renda)</p>
                      <p className="text-2xl font-bold text-blue-600">{formatNumber(calculated.r70_percentage, 1)}%</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-sm text-gray-600">I30 (Investimento)</p>
                      <p className="text-2xl font-bold text-purple-600">{formatNumber(calculated.i30_percentage, 1)}%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Resumo DRE */}
          <TabsContent value="resumo">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>📊 DRE - Demonstrativo de Resultados</CardTitle>
                    <CardDescription>
                      {new Date(selectedMonth + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </CardDescription>
                  </div>
                  {/* 13: botão de impressão dedicado na aba Resumo */}
                  <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
                    🖨️ Imprimir Resumo
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Receitas */}
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">RECEITAS</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Peças Aplicadas</span>
                        <span>{formatCurrency(formData.revenue.parts_applied)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Serviços</span>
                        <span>{formatCurrency(formData.revenue.services)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Outras Receitas</span>
                        <span>{formatCurrency(formData.revenue.other)}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-1 mt-2">
                        <span>TOTAL RECEITAS</span>
                        <span>{formatCurrency(calculated.total_revenue)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Custos TCMP² */}
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">CUSTOS TCMP² (Operacionais)</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span>Operacionais</span><span>{formatCurrency(formData.costs_tcmp2.operational)}</span></div>
                      <div className="flex justify-between"><span>Pessoas</span><span>{formatCurrency(formData.costs_tcmp2.people)}</span></div>
                      <div className="flex justify-between"><span>Pró-labore</span><span>{formatCurrency(formData.costs_tcmp2.prolabore)}</span></div>
                      <div className="flex justify-between"><span>Marketing</span><span>{formatCurrency(formData.costs_tcmp2.marketing)}</span></div>
                      <div className="flex justify-between"><span>Manutenção</span><span>{formatCurrency(formData.costs_tcmp2.maintenance)}</span></div>
                      <div className="flex justify-between"><span>Terceirizados</span><span>{formatCurrency(formData.costs_tcmp2.third_party)}</span></div>
                      <div className="flex justify-between"><span>Administrativo</span><span>{formatCurrency(formData.costs_tcmp2.administrative)}</span></div>
                      <div className="flex justify-between font-bold border-t pt-1 mt-2">
                        <span>TOTAL CUSTOS TCMP²</span>
                        <span>{formatCurrency(calculated.total_costs_tcmp2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* B7: Custos NÃO TCMP² com linhas detalhadas */}
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <h4 className="font-semibold text-orange-900 mb-2">CUSTOS NÃO TCMP² (Financeiros)</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span>Financiamentos</span><span>{formatCurrency(formData.costs_not_tcmp2.financing)}</span></div>
                      <div className="flex justify-between"><span>Consórcios</span><span>{formatCurrency(formData.costs_not_tcmp2.consortium)}</span></div>
                      <div className="flex justify-between"><span>Equipamentos Parcelados</span><span>{formatCurrency(formData.costs_not_tcmp2.equipment_installments)}</span></div>
                      <div className="flex justify-between"><span>Boletos de Peças (Estoque)</span><span>{formatCurrency(formData.costs_not_tcmp2.parts_invoices)}</span></div>
                      <div className="flex justify-between"><span>Processos Judiciais</span><span>{formatCurrency(formData.costs_not_tcmp2.legal_processes)}</span></div>
                      <div className="flex justify-between"><span>Compra de Terreno/Imóvel</span><span>{formatCurrency(formData.costs_not_tcmp2.land_purchase)}</span></div>
                      <div className="flex justify-between"><span>Investimentos Diversos</span><span>{formatCurrency(formData.costs_not_tcmp2.investments)}</span></div>
                      <div className="flex justify-between font-bold border-t pt-1 mt-2">
                        <span>TOTAL CUSTOS NÃO TCMP²</span>
                        <span>{formatCurrency(calculated.total_costs_not_tcmp2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 10: Peças com estoque e total */}
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-semibold text-purple-900 mb-2">CUSTOS COM PEÇAS</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Peças Aplicadas</span>
                        <span>{formatCurrency(formData.parts_cost.parts_applied_cost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Peças para Estoque</span>
                        <span>{formatCurrency(formData.parts_cost.parts_stock_purchase)}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-1 mt-2">
                        <span>TOTAL PEÇAS</span>
                        <span>{formatCurrency((formData.parts_cost.parts_applied_cost || 0) + (formData.parts_cost.parts_stock_purchase || 0))}</span>
                      </div>
                    </div>
                  </div>

                  {/* Resultado */}
                  <div className={`p-4 rounded-lg ${calculated.profit >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    <h4 className={`font-semibold mb-2 ${calculated.profit >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                      RESULTADO
                    </h4>
                    <div className="flex justify-between text-xl font-bold">
                      <span>LUCRO/PREJUÍZO</span>
                      <span className={calculated.profit >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                        {formatCurrency(calculated.profit)} ({formatNumber(calculated.profit_percentage, 1)}%)
                      </span>
                    </div>
                  </div>

                  {/* TCMP² */}
                  <div className="p-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg border-2 border-green-300">
                    <h4 className="font-semibold text-green-900 mb-2">TCMP² - VALOR HORA IDEAL</h4>
                    <p className="text-4xl font-bold text-green-700">{formatCurrency(calculated.tcmp2_value)}</p>
                    <p className="text-sm text-green-600 mt-1">
                      Baseado em {formData.productive_technicians} técnico(s) × {formData.monthly_hours}h = {formData.productive_technicians * formData.monthly_hours}h totais
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          {/* DRE Avançado */}
          <TabsContent value="avancado">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  DRE Avançado — Lançamentos Detalhados
                </CardTitle>
                <CardDescription>
                  Para oficinas sem sistema de gestão financeiro. Lance receitas e despesas individualmente.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {workshop && (
                  <DREAvancadoTab
                    workshopId={workshop.id}
                    mes={selectedMonth}
                    tecnicosCount={formData.productive_technicians}
                    horasMes={formData.monthly_hours}
                    onConsolidar={(totais) => {
                      setFormData(prev => ({
                        ...prev,
                        revenue: { ...prev.revenue, ...totais.revenue },
                        costs_tcmp2: { ...prev.costs_tcmp2, ...totais.costs_tcmp2 },
                        costs_not_tcmp2: { ...prev.costs_not_tcmp2, ...totais.costs_not_tcmp2 },
                        parts_cost: { ...prev.parts_cost, ...totais.parts_cost }
                      }));
                      toast.success("Totais consolidados! Clique em 'Salvar DRE' para persistir.");
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* DFC */}
          <TabsContent value="dfc">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  💵 DFC — Demonstrativo de Fluxo de Caixa
                </CardTitle>
                <CardDescription>
                  Preencha o DRE Avançado primeiro. Os dados são importados automaticamente aqui.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {workshop && (
                  <DFCTab
                    workshopId={workshop.id}
                    mes={selectedMonth}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Controle Orçamentário */}
          <TabsContent value="orcamento">
            <div className="space-y-6">
              {/* Header com Ações FASE 3 */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">💳 Controle Orçamentário</h3>
                <div className="flex gap-2">
                  <FecharMesModal
                    workshopId={workshop.id}
                    mes={selectedMonth}
                    isLocked={false}
                  />
                  <HistoricoMetasModal
                    metaId="all"
                    workshopId={workshop.id}
                    mes={selectedMonth}
                  />
                </div>
              </div>

              {/* Botões de Acesso às Funcionalidades FASE 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-green-200">
                  <CardContent className="pt-6">
                    <div 
                      className="flex items-center gap-4"
                      onClick={() => window.dispatchEvent(new CustomEvent('open-sazonalidade-editor'))}
                    >
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">📊 Distribuição Sazonal</h3>
                        <p className="text-sm text-muted-foreground">Configure pesos mensais para metas realistas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-blue-200">
                  <CardContent className="pt-6">
                    <div 
                      className="flex items-center gap-4"
                      onClick={() => window.dispatchEvent(new CustomEvent('open-hierarquia-editor'))}
                    >
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <BarChart3 className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">📁 Hierarquia Orçamentária</h3>
                        <p className="text-sm text-muted-foreground">Organize por grupos e categorias</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tab Principal de Metas */}
              <BudgetMetaTab
                workshopId={workshop.id}
                mes={selectedMonth}
              />
            </div>
          </TabsContent>
          </Tabs>
      </div>
    </div>
  );
}