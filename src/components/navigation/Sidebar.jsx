import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/components/hooks/usePermissions";
import { useUserType } from "@/hooks/useUserType";
import { useAssistanceMode } from "@/components/hooks/useAssistanceMode";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";
import { useAdminMode } from "@/components/hooks/useAdminMode";
import { base44 } from "@/api/base44Client";
import Avatar from "@/components/ui/Avatar";
import {
  X,
  Home,
  FileText,
  User,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Menu,
  Crown } from
"lucide-react";
import { cn } from "@/lib/utils";
import TenantSelector from "./TenantSelector";
import { getNavigationGroups } from "./navigationGroups";

function UserProfileSection({ user, collapsed, workshop }) {
  const { workshopId } = useWorkshopContext();

  // FIX-2: UMA única leitura Employee.filter({ user_id }) — compartilhada com o
  // checkGlobalContext do Sidebar via mesma queryKey (React Query dedupes).
  // Antes: leitura workshop-scoped (l.42) + fallback all (l.45) + 3ª leitura
  // idêntica no checkGlobalContext (l.203). Workshop-scoping agora é client-side.
  const { data: allEmployees = [], isLoading: loading } = useQuery({
    queryKey: ['sidebar-employee-all', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const employees = await base44.entities.Employee.filter({ user_id: user.id });
        return Array.isArray(employees) ? employees : [];
      } catch {
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
    retryDelay: 3000,
  });

  const employee = React.useMemo(
    () => {
      if (!allEmployees.length) return null;
      return allEmployees.find(e => e.workshop_id === workshopId) || allEmployees[0];
    },
    [allEmployees, workshopId]
  );

  const jobRoleLabels = {
    socio: "Sócio",
    diretor: "Diretor",
    supervisor_loja: "Supervisor",
    gerente: "Gerente",
    lider_tecnico: "Líder Técnico",
    financeiro: "Financeiro",
    rh: "RH",
    tecnico: "Técnico",
    funilaria_pintura: "Funilaria/Pintura",
    comercial: "Comercial",
    consultor_vendas: "Consultor",
    marketing: "Marketing",
    estoque: "Estoque",
    administrativo: "Administrativo",
    motoboy: "Motoboy",
    lavador: "Lavador",
    acelerador: "Acelerador",
    consultor: "Consultor",
    outros: "Outros"
  };

  const areaLabels = {
    vendas: "Vendas",
    comercial: "Comercial",
    marketing: "Marketing",
    tecnico: "Técnico",
    administrativo: "Administrativo",
    financeiro: "Financeiro",
    gerencia: "Gerência"
  };

  if (loading) {
    return (
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
          {!collapsed &&
          <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse mb-1" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
            </div>
          }
        </div>
      </div>);

  }

  return (
    <div className="border-t border-gray-200 px-4 py-1">
      <div className="flex items-center gap-3">
        <Avatar
          src={employee?.profile_picture_url}
          name={employee?.full_name || user?.full_name || user?.email?.split('@')[0] || 'Usuário'}
          size="md"
          className="border-2 border-blue-200"
        />
        {!collapsed &&
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {employee?.full_name || user?.full_name || user?.name || user?.email?.split('@')[0] || 'Usuário'}
              </p>
              {(user?.role === 'admin' || workshop?.owner_id === user?.id || employee?.is_partner || employee?.job_role === 'socio') &&
            <img
              src="https://media.base44.com/images/public/69540822472c4a70b54d47aa/111d039f9_coroa.png"
              alt="Admin"
              title={user?.role === 'admin' ? 'Administrador do sistema' : 'Dono de oficina'}
              className="w-3.5 h-3.5 object-contain flex-shrink-0" />

            }
            </div>
            <p className="text-xs text-gray-600 truncate">
              {employee ?
            <>
                  {jobRoleLabels[employee.job_role] || employee.position || 'Colaborador'}
                  {employee.area && ` - ${areaLabels[employee.area] || employee.area}`}
                </> :

            user?.role === 'admin' ? 'Administrador' : 'Usuário'
            }
            </p>
          </div>
        }
      </div>
    </div>);

}

export default function Sidebar({ user, unreadCount, isOpen, onClose }) {
  const location = useLocation();
  const { profile, currentRole, hasPermission, canAccessPage } = usePermissions();
  const { isInternal, isAcelerador, isAdmin } = useUserType();

  const { queryString } = useAssistanceMode();
  const { workshop: userWorkshop } = useWorkshopContext();
  const { getAdminUrl } = useAdminMode();

  const [expandedGroups, setExpandedGroups] = React.useState([]);
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    try {
      const saved = localStorage.getItem('sidebar-collapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    const handleExternalToggle = () => {
      try {
        setIsCollapsed(localStorage.getItem('sidebar-collapsed') === 'true');
      } catch {}
    };
    window.addEventListener('sidebar-toggle', handleExternalToggle);
    return () => window.removeEventListener('sidebar-toggle', handleExternalToggle);
  }, []);

  // Controle de acesso Admin Global (SPO)
  const [isGlobalContext, setIsGlobalContext] = React.useState(false);
  const GLOBAL_ADMIN_ID = '69540822472c4a70b54d47ab';

  // FIX-2: reusa a mesma queryKey ['sidebar-employee-all', user?.id] do
  // UserProfileSection — React Query dedupes, sem segunda leitura de Employee.
  const { data: sidebarAllEmployees = [] } = useQuery({
    queryKey: ['sidebar-employee-all', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const employees = await base44.entities.Employee.filter({ user_id: user.id });
        return Array.isArray(employees) ? employees : [];
      } catch {
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  });

  React.useEffect(() => {
    if (!user) return;
    // 0. FIX (2026-07-07): Admin da plataforma e equipe interna SEMPRE têm contexto global.
    const isImpersonated = user._isImpersonated === true;
    if (!isImpersonated && (user.role === 'admin' || user.user_type === 'internal' || user.is_internal === true || user.data?.is_internal === true)) {
      setIsGlobalContext(true);
      return;
    }
    // 1. Verificar ID direto (Owner Global)
    if (user.id === GLOBAL_ADMIN_ID) {
      setIsGlobalContext(true);
      return;
    }
    // 2. Verificar colaboradores do Admin Global (dados compartilhados da query)
    if (sidebarAllEmployees.length > 0) {
      const isGlobalEmployee = sidebarAllEmployees.some((emp) => emp.owner_id === GLOBAL_ADMIN_ID);
      if (isGlobalEmployee) setIsGlobalContext(true);
    }
  }, [user, sidebarAllEmployees]);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    try {
      localStorage.setItem('sidebar-collapsed', String(newState));
      window.dispatchEvent(new CustomEvent('sidebar-toggle'));
    } catch {






      // Ignora erro
    }};const toggleGroup = (groupId) => {setExpandedGroups((prev) => prev.includes(groupId) ? prev.filter((id) => id !== groupId) :
      [...prev, groupId]
    );
  };

  // Recolher todos os grupos quando a rota mudar (após clicar em um item)
  useEffect(() => {
    setExpandedGroups([]);
  }, [location.pathname]);

  // isAcelerador e isInternal agora vêm do useUserType() — fonte canônica user_type
  // Removido: effectiveRole === 'acelerador' || user?.role === 'admin' (padrão legado)

  const navigationGroups = getNavigationGroups(unreadCount);

  const isActive = (href) => {
    return location.pathname.toLowerCase() === href.toLowerCase();
  };

  const canAccessItem = (item) => {
    // Bloqueio Global: Se o item é exclusivo do Admin Global e o usuário não é, bloqueia
    if (item.globalAdminOnly && !isGlobalContext) return false;

    if (item.public) return true;
    if (!user) return false;

    // O Bypass de Admin foi removido daqui pois o canAccessPage já o implementa.
    // O bloqueio de Acelerador também foi removido. As abas de aceleração 
    // já são controladas pela permissão (acceleration.manage) via RBAC.

    // Sistema RBAC Granular: Centralizado na ÚNICA fonte de verdade (pagePermissions via canAccessPage)
    // Extrai o nome da página da URL (ex: "/GestaoOficina?..." -> "GestaoOficina")
    const pageKey = item.href ? item.href.split('?')[0].split('/').filter(Boolean).pop() : null;

    // O fallback hardcoded foi removido. Rotas híbridas (ex: Planos, Perfil) 
    // agora operam através do "public_authenticated" na pagePermissions.

    let result;
    let method;
    if (pageKey && pageKey !== '') {
      result = canAccessPage(pageKey);
      method = 'canAccessPage';
    } else if (item.requiredPermission) {
      result = hasPermission(item.requiredPermission);
      method = 'hasPermission_fallback';
    } else {
      result = true;
      method = 'no_permission_required';
    }

    return result;
  };

  return (
    <>
      {isOpen &&
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose} />

      }

      <aside
        className={cn(
          "fixed left-0 bg-white border-r border-gray-200 z-50 transition-all duration-300 flex flex-col print:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isCollapsed ? "w-16" : "w-64"
        )}
        style={{
          top: 'var(--imp-bar-height, 0px)',
          height: 'calc(100vh - var(--imp-bar-height, 0px))'
        }}>
        
        <div
          className={cn(
            "h-16 border-b border-gray-200 flex items-center transition-all",
            isCollapsed && "justify-center"
          )}>
          {isCollapsed ?
          <button
            onClick={toggleCollapse}
            className="hidden lg:flex mx-auto items-center justify-center p-2 hover:bg-gray-100 rounded-lg transition-colors w-full"
            title="Expandir menu">
            
              <Menu className="w-6 h-6 text-gray-700" />
            </button> :

          <div className="flex items-center justify-between gap-3 w-full">
              <Link to={getAdminUrl(createPageUrl('Home') + queryString)} className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                {userWorkshop?.logo_url ?
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-white border border-gray-200 flex items-center justify-center">
                    <img
                  src={userWorkshop.logo_url}
                  alt="Logo"
                  className="w-full h-full object-contain" />
                
                  </div> :

              <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--brand-primary))] to-[hsl(var(--brand-secondary))] opacity-90" />
                    <FileText className="w-6 h-6 text-black z-10 relative" />
                  </div>
              }
                <div>
                  <h2 className="font-bold text-gray-900 truncate max-w-[140px]" title={userWorkshop?.name || "Oficinas Master"}>
                    {userWorkshop?.name || "Oficinas Master"}
                  </h2>
                  <p className="text-xs text-gray-600">Sistema de Aceleração</p>
                </div>
              </Link>
              <button
              onClick={onClose}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              title="Fechar menu">
              
                <X className="w-6 h-6 text-gray-600" />
              </button>
              <button
              onClick={toggleCollapse}
              className="hidden lg:flex hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 py-2 px-1"
              title="Recolher menu">
              
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          }
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          {!isCollapsed &&
          <div className="space-y-2 mb-6">
              <Link
              to={getAdminUrl(createPageUrl('Home') + queryString)}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all group",
                isActive(createPageUrl('Home')) ?
                "bg-[#FF0000] text-white shadow-md" :
                "text-gray-600 hover:bg-[#FF0000] hover:text-white hover:shadow-md"
              )}>
              
                <Home className={cn("w-5 h-5 transition-colors", isActive(createPageUrl('Home')) ? "text-white" : "text-gray-500 group-hover:text-white")} />
                <span className="truncate">Início</span>
              </Link>
              <Link
              to={getAdminUrl(createPageUrl('MeuPerfil') + queryString)}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all group",
                isActive(createPageUrl('MeuPerfil')) ?
                "bg-[#FF0000] text-white shadow-md" :
                "text-gray-600 hover:bg-[#FF0000] hover:text-white hover:shadow-md"
              )}>
              
                <User className={cn("w-5 h-5 transition-colors", isActive(createPageUrl('MeuPerfil')) ? "text-white" : "text-gray-500 group-hover:text-white")} />
                <span className="truncate">Meu Perfil</span>
              </Link>
            </div>
          }

          {isCollapsed &&
          <div className="flex flex-col items-center gap-3 py-2">
              <Link
              to={getAdminUrl(createPageUrl('Home') + queryString)}
              onClick={onClose}
              className={cn(
                "p-3 rounded-xl transition-all group",
                isActive(createPageUrl('Home')) ?
                "bg-[#FF0000] text-white shadow-md" :
                "text-gray-500 hover:bg-[#FF0000] hover:text-white hover:shadow-md"
              )}
              title="Início">
              
                <Home className={cn("w-5 h-5 transition-colors", isActive(createPageUrl('Home')) ? "text-white" : "text-gray-500 group-hover:text-white")} />
              </Link>
              <Link
              to={getAdminUrl(createPageUrl('MeuPerfil') + queryString)}
              onClick={onClose}
              className={cn(
                "p-3 rounded-xl transition-all group",
                isActive(createPageUrl('MeuPerfil')) ?
                "bg-[#FF0000] text-white shadow-md" :
                "text-gray-500 hover:bg-[#FF0000] hover:text-white hover:shadow-md"
              )}
              title="Meu Perfil">
              
                <User className={cn("w-5 h-5 transition-colors", isActive(createPageUrl('MeuPerfil')) ? "text-white" : "text-gray-500 group-hover:text-white")} />
              </Link>
            </div>
          }

          <div className="space-y-6">
                    {navigationGroups.map((group) => {
              const visibleItems = group.items.filter(canAccessItem);
              if (visibleItems.length === 0) return null;

              const isExpanded = expandedGroups.includes(group.id);
              const GroupIcon = group.icon;

              return (
                <div key={group.id}>
                  {!isCollapsed ?
                  <>
                      <button
                      onClick={() => toggleGroup(group.id)}
                      className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-[#FF0000] hover:text-white hover:shadow-md transition-all group text-left">
                      
                        <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                          <GroupIcon className="w-5 h-5 shrink-0 text-gray-500 group-hover:text-white transition-colors" />
                          <span className="truncate leading-tight whitespace-normal">{group.label}</span>
                        </div>
                        {isExpanded ?
                      <ChevronDown className="w-4 h-4 shrink-0 text-gray-500 group-hover:text-white transition-colors" /> :

                      <ChevronRight className="w-4 h-4 shrink-0 text-gray-500 group-hover:text-white transition-colors" />
                      }
                      </button>

                      {isExpanded &&
                    <div className="space-y-1 mt-2">
                          {visibleItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);

                        return (
                          <Link
                            key={item.name}
                            to={getAdminUrl(item.href + queryString)}
                            onClick={onClose}
                            className={cn(
                              "flex items-center gap-3 pr-4 pl-10 py-3 rounded-xl transition-all group relative select-none",
                              active ?
                              "bg-[#FF0000] text-white font-medium shadow-md" :
                              "text-gray-600 hover:bg-[#FF0000] hover:text-white hover:shadow-md"
                            )}>
                            
                                <Icon className={cn(
                              "w-5 h-5 flex-shrink-0 transition-colors",
                              active ? "text-white" : "text-gray-500 group-hover:text-white"
                            )} />
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm truncate">{item.name}</span>
                                    {item.badge > 0 &&
                                <Badge className={cn("ml-2 h-5 min-w-5 px-1.5", active ? "bg-white text-[#FF0000]" : "bg-white text-[#FF0000]")}>
                                        {item.badge}
                                      </Badge>
                                }
                                  </div>
                                  {item.description && !active &&
                              <p className="text-xs text-gray-400 group-hover:text-red-100 transition-colors mt-0.5 truncate">
                                      {item.description}
                                    </p>
                              }
                                </div>
                              </Link>);

                      })}
                        </div>
                    }
                    </> :
                  null}
                </div>);

            })}
          </div>

          {!isCollapsed &&
          <div className="mt-6 px-3 py-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <p className="text-xs font-semibold text-blue-900 mb-1">💡 Dica</p>
              <p className="text-xs text-blue-700">
                Complete os diagnósticos para receber planos de ação personalizados!
              </p>
            </div>
          }

          {/* Item fixo: Escolha seu Plano - Apenas se tem workshop */}
          {userWorkshop &&
          <div className="mt-6 border-t border-gray-200 pt-4">
             <Link
              to={getAdminUrl(createPageUrl('Planos') + queryString)}
              onClick={() => {
                console.log("[NAV] Sidebar: clique em 'Escolha seu Plano' -> indo para Planos");
                onClose();
              }}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg transition-all",
                "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-md",
                isCollapsed && "justify-center"
              )}
              title={isCollapsed ? "Escolha seu Plano" : ""}>
              
               <Crown className="w-5 h-5" />
               {!isCollapsed &&
              <div className="flex-1">
                   <span className="text-sm font-semibold">Escolha seu Plano</span>
                   <p className="text-xs text-purple-100">Upgrade ou altere seu plano</p>
                 </div>
              }
             </Link>
           </div>
          }

          {/* Seletores de Contexto (Apenas Mobile) */}
          {!isCollapsed &&
          <div className="mt-4 border-t border-gray-200 pt-4 lg:hidden">
              <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Localizar
              </p>
              <div className="px-3">
                <TenantSelector isMobileSidebar={true} />
              </div>
            </div>
          }
        </nav>

        {user && <UserProfileSection user={user} collapsed={isCollapsed} workshop={userWorkshop} />}
      </aside>
    </>);

}