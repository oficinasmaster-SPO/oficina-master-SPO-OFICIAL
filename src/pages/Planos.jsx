import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Loader2, Award, TrendingUp, AlertCircle, Grid3X3, Table2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import PlanCard from "../components/plans/PlanCard";
import PlansComparison from "../components/plans/PlansComparison";
import { usePermissions } from "@/components/hooks/usePermissions";

export default function Planos() {
  const navigate = useNavigate();
  const { canPerform, user, loading: permLoading } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [viewMode, setViewMode] = useState("cards"); // "cards" or "table"

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Carregar planos configurados (PlanFeature tem os links de checkout)
      const allPlans = await base44.entities.PlanFeature.list();
      const sortedPlans = allPlans.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
      setPlans(sortedPlans);

      // Tentar carregar dados do usuário (opcional)
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          const user = await base44.auth.me();
          const workshops = await base44.entities.Workshop.list();
          const userWorkshop = workshops.find(w => w.owner_id === user.id);
          
          if (userWorkshop) {
            setWorkshop(userWorkshop);
            setCurrentPlan(userWorkshop.planoAtual || "FREE");
          }
        }
      } catch (authError) {
        // Usuário não autenticado - continua sem workshop
        console.log("Visitante não autenticado");
      }
    } catch (error) {
      console.error("Erro ao carregar planos:", error);
      toast.error("Erro ao carregar planos");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planName) => {
    // Verificar se está autenticado
    const isAuth = await base44.auth.isAuthenticated();
    
    if (!isAuth) {
      // Redirecionar para primeiro acesso com plano selecionado
      toast.info("Faça login para continuar com a assinatura");
      navigate(createPageUrl("PrimeiroAcesso") + `?plano=${planName}`);
      return;
    }

    if (!workshop) {
      toast.error("Cadastre sua oficina primeiro");
      navigate(createPageUrl("Cadastro"));
      return;
    }

    if (planName === currentPlan) {
      toast.info("Este já é o seu plano atual");
      return;
    }

    // Plano FREE não precisa de pagamento
    if (planName === "FREE") {
      try {
        await base44.entities.Workshop.update(workshop.id, {
          planoAtual: planName,
          dataAssinatura: new Date().toISOString()
        });
        toast.success("Plano FREE ativado com sucesso!");
        setCurrentPlan(planName);
        loadData();
        return;
      } catch (error) {
        console.error("Erro ao ativar plano FREE:", error);
        toast.error("Erro ao ativar plano");
        return;
      }
    }

    // Para planos pagos, buscar link de checkout
    try {
      toast.loading("Carregando checkout...");
      
      // Buscar informações do plano
      const planFeatures = await base44.entities.PlanFeature.list();
      const planInfo = planFeatures.find(p => p.plan_id === planName);
      
      if (!planInfo || !planInfo.kiwify_checkout_url) {
        toast.dismiss();
        toast.error(`Plano ${planName} não possui link de checkout configurado`);
        return;
      }
      
      toast.dismiss();
      toast.success("Redirecionando para pagamento...");
      
      // Redirecionar para checkout Kiwify
      window.location.href = planInfo.kiwify_checkout_url;
      
    } catch (error) {
      toast.dismiss();
      console.error("Erro ao processar checkout:", error);
      toast.error("Erro ao processar pagamento. Tente novamente.");
    }
  };

  const getPlanOrder = (planName) => {
    const order = {
      "FREE": 0,
      "START": 1,
      "BRONZE": 2,
      "PRATA": 3,
      "GOLD": 4,
      "IOM": 5,
      "MILLIONS": 6
    };
    return order[planName] || 0;
  };

  const getActionType = (planName) => {
    const currentOrder = getPlanOrder(currentPlan);
    const planOrder = getPlanOrder(planName);

    if (planName === currentPlan) return "current";
    if (planOrder > currentOrder) return "upgrade";
    if (planOrder < currentOrder) return "downgrade";
    return "select";
  };

  if (loading || permLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Bloquear upgrade/downgrade para perfis específicos (mas permite visualização)
  const isRestrictedRole = user?.job_role === 'mentor' || user?.job_role === 'consultor' || user?.job_role === 'acelerador';
  
  if (isRestrictedRole && workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-md text-center">
          <div className="bg-yellow-100 p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <AlertCircle className="w-12 h-12 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Acesso Restrito
          </h2>
          <p className="text-gray-600 mb-6">
            Como <strong>{user.job_role === 'mentor' ? 'Mentor' : user.job_role === 'consultor' ? 'Consultor' : 'Acelerador'}</strong>, 
            você não tem permissão para alterar o plano da oficina.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Entre em contato com o administrador do sistema se precisar de acesso.
          </p>
          <button
            onClick={() => navigate(createPageUrl("Home"))}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4">
            <Award className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Escolha o Plano Ideal para sua Oficina
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Evolua seu negócio com ferramentas e recursos exclusivos. 
            {currentPlan && currentPlan !== "FREE" && (
              <span className="block mt-2 text-blue-600 font-semibold">
                Seu plano atual: {currentPlan}
              </span>
            )}
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex justify-center gap-3 mb-8">
          <Button
            variant={viewMode === "cards" ? "default" : "outline"}
            onClick={() => setViewMode("cards")}
            className="flex items-center gap-2"
          >
            <Grid3X3 className="w-4 h-4" />
            Visualizar Cards
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            onClick={() => setViewMode("table")}
            className="flex items-center gap-2"
          >
            <Table2 className="w-4 h-4" />
            Comparar Planos
          </Button>
        </div>

        {/* Planos Grid */}
        {viewMode === "cards" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                currentPlan={currentPlan}
                actionType={getActionType(plan.plan_id)}
                onSelect={() => handleSelectPlan(plan.plan_id)}
                workshopLimits={workshop?.limitesUtilizados}
              />
            ))}
          </div>
        ) : (
          <div className="mb-12">
            <PlansComparison plans={plans} />
          </div>
        )}

        {/* Features Highlight */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-blue-200">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">
              Por que fazer upgrade?
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4">
              <div className="text-4xl mb-2">📊</div>
              <h3 className="font-semibold text-gray-900 mb-2">Mais Diagnósticos</h3>
              <p className="text-sm text-gray-600">
                Realize mais diagnósticos por mês para acompanhar a evolução do seu negócio
              </p>
            </div>
            <div className="text-center p-4">
              <div className="text-4xl mb-2">🤖</div>
              <h3 className="font-semibold text-gray-900 mb-2">IA Avançada</h3>
              <p className="text-sm text-gray-600">
                Acesse recomendações preditivas e análises profundas com inteligência artificial
              </p>
            </div>
            <div className="text-center p-4">
              <div className="text-4xl mb-2">👥</div>
              <h3 className="font-semibold text-gray-900 mb-2">Mais Colaboradores</h3>
              <p className="text-sm text-gray-600">
                Gerencie mais funcionários e filiais conforme sua empresa cresce
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}