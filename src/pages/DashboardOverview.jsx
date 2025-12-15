import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, TrendingUp, User, FileText, Settings, Bell, CheckCircle2, AlertTriangle, Brain, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import NotificationSettingsDialog from "@/components/dashboard/NotificationSettingsDialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import AdminViewBanner from "../components/shared/AdminViewBanner";

export default function DashboardOverview() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Verificar se há workshop_id na URL (admin visualizando)
        const urlParams = new URLSearchParams(window.location.search);
        const adminWorkshopId = urlParams.get('workshop_id');
        
        let userWorkshop = null;
        
        if (adminWorkshopId && currentUser.role === 'admin') {
          // Admin visualizando oficina específica
          userWorkshop = await base44.entities.Workshop.get(adminWorkshopId);
          setIsAdminView(true);
        } else {
          // Fluxo normal
          if (currentUser.workshop_id) {
            const byId = await base44.entities.Workshop.filter({ id: currentUser.workshop_id });
            userWorkshop = byId[0];
          }
          
          if (!userWorkshop) {
            const byOwner = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
            userWorkshop = byOwner[0];
          }
          
          if (!userWorkshop) {
            // Buscar se é colaborador
            const employees = await base44.entities.Employee.filter({ user_id: currentUser.id });
            if (employees.length > 0) {
              const byWorkshop = await base44.entities.Workshop.filter({ id: employees[0].workshop_id });
              userWorkshop = byWorkshop[0];
            }
          }
          setIsAdminView(false);
        }
        
        setWorkshop(userWorkshop);
      } catch (error) {
        console.error("Error loading dashboard:", error);
        base44.auth.redirectToLogin(window.location.href);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // 1. Fetch Entrepreneur Diagnostic (Latest)
  const { data: entrepreneurDiag } = useQuery({
    queryKey: ['entrepreneur-diag-latest', user?.id],
    queryFn: async () => {
        if (!user) return null;
        const list = await base44.entities.EntrepreneurDiagnostic.filter({ user_id: user.id }, '-created_date', 1);
        return list[0] || null;
    },
    enabled: !!user
  });

  // 2. Fetch Team Diagnostics (Maturity/Performance) for aggregate charts
  const { data: maturityDiags = [] } = useQuery({
    queryKey: ['maturity-diags-agg', workshop?.id],
    queryFn: async () => {
        if (!workshop) return [];
        // Ideally fetch all latest per employee, but for overview fetching recent 20 is ok
        return await base44.entities.CollaboratorMaturityDiagnostic.filter({ workshop_id: workshop.id });
    },
    enabled: !!workshop
  });

  // 3. Fetch COEX Contracts for Expirations
  const { data: coexContracts = [] } = useQuery({
    queryKey: ['coex-contracts-overview', workshop?.id],
    queryFn: async () => {
        if (!workshop) return [];
        // Need to find employees first
        const employees = await base44.entities.Employee.filter({ workshop_id: workshop.id });
        const empIds = employees.map(e => e.id);
        if (empIds.length === 0) return [];
        
        const allContracts = await base44.entities.COEXContract.filter({ status: 'ativo' });
        // Filter locally for now
        const workshopContracts = allContracts.filter(c => empIds.includes(c.employee_id));
        
        // Enrich with employee names
        return workshopContracts.map(c => {
            const emp = employees.find(e => e.id === c.employee_id);
            return { ...c, employee_name: emp?.full_name || 'Desconhecido' };
        });
    },
    enabled: !!workshop
  });

  // Trigger checks in background just to ensure freshness if needed (optional)
  useEffect(() => {
    if (workshop) {
        base44.functions.invoke('checkCoexExpirations').catch(console.error);
    }
  }, [workshop]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // --- Data Processing for Charts ---

  // Maturity Distribution
  const maturityCounts = { bebe: 0, crianca: 0, adolescente: 0, adulto: 0 };
  maturityDiags.forEach(d => {
    if (d.maturity_level && maturityCounts[d.maturity_level] !== undefined) {
      maturityCounts[d.maturity_level]++;
    }
  });
  
  const maturityChartData = [
    { name: 'Bebê', value: maturityCounts.bebe, color: '#fbbf24' },
    { name: 'Criança', value: maturityCounts.crianca, color: '#60a5fa' },
    { name: 'Adolescente', value: maturityCounts.adolescente, color: '#a78bfa' },
    { name: 'Adulto', value: maturityCounts.adulto, color: '#34d399' },
  ].filter(d => d.value > 0);

  // COEX Expirations (Next 90 days)
  const now = new Date();
  const expiringContracts = coexContracts.filter(c => {
    if (!c.end_date) return false;
    const days = (new Date(c.end_date) - now) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 90;
  }).sort((a, b) => new Date(a.end_date) - new Date(b.end_date));

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {isAdminView && workshop && (
          <AdminViewBanner workshopName={workshop.name} />
        )}
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Visão Geral</h1>
            <p className="text-gray-600 mt-1">
              Resumo estratégico da sua oficina {workshop?.name ? `— ${workshop.name}` : ''}
            </p>
          </div>
          <div className="flex gap-3">
             <Button 
                variant="outline" 
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-2"
             >
                <Bell className="w-4 h-4" />
                Configurar Alertas
             </Button>
             <Button 
                onClick={() => navigate(createPageUrl("SelecionarDiagnostico"))}
                className="bg-blue-600 hover:bg-blue-700"
             >
                <Brain className="w-4 h-4 mr-2" />
                Novo Diagnóstico
             </Button>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Entrepreneur Profile Card */}
          <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Perfil do Empresário
                </CardTitle>
            </CardHeader>
            <CardContent>
                {entrepreneurDiag ? (
                    <div className="mt-2">
                        <div className="text-2xl font-bold capitalize text-gray-900">
                            {entrepreneurDiag.dominant_profile}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                            Última avaliação: {new Date(entrepreneurDiag.created_date).toLocaleDateString('pt-BR')}
                        </p>
                        <div className="flex gap-2 mt-3">
                            <Button 
                                variant="link" 
                                className="p-0 h-auto text-blue-600"
                                onClick={() => navigate(createPageUrl("ResultadoEmpresario") + `?id=${entrepreneurDiag.id}`)}
                            >
                                Ver detalhes <TrendingUp className="w-3 h-3 ml-1" />
                            </Button>
                            <span className="text-gray-300">|</span>
                            <Button 
                                variant="link" 
                                className="p-0 h-auto text-blue-600"
                                onClick={() => navigate(createPageUrl("Historico"))}
                            >
                                Ver todos
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <p className="text-sm text-gray-500 mb-3">Perfil não identificado</p>
                        <Button size="sm" onClick={() => navigate(createPageUrl("DiagnosticoEmpresario"))}>
                            Fazer Diagnóstico
                        </Button>
                    </div>
                )}
            </CardContent>
          </Card>

          {/* Team Maturity Card */}
          <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    Maturidade da Equipe
                </CardTitle>
            </CardHeader>
            <CardContent>
                {maturityDiags.length > 0 ? (
                    <div className="flex items-center justify-between mt-2">
                        <div>
                            <div className="text-2xl font-bold text-gray-900">
                                {maturityDiags.length}
                            </div>
                            <p className="text-sm text-gray-500">Colaboradores avaliados</p>
                            <div className="flex gap-2 mt-3">
                                <Button 
                                    variant="link" 
                                    className="p-0 h-auto text-purple-600"
                                    onClick={() => navigate(createPageUrl("HistoricoMaturidade"))}
                                >
                                    Ver equipe <TrendingUp className="w-3 h-3 ml-1" />
                                </Button>
                                <span className="text-gray-300">|</span>
                                <Button 
                                    variant="link" 
                                    className="p-0 h-auto text-purple-600"
                                    onClick={() => navigate(createPageUrl("Colaboradores"))}
                                >
                                    Ver todos
                                </Button>
                            </div>
                        </div>
                        <div className="h-20 w-20">
                             <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={maturityChartData} dataKey="value" cx="50%" cy="50%" innerRadius={15} outerRadius={35} paddingAngle={2}>
                                        {maturityChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                             </ResponsiveContainer>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <p className="text-sm text-gray-500 mb-3">Sem dados de maturidade</p>
                        <Button size="sm" variant="outline" onClick={() => navigate(createPageUrl("DiagnosticoMaturidade"))}>
                            Avaliar Equipe
                        </Button>
                    </div>
                )}
            </CardContent>
          </Card>

          {/* COEX Alerts Card */}
          <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-600" />
                    Contratos COEX
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="mt-2">
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">{expiringContracts.length}</span>
                        <span className="text-sm text-gray-500">vencendo em 90 dias</span>
                    </div>
                    <div className="mt-3 space-y-2 max-h-[100px] overflow-y-auto pr-2">
                        {expiringContracts.slice(0, 3).map(c => (
                            <div key={c.id} className="text-xs flex justify-between items-center bg-amber-50 p-1.5 rounded border border-amber-100">
                                <span className="font-medium truncate max-w-[120px]">{c.employee_name}</span>
                                <span className="text-amber-700 whitespace-nowrap">
                                    {format(new Date(c.end_date), 'dd/MM/yyyy')}
                                </span>
                            </div>
                        ))}
                        {expiringContracts.length > 3 && (
                             <p className="text-xs text-center text-gray-400">+ {expiringContracts.length - 3} outros</p>
                        )}
                    </div>
                    <div className="flex gap-2 mt-3">
                        <Button 
                            variant="link" 
                            className="p-0 h-auto text-amber-600"
                            onClick={() => navigate(createPageUrl("COEXList"))}
                        >
                            Gerenciar contratos <TrendingUp className="w-3 h-3 ml-1" />
                        </Button>
                        <span className="text-gray-300">|</span>
                        <Button 
                            variant="link" 
                            className="p-0 h-auto text-amber-600"
                            onClick={() => navigate(createPageUrl("COEXList"))}
                        >
                            Ver todos
                        </Button>
                    </div>
                </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Maturidade Profissional</CardTitle>
                    <CardDescription>Distribuição dos níveis de maturidade na equipe</CardDescription>
                </CardHeader>
                <CardContent>
                    {maturityDiags.length > 0 ? (
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={maturityChartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" width={80} />
                                    <Tooltip />
                                    <Bar dataKey="value" name="Colaboradores" radius={[0, 4, 4, 0]}>
                                        {maturityChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-gray-400">
                            Nenhum dado disponível
                        </div>
                    )}
                </CardContent>
             </Card>
             
             <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Próximos Vencimentos</CardTitle>
                    <CardDescription>Cronograma de renovações COEX</CardDescription>
                </CardHeader>
                <CardContent>
                    {expiringContracts.length > 0 ? (
                        <div className="space-y-4">
                            {expiringContracts.map(contract => {
                                const daysLeft = Math.ceil((new Date(contract.end_date) - now) / (1000 * 60 * 60 * 24));
                                let statusColor = "bg-green-100 text-green-800";
                                if (daysLeft < 30) statusColor = "bg-red-100 text-red-800";
                                else if (daysLeft < 60) statusColor = "bg-amber-100 text-amber-800";

                                return (
                                    <div key={contract.id} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-10 rounded-full ${daysLeft < 30 ? 'bg-red-500' : daysLeft < 60 ? 'bg-amber-500' : 'bg-green-500'}`} />
                                            <div>
                                                <p className="font-medium text-gray-900">{contract.employee_name}</p>
                                                <p className="text-sm text-gray-500">Vence em: {format(new Date(contract.end_date), 'dd/MM/yyyy')}</p>
                                            </div>
                                        </div>
                                        <Badge className={statusColor}>
                                            {daysLeft} dias
                                        </Badge>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                         <div className="h-[300px] flex flex-col items-center justify-center text-gray-400">
                            <CheckCircle2 className="w-12 h-12 mb-2 opacity-20" />
                            <p>Nenhum contrato vencendo nos próximos 90 dias</p>
                        </div>
                    )}
                </CardContent>
             </Card>
        </div>

        <NotificationSettingsDialog 
            open={settingsOpen} 
            onOpenChange={setSettingsOpen}
            workshop={workshop}
            onUpdate={setWorkshop}
        />
      </div>
    </div>
  );
}