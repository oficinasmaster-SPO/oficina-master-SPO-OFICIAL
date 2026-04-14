import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useOptimizedEmployees } from '@/components/hooks/useOptimizedEmployees';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { UserPlus, Loader2, Sparkles, Heart, FilePenLine, Eye, UserCheck, User, MoreHorizontal, Edit, Trash2, Power, Share2, Link } from "lucide-react";
import ModalCadastroColaborador from "@/components/colaborador/ModalCadastroColaborador";
import { createPageUrl } from "@/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import AITrainingSuggestions from "../components/rh/AITrainingSuggestions";
import EmployeeProfileViewer from "../components/employee/EmployeeProfileViewer";
import DynamicHelpSystem from "../components/help/DynamicHelpSystem";
import QuickTipsBar from "../components/help/QuickTipsBar";
import AdvancedFilter from "@/components/shared/AdvancedFilter";
import { useProfileAutoAssignment } from "@/components/hooks/useProfileAutoAssignment";
import { useOnDemandPermission } from "@/components/hooks/useOnDemandPermission";
import { toast } from "sonner";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";
// import ActivityNotificationSettings from "../components/rh/ActivityNotificationSettings"; // Removed
// import { Settings } from "lucide-react"; // Removed if unused elsewhere

export default function Colaboradores() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  
  const isCadastroModalOpen = searchParams.get("modal") === "cadastrocolaborador";
  const [statusFilter, setStatusFilter] = useState("all");
  const [maturityFilter, setMaturityFilter] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [profileViewerEmployee, setProfileViewerEmployee] = useState(null);
  const queryClient = useQueryClient();
  const { checkPermission, checking } = useOnDemandPermission();
  
  // Hook de atribuição automática de perfis (Desativado temporariamente para evitar spam de notificações)
  // useProfileAutoAssignment(false, (employee, result) => {
  //   queryClient.invalidateQueries({ queryKey: ['employees', workshop?.id] });
  // });

  const assignEmployeeToUserMutation = useMutation({
    mutationFn: async ({ employeeId, email, workshopId }) => {
      const response = await base44.functions.invoke('assignEmployeeToUser', { employeeId, email, workshopId });
      if (!response.data.success) {
        throw new Error(response.data.error || "Erro ao atribuir colaborador ao usuário.");
      }
      return response.data;
    },
    onSuccess: () => {
      toast.success("✅ Colaborador vinculado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao vincular colaborador.");
    },
  });
  // const [showSettings, setShowSettings] = useState(false);

  // Fetch user first to get workshop context
  const location = useLocation();
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { workshop } = useWorkshopContext();

  const { employees = [], isLoading } = useOptimizedEmployees(workshop?.id);

  const { data: coexContracts = [] } = useQuery({
    queryKey: ['coex-contracts'],
    queryFn: async () => {
      try {
        const result = await base44.entities.COEXContract.list('-created_date');
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.log("Error fetching COEX contracts:", error);
        return [];
      }
    },
    retry: 1
  });

  const statusColors = {
  ativo: "bg-green-100 text-green-700",
  inativo: "bg-gray-100 text-gray-700",
  ferias: "bg-blue-100 text-blue-700"
  };

  const maturityColors = {
  bebe: "bg-yellow-100 text-yellow-800 border-yellow-200",
  crianca: "bg-orange-100 text-orange-800 border-orange-200",
  adolescente: "bg-blue-100 text-blue-800 border-blue-200",
  adulto: "bg-purple-100 text-purple-800 border-purple-200"
  };

  const maturityLabels = {
  bebe: "Júnior",
  crianca: "Pleno",
  adolescente: "Sênior",
  adulto: "Master"
  };

  const filteredEmployees = Array.isArray(employees) ? employees.filter((employee) => {
    if (!employee?.full_name || !employee?.position) return false;
    const matchesSearch = employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || employee.status === statusFilter;
    const matchesMaturity = maturityFilter === "all" || (employee.current_maturity_level === maturityFilter);
    return matchesSearch && matchesStatus && matchesMaturity;
  }) : [];

  const getTotalCost = (employee) => {
    return employee.salary + (employee.commission || 0) + (employee.bonus || 0) +
           (employee.benefits?.meal_voucher || 0) + 
           (employee.benefits?.transport_voucher || 0) + 
           (employee.benefits?.health_insurance || 0);
  };

  const getTotalProduction = (employee) => {
    return (employee.production_parts || 0) + (employee.production_parts_sales || 0) + (employee.production_services || 0) + (employee.production_services_sales || 0);
  };

  const getActiveCOEX = (employeeId) => {
    if (!Array.isArray(coexContracts)) return null;
    return coexContracts.find(c => c.employee_id === employeeId && c.status === 'ativo');
  };

  const quickTips = [
    "Use a IA para sugestões personalizadas de treinamento para cada colaborador",
    "O CDC (Conexão e Diagnóstico) aumenta o salário emocional da sua equipe",
    "COEX (Contrato de Expectativas) alinha expectativas e reduz turnover",
    "Monitore a produtividade de cada colaborador para identificar necessidades de treinamento"
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <DynamicHelpSystem pageName="Colaboradores" autoStartTour={employees.length === 0} />
      
      <div className="max-w-[120rem] mx-auto">
        <QuickTipsBar tips={quickTips} pageName="colaboradores" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Colaboradores</h1>
            <p className="text-gray-600">Gerencie sua equipe com inteligência artificial</p>
          </div>
          <Button
            onClick={async () => {
              const allowed = await checkPermission('employees', 'create', {
                onDenied: () => toast.error('Você não tem permissão para criar colaboradores')
              });
              if (allowed) {
                setSearchParams(prev => { prev.set("modal", "cadastrocolaborador"); return prev; });
              }
            }}
            className="bg-red-500 hover:bg-red-600 text-white rounded-[10px] shadow-[0_4px_12px_rgba(239,68,68,0.3)] transition-all duration-200 hover:scale-105"
            id="btn-novo-colaborador"
            disabled={checking}
          >
            {checking ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <UserPlus className="w-5 h-5 mr-2" />}
            Novo Colaborador
          </Button>
          
          {/* Button Notificações removido e movido para Admin */}
        </div>

        <AdvancedFilter 
            onFilter={(params) => {
                setSearchTerm(params.search);
                setStatusFilter(params.status || 'all');
                setMaturityFilter(params.maturity || 'all');
            }}
            filterConfig={[
                {
                    key: "status",
                    label: "Status",
                    type: "select",
                    defaultValue: "all",
                    options: [
                        { value: "all", label: "Todos" },
                        { value: "ativo", label: "Ativo" },
                        { value: "inativo", label: "Inativo" },
                        { value: "ferias", label: "Férias" }
                    ]
                },
                {
                    key: "maturity",
                    label: "Maturidade",
                    type: "select",
                    defaultValue: "all",
                    options: [
                        { value: "all", label: "Todas" },
                        { value: "bebe", label: "Júnior" },
                        { value: "crianca", label: "Pleno" },
                        { value: "adolescente", label: "Sênior" },
                        { value: "adulto", label: "Master" }
                    ]
                }
            ]}
            placeholder="Buscar por nome ou cargo..."
        />

        {filteredEmployees.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="p-12 text-center">
              <UserPlus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhum colaborador encontrado
              </h3>
              <p className="text-gray-600 mb-6">
                Cadastre colaboradores para começar
              </p>
              <Button
                onClick={() => setSearchParams(prev => { prev.set("modal", "cadastrocolaborador"); return prev; })}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Adicionar Primeiro Colaborador
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-x-auto border border-gray-200">
            <table className="w-full whitespace-nowrap" id="lista-colaboradores">
              <thead className="bg-[#F9FAFB] border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 w-16 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"></th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Cargo</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-28">Maturidade</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Custo Total</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-28">Produção</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-20" title="Produtividade">Prod.%</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEmployees.map((employee) => {
                  const totalCost = getTotalCost(employee);
                  const totalProduction = getTotalProduction(employee);
                  const productivity = totalCost > 0 ? ((totalProduction / totalCost) * 100).toFixed(0) : 0;
                  const activeCOEX = getActiveCOEX(employee.id);

                  return (
                    <tr key={employee.id} className="relative hover:bg-[#F9FAFB] transition-all duration-200 hover:scale-[1.01] hover:shadow-sm hover:z-10 bg-white border-b border-gray-100 last:border-0">
                      <td className="px-6 py-4 text-left">
                        {employee.profile_picture_url ? (
                          <img src={employee.profile_picture_url} alt={employee.full_name} className="w-[44px] h-[44px] rounded-full object-cover border border-[#FF0000]" />
                        ) : (
                          <div className="w-[44px] h-[44px] rounded-full bg-gray-100 border border-[#FF0000] flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-left">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{employee.full_name}</p>
                            {employee.identificador && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                                {employee.identificador}
                              </span>
                            )}
                          </div>
                          {employee.job_role && (
                            <span className="text-xs text-gray-500 capitalize">{employee.job_role.replace('_', ' ')}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-left text-sm text-gray-600 font-medium">{employee.position}</td>
                      <td className="px-6 py-4 text-left">
                        <Badge className={`${statusColors[employee.status]} font-medium px-2.5 py-1 rounded-md`}>
                          {employee.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-left">
                        {employee.current_maturity_level && (
                          <Badge className={`${maturityColors[employee.current_maturity_level] || "bg-gray-100 text-gray-700"} font-medium px-2.5 py-1 rounded-md`}>
                            {maturityLabels[employee.current_maturity_level] || employee.current_maturity_level}
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                        R$ {totalCost.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-left text-sm font-semibold text-green-600">
                        R$ {totalProduction.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-bold text-sm ${
                          productivity >= 100 ? 'text-green-600' : 'text-orange-500'
                        }`}>
                          {productivity}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 flex-nowrap min-w-max">
                          <Button
                            onClick={async () => {
                              const allowed = await checkPermission('employees', 'read', {
                                onDenied: () => toast.error('Sem permissão para ver detalhes')
                              });
                              if (allowed) navigate(createPageUrl("DetalhesColaborador") + `?id=${employee.id}`);
                            }}
                            className="bg-transparent border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-[10px] transition-all duration-200 shadow-none font-medium"
                            size="sm"
                            disabled={checking}
                          >
                            Detalhes
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0">
                                <MoreHorizontal className="w-5 h-5 text-gray-500" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg border-gray-100 p-1">
                              <DropdownMenuItem 
                                onClick={async () => {
                                  const allowed = await checkPermission('employees', 'read', {
                                    onDenied: () => toast.error('Sem permissão para ver perfil')
                                  });
                                  if (allowed) setProfileViewerEmployee(employee);
                                }}
                                className="cursor-pointer rounded-lg text-gray-700 py-2"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Visualizar Acesso
                              </DropdownMenuItem>
                              
                              {employee.user_id !== workshop?.owner_id && (
                                <DropdownMenuItem 
                                  onClick={async () => {
                                    const allowed = await checkPermission('employees', 'update', {
                                      onDenied: () => toast.error('Sem permissão para alterar status')
                                    });
                                    if (!allowed) return;
                                    
                                    if (confirm(`${employee.status === 'ativo' ? 'Inativar' : 'Ativar'} ${employee.full_name}?`)) {
                                      try {
                                        await base44.entities.Employee.update(employee.id, {
                                          status: employee.status === 'ativo' ? 'inativo' : 'ativo'
                                        });
                                        queryClient.invalidateQueries({ queryKey: ['employees'] });
                                        toast.success('Status atualizado');
                                      } catch (error) {
                                        toast.error('Erro ao atualizar status');
                                      }
                                    }
                                  }}
                                  className="cursor-pointer rounded-lg text-gray-700 py-2"
                                >
                                  <Power className="w-4 h-4 mr-2" />
                                  {employee.status === 'ativo' ? 'Inativar' : 'Ativar'}
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator className="bg-gray-100" />

                              <DropdownMenuItem 
                                onClick={async () => {
                                  const allowed = await checkPermission('employees', 'create', {
                                    onDenied: () => toast.error('Sem permissão para convidar')
                                  });
                                  if (allowed) navigate(createPageUrl("ConvidarColaborador") + `?id=${employee.id}`);
                                }}
                                className="cursor-pointer rounded-lg text-gray-700 py-2"
                              >
                                <UserPlus className="w-4 h-4 mr-2" />
                                Convidar Portal
                              </DropdownMenuItem>
                              
                              {(!employee.user_id && employee.email) && (
                                <DropdownMenuItem 
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const allowed = await checkPermission('employees', 'update', {
                                        onDenied: () => toast.error('Sem permissão para vincular')
                                    });
                                    if (!allowed) return;

                                    if (window.confirm(`Deseja vincular o colaborador ${employee.full_name} (${employee.email}) a um usuário existente com o mesmo e-mail?`)) {
                                        assignEmployeeToUserMutation.mutate({ 
                                            employeeId: employee.id, 
                                            email: employee.email, 
                                            workshopId: workshop.id 
                                        });
                                    }
                                  }}
                                  className="cursor-pointer rounded-lg text-gray-700 py-2"
                                  disabled={assignEmployeeToUserMutation.isPending}
                                >
                                  <Link className="w-4 h-4 mr-2" />
                                  Vincular E-mail Existente
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem 
                                onClick={async () => {
                                  const allowed = await checkPermission('employees', 'update', {
                                    onDenied: () => toast.error('Sem permissão para usar IA')
                                  });
                                  if (allowed) setSelectedEmployee(employee);
                                }}
                                className="cursor-pointer rounded-lg text-gray-700 py-2"
                              >
                                <Sparkles className="w-4 h-4 mr-2" />
                                Sugestões de IA
                              </DropdownMenuItem>

                              {employee.user_id !== workshop?.owner_id && (
                                <>
                                  <DropdownMenuSeparator className="bg-gray-100" />

                                  <DropdownMenuItem 
                                    onClick={async () => {
                                      const allowed = await checkPermission('employees', 'delete', {
                                        onDenied: () => toast.error('Sem permissão para excluir')
                                      });
                                      if (!allowed) return;
                                      
                                      if (confirm(`EXCLUIR ${employee.full_name}? Ação irreversível!`)) {
                                        try {
                                          const result = await base44.functions.invoke('deleteEmployeeCascade', {
                                            employee_id: employee.id
                                          });

                                          if (!result.data?.success) {
                                            toast.error(result.data?.error || 'Backend negou a exclusão');
                                            return;
                                          }

                                          queryClient.invalidateQueries({ queryKey: ['employees'] });
                                          toast.success('Colaborador e acesso excluídos');
                                        } catch (error) {
                                          toast.error('Erro ao excluir: ' + (error.message || 'desconhecido'));
                                        }
                                      }
                                    }}
                                    className="cursor-pointer rounded-lg text-red-600 focus:text-red-700 focus:bg-red-50 hover:bg-red-50 py-2 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedEmployee && (
              <AITrainingSuggestions 
                employee={selectedEmployee} 
                onClose={() => setSelectedEmployee(null)} 
              />
            )}
          </DialogContent>
        </Dialog>

        <EmployeeProfileViewer
          employee={profileViewerEmployee}
          open={!!profileViewerEmployee}
          onClose={() => setProfileViewerEmployee(null)}
        />

        <ModalCadastroColaborador
          isOpen={isCadastroModalOpen}
          onClose={() => setSearchParams(prev => { prev.delete("modal"); return prev; })}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['employees'] })}
        />
      </div>
    </div>
  );
}