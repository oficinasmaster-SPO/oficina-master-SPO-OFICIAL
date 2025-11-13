import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronRight, Home } from "lucide-react";

export default function Breadcrumbs() {
  const location = useLocation();
  
  const getBreadcrumbs = () => {
    const path = location.pathname;
    const params = new URLSearchParams(location.search);
    
    // Mapeamento de rotas para breadcrumbs
    const routeMap = {
      '/': [{ label: 'Início', href: createPageUrl('Home') }],
      '/home': [{ label: 'Início', href: createPageUrl('Home') }],
      '/cadastro': [
        { label: 'Início', href: createPageUrl('Home') },
        { label: 'Cadastro da Oficina', href: null }
      ],
      '/questionario': [
        { label: 'Início', href: createPageUrl('Home') },
        { label: 'Questionário', href: createPageUrl('Questionario') }
      ],
      '/resultado': [
        { label: 'Início', href: createPageUrl('Home') },
        { label: 'Resultado do Diagnóstico', href: null }
      ],
      '/planoacao': [
        { label: 'Início', href: createPageUrl('Home') },
        { label: 'Resultado', href: params.get('id') ? createPageUrl('Resultado') + `?id=${params.get('id')}` : null },
        { label: 'Plano de Ação', href: null }
      ],
      '/historico': [
        { label: 'Início', href: createPageUrl('Home') },
        { label: 'Histórico', href: createPageUrl('Historico') }
      ],
      '/notificacoes': [
        { label: 'Início', href: createPageUrl('Home') },
        { label: 'Notificações', href: createPageUrl('Notificacoes') }
      ],
      '/dashboard': [
        { label: 'Início', href: createPageUrl('Home') },
        { label: 'Dashboard Consultoria', href: createPageUrl('Dashboard') }
      ]
    };

    const normalizedPath = path.toLowerCase();
    return routeMap[normalizedPath] || [{ label: 'Início', href: createPageUrl('Home') }];
  };

  const breadcrumbs = getBreadcrumbs();

  // Não mostrar breadcrumbs na home
  if (location.pathname === '/' || location.pathname.toLowerCase() === '/home') {
    return null;
  }

  return (
    <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6 flex-wrap print:hidden">
      <Link 
        to={createPageUrl('Home')}
        className="flex items-center gap-1 hover:text-blue-600 transition-colors"
      >
        <Home className="w-4 h-4" />
      </Link>
      
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          {crumb.href ? (
            <Link 
              to={crumb.href}
              className="hover:text-blue-600 transition-colors"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium">
              {crumb.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}