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
import { useAdminMode } from "@/components/hooks/useAdminMode";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";
import { PermissionsProvider } from "@/components/contexts/PermissionsContext";
import OnboardingGate from "@/components/onboarding/OnboardingGate";
import { useModuleTracking } from "@/components/hooks/useModuleTracking";
import { useNavigationHistory } from "@/components/hooks/useNavigationHistory";
import TenantSelector from "@/components/navigation/TenantSelector";
import { useAuth } from "@/lib/AuthContext";
import WheelLoader from "@/components/ui/WheelLoader";
import PlanLimitModal from "@/components/limits/PlanLimitModal";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const { user, isAuthenticated, isLoadingAuth: isCheckingAuth } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAdminMode, getAdminUrl } = useAdminMode();
  const { workshop, workshopId, workshopsDisponiveis, setCurrentWorkshop, isLoading: isLoadingWorkshop } = useWorkshopContext();
  const [cssVersion] = useState(Date.now()); // Timestamp fixo por sessão para evitar re-requests
  
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
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      try {
        if (!user?.id) return [];
        const allNotifications = await base44.entities.Notification.list('-created_date', 50);
        return Array.isArray(allNotifications) 
          ? allNotifications.filter(n => n.user_id === user.id && !n.is_read)
          : [];
      } catch (error) {
        return [];
      }
    },
    enabled: !!user?.id && isAuthenticated && !isCheckingAuth,
    staleTime: 5 * 60 * 1000,
  });

  const unreadCount = notifications.length;

  const handleLogout = async () => {
    try {
      // Limpar histórico de navegação no logout
      localStorage.removeItem('lastVisitedRoute');
      localStorage.removeItem('lastVisitedRouteData');
      
      await base44.auth.logout();
      window.location.href = createPageUrl("Home");
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = createPageUrl("Home");
    }
  };

  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.pathname);
  };

  // Verificar se a página atual é pública (não precisa de autenticação)
  const publicPages = ['/PrimeiroAcesso', '/ClientRegistration', '/CadastroSucesso', '/Planos', '/Cadastro'];
  const isPublicPage = publicPages.some(page => 
    location.pathname.toLowerCase().includes(page.toLowerCase())
  );

  const isPendingOnboarding = user?.role !== 'admin' && (
                              user?.cadastro_em_andamento === true || 
                              user?.first_access_completed === false || 
                              user?.profile_completed === false ||
                              !user?.workshop_id
                            );

  const shouldShowMenus = isAuthenticated && !isPublicPage && !isPendingOnboarding && (!!workshop || isAdminMode);

  // IMPORTANTE: Desabilitar modo Admin em páginas de primeiro acesso
  const isFirstAccessPage = location.pathname.toLowerCase().includes('primeiroacesso');
  if (isFirstAccessPage && isAdminMode) {
    // Forçar saída do modo admin em páginas de primeiro acesso
    localStorage.removeItem('admin_workshop_id');
    window.location.search = '';
  }

  const [showLoading, setShowLoading] = useState(false);
  useEffect(() => {
    let timeout;
    if (isAuthenticated && !isPublicPage && isLoadingWorkshop) {
      timeout = setTimeout(() => setShowLoading(true), 300); // 300ms delay to prevent flashes
    } else {
      setShowLoading(false);
    }
    return () => clearTimeout(timeout);
  }, [isAuthenticated, isPublicPage, isLoadingWorkshop]);

  return (
    <PermissionsProvider>
      <OnboardingGate user={user} isAuthenticated={isAuthenticated}>
      <div className="min-h-screen bg-gray-50">
        <PlanLimitModal />

        {shouldShowMenus && (
          <Sidebar 
            user={user}
            unreadCount={unreadCount}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        )}

      {/* {isAuthenticated && <ActivityTracker user={user} workshop={workshop} />} */}
      {isAuthenticated && user && (
        <>
          <NotificationListener user={user} />
          <NotificationPermissionBanner />
        </>
      )}

      <div className={`${shouldShowMenus ? 'lg:pl-64' : ''} flex flex-col min-h-screen transition-all duration-300`} style={shouldShowMenus ? { paddingLeft: 'var(--sidebar-width, 16rem)' } : {}}>
              {/* Injeção de CSS Personalizado por Oficina */}
              {workshop?.custom_css_url && (
                <link rel="stylesheet" href={`${workshop.custom_css_url}?v=${cssVersion}`} />
              )}
      
      {isAuthenticated && user && <AssistanceModeBanner user={user} />}
              {isAuthenticated && isAdminMode && workshop && <AdminModeBanner workshop={workshop} />}
              {shouldShowMenus && (
          <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30 print:hidden">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {isAuthenticated && (
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
                >
                  {sidebarOpen ? (
                    <X className="w-6 h-6 text-gray-700" />
                  ) : (
                    <Menu className="w-6 h-6 text-gray-700" />
                  )}
                </button>
              )}

              <Link to={createPageUrl("Home")} className={`flex items-center gap-2 ${isAuthenticated ? 'lg:hidden' : ''}`}>
                <img src="https://media.base44.com/images/public/69540822472c4a70b54d47aa/121a4c254_Horizontal_Fundo_Claro.png" alt="Oficinas Master" className="h-16 object-contain" />
              </Link>

              {isAuthenticated && user && <TenantSelector />}

              {/* Global Search Bar */}
              {isAuthenticated && workshop && (
                <div className="hidden md:flex flex-1 items-center justify-center px-6">
                    <GlobalSearch workshopId={workshop.id} />
                </div>
              )}

              <div className="flex items-center gap-4 ml-auto">
                {isAuthenticated && user && (
                  <Link
                    to={createPageUrl("Notificacoes")}
                    className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Bell className="w-5 h-5 text-gray-700" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 bg-red-500 text-white h-5 min-w-5 px-1.5">
                        {unreadCount}
                      </Badge>
                    )}
                  </Link>
                )}

                <div className="flex items-center gap-3">
                  {isCheckingAuth ? (
                    <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                  ) : isAuthenticated && user ? (
                    <>
                      <div className="hidden md:block text-right">
                        {workshopsDisponiveis && workshopsDisponiveis.length > 1 ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded-md transition-colors focus:outline-none">
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">
                                  {workshop?.name || 'Oficina'}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {workshop?.segment || workshop?.segment_auto || 'Automotiva'}
                                </p>
                              </div>
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                              {workshopsDisponiveis.map((ws) => (
                                <DropdownMenuItem 
                                  key={ws.id} 
                                  className="flex items-center justify-between cursor-pointer hover:!bg-[#FF0000] hover:!text-white focus:!bg-[#FF0000] focus:!text-white"
                                  onClick={() => setCurrentWorkshop(ws.id)}
                                >
                                  <div className="flex flex-col min-w-0">
                                    <span className="truncate text-sm">{ws.name}</span>
                                    {!ws.company_id
                                      ? <span className="text-xs opacity-60">Matriz</span>
                                      : <span className="text-xs opacity-60">Filial · {ws.city || 'Sem cidade'}</span>
                                    }
                                  </div>
                                  {workshop?.id === ws.id && <Check className="w-4 h-4 flex-shrink-0" />}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-gray-900">
                              {workshop?.name || 'Oficina'}
                            </p>
                            <p className="text-xs text-gray-600">
                              {workshop?.segment || workshop?.segment_auto || 'Automotiva'}
                            </p>
                          </>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLogout}
                        className="hidden md:flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Sair
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={handleLogin}
                      className="btn-gradient-animate text-black font-bold shadow-lg hover:scale-105"
                      size="sm"
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      Entrar
                    </Button>
                  )}
                </div>
              </div>
            </div>
            </div>
            </header>
            )}

            <main className="flex-1">
              <div className={`${shouldShowMenus ? 'px-4 sm:px-6 lg:px-8 py-6' : ''}`}>
                {shouldShowMenus && <Breadcrumbs />}
                {isAuthenticated && !isPublicPage && isLoadingWorkshop ? (
                  <div className="min-h-[60vh] flex items-center justify-center">
                    {showLoading ? <WheelLoader size="lg" text="Carregando dados..." /> : null}
                  </div>
                ) : (
                  isAuthenticated && !isPublicPage && !isPendingOnboarding && !workshopId ? (
                    <div className="min-h-[60vh] flex flex-col items-center justify-center">
                      <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
                      <h2 className="text-xl font-bold text-gray-900">Nenhuma oficina selecionada</h2>
                      <p className="text-gray-600">Por favor, selecione uma oficina para continuar.</p>
                    </div>
                  ) : (
                    isAuthenticated && workshopId ? (
                      (user?.role !== 'admin' && !location.pathname.toLowerCase().includes('meuplano') && (workshop?.planStatus !== 'active' && workshop?.planStatus !== 'trial')) ? (
                        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
                          <div className="bg-red-100 p-6 rounded-full w-24 h-24 flex items-center justify-center mb-6">
                            <AlertCircle className="w-12 h-12 text-red-600" />
                          </div>
                          <h2 className="text-2xl font-bold text-gray-900 mb-3">Acesso Suspenso</h2>
                          <p className="text-gray-600 mb-6 max-w-md">O plano da sua oficina está inativo, suspenso ou cancelado. Por favor, acesse o painel de planos e regularize sua assinatura via Kiwify para continuar acessando o sistema.</p>
                          <Button onClick={() => window.location.href = createPageUrl("Planos")}>
                            Ver Planos e Assinar
                          </Button>
                        </div>
                      ) : (
                        <SharedDataProvider workshop={workshop} workshopId={workshopId} userId={user?.id}>
                          {children}
                        </SharedDataProvider>
                      )
                    ) : children
                  )
                )}
            </div>
            </main>

        <footer className="bg-white border-t border-gray-200 mt-auto print:hidden">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-600">
                © 2025 Oficinas Master. Todos os direitos reservados.
              </p>
              <div className="flex items-center gap-6">
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
      </OnboardingGate>
    </PermissionsProvider>
  );
}