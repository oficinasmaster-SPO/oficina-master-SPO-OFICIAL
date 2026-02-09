import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  Circle, 
  Building2, 
  FileText, 
  Eye, 
  Target, 
  BarChart3,
  X,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const checklistItems = [
  {
    id: "cadastrou_oficina",
    title: "Cadastre sua oficina",
    description: "Preencha os dados básicos da sua oficina para personalizar o diagnóstico",
    icon: Building2,
    action: "Cadastrar",
    route: "Cadastro",
    color: "text-blue-600",
    bgColor: "bg-blue-100"
  },
  {
    id: "fez_primeiro_diagnostico",
    title: "Faça seu primeiro diagnóstico",
    description: "Responda 12 perguntas rápidas para identificar a fase da sua oficina",
    icon: FileText,
    action: "Responder",
    route: "Questionario",
    color: "text-green-600",
    bgColor: "bg-green-100"
  },
  {
    id: "visualizou_resultado",
    title: "Visualize seu resultado",
    description: "Veja a análise completa e entenda em qual fase sua oficina está",
    icon: Eye,
    action: "Ver Resultado",
    route: "Historico",
    color: "text-purple-600",
    bgColor: "bg-purple-100"
  },
  {
    id: "acessou_plano_acao",
    title: "Explore o plano de ação",
    description: "Conheça as ações personalizadas e sugestões com IA para sua oficina",
    icon: Target,
    action: "Ver Plano",
    route: "Historico",
    color: "text-orange-600",
    bgColor: "bg-orange-100"
  },
  {
    id: "explorou_dashboard",
    title: "Explore o dashboard (consultores)",
    description: "Veja métricas agregadas e análises de todas as oficinas",
    icon: BarChart3,
    action: "Ver Dashboard",
    route: "Dashboard",
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
    adminOnly: true
  }
];

export default function OnboardingChecklist({ user, userProgress, onClose }) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(userProgress);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (userProgress) {
      setProgress(userProgress);
    }
  }, [userProgress]);

  const handleItemClick = async (item) => {
    // Marcar item como completo se possível
    if (item.route) {
      navigate(createPageUrl(item.route));
    }
  };

  const handleDismiss = async () => {
    if (user && progress) {
      try {
        await base44.entities.UserProgress.update(progress.id, {
          onboarding_completed: true
        });
      } catch (error) {
        console.error("Erro ao atualizar progresso:", error);
      }
    }
    setIsVisible(false);
    if (onClose) onClose();
  };

  if (!isVisible || !progress) return null;

  const completedItems = checklistItems.filter(
    item => progress.checklist_items?.[item.id] === true
  ).length;

  const visibleItems = checklistItems.filter(
    item => !item.adminOnly || (user?.role === 'admin' || user?.role === 'user')
  );

  const totalItems = visibleItems.length;
  const progressPercentage = Math.round((completedItems / totalItems) * 100);
  const isCompleted = completedItems === totalItems;

  return (
    <Card className="shadow-2xl border-2 border-blue-500 bg-gradient-to-br from-white to-blue-50">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl text-white mb-1">
                {isCompleted ? "🎉 Parabéns!" : "Primeiros Passos"}
              </CardTitle>
              <p className="text-blue-100 text-sm">
                {isCompleted 
                  ? "Você completou todas as etapas iniciais!"
                  : "Complete estas ações para aproveitar ao máximo a plataforma"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-blue-100">
              {completedItems} de {totalItems} concluídas
            </span>
            <Badge className="bg-white/20 text-white border-none">
              {progressPercentage}%
            </Badge>
          </div>
          <Progress value={progressPercentage} className="h-3 bg-white/20" />
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {isCompleted ? (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Você está pronto!
            </h3>
            <p className="text-gray-600 mb-6">
              Agora você já conhece todas as funcionalidades principais. Continue usando a plataforma para acompanhar a evolução da sua oficina!
            </p>
            <Button
              onClick={handleDismiss}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Começar a usar
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isCompleted = progress.checklist_items?.[item.id] === true;

              return (
                <div
                  key={item.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                    isCompleted
                      ? "bg-green-50 border-green-200"
                      : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-md cursor-pointer"
                  }`}
                  onClick={() => !isCompleted && handleItemClick(item)}
                >
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                    ) : (
                      <div className={`w-10 h-10 ${item.bgColor} rounded-full flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${item.color}`} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold text-gray-900 mb-1 ${
                      isCompleted ? "line-through text-gray-500" : ""
                    }`}>
                      {item.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {item.description}
                    </p>
                    {!isCompleted && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleItemClick(item);
                        }}
                      >
                        {item.action}
                      </Button>
                    )}
                  </div>

                  {isCompleted && (
                    <Badge className="bg-green-500 text-white">
                      Concluído
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Dica do momento */}
        {!isCompleted && (
          <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-500 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-lg">💡</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-yellow-900 mb-1">
                  Dica: Comece pelo diagnóstico!
                </p>
                <p className="text-sm text-yellow-800">
                  O diagnóstico é a base de tudo. Quanto mais sincero você for nas respostas, mais preciso será o plano de ação personalizado.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}