import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import UserReportOverview from "@/components/reports/UserReportOverview";
import UserReportTimeline from "@/components/reports/UserReportTimeline";
import UserReportNavigation from "@/components/reports/UserReportNavigation";
import UserReportActions from "@/components/reports/UserReportActions";
import UserReportTraining from "@/components/reports/UserReportTraining";
import UserReportPermissions from "@/components/reports/UserReportPermissions";
import UserReportComparisons from "@/components/reports/UserReportComparisons";
import UserReportFilters from "@/components/reports/UserReportFilters";
import UserReportExport from "@/components/reports/UserReportExport";

export default function RelatorioUsuario() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("user_id");
  
  const [loading, setLoading] = useState(true);
  const [targetUser, setTargetUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString(),
    actionTypes: [],
    pageTypes: [],
    status: []
  });
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    if (!userId) {
      toast.error("Usuário não especificado");
      navigate(createPageUrl("MonitoramentoUsuarios"));
      return;
    }
    loadUserReport();
  }, [userId, filters]);

  const loadUserReport = async () => {
    try {
      setLoading(true);

      // Buscar dados do usuário alvo
      const user = await base44.entities.User.get(userId);
      setTargetUser(user);

      // Buscar Employee vinculado (se houver)
      let employee = null;
      const employees = await base44.entities.Employee.filter({ user_id: userId });
      if (employees?.length > 0) employee = employees[0];

      // Buscar sessões do usuário
      const sessions = await base44.entities.UserSession.filter({
        user_id: userId,
        start_time: { $gte: filters.startDate }
      });

      // Buscar logs de atividade
      const activityLogs = await base44.entities.UserActivityLog.filter({
        user_id: userId,
        timestamp: { $gte: filters.startDate, $lte: filters.endDate }
      });

      // Buscar progresso de treinamento
      const trainingProgress = await base44.entities.EmployeeTrainingProgress.filter({
        employee_id: employee?.id || userId,
        last_access_date: { $gte: filters.startDate }
      });

      // Buscar avaliações de aula
      const assessmentResults = await base44.entities.LessonAssessmentResult.filter({
        employee_id: employee?.id || userId,
        submitted_at: { $gte: filters.startDate }
      });

      // Buscar permissões
      const permissions = await base44.entities.UserPermission.filter({
        user_id: userId
      });

      setUserData({
        user,
        employee,
        sessions: sessions || [],
        activityLogs: activityLogs || [],
        trainingProgress: trainingProgress || [],
        assessmentResults: assessmentResults || [],
        permissions: permissions || []
      });

    } catch (error) {
      console.error("Erro ao carregar relatório:", error);
      toast.error("Erro ao carregar relatório do usuário");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!targetUser || !userData) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-gray-600">Dados do usuário não encontrados</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(createPageUrl("MonitoramentoUsuarios"))}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Relatório Completo de Uso
              </h1>
              <p className="text-slate-600 mt-1">
                {targetUser.full_name || targetUser.email}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowExportModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>

        {/* Filtros */}
        <UserReportFilters
          filters={filters}
          onFiltersChange={setFilters}
        />

        {/* Tabs */}
        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid grid-cols-7 w-full">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
            <TabsTrigger value="navigation">Navegação</TabsTrigger>
            <TabsTrigger value="actions">Ações</TabsTrigger>
            <TabsTrigger value="training">Treinamento</TabsTrigger>
            <TabsTrigger value="permissions">Permissões</TabsTrigger>
            <TabsTrigger value="comparisons">Comparativos</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <UserReportOverview userData={userData} filters={filters} />
          </TabsContent>

          <TabsContent value="timeline" className="mt-6">
            <UserReportTimeline userData={userData} filters={filters} />
          </TabsContent>

          <TabsContent value="navigation" className="mt-6">
            <UserReportNavigation userData={userData} filters={filters} />
          </TabsContent>

          <TabsContent value="actions" className="mt-6">
            <UserReportActions userData={userData} filters={filters} />
          </TabsContent>

          <TabsContent value="training" className="mt-6">
            <UserReportTraining userData={userData} filters={filters} />
          </TabsContent>

          <TabsContent value="permissions" className="mt-6">
            <UserReportPermissions userData={userData} filters={filters} />
          </TabsContent>

          <TabsContent value="comparisons" className="mt-6">
            <UserReportComparisons userData={userData} filters={filters} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <UserReportExport
          open={showExportModal}
          onClose={() => setShowExportModal(false)}
          userData={userData}
          filters={filters}
        />
      )}
    </div>
  );
}