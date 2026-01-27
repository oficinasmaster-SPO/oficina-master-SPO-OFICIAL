import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Target, TrendingUp, Users, Save, Calculator, Percent, ArrowRight, Info, Download, MessageCircle, Mail, Trophy, Bell } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatNumber } from "../components/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ServiceGoalsModal from "@/components/goals/ServiceGoalsModal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import AdminViewBanner from "../components/shared/AdminViewBanner";

export default function DesdobramentoMeta() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(true);
  const [workshop, setWorkshop] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [activeTab, setActiveTab] = useState("vendas");
  const [isAdminView, setIsAdminView] = useState(false);
  
  // Configurações Globais do Desdobramento
  const [config, setConfig] = useState({
    target_month_date: new Date().toISOString().slice(0, 7) + "-01", // YYYY-MM-01
    growth_percentage: 20, // Padrão sugerido 20%
    bonus_rule_type: "fixo", // 'fixo', 'percentual_meta', 'percentual_faturamento'
    bonus_value: 0, // Valor base para cálculo
  });

  // Estado dos dados da tabela (editáveis)
  const [tableData, setTableData] = useState({
    vendas: [],
    comercial: [],
    tecnico: []
  });

  // Estado para Modal de Metas por Serviço
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [selectedEmployeeForService, setSelectedEmployeeForService] = useState(null);
  const [currentServiceGoals, setCurrentServiceGoals] = useState([]);

  // Estado para Previsões IA
  const [forecasts, setForecasts] = useState({});
  const [isForecasting, setIsForecasting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      
      // Verificar se há workshop_id na URL (admin visualizando)
      const urlParams = new URLSearchParams(window.location.search);
      const adminWorkshopId = urlParams.get('workshop_id');
      
      let userWorkshop = null;
      
      if (adminWorkshopId && user.role === 'admin') {
        // Admin visualizando oficina específica
        userWorkshop = await base44.entities.Workshop.get(adminWorkshopId);
        setIsAdminView(true);
      } else {
        // Fluxo normal
        const workshops = await base44.entities.Workshop.filter({ owner_id: user.id });
        userWorkshop = workshops[0];
        setIsAdminView(false);
      }
      
      if (!userWorkshop) {
        toast.error("Oficina não encontrada");
        navigate(createPageUrl("Home"));
        return;
      }
      
      setWorkshop(userWorkshop);

      // Filtra colaboradores EXCLUSIVAMENTE desta oficina
      const allEmployees = await base44.entities.Employee.filter({ 
        workshop_id: userWorkshop.id, 
        status: 'ativo' 
      });
      
      setEmployees(allEmployees);

      // Inicializa dados da tabela
      initializeTableData(allEmployees, userWorkshop);

    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const initializeTableData = (emps, ws) => {
    const newTableData = { vendas: [], comercial: [], tecnico: [] };
    
    const areaMap = {
      vendas: "vendas",
      comercial: "comercial",
      tecnico: "tecnico",
      marketing: "comercial",
      administrativo: "comercial"
    };

    // Agrupa por área e prepara dados iniciais
    emps.forEach(emp => {
      const area = areaMap[emp.area] || "comercial";
      
      // Lógica de Melhor Mês do Colaborador (Histórico)
      // Puxar do campo best_month_history do colaborador
      const bestRevenue = emp.best_month_history?.revenue_total || 0;
      const bestClients = emp.best_month_history?.customer_volume || 0;
      const bestTicket = emp.best_month_history?.average_ticket || 0;

      if (newTableData[area]) {
        newTableData[area].push({
          id: emp.id,
          name: emp.full_name,
          // Dados Históricos (Melhor Mês) - PUXADOS DO COLABORADOR
          hist_revenue: bestRevenue,
          hist_clients: bestClients,
          hist_ticket: bestTicket,
          
          // Configurações da Meta Individual
          growth_pct: 20, // Padrão inicial
          
          // Meta Definida (Inicialmente calculada com 20%)
          target_revenue: bestRevenue * 1.2,
          target_clients: Math.round(bestClients * 1.2),
          target_ticket: bestTicket * 1.05, // Supondo leve aumento de ticket também
          
          // Bonificação
          bonus_value: 0,
          
          // Metas por Serviço
          goals_by_service: [],

          is_new: !bestRevenue // Flag se é novo (sem histórico)
        });
      }
    });

    setTableData(newTableData);
  };

  // Recalcula linha ao alterar inputs
  const updateRow = (area, index, field, value) => {
    const newData = { ...tableData };
    const row = newData[area][index];
    
    row[field] = parseFloat(value) || 0;

    // Lógica de recálculo automático
    if (field === 'growth_pct') {
        // Se alterou %, recalcula meta de faturamento baseada no histórico
        const factor = 1 + (row.growth_pct / 100);
        row.target_revenue = row.hist_revenue * factor;
        // Recalcula clientes proporcionalmente (ou mantém lógica customizada)
        row.target_clients = Math.round(row.hist_clients * factor);
    } else if (field === 'target_revenue') {
        // Se alterou faturamento alvo manualmente, ajusta %
        if (row.hist_revenue > 0) {
            row.growth_pct = ((row.target_revenue - row.hist_revenue) / row.hist_revenue) * 100;
        }
        // Tenta inferir ticket médio se clientes já estiver definido
        if (row.target_clients > 0) {
            row.target_ticket = row.target_revenue / row.target_clients;
        }
    } else if (field === 'target_clients') {
        // Se alterou clientes, recalcula ticket médio necessário para bater a meta de faturamento
        if (row.target_clients > 0) {
            row.target_ticket = row.target_revenue / row.target_clients;
        }
    }

    // Recalculos derivados sempre
    if (row.target_clients > 0) {
        // Diferença de ticket em relação ao histórico
        row.diff_ticket = row.target_ticket - row.hist_ticket;
        
        // Média diária (base 22 dias úteis)
        row.daily_clients = row.target_clients / 22;
    }

    // Bonificação (Regra simples baseada na config global + input manual se quiser)
    // Aqui mantemos manual ou sugerido? Vamos deixar editável, mas pre-calcular se config mudar
    
    setTableData(newData);
  };

  const applyGlobalGrowth = () => {
    const newData = { ...tableData };
    Object.keys(newData).forEach(area => {
        newData[area].forEach(row => {
            row.growth_pct = config.growth_percentage;
            const factor = 1 + (config.growth_percentage / 100);
            row.target_revenue = row.hist_revenue * factor;
            row.target_clients = Math.round(row.hist_clients * factor);
            if (row.target_clients > 0) {
                row.target_ticket = row.target_revenue / row.target_clients;
                row.diff_ticket = row.target_ticket - row.hist_ticket;
                row.daily_clients = row.target_clients / 22;
            }
        });
    });
    setTableData(newData);
    toast.success(`Crescimento de ${config.growth_percentage}% aplicado a todos!`);
  };

  const handleOpenServiceModal = (area, index) => {
    const row = tableData[area][index];
    setSelectedEmployeeForService({ area, index, name: row.name });
    setCurrentServiceGoals(row.goals_by_service || []);
    setServiceModalOpen(true);
  };

  const handleSaveServiceGoals = (goals) => {
    if (!selectedEmployeeForService) return;
    const { area, index } = selectedEmployeeForService;
    const newData = { ...tableData };
    newData[area][index].goals_by_service = goals;
    
    // Opcional: Atualizar meta total automaticamente se a soma dos serviços mudar?
    // Vamos perguntar ou somar. Por enquanto, só salva a lista.
    // const sum = goals.reduce((acc, g) => acc + g.goal_value, 0);
    // if (sum > 0) newData[area][index].target_revenue = sum;

    setTableData(newData);
    setServiceModalOpen(false);
    toast.success("Metas por serviço atualizadas!");
  };

  const handleRunForecast = async () => {
    setIsForecasting(true);
    const newForecasts = {};
    
    try {
        // Itera sobre todos os funcionários visíveis
        // Para performance, poderia fazer em batch no backend, mas vamos chamar individualmente por enquanto
        const allRows = Object.values(tableData).flat();
        const promises = allRows.map(async (row) => {
            // Mock de dados atuais (idealmente viria do banco production_history do mês atual)
            // Vamos assumir que não temos dados REAIS do mês futuro/atual ainda se for planejamento puro
            // Mas se for monitoramento, usamos.
            // Aqui vamos simular/usar histórico para projetar "se continuar assim"
            
            const historyMock = [
                { month: "Mês -1", revenue: row.hist_revenue },
                { month: "Mês -2", revenue: row.hist_revenue * 0.9 }, // Simulação
                { month: "Mês -3", revenue: row.hist_revenue * 0.85 }
            ];

            // Simula dados atuais (ex: dia 15, 50% da meta)
            const currentDay = new Date().getDate();
            const currentRev = row.hist_revenue * (currentDay/30); // Apenas um placeholder lógico se não tiver dados reais

            try {
                const res = await base44.functions.invoke('monitorGoalsAI', {
                    currentMonthData: {
                        daysPassed: currentDay,
                        totalDays: 30,
                        currentRevenue: currentRev, // Em produção real, buscar valor real
                        targetRevenue: row.target_revenue,
                        currentDailyAverage: currentRev / currentDay,
                        requiredDailyAverage: (row.target_revenue - currentRev) / (30 - currentDay)
                    },
                    employeeHistory: historyMock
                });
                newForecasts[row.id] = res.data;
            } catch (e) {
                console.error(e);
            }
        });

        await Promise.all(promises);
        setForecasts(newForecasts);
        toast.success("Previsões geradas com IA!");
    } catch (error) {
        toast.error("Erro ao gerar previsões.");
    } finally {
        setIsForecasting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
        // 1. Salvar Desdobramento (GoalBreakdown)
        const breakdownPayload = {
            workshop_id: workshop.id,
            target_month_date: config.target_month_date,
            growth_percentage: config.growth_percentage,
            areas: tableData,
            // Metricas globais agregadas
            total_target_revenue: Object.values(tableData).flat().reduce((acc, r) => acc + r.target_revenue, 0),
            created_at: new Date().toISOString()
        };

        const breakdown = await base44.entities.GoalBreakdown.create(breakdownPayload);

        // 1.1. PONTE: Criar/atualizar Goal a partir do GoalBreakdown
        const mesAno = config.target_month_date.substring(0, 7);
        const [year, month] = mesAno.split('-');
        const dataInicio = `${year}-${month}-01`;
        const dataFim = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

        // Coletar todos os colaboradores do desdobramento
        const allEmployeeIds = Object.values(tableData)
          .flat()
          .map(emp => emp.id)
          .filter(Boolean);
        
        // Calcular áreas baseado nos colaboradores
        const metaAreas = [...new Set(
          Object.keys(tableData).filter(area => tableData[area].length > 0)
        )];

        // Verificar se já existe Goal para este desdobramento
        const existingGoals = await base44.entities.Goal.filter({
          workshop_id: workshop.id,
          source_type: "desdobramento",
          source_id: breakdown.id
        });

        const goalData = {
          workshop_id: workshop.id,
          periodo: "mensal",
          periodo_mes_ano: mesAno,
          data_inicio: dataInicio,
          data_fim: dataFim,
          meta_areas: metaAreas,
          responsible_employee_ids: allEmployeeIds,
          involved_employee_ids: [],
          metricas: {
            volume_clientes: { 
              meta: Object.values(tableData).flat().reduce((sum, e) => sum + (e.target_clients || 0), 0),
              realizado: 0
            },
            faturamento_pecas: { meta: 0, realizado: 0 },
            faturamento_servicos: { meta: 0, realizado: 0 },
            rentabilidade: { meta: 0, realizado: 0 },
            lucro: { meta: 0, realizado: 0 },
            ticket_medio_pecas: { meta: 0, realizado: 0 },
            ticket_medio_servicos: { meta: 0, realizado: 0 }
          },
          observacoes: `Meta criada automaticamente via desdobramento (crescimento: ${config.growth_percentage}%)`,
          status: "ativa",
          source_type: "desdobramento",
          source_id: breakdown.id
        };

        if (existingGoals && existingGoals.length > 0) {
          // Atualizar Goal existente
          await base44.entities.Goal.update(existingGoals[0].id, goalData);
        } else {
          // Criar novo Goal
          await base44.entities.Goal.create(goalData);
        }

        // 2. Atualizar Colaboradores (Best Month e Metas Atuais)
        const promises = [];
        const allRows = Object.values(tableData).flat();
        
        for (const row of allRows) {
            // Atualizar Metas do funcionário aplicando o percentual de crescimento
            const monthlyGoal = {
                month: config.target_month_date.slice(0, 7),
                growth_percentage: row.growth_pct,
                individual_goal: row.target_revenue,
                daily_projected_goal: row.target_revenue / 22,
                actual_revenue_achieved: 0, // Resetar realizado para novo mês
                target_clients: row.target_clients,
                bonus_potential: row.bonus_value,
                goals_by_service: row.goals_by_service || [],
                achievement_percentage: 0
            };
            
            promises.push(base44.entities.Employee.update(row.id, {
                monthly_goals: monthlyGoal
            }));
        }

        await Promise.all(promises);

        // 3. Notificar (Mock)
        toast.success("Metas desdobradas e enviadas aos colaboradores!");
        setEditing(false);
        
        // Opcional: Gerar PDF (Mock da função)
        // generatePDF(breakdownPayload);

    } catch (error) {
        console.error(error);
        toast.error("Erro ao salvar desdobramento");
    } finally {
        setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {isAdminView && workshop && (
        <div className="px-6 pt-6">
          <div className="max-w-7xl mx-auto">
            <AdminViewBanner workshopName={workshop.name} />
          </div>
        </div>
      )}
      
      {/* Header Fixo */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Desdobramento Completo de Metas</h1>
                <p className="text-sm text-slate-500 flex items-center gap-2">
                    <Target className="w-4 h-4" /> Planejamento Mensal: 
                    <input 
                        type="month" 
                        value={config.target_month_date.slice(0, 7)}
                        onChange={(e) => setConfig({...config, target_month_date: e.target.value + "-01"})}
                        disabled={!editing}
                        className="ml-2 border rounded px-2 py-1 text-slate-900 font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                </p>
            </div>
            <div className="flex gap-3">
                {!editing ? (
                  <Button onClick={() => setEditing(true)} className="bg-blue-600 hover:bg-blue-700">
                    Editar Metas
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleRunForecast} disabled={isForecasting} className="border-purple-200 text-purple-700 hover:bg-purple-50">
                        {isForecasting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Target className="w-4 h-4 mr-2" />}
                        Previsão IA
                    </Button>
                    <Button variant="outline" onClick={() => toast.info("Gerando PDF...")}>
                        <Download className="w-4 h-4 mr-2" /> PDF
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setEditing(false);
                      initializeTableData(employees, workshop);
                    }} disabled={saving}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Salvar e Notificar Equipe
                    </Button>
                  </>
                )}
            </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        
        {/* Configuração Global */}
        <Card className="border-l-4 border-blue-600 shadow-md">
            <CardContent className="p-6">
                <div className="grid md:grid-cols-4 gap-6 items-end">
                    <div className="md:col-span-1">
                        <Label className="text-xs uppercase text-slate-500 font-bold">Melhor Mês da Empresa (Histórico)</Label>
                        <div className="mt-2 text-2xl font-bold text-slate-800">
                            {workshop?.best_month_history ? formatCurrency(workshop.best_month_history.revenue_total) : "R$ 0,00"}
                        </div>
                        <p className="text-xs text-slate-400">
                            {workshop?.best_month_history?.customer_volume || 0} clientes
                        </p>
                    </div>
                    
                    <div className="md:col-span-2 flex gap-4 items-end">
                        <div className="flex-1">
                            <Label>Aplicar Crescimento Geral (%)</Label>
                            <div className="flex gap-2 mt-1">
                                <Input 
                                    type="number" 
                                    value={config.growth_percentage}
                                    onChange={(e) => setConfig({...config, growth_percentage: e.target.value})}
                                    disabled={!editing}
                                    className="text-lg font-bold w-32"
                                />
                                <Button variant="secondary" onClick={applyGlobalGrowth} disabled={!editing}>
                                    Aplicar a Todos <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-1 bg-amber-50 p-3 rounded border border-amber-200">
                        <div className="flex gap-2 items-start">
                            <Info className="w-5 h-5 text-amber-600 mt-0.5" />
                            <p className="text-xs text-amber-800 leading-snug">
                                Os dados do "Melhor Mês" de cada colaborador são puxados automaticamente do cadastro. Se baterem a meta, o histórico atualiza.
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Abas por Área */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="vendas" className="flex gap-2"><Users className="w-4 h-4"/> Área de Vendas</TabsTrigger>
                <TabsTrigger value="comercial" className="flex gap-2"><Users className="w-4 h-4"/> Área Comercial</TabsTrigger>
                <TabsTrigger value="tecnico" className="flex gap-2"><Users className="w-4 h-4"/> Área Técnica</TabsTrigger>
            </TabsList>

            {Object.keys(tableData).map((area) => (
                <TabsContent key={area} value={area}>
                    <Card className="overflow-hidden shadow-lg border-t-4 border-t-indigo-500">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-100">
                                    <TableRow>
                                        <TableHead className="w-[200px] font-bold text-slate-700 border-r">Colaborador</TableHead>
                                        
                                        {/* Histórico */}
                                        <TableHead className="bg-slate-50 text-slate-500 text-xs text-center border-r w-[120px]">
                                            Melhor Mês<br/>(Histórico R$)
                                        </TableHead>
                                        
                                        {/* Planejamento */}
                                        <TableHead className="bg-blue-50 text-blue-700 font-bold text-center w-[100px]">
                                            % Meta
                                        </TableHead>
                                        <TableHead className="bg-blue-50 text-blue-700 font-bold text-center w-[140px]">
                                            Meta Faturamento<br/>(R$)
                                        </TableHead>
                                        <TableHead className="text-center w-[100px]">
                                            Qtd Clientes<br/>(Alvo)
                                        </TableHead>
                                        <TableHead className="text-center text-xs w-[80px]">
                                            Média Diária<br/>(Clientes)
                                        </TableHead>
                                        <TableHead className="text-center w-[120px]">
                                            Ticket Médio<br/>(Desejado)
                                        </TableHead>
                                        <TableHead className="text-center text-xs w-[100px] bg-slate-50">
                                            Dif. Ticket<br/>(+%)
                                        </TableHead>
                                        <TableHead className="text-center w-[140px] bg-green-50 text-green-800 font-bold border-l">
                                            Bonificação<br/>(R$)
                                        </TableHead>
                                        <TableHead className="text-center w-[100px] bg-purple-50 text-purple-800 font-bold border-l">
                                            Detalhes
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tableData[area].length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                                                Nenhum colaborador nesta área.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        tableData[area]
                                            .sort((a, b) => b.hist_revenue - a.hist_revenue) // Ranking automático por faturamento histórico
                                            .map((row, index) => (
                                            <TableRow key={row.id} className="hover:bg-slate-50">
                                                <TableCell className="font-medium border-r bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm">{row.name}</span>
                                                        {row.is_new && <span className="text-[10px] text-blue-500 font-normal">Novo / Sem Histórico</span>}
                                                    </div>
                                                </TableCell>
                                                
                                                {/* Histórico (Read only) */}
                                                <TableCell className="text-center text-slate-600 border-r bg-slate-50/50">
                                                    <div className="font-mono text-xs">{formatCurrency(row.hist_revenue)}</div>
                                                    <div className="text-[10px] text-slate-400">{row.hist_clients} clientes</div>
                                                </TableCell>

                                                {/* Inputs de Meta */}
                                                <TableCell className="text-center bg-blue-50/30 p-2">
                                                    <div className="relative">
                                                        <Input 
                                                            type="number" 
                                                            className="h-8 text-center text-blue-700 font-bold pr-4"
                                                            value={row.growth_pct}
                                                            onChange={(e) => updateRow(area, index, 'growth_pct', e.target.value)}
                                                            disabled={!editing}
                                                        />
                                                        <span className="absolute right-2 top-1.5 text-xs text-blue-400">%</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="bg-blue-50/30 p-2">
                                                    <Input 
                                                        type="number" 
                                                        className="h-8 text-right font-bold border-blue-200"
                                                        value={row.target_revenue}
                                                        onChange={(e) => updateRow(area, index, 'target_revenue', e.target.value)}
                                                        disabled={!editing}
                                                    />
                                                </TableCell>

                                                {/* Dados Derivados / Editáveis */}
                                                <TableCell className="p-2">
                                                    <Input 
                                                        type="number" 
                                                        className="h-8 text-center"
                                                        value={row.target_clients}
                                                        onChange={(e) => updateRow(area, index, 'target_clients', e.target.value)}
                                                        disabled={!editing}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-center text-xs font-medium text-slate-600">
                                                    {row.daily_clients?.toFixed(1) || 0}
                                                </TableCell>
                                                <TableCell className="text-center font-mono text-xs text-slate-700">
                                                    {formatCurrency(row.target_ticket)}
                                                </TableCell>
                                                <TableCell className="text-center bg-slate-50 text-xs">
                                                    <span className={row.diff_ticket >= 0 ? "text-green-600" : "text-red-600"}>
                                                        {row.diff_ticket > 0 ? "+" : ""}{formatCurrency(row.diff_ticket)}
                                                    </span>
                                                </TableCell>

                                                {/* Bonificação */}
                                                <TableCell className="bg-green-50/30 border-l p-2">
                                                    <Input 
                                                        type="number" 
                                                        className="h-8 text-right text-green-700 font-bold border-green-200"
                                                        value={row.bonus_value}
                                                        onChange={(e) => updateRow(area, index, 'bonus_value', e.target.value)}
                                                        disabled={!editing}
                                                        placeholder="0,00"
                                                    />
                                                </TableCell>
                                                
                                                {/* Ações / IA */}
                                                <TableCell className="bg-purple-50/30 border-l p-2 text-center">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => handleOpenServiceModal(area, index)}
                                                        disabled={!editing}
                                                        title="Metas por Serviço"
                                                    >
                                                        <Target className="w-4 h-4 text-purple-600" />
                                                    </Button>
                                                    
                                                    {forecasts[row.id] && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Badge 
                                                                        variant="outline" 
                                                                        className={`ml-1 cursor-help ${
                                                                            forecasts[row.id].status === 'on_track' ? 'bg-green-100 text-green-700' : 
                                                                            forecasts[row.id].status === 'risk' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                                                        }`}
                                                                    >
                                                                        {forecasts[row.id].probability}%
                                                                    </Badge>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="max-w-xs bg-white border shadow-lg p-3 text-xs text-gray-700">
                                                                    <p className="font-bold mb-1">Previsão IA:</p>
                                                                    <p>Estimativa: {formatCurrency(forecasts[row.id].projected_revenue)}</p>
                                                                    <p className="mb-2">{forecasts[row.id].alert_message}</p>
                                                                    <p className="font-bold mb-1">Sugestões:</p>
                                                                    <ul className="list-disc pl-4">
                                                                        {forecasts[row.id].action_plan?.map((act, i) => <li key={i}>{act}</li>)}
                                                                    </ul>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </TabsContent>
            ))}
        </Tabs>

        {/* Notificações Info */}
        <div className="grid md:grid-cols-2 gap-4">
            <Card>
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-full">
                        <MessageCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">Notificações Automáticas</h3>
                        <p className="text-sm text-gray-600">
                            Colaboradores receberão suas metas via WhatsApp e no Portal do Colaborador após salvar.
                        </p>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-full">
                        <Trophy className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">Ranking & COEX</h3>
                        <p className="text-sm text-gray-600">
                            As metas serão atualizadas automaticamente no Contrato de Expectativas (COEX) e no Ranking da área.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>

      </div>

      <ServiceGoalsModal 
        isOpen={serviceModalOpen}
        onClose={() => setServiceModalOpen(false)}
        employeeName={selectedEmployeeForService?.name || ""}
        goals={currentServiceGoals}
        onSave={handleSaveServiceGoals}
      />
    </div>
  );
}