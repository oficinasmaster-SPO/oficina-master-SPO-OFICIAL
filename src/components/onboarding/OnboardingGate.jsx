import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import WheelLoader from "@/components/ui/WheelLoader";
import { AlertTriangle, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

// Cache de sessão: userId → resultado do resolveOnboardingState | 'error'
const stateCache = new Map();

const BYPASS_PATHS = [
  'primeiroacesso',
  'clientregistration',
  'cadastrosucesso',
  'planos',
  'login',
  'signup',
  'register',
  'publicnps',
  'publicdisc',
  'bemvindoplanos',
  'politicaprivacidade',
  'termosdeuso',
  'suporte',
];

export default function OnboardingGate({ children, user, isAuthenticated }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [gateState, setGateState] = useState(null); // null | 'BLOCKED' | 'ERROR'
  const [gateReason, setGateReason] = useState('');
  const checkedRef = useRef(false);

  // Delay do spinner para evitar flash em respostas rápidas
  useEffect(() => {
    let t;
    if (isChecking) {
      t = setTimeout(() => setShowLoading(true), 400);
    } else {
      setShowLoading(false);
    }
    return () => clearTimeout(t);
  }, [isChecking]);

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
    setGateState(null);
    setGateReason('');
    stateCache.delete(user?.id);
    checkedRef.current = false;
    checkOnboarding();
  };

  const checkOnboarding = async () => {
    try {
      if (!isAuthenticated || !user) return;

      const currentPath = location.pathname.toLowerCase();
      if (BYPASS_PATHS.some(p => currentPath.includes(p))) return;

      // Admins passam sempre
      if (user.role === 'admin') return;

      // Cache hit
      const cached = stateCache.get(user.id);
      if (cached === 'error') { setGateState('ERROR'); return; }
      if (cached) { applyState(cached); return; }

      // Cache miss — chamar resolveOnboardingState
      setIsChecking(true);
      let result;
      try {
        const response = await base44.functions.invoke("resolveOnboardingState", {});
        result = response?.data ?? response;
      } catch (fetchErr) {
        console.error("[OnboardingGate] Erro de rede:", fetchErr);
        stateCache.set(user.id, 'error');
        setGateState('ERROR');
        setIsChecking(false);
        return;
      }

      setIsChecking(false);

      if (!result?.success || !result?.state) {
        console.error("[OnboardingGate] Resposta inválida:", result);
        stateCache.set(user.id, 'error');
        setGateState('ERROR');
        return;
      }

      stateCache.set(user.id, result);
      applyState(result);

    } catch (error) {
      console.error("[OnboardingGate] Erro inesperado:", error);
      setGateState('ERROR');
      setIsChecking(false);
    }
  };

  const applyState = (result) => {
    const { state, redirect_url, reason } = result;

    switch (state) {
      case 'READY':
        // Libera — não faz nada
        return;

      case 'INVITED':
      case 'INVITE_EXPIRED':
        if (redirect_url) {
          window.location.href = redirect_url;
        }
        return;

      case 'NEW_OWNER':
        navigate('/Cadastro');
        return;

      case 'COMPLETE_PROFILE':
        navigate('/CompletarPerfil');
        return;

      case 'PENDING_LINK':
        // Vínculo pendente — mostrar tela informativa (setGateState abaixo)
        setGateState('PENDING_LINK');
        setGateReason(reason || '');
        return;

      case 'BLOCKED':
        setGateState('BLOCKED');
        setGateReason(reason || '');
        return;

      case 'ERROR':
      default:
        setGateState('ERROR');
        setGateReason(reason || '');
        return;
    }
  };

  // --- Renderização de estados bloqueantes ---

  const currentPath = location.pathname.toLowerCase();
  const isOnboardingPath = BYPASS_PATHS.some(p => currentPath.includes(p)) ||
    currentPath.includes('cadastro') || currentPath.includes('completarperfil');

  if ((gateState === 'BLOCKED' || gateState === 'PENDING_LINK') && !isOnboardingPath) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100 p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-red-100 p-3 rounded-full">
              <ShieldOff className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {gateState === 'PENDING_LINK' ? 'Vínculo em processamento' : 'Acesso bloqueado'}
          </h2>
          <p className="text-gray-600 text-sm mb-6">
            {gateState === 'PENDING_LINK'
              ? 'Seu cadastro está sendo finalizado. Se o problema persistir, entre em contato com o administrador.'
              : 'Sua conta ou oficina está inativa. Entre em contato com o administrador do sistema para regularizar o acesso.'}
          </p>
          <Button variant="outline" className="w-full" onClick={() => base44.auth.logout('/')}>
            Sair
          </Button>
        </div>
      </div>
    );
  }

  if (gateState === 'ERROR' && !isOnboardingPath) {
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
            Não foi possível verificar seu perfil de acesso. Por segurança, o acesso foi bloqueado.
            Tente novamente ou entre em contato com o administrador.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={handleRetry} className="w-full">Tentar novamente</Button>
            <Button variant="outline" className="w-full" onClick={() => base44.auth.logout('/')}>Sair</Button>
          </div>
        </div>
      </div>
    );
  }

  if (isChecking && !isOnboardingPath) {
    if (showLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="animate-in fade-in duration-300">
            <WheelLoader size="xl" text="Verificando acesso..." />
          </div>
        </div>
      );
    }
    return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50" />;
  }

  return children;
}