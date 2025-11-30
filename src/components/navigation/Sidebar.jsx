import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, FileText, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMenusForRole, getAdminMenus } from "@/utils/roleNavigation";

export default function Sidebar({ user, employeeRecord, unreadCount, isOpen, onClose }) {
  const location = useLocation();
  // Iniciar com o primeiro grupo expandido por padrão
  const [expandedGroups, setExpandedGroups] = React.useState(['Dashboard & KPIs', 'Administração']);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  // Determinar menus baseados no papel
  const menus = React.useMemo(() => {
    let roleMenus = [];
    
    // 1. Menus Administrativos Globais (Admin/Consultoria)
    if (user?.role === 'admin' || user?.platform_role === 'consultoria_owner') {
        roleMenus = [...roleMenus, ...getAdminMenus()];
    }

    // 2. Menus da Oficina (Baseado no Employee Record)
    if (employeeRecord) {
        const employeeMenus = getMenusForRole(employeeRecord.workshop_role, employeeRecord.is_partner);
        roleMenus = [...roleMenus, ...employeeMenus];
    } else if (user?.role === 'user' && !employeeRecord) {
        // Fallback: Se for usuário mas não tiver employee record (ex: acabou de criar conta e é dono)
        // Assume-se 'diretor' para o dono inicial até que se crie o employee record formalmente
        roleMenus = [...roleMenus, ...getMenusForRole('diretor', true)];
    }

    return roleMenus;
  }, [user, employeeRecord]);

  const isActive = (href) => {
    return location.pathname.toLowerCase() === href.toLowerCase();
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside 
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 transition-transform duration-300 flex flex-col print:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-6 border-b border-gray-200">
          <Link to={createPageUrl('Home')} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Oficinas Master</h2>
              <p className="text-xs text-gray-600">
                {employeeRecord?.workshop_role 
                    ? <span className="capitalize">{employeeRecord.workshop_role.replace('_', ' ')}</span> 
                    : 'Sistema de Aceleração'}
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-6">
            {menus.map((group, idx) => {
              const groupId = group.group;
              const isExpanded = expandedGroups.includes(groupId);
              
              return (
                <div key={`${groupId}-${idx}`}>
                  <button
                    onClick={() => toggleGroup(groupId)}
                    className="flex items-center justify-between w-full px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                  >
                    <span>{group.group}</span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="space-y-1 mt-2">
                      {group.items.map((item, itemIdx) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        const badgeCount = item.name === 'Notificações' ? unreadCount : 0;

                        return (
                          <Link
                            key={`${item.name}-${itemIdx}`}
                            to={item.href}
                            onClick={onClose}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative select-none",
                              active 
                                ? "bg-blue-50 text-blue-700 font-medium" 
                                : "text-gray-700 hover:bg-gray-100 active:bg-gray-200"
                            )}
                          >
                            <Icon className={cn(
                              "w-5 h-5 flex-shrink-0",
                              active ? "text-blue-600" : "text-gray-500 group-hover:text-gray-700"
                            )} />
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-sm truncate">{item.name}</span>
                                {badgeCount > 0 && (
                                  <Badge className="bg-red-500 text-white ml-2 h-5 min-w-5 px-1.5">
                                    {badgeCount}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {active && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r" />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Item fixo: Escolha seu Plano (apenas se for diretor ou sem papel definido) */}
          {(!employeeRecord || employeeRecord.is_partner || employeeRecord.workshop_role === 'diretor') && (
             <div className="mt-6 border-t border-gray-200 pt-4">
                <Link
                  to={createPageUrl('CadastroPlanos')}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg transition-all",
                    "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-md"
                  )}
                >
                  <Crown className="w-5 h-5" />
                  <div className="flex-1">
                    <span className="text-sm font-semibold">Escolha seu Plano</span>
                    <p className="text-xs text-purple-100">Upgrade ou altere seu plano</p>
                  </div>
                </Link>
              </div>
          )}
        </nav>
      </aside>
    </>
  );
}