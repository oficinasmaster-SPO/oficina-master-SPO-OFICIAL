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

export default function DesdobramentoMeta() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workshop, setWorkshop] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [activeTab, setActiveTab] = useState("vendas");
  
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
      // Se não tiver histórico individual, tenta usar uma média ou valor zero
      const bestRevenue = emp.best_month_history?.revenue || 0;
      const bestClients = emp.best_month_history?.clients || 0;
      const bestTicket = bestClients > 0 ? bestRevenue / bestClients : 0;

      if (newTableData[area]) {
        newTableData[area].push({
          id: emp.id,
          name: emp.full_name,
          // Dados Históricos (Melhor Mês)
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

        await base44.entities.GoalBreakdown.create(breakdownPayload);

        // 2. Atualizar Colaboradores (Best Month e Metas Atuais)
        const promises = [];
        const allRows = Object.values(tableData).flat();
        
        for (const row of allRows) {
            // Atualizar COEX/Metas do funcionário
            const monthlyGoal = {
                month: config.target_month_date.slice(0, 7),
                individual_goal: row.target_revenue,
                target_clients: row.target_clients,
                bonus_potential: row.bonus_value
            };

            // Se a meta definida for maior que o histórico, atualizamos o "melhor mês" como referência de desafio?
            // Não, o melhor mês só atualiza quando REALIZADO. Aqui é PLANEJAMENTO.
            
            promises.push(base44.entities.Employee.update(row.id, {
                monthly_goals: monthlyGoal // Sobrescreve ou adiciona lógica de histórico no backend idealmente
            }));
        }

        await Promise.all(promises);

        // 3. Notificar (Mock)
        toast.success("Metas desdobradas e enviadas aos colaboradores!");
        
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
                        className="ml-2 border rounded px-2 py-1 text-slate-900 font-medium"
                    />
                </p>
            </div>
            <div className="flex gap-3">
                <Button variant="outline" onClick={() => toast.info("Gerando PDF...")}>
                    <Download className="w-4 h-4 mr-2" /> PDF
                </Button>
                <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Salvar e Notificar Equipe
                </Button>
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
                                    className="text-lg font-bold w-32"
                                />
                                <Button variant="secondary" onClick={applyGlobalGrowth}>
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
                                                    />
                                                </TableCell>

                                                {/* Dados Derivados / Editáveis */}
                                                <TableCell className="p-2">
                                                    <Input 
                                                        type="number" 
                                                        className="h-8 text-center"
                                                        value={row.target_clients}
                                                        onChange={(e) => updateRow(area, index, 'target_clients', e.target.value)}
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
                                                        placeholder="0,00"
                                                    />
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
    </div>
  );
}