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
      keywords: ['diagnostico empresario', 'perfil empresario', 'perfil empreendedor', 'aventureiro gestor'],
      is_primary: true,
      stage: 'inicio'
    },
    'diagnostico_maturidade': {
      url: 'DiagnosticoMaturidade',
      label: '📊 Diagnóstico de Maturidade',
      description: 'Avalie maturidade da equipe',
      keywords: ['diagnostico maturidade', 'maturidade colaborador', 'maturidade equipe'],
      is_primary: true,
      stage: 'inicio'
    },
    'diagnostico_producao': {
      url: 'DiagnosticoProducao',
      label: '📊 Diagnóstico de Produtividade',
      description: 'Analise produtividade técnica',
      keywords: ['diagnostico producao', 'diagnostico produtividade', 'produtividade tecnica'],
      is_primary: true,
      stage: 'inicio'
    },
    'diagnostico_desempenho': {
      url: 'DiagnosticoDesempenho',
      label: '📊 Diagnóstico de Desempenho',
      description: 'Avalie performance individual',
      keywords: ['diagnostico desempenho', 'diagnostico performance', 'matriz desempenho'],
      is_primary: true,
      stage: 'inicio'
    },
    'diagnostico_gerencial': {
      url: 'DiagnosticoGerencial',
      label: '📊 Diagnóstico Gerencial',
      description: 'Avalie práticas de gestão',
      keywords: ['diagnostico gerencial', 'diagnostico gestao', 'praticas gerenciais'],
      is_primary: true,
      stage: 'inicio'
    },
    'diagnostico_comercial': {
      url: 'DiagnosticoComercial',
      label: '📊 Diagnóstico Comercial',
      description: 'Analise processos de vendas',
      keywords: ['diagnostico comercial', 'diagnostico vendas', 'processo comercial'],
      is_primary: true,
      stage: 'inicio'
    },
    'diagnostico_ordem_servico': {
      url: 'DiagnosticoOS',
      label: '📊 Diagnóstico de Ordem de Serviço',
      description: 'Avalie processo de OS',
      keywords: ['diagnostico os', 'diagnostico ordem servico', 'processo os'],
      is_primary: true,
      stage: 'inicio'
    },
    'diagnostico_disc': {
      url: 'DiagnosticoDISC',
      label: '📊 Diagnóstico DISC',
      description: 'Teste de perfil comportamental',
      keywords: ['diagnostico disc', 'teste disc', 'perfil comportamental disc'],
      is_primary: true,
      stage: 'inicio'
    },
    'diagnostico_endividamento': {
      url: 'DiagnosticoEndividamento',
      label: '📊 Diagnóstico de Endividamento',
      description: 'Analise saúde financeira',
      keywords: ['diagnostico endividamento', 'diagnostico divida', 'analise financeira'],
      is_primary: true,
      stage: 'inicio'
    },
    'diagnostico_carga_trabalho': {
      url: 'DiagnosticoCarga',
      label: '📊 Diagnóstico de Carga de Trabalho',
      description: 'Avalie capacidade de trabalho',
      keywords: ['diagnostico carga', 'diagnostico carga trabalho', 'capacidade trabalho'],
      is_primary: true,
      stage: 'inicio'
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
    'gerenciar_treinamentos': {
      url: 'GerenciarTreinamentos',
      label: '🎓 Gerenciar Treinamentos',
      description: 'Gerencie cursos e módulos',
      keywords: ['gerenciar treinamento', 'criar curso', 'configurar treinamento'],
      is_primary: true
    },
    'academia_treinamento': {
      url: 'AcademiaTreinamento',
      label: '🎓 Academia de Treinamento',
      description: 'Acesse cursos disponíveis',
      keywords: ['academia treinamento', 'cursos disponiveis', 'assistir aula'],
      is_primary: true
    },
    'acompanhamento_treinamento': {
      url: 'AcompanhamentoTreinamento',
      label: '📈 Acompanhamento de Treinamentos',
      description: 'Monitore progresso de treinamentos',
      keywords: ['acompanhamento treinamento', 'progresso curso', 'evolucao capacitacao']
    },
    'meus_treinamentos': {
      url: 'MeusTreinamentos',
      label: '🎓 Meus Treinamentos',
      description: 'Seus cursos em andamento',
      keywords: ['meus treinamentos', 'meus cursos', 'treinamentos atribuidos']
    }
  },

  // === PROCESSOS E DOCUMENTOS ===
  processos: {
    'gerenciar_processos': {
      url: 'GerenciarProcessos',
      label: '⚙️ Processos Operacionais',
      description: 'Documente processos operacionais',
      keywords: ['gerenciar processos', 'meus processos', 'processos operacionais', 'documentar processo'],
      is_primary: true
    },
    'visualizar_processo': {
      url: 'MeusProcessos',
      label: '⚙️ Meus Processos',
      description: 'Visualize processos atribuídos',
      keywords: ['visualizar processo', 'processos atribuidos', 'meu processo']
    },
    'repositorio_documentos': {
      url: 'RepositorioDocumentos',
      label: '📁 Repositório de Documentos',
      description: 'Central de documentos',
      keywords: ['repositorio', 'documentos', 'arquivos', 'biblioteca documentos'],
      is_primary: true
    },
    'manual_empresa': {
      url: 'CulturaOrganizacional',
      label: '📖 Manual da Empresa',
      description: 'Manual organizacional',
      keywords: ['manual empresa', 'manual organizacional']
    },
    'cdc_contratos': {
      url: 'CDCList',
      label: '📋 CDC - Contratos de Desempenho',
      description: 'Contratos de desempenho comercial',
      keywords: ['cdc', 'contrato desempenho', 'contrato comercial']
    },
    'coex_contratos': {
      url: 'COEXList',
      label: '📋 COEX - Contratos de Experiência',
      description: 'Contratos de experiência cliente',
      keywords: ['coex', 'contrato experiencia', 'experiencia cliente']
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
 * Normaliza string para comparação (remove acentos, espaços extras, caracteres especiais)
 */
const normalizeString = (str) => {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
};

/**
 * Calcula pontuação de correspondência entre item e configuração
 */
const calculateMatchScore = (item, key, config) => {
  const itemName = normalizeString(item.item_nome);
  const itemId = normalizeString(item.item_id);
  const itemTipo = normalizeString(item.item_tipo);
  const keyNormalized = normalizeString(key);
  
  let score = 0;
  
  // 1. MATCH EXATO (maior prioridade) - 1000 pontos
  if (itemId === keyNormalized || itemName === keyNormalized) {
    return 1000;
  }
  
  // 2. MATCH DE CHAVE COMPLETA - 500 pontos
  if (itemName.includes(keyNormalized) || itemId.includes(keyNormalized)) {
    // Quanto maior a chave, mais específica
    score += 500 + (keyNormalized.length * 10);
  }
  
  // 3. MATCH POR KEYWORDS - pontuação variável
  if (config.keywords) {
    const matchedKeywords = config.keywords.filter(kw => {
      const kwNormalized = normalizeString(kw);
      return itemName.includes(kwNormalized) || itemId.includes(kwNormalized);
    });
    
    if (matchedKeywords.length > 0) {
      // Mais keywords = mais específico
      score += matchedKeywords.length * 50;
      
      // Keywords mais longas = mais específicas
      const totalKeywordLength = matchedKeywords.reduce((sum, kw) => sum + kw.length, 0);
      score += totalKeywordLength * 2;
    }
  }
  
  // 4. PENALIDADE para matches muito genéricos
  const genericTerms = ['diagnostico', 'processo', 'ferramenta', 'modulo'];
  const isGenericMatch = genericTerms.some(term => {
    return keyNormalized === term && score < 500;
  });
  
  if (isGenericMatch) {
    score = score * 0.3; // Reduz drasticamente score de termos genéricos
  }
  
  // 5. BÔNUS se item_tipo corresponde à categoria
  if (config.keywords?.includes(itemTipo)) {
    score += 30;
  }
  
  // 6. BÔNUS para rotas primárias
  if (config.is_primary) {
    score += 100;
  }
  
  // 7. BÔNUS para stages específicos
  if (config.stage === 'inicio' && (itemName.includes('iniciar') || itemName.includes('comecar'))) {
    score += 150;
  }
  
  return score;
};

/**
 * Busca navegação por múltiplos critérios com sistema de pontuação
 */
const findNavigationMatch = (item) => {
  if (!item || !item.item_nome) return null;
  
  const candidates = [];
  
  // Coletar TODAS as correspondências possíveis com suas pontuações
  for (const category of Object.values(NAVIGATION_MATRIX)) {
    for (const [key, config] of Object.entries(category)) {
      const score = calculateMatchScore(item, key, config);
      
      if (score > 0) {
        candidates.push({
          key,
          config,
          score,
          category: Object.keys(NAVIGATION_MATRIX).find(k => NAVIGATION_MATRIX[k] === category)
        });
      }
    }
  }
  
  // Se não houver candidatos, retorna null
  if (candidates.length === 0) {
    return null;
  }
  
  // Ordenar por pontuação (maior primeiro)
  candidates.sort((a, b) => b.score - a.score);
  
  // Log para debug (pode remover em produção)
  if (candidates.length > 1) {
    console.log(`🔍 Mapeamento para "${item.item_nome}":`, {
      vencedor: candidates[0].key,
      score: candidates[0].score,
      alternativas: candidates.slice(1, 3).map(c => ({ key: c.key, score: c.score }))
    });
  }
  
  // Retornar a melhor correspondência
  return candidates[0].config;
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