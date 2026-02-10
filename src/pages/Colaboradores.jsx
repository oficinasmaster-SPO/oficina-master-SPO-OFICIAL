import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocation } from "react-router-dom";
import { UserPlus, Loader2, Sparkles, Heart, FilePenLine, Eye, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AITrainingSuggestions from "../components/rh/AITrainingSuggestions";
import EmployeeProfileViewer from "../components/employee/EmployeeProfileViewer";
import DynamicHelpSystem from "../components/help/DynamicHelpSystem";
import QuickTipsBar from "../components/help/QuickTipsBar";
import AdvancedFilter from "@/components/shared/AdvancedFilter";
import { useProfileAutoAssignment } from "@/components/hooks/useProfileAutoAssignment";
import { useOnDemandPermission } from "@/components/hooks/useOnDemandPermission";
import { toast } from "sonner";
// import ActivityNotificationSettings from "../components/rh/ActivityNotificationSettings"; // Removed
// import { Settings } from "lucide-react"; // Removed if unused elsewhere

export default function Colaboradores() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [maturityFilter, setMaturityFilter] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [profileViewerEmployee, setProfileViewerEmployee] = useState(null);
  const queryClient = useQueryClient();
  const { checkPermission, checking } = useOnDemandPermission();
  
  // Hook de atribuição automática de perfis
  useProfileAutoAssignment(false, (employee, result) => {
    queryClient.invalidateQueries({ queryKey: ['employees', workshop?.id] });
  });

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

  const { data: workshop } = useQuery({
    queryKey: ['userWorkshop', user?.id, location.search],
    queryFn: async () => {
        if (!user) return null;
        
        const urlParams = new URLSearchParams(location.search);
        const adminWorkshopId = urlParams.get('workshop_id');
        const assistanceMode = urlParams.get('assistance_mode') === 'true';
        
        if (assistanceMode && adminWorkshopId) {
          return await base44.entities.Workshop.get(adminWorkshopId);
        }
        
        // Fluxo normal - buscar oficina do usuário
        const ws = await base44.entities.Workshop.filter({ owner_id: user.id });
        if (ws && ws.length > 0) {
            return ws[0];
        }

        // Fallback for employees
        const employees = await base44.entities.Employee.filter({ user_id: user.id });
        if (employees && employees.length > 0) {
            return await base44.entities.Workshop.get(employees[0].workshop_id);
        }
        
        return null;
    },
    enabled: !!user
  });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees', workshop?.id],
    queryFn: async () => {
      if (!workshop) return [];
      try {
        // Filter employees by the specific workshop ID
        const result = await base44.entities.Employee.filter({ workshop_id: workshop.id }, '-created_date');
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.log("Error fetching employees:", error);
        return [];
      }
    },
    enabled: !!workshop,
    retry: 1
  });

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
  bebe: "Bebê",
  crianca: "Criança",
  adolescente: "Adolescente",
  adulto: "Adulto"
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
    return (employee.production_parts || 0) + (employee.production_services || 0);
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
      
      <div className="max-w-7xl mx-auto">
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
              if (allowed) navigate(createPageUrl("CadastroColaborador"));
            }}
            className="bg-blue-600 hover:bg-blue-700"
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
                        { value: "bebe", label: "Bebê" },
                        { value: "crianca", label: "Criança" },
                        { value: "adolescente", label: "Adolescente" },
                        { value: "adulto", label: "Adulto" }
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
                onClick={() => navigate(createPageUrl("CadastroColaborador"))}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Adicionar Primeiro Colaborador
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-x-auto">
            <table className="w-full" id="lista-colaboradores">
              <thead className="bg-gray-100 border-b-2 border-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Cargo</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Maturidade</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Custo Total</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Produção</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Produtividade</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEmployees.map((employee) => {
                  const totalCost = getTotalCost(employee);
                  const totalProduction = getTotalProduction(employee);
                  const productivity = totalCost > 0 ? ((totalProduction / totalCost) * 100).toFixed(0) : 0;
                  const activeCOEX = getActiveCOEX(employee.id);

                  return (
                    <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3 text-sm text-gray-600">{employee.position}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={statusColors[employee.status]}>
                          {employee.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {employee.current_maturity_level && (
                          <Badge className={maturityColors[employee.current_maturity_level] || "bg-gray-100 text-gray-700"}>
                            {maturityLabels[employee.current_maturity_level] || employee.current_maturity_level}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        R$ {totalCost.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-green-600">
                        R$ {totalProduction.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${
                          productivity >= 100 ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          {productivity}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-wrap gap-1 justify-center">
                          <Button
                            onClick={async () => {
                              const allowed = await checkPermission('employees', 'read', {
                                onDenied: () => toast.error('Sem permissão para ver detalhes')
                              });
                              if (allowed) navigate(createPageUrl("DetalhesColaborador") + `?id=${employee.id}`);
                            }}
                            size="sm"
                            variant="outline"
                            title="Ver Detalhes"
                            disabled={checking}
                          >
                            Detalhes
                          </Button>
                          <Button
                            onClick={async () => {
                              const allowed = await checkPermission('employees', 'read', {
                                onDenied: () => toast.error('Sem permissão para ver perfil')
                              });
                              if (allowed) setProfileViewerEmployee(employee);
                            }}
                            size="sm"
                            variant="outline"
                            title="Ver Perfil de Acesso"
                            disabled={checking}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={async () => {
                              const allowed = await checkPermission('employees', 'create', {
                                onDenied: () => toast.error('Sem permissão para convidar')
                              });
                              if (allowed) navigate(createPageUrl("ConvidarColaborador") + `?id=${employee.id}`);
                            }}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            title="Convidar para o Portal"
                            disabled={checking}
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                          {(!employee.user_id && employee.email) && (
                            <Button
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
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700"
                                title="Atribuir Colaborador Existente"
                                disabled={checking || assignEmployeeToUserMutation.isPending}
                            >
                                {assignEmployeeToUserMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <UserCheck className="w-4 h-4" />
                                )}
                            </Button>
                          )}
                          <Button
                            onClick={async () => {
                              const allowed = await checkPermission('employees', 'update', {
                                onDenied: () => toast.error('Sem permissão para usar IA')
                              });
                              if (allowed) setSelectedEmployee(employee);
                            }}
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700"
                            title="Sugestões de IA"
                            disabled={checking}
                          >
                            <Sparkles className="w-4 h-4" />
                          </Button>
                          <Button
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
                            size="sm"
                            variant="outline"
                            disabled={checking}
                          >
                            {employee.status === 'ativo' ? 'Inativar' : 'Ativar'}
                          </Button>
                          <Button
                            onClick={async () => {
                              const allowed = await checkPermission('employees', 'delete', {
                                onDenied: () => toast.error('Sem permissão para excluir')
                              });
                              if (!allowed) return;
                              
                              if (confirm(`EXCLUIR ${employee.full_name}? Ação irreversível!`)) {
                                try {
                                  const validation = await base44.functions.invoke('validateEmployeeDelete', {
                                    employee_id: employee.id
                                  });
                                  
                                  if (!validation.data?.can_delete) {
                                    toast.error('Backend negou a exclusão');
                                    return;
                                  }
                                  
                                  await base44.entities.Employee.delete(employee.id);
                                  queryClient.invalidateQueries({ queryKey: ['employees'] });
                                  toast.success('Colaborador excluído');
                                } catch (error) {
                                  toast.error('Erro ao excluir: ' + (error.message || 'desconhecido'));
                                }
                              }
                            }}
                            size="sm"
                            variant="destructive"
                            disabled={checking}
                          >
                            Excluir
                          </Button>
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
      </div>
    </div>
  );
}