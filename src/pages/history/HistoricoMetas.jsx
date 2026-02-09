import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target } from "lucide-react";
import ManualGoalRegistration from "../../components/goals/ManualGoalRegistration";
import AdminViewBanner from "../../components/shared/AdminViewBanner";
import { useSyncData } from "../../components/hooks/useSyncData";
import FeedbackIAModal from "../../components/historico/FeedbackIAModal";
import HistoricoHeader from "../../components/historico/HistoricoHeader";
import HistoricoFilters from "../../components/historico/HistoricoFilters";
import WorkshopSummaryCard from "../../components/historico/WorkshopSummaryCard";
import EmployeeSummaryCard from "../../components/historico/EmployeeSummaryCard";
import RecordCard from "../../components/historico/RecordCard";

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
                  Criar Primeiro Registro
                </Button>
              </CardContent>
            </Card>
          ) : (
            goalHistory
              .filter(record => showAllRecords || (record.revenue_total > 0 || record.achieved_total > 0))
              .map((record) => {
                const employee = employees.find(e => e.id === record.employee_id);
                return (
                  <RecordCard
                    key={record.id}
                    record={record}
                    employee={employee}
                    isExpanded={expandedCards[record.id]}
                    onToggleExpand={handleToggleCard}
                    onEdit={handleEdit}
                    onDelete={() => handleDelete(record.id)}
                    onFeedback={(rec) => setFeedbackModal({ open: true, record: rec })}
                  />
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
