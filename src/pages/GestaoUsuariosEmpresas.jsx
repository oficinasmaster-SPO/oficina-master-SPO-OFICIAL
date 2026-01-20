import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  UserPlus, Loader2, Mail, Phone, Trash2, UserX, Building2, Eye, Edit, 
  ExternalLink, Filter, X, Users, Key, Copy, CheckCircle, ChevronDown,
  Home, BarChart3, Wrench, Calculator, Target, Brain, Package, FileCheck,
  GraduationCap, Lightbulb, Briefcase
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import AIProfileSuggestions from "@/components/admin/users/AIProfileSuggestions";

export default function GestaoUsuariosEmpresas() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [resetPasswordDialog, setResetPasswordDialog] = useState({ open: false, password: "" });
  const [expandedRow, setExpandedRow] = useState(null);
  const [aiFormData, setAiFormData] = useState({ cargo: "", area: "" });
  
  // Filtros avançados
  const [filters, setFilters] = useState({
    empresa: "",
    plano: "",
    estado: "",
    cidade: "",
    status: "",
    faturamento: ""
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: workshops = [] } = useQuery({
    queryKey: ['workshops'],
    queryFn: async () => {
      const result = await base44.entities.Workshop.list();
      return Array.isArray(result) ? result : [];
    }
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return Array.isArray(allUsers) ? allUsers : [];
    }
  });

  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const allEmployees = await base44.entities.Employee.list();
      return Array.isArray(allEmployees) ? allEmployees : [];
    }
  });

  const isLoading = usersLoading || employeesLoading;

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }) => {
      return await base44.entities.User.update(userId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users-list']);
      toast.success("Usuário atualizado!");
      setIsDialogOpen(false);
      setSelectedUser(null);
    },
    onError: () => toast.error("Erro ao atualizar usuário")
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      return await base44.entities.User.delete(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users-list']);
      toast.success("Usuário excluído!");
    },
    onError: () => toast.error("Erro ao excluir usuário")
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, userEmail }) => {
      // Gerar senha temporária (12 caracteres alfanuméricos + especiais)
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
      let tempPassword = '';
      for (let i = 0; i < 12; i++) {
        tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      // Como a plataforma Base44 não expõe reset de senha diretamente,
      // retornamos apenas a senha gerada para o admin compartilhar manualmente
      return { temporary_password: tempPassword };
    },
    onSuccess: (data) => {
      setResetPasswordDialog({ open: true, password: data.temporary_password });
      toast.success("Senha temporária gerada!");
    },
    onError: () => toast.error("Erro ao gerar senha temporária")
  });

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    const formData = new FormData(e.target);
    const workshopId = formData.get('workshop_id');
    const jobRole = formData.get('job_role');
    const newPlan = formData.get('plano');
    
    // Buscar perfil correspondente à job_role
    let profileId = selectedUser.profile_id;
    if (jobRole) {
      try {
        const allProfiles = await base44.entities.UserProfile.list();
        const matchingProfile = (allProfiles || []).find(
          (p) =>
            p.status === "ativo" &&
            p.job_roles &&
            Array.isArray(p.job_roles) &&
            p.job_roles.includes(jobRole)
        );
        if (matchingProfile) {
          profileId = matchingProfile.id;
          console.log(`✅ Auto-vinculado ao perfil: ${matchingProfile.name}`);
        }
      } catch (error) {
        console.warn("Erro ao buscar perfil:", error);
      }
    }
    
    const data = {
      workshop_id: workshopId,
      position: formData.get('position'),
      job_role: jobRole,
      area: formData.get('area'),
      telefone: formData.get('telefone'),
      profile_id: profileId
    };

    try {
      // Atualizar usuário
      await updateUserMutation.mutateAsync({ userId: selectedUser.id, data });

      // Se o plano foi alterado, atualizar a Workshop
      if (workshopId && newPlan && newPlan !== selectedUser.workshopPlan) {
        await base44.entities.Workshop.update(workshopId, {
          planoAtual: newPlan,
          dataAssinatura: new Date().toISOString()
        });
        toast.success("Plano da oficina atualizado!");
        queryClient.invalidateQueries(['workshops']);
      }
    } catch (error) {
      toast.error("Erro ao salvar: " + error.message);
    }
  };

  // Combinar WORKSHOPS com employees para tabela
  const workshopsWithData = useMemo(() => {
    return workshops.map(workshop => {
      // Buscar employees desta oficina
      const workshopEmployees = employees.filter(emp => emp.workshop_id === workshop.id);
      
      // Separar entre com login e sem login
      const employeesWithLogin = workshopEmployees.filter(emp => emp.user_id);
      const employeesPending = workshopEmployees.filter(emp => !emp.user_id);
      
      return {
        id: workshop.id,
        workshopName: workshop.name || "Sem nome",
        workshopPlan: workshop.planoAtual || "FREE",
        workshopState: workshop.state || "",
        workshopCity: workshop.city || "",
        workshopRevenue: workshop.monthly_revenue || "",
        planStartDate: workshop.dataAssinatura || null,
        planEndDate: workshop.dataRenovacao || null,
        status: workshop.status || "ativo",
        workshop: workshop,
        totalEmployees: workshopEmployees.length,
        employeesWithLogin: employeesWithLogin.length,
        employeesPending: employeesPending.length,
        employees: workshopEmployees
      };
    });
  }, [workshops, employees]);

  // Aplicar filtros
  const filteredWorkshops = useMemo(() => {
    return workshopsWithData.filter(workshop => {
      const matchesSearch = 
        workshop.workshopName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        workshop.employees.some(emp => 
          emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      const matchesEmpresa = !filters.empresa || workshop.workshopName?.toLowerCase().includes(filters.empresa.toLowerCase());
      const matchesPlano = !filters.plano || workshop.workshopPlan === filters.plano;
      const matchesEstado = !filters.estado || workshop.workshopState === filters.estado;
      const matchesCidade = !filters.cidade || workshop.workshopCity?.toLowerCase().includes(filters.cidade.toLowerCase());
      const matchesStatus = !filters.status || workshop.status === filters.status;
      const matchesFaturamento = !filters.faturamento || workshop.workshopRevenue === filters.faturamento;
      
      // Se não for admin, mostra só a própria empresa
      const matchesPermission = currentUser?.role === 'admin' || workshop.id === currentUser?.workshop_id;
      
      return matchesSearch && matchesEmpresa && matchesPlano && matchesEstado && 
             matchesCidade && matchesStatus && matchesFaturamento && matchesPermission;
    });
  }, [workshopsWithData, searchTerm, filters, currentUser]);

  // Listas únicas para filtros
  const uniqueStates = useMemo(() => {
    const states = workshops.map(w => w.state).filter(Boolean);
    return [...new Set(states)].sort();
  }, [workshops]);

  const uniquePlans = ["FREE", "START", "BRONZE", "PRATA", "GOLD", "IOM", "MILLIONS"];
  
  const revenueRanges = [
    "0_20k", "20k_40k", "40k_60k", "60k_80k", "80k_100k", "100k_130k",
    "130k_160k", "160k_190k", "190k_200k", "200k_250k", "250k_300k",
    "300k_350k", "350k_400k", "400k_450k", "450k_500k", "500k_600k",
    "acima_1m"
  ];

  const clearFilters = () => {
    setFilters({
      empresa: "",
      plano: "",
      estado: "",
      cidade: "",
      status: "",
      faturamento: ""
    });
    setSearchTerm("");
  };

  const activeFiltersCount = Object.values(filters).filter(v => v !== "").length + (searchTerm ? 1 : 0);

  const getWorkshopName = (workshopId) => {
    const workshop = workshops.find(w => w.id === workshopId);
    return workshop?.name || "Sem empresa";
  };

  const getWorkshopPlan = (workshopId) => {
    const workshop = workshops.find(w => w.id === workshopId);
    return workshop?.planoAtual || "FREE";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Gestão de Usuários e Empresas</h1>
            <p className="text-gray-600">Central única para gerenciar usuários, oficinas e acessos do sistema</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-lg px-4 py-2">
              {filteredWorkshops.length} empresa{filteredWorkshops.length !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="outline" className="text-lg px-4 py-2 bg-blue-50">
              {filteredWorkshops.reduce((sum, w) => sum + w.totalEmployees, 0)} colaboradores
            </Badge>
            {activeFiltersCount > 0 && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Limpar Filtros ({activeFiltersCount})
              </Button>
            )}
          </div>
        </div>

        {/* Filtros Avançados */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="w-5 h-5" />
              Filtros Avançados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-gray-600 mb-1">Busca Geral</Label>
                <Input
                  placeholder="Nome, email, empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1">Empresa</Label>
                <Input
                  placeholder="Nome da empresa..."
                  value={filters.empresa}
                  onChange={(e) => setFilters({...filters, empresa: e.target.value})}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1">Plano</Label>
                <Select value={filters.plano} onValueChange={(val) => setFilters({...filters, plano: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os planos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Todos</SelectItem>
                    {uniquePlans.map(plan => (
                      <SelectItem key={plan} value={plan}>{plan}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1">Status</Label>
                <Select value={filters.status} onValueChange={(val) => setFilters({...filters, status: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Todos</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="ferias">Férias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1">Estado</Label>
                <Select value={filters.estado} onValueChange={(val) => setFilters({...filters, estado: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Todos</SelectItem>
                    {uniqueStates.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1">Cidade</Label>
                <Input
                  placeholder="Nome da cidade..."
                  value={filters.cidade}
                  onChange={(e) => setFilters({...filters, cidade: e.target.value})}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1">Faturamento</Label>
                <Select value={filters.faturamento} onValueChange={(val) => setFilters({...filters, faturamento: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as faixas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Todos</SelectItem>
                    {revenueRanges.map(range => (
                      <SelectItem key={range} value={range}>{range.replace('_', ' - ').replace('k', 'mil')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Resultados */}
        {filteredWorkshops.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="p-12 text-center">
              <UserPlus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhum resultado encontrado
              </h3>
              <p className="text-gray-600">Ajuste os filtros para visualizar outros registros</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Empresa</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Localização</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Colaboradores</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Plano</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Data Assinatura</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredWorkshops.map((workshop) => (
                    <React.Fragment key={workshop.id}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-900">{workshop.workshopName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {workshop.workshopCity && workshop.workshopState ? (
                            <p className="text-sm text-gray-700">{workshop.workshopCity} - {workshop.workshopState}</p>
                          ) : (
                            <p className="text-sm text-gray-400">-</p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-center space-y-1">
                            <Badge className="bg-blue-600 text-white">
                              {workshop.totalEmployees} total
                            </Badge>
                            {workshop.employeesWithLogin > 0 && (
                              <Badge className="bg-green-100 text-green-700 block">
                                {workshop.employeesWithLogin} ativo{workshop.employeesWithLogin !== 1 ? 's' : ''}
                              </Badge>
                            )}
                            {workshop.employeesPending > 0 && (
                              <Badge className="bg-orange-100 text-orange-700 block">
                                {workshop.employeesPending} pendente{workshop.employeesPending !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                            {workshop.workshopPlan}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm text-gray-700">
                            {workshop.planStartDate ? format(new Date(workshop.planStartDate), 'dd/MM/yyyy') : '-'}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={
                            workshop.status === 'ativo' ? 'bg-green-100 text-green-700' :
                            workshop.status === 'acompanhamento' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }>
                            {workshop.status || 'ativo'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setExpandedRow(expandedRow === workshop.id ? null : workshop.id)}
                              title="Ver Detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-blue-600 hover:bg-blue-700"
                              onClick={() => navigate(`${createPageUrl("Home")}?workshop_id=${workshop.id}`)}
                              title="Acessar Dashboard"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      
                      {expandedRow === workshop.id && (
                        <tr className="bg-gradient-to-br from-blue-50 to-indigo-50">
                          <td colSpan="7" className="px-4 py-6">
                            <div className="max-w-7xl mx-auto space-y-6">
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                  <Users className="w-5 h-5" />
                                  Colaboradores de {workshop.workshopName}
                                </h4>
                                <Badge className="bg-blue-600 text-white">
                                  {workshop.totalEmployees} colaborador{workshop.totalEmployees !== 1 ? 'es' : ''}
                                </Badge>
                              </div>

                              {/* Lista de Colaboradores */}
                              {workshop.employees.length > 0 ? (
                                <div className="bg-white rounded-lg p-4 shadow-sm">
                                  <div className="space-y-3">
                                    {workshop.employees.map((employee) => {
                                      const hasLogin = !!employee.user_id;
                                      return (
                                        <div key={employee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                          <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${hasLogin ? 'bg-green-500' : 'bg-orange-400'}`} />
                                            <div>
                                              <p className="font-medium text-gray-900">{employee.full_name || "Sem nome"}</p>
                                              <p className="text-xs text-gray-500">{employee.email || "Sem email"}</p>
                                              {employee.position && <p className="text-xs text-gray-600 mt-0.5">{employee.position}</p>}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {hasLogin ? (
                                              <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                                            ) : (
                                              <Badge className="bg-orange-100 text-orange-700">Pendente Login</Badge>
                                            )}
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => navigate(`${createPageUrl("DetalhesColaborador")}?id=${employee.id}`)}
                                            >
                                              <Eye className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-white rounded-lg p-8 text-center">
                                  <UserX className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                  <p className="text-gray-600">Nenhum colaborador cadastrado</p>
                                </div>
                              )}

                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                  <ExternalLink className="w-5 h-5" />
                                  Acesso Rápido às Páginas
                                </h4>
                              </div>

                              {/* Dashboard & Rankings */}
                              <div className="bg-white rounded-lg p-4 shadow-sm">
                                <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <BarChart3 className="w-4 h-4" />
                                  Dashboard & Rankings
                                </h5>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("Home")}?workshop_id=${workshop.id}`)}>
                                    <Home className="w-4 h-4 mr-2" />Tela Início
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("DashboardOverview")}?workshop_id=${user.workshop_id}`)}>
                                    <BarChart3 className="w-4 h-4 mr-2" />Visão Geral
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("Dashboard")}?workshop_id=${user.workshop_id}`)}>
                                    <BarChart3 className="w-4 h-4 mr-2" />Dashboard Nacional
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("Gamificacao")}?workshop_id=${user.workshop_id}`)}>
                                    <Target className="w-4 h-4 mr-2" />Desafios
                                  </Button>
                                </div>
                              </div>

                              {/* Cadastros */}
                              <div className="bg-purple-50 rounded-lg p-4 shadow-sm border border-purple-200">
                                <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <Building2 className="w-4 h-4" />
                                  Cadastros (Base de Dados)
                                </h5>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("GestaoOficina")}?workshop_id=${user.workshop_id}`)}>
                                    <Building2 className="w-4 h-4 mr-2" />Gestão da Oficina
                                  </Button>
                                </div>
                              </div>

                              {/* Pátio Operação */}
                              <div className="bg-white rounded-lg p-4 shadow-sm">
                                <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <Wrench className="w-4 h-4" />
                                  Pátio Operação (QGP)
                                </h5>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("Tarefas")}?workshop_id=${user.workshop_id}`)}>
                                    <Wrench className="w-4 h-4 mr-2" />Tarefas Operacionais
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("Notificacoes")}?workshop_id=${user.workshop_id}`)}>
                                    <Wrench className="w-4 h-4 mr-2" />Notificações
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("RegistroDiario")}?workshop_id=${user.workshop_id}`)}>
                                    <Wrench className="w-4 h-4 mr-2" />Diário de Produção
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("QGPBoard")}?workshop_id=${user.workshop_id}`)}>
                                    <Wrench className="w-4 h-4 mr-2" />Quadro Geral (TV)
                                  </Button>
                                </div>
                              </div>

                              {/* Resultados */}
                              <div className="bg-white rounded-lg p-4 shadow-sm">
                                <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <Calculator className="w-4 h-4" />
                                  Resultados (OS, Metas, Finanças)
                                </h5>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("HistoricoMetas")}?workshop_id=${user.workshop_id}`)}>
                                    <Calculator className="w-4 h-4 mr-2" />Histórico de Metas
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("DesdobramentoMeta")}?workshop_id=${user.workshop_id}`)}>
                                    <Calculator className="w-4 h-4 mr-2" />Desdobramento
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("DRETCMP2")}?workshop_id=${user.workshop_id}`)}>
                                    <Calculator className="w-4 h-4 mr-2" />DRE & TCMP²
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("DiagnosticoOS")}?workshop_id=${user.workshop_id}`)}>
                                    <Calculator className="w-4 h-4 mr-2" />OS - R70/I30
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("DiagnosticoProducao")}?workshop_id=${user.workshop_id}`)}>
                                    <Calculator className="w-4 h-4 mr-2" />Produção vs Salário
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("DiagnosticoEndividamento")}?workshop_id=${user.workshop_id}`)}>
                                    <Calculator className="w-4 h-4 mr-2" />Endividamento
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("DiagnosticoGerencial")}?workshop_id=${user.workshop_id}`)}>
                                    <Calculator className="w-4 h-4 mr-2" />Diag. Gerencial
                                  </Button>
                                </div>
                              </div>

                              {/* Pessoas & RH */}
                              <div className="bg-green-50 rounded-lg p-4 shadow-sm border border-green-200">
                                <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <Users className="w-4 h-4" />
                                  Pessoas & RH (Colaboradores)
                                </h5>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("Autoavaliacoes")}?workshop_id=${user.workshop_id}`)}>
                                    <Target className="w-4 h-4 mr-2" />Autoavaliações
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("Colaboradores")}?workshop_id=${user.workshop_id}`)}>
                                    <Users className="w-4 h-4 mr-2" />Colaboradores
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("ConvidarColaborador")}?workshop_id=${user.workshop_id}`)}>
                                    <Users className="w-4 h-4 mr-2" />Convidar
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("CDCList")}?workshop_id=${user.workshop_id}`)}>
                                    <Target className="w-4 h-4 mr-2" />CDC
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("COEXList")}?workshop_id=${user.workshop_id}`)}>
                                    <Target className="w-4 h-4 mr-2" />COEX
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("DiagnosticoEmpresario")}?workshop_id=${user.workshop_id}`)}>
                                    <Target className="w-4 h-4 mr-2" />Perfil Empresário
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("DiagnosticoDISC")}?workshop_id=${user.workshop_id}`)}>
                                    <Target className="w-4 h-4 mr-2" />Teste DISC
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("DiagnosticoMaturidade")}?workshop_id=${user.workshop_id}`)}>
                                    <Target className="w-4 h-4 mr-2" />Maturidade
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("DiagnosticoDesempenho")}?workshop_id=${user.workshop_id}`)}>
                                    <Target className="w-4 h-4 mr-2" />Matriz Desempenho
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("DiagnosticoCarga")}?workshop_id=${user.workshop_id}`)}>
                                    <Target className="w-4 h-4 mr-2" />Carga de Trabalho
                                  </Button>
                                </div>
                              </div>

                              {/* Diagnósticos & IA */}
                              <div className="bg-white rounded-lg p-4 shadow-sm">
                                <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <Brain className="w-4 h-4" />
                                  Diagnósticos & IA
                                </h5>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("IAAnalytics")}?workshop_id=${user.workshop_id}`)}>
                                    <Brain className="w-4 h-4 mr-2" />IA Analytics
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("TreinamentoVendas")}?workshop_id=${user.workshop_id}`)}>
                                    <Brain className="w-4 h-4 mr-2" />Treinamento Vendas
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("DiagnosticoComercial")}?workshop_id=${user.workshop_id}`)}>
                                    <Brain className="w-4 h-4 mr-2" />Diag. Comercial
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("SelecionarDiagnostico")}?workshop_id=${user.workshop_id}`)}>
                                    <Brain className="w-4 h-4 mr-2" />Selecionar Diag.
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("Historico")}?workshop_id=${user.workshop_id}`)}>
                                    <Brain className="w-4 h-4 mr-2" />Histórico
                                  </Button>
                                </div>
                              </div>

                              {/* Processos */}
                              <div className="bg-white rounded-lg p-4 shadow-sm">
                                <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <Package className="w-4 h-4" />
                                  Processos
                                </h5>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("MeusProcessos")}?workshop_id=${user.workshop_id}`)}>
                                    <Package className="w-4 h-4 mr-2" />Meus Processos (MAPs)
                                  </Button>
                                </div>
                              </div>

                              {/* Documentos */}
                              <div className="bg-white rounded-lg p-4 shadow-sm">
                                <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <FileCheck className="w-4 h-4" />
                                  Documentos
                                </h5>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("RepositorioDocumentos")}?workshop_id=${user.workshop_id}`)}>
                                    <FileCheck className="w-4 h-4 mr-2" />Repositório
                                  </Button>
                                </div>
                              </div>

                              {/* Cultura */}
                              <div className="bg-white rounded-lg p-4 shadow-sm">
                                <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <Target className="w-4 h-4" />
                                  Cultura
                                </h5>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("CulturaOrganizacional")}?workshop_id=${user.workshop_id}`)}>
                                    <Target className="w-4 h-4 mr-2" />Manual da Cultura
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("MissaoVisaoValores")}?workshop_id=${user.workshop_id}`)}>
                                    <Target className="w-4 h-4 mr-2" />Missão/Visão
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("RituaisAculturamento")}?workshop_id=${user.workshop_id}`)}>
                                    <Target className="w-4 h-4 mr-2" />Rituais
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("CronogramaAculturacao")}?workshop_id=${user.workshop_id}`)}>
                                    <Target className="w-4 h-4 mr-2" />Cronograma
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("PesquisaClima")}?workshop_id=${user.workshop_id}`)}>
                                    <Target className="w-4 h-4 mr-2" />Pesquisa de Clima
                                  </Button>
                                </div>
                              </div>

                              {/* Treinamentos */}
                              <div className="bg-white rounded-lg p-4 shadow-sm">
                                <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <GraduationCap className="w-4 h-4" />
                                  Treinamentos
                                </h5>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("GerenciarTreinamentos")}?workshop_id=${user.workshop_id}`)}>
                                    <GraduationCap className="w-4 h-4 mr-2" />Gestão Treinamentos
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("AcompanhamentoTreinamento")}?workshop_id=${user.workshop_id}`)}>
                                    <GraduationCap className="w-4 h-4 mr-2" />Acompanhamento
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("MeusTreinamentos")}?workshop_id=${user.workshop_id}`)}>
                                    <GraduationCap className="w-4 h-4 mr-2" />Meus Treinamentos
                                  </Button>
                                </div>
                              </div>

                              {/* Gestão da Operação */}
                              <div className="bg-white rounded-lg p-4 shadow-sm">
                                <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <Lightbulb className="w-4 h-4" />
                                  Gestão da Operação
                                </h5>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("DicasOperacao")}?workshop_id=${user.workshop_id}`)}>
                                    <Lightbulb className="w-4 h-4 mr-2" />Dicas da Operação
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("GestaoDesafios")}?workshop_id=${user.workshop_id}`)}>
                                    <Lightbulb className="w-4 h-4 mr-2" />Criar Desafios
                                  </Button>
                                </div>
                              </div>

                              {/* Aceleração */}
                              <div className="bg-orange-50 rounded-lg p-4 shadow-sm border border-orange-200">
                                <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <Briefcase className="w-4 h-4" />
                                  Aceleração
                                </h5>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("PainelClienteAceleracao")}?workshop_id=${user.workshop_id}`)}>
                                    <Briefcase className="w-4 h-4 mr-2" />Plano de Aceleração
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("CronogramaImplementacao")}?workshop_id=${user.workshop_id}`)}>
                                    <Briefcase className="w-4 h-4 mr-2" />Cronograma
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("ControleAceleracao")}?workshop_id=${user.workshop_id}`)}>
                                    <Briefcase className="w-4 h-4 mr-2" />Controle Aceleração
                                  </Button>
                                  <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`${createPageUrl("RelatoriosAceleracao")}?workshop_id=${user.workshop_id}`)}>
                                    <Briefcase className="w-4 h-4 mr-2" />Relatórios
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Dialog open={resetPasswordDialog.open} onOpenChange={(open) => setResetPasswordDialog({ ...resetPasswordDialog, open })}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Senha Temporária Gerada
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 mb-3">
                  ⚠️ Copie esta senha e compartilhe com o usuário de forma segura. Esta senha não será exibida novamente.
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    value={resetPasswordDialog.password}
                    readOnly
                    className="font-mono text-lg bg-white"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(resetPasswordDialog.password);
                      toast.success("Senha copiada!");
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  📧 Compartilhe esta senha com <strong>{selectedUser?.email}</strong> via canal seguro (WhatsApp, email, etc.)
                </p>
              </div>
              <Button
                className="w-full"
                onClick={() => setResetPasswordDialog({ open: false, password: "" })}
              >
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Usuário: {selectedUser?.full_name}</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <form onSubmit={handleSaveUser} className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-blue-900">Email</Label>
                      <Input
                        value={selectedUser.email || ""}
                        disabled
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-blue-900">Senha</Label>
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          value="••••••••"
                          disabled
                          className="bg-white"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-orange-600 text-orange-700 hover:bg-orange-50"
                          onClick={() => {
                            if (confirm(`Resetar senha de ${selectedUser.full_name}?\n\nUma senha temporária será gerada e exibida para você.`)) {
                              resetPasswordMutation.mutate({ 
                                userId: selectedUser.id,
                                userEmail: selectedUser.email 
                              });
                            }
                          }}
                          disabled={resetPasswordMutation.isPending}
                        >
                          {resetPasswordMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Key className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-blue-700 mt-1">Clique no botão para gerar nova senha temporária</p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Empresa *</Label>
                  <Select name="workshop_id" defaultValue={selectedUser.workshop_id || ""} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {workshops.map(w => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name} - {w.planoAtual || "FREE"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Plano da Oficina *</Label>
                  <Select name="plano" defaultValue={selectedUser.workshopPlan || "FREE"} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o plano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FREE">FREE</SelectItem>
                      <SelectItem value="START">START</SelectItem>
                      <SelectItem value="BRONZE">BRONZE</SelectItem>
                      <SelectItem value="PRATA">PRATA</SelectItem>
                      <SelectItem value="GOLD">GOLD</SelectItem>
                      <SelectItem value="IOM">IOM</SelectItem>
                      <SelectItem value="MILLIONS">MILLIONS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sugestões de IA */}
                <AIProfileSuggestions
                  cargo={aiFormData.cargo || selectedUser.position}
                  area={aiFormData.area || selectedUser.area}
                  workshopId={selectedUser.workshop_id}
                  onApplySuggestion={(suggestions) => {
                    // Aplicar sugestões nos campos do form
                    const jobRoleSelect = document.querySelector('select[name="job_role"]');
                    if (jobRoleSelect && suggestions.job_role) {
                      jobRoleSelect.value = suggestions.job_role;
                      jobRoleSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                  }}
                />

                <div>
                  <Label>Cargo *</Label>
                  <Input 
                    name="position" 
                    defaultValue={selectedUser.position || ""} 
                    placeholder="Ex: Gerente de Operações" 
                    required
                    onChange={(e) => setAiFormData(prev => ({ ...prev, cargo: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>Função *</Label>
                  <Select 
                    name="job_role" 
                    defaultValue={selectedUser.job_role || ""} 
                    required
                    onValueChange={(val) => setAiFormData(prev => ({ ...prev, job_role: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma função" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="socio">Sócio</SelectItem>
                      <SelectItem value="diretor">Diretor</SelectItem>
                      <SelectItem value="gerente">Gerente</SelectItem>
                      <SelectItem value="supervisor_loja">Supervisor</SelectItem>
                      <SelectItem value="tecnico">Técnico</SelectItem>
                      <SelectItem value="comercial">Comercial</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                      <SelectItem value="rh">RH</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="acelerador">Acelerador</SelectItem>
                      <SelectItem value="consultor">Consultor</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Área *</Label>
                  <Select 
                    name="area" 
                    defaultValue={selectedUser.area || ""} 
                    required
                    onValueChange={(val) => setAiFormData(prev => ({ ...prev, area: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma área" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendas">Vendas</SelectItem>
                      <SelectItem value="comercial">Comercial</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="tecnico">Técnico</SelectItem>
                      <SelectItem value="administrativo">Administrativo</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                      <SelectItem value="gerencia">Gerência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Telefone *</Label>
                  <Input name="telefone" defaultValue={selectedUser.telefone || ""} placeholder="(00) 00000-0000" required />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={updateUserMutation.isPending}>
                    {updateUserMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}