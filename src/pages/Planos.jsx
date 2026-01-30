import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Loader2, Award, TrendingUp, AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PlanSelectionModal from "@/components/plans/PlanSelectionModal";
import { usePermissions } from "@/components/hooks/usePermissions";

export default function Planos() {
  const navigate = useNavigate();
  const { canPerform, user, loading: permLoading } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    console.log("[PLANOS] Página montada, pathname:", window.location.pathname);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Carregar planos configurados (PlanFeature tem os links de checkout)
      const allPlans = await base44.entities.PlanFeature.list();
      
      console.log("=== [PLANOS DEBUG COMPLETO] ===");
      console.log("Raw response count:", allPlans?.length);
      
      // Log detalhado de CADA plano
      allPlans?.forEach((plan, idx) => {
        console.log(`\n--- Plano ${idx + 1}: ${plan.plan_name} ---`);
        console.log("ID:", plan.plan_id);
        console.log("Nome:", plan.plan_name);
        console.log("Preço Mensal:", plan.price_monthly);
        console.log("Preço Anual:", plan.price_annual);
        console.log("Link Mensal:", plan.kiwify_checkout_url_monthly);
        console.log("Link Anual:", plan.kiwify_checkout_url_annual);
        console.log("Features Highlights:", plan.features_highlights?.length || 0, "itens");
        console.log("Features Allowed:", plan.features_allowed?.length || 0, "itens");
        console.log("Modules Allowed:", plan.modules_allowed?.length || 0, "itens");
        console.log("Active:", plan.active);
        console.log("Order:", plan.order);
      });
      
      // Filtrar apenas por active
      let filteredPlans = allPlans.filter(p => p.active);
      
      console.log("\n✅ Após filtro active:", filteredPlans?.length, "planos");
      
      if (user && user.role !== 'admin') {
        filteredPlans = filteredPlans.filter(p => 
          !p.target_audience || 
          p.target_audience === 'cliente' || 
          p.target_audience === 'todos'
        );
        console.log("✅ Após filtro audience:", filteredPlans?.length, "planos");
      }
      
      const sortedPlans = filteredPlans.sort((a, b) => (a.order || 0) - (b.order || 0));
      console.log("\n✅ Planos finais ordenados:", sortedPlans.map(p => p.plan_name));
      console.log("=== [FIM DEBUG] ===\n");
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

  const handleSelectPlan = async (selectedPlan, billingCycle) => {
    console.log("[PLANOS] Plano selecionado:", selectedPlan, "Ciclo:", billingCycle);
    
    // Verificar se está autenticado
    const isAuth = await base44.auth.isAuthenticated();
    
    if (!isAuth) {
      // Redirecionar para primeiro acesso com plano selecionado
      toast.info("Faça login para continuar com a assinatura");
      navigate(createPageUrl("PrimeiroAcesso") + `?plano=${selectedPlan.plan_id}`);
      return;
    }

    if (!workshop) {
      toast.error("Cadastre sua oficina primeiro");
      navigate(createPageUrl("Cadastro"));
      return;
    }

    if (selectedPlan.plan_id === currentPlan) {
      toast.info("Este já é o seu plano atual");
      return;
    }

    // Plano FREE não precisa de pagamento
    if (selectedPlan.plan_id === "FREE") {
      try {
        await base44.entities.Workshop.update(workshop.id, {
          planoAtual: "FREE",
          dataAssinatura: new Date().toISOString()
        });
        toast.success("Plano FREE ativado com sucesso!");
        setCurrentPlan("FREE");
        setShowModal(false);
        loadData();
        return;
      } catch (error) {
        console.error("Erro ao ativar plano FREE:", error);
        toast.error("Erro ao ativar plano");
        return;
      }
    }

    // Para planos pagos, o modal CheckoutConfirmModal já fará o redirect
    // Não precisa fazer nada aqui pois o redirect acontece no componente
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
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => setShowModal(true)}
            >
              Ver Planos Disponíveis
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("Home"))}
            >
              Voltar ao Início
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4">
              <Award className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Planos e Preços
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
              Acelere o crescimento do seu negócio com as ferramentas certas
            </p>
            {workshop && currentPlan && (
              <Badge className="bg-blue-600 text-white px-4 py-2 text-lg mb-6">
                Plano Atual: {currentPlan}
              </Badge>
            )}
            <div className="mt-6">
              <Button
                onClick={() => setShowModal(true)}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6 shadow-xl"
              >
                Ver Todos os Planos
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>

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
                <h3 className="font-semibold text-gray-900 mb-2">Mais Recursos</h3>
                <p className="text-sm text-gray-600">
                  Acesse funcionalidades avançadas de diagnóstico, IA e gestão
                </p>
              </div>
              <div className="text-center p-4">
                <div className="text-4xl mb-2">💎</div>
                <h3 className="font-semibold text-gray-900 mb-2">Suporte Premium</h3>
                <p className="text-sm text-gray-600">
                  Atendimento prioritário e consultoria especializada
                </p>
              </div>
              <div className="text-center p-4">
                <div className="text-4xl mb-2">🚀</div>
                <h3 className="font-semibold text-gray-900 mb-2">Crescimento Acelerado</h3>
                <p className="text-sm text-gray-600">
                  Ferramentas comprovadas para aumentar sua produtividade e lucro
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Seleção de Planos */}
      <PlanSelectionModal
        open={showModal}
        onClose={() => setShowModal(false)}
        plans={plans}
        currentPlan={currentPlan}
        user={user}
        workshop={workshop}
        onSelectPlan={handleSelectPlan}
      />
    </>
  );
}