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
import ActivityTracker from "@/components/tracking/ActivityTracker";
import { usePermissions } from "@/components/hooks/usePermissions";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAdminView, setIsAdminView] = useState(false);
  const { canAccessPage } = usePermissions();

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
    // Páginas públicas que não precisam de autenticação
    const publicPages = ['/PrimeiroAcesso', '/ClientRegistration', '/login', '/signup'];
    const isPublicPage = publicPages.some(page => location.pathname.toLowerCase().includes(page.toLowerCase()));

    console.log("🔍 Verificando autenticação - Página atual:", location.pathname);
    console.log("🔍 É página pública?", isPublicPage);

    if (isPublicPage) {
      setIsAuthenticated(false);
      setIsCheckingAuth(false);
      console.log("✅ Página pública - autenticação ignorada");
      return;
    }

    try {
      const authenticated = await base44.auth.isAuthenticated();
      setIsAuthenticated(authenticated);

      if (authenticated) {
        try {
          const currentUser = await base44.auth.me();
          
          // Apenas atualizar last_login_at (não mexer em user_status aqui)
          // user_status deve ser gerenciado apenas pelo admin via approveUserAccess
          try {
            await base44.auth.updateMe({
              first_login_at: currentUser.first_login_at || new Date().toISOString(),
              last_login_at: new Date().toISOString()
            });
            console.log("✅ Login registrado");

            // Registrar login no log de auditoria
            try {
              await base44.functions.invoke('auditLog', {
                user_id: currentUser.id,
                action: 'login',
                details: {
                  timestamp: new Date().toISOString()
                }
              });
            } catch (auditError) {
              console.error("⚠️ Erro ao registrar auditoria (não crítico):", auditError);
            }
          } catch (updateError) {
            console.error("⚠️ Erro ao atualizar login (não crítico):", updateError);
          }
          setUser(currentUser);

          console.log("👤 User autenticado:", currentUser.email);
          console.log("🏢 Workshop_id do User:", currentUser.workshop_id);

          // Verificar se há workshop_id na URL (admin visualizando cliente)
          const urlParams = new URLSearchParams(window.location.search);
          const adminWorkshopId = urlParams.get('workshop_id');

          console.log("🔍 Workshop_id na URL:", adminWorkshopId);
          console.log("🔍 É admin?", currentUser.role === 'admin');

          let userWorkshop = null;

          if (adminWorkshopId && currentUser.role === 'admin') {
            // MODO ADMIN: Carregar oficina do cliente
            console.log("🔐 MODO ADMIN: Carregando oficina do cliente...");
            userWorkshop = await base44.entities.Workshop.get(adminWorkshopId);
            setIsAdminView(true);
            console.log("✅ Workshop do cliente carregado:", userWorkshop?.name);
          } else {
            setIsAdminView(false);
            // MODO NORMAL: Carregar oficina do próprio usuário

            // 1. Tenta buscar como dono
            const ownedWorkshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
            userWorkshop = Array.isArray(ownedWorkshops) && ownedWorkshops.length > 0 
              ? ownedWorkshops[0] 
              : null;

            if (userWorkshop) {
              console.log("✅ Workshop encontrado como owner:", userWorkshop?.name);
            }

            // 2. Se não encontrou como dono e tem workshop_id no User, usar direto
            if (!userWorkshop && currentUser.workshop_id) {
              try {
                userWorkshop = await base44.entities.Workshop.get(currentUser.workshop_id);
                console.log("✅ Workshop encontrado pelo workshop_id do User:", userWorkshop?.name);
              } catch (err) {
                console.error("Erro ao buscar workshop pelo workshop_id do User:", err);
              }
            }

            // 3. Se ainda não encontrou, tenta via Employee (fallback)
            if (!userWorkshop) {
              try {
                const employees = await base44.entities.Employee.filter({ user_id: currentUser.id });
                const myEmployeeRecord = Array.isArray(employees) && employees.length > 0 ? employees[0] : null;

                if (myEmployeeRecord && myEmployeeRecord.workshop_id) {
                  userWorkshop = await base44.entities.Workshop.get(myEmployeeRecord.workshop_id);
                  console.log("✅ Workshop encontrado via Employee:", userWorkshop?.name);
                }
              } catch (empError) {
                console.error("Erro ao buscar workshop via Employee:", empError);
              }
            }
          }

          setWorkshop(userWorkshop || null);
        } catch (userError) {
          console.log("Error fetching user:", userError);
          setUser(null);
        }
      }
    } catch (error) {
      console.log("User not authenticated:", error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsCheckingAuth(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    loadUser();
  }, [loadUser, location.pathname]);

  // Verificar status de aprovação no primeiro login
  useEffect(() => {
    const checkUserApproval = async () => {
      if (!user?.email) return;

      try {
        // Se usuário está pending, mostrar mensagem de aguardando aprovação
        if (user?.user_status === 'pending') {
          console.log("⏳ Usuário aguardando aprovação");
          // O acesso será bloqueado pela lógica abaixo
          return;
        }

        // Vincular user_id ao Employee via backend (evita erro 403)
        try {
          await base44.functions.invoke('linkUserToEmployee', {});
          console.log("🔗 Employee vinculado ao User");
        } catch (linkError) {
          console.error("⚠️ Erro ao vincular Employee (não crítico):", linkError);
        }
      } catch (error) {
        console.error("Erro ao verificar aprovação:", error);
      }
    };

    checkUserApproval();
  }, [user?.id, user?.email, user?.user_status]);

  // Verificar se a página atual é pública (não precisa de autenticação)
  const publicPages = ['/PrimeiroAcesso', '/ClientRegistration', '/CadastroSucesso'];
  const isPublicPage = publicPages.some(page => 
    location.pathname.toLowerCase().includes(page.toLowerCase())
  );

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
    try {
      // Registrar logout no log de auditoria
      if (user?.id) {
        try {
          await base44.functions.invoke('auditLog', {
            user_id: user.id,
            action: 'logout',
            details: {
              timestamp: new Date().toISOString()
            }
          });
        } catch (auditError) {
          console.error("⚠️ Erro ao registrar auditoria:", auditError);
        }
      }
      
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

      {isAuthenticated && <ActivityTracker user={user} workshop={workshop} />}

      <div className={`${isAuthenticated ? 'lg:pl-64' : ''} flex flex-col min-h-screen transition-all duration-300`} style={isAuthenticated ? { paddingLeft: 'var(--sidebar-width, 16rem)' } : {}}>
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
                          {user.full_name || user.email}
                        </p>
                        <p className="text-xs text-gray-600">
                          {user.role === 'admin' ? 'Administrador' : user.position || 'Usuário'}
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
          <div className={`${isAuthenticated ? 'px-4 sm:px-6 lg:px-8 py-6' : ''}`}>
            {isAuthenticated && <Breadcrumbs />}
            {isAuthenticated ? (
              (() => {
                try {
                  // Verificar permissão de acesso à página de forma segura
                  console.log("🔐 [Layout] Verificando acesso à página:", currentPageName);
                  const hasAccess = !currentPageName || canAccessPage(currentPageName);
                  console.log("🔐 [Layout] Resultado do canAccessPage:", hasAccess);

                  if (!hasAccess) {
                    console.error("❌ [Layout] ACESSO NEGADO à página:", currentPageName);
                    return (
                      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
                        <div className="bg-red-100 p-4 rounded-full mb-4">
                          <LogOut className="w-8 h-8 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
                        <p className="text-gray-600 max-w-md mb-4">
                          Você não tem permissão para acessar esta página.
                        </p>
                        <Button onClick={() => window.location.href = createPageUrl("Home")}>
                          Voltar ao Início
                        </Button>
                      </div>
                    );
                  }
                  console.log("✅ [Layout] Acesso PERMITIDO à página:", currentPageName);
                } catch (error) {
                  console.error("❌ Erro crítico ao verificar permissões:", error);
                  // Em caso de erro, mostrar página de erro ao invés de tela branca
                  return (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
                      <div className="bg-yellow-100 p-4 rounded-full mb-4">
                        <LogOut className="w-8 h-8 text-yellow-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro ao Verificar Permissões</h2>
                      <p className="text-gray-600 max-w-md mb-4">
                        Ocorreu um erro ao verificar suas permissões. Por favor, recarregue a página.
                      </p>
                      <Button onClick={() => window.location.reload()}>
                        Recarregar Página
                      </Button>
                    </div>
                  );
                }

                // Verificar status do usuário
                if (user && user.user_status === 'pending') {
                  return (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
                      <div className="bg-yellow-100 p-4 rounded-full mb-4">
                        <LogOut className="w-8 h-8 text-yellow-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Aguardando Aprovação</h2>
                      <p className="text-gray-600 max-w-md mb-4">
                        Seu cadastro foi realizado com sucesso! No momento, seu acesso está 
                        <strong> aguardando aprovação</strong> de um administrador.
                      </p>
                      <p className="text-sm text-gray-500">
                        Você receberá um email assim que seu acesso for liberado.
                      </p>
                      <Button 
                        onClick={handleLogout}
                        variant="outline"
                        className="mt-6"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sair
                      </Button>
                    </div>
                  );
                }

                // Verificar workshop
                if (!workshop) {
                  return children;
                }

                if (workshop?.status === 'inativo' && user && user.role !== 'admin') {
                  return (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
                      <div className="bg-red-100 p-4 rounded-full mb-4">
                        <LogOut className="w-8 h-8 text-red-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso em Análise</h2>
                      <p className="text-gray-600 max-w-md">
                        Sua oficina está com status <strong>Inativo</strong>. 
                        Entre em contato com o suporte para regularizar seu acesso.
                      </p>
                    </div>
                  );
                }

                // Renderizar conteúdo com SharedDataProvider
                return (
                  <SharedDataProvider workshopId={workshop.id} userId={user?.id}>
                    {children}
                  </SharedDataProvider>
                );
              })()
            ) : (
              children
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