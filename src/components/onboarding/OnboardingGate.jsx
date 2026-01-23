import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

/**
 * OnboardingGate: Verifica se o usuário autenticado tem workshop cadastrado
 * Se não tiver, redireciona para /cadastro
 * Se tiver, permite navegação normal
 * 
 * ⚠️ NÃO altera fluxo de colaboradores (Employee, convites, etc)
 */
export default function OnboardingGate({ children, user, isAuthenticated }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    checkOnboarding();
  }, [user, isAuthenticated]);

  const checkOnboarding = async () => {
    try {
      // Apenas verificar para usuários autenticados
      if (!isAuthenticated || !user) {
        setIsChecking(false);
        return;
      }

      // Páginas que devem pular essa verificação
      const bypassPages = [
        'primeiroacesso',
        'clientregistration',
        'cadastro',
        'cadastrosucesso',
        'login',
        'signup'
      ];

      const currentPath = location.pathname.toLowerCase();
      const shouldBypass = bypassPages.some(page => currentPath.includes(page));

      if (shouldBypass) {
        setIsChecking(false);
        return;
      }

      // Buscar workshops onde o usuário é owner
      const workshops = await base44.entities.Workshop.filter({ 
        owner_id: user.id 
      });

      // Se tem workshops, tudo ok
      if (workshops && workshops.length > 0) {
        setIsChecking(false);
        setShouldRedirect(false);
        return;
      }

      // Se não tem workshop E não é apenas colaborador, redirecionar
      // (colaboradores são redirecionados via employee.workshop_id)
      if (!user.workshop_id) {
        setShouldRedirect(true);
        // Aguardar um tick para evitar race condition
        setTimeout(() => {
          navigate(createPageUrl("Cadastro"), { replace: true });
        }, 100);
      }

      setIsChecking(false);
    } catch (error) {
      console.error("❌ Erro ao verificar onboarding:", error);
      setIsChecking(false);
    }
  };

  // Se está verificando ou precisa redirecionar, mostrar loading
  if (isChecking || shouldRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-gray-600 font-medium">Verificando seu acesso...</p>
        </div>
      </div>
    );
  }

  // Render normal do app
  return children;
}