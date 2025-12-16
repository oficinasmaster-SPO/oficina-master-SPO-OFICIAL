import { createPageUrl } from "@/utils";

/**
 * Mapeia códigos de processos/programas para URLs de navegação
 * Permite navegação direta do cronograma para as telas de execução
 */
export const getNavigationForItem = (item, workshop) => {
  if (!item || !item.item_nome) return null;

  const codigo = item.item_id || item.item_nome.toLowerCase();
  const tipo = item.item_tipo;

  // Mapeamento de diagnósticos
  const diagnosticosMap = {
    'diagnostico_empresario': {
      url: createPageUrl('DiagnosticoEmpresario'),
      label: '📊 Iniciar Diagnóstico do Empresário',
      description: 'Responda o diagnóstico para identificar seu perfil'
    },
    'diagnostico_maturidade': {
      url: createPageUrl('DiagnosticoMaturidade'),
      label: '📊 Iniciar Diagnóstico de Maturidade',
      description: 'Avalie a maturidade da equipe'
    },
    'diagnostico_producao': {
      url: createPageUrl('DiagnosticoProducao'),
      label: '📊 Iniciar Diagnóstico de Produção',
      description: 'Analise a produtividade do time técnico'
    },
    'diagnostico_gerencial': {
      url: createPageUrl('DiagnosticoGerencial'),
      label: '📊 Iniciar Diagnóstico Gerencial',
      description: 'Avalie práticas de gestão'
    },
    'diagnostico_comercial': {
      url: createPageUrl('DiagnosticoComercial'),
      label: '📊 Iniciar Diagnóstico Comercial',
      description: 'Analise processos comerciais'
    }
  };

  // Mapeamento de ferramentas e funcionalidades
  const ferramentasMap = {
    'desdobramento_meta': {
      url: createPageUrl('DesdobramentoMeta'),
      label: '🎯 Acessar Desdobramento de Metas',
      description: 'Configure e acompanhe metas da oficina'
    },
    'dre_tcmp2': {
      url: createPageUrl('DRETCMP2'),
      label: '💰 Acessar DRE/TCMP2',
      description: 'Controle financeiro e custos'
    },
    'qgp_board': {
      url: createPageUrl('QGPBoard'),
      label: '📋 Acessar QGP Board',
      description: 'Quadro de gestão de produtividade'
    },
    'cultura_organizacional': {
      url: createPageUrl('CulturaOrganizacional'),
      label: '🏛️ Acessar Cultura Organizacional',
      description: 'Defina missão, visão e valores'
    },
    'descricoes_cargo': {
      url: createPageUrl('DescricoesCargo'),
      label: '📄 Acessar Descrições de Cargo',
      description: 'Cadastre e gerencie cargos'
    },
    'colaboradores': {
      url: createPageUrl('Colaboradores'),
      label: '👥 Acessar Colaboradores',
      description: 'Gerencie equipe e dados'
    },
    'treinamentos': {
      url: createPageUrl('GerenciarTreinamentos'),
      label: '🎓 Acessar Treinamentos',
      description: 'Configure módulos de capacitação'
    },
    'processos': {
      url: createPageUrl('GerenciarProcessos'),
      label: '⚙️ Acessar Processos',
      description: 'Documente processos operacionais'
    },
    'rituais': {
      url: createPageUrl('RituaisAculturamento'),
      label: '🔄 Acessar Rituais',
      description: 'Configure rotinas de aculturamento'
    },
    'pesquisa_clima': {
      url: createPageUrl('PesquisaClima'),
      label: '🌡️ Acessar Pesquisa de Clima',
      description: 'Avalie satisfação da equipe'
    },
    'gamificacao': {
      url: createPageUrl('Gamificacao'),
      label: '🎮 Acessar Gamificação',
      label: 'Sistema de desafios e recompensas'
    },
    'plano_acao': {
      url: createPageUrl('PainelAcoes'),
      label: '📋 Acessar Plano de Ação',
      description: 'Execute ações estratégicas'
    }
  };

  // Buscar match exato ou por similaridade
  const searchKey = Object.keys({ ...diagnosticosMap, ...ferramentasMap }).find(key => {
    return codigo.includes(key) || item.item_nome.toLowerCase().includes(key);
  });

  if (searchKey) {
    return diagnosticosMap[searchKey] || ferramentasMap[searchKey];
  }

  // Fallback baseado no tipo
  if (tipo === 'diagnostico') {
    return {
      url: createPageUrl('SelecionarDiagnostico'),
      label: '📊 Acessar Diagnósticos',
      description: 'Escolha o diagnóstico a realizar'
    };
  }

  if (tipo === 'processo') {
    return {
      url: createPageUrl('GerenciarProcessos'),
      label: '⚙️ Acessar Processos',
      description: 'Gerencie processos operacionais'
    };
  }

  if (tipo === 'ferramenta') {
    return {
      url: createPageUrl('Dashboard'),
      label: '🏠 Acessar Dashboard',
      description: 'Painel principal do sistema'
    };
  }

  return null;
};

/**
 * Retorna cor de indicador baseado no status
 */
export const getStatusIndicatorColor = (status) => {
  const colors = {
    'a_fazer': 'text-gray-400',
    'em_andamento': 'text-blue-600',
    'concluido': 'text-green-600'
  };
  return colors[status] || 'text-gray-400';
};