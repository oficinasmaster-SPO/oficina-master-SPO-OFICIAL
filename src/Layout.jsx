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
import { usePermissions } from "@/components/hooks/usePermissions";
import AssistanceModeBanner from "@/components/shared/AssistanceModeBanner.jsx";
import AdminModeBanner from "@/components/shared/AdminModeBanner.jsx";
import { useAdminMode } from "@/components/hooks/useAdminMode";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const { isAdminMode, getAdminUrl } = useAdminMode();
  const { workshop, workshopId } = useWorkshopContext();
  // TEMPORARIAMENTE DESABILITADO
  // const { canAccessPage } = usePermissions();

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
    const interval = setInterval(handleSidebarResize, 500);

    return () => {
      window.removeEventListener('storage', handleSidebarResize);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const publicPages = ['primeiroaçesso', 'primeiroacesso', '/PrimeiroAcesso', '/ClientRegistration', '/login', '/signup'];
      const isPublicPage = publicPages.some(page => 
        location.pathname.toLowerCase().includes(page.toLowerCase()) ||
        location.pathname.includes('PrimeiroAcesso') ||
        location.pathname.includes('primeiroaçesso')
      );

      if (isPublicPage) {
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
        return;
      }

      try {
        const authenticated = await base44.auth.isAuthenticated();
        setIsAuthenticated(authenticated);

        if (authenticated) {
          try {
            const currentUser = await base44.auth.me();
            setUser(currentUser);
          } catch (userError) {
            console.log("Error fetching user:", userError);
            setUser(null);
          }
        }
      } catch (error) {
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    loadUser();
  }, [location.pathname]);



  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-notifications', user?.id],
    queryFn: async () => {
      try {
        const notifications = await base44.entities.Notification.list();
        return Array.isArray(notifications) 
          ? notifications.filter(n => n.user_id === user?.id && !n.is_read).length 
          : 0;
      } catch (error) {
        console.log("Error fetching notifications:", error);
        return 0;
      }
    },
    enabled: !!user?.id && isAuthenticated && !isCheckingAuth,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  const handleLogout = async () => {
    try {
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
  const publicPages = ['/PrimeiroAcesso', '/ClientRegistration', '/CadastroSucesso'];
  const isPublicPage = publicPages.some(page => 
    location.pathname.toLowerCase().includes(page.toLowerCase())
  );

  // IMPORTANTE: Desabilitar modo Admin em páginas de primeiro acesso
  const isFirstAccessPage = location.pathname.toLowerCase().includes('primeiroacesso');
  if (isFirstAccessPage && isAdminMode) {
    // Forçar saída do modo admin em páginas de primeiro acesso
    localStorage.removeItem('admin_workshop_id');
    window.location.search = '';
  }

  return (
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
                      className="bg-blue-600 hover:bg-blue-700 text-white"
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
                <a href="#" className="text-sm text-gray-600 hover:text-blue-600">
                  Termos de Uso
                </a>
                <a href="#" className="text-sm text-gray-600 hover:text-blue-600">
                  Privacidade
                </a>
                <a href="#" className="text-sm text-gray-600 hover:text-blue-600">
                  Suporte
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}