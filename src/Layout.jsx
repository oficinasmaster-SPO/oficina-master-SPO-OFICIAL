import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Bell, LogOut, Menu, X, LogIn, AlertCircle, LogOutIcon, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/navigation/Sidebar";
import Breadcrumbs from "@/components/navigation/Breadcrumbs";
import { SharedDataProvider } from "@/components/shared/SharedDataProvider";
import GlobalSearch from "@/components/navigation/GlobalSearch";
import NotificationListener from "@/components/notifications/NotificationListener";
import NotificationPermissionBanner from "@/components/notifications/NotificationPermissionBanner";
// import ActivityTracker from "@/components/tracking/ActivityTracker";
import AssistanceModeBanner from "@/components/shared/AssistanceModeBanner.jsx";
import AdminModeBanner from "@/components/shared/AdminModeBanner.jsx";
import ImpersonationBanner, { getImpersonationData } from "@/components/shared/ImpersonationBanner.jsx";
import { useAdminMode } from "@/components/hooks/useAdminMode";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";

import OnboardingGate from "@/components/onboarding/OnboardingGate";
import { useModuleTracking } from "@/components/hooks/useModuleTracking";
import { useNavigationHistory } from "@/components/hooks/useNavigationHistory";
import TenantSelector from "@/components/navigation/TenantSelector";
import { useAuth } from "@/lib/AuthContext";
import WheelLoader from "@/components/ui/WheelLoader";
import PlanLimitModal from "@/components/limits/PlanLimitModal";
import VoucherPendingDialog from "@/components/vouchers/VoucherPendingDialog";


export default function Layout({ children, currentPageName }) {
  // Layout cache bust
  const location = useLocation();
  const { user, isAuthenticated, isLoadingAuth: isCheckingAuth } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAdminMode, getAdminUrl } = useAdminMode();
  const { workshop, workshopId, workshopsDisponiveis, setCurrentWorkshop, isLoading: isLoadingWorkshop } = useWorkshopContext();
  const impersonationData = getImpersonationData(user?.email);
  const [cssVersion] = useState(Date.now()); // Timestamp fixo por sessão para evitar re-requests

  // Usar dados do usuário alvo durante impersonação
  const displayUser = impersonationData?.target_user || user;
  const displayWorkshopId = impersonationData?.target_user?.workshop_id || workshopId;

  // Rastrear acesso a módulos automaticamente
  useModuleTracking(workshop);

  // Rastrear histórico de navegação
  useNavigationHistory();

  // Monitora mudanças no estado de colapso da sidebar
  useEffect(() => {
    const handleSidebarResize = () => {
      try {
        const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
        document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '4rem' : '16rem');
      } catch {
        document.documentElement.style.setProperty('--sidebar-width', '16rem');
      }
    };

    handleSidebarResize();
    window.addEventListener('storage', handleSidebarResize);
    window.addEventListener('sidebar-toggle', handleSidebarResize);

    return () => {
      window.removeEventListener('storage', handleSidebarResize);
      window.removeEventListener('sidebar-toggle', handleSidebarResize);
    };
  }, []);





  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', displayUser?.id],
    queryFn: async () => {
      try {
        if (!displayUser?.id) return [];
        const notifications = await base44.entities.Notification.filter({
          user_id: displayUser.id,
          is_read: false
        }, '-created_date', 20);
        return Array.isArray(notifications) ? notifications : [];
      } catch (error) {
        return [];
      }
    },
    enabled: !!displayUser?.id && isAuthenticated && !isCheckingAuth,
    staleTime: 5 * 60 * 1000
  });

  const unreadCount = notifications.length;

  const handleLogout = async () => {
    try {
      // Limpar histórico de navegação no logout
      localStorage.removeItem('lastVisitedRoute');
      localStorage.removeItem('lastVisitedRouteData');
    } catch (_) {}

    // S2-D1: Limpeza de tenant isolada em try/finally.
    // O finally garante que o logout acontece mesmo se
    // qualquer removeItem falhar (storage cheio, modo privado, etc).
    try {
      const email = displayUser?.email?.toLowerCase() || user?.email?.toLowerCase();
      if (email) {
        localStorage.removeItem('selected_company_id_' + email);
        localStorage.removeItem('selected_firm_id_' + email);
        localStorage.removeItem('om_impersonation_' + email);
      }
      // Limpar chaves globais legadas
      localStorage.removeItem('selected_company_id');
      localStorage.removeItem('selected_firm_id');
      localStorage.removeItem('om_impersonation');
      localStorage.removeItem('admin_workshop_id');
    } finally {
      try {
        await base44.auth.logout();
        window.location.href = createPageUrl('Home');
      } catch (error) {
        console.error('Logout error:', error);
        window.location.href = createPageUrl('Home');
      }
    }
  };

  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.pathname);
  };

  // Verificar se a página atual é pública (não precisa de autenticação)
  const publicPages = ['/PrimeiroAcesso', '/ClientRegistration', '/CadastroSucesso', '/Planos', '/Cadastro'];
  const isPublicPage = publicPages.some((page) => {
    const loc = location.pathname.toLowerCase();
    const p = page.toLowerCase();
    return loc === p || loc.startsWith(p + '/');
  });

  // Verificar se onboarding pendente considerando o workshop REAL (não só o ID do perfil)
  const hasValidWorkshop = !!workshop && !workshop._partial;
  const userHasWorkshopId = !!(displayUser?.workshop_id || displayUser?.data?.workshop_id);

  const isPendingOnboarding = displayUser?.role !== 'admin' && (
  displayUser?.cadastro_em_andamento === true ||
  displayUser?.first_access_completed === false ||
  displayUser?.profile_completed === false ||
  !userHasWorkshopId && !isLoadingWorkshop);


  const shouldShowMenus = isAuthenticated && !isPublicPage && !isPendingOnboarding && (hasValidWorkshop || isAdminMode || displayUser?.role === 'admin');

  // IMPORTANTE: Desabilitar modo Admin em páginas de primeiro acesso
  const isFirstAccessPage = location.pathname.toLowerCase().includes('primeiroacesso');
  if (isFirstAccessPage && isAdminMode) {
    // Forçar saída do modo admin em páginas de primeiro acesso
    window.location.search = '';
  }

  const globalAdminPages = ['/', '/home', '/dashboard', '/dashboardfinanceiro', '/configuracoeskiwify', '/gestaousuariosempresas', '/gestaotenants', '/gestaoempresas', '/adminprodutividade', '/admindesafios', '/gerenciarplanos', '/calendarioeventos', '/cadastrousuariodireto', '/testusuarios', '/adminmensagens', '/adminnotificacoes', '/gerenciartoursvideos', '/gerenciarprocessos', '/gestaorbac', '/configuracaopermissoesgranulares', '/logsauditoriarbac', '/usuariosadmin', '/monitoramentousuarios', '/diagnosticoplano', '/integracoes', '/testeopenai', '/adminqadashboard'];
  const isGlobalAdminPage = (isAdminMode || displayUser?.role === 'admin') && globalAdminPages.some((p) => location.pathname.toLowerCase() === p || location.pathname.toLowerCase().startsWith(p + '/'));
  const pagesWithoutWorkshopRequired = ['/controleaceleracao'];
  const isPageWithoutWorkshopRequired = pagesWithoutWorkshopRequired.some((p) => location.pathname.toLowerCase() === p || location.pathname.toLowerCase().startsWith(p + '/'));

  const [showLoading, setShowLoading] = useState(false);
  useEffect(() => {
    let timeout;
    // Admins e global admin pages não precisam de workshop — não exibir spinner
    const needsWorkshop = isAuthenticated && !isPublicPage && isLoadingWorkshop && displayUser?.role !== 'admin' && !isGlobalAdminPage;
    if (needsWorkshop) {
      timeout = setTimeout(() => setShowLoading(true), 300);
    } else {
      setShowLoading(false);
    }
    return () => clearTimeout(timeout);
  }, [isAuthenticated, isPublicPage, isLoadingWorkshop, displayUser?.role, isGlobalAdminPage]);

  return (
    <OnboardingGate user={displayUser} isAuthenticated={isAuthenticated}>
      <div className="min-h-screen bg-gray-50">
        <PlanLimitModal />
        {isAuthenticated && displayUser && <VoucherPendingDialog user={displayUser} />}
        
        {/* Debug de Permissões - DESABILITADO EM PRODUÇÃO (impacta performance) */}


        {shouldShowMenus &&
        <Sidebar
          user={displayUser}
          unreadCount={unreadCount}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          workshopId={displayWorkshopId} />

        }

      {/* {isAuthenticated && <ActivityTracker user={user} workshop={workshop} />} */}
      {isAuthenticated && displayUser &&
        <>
          <NotificationListener user={displayUser} />
          <NotificationPermissionBanner />
        </>
        }

      <div className={`flex flex-col min-h-screen transition-all duration-300 min-w-0 overflow-x-hidden ${shouldShowMenus ? 'lg:pl-[var(--sidebar-width,16rem)]' : ''}`}>
              {/* Injeção de CSS Personalizado por Oficina */}
              {workshop?.custom_css_url &&
          <link rel="stylesheet" href={`${workshop.custom_css_url}?v=${cssVersion}`} />
          }
      
      <ImpersonationBanner />
      {isAuthenticated && displayUser && <AssistanceModeBanner user={displayUser} />}
              {isAuthenticated && isAdminMode && workshop && <AdminModeBanner workshop={workshop} />}
              {shouldShowMenus &&
          <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30 print:hidden">
          <div className="sm:px-6 lg:px-8 pr-4 pl-4">
            <div className="flex items-center justify-between h-16">
              {isAuthenticated &&
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
                  
                  {sidebarOpen ?
                  <X className="w-6 h-6 text-gray-700" /> :

                  <Menu className="w-6 h-6 text-gray-700" />
                  }
                </button>
                }

              <Link to={createPageUrl("Home")} className={`flex items-center gap-2 ${isAuthenticated ? 'lg:hidden' : ''}`}>
                <img src="https://media.base44.com/images/public/69540822472c4a70b54d47aa/121a4c254_Horizontal_Fundo_Claro.png" alt="Oficinas Master" className="h-10 sm:h-12 object-contain" />
              </Link>

              {isAuthenticated && displayUser && <TenantSelector />}

              {/* Global Search Bar */}
              {isAuthenticated && workshop &&
                <div className="hidden md:flex flex-1 items-center justify-center px-6">
                    <GlobalSearch workshopId={workshop.id} />
                </div>
                }

              <div className="flex items-center gap-4 ml-auto">
                {isAuthenticated && displayUser &&
                  <Link
                    to={createPageUrl("Notificacoes")}
                    className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
                    
                    <Bell className="w-5 h-5 text-gray-700" />
                    {unreadCount > 0 &&
                    <Badge className="absolute -top-1 -right-1 bg-red-500 text-white h-5 min-w-5 px-1.5">
                        {unreadCount}
                      </Badge>
                    }
                  </Link>
                  }

                <div className="flex items-center gap-3">
                  {isCheckingAuth ?
                    <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" /> :
                    isAuthenticated && displayUser ?
                    <>
                      <div className="hidden md:block text-right">
                        {isLoadingWorkshop ?
                        <div className="animate-pulse">
                            <div className="h-4 w-24 bg-gray-200 rounded mb-1" />
                            <div className="h-3 w-16 bg-gray-100 rounded" />
                          </div> :
                        impersonationData ?
                        // Durante impersonação, mostra dados do usuário alvo
                        <>
                            <p className="text-sm font-medium text-gray-900">
                              {displayUser.full_name || displayUser.email}
                            </p>
                            <p className="text-xs text-gray-600">
                              {displayUser.position || displayUser.job_role || 'Usuário'}
                            </p>
                          </> :
                        workshopsDisponiveis && workshopsDisponiveis.length > 1 ?
                        <DropdownMenu>
                            <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded-md transition-colors focus:outline-none">
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">
                                  {workshop?.name || 'Sem oficina'}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {workshop?.segment || workshop?.segment_auto || ''}
                                </p>
                              </div>
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                              {workshopsDisponiveis.map((ws) =>
                            <DropdownMenuItem
                              key={ws.id}
                              className="flex items-center justify-between cursor-pointer hover:!bg-[#FF0000] hover:!text-white focus:!bg-[#FF0000] focus:!text-white"
                              onClick={() => setCurrentWorkshop(ws.id)}>
                              
                                  <div className="flex flex-col min-w-0">
                                    <span className="truncate text-sm">{ws.name}</span>
                                    {ws.company_id ?
                                <span className="text-xs opacity-60">Filial · {ws.city || 'Sem cidade'}</span> :
                                workshopsDisponiveis.some((w) => w.company_id === ws.id) ?
                                <span className="text-xs opacity-60">Matriz</span> :
                                <span className="text-xs opacity-60">{ws.city || 'Oficina'}</span>
                                }
                                  </div>
                                  {workshop?.id === ws.id && <Check className="w-4 h-4 flex-shrink-0" />}
                                </DropdownMenuItem>
                            )}
                            </DropdownMenuContent>
                          </DropdownMenu> :
                        workshop ?
                        <>
                            <p className="text-sm font-medium text-gray-900">
                              {workshop.name}
                            </p>
                            <p className="text-xs text-gray-600">
                              {workshop.segment || workshop.segment_auto || ''}
                            </p>
                          </> :
                        null}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLogout}
                        className="hidden md:flex items-center gap-2">
                        
                        <LogOut className="w-4 h-4" />
                        Sair
                      </Button>
                    </> :

                    <Button
                      onClick={handleLogin}
                      className="btn-gradient-animate text-black font-bold shadow-lg hover:scale-105"
                      size="sm">
                      
                      <LogIn className="w-4 h-4 mr-2" />
                      Entrar
                    </Button>
                    }
                </div>
              </div>
            </div>
            </div>
            </header>
          }

            <main className="flex-1">
              <div className={`${shouldShowMenus ? 'px-4 sm:px-6 lg:px-8 py-6' : ''}`}>
                {shouldShowMenus && <Breadcrumbs />}
                {isAuthenticated && !isPublicPage && isLoadingWorkshop && displayUser?.role !== 'admin' && !isGlobalAdminPage ?
              <div className="min-h-[60vh] flex items-center justify-center">
                    {showLoading ? <WheelLoader size="lg" text="Carregando dados..." /> : null}
                  </div> :

              // FIX-02: Mostrar "Nenhuma oficina" apenas se: (a) não carregando, (b) sem workshop, E (c) sem ID no perfil
              isAuthenticated && !isPublicPage && !isPendingOnboarding && !workshopId && !userHasWorkshopId && !isGlobalAdminPage && !isPageWithoutWorkshopRequired ?
              <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
                      <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
                      <h2 className="text-xl font-bold text-gray-900">Nenhuma oficina vinculada</h2>
                      <p className="text-gray-600 mb-4 max-w-md">Você ainda não possui uma oficina vinculada ao seu perfil. Cadastre sua oficina para começar.</p>
                      <Button onClick={() => window.location.href = '/Cadastro'}>
                        Cadastrar Oficina
                      </Button>
                    </div> :

              isAuthenticated && workshopId ?
              workshop?.status === 'inativo' && !isAdminMode ?
              <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
                          <div className="bg-red-100 p-6 rounded-full w-24 h-24 flex items-center justify-center mb-6">
                            <AlertCircle className="w-12 h-12 text-red-600" />
                          </div>
                          <h2 className="text-2xl font-bold text-gray-900 mb-3">Acesso Inválido</h2>
                          <p className="text-gray-600 mb-6 max-w-md">Sua oficina está inativa. Por favor, procure um administrador do sistema para reativar o acesso.</p>
                          <Button variant="outline" onClick={handleLogout}>Sair</Button>
                        </div> :
              displayUser?.role !== 'admin' && !location.pathname.toLowerCase().includes('meuplano') && workshop?.planStatus !== 'active' && workshop?.planStatus !== 'trial' ?
              <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
                          <div className="bg-red-100 p-6 rounded-full w-24 h-24 flex items-center justify-center mb-6">
                            <AlertCircle className="w-12 h-12 text-red-600" />
                          </div>
                          <h2 className="text-2xl font-bold text-gray-900 mb-3">Acesso Suspenso</h2>
                          <p className="text-gray-600 mb-6 max-w-md">O plano da sua oficina está inativo, suspenso ou cancelado. Por favor, acesse o painel de planos e regularize sua assinatura via Kiwify para continuar acessando o sistema.</p>
                          <Button onClick={() => window.location.href = createPageUrl("Planos")}>
                            Ver Planos e Assinar
                          </Button>
                        </div> :

              <SharedDataProvider workshop={workshop} workshopId={workshopId} userId={displayUser?.id}>
                          {children}
                        </SharedDataProvider> :

              children

              }
            </div>
            </main>

        <footer className="bg-white border-t border-gray-200 mt-auto print:hidden">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
              <p className="text-sm text-gray-600">
                © 2025 Oficinas Master. Todos os direitos reservados.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="text-sm text-gray-600 hover:text-primary transition-colors">
                  Termos de Uso
                </a>
                <a href="#" className="text-sm text-gray-600 hover:text-primary transition-colors">
                  Privacidade
                </a>
                <a href="#" className="text-sm text-gray-600 hover:text-primary transition-colors">
                  Suporte
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
      </OnboardingGate>);

}