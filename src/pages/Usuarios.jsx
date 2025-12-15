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
import { UserPlus, Loader2, Mail, Phone, Trash2, UserX, Building2, Eye, Edit, ExternalLink, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Usuarios() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
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

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      // Lista todos os usuários - admin vê todos, usuário comum só vê da sua empresa
      const allUsers = await base44.entities.User.list();
      return Array.isArray(allUsers) ? allUsers : [];
    }
  });

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

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    const formData = new FormData(e.target);
    const workshopId = formData.get('workshop_id');
    const planoSelecionado = formData.get('plano');
    
    const data = {
      workshop_id: workshopId,
      position: formData.get('position'),
      job_role: formData.get('job_role'),
      area: formData.get('area'),
      telefone: formData.get('telefone'),
      user_status: formData.get('user_status')
    };

    // Atualizar usuário
    await updateUserMutation.mutateAsync({ userId: selectedUser.id, data });

    // Se admin e tem workshop, atualizar plano do workshop
    if (currentUser?.role === 'admin' && workshopId && planoSelecionado) {
      try {
        await base44.entities.Workshop.update(workshopId, {
          planoAtual: planoSelecionado
        });
        queryClient.invalidateQueries(['workshops']);
        toast.success("Plano atualizado!");
      } catch (error) {
        toast.error("Erro ao atualizar plano");
      }
    }
  };

  // Combinar users com workshops para tabela
  const usersWithWorkshops = useMemo(() => {
    return users.map(user => {
      const workshop = workshops.find(w => w.id === user.workshop_id);
      return {
        ...user,
        workshopName: workshop?.name || "Sem empresa",
        workshopPlan: workshop?.planoAtual || "FREE",
        workshopState: workshop?.state || "",
        workshopCity: workshop?.city || "",
        workshopRevenue: workshop?.monthly_revenue || "",
        planStartDate: workshop?.dataAssinatura || null,
        planEndDate: workshop?.dataRenovacao || null,
        workshop: workshop
      };
    });
  }, [users, workshops]);

  // Aplicar filtros
  const filteredUsers = useMemo(() => {
    return usersWithWorkshops.filter(user => {
      const matchesSearch = 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.workshopName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesEmpresa = !filters.empresa || user.workshopName?.toLowerCase().includes(filters.empresa.toLowerCase());
      const matchesPlano = !filters.plano || user.workshopPlan === filters.plano;
      const matchesEstado = !filters.estado || user.workshopState === filters.estado;
      const matchesCidade = !filters.cidade || user.workshopCity?.toLowerCase().includes(filters.cidade.toLowerCase());
      const matchesStatus = !filters.status || user.user_status === filters.status;
      const matchesFaturamento = !filters.faturamento || user.workshopRevenue === filters.faturamento;
      
      // Se não for admin, mostra só da mesma empresa
      const matchesPermission = currentUser?.role === 'admin' || user.workshop_id === currentUser?.workshop_id;
      
      return matchesSearch && matchesEmpresa && matchesPlano && matchesEstado && 
             matchesCidade && matchesStatus && matchesFaturamento && matchesPermission;
    });
  }, [usersWithWorkshops, searchTerm, filters, currentUser]);

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
            <p className="text-gray-600">Visualize e gerencie todos os usuários cadastrados</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-lg px-4 py-2">
              Total: {filteredUsers.length} registro{filteredUsers.length !== 1 ? 's' : ''}
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
        {filteredUsers.length === 0 ? (
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Colaborador</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Plano</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Data Início</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Data Fim</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900">{user.workshopName}</p>
                            {user.workshopCity && user.workshopState && (
                              <p className="text-xs text-gray-500">{user.workshopCity} - {user.workshopState}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{user.full_name || "Sem nome"}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                          {user.position && <p className="text-xs text-gray-600 mt-0.5">{user.position}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                          {user.workshopPlan}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-700">
                          {user.planStartDate ? format(new Date(user.planStartDate), 'dd/MM/yyyy') : '-'}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-700">
                          {user.planEndDate ? format(new Date(user.planEndDate), 'dd/MM/yyyy') : '-'}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={
                          user.user_status === 'ativo' ? 'bg-green-100 text-green-700' :
                          user.user_status === 'ferias' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }>
                          {user.user_status || 'ativo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsDialogOpen(true);
                            }}
                            title="Ver Detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsDialogOpen(true);
                            }}
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {user.workshop_id && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-purple-600 hover:bg-purple-700"
                                onClick={() => {
                                  navigate(`${createPageUrl("GestaoOficina")}?workshop_id=${user.workshop_id}`);
                                }}
                                title="Gestão da Oficina"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-600 text-green-700 hover:bg-green-50"
                                onClick={() => {
                                  navigate(`${createPageUrl("Colaboradores")}?workshop_id=${user.workshop_id}`);
                                }}
                                title="Ver Colaboradores"
                              >
                                <Users className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Usuário: {selectedUser?.full_name}</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <form onSubmit={handleSaveUser} className="space-y-4">
                <div>
                  <Label>Empresa (opcional)</Label>
                  <Select name="workshop_id" defaultValue={selectedUser.workshop_id || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Sem empresa</SelectItem>
                      {workshops.map(w => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name} - {w.planoAtual || "FREE"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Cargo (opcional)</Label>
                  <Input name="position" defaultValue={selectedUser.position || ""} placeholder="Ex: Gerente de Operações" />
                </div>

                <div>
                  <Label>Função (opcional)</Label>
                  <Select name="job_role" defaultValue={selectedUser.job_role || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma função" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Nenhuma</SelectItem>
                      <SelectItem value="diretor">Diretor</SelectItem>
                      <SelectItem value="gerente">Gerente</SelectItem>
                      <SelectItem value="supervisor_loja">Supervisor</SelectItem>
                      <SelectItem value="tecnico">Técnico</SelectItem>
                      <SelectItem value="comercial">Comercial</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                      <SelectItem value="rh">RH</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Área (opcional)</Label>
                  <Select name="area" defaultValue={selectedUser.area || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma área" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Nenhuma</SelectItem>
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
                  <Label>Telefone (opcional)</Label>
                  <Input name="telefone" defaultValue={selectedUser.telefone || ""} placeholder="(00) 00000-0000" />
                </div>

                <div>
                  <Label>Status</Label>
                  <Select name="user_status" defaultValue={selectedUser.user_status || "ativo"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                      <SelectItem value="ferias">Férias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {currentUser?.role === 'admin' && selectedUser.workshop_id && (
                  <div className="border-t pt-4">
                    <Label className="text-lg font-semibold text-gray-900">Plano da Oficina</Label>
                    <p className="text-sm text-gray-600 mb-2">Altere o plano da oficina deste usuário</p>
                    <Select name="plano" defaultValue={getWorkshopPlan(selectedUser.workshop_id)}>
                      <SelectTrigger className="border-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FREE">🆓 FREE - Grátis</SelectItem>
                        <SelectItem value="START">🚀 START - Inicial</SelectItem>
                        <SelectItem value="BRONZE">🥉 BRONZE</SelectItem>
                        <SelectItem value="PRATA">🥈 PRATA</SelectItem>
                        <SelectItem value="GOLD">🥇 GOLD</SelectItem>
                        <SelectItem value="IOM">💎 IOM - Premium</SelectItem>
                        <SelectItem value="MILLIONS">👑 MILLIONS - Elite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

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