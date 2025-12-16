import { createPageUrl } from "@/utils";

/**
 * MATRIZ COMPLETA DE NAVEGAÇÃO - CRONOGRAMA
 * Mapeia todos os tipos de conteúdo para suas telas correspondentes
 * Atualizar esta matriz quando novos módulos forem adicionados
 */

const NAVIGATION_MATRIX = {
  // === DIAGNÓSTICOS ===
  diagnosticos: {
    'diagnostico_empresario': {
      url: 'DiagnosticoEmpresario',
      label: '📊 Diagnóstico do Empresário',
      description: 'Identifique seu perfil empreendedor',
      keywords: ['empresario', 'perfil', 'aventureiro', 'empreendedor', 'gestor']
    },
    'diagnostico_maturidade': {
      url: 'DiagnosticoMaturidade',
      label: '📊 Diagnóstico de Maturidade',
      description: 'Avalie maturidade da equipe',
      keywords: ['maturidade', 'colaborador', 'equipe']
    },
    'diagnostico_producao': {
      url: 'DiagnosticoProducao',
      label: '📊 Diagnóstico de Produtividade',
      description: 'Analise produtividade técnica',
      keywords: ['producao', 'produtividade', 'tecnico']
    },
    'diagnostico_desempenho': {
      url: 'DiagnosticoDesempenho',
      label: '📊 Diagnóstico de Desempenho',
      description: 'Avalie performance individual',
      keywords: ['desempenho', 'performance', 'matriz']
    },
    'diagnostico_gerencial': {
      url: 'DiagnosticoGerencial',
      label: '📊 Diagnóstico Gerencial',
      description: 'Avalie práticas de gestão',
      keywords: ['gerencial', 'gestao', 'lideranca']
    },
    'diagnostico_comercial': {
      url: 'DiagnosticoComercial',
      label: '📊 Diagnóstico Comercial',
      description: 'Analise processos de vendas',
      keywords: ['comercial', 'vendas', 'atendimento']
    },
    'diagnostico_os': {
      url: 'DiagnosticoOS',
      label: '📊 Diagnóstico de OS',
      description: 'Avalie processo de ordem de serviço',
      keywords: ['os', 'ordem', 'servico']
    },
    'diagnostico_disc': {
      url: 'DiagnosticoDISC',
      label: '📊 Diagnóstico DISC',
      description: 'Teste de perfil comportamental',
      keywords: ['disc', 'comportamental', 'perfil']
    },
    'diagnostico_endividamento': {
      url: 'DiagnosticoEndividamento',
      label: '📊 Diagnóstico de Endividamento',
      description: 'Analise saúde financeira',
      keywords: ['endividamento', 'divida', 'financeiro']
    },
    'diagnostico_carga': {
      url: 'DiagnosticoCarga',
      label: '📊 Diagnóstico de Carga de Trabalho',
      description: 'Avalie capacidade de trabalho',
      keywords: ['carga', 'trabalho', 'capacidade']
    }
  },

  // === FERRAMENTAS DE GESTÃO ===
  ferramentas: {
    'desdobramento_meta': {
      url: 'DesdobramentoMeta',
      label: '🎯 Desdobramento de Metas',
      description: 'Configure metas estratégicas',
      keywords: ['meta', 'objetivo', 'target', 'desdobramento']
    },
    'dre_tcmp2': {
      url: 'DRETCMP2',
      label: '💰 DRE / TCMP2',
      description: 'Demonstrativo e custos',
      keywords: ['dre', 'tcmp2', 'financeiro', 'custo']
    },
    'qgp': {
      url: 'QGPBoard',
      label: '📋 QGP Board',
      description: 'Quadro de produtividade',
      keywords: ['qgp', 'quadro', 'produtividade']
    },
    'plano_acao': {
      url: 'PainelAcoes',
      label: '📋 Plano de Ação',
      description: 'Execute ações do plano',
      keywords: ['plano', 'acao', 'tarefa']
    },
    'tarefas': {
      url: 'Tarefas',
      label: '✅ Tarefas',
      description: 'Gerencie tarefas diárias',
      keywords: ['tarefa', 'task', 'atividade']
    }
  },

  // === GESTÃO DE PESSOAS ===
  pessoas: {
    'colaboradores': {
      url: 'Colaboradores',
      label: '👥 Colaboradores',
      description: 'Gerencie equipe',
      keywords: ['colaborador', 'funcionario', 'equipe', 'time']
    },
    'descricoes_cargo': {
      url: 'DescricoesCargo',
      label: '📄 Descrições de Cargo',
      description: 'Defina cargos e funções',
      keywords: ['cargo', 'funcao', 'descricao']
    },
    'cultura_organizacional': {
      url: 'CulturaOrganizacional',
      label: '🏛️ Cultura Organizacional',
      description: 'Missão, visão e valores',
      keywords: ['cultura', 'missao', 'visao', 'valores']
    },
    'pesquisa_clima': {
      url: 'PesquisaClima',
      label: '🌡️ Pesquisa de Clima',
      description: 'Avalie clima organizacional',
      keywords: ['clima', 'satisfacao', 'pesquisa']
    },
    'rituais': {
      url: 'RituaisAculturamento',
      label: '🔄 Rituais',
      description: 'Rotinas de aculturamento',
      keywords: ['ritual', 'rotina', 'aculturamento']
    }
  },

  // === TREINAMENTO E DESENVOLVIMENTO ===
  treinamento: {
    'treinamentos': {
      url: 'GerenciarTreinamentos',
      label: '🎓 Treinamentos',
      description: 'Gerencie cursos e módulos',
      keywords: ['treinamento', 'curso', 'capacitacao', 'aula']
    },
    'academia': {
      url: 'AcademiaTreinamento',
      label: '🎓 Academia de Treinamento',
      description: 'Acesse cursos disponíveis',
      keywords: ['academia', 'learning']
    },
    'acompanhamento_treinamento': {
      url: 'AcompanhamentoTreinamento',
      label: '📈 Acompanhamento',
      description: 'Monitore progresso de treinamentos',
      keywords: ['acompanhamento', 'progresso', 'evolucao']
    }
  },

  // === PROCESSOS E DOCUMENTOS ===
  processos: {
    'processos': {
      url: 'GerenciarProcessos',
      label: '⚙️ Processos',
      description: 'Documente processos operacionais',
      keywords: ['processo', 'procedimento', 'fluxo']
    },
    'documentos': {
      url: 'RepositorioDocumentos',
      label: '📁 Documentos',
      description: 'Repositório de documentos',
      keywords: ['documento', 'arquivo', 'repositorio']
    },
    'manual_empresa': {
      url: 'CulturaOrganizacional',
      label: '📖 Manual da Empresa',
      description: 'Manual organizacional',
      keywords: ['manual', 'empresa']
    },
    'cdc': {
      url: 'CDCList',
      label: '📋 CDC - Contratos',
      description: 'Contratos de desempenho',
      keywords: ['cdc', 'contrato', 'desempenho']
    },
    'coex': {
      url: 'COEXList',
      label: '📋 COEX - Contratos',
      description: 'Contratos de experiência',
      keywords: ['coex', 'experiencia', 'contrato']
    }
  },

  // === GESTÃO E RESULTADOS ===
  gestao: {
    'dashboard': {
      url: 'Dashboard',
      label: '📊 Dashboard',
      description: 'Painel principal',
      keywords: ['dashboard', 'painel', 'visao_geral']
    },
    'gestao_oficina': {
      url: 'GestaoOficina',
      label: '🏢 Gestão da Oficina',
      description: 'Dados e configurações',
      keywords: ['gestao', 'oficina', 'cadastro']
    },
    'clientes': {
      url: 'Clientes',
      label: '👤 Clientes',
      description: 'Gestão de clientes',
      keywords: ['cliente', 'customer']
    },
    'historico': {
      url: 'Historico',
      label: '📜 Histórico',
      description: 'Histórico de diagnósticos',
      keywords: ['historico', 'history']
    },
    'ia_analytics': {
      url: 'IAAnalytics',
      label: '🤖 IA Analytics',
      description: 'Análises preditivas',
      keywords: ['ia', 'analytics', 'previsao']
    }
  },

  // === GAMIFICAÇÃO E ENGAJAMENTO ===
  engajamento: {
    'gamificacao': {
      url: 'Gamificacao',
      label: '🎮 Gamificação',
      description: 'Desafios e recompensas',
      keywords: ['gamificacao', 'desafio', 'recompensa']
    },
    'ranking': {
      url: 'RankingBrasil',
      label: '🏆 Ranking',
      description: 'Ranking nacional',
      keywords: ['ranking', 'classificacao']
    }
  }
};

/**
 * Busca navegação por múltiplos critérios
 */
const findNavigationMatch = (item) => {
  const searchText = (item.item_nome || '').toLowerCase();
  const searchId = (item.item_id || '').toLowerCase();
  const searchTipo = (item.item_tipo || '').toLowerCase();

  // Buscar em todas as categorias
  for (const category of Object.values(NAVIGATION_MATRIX)) {
    for (const [key, config] of Object.entries(category)) {
      // Match exato por chave
      if (searchId === key || searchText.includes(key)) {
        return config;
      }

      // Match por keywords
      if (config.keywords?.some(kw => 
        searchText.includes(kw) || searchId.includes(kw)
      )) {
        return config;
      }
    }
  }

  return null;
};

/**
 * Função principal de mapeamento
 */
export const getNavigationForItem = (item, workshop) => {
  if (!item || !item.item_nome) return null;

  try {
    // Buscar match na matriz
    const match = findNavigationMatch(item);
    
    if (match) {
      return {
        ...match,
        url: createPageUrl(match.url)
      };
    }

    // Fallback baseado no tipo
    const tipo = (item.item_tipo || '').toLowerCase();
    
    if (tipo.includes('diagnostico')) {
      return {
        url: createPageUrl('SelecionarDiagnostico'),
        label: '📊 Selecionar Diagnóstico',
        description: 'Escolha o diagnóstico adequado',
        isFallback: true
      };
    }

    if (tipo.includes('treinamento') || tipo.includes('aula') || tipo.includes('curso')) {
      return {
        url: createPageUrl('AcademiaTreinamento'),
        label: '🎓 Academia de Treinamento',
        description: 'Acesse conteúdos de capacitação',
        isFallback: true
      };
    }

    if (tipo.includes('processo')) {
      return {
        url: createPageUrl('GerenciarProcessos'),
        label: '⚙️ Processos',
        description: 'Acesse processos documentados',
        isFallback: true
      };
    }

    if (tipo.includes('ferramenta') || tipo.includes('modulo')) {
      return {
        url: createPageUrl('Dashboard'),
        label: '🏠 Dashboard',
        description: 'Acesse o sistema principal',
        isFallback: true
      };
    }

    // Se não encontrou nada, retorna null (item não navegável)
    return null;

  } catch (error) {
    console.error('Erro ao mapear navegação:', error, item);
    return null;
  }
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