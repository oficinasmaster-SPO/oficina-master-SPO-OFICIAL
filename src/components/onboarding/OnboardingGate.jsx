import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

/**
 * OnboardingGate: Controla o acesso baseado no status de onboarding do usuário.
 * 
 * Lógica de Roteamento:
 * 1. Autentica usuário
 * 2. Verifica flags de onboarding (first_access_completed, profile_completed)
 * 3. Se incompleto -> redireciona para /cadastro e bloqueia outras rotas
 * 4. Se completo -> libera acesso ao Dashboard
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

      // Páginas que devem pular essa verificação completamente (públicas ou de auth)
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

      // ✅ Se já está em /cadastro, permitir (é a página de onboarding)
      if (currentPath.includes('cadastro')) {
        setIsChecking(false);
        return;
      }

      // LÓGICA DE ROTEAMENTO (PER USER)

      // 1. Verificar se está com o cadastro da oficina em andamento
      if (user.cadastro_em_andamento === true) {
        navigate(createPageUrl("Cadastro"));
        return;
      }

      // 2. Verificar se não possui uma oficina vinculada (e não é admin)
      const hasWorkshop = !!(user.workshop_id || user.data?.workshop_id);
      if (!hasWorkshop && user.role !== 'admin') {
        navigate(createPageUrl("Cadastro"));
        return;
      }

      // 3. Verificar Primeiro Acesso do Proprietário (Tenant) legado
      if (user.first_access_completed === false) {
        navigate(createPageUrl("Cadastro"));
        return;
      }

      // 4. Verificar Perfil do Colaborador legado
      if (user.profile_completed === false) {
        navigate(createPageUrl("Cadastro"));
        return;
      }

      // Se passou por todas as verificações, libera o acesso
      setIsChecking(false);

    } catch (error) {
      console.error("❌ Erro ao verificar onboarding:", error);
      setIsChecking(false);
    }
  };

  // Mostrar loading apenas enquanto verifica (não em /cadastro para evitar flash)
  if (isChecking && !location.pathname.toLowerCase().includes('cadastro')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-gray-600 font-medium">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // Render normal
  return children;
}