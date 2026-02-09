import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

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

const TECHNICAL_ROUTES = [
  'AssistirAula',
  'AssistirCurso',
  'VisualizarProcesso'
];

const HISTORY_KEY = 'navigationHistoryStack';
const MAX_HISTORY = 50;

const getHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveHistory = (history) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-MAX_HISTORY)));
  } catch (e) {
    console.error('Erro ao salvar histórico:', e);
  }
};

export const useNavigationHistory = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Captura a rota completa COM query params e hash
    const currentPath = location.pathname + location.search + location.hash;

    const shouldIgnore = IGNORED_ROUTES.some(route =>
      location.pathname.toLowerCase().includes(route.toLowerCase())
    ) || TECHNICAL_ROUTES.some(route =>
      location.pathname.includes(route)
    );

    if (shouldIgnore) {
      return;
    }

    let history = getHistory();
    
    // Se a última rota é diferente, adiciona a atual (com query params preservados)
    if (history.length === 0 || history[history.length - 1] !== currentPath) {
      history.push(currentPath);
      saveHistory(history);
    }
  }, [location.pathname, location.search, location.hash]);

  const goBack = () => {
    let history = getHistory();
    
    if (history.length > 1) {
      history.pop(); // Remove rota atual
      const previousRoute = history[history.length - 1];
      saveHistory(history);
      // previousRoute já contém query params se houver
      navigate(previousRoute);
    } else {
      navigate(createPageUrl('Home'));
    }
  };

  return {
    goBack,
    currentPath: location.pathname
  };
};

export const clearNavigationHistory = () => {
  localStorage.removeItem(HISTORY_KEY);
};