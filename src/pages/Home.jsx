import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, TrendingUp, Users, BarChart3, Rocket, Loader2, LogIn, FileText, Target } from "lucide-react";
import OnboardingTour from "../components/onboarding/OnboardingTour";
import OnboardingChecklist from "../components/onboarding/OnboardingChecklist";
import ContextualTips from "../components/onboarding/ContextualTips"; // This will be removed from authenticated view
import DashboardHub from "../components/home/DashboardHub";
import DynamicHelpSystem from "@/components/help/DynamicHelpSystem";
import QuickTipsBar from "@/components/help/QuickTipsBar";

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null); // New state for workshop
  const [isCheckingAuth, setIsCheckingAuth] = useState(true); // Granular loading state
  const [isLoadingWorkshop, setIsLoadingWorkshop] = useState(false); // Granular loading state
  const [isLoadingProgress, setIsLoadingProgress] = useState(false); // Granular loading state
  const [userProgress, setUserProgress] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const init = async () => {
      setIsCheckingAuth(true);
      try {
        const authenticated = await base44.auth.isAuthenticated();
        setIsAuthenticated(authenticated);

        if (!authenticated) {
          setIsCheckingAuth(false);
          return;
        }

        let currentUser = null;
        try {
          currentUser = await base44.auth.me();
          setUser(currentUser);
        } catch (userError) {
          console.log("Error fetching user:", userError);
          setIsAuthenticated(false);
          setIsCheckingAuth(false);
          return;
        }

        if (!currentUser) {
          setIsCheckingAuth(false);
          return;
        }

        setIsLoadingWorkshop(true);
        try {
          const workshops = await base44.entities.Workshop.list();
          const userWorkshop = Array.isArray(workshops) 
            ? workshops.find(w => w.owner_id === currentUser.id) 
            : null;
          setWorkshop(userWorkshop);
        } catch (workshopError) {
          console.log("Error fetching workshops:", workshopError);
          setWorkshop(null);
        } finally {
          setIsLoadingWorkshop(false);
        }

        try {
          await loadUserProgress(currentUser, workshop);
        } catch (progressError) {
          console.log("Error loading progress:", progressError);
        }
      } catch (error) {
        console.log("User not authenticated or error:", error);
        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    init();
  }, []);

  const loadUserProgress = async (currentUser, userWorkshop) => {
    if (!currentUser?.id) {
      setIsLoadingProgress(false);
      return;
    }
    
    setIsLoadingProgress(true);
    try {
      const progressList = await base44.entities.UserProgress.list();
      const progressArray = Array.isArray(progressList) ? progressList : [];
      let progress = progressArray.find(p => p.user_id === currentUser.id);

      if (!progress) {
        try {
          progress = await base44.entities.UserProgress.create({
            user_id: currentUser.id,
            onboarding_completed: false,
            tour_completed: false,
            tour_step: 0,
            checklist_items: {
              cadastrou_oficina: false,
              fez_primeiro_diagnostico: false,
              visualizou_resultado: false,
              acessou_plano_acao: false,
              explorou_dashboard: false
            },
            first_login_date: new Date().toISOString(),
            last_login_date: new Date().toISOString()
          });
          setShowOnboarding(true);
        } catch (createError) {
          console.log("Error creating progress:", createError);
        }
      } else {
        try {
          await base44.entities.UserProgress.update(progress.id, {
            last_login_date: new Date().toISOString()
          });
        } catch (updateError) {
          console.log("Error updating progress:", updateError);
        }

        setShowOnboarding(!progress.onboarding_completed); 
        try {
          await updateChecklist(progress, currentUser, userWorkshop);
        } catch (checklistError) {
          console.log("Error updating checklist:", checklistError);
        }
      }

      setUserProgress(progress);
    } catch (error) {
      console.error("Erro ao carregar progresso:", error);
      setUserProgress(null);
    } finally {
      setIsLoadingProgress(false);
    }
  };

  const updateProgress = async (updates) => {
      if (!userProgress) {
          console.warn("No user progress available for update.");
          return;
      }
      try {
          const updated = await base44.entities.UserProgress.update(userProgress.id, updates);
          setUserProgress(updated); // Update local state
          // If onboarding is completed, hide the onboarding section
          if (updates.onboarding_completed === true) {
              setShowOnboarding(false);
          }
      } catch (error) {
          console.error("Failed to update user progress:", error);
      }
  };

  const updateChecklist = async (progress, currentUser, userWorkshop) => {
    if (!progress?.id || !currentUser?.id) return;
    
    try {
      let diagnostics = [];
      try {
        const diagList = await base44.entities.Diagnostic.list();
        diagnostics = Array.isArray(diagList) ? diagList : [];
      } catch (diagError) {
        console.log("Error fetching diagnostics:", diagError);
      }
      
      const userDiagnostics = diagnostics.filter(d => d.user_id === currentUser.id);

      const updatedChecklist = {
        cadastrou_oficina: !!userWorkshop,
        fez_primeiro_diagnostico: userDiagnostics.length > 0,
        visualizou_resultado: userDiagnostics.some(d => d.completed),
        acessou_plano_acao: progress.checklist_items?.acessou_plano_acao || false,
        explorou_dashboard: progress.checklist_items?.explorou_dashboard || false
      };

      const hasChanges = Object.keys(updatedChecklist).some(
        key => updatedChecklist[key] !== progress.checklist_items?.[key]
      );

      if (hasChanges) {
        try {
          const updatedProgress = await base44.entities.UserProgress.update(progress.id, {
            checklist_items: updatedChecklist
          });
          setUserProgress(updatedProgress);
        } catch (updateError) {
          console.log("Error updating checklist:", updateError);
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar checklist:", error);
    }
  };

  const handleStartDiagnostic = () => {
    if (!isAuthenticated) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }
    
    if (!workshop) { // Check 'workshop' state instead of 'hasWorkshop'
      navigate(createPageUrl("Cadastro"));
    } else {
      navigate(createPageUrl("Questionario"));
    }
  };

  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  const phases = [
    {
      phase: 1,
      title: "Sobrevivência e Geração de Caixa",
      description: "Foco em gerar lucro imediato para consolidar o negócio. Equipe reduzida com múltiplas funções.",
      icon: TrendingUp,
      color: "from-red-500 to-orange-500"
    },
    {
      phase: 2,
      title: "Crescimento com Equipe em Formação",
      description: "Necessidade de aumentar o time para continuar crescendo e lucrando. Início da estruturação.",
      icon: Users,
      color: "from-yellow-500 to-amber-500"
    },
    {
      phase: 3,
      title: "Organização, Liderança e Processos",
      description: "Estruturação de atividades, estabelecimento de processos e desenvolvimento de liderança.",
      icon: BarChart3,
      color: "from-blue-500 to-cyan-500"
    },
    {
      phase: 4,
      title: "Consolidação e Escala",
      description: "Empresa consolidada com planejamento estratégico de longo prazo e processos estabelecidos.",
      icon: Rocket,
      color: "from-green-500 to-emerald-500"
    }
  ];

  const dashboardTips = [
    "Complete seu perfil da oficina para desbloquear mais funcionalidades",
    "Faça diagnósticos regulares para acompanhar a evolução do seu negócio",
    "Use o módulo de tarefas para organizar as ações recomendadas",
    "A gamificação aumenta o engajamento da equipe em até 40%"
  ];

  if (isCheckingAuth || isLoadingWorkshop || isLoadingProgress) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  // Dashboard para usuários autenticados
  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <DynamicHelpSystem pageName="Home" autoStartTour={showOnboarding} />
        
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <QuickTipsBar tips={dashboardTips} pageName="home-dashboard" />

          {showOnboarding && (
            <>
              {/* Onboarding Tour only if not completed */}
              {userProgress && !userProgress.tour_completed && (
                <OnboardingTour
                  userId={user.id}
                  onComplete={() => updateProgress({ tour_completed: true })} // Mark tour completed via updateProgress
                />
              )}

              {/* Onboarding Checklist only if not completed */}
              {userProgress && !userProgress.onboarding_completed && (
                <div className="fixed top-20 right-6 z-40 w-full max-w-md animate-in slide-in-from-right duration-500">
                  <OnboardingChecklist
                    progress={userProgress}
                    onUpdate={(updates) => updateProgress(updates)} // Use defined updateProgress
                  />
                </div>
              )}
            </>
          )}

          <DashboardHub user={user} workshop={workshop} />
        </div>
      </div>
    );
  }

  // Landing page para usuários não autenticados
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Hero Section */}
      <div id="home-hero" className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center space-y-8">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              Descubra em que fase sua oficina está hoje
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              Responda 12 perguntas rápidas e receba um plano de ação personalizado para aumentar lucro, 
              organização e crescimento da sua oficina.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                onClick={() => navigate(createPageUrl("CadastroPlanos"))}
                size="lg" 
                className="bg-white text-blue-700 hover:bg-blue-50 text-lg px-8 py-6 rounded-full shadow-xl hover:shadow-2xl transition-all"
              >
                <Rocket className="mr-2 h-5 w-5" />
                Criar Conta Grátis
              </Button>
              <Button 
                onClick={handleLogin}
                size="lg" 
                variant="outline"
                className="bg-transparent border-2 border-white text-white hover:bg-white/10 text-lg px-8 py-6 rounded-full shadow-xl hover:shadow-2xl transition-all"
              >
                <LogIn className="mr-2 h-5 w-5" />
                Já tenho conta
              </Button>
            </div>
            <p className="text-sm text-blue-100 mt-2">
              Comece grátis e evolua conforme sua oficina cresce!
            </p>
          </div>
        </div>
      </div>

      {/* Phases Section */}
      <div id="phases-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            As 4 Fases de Evolução
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Entenda em qual estágio sua oficina se encontra e o que precisa fazer para evoluir
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {phases.map((phase) => {
            const Icon = phase.icon;
            return (
              <Card key={phase.phase} className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-blue-200">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${phase.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-500 mb-1">
                        FASE {phase.phase}
                      </div>
                      <CardTitle className="text-xl text-gray-900">
                        {phase.title}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed">
                    {phase.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <Button 
            onClick={() => navigate(createPageUrl("CadastroPlanos"))}
            size="lg" 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-8 py-6 rounded-full shadow-lg"
          >
            <Rocket className="mr-2 h-5 w-5" />
            Começar Agora Grátis
          </Button>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl mb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Por que fazer o diagnóstico?
          </h2>
          <p className="text-xl text-gray-600">
            Veja o que você vai receber gratuitamente
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="border-2 hover:shadow-xl transition-all">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Diagnóstico Completo
              </h3>
              <p className="text-gray-600">
                Identificação precisa da fase atual da sua oficina baseada em metodologia testada
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-xl transition-all">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Plano de Ação com IA
              </h3>
              <p className="text-gray-600">
                Recomendações personalizadas geradas por inteligência artificial para sua realidade
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-xl transition-all">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Acompanhamento
              </h3>
              <p className="text-gray-600">
                Monitore sua evolução ao longo do tempo com múltiplos diagnósticos
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <Button 
            onClick={() => navigate(createPageUrl("CadastroPlanos"))}
            size="lg"
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-xl px-12 py-8 rounded-full shadow-2xl"
          >
            <Rocket className="mr-3 h-6 w-6" />
            Começar Agora - É Grátis!
          </Button>
        </div>
      </div>
    </div>
  );
}