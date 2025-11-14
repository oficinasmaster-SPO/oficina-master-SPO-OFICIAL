import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileDown, Loader2, Sparkles } from "lucide-react";
import ActionItem from "../components/planoacao/ActionItem";
import GeneratedPlanText from "../components/planoacao/GeneratedPlanText";
import EnhancedPDFPreview from "../components/planoacao/EnhancedPDFPreview";
import AIActionSuggestions from "../components/planoacao/AIActionSuggestions";

export default function PlanoAcao() {
  const navigate = useNavigate();
  const [diagnostic, setDiagnostic] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPDF, setShowPDF] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

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
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const { data: actions = [] } = useQuery({
    queryKey: ['actions', diagnostic?.id],
    queryFn: async () => {
      if (!diagnostic) return [];
      const allActions = await base44.entities.Action.list();
      return allActions.filter(a => a.diagnostic_id === diagnostic.id).sort((a, b) => (a.order || 0) - (b.order || 0));
    },
    enabled: !!diagnostic
  });

  const { data: subtasks = [] } = useQuery({
    queryKey: ['subtasks'],
    queryFn: () => base44.entities.Subtask.list(),
    initialData: []
  });

  const handleDownloadPDF = () => {
    setShowPDF(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setShowPDF(false);
      }, 1000);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!diagnostic) {
    return null;
  }

  const categorizedActions = {
    vendas: actions.filter(a => a.category === 'vendas'),
    prospeccao: actions.filter(a => a.category === 'prospeccao'),
    precificacao: actions.filter(a => a.category === 'precificacao'),
    pessoas: actions.filter(a => a.category === 'pessoas')
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("Resultado") + `?id=${diagnostic.id}`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Resultado
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Plano de Ação Personalizado
              </h1>
              {workshop && (
                <p className="text-lg text-gray-600">
                  {workshop.name} - Fase {diagnostic.phase}
                </p>
              )}
            </div>
            <Button
              onClick={handleDownloadPDF}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg"
            >
              <FileDown className="w-5 h-5 mr-2" />
              Baixar PDF Completo
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="ai-suggestions" className="space-y-6">
          <TabsList className="bg-white shadow-md p-1">
            <TabsTrigger value="ai-suggestions" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Sugestões com IA
            </TabsTrigger>
            <TabsTrigger value="generated-plan">Plano Gerado</TabsTrigger>
            <TabsTrigger value="actions">Ações Detalhadas</TabsTrigger>
          </TabsList>

          {/* Sugestões com IA */}
          <TabsContent value="ai-suggestions">
            <AIActionSuggestions
              diagnostic={diagnostic}
              workshop={workshop}
              phase={diagnostic.phase}
            />
          </TabsContent>

          {/* Plano Gerado */}
          <TabsContent value="generated-plan">
            <GeneratedPlanText
              diagnostic={diagnostic}
              workshop={workshop}
              actions={actions}
              subtasks={subtasks}
            />
          </TabsContent>

          {/* Ações Detalhadas por Pilar */}
          <TabsContent value="actions" className="space-y-8">
            {/* Vendas e Atendimento */}
            {categorizedActions.vendas.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  Vendas e Atendimento GPS
                </h2>
                <div className="space-y-4">
                  {categorizedActions.vendas.map(action => (
                    <ActionItem key={action.id} action={action} />
                  ))}
                </div>
              </div>
            )}

            {/* Prospecção Ativa */}
            {categorizedActions.prospeccao.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  Prospecção Ativa P.A.V.E
                </h2>
                <div className="space-y-4">
                  {categorizedActions.prospeccao.map(action => (
                    <ActionItem key={action.id} action={action} />
                  ))}
                </div>
              </div>
            )}

            {/* Precificação */}
            {categorizedActions.precificacao.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                  Precificação R70/I30 + TCMP2
                </h2>
                <div className="space-y-4">
                  {categorizedActions.precificacao.map(action => (
                    <ActionItem key={action.id} action={action} />
                  ))}
                </div>
              </div>
            )}

            {/* Pessoas e Time */}
            {categorizedActions.pessoas.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                  Pessoas e Time CESP
                </h2>
                <div className="space-y-4">
                  {categorizedActions.pessoas.map(action => (
                    <ActionItem key={action.id} action={action} />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* PDF Preview (hidden, só para impressão) */}
        {showPDF && (
          <EnhancedPDFPreview
            diagnostic={diagnostic}
            workshop={workshop}
            actions={actions}
            subtasks={subtasks}
            aiSuggestions={aiSuggestions}
          />
        )}
      </div>
    </div>
  );
}