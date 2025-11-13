import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import ActionItem from "../components/planoacao/ActionItem";
import PDFPreview from "../components/planoacao/PDFPreview";

export default function PlanoAcao() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [diagnostic, setDiagnostic] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPDFPreview, setShowPDFPreview] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const { data: actions = [], isLoading: loadingActions } = useQuery({
    queryKey: ['actions', diagnostic?.id],
    queryFn: async () => {
      if (!diagnostic?.id) return [];
      const allActions = await base44.entities.Action.list();
      return allActions
        .filter(a => a.diagnostic_id === diagnostic.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    },
    enabled: !!diagnostic?.id
  });

  const { data: subtasks = [] } = useQuery({
    queryKey: ['subtasks', diagnostic?.id],
    queryFn: async () => {
      if (!diagnostic?.id || actions.length === 0) return [];
      const allSubtasks = await base44.entities.Subtask.list();
      const actionIds = actions.map(a => a.id);
      return allSubtasks.filter(s => actionIds.includes(s.action_id));
    },
    enabled: !!diagnostic?.id && actions.length > 0
  });

  const loadData = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      
      if (!id) {
        navigate(createPageUrl("Home"));
        return;
      }

      const diagnostics = await base44.entities.Diagnostic.list();
      const diag = diagnostics.find(d => d.id === id);
      
      if (!diag) {
        navigate(createPageUrl("Home"));
        return;
      }

      setDiagnostic(diag);

      // Carregar workshop
      if (diag.workshop_id) {
        const workshops = await base44.entities.Workshop.list();
        const ws = workshops.find(w => w.id === diag.workshop_id);
        setWorkshop(ws);
      }

      // Verificar se já existem ações
      const allActions = await base44.entities.Action.list();
      const existingActions = allActions.filter(a => a.diagnostic_id === id);

      // Se não existem ações, criar do template
      if (existingActions.length === 0) {
        await createActionsFromTemplate(id, diag.phase);
      }

    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const createActionsFromTemplate = async (diagnosticId, phase) => {
    const { actionPlanTemplates } = await import("../components/diagnostic/ActionPlans");
    const template = actionPlanTemplates[phase] || [];

    for (let i = 0; i < template.length; i++) {
      const action = template[i];
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + action.deadline_days);

      await base44.entities.Action.create({
        diagnostic_id: diagnosticId,
        title: action.title,
        description: action.description,
        category: action.category,
        status: "a_fazer",
        deadline_days: action.deadline_days,
        due_date: dueDate.toISOString().split('T')[0],
        order: i
      });
    }

    queryClient.invalidateQueries(['actions']);
  };

  const handlePrintPDF = () => {
    setShowPDFPreview(true);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  if (loading || loadingActions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!diagnostic) {
    return null;
  }

  const completedActions = actions.filter(a => a.status === "concluido").length;
  const progressPercentage = actions.length > 0 ? Math.round((completedActions / actions.length) * 100) : 0;

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4 print:hidden">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl("Resultado") + `?id=${diagnostic.id}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Resultado
            </Button>

            <Button
              onClick={handlePrintPDF}
              className="bg-green-600 hover:bg-green-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar Plano de Ação em PDF
            </Button>
          </div>

          {/* Header */}
          <Card className="shadow-xl mb-8">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8" />
                <div>
                  <CardTitle className="text-3xl">
                    Plano de Ação - Fase {diagnostic.phase}
                  </CardTitle>
                  {workshop && (
                    <p className="text-blue-100 mt-1">
                      {workshop.name} • {workshop.city}, {workshop.state}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Progresso Geral</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {completedActions} de {actions.length} ações concluídas
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-blue-600">
                    {progressPercentage}%
                  </div>
                  <p className="text-sm text-gray-600">Completo</p>
                </div>
              </div>
              <div className="mt-4 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions List */}
          <div className="space-y-6">
            {actions.map((action) => (
              <ActionItem 
                key={action.id} 
                action={action}
                diagnosticId={diagnostic.id}
              />
            ))}
          </div>
        </div>
      </div>

      {/* PDF Preview (hidden on screen, visible on print) */}
      {showPDFPreview && (
        <PDFPreview
          diagnostic={diagnostic}
          workshop={workshop}
          actions={actions}
          subtasks={subtasks}
          onClose={() => setShowPDFPreview(false)}
        />
      )}
    </>
  );
}