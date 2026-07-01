import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import WheelLoader from "@/components/ui/WheelLoader";
import { getUserWorkshopId } from "@/utils/userUtils";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Cache de verificação por sessão: evita chamadas repetidas para o mesmo usuário
const inviteCheckCache = new Map(); // userId -> { checked, hasPendingInvite, redirectUrl } | 'error'

const BYPASS_PAGES = [
  'primeiroacesso',
  'clientregistration',
  'cadastrosucesso',
  'planos',
  'login',
  'signup',
  'register',
];

export default function OnboardingGate({ children, user, isAuthenticated }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(false);
  const [inviteCheckError, setInviteCheckError] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      checkedRef.current = false;
      return;
    }
    if (checkedRef.current) return;
    checkedRef.current = true;
    checkOnboarding();
  }, [user?.id, isAuthenticated]);

  const handleRetry = () => {
    setInviteCheckError(false);
    inviteCheckCache.delete(user?.id);
    checkedRef.current = false;
    checkOnboarding();
  };

  const checkOnboarding = async () => {
    try {
      if (!isAuthenticated || !user) return;

      const currentPath = location.pathname.toLowerCase();
      const shouldBypass = BYPASS_PAGES.some(page => currentPath.includes(page));
      if (shouldBypass) return;

      // --- Verificações síncronas (sem I/O) ---
      if (user.profile_completed === false && user.first_access_completed === true) {
        navigate(createPageUrl("CompletarPerfil")); return;
      }
      if (user.cadastro_em_andamento === true && user.role !== 'admin') {
        navigate(createPageUrl("Cadastro")); return;
      }

      const hasWorkshop = !!getUserWorkshopId(user);
      const needsInviteCheck = user.role !== 'admin' && !hasWorkshop;

      if (!needsInviteCheck) {
        // Usuário tem workshop ou é admin — verificações restantes
        if (currentPath.includes('cadastro') || currentPath.includes('completarperfil')) return;
        if (!hasWorkshop && user.role !== 'admin') {
          navigate(createPageUrl("Cadastro")); return;
        }
        if (user.first_access_completed === false && user.role !== 'admin') {
          navigate(createPageUrl("Cadastro")); return;
        }
        if (user.profile_completed === false) {
          navigate(createPageUrl("CompletarPerfil")); return;
        }
        return;
      }

      // --- Precisa checar convite via server function ---
      const cached = inviteCheckCache.get(user.id);

      if (cached === 'error') {
        // Erro anterior já registrado — não retentar automaticamente, mostrar tela de erro
        setInviteCheckError(true);
        return;
      }

      if (cached) {
        // Cache hit
        if (cached.hasPendingInvite && cached.redirectUrl) {
          window.location.href = cached.redirectUrl;
        } else if (!cached.hasPendingInvite) {
          redirectToCadastroAfterInviteCheck(user);
          return;
        }
        return;
      }

      // Cache miss — chamar server function
      setIsChecking(true);
      let inviteResult;
      try {
        const response = await base44.functions.invoke("resolvePendingInviteForCurrentUser", {});
        inviteResult = response?.data ?? response;
      } catch (fetchErr) {
        console.error("Erro de rede ao checar convite:", fetchErr);
        inviteCheckCache.set(user.id, 'error');
        setInviteCheckError(true);
        setIsChecking(false);
        return;
      }

      if (!inviteResult?.success) {
        // Erro retornado pela função (status 500 etc.) — bloquear, NÃO ir para /Cadastro
        console.error("resolvePendingInviteForCurrentUser retornou erro:", inviteResult?.error);
        inviteCheckCache.set(user.id, 'error');
        setInviteCheckError(true);
        setIsChecking(false);
        return;
      }

      if (inviteResult.has_invite && inviteResult.redirect_url) {
        inviteCheckCache.set(user.id, { hasPendingInvite: true, redirectUrl: inviteResult.redirect_url });
        window.location.href = inviteResult.redirect_url;
        return;
      }

      // Confirmado pelo servidor: sem convite pendente
      inviteCheckCache.set(user.id, { hasPendingInvite: false, redirectUrl: null });
      setIsChecking(false);
      redirectToCadastroAfterInviteCheck(user);
      return;

    } catch (error) {
      console.error("Erro inesperado no OnboardingGate:", error);
      // Erro inesperado no próprio gate — não enviar para /Cadastro silenciosamente
      setInviteCheckError(true);
      setIsChecking(false);
    }
  };

  // Redireciona para /Cadastro após servidor confirmar has_invite:false
  const redirectToCadastroAfterInviteCheck = (u) => {
    if (!u || u.role === 'admin') return;

    base44.analytics?.track?.({
      eventName: 'ONBOARDING_CADASTRO_REDIRECT',
      properties: {
        user_id: u.id,
        email: u.email,
        reason: 'no_workshop_no_invite_confirmed'
      }
    });

    navigate(createPageUrl("Cadastro"));
  };

  // --- Loading state com delay para evitar flash ---
  const [showLoading, setShowLoading] = useState(false);
  useEffect(() => {
    let t;
    if (isChecking) {
      t = setTimeout(() => setShowLoading(true), 400);
    } else {
      setShowLoading(false);
    }
    return () => clearTimeout(t);
  }, [isChecking]);

  const isAuthOrOnboardingPage = location.pathname.toLowerCase().includes('cadastro') ||
    location.pathname.toLowerCase().includes('primeiroacesso');

  // Tela de erro de checagem de convite — bloqueia navegação
  if (inviteCheckError && !isAuthOrOnboardingPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-amber-100 p-3 rounded-full">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Verificação de acesso falhou</h2>
          <p className="text-gray-600 text-sm mb-6">
            Não foi possível verificar se existe convite pendente para este usuário.
            Por segurança, o acesso foi bloqueado. Tente novamente ou entre em contato com o administrador.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={handleRetry} className="w-full">
              Tentar novamente
            </Button>
            <Button variant="outline" className="w-full" onClick={() => base44.auth.logout('/')}>
              Sair
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isChecking && !isAuthOrOnboardingPage && showLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="animate-in fade-in duration-300">
          <WheelLoader size="xl" text="Verificando acesso..." />
        </div>
      </div>
    );
  }

  if (isChecking && !isAuthOrOnboardingPage && !showLoading) {
    return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50" />;
  }

  return children;
}