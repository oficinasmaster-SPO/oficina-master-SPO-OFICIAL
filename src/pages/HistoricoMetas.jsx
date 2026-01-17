import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target } from "lucide-react";
import ManualGoalRegistration from "../components/goals/ManualGoalRegistration";
import AdminViewBanner from "../components/shared/AdminViewBanner";
import { useSyncData } from "../components/hooks/useSyncData";
import FeedbackIAModal from "../components/historico/FeedbackIAModal";
import HistoricoHeader from "../components/historico/HistoricoHeader";
import HistoricoFilters from "../components/historico/HistoricoFilters";
import WorkshopSummaryCard from "../components/historico/WorkshopSummaryCard";
import EmployeeSummaryCard from "../components/historico/EmployeeSummaryCard";
import RecordCard from "../components/historico/RecordCard";

export default function HistoricoMetas() {
  const [workshop, setWorkshop] = useState(null);
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [filterType, setFilterType] = useState("workshop");
  const [filterEmployee, setFilterEmployee] = useState(null);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().substring(0, 7));
  const [expandedCards, setExpandedCards] = useState({});
  const [showAllRecords, setShowAllRecords] = useState(true); // Sempre mostrar todos por padrão
  const queryClient = useQueryClient();
  const [isAdminView, setIsAdminView] = useState(false);
  const location = useLocation();
  const { syncMonthlyData, updateDREFromMonthlyGoals } = useSyncData();
  const [feedbackModal, setFeedbackModal] = useState({ open: false, record: null });

  useEffect(() => {
    loadUser();
  }, [location.search]);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Verificar se há workshop_id na URL (admin visualizando)
      const urlParams = new URLSearchParams(location.search);
      const adminWorkshopId = urlParams.get('workshop_id');

      let userWorkshop = null;
      
      if (adminWorkshopId && currentUser.role === 'admin') {
        // Admin visualizando oficina específica
        userWorkshop = await base44.entities.Workshop.get(adminWorkshopId);
        setIsAdminView(true);
      } else {
        // Fluxo normal
        const workshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
        if (workshops.length > 0) {
          userWorkshop = workshops[0];
        }
        setIsAdminView(false);
      }
      
      setWorkshop(userWorkshop);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const { data: goalHistory = [], isLoading, refetch: refetchGoals, isFetching } = useQuery({
    queryKey: ['goal-history', workshop?.id, filterType, filterEmployee, filterMonth],
    queryFn: async () => {
      if (!workshop) return [];
      
      // Força reload do workshop para pegar dados atualizados do melhor mês
      const updatedWorkshop = await base44.entities.Workshop.get(workshop.id);
      setWorkshop(updatedWorkshop);
      
      let query = { workshop_id: workshop.id };
      
      if (filterType === "employee" && filterEmployee) {
        query.employee_id = filterEmployee;
      }
      // Se filtro é "workshop", busca TODOS os registros da oficina (não filtra por entity_type)

      if (filterMonth) {
        query.month = filterMonth;
      }

      const result = await base44.entities.MonthlyGoalHistory.filter(query);
      return result.sort((a, b) => new Date(b.reference_date) - new Date(a.reference_date));
    },
    enabled: !!workshop,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    staleTime: 0,
    cacheTime: 0
  });

  const { data: employees = [], refetch: refetchEmployees } = useQuery({
    queryKey: ['employees', workshop?.id, filterEmployee],
    queryFn: async () => {
      if (!workshop) return [];
      const allEmployees = await base44.entities.Employee.filter({ 
        workshop_id: workshop.id,
        status: "ativo"
      });
      // Força reload individual para pegar melhor mês atualizado
      const employeesWithUpdatedData = await Promise.all(
        allEmployees.map(emp => base44.entities.Employee.get(emp.id))
      );
      return employeesWithUpdatedData;
    },
    enabled: !!workshop,
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  const handleExport = () => {
    toast.info("Exportação em desenvolvimento...");
  };

  const toggleCardExpansion = (recordId) => {
    setExpandedCards(prev => ({
      ...prev,
      [recordId]: !prev[recordId]
    }));
  };

  if (!workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  const handleSyncSuccess = () => {
    queryClient.invalidateQueries(['goal-history']);
    queryClient.invalidateQueries(['shared-workshop']);
    queryClient.invalidateQueries(['shared-employees']);
    refetchGoals();
    refetchEmployees();
  };

  const handleToggleCard = (recordId) => {
    setExpandedCards(prev => ({
      ...prev,
      [recordId]: !prev[recordId]
    }));
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setShowModal(true);
    setExpandedCards(prev => ({ ...prev, [record.id]: false }));
  };

  const handleDelete = async (recordId) => {
    if (window.confirm('Tem certeza que deseja excluir este registro permanentemente? Esta ação não pode ser desfeita.')) {
      try {
        await base44.entities.MonthlyGoalHistory.delete(recordId);
        toast.success('Registro excluído com sucesso!');
        queryClient.invalidateQueries(['goal-history']);
        refetchGoals();
      } catch (error) {
        console.error('Erro ao excluir:', error);
        toast.error('Erro ao excluir o registro');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {isAdminView && workshop && (
          <AdminViewBanner workshopName={workshop.name} />
        )}

        <HistoricoHeader
          onNewRecord={() => setShowModal(true)}
          onRefresh={() => {
            queryClient.invalidateQueries(['goal-history']);
            refetchGoals();
          }}
          isFetching={isFetching}
          workshopId={workshop?.id}
          filterMonth={filterMonth}
          onSyncSuccess={handleSyncSuccess}
        />

        <HistoricoFilters
          filterType={filterType}
          setFilterType={setFilterType}
          filterEmployee={filterEmployee}
          setFilterEmployee={setFilterEmployee}
          filterMonth={filterMonth}
          setFilterMonth={setFilterMonth}
          showAllRecords={showAllRecords}
          setShowAllRecords={setShowAllRecords}
          employees={employees}
        />

        {filterType === "workshop" && (
          <WorkshopSummaryCard workshop={workshop} goalHistory={goalHistory} />
        )}

        {filterType === "employee" && filterEmployee && (() => {
          const selectedEmployee = employees.find(e => e.id === filterEmployee);
          if (!selectedEmployee) {
            return (
              <Card className="mb-6 shadow-xl border-2 border-red-300 bg-red-50">
                <CardContent className="p-6 text-center">
                  <p className="text-red-600">Colaborador não encontrado. Por favor, selecione novamente.</p>
                </CardContent>
              </Card>
            );
          }
          return <EmployeeSummaryCard employee={selectedEmployee} goalHistory={goalHistory} />;
        })()}

        {/* Lista de Histórico */}
        <div className="space-y-4">
          {isLoading ? (
            <Card className="shadow-lg">
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">Carregando histórico...</p>
              </CardContent>
            </Card>
          ) : goalHistory.length === 0 ? (
            <Card className="shadow-lg">
              <CardContent className="p-12 text-center">
                <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Nenhum registro encontrado</p>
                <Button onClick={() => setShowModal(true)} className="bg-blue-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Registro
                </Button>
              </CardContent>
            </Card>
          ) : (
            goalHistory
              .filter(record => showAllRecords || (record.revenue_total > 0 || record.achieved_total > 0))
              .map((record) => {
              const achievementPercentage = record.projected_total > 0 
                ? (record.achieved_total / record.projected_total) * 100 
                : 0;

              const employee = employees.find(e => e.id === record.employee_id);
              const isExpanded = expandedCards[record.id];
              const metaAchieved = achievementPercentage >= 100;
              const hasFaturamento = (record.revenue_total > 0 || record.achieved_total > 0);

              return (
                <Card key={record.id} className={`hover:shadow-lg transition-all ${
                  !hasFaturamento ? 'border-l-4 border-gray-400 bg-gray-50/30' :
                  metaAchieved ? 'border-l-4 border-green-500 bg-green-50/30' : 'border-l-4 border-orange-400 bg-orange-50/30'
                }`}>
                  <CardContent className="p-4">
                    {/* Visão Compacta - Sempre Visível */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        {/* Data */}
                        <div className="text-center min-w-[70px]">
                          <p className="text-3xl font-bold text-gray-900">
                            {new Date(record.reference_date).getDate()}
                          </p>
                          <p className="text-xs text-gray-500 uppercase">
                            {new Date(record.reference_date).toLocaleDateString('pt-BR', { month: 'short' })}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(record.reference_date).getFullYear()}
                          </p>
                        </div>

                        {/* Info Principal */}
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 mb-1">
                            {new Date(record.reference_date).toLocaleDateString('pt-BR', { 
                              weekday: 'long', 
                              day: '2-digit', 
                              month: 'long'
                            })}
                          </p>
                          {employee && (
                            <p className="text-xs text-gray-600">
                              {employee.full_name} - {employee.position}
                            </p>
                          )}

                          {/* Indicador de Meta */}
                          <div className="flex items-center gap-2 mt-2">
                            {!hasFaturamento ? (
                              <div className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-400 text-white">
                                Sem Faturamento
                              </div>
                            ) : (
                              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                metaAchieved 
                                  ? 'bg-green-500 text-white' 
                                  : achievementPercentage >= 70 
                                    ? 'bg-yellow-500 text-white'
                                    : 'bg-red-500 text-white'
                              }`}>
                                {metaAchieved ? '✓ Meta Atingida' : `${achievementPercentage.toFixed(0)}% da meta`}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Valores - Compacto */}
                        <div className="flex gap-3">
                          <div className="text-center bg-blue-50 px-4 py-2 rounded-lg shadow-sm min-w-[120px]">
                            <p className="text-xs text-blue-700 mb-1">Previsto</p>
                            <p className="text-xl font-bold text-blue-600">
                              R$ {formatCurrency(record.projected_total || 0)}
                            </p>
                            {(!record.projected_total || record.projected_total === 0) && (
                              <p className="text-xs text-orange-500 mt-1">Meta não definida</p>
                            )}
                          </div>
                          <div className="text-center bg-white px-4 py-2 rounded-lg shadow-sm min-w-[120px]">
                            <p className="text-xs text-purple-700 mb-1">Realizado</p>
                            <p className={`text-xl font-bold ${metaAchieved ? 'text-green-600' : 'text-orange-600'}`}>
                              R$ {formatCurrency(record.achieved_total)}
                            </p>
                          </div>
                        </div>

                        {/* Botões Expandir e Feedback */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setFeedbackModal({ open: true, record: record })}
                            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 border-purple-300"
                          >
                            <Sparkles className="w-4 h-4 mr-1" />
                            Feedback
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleCardExpansion(record.id)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            {isExpanded ? (
                              <>
                                <X className="w-4 h-4 mr-1" />
                                Fechar
                              </>
                            ) : (
                              <>
                                <Target className="w-4 h-4 mr-1" />
                                Detalhes
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Detalhes Expandidos */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                        {/* Detalhamento de Faturamento */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <p className="text-xs text-blue-700 mb-1">Faturamento Peças</p>
                            <p className="text-lg font-bold text-blue-600">
                              R$ {formatCurrency(record.revenue_parts)}
                            </p>
                          </div>
                          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                            <p className="text-xs text-green-700 mb-1">Faturamento Serviços</p>
                            <p className="text-lg font-bold text-green-600">
                              R$ {formatCurrency(record.revenue_services)}
                            </p>
                          </div>
                          <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                            <p className="text-xs text-purple-700 mb-1">Total Faturado</p>
                            <p className="text-lg font-bold text-purple-600">
                              R$ {formatCurrency(record.revenue_total)}
                            </p>
                          </div>
                        </div>

                        {/* Clientes e Ticket Médio */}
                        {record.customer_volume > 0 && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                              <p className="text-xs text-indigo-700 mb-1">Clientes Atendidos</p>
                              <p className="text-lg font-bold text-indigo-600">
                                {record.customer_volume} clientes
                              </p>
                            </div>
                            <div className="bg-pink-50 p-3 rounded-lg border border-pink-200">
                              <p className="text-xs text-pink-700 mb-1">Ticket Médio</p>
                              <p className="text-lg font-bold text-pink-600">
                                R$ {formatCurrency(record.average_ticket || 0)}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Detalhes Comerciais */}
                        {(record.pave_commercial > 0 || record.kit_master > 0 || record.sales_base > 0 || record.sales_marketing > 0 || record.clients_delivered > 0) && (
                          <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                            <p className="text-sm font-semibold text-indigo-900 mb-2">🎯 Comercial</p>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                              {record.pave_commercial > 0 && (
                                <div>
                                  <p className="text-gray-600">PAVE (Leads Base):</p>
                                  <p className="font-bold">{record.pave_commercial} leads</p>
                                </div>
                              )}
                              {record.kit_master > 0 && (
                                <div>
                                  <p className="text-gray-600">Kit Master:</p>
                                  <p className="font-bold">R$ {formatCurrency(record.kit_master)}</p>
                                </div>
                              )}
                              {record.sales_base > 0 && (
                                <div>
                                  <p className="text-gray-600">Vendas Base:</p>
                                  <p className="font-bold">R$ {formatCurrency(record.sales_base)}</p>
                                </div>
                              )}
                              {record.sales_marketing > 0 && (
                                <div>
                                  <p className="text-gray-600">Vendas Mkt:</p>
                                  <p className="font-bold">R$ {formatCurrency(record.sales_marketing)}</p>
                                </div>
                              )}
                              {record.clients_delivered > 0 && (
                                <div>
                                  <p className="text-gray-600">Clientes Entregues:</p>
                                  <p className="font-bold">{record.clients_delivered}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Detalhes de Agendamento - Comercial */}
                        {(record.clients_scheduled_base > 0 || record.clients_delivered_base > 0 || 
                          record.clients_scheduled_mkt > 0 || record.clients_delivered_mkt > 0 ||
                          record.clients_scheduled_referral > 0 || record.clients_delivered_referral > 0) && (
                          <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
                            <p className="text-sm font-semibold text-teal-900 mb-2">📅 Agendamentos e Entregas</p>
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
                              <div>
                                <p className="text-gray-600">Agend. Base:</p>
                                <p className="font-bold">{record.clients_scheduled_base || 0}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Entreg. Base:</p>
                                <p className="font-bold">{record.clients_delivered_base || 0}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Agend. Mkt:</p>
                                <p className="font-bold">{record.clients_scheduled_mkt || 0}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Entreg. Mkt:</p>
                                <p className="font-bold">{record.clients_delivered_mkt || 0}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Agend. Indic.:</p>
                                <p className="font-bold">{record.clients_scheduled_referral || 0}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Entreg. Indic.:</p>
                                <p className="font-bold">{record.clients_delivered_referral || 0}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Marketing Data */}
                        {record.marketing_data && record.marketing_data.leads_generated > 0 && (
                          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <p className="text-sm font-semibold text-purple-900 mb-2">📣 Marketing</p>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                              <div>
                                <p className="text-gray-600">Leads:</p>
                                <p className="font-bold">{record.marketing_data.leads_generated}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Agendados:</p>
                                <p className="font-bold">{record.marketing_data.leads_scheduled}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Comparec.:</p>
                                <p className="font-bold">{record.marketing_data.leads_showed_up}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Vendidos:</p>
                                <p className="font-bold">{record.marketing_data.leads_sold}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Investido:</p>
                                <p className="font-bold">R$ {formatCurrency(record.marketing_data.invested_value || 0)}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Custo/Venda:</p>
                                <p className="font-bold">R$ {formatCurrency(record.marketing_data.cost_per_sale || 0)}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Observações */}
                        {record.notes && (
                         <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                           <p className="text-xs font-semibold text-yellow-900 mb-1">📝 Observações</p>
                           <p className="text-sm text-gray-700">{record.notes}</p>
                         </div>
                        )}

                        {/* Botões de Ação */}
                        <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={async () => {
                             if (window.confirm('Tem certeza que deseja excluir este registro permanentemente? Esta ação não pode ser desfeita.')) {
                               try {
                                 await base44.entities.MonthlyGoalHistory.delete(record.id);
                                 toast.success('Registro excluído com sucesso!');
                                 queryClient.invalidateQueries(['goal-history']);
                                 refetchGoals();
                               } catch (error) {
                                 console.error('Erro ao excluir:', error);
                                 toast.error('Erro ao excluir o registro');
                               }
                             }
                           }}
                           className="text-red-600 hover:text-red-700 hover:bg-red-50"
                         >
                           <Trash2 className="w-4 h-4 mr-2" />
                           Excluir
                         </Button>
                         <Button
                           size="sm"
                           onClick={() => {
                             setEditingRecord(record);
                             setShowModal(true);
                             toggleCardExpansion(record.id);
                           }}
                           className="bg-blue-600 hover:bg-blue-700"
                         >
                           <Activity className="w-4 h-4 mr-2" />
                           Editar Registro
                         </Button>
                        </div>
                        </div>
                        )}
                        </CardContent>
                        </Card>
                        );
                        })
                        )}
                        </div>

        {/* Modal de Feedback IA */}
        <FeedbackIAModal
          open={feedbackModal.open}
          onClose={() => setFeedbackModal({ open: false, record: null })}
          workshop={workshop}
          record={feedbackModal.record}
          allRecords={goalHistory}
        />

        {/* Modal de Registro */}
        <ManualGoalRegistration
         open={showModal}
         onClose={() => {
           setShowModal(false);
           setEditingRecord(null);
         }}
         workshop={workshop}
         editingRecord={editingRecord}
         key={`${workshop?.id}-${showModal}`}
          onSave={async () => {
            // Sincronizar após salvar registro
            if (workshop) {
              // 1. Atualizar DRE com valores consolidados dos registros diários
              await updateDREFromMonthlyGoals(workshop.id, filterMonth);
              // 2. Sincronizar dados mensais
              await syncMonthlyData(workshop.id, filterMonth);
            }
            queryClient.invalidateQueries(['goal-history']);
            queryClient.invalidateQueries(['dre-list']);
            queryClient.invalidateQueries(['employees']);
            refetchEmployees();
            setEditingRecord(null);
          }}
        />
      </div>
    </div>
  );
}