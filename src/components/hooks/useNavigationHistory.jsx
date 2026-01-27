import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Rotas que nunca devem ser salvas como "última visitada"
const IGNORED_ROUTES = [
  '/login',
  '/signup',
  '/PrimeiroAcesso',
  '/primeiroaçesso',
  '/primeiroacesso',
  '/ClientRegistration',
  '/CadastroSucesso',
  '/error',
  '/404',
  '/unauthorized'
];

// Rotas técnicas que não contam como "visitadas reais"
const TECHNICAL_ROUTES = [
  'AssistirAula',
  'AssistirCurso',
  'VisualizarProcesso'
];

export const useNavigationHistory = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Registrar rota atual no histórico
  useEffect(() => {
    const currentPath = location.pathname;

    // Verificar se é uma rota que deve ser ignorada
    const shouldIgnore = IGNORED_ROUTES.some(route =>
      currentPath.toLowerCase().includes(route.toLowerCase())
    ) || TECHNICAL_ROUTES.some(route =>
      currentPath.includes(route)
    );

    if (shouldIgnore) {
      return; // Não registra
    }

    // Obter última rota salva
    const lastRoute = localStorage.getItem('lastVisitedRoute');

    // Não salvar a mesma rota duas vezes
    if (lastRoute === currentPath) {
      return;
    }

    // Salvar rota atual como "última visitada"
    const navigationData = {
      route: currentPath,
      timestamp: new Date().toISOString(),
      search: location.search || ''
    };

    localStorage.setItem('lastVisitedRoute', currentPath);
    localStorage.setItem('lastVisitedRouteData', JSON.stringify(navigationData));
  }, [location.pathname, location.search]);

  // Voltar para última rota
  const goBack = () => {
    const lastRoute = localStorage.getItem('lastVisitedRoute');

    if (lastRoute && !IGNORED_ROUTES.some(route => 
      lastRoute.toLowerCase().includes(route.toLowerCase())
    )) {
      navigate(lastRoute);
    } else {
      // Fallback seguro: ir para página inicial
      navigate(createPageUrl('Home'));
    }
  };

  // Obter informações da última rota
  const getLastRoute = () => {
    try {
      const data = localStorage.getItem('lastVisitedRouteData');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  };

  return {
    goBack,
    getLastRoute,
    currentPath: location.pathname
  };
};

// Função helper para limpar histórico (útil em logout)
export const clearNavigationHistory = () => {
  localStorage.removeItem('lastVisitedRoute');
  localStorage.removeItem('lastVisitedRouteData');
};