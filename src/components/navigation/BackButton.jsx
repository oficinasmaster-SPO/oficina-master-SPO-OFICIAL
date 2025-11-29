import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { createPageUrl } from "@/utils";

// Mapeamento de URLs para nomes amigáveis das páginas
const PAGE_NAMES = {
  'Home': 'Início',
  'Dashboard': 'Dashboard',
  'Tarefas': 'Tarefas',
  'GestaoMetas': 'Metas',
  'PainelMetas': 'Painel de Metas',
  'DRETCMP2': 'DRE/TCMP²',
  'DiagnosticoOS': 'Diagnóstico O.S.',
  'Colaboradores': 'Colaboradores',
  'DetalhesColaborador': 'Detalhes do Colaborador',
  'CadastroColaborador': 'Cadastro de Colaborador',
  'ConvidarColaborador': 'Convidar Colaborador',
  'GestaoOficina': 'Gestão da Oficina',
  'Cadastro': 'Cadastro da Oficina',
  'Questionario': 'Diagnóstico',
  'Resultado': 'Resultado',
  'PlanoAcao': 'Plano de Ação',
  'Gamificacao': 'Gamificação',
  'IAAnalytics': 'IA Analytics',
  'Notificacoes': 'Notificações',
  'CulturaOrganizacional': 'Cultura',
  'TreinamentoVendas': 'Treinamento',
  'DiagnosticoMaturidade': 'Maturidade',
  'DiagnosticoProducao': 'Produtividade',
  'DiagnosticoDesempenho': 'Desempenho',
  'DiagnosticoDISC': 'DISC',
  'DiagnosticoCarga': 'Carga de Trabalho',
  'DiagnosticoEmpresario': 'Perfil Empresário',
  'DiagnosticoComercial': 'Comercial',
  'DiagnosticoGerencial': 'Gerencial',
  'Clientes': 'Clientes',
  'MissaoVisaoValores': 'Missão/Visão/Valores',
  'DescricoesCargo': 'Descrições de Cargo',
  'Rituais': 'Rituais',
  'RituaisAculturamento': 'Aculturamento',
  'PesquisaClima': 'Pesquisa de Clima',
  'CDCList': 'CDC',
  'COEXList': 'COEX',
  'PortalColaborador': 'Portal do Colaborador',
  'MeuPlano': 'Meu Plano',
  'Planos': 'Planos',
  'HistoricoMetas': 'Histórico de Metas',
  'Historico': 'Histórico',
  'AdminClientes': 'Admin Clientes',
  'MonitoramentoRH': 'Monitoramento RH',
  'RankingBrasil': 'Ranking Brasil',
};

// Chave para armazenar histórico no sessionStorage
const HISTORY_KEY = 'app_navigation_history';
const MAX_HISTORY = 20;

// Função para obter o nome da página a partir do pathname
const getPageNameFromPath = (pathname) => {
  const pageName = pathname.replace('/', '').split('?')[0];
  return PAGE_NAMES[pageName] || pageName || 'Página';
};

// Função para obter o histórico
const getHistory = () => {
  try {
    const history = sessionStorage.getItem(HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
};

// Função para adicionar ao histórico
const addToHistory = (path) => {
  try {
    let history = getHistory();
    // Não adicionar duplicatas consecutivas
    if (history.length > 0 && history[history.length - 1] === path) {
      return;
    }
    history.push(path);
    // Limitar tamanho do histórico
    if (history.length > MAX_HISTORY) {
      history = history.slice(-MAX_HISTORY);
    }
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Ignora erros de storage
  }
};

// Função para obter a página anterior
const getPreviousPage = () => {
  const history = getHistory();
  if (history.length < 2) return null;
  return history[history.length - 2];
};

// Função para voltar no histórico
const goBack = () => {
  try {
    let history = getHistory();
    if (history.length > 1) {
      history.pop(); // Remove página atual
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
  } catch {
    // Ignora erros
  }
};

export default function BackButton({ className = "" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [previousPage, setPreviousPage] = useState(null);

  useEffect(() => {
    // Registrar página atual no histórico
    addToHistory(location.pathname);
    
    // Atualizar página anterior
    const prev = getPreviousPage();
    setPreviousPage(prev);
  }, [location.pathname]);

  const handleBack = () => {
    if (previousPage) {
      goBack();
      navigate(previousPage);
    } else {
      navigate(createPageUrl('Home'));
    }
  };

  // Não mostrar se não há página anterior ou se estamos na Home
  if (!previousPage || location.pathname === '/' || location.pathname === '/Home') {
    return null;
  }

  const previousPageName = getPageNameFromPath(previousPage);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={`text-gray-600 hover:text-gray-900 hover:bg-gray-100 gap-2 mb-4 ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      <span className="hidden sm:inline">Voltar para {previousPageName}</span>
      <span className="sm:hidden">Voltar</span>
    </Button>
  );
}

// Hook para uso programático
export function useNavigationHistory() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    addToHistory(location.pathname);
  }, [location.pathname]);

  return {
    goBack: () => {
      const prev = getPreviousPage();
      if (prev) {
        goBack();
        navigate(prev);
      } else {
        navigate(createPageUrl('Home'));
      }
    },
    previousPage: getPreviousPage(),
    previousPageName: getPreviousPage() ? getPageNameFromPath(getPreviousPage()) : null,
    hasPreviousPage: !!getPreviousPage() && location.pathname !== '/' && location.pathname !== '/Home',
  };
}