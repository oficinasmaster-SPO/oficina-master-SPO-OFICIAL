import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import WheelLoader from "@/components/ui/WheelLoader";

/**
 * OnboardingGate: Controla o acesso baseado no status de onboarding do usuário.
 * 
 * Lógica de Roteamento:
 * 1. Autentica usuário
 * 2. Verifica flags de onboarding (first_access_completed, profile_completed)
 * 3. Se incompleto -> redireciona para /cadastro e bloqueia outras rotas
 * 4. Se completo -> libera acesso ao Dashboard
 */
// Cache de verificação de convites para evitar chamadas repetidas na mesma sessão
const inviteCheckCache = new Map(); // userId -> { checked: bool, hasPendingInvite: bool, redirectUrl: string|null }

export default function OnboardingGate({ children, user, isAuthenticated }) {
  const navigate = useNavigate();
  const location = useLocation();
  // PERF-FIX-01: isChecking começa false — evita bloquear render inicial desnecessariamente
  const [isChecking, setIsChecking] = useState(false);
  // Controla se já rodou a verificação para este usuário nesta sessão
  const checkedRef = useRef(false);

  useEffect(() => {
    // PERF-FIX-02: Só re-verificar quando o USUÁRIO muda (não a rota)
    // A verificação de rota é feita de forma síncrona abaixo
    if (!isAuthenticated || !user) {
      checkedRef.current = false;
      return;
    }
    if (checkedRef.current) return; // Já verificou nesta sessão
    checkedRef.current = true;
    checkOnboarding();
  }, [user?.id, isAuthenticated]); // Removido location.pathname do dep array

  const checkOnboarding = async () => {
    try {
      if (!isAuthenticated || !user) {
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
      if (shouldBypass) return;

      // Verificações síncronas primeiro (sem I/O) — resolve 95% dos casos instantaneamente
      const hasWorkshop = !!(user.workshop_id || user.data?.workshop_id);

      if (user.profile_completed === false && user.first_access_completed === true) {
        navigate(createPageUrl("CompletarPerfil")); return;
      }
      if (user.cadastro_em_andamento === true && user.role !== 'admin') {
        navigate(createPageUrl("Cadastro")); return;
      }
      // PERF-FIX-03: verificar convites APENAS se usuário não tem workshop e não é admin
      // e usar cache para não repetir a query em cada render/navegação
      const needsInviteCheck = user.role !== 'admin' && !hasWorkshop;
      if (needsInviteCheck) {
        const cached = inviteCheckCache.get(user.id);
        if (!cached) {
          // Marcar como verificando apenas se vai fazer I/O
          setIsChecking(true);
          try {
            const invites = await base44.entities.EmployeeInvite.filter({ email: user.email });
            const pendingInvites = invites.filter(inv => {
              const isPending = inv.status === 'pendente' || inv.status === 'enviado';
              if (!isPending) return false;
              if (inv.expires_at && new Date(inv.expires_at) < new Date()) return false;
              return true;
            });
            
            if (pendingInvites.length > 0) {
              pendingInvites.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
              const pendingInvite = pendingInvites[0];
              const redirectUrl = `/PrimeiroAcesso?token=${pendingInvite.invite_token}&profile_id=${pendingInvite.profile_id || pendingInvite.metadata?.profile_id || ''}`;
              inviteCheckCache.set(user.id, { hasPendingInvite: true, redirectUrl });
              console.log("🚨 Detectado convite pendente. Redirecionando para PrimeiroAcesso", pendingInvite);
              window.location.href = redirectUrl;
              return;
            } else {
              inviteCheckCache.set(user.id, { hasPendingInvite: false, redirectUrl: null });
            }
          } catch (e) {
            console.error("Erro ao checar convites:", e);
            inviteCheckCache.set(user.id, { hasPendingInvite: false, redirectUrl: null });
          }
          setIsChecking(false);
        } else if (cached.hasPendingInvite && cached.redirectUrl) {
          window.location.href = cached.redirectUrl;
          return;
        }
      }

      // ✅ Se já está em /cadastro ou /completarperfil, permitir (é a página de onboarding)
      if (currentPath.includes('cadastro') || currentPath.includes('completarperfil')) {
        return;
      }

      // LÓGICA DE ROTEAMENTO síncronas — sem I/O adicional
      if (!hasWorkshop && user.role !== 'admin') {
        navigate(createPageUrl("Cadastro")); return;
      }
      if (user.first_access_completed === false && user.role !== 'admin') {
        navigate(createPageUrl("Cadastro")); return;
      }
      if (user.profile_completed === false) {
        navigate(createPageUrl("CompletarPerfil")); return;
      }

      // Passou todas verificações — nada a fazer

    } catch (error) {
      console.error("❌ Erro ao verificar onboarding:", error);
      setIsChecking(false);
    }
  };

  // Delaying loading screen to avoid flashes on quick verifications
  const [showLoading, setShowLoading] = useState(false);
  useEffect(() => {
    let timeout;
    if (isChecking) {
      timeout = setTimeout(() => setShowLoading(true), 400); // 400ms delay before showing loader
    } else {
      setShowLoading(false);
    }
    return () => clearTimeout(timeout);
  }, [isChecking]);

  // Mostrar loading apenas enquanto verifica (não em /cadastro ou em páginas base para evitar flash)
  const isAuthOrOnboardingPage = location.pathname.toLowerCase().includes('cadastro') || 
                               location.pathname.toLowerCase().includes('primeiroacesso');
                               
  if (isChecking && !isAuthOrOnboardingPage && showLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="animate-in fade-in duration-300">
          <WheelLoader size="xl" text="Verificando acesso..." />
        </div>
      </div>
    );
  } else if (isChecking && !isAuthOrOnboardingPage && !showLoading) {
    // Return empty state while waiting for the 300ms timeout
    return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50" />;
  }

  // Render normal
  return children;
}