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

      // 0. Verificar se o usuário possui um convite pendente ANTES de deixá-lo acessar o /cadastro
      const hasWorkshop = !!(user.workshop_id || user.data?.workshop_id);
      
      // REGRA: Mesmo que ele não tenha workshop, ou tenha tentado ir pro /cadastro, 
      // se existir um convite PENDENTE/ENVIADO com o email dele, NUNCA deixa ele criar oficina. Leva pro PrimeiroAcesso.
      if (user.role !== 'admin') {
        try {
          const invites = await base44.entities.EmployeeInvite.filter({ email: user.email });
          
          // Filtrar convites válidos (pendentes e não expirados)
          const pendingInvites = invites.filter(inv => {
            const isPending = inv.status === 'pendente' || inv.status === 'enviado';
            if (!isPending) return false;
            
            // Verificar se não expirou
            if (inv.expires_at) {
              const expiresAt = new Date(inv.expires_at);
              if (expiresAt < new Date()) {
                return false; // Expirou, ignorar
              }
            }
            return true;
          });
          
          if (pendingInvites.length > 0) {
            // Pegar o convite mais recente
            pendingInvites.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
            const pendingInvite = pendingInvites[0];
            
            // Se tem convite pendente, força o fluxo de aceite de convite (PrimeiroAcesso) e trava o resto
            console.log("🚨 Detectado convite pendente. Redirecionando para PrimeiroAcesso", pendingInvite);
            window.location.href = `/PrimeiroAcesso?token=${pendingInvite.invite_token}&profile_id=${pendingInvite.profile_id || pendingInvite.metadata?.profile_id || ''}`;
            return;
          }
        } catch (e) {
          console.error("Erro ao checar convites:", e);
        }
      }

      // ✅ Se já está em /cadastro ou /completarperfil, permitir (é a página de onboarding)
      if (currentPath.includes('cadastro') || currentPath.includes('completarperfil')) {
        setIsChecking(false);
        return;
      }

      // LÓGICA DE ROTEAMENTO (PER USER)
      
      // Colaboradores que entraram via convite
      // Eles têm profile_completed = false (forçado pela auth/convite) E first_access_completed = true
      if (user.profile_completed === false && user.first_access_completed === true) {
        navigate(createPageUrl("CompletarPerfil"));
        return;
      }

      // 1. Verificar se está com o cadastro da oficina em andamento
      if (user.cadastro_em_andamento === true) {
        navigate(createPageUrl("Cadastro"));
        return;
      }

      // 2. Verificar se não possui uma oficina vinculada (e não é admin)
      if (!hasWorkshop && user.role !== 'admin') {
        navigate(createPageUrl("Cadastro"));
        return;
      }

      // 3. Verificar Primeiro Acesso do Proprietário (Tenant) legado
      if (user.first_access_completed === false) {
        navigate(createPageUrl("Cadastro"));
        return;
      }

      // 4. Verificar Perfil do Colaborador genérico (caso passe das regras acima)
      if (user.profile_completed === false) {
        navigate(createPageUrl("CompletarPerfil"));
        return;
      }

      // Se passou por todas as verificações, libera o acesso
      setIsChecking(false);

    } catch (error) {
      console.error("❌ Erro ao verificar onboarding:", error);
      setIsChecking(false);
    }
  };

  // Mostrar loading apenas enquanto verifica (não em /cadastro ou em páginas base para evitar flash)
  const isAuthOrOnboardingPage = location.pathname.toLowerCase().includes('cadastro') || 
                               location.pathname.toLowerCase().includes('primeiroacesso');
                               
  if (isChecking && !isAuthOrOnboardingPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-gray-600 font-medium">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // Render normal
  return children;
}