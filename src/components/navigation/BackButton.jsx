import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigationHistory } from "@/components/hooks/useNavigationHistory";

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

const getPageNameFromPath = (pathname) => {
  const pageName = pathname.replace('/', '').split('?')[0];
  return PAGE_NAMES[pageName] || pageName || 'Página';
};

export default function BackButton({ className = "" }) {
  const { goBack, currentPath } = useNavigationHistory();

  // Não mostrar na Home
  if (!currentPath || currentPath === '/' || currentPath === '/Home') {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={goBack}
      className={`text-gray-600 hover:text-gray-900 hover:bg-gray-100 gap-2 mb-4 ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      Voltar
    </Button>
  );
}