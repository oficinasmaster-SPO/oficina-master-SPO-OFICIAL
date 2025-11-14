import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  FileText, 
  History, 
  Bell, 
  BarChart3, 
  User,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar({ user, unreadCount, isOpen, onClose }) {
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = React.useState(['main']);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const navigationGroups = [
    {
      id: 'main',
      label: 'Principal',
      items: [
        { 
          name: 'Início', 
          href: createPageUrl('Home'), 
          icon: Home, 
          public: true,
          description: 'Página inicial'
        },
        { 
          name: 'Fazer Diagnóstico', 
          href: createPageUrl('Questionario'), 
          icon: FileText, 
          public: true,
          description: 'Responder questionário',
          highlight: true
        }
      ]
    },
    {
      id: 'management',
      label: 'Gestão',
      items: [
        { 
          id: 'sidebar-historico',
          name: 'Histórico', 
          href: createPageUrl('Historico'), 
          icon: History, 
          public: false,
          description: 'Meus diagnósticos'
        },
        { 
          id: 'sidebar-notificacoes',
          name: 'Notificações', 
          href: createPageUrl('Notificacoes'), 
          icon: Bell, 
          public: false, 
          badge: unreadCount,
          description: 'Alertas e prazos'
        }
      ]
    },
    {
      id: 'reports',
      label: 'Relatórios',
      items: [
        { 
          name: 'Dashboard Consultoria', 
          href: createPageUrl('Dashboard'), 
          icon: BarChart3, 
          public: false, 
          adminOnly: true,
          description: 'Métricas e análises'
        }
      ]
    }
  ];

  const isActive = (href) => {
    return location.pathname.toLowerCase() === href.toLowerCase();
  };

  const canAccessItem = (item) => {
    if (item.public) return true;
    if (!user) return false;
    if (item.adminOnly && user.role !== 'admin' && user.role !== 'user') return false;
    return true;
  };

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside 
        id="sidebar-navigation"
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 transition-transform duration-300 flex flex-col print:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header da Sidebar */}
        <div className="p-6 border-b border-gray-200">
          <Link to={createPageUrl('Home')} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Oficinas Master</h2>
              <p className="text-xs text-gray-600">Diagnóstico</p>
            </div>
          </Link>
        </div>

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-6">
            {navigationGroups.map((group) => {
              const visibleItems = group.items.filter(canAccessItem);
              if (visibleItems.length === 0) return null;

              const isExpanded = expandedGroups.includes(group.id);

              return (
                <div key={group.id}>
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="flex items-center justify-between w-full px-2 py-1 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                  >
                    <span>{group.label}</span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="space-y-1">
                      {visibleItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);

                        return (
                          <Link
                            key={item.name}
                            id={item.id}
                            to={item.href}
                            onClick={onClose}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative",
                              active 
                                ? "bg-blue-50 text-blue-700 font-medium" 
                                : "text-gray-700 hover:bg-gray-100",
                              item.highlight && !active && "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200"
                            )}
                          >
                            <Icon className={cn(
                              "w-5 h-5 flex-shrink-0",
                              active ? "text-blue-600" : "text-gray-500 group-hover:text-gray-700"
                            )} />
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-sm truncate">{item.name}</span>
                                {item.badge > 0 && (
                                  <Badge className="bg-red-500 text-white ml-2 h-5 min-w-5 px-1.5">
                                    {item.badge}
                                  </Badge>
                                )}
                              </div>
                              {item.description && !active && (
                                <p className="text-xs text-gray-500 mt-0.5 truncate">
                                  {item.description}
                                </p>
                              )}
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
        </nav>

        {/* User Info */}
        {user && (
          <div id="user-profile" className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.full_name || user.email}
                </p>
                <p className="text-xs text-gray-600 capitalize">
                  {user.role === 'admin' ? 'Administrador' : user.role === 'user' ? 'Consultor' : 'Usuário'}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}