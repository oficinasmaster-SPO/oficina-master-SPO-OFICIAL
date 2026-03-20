import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Bell, LogOut, Menu, X, LogIn, AlertCircle, LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const { user, isAuthenticated, isLoadingAuth: isCheckingAuth } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAdminMode, getAdminUrl } = useAdminMode();
  const { workshop, workshopId, isLoading: isLoadingWorkshop } = useWorkshopContext();
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
        console.log("Error fetching notifications:", error);
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

  const shouldShowMenus = isAuthenticated && !isPublicPage && (!!workshop || isAdminMode);

  // IMPORTANTE: Desabilitar modo Admin em páginas de primeiro acesso
  const isFirstAccessPage = location.pathname.toLowerCase().includes('primeiroacesso');
  if (isFirstAccessPage && isAdminMode) {
    // Forçar saída do modo admin em páginas de primeiro acesso
    localStorage.removeItem('admin_workshop_id');
    window.location.search = '';
  }

  return (
    <PermissionsProvider>
      <OnboardingGate user={user} isAuthenticated={isAuthenticated}>
      <div className="min-h-screen bg-gray-50">

        {isAuthenticated && !isPublicPage && (
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

      <div className={`${isAuthenticated && !isPublicPage ? 'lg:pl-64' : ''} flex flex-col min-h-screen transition-all duration-300`} style={isAuthenticated && !isPublicPage ? { paddingLeft: 'var(--sidebar-width, 16rem)' } : {}}>
              {/* Injeção de CSS Personalizado por Oficina */}
              {workshop?.custom_css_url && (
                <link rel="stylesheet" href={`${workshop.custom_css_url}?v=${cssVersion}`} />
              )}
      
      {isAuthenticated && user && <AssistanceModeBanner user={user} />}
              {isAuthenticated && isAdminMode && workshop && <AdminModeBanner workshop={workshop} />}
              {!isPublicPage && (
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
                <div className="text-lg font-bold text-gray-900">Oficinas Master</div>
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
                        <p className="text-sm font-medium text-gray-900">
                          {workshop?.name || 'Oficina'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {workshop?.segment || workshop?.segment_auto || 'Automotiva'}
                        </p>
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
              <div className={`${isAuthenticated && !isPublicPage ? 'px-4 sm:px-6 lg:px-8 py-6' : ''}`}>
                {isAuthenticated && !isPublicPage && <Breadcrumbs />}
                {isAuthenticated && workshopId ? (
                  <SharedDataProvider workshopId={workshopId} userId={user?.id}>
                    {children}
                  </SharedDataProvider>
                ) : children}
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