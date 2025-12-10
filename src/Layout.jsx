import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Bell, LogOut, Menu, X, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/navigation/Sidebar";
import Breadcrumbs from "@/components/navigation/Breadcrumbs";
import { SharedDataProvider } from "@/components/shared/SharedDataProvider";
import GlobalSearch from "@/components/navigation/GlobalSearch";

export default function Layout({ children }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

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

  const loadUser = React.useCallback(async () => {
    try {
      // Páginas públicas que não precisam de autenticação
      const publicPages = ['Home', 'PrimeiroAcesso'];
      const currentPath = window.location.pathname;
      const currentPage = currentPath.split('/').pop();
      const isPublicPage = publicPages.includes(currentPage);

      const authenticated = await base44.auth.isAuthenticated();
      setIsAuthenticated(authenticated);

      if (authenticated) {
        try {
          const currentUser = await base44.auth.me();
          setUser(currentUser);
          
          // Carregar oficina do usuário (otimizado)
          const workshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
          // Se não encontrar como dono, tenta buscar onde é colaborador (fallback se necessário)
          // Para evitar chamadas pesadas, assumimos primeiro o dono
          setWorkshop(workshops[0] || null);
        } catch (userError) {
          console.log("Error fetching user:", userError);
          setUser(null);
        }
      } else if (!isPublicPage) {
        // Se não autenticado e não é página pública, redireciona para login
        // Mas não para PrimeiroAcesso (convite de colaborador)
        console.log("User not authenticated on private page");
      }
    } catch (error) {
      console.log("User not authenticated:", error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

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
    staleTime: 60000,
    retry: 1
  });

  const handleLogout = async () => {
    await base44.auth.logout();
    window.location.href = createPageUrl("Home");
  };

  const handleLogin = () => {
    base44.auth.redirectToLogin();
  };

  // Verifica se é página pública
  const isPublicPage = () => {
    const publicPages = ['Home', 'PrimeiroAcesso'];
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop();
    return publicPages.includes(currentPage);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      
      {isAuthenticated && !isPublicPage() && (
        <Sidebar 
          user={user}
          unreadCount={unreadCount}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      <div className={`${isAuthenticated && !isPublicPage() ? 'lg:pl-64' : ''} flex flex-col min-h-screen transition-all duration-300`} style={isAuthenticated && !isPublicPage() ? { paddingLeft: 'var(--sidebar-width, 16rem)' } : {}}>
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30 print:hidden">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {isAuthenticated && !isPublicPage() && (
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

              <Link to={createPageUrl("Home")} className={`flex items-center gap-2 ${isAuthenticated && !isPublicPage() ? 'lg:hidden' : ''}`}>
                <div className="text-lg font-bold text-gray-900">Oficinas Master</div>
              </Link>

              {/* Global Search Bar */}
              {isAuthenticated && workshop && !isPublicPage() && (
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
                          {user.full_name || user.email}
                        </p>
                        <p className="text-xs text-gray-600 capitalize">
                          {user.role === 'admin' ? 'Administrador' : user.role === 'user' ? 'Consultor' : 'Usuário'}
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

        <main className="flex-1">
          <div className={`${isAuthenticated && !isPublicPage() ? 'px-4 sm:px-6 lg:px-8 py-6' : ''}`}>
            {isAuthenticated && !isPublicPage() && <Breadcrumbs />}
            {isPublicPage() ? (
              // Páginas públicas renderizam diretamente sem contexto
              children
            ) : isAuthenticated && workshop ? (
              <SharedDataProvider workshopId={workshop.id} userId={user?.id}>
                {children}
              </SharedDataProvider>
            ) : (
                  workshop && workshop.status === 'inativo' && user?.role !== 'admin' ? (
                      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
                          <div className="bg-red-100 p-4 rounded-full mb-4">
                              <LogOut className="w-8 h-8 text-red-600" />
                          </div>
                          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso em Análise</h2>
                          <p className="text-gray-600 max-w-md">
                              Sua oficina está com status <strong>Inativo</strong> ou em análise. 
                              Entre em contato com o suporte para regularizar seu acesso.
                          </p>
                      </div>
                  ) : children
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