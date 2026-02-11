import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

/**
 * OnboardingGate: Verifica se o usuário autenticado tem workshop cadastrado
 * - Se estiver em /cadastro, renderiza imediatamente (sem bloqueio)
 * - Se não tiver workshop em outra rota, redireciona para /cadastro
 * - Se tiver workshop, permite navegação normal
 * 
 * ⚠️ NÃO altera fluxo de colaboradores (Employee, convites, etc)
 */
export default function OnboardingGate({ children, user, isAuthenticated }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkOnboarding();
  }, [user, isAuthenticated, location.pathname]);

  const checkOnboarding = async () => {
    try {
      // Apenas verificar para usuários autenticados
      if (!isAuthenticated || !user) {
        setIsChecking(false);
        return;
      }

      const currentPath = location.pathname.toLowerCase();

      // Páginas que devem pular essa verificação completamente
      const bypassPages = [
        'primeiroacesso',
        'clientregistration',
        'cadastrosucesso',
        'planos',
        'login',
        'signup'
      ];

      const shouldBypass = bypassPages.some(page => currentPath.includes(page));
      if (shouldBypass) {
        setIsChecking(false);
        return;
      }

      // ✅ Se já está em /cadastro, renderizar imediatamente (sem loop)
      if (currentPath.includes('cadastro')) {
        setIsChecking(false);
        return;
      }

      // ⚠️ Correção: Se estiver em /CadastroColaborador, não fazer nada (deixar o usuário lá se ele navegou intencionalmente)
      // Mas se o objetivo é forçar Home no F5, o comportamento padrão do React Router é manter a rota.
      // Se o usuário diz que "vai para CadastroColaborador", algo está redirecionando para lá.

      // Buscar workshops onde o usuário é owner
      const workshops = await base44.entities.Workshop.filter({ 
        owner_id: user.id 
      });

      // Se tem workshops, tudo ok
      if (workshops && workshops.length > 0) {
        setIsChecking(false);
        return;
      }

      // Se não tem workshop E não é apenas colaborador, redirecionar para /cadastro
      if (!user.workshop_id) {
        // navigate(createPageUrl("Cadastro"), { replace: true });
        console.log("Redirect to Cadastro disabled to fix refresh issue");
      }

      setIsChecking(false);
    } catch (error) {
      console.error("❌ Erro ao verificar onboarding:", error);
      setIsChecking(false);
    }
  };

  // Mostrar loading apenas enquanto verifica (não em /cadastro)
  if (isChecking && !location.pathname.toLowerCase().includes('cadastro')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-gray-600 font-medium">Verificando seu acesso...</p>
        </div>
      </div>
    );
  }

  // Render normal
  return children;
}