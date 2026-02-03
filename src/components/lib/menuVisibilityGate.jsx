/**
 * Menu Visibility Gate - Fonte Única de Verdade para Visibilidade e Acesso
 * 
 * Define quais rotas/páginas podem ser acessadas por cada tipo de usuário
 * baseado APENAS no sistema RBAC (UserProfile + module_permissions)
 */

export const routePermissionMap = {
  // ===== HOME & PERFIL =====
  Home: { key: "dashboard.view", type: "all", module: "dashboard" },
  MeuPerfil: { key: "dashboard.view", type: "all", module: "dashboard" },
  
  // ===== DASHBOARD & RANKINGS =====
  DashboardOverview: { key: "dashboard.view", type: "all", module: "dashboard" },
  Dashboard: { key: "admin.audit", type: "admin", module: "admin" },
  Gamificacao: { key: "operations.view_qgp", type: "all", module: "patio" },
  RankingBrasil: { key: "dashboard.view", type: "all", module: "dashboard" },
  
  // ===== CADASTROS =====
  GestaoOficina: { key: "workshop.view", type: "all", module: "cadastros" },
  Organograma: { key: "workshop.view", type: "all", module: "cadastros" },
  OrganogramaFuncional: { key: "workshop.view", type: "all", module: "cadastros" },
  
  // ===== PÁTIO / QGP =====
  Tarefas: { key: "operations.manage_tasks", type: "all", module: "patio" },
  Notificacoes: { key: "dashboard.view", type: "all", module: "dashboard" },
  RegistroDiario: { key: "operations.daily_log", type: "all", module: "patio" },
  QGPBoard: { key: "operations.view_qgp", type: "all", module: "patio" },
  TechnicianQGP: { key: "operations.view_qgp", type: "all", module: "patio" },
  
  // ===== RESULTADOS =====
  HistoricoMetas: { key: "workshop.manage_goals", type: "all", module: "resultados" },
  DesdobramentoMeta: { key: "workshop.manage_goals", type: "all", module: "resultados" },
  PainelMetas: { key: "workshop.manage_goals", type: "all", module: "resultados" },
  DRETCMP2: { key: "financeiro.view", type: "all", module: "resultados" },
  ConsolidadoMensal: { key: "financeiro.view", type: "all", module: "resultados" },
  DiagnosticoOS: { key: "diagnostics.create", type: "all", module: "resultados" },
  ResultadoOS: { key: "diagnostics.view", type: "all", module: "resultados" },
  DiagnosticoProducao: { key: "diagnostics.create", type: "all", module: "resultados" },
  ResultadoProducao: { key: "diagnostics.view", type: "all", module: "resultados" },
  DiagnosticoEndividamento: { key: "financeiro.view", type: "all", module: "resultados" },
  ResultadoEndividamento: { key: "financeiro.view", type: "all", module: "resultados" },
  DiagnosticoGerencial: { key: "diagnostics.create", type: "all", module: "resultados" },
  
  // ===== PESSOAS & RH =====
  Autoavaliacoes: { key: "diagnostics.view", type: "all", module: "pessoas" },
  Colaboradores: { key: "employees.view", type: "all", module: "pessoas" },
  DetalhesColaborador: { key: "employees.view", type: "all", module: "pessoas" },
  CadastroColaborador: { key: "employees.create", type: "all", module: "pessoas" },
  ConvidarColaborador: { key: "employees.create", type: "all", module: "pessoas" },
  AprovarColaboradores: { key: "employees.create", type: "all", module: "pessoas" },
  CESPECanal: { key: "employees.create", type: "all", module: "pessoas" },
  CESPEEntrevista: { key: "employees.create", type: "all", module: "pessoas" },
  CESPESonho: { key: "employees.create", type: "all", module: "pessoas" },
  CESPEProposta: { key: "employees.create", type: "all", module: "pessoas" },
  CESPEIntegracao: { key: "employees.create", type: "all", module: "pessoas" },
  CDCList: { key: "processes.view", type: "all", module: "pessoas" },
  CDCForm: { key: "processes.create", type: "all", module: "pessoas" },
  COEXList: { key: "processes.view", type: "all", module: "pessoas" },
  COEXForm: { key: "processes.create", type: "all", module: "pessoas" },
  DescricoesCargo: { key: "employees.view", type: "all", module: "pessoas" },
  CriarDescricaoCargo: { key: "employees.create", type: "all", module: "pessoas" },
  EditarDescricaoCargo: { key: "employees.edit", type: "all", module: "pessoas" },
  DiagnosticoEmpresario: { key: "diagnostics.create", type: "all", module: "pessoas" },
  ResultadoEmpresario: { key: "diagnostics.view", type: "all", module: "pessoas" },
  DiagnosticoDISC: { key: "diagnostics.create", type: "all", module: "pessoas" },
  ResultadoDISC: { key: "diagnostics.view", type: "all", module: "pessoas" },
  HistoricoDISC: { key: "diagnostics.view", type: "all", module: "pessoas" },
  DiagnosticoMaturidade: { key: "diagnostics.create", type: "all", module: "pessoas" },
  ResultadoMaturidade: { key: "diagnostics.view", type: "all", module: "pessoas" },
  HistoricoMaturidade: { key: "diagnostics.view", type: "all", module: "pessoas" },
  DiagnosticoDesempenho: { key: "diagnostics.create", type: "all", module: "pessoas" },
  ResultadoDesempenho: { key: "diagnostics.view", type: "all", module: "pessoas" },
  HistoricoDesempenho: { key: "diagnostics.view", type: "all", module: "pessoas" },
  DiagnosticoCarga: { key: "diagnostics.create", type: "all", module: "pessoas" },
  ResultadoCarga: { key: "diagnostics.view", type: "all", module: "pessoas" },
  MonitoramentoRH: { key: "employees.view", type: "all", module: "pessoas" },
  PortalColaborador: { key: "employees.view", type: "all", module: "pessoas" },
  Feedbacks: { key: "employees.view", type: "all", module: "pessoas" },
  
  // ===== AUTOAVALIAÇÕES =====
  AutoavaliacaoVendas: { key: "diagnostics.create", type: "all", module: "diagnosticos" },
  AutoavaliacaoComercial: { key: "diagnostics.create", type: "all", module: "diagnosticos" },
  AutoavaliacaoMarketing: { key: "diagnostics.create", type: "all", module: "diagnosticos" },
  AutoavaliacaoPessoas: { key: "diagnostics.create", type: "all", module: "diagnosticos" },
  AutoavaliacaoFinanceiro: { key: "diagnostics.create", type: "all", module: "diagnosticos" },
  AutoavaliacaoEmpresarial: { key: "diagnostics.create", type: "all", module: "diagnosticos" },
  AutoavaliacaoMA3: { key: "diagnostics.create", type: "all", module: "diagnosticos" },
  AutoavaliacaoDISC: { key: "diagnostics.create", type: "all", module: "diagnosticos" },
  AutoavaliacaoDesempenho: { key: "diagnostics.create", type: "all", module: "diagnosticos" },
  AutoavaliacaoMaturidade: { key: "diagnostics.create", type: "all", module: "diagnosticos" },
  ResultadoAutoavaliacao: { key: "diagnostics.view", type: "all", module: "diagnosticos" },
  ResponderDISC: { key: "diagnostics.create", type: "all", module: "diagnosticos" },
  ResponderMaturidade: { key: "diagnostics.create", type: "all", module: "diagnosticos" },
  
  // ===== DIAGNÓSTICOS & IA =====
  IAAnalytics: { key: "diagnostics.ai_access", type: "all", module: "diagnosticos" },
  TreinamentoVendas: { key: "training.view", type: "all", module: "diagnosticos" },
  DiagnosticoComercial: { key: "diagnostics.create", type: "all", module: "diagnosticos" },
  SelecionarDiagnostico: { key: "diagnostics.view", type: "all", module: "diagnosticos" },
  Historico: { key: "diagnostics.view", type: "all", module: "diagnosticos" },
  Questionario: { key: "diagnostics.create", type: "all", module: "diagnosticos" },
  Resultado: { key: "diagnostics.view", type: "all", module: "diagnosticos" },
  
  // ===== PROCESSOS =====
  MeusProcessos: { key: "processes.view", type: "all", module: "processos" },
  VisualizarProcesso: { key: "processes.view", type: "all", module: "processos" },
  GerenciarProcessos: { key: "admin.system_config", type: "admin", module: "admin" },
  ManualProcessos: { key: "processes.view", type: "all", module: "processos" },
  
  // ===== DOCUMENTOS =====
  RepositorioDocumentos: { key: "documents.upload", type: "all", module: "documentos" },
  EvidenceUpload: { key: "documents.upload", type: "all", module: "documentos" },
  DocumentacaoCompleta: { key: "documents.upload", type: "all", module: "documentos" },
  
  // ===== CULTURA =====
  CulturaOrganizacional: { key: "culture.view", type: "all", module: "cultura" },
  Regimento: { key: "culture.edit", type: "all", module: "cultura" },
  MissaoVisaoValores: { key: "culture.edit", type: "all", module: "cultura" },
  RituaisAculturamento: { key: "culture.manage_rituals", type: "all", module: "cultura" },
  Rituais: { key: "culture.view", type: "all", module: "cultura" },
  CriarRitualMAP: { key: "culture.manage_rituals", type: "all", module: "cultura" },
  CronogramaAculturacao: { key: "culture.manage_rituals", type: "all", module: "cultura" },
  PesquisaClima: { key: "culture.view", type: "all", module: "cultura" },
  ResponderPesquisaClima: { key: "culture.view", type: "all", module: "cultura" },
  ResultadoClima: { key: "culture.view", type: "all", module: "cultura" },
  PublicFeedback: { key: "culture.view", type: "all", module: "cultura" },
  
  // ===== TREINAMENTOS =====
  AcademiaTreinamento: { key: "training.view", type: "all", module: "treinamentos" },
  GerenciarTreinamentos: { key: "training.manage", type: "all", module: "treinamentos" },
  ConfiguracaoAcademia: { key: "admin.system_config", type: "admin", module: "admin" },
  AcompanhamentoTreinamento: { key: "training.evaluate", type: "all", module: "treinamentos" },
  MeusTreinamentos: { key: "training.view", type: "all", module: "treinamentos" },
  GerenciarModulo: { key: "training.create", type: "all", module: "treinamentos" },
  GerenciarAula: { key: "training.create", type: "all", module: "treinamentos" },
  AssistirAula: { key: "training.view", type: "all", module: "treinamentos" },
  AssistirCurso: { key: "training.view", type: "all", module: "treinamentos" },
  GerenciarModulosCurso: { key: "training.create", type: "all", module: "treinamentos" },
  
  // ===== GESTÃO OPERAÇÃO =====
  DicasOperacao: { key: "operations.view_qgp", type: "all", module: "gestao" },
  GestaoDesafios: { key: "operations.manage_tasks", type: "all", module: "gestao" },
  PlanoAcao: { key: "operations.manage_tasks", type: "all", module: "gestao" },
  PainelAcoes: { key: "operations.manage_tasks", type: "all", module: "gestao" },
  
  // ===== INTELIGÊNCIA DO CLIENTE =====
  IntelligenciaCliente: { key: "workshop.view", type: "all", module: "inteligencia" },
  MapaChecklists: { key: "workshop.view", type: "all", module: "inteligencia" },
  RelatoriosInteligencia: { key: "workshop.view", type: "all", module: "inteligencia" },
  DoresAtivas: { key: "workshop.view", type: "all", module: "inteligencia" },
  DuvidasCliente: { key: "workshop.view", type: "all", module: "inteligencia" },
  DesesosCliente: { key: "workshop.view", type: "all", module: "inteligencia" },
  RiscosCliente: { key: "workshop.view", type: "all", module: "inteligencia" },
  EvolucoesCliente: { key: "workshop.view", type: "all", module: "inteligencia" },
  GerenciarChecklists: { key: "workshop.view", type: "all", module: "inteligencia" },
  GerenciarGruposClientes: { key: "workshop.view", type: "all", module: "inteligencia" },
  
  // ===== ACELERAÇÃO =====
  PainelClienteAceleracao: { key: "acceleration.view", type: "all", module: "aceleracao" },
  CronogramaImplementacao: { key: "acceleration.view", type: "all", module: "aceleracao" },
  CronogramaConsultoria: { key: "acceleration.manage", type: "interno", module: "aceleracao" },
  ControleAceleracao: { key: "acceleration.manage", type: "interno", module: "aceleracao" },
  GestaoContratos: { key: "acceleration.manage", type: "interno", module: "aceleracao" },
  RelatoriosAceleracao: { key: "acceleration.manage", type: "interno", module: "aceleracao" },
  RegistrarAtendimento: { key: "acceleration.manage", type: "interno", module: "aceleracao" },
  CronogramaDetalhado: { key: "acceleration.manage", type: "interno", module: "aceleracao" },
  AvaliarAtendimento: { key: "acceleration.manage", type: "interno", module: "aceleracao" },
  CronogramaGeral: { key: "acceleration.manage", type: "interno", module: "aceleracao" },
  AcessoAceleracao: { key: "acceleration.view", type: "all", module: "aceleracao" },
  RelatoriosAvancados: { key: "acceleration.manage", type: "interno", module: "aceleracao" },
  
  // ===== ADMIN - BLOQUEADO PARA EXTERNOS =====
  DashboardFinanceiro: { key: "admin.system_config", type: "admin", module: "admin" },
  ConfiguracoesKiwify: { key: "admin.system_config", type: "admin", module: "admin" },
  GestaoUsuariosEmpresas: { key: "admin.users", type: "admin", module: "admin" },
  UsuariosAdmin: { key: "admin.users", type: "admin", module: "admin" },
  AdminProdutividade: { key: "admin.system_config", type: "admin", module: "admin" },
  AdminDesafios: { key: "admin.system_config", type: "admin", module: "admin" },
  GerenciarPlanos: { key: "admin.system_config", type: "admin", module: "admin" },
  CadastroPlanos: { key: "admin.system_config", type: "admin", module: "admin" },
  Planos: { key: "admin.system_config", type: "admin", module: "admin" },
  MeuPlano: { key: "dashboard.view", type: "all", module: "dashboard" },
  CalendarioEventos: { key: "admin.system_config", type: "admin", module: "admin" },
  CadastroUsuarioDireto: { key: "admin.users", type: "admin", module: "admin" },
  TestUsuarios: { key: "admin.system_config", type: "admin", module: "admin" },
  AdminMensagens: { key: "admin.system_config", type: "admin", module: "admin" },
  AdminNotificacoes: { key: "admin.system_config", type: "admin", module: "admin" },
  GerenciarToursVideos: { key: "admin.system_config", type: "admin", module: "admin" },
  GestaoRBAC: { key: "admin.profiles", type: "admin", module: "admin" },
  GestaoPerfis: { key: "admin.profiles", type: "admin", module: "admin" },
  ConfiguracaoPermissoesGranulares: { key: "admin.system_config", type: "admin", module: "admin" },
  LogsAuditoriaRBAC: { key: "admin.audit", type: "admin", module: "admin" },
  MonitoramentoUsuarios: { key: "admin.audit", type: "admin", module: "admin" },
  AuditLogs: { key: "admin.audit", type: "admin", module: "admin" },
  RelatorioUsuario: { key: "admin.audit", type: "admin", module: "admin" },
  DiagnosticoPlano: { key: "admin.system_config", type: "admin", module: "admin" },
  Integracoes: { key: "admin.system_config", type: "admin", module: "admin" },
  TesteOpenAI: { key: "admin.system_config", type: "admin", module: "admin" },
  GraficosProducao: { key: "admin.audit", type: "admin", module: "admin" },
  
  // ===== PÁGINAS PÚBLICAS (SEM AUTENTICAÇÃO) =====
  PrimeiroAcesso: { key: null, type: "public", module: null },
  Cadastro: { key: null, type: "public", module: null },
  ClientRegistration: { key: null, type: "public", module: null },
  CadastroSucesso: { key: null, type: "public", module: null },
};

/**
 * Verifica se o usuário pode acessar uma rota específica
 * @param {string} pageName - Nome da página
 * @param {object} user - Objeto do usuário atual
 * @param {object} profile - UserProfile do usuário
 * @returns {boolean}
 */
export function canAccessRoute(pageName, user, profile) {
  const routeConfig = routePermissionMap[pageName];
  
  // Rota não mapeada = bloquear por segurança
  if (!routeConfig) {
    console.warn(`[RBAC] Rota não mapeada: ${pageName}`);
    return false;
  }
  
  // Páginas públicas sempre permitidas
  if (routeConfig.type === "public") {
    return true;
  }
  
  // Sem usuário = bloquear
  if (!user) {
    return false;
  }
  
  // Admin bypass - sempre tem acesso total
  if (user.role === "admin") {
    return true;
  }
  
  // Verificar tipo de acesso necessário
  if (routeConfig.type === "admin") {
    return false; // Apenas admin real pode acessar
  }
  
  // Se for tipo "interno", verificar se o usuário é interno
  if (routeConfig.type === "interno") {
    if (!profile || profile.type !== "interno") {
      return false;
    }
  }
  
  // Verificar permissão granular via UserProfile
  if (!profile) {
    return false;
  }
  
  // Verificar se o módulo está permitido
  const module = routeConfig.module;
  if (module && profile.module_permissions) {
    const moduleAccess = profile.module_permissions[module];
    if (moduleAccess === "bloqueado") {
      return false;
    }
  }
  
  // Verificar se a página está na lista de módulos permitidos
  if (profile.modules_allowed && profile.modules_allowed.length > 0) {
    if (module && !profile.modules_allowed.includes(module)) {
      return false;
    }
  }
  
  // Se passou todas as verificações, permitir acesso
  return true;
}

/**
 * Verifica se um item do menu deve ser visível
 * @param {object} menuItem - Item do navigationGroups
 * @param {object} user - Usuário atual
 * @param {object} profile - UserProfile do usuário
 * @returns {boolean}
 */
export function isMenuItemVisible(menuItem, user, profile) {
  // Sem usuário = ocultar
  if (!user) {
    return false;
  }
  
  // Admin sempre vê tudo
  if (user.role === "admin") {
    return true;
  }
  
  // Se o item tem adminOnly, bloquear para não-admin
  if (menuItem.adminOnly) {
    return false;
  }
  
  // Se o item tem aceleradorOnly, verificar se é interno
  if (menuItem.aceleradorOnly && profile?.type !== "interno") {
    return false;
  }
  
  // Extrair nome da página do href
  const pageName = extractPageName(menuItem.href);
  if (!pageName) {
    return false;
  }
  
  // Usar a verificação de rota
  return canAccessRoute(pageName, user, profile);
}

/**
 * Extrai o nome da página de uma URL
 * @param {string} href - URL completa
 * @returns {string|null}
 */
function extractPageName(href) {
  if (!href) return null;
  
  // Remove query string
  const cleanHref = href.split('?')[0];
  
  // Extrai a última parte do caminho
  const parts = cleanHref.split('/');
  return parts[parts.length - 1] || null;
}

/**
 * Gera relatório de acesso para debugging
 * @param {object} user - Usuário atual
 * @param {object} profile - UserProfile do usuário
 * @returns {array}
 */
export function generateAccessReport(user, profile) {
  const report = [];
  
  Object.keys(routePermissionMap).forEach(pageName => {
    const config = routePermissionMap[pageName];
    const canAccess = canAccessRoute(pageName, user, profile);
    
    report.push({
      page: pageName,
      permissionKey: config.key,
      type: config.type,
      module: config.module,
      canAccess,
      reason: !canAccess ? getBlockReason(pageName, user, profile) : "Permitido"
    });
  });
  
  return report;
}

function getBlockReason(pageName, user, profile) {
  const config = routePermissionMap[pageName];
  
  if (!user) return "Não autenticado";
  if (config.type === "admin" && user.role !== "admin") return "Apenas admin";
  if (config.type === "interno" && profile?.type !== "interno") return "Apenas interno";
  if (config.module && profile?.module_permissions?.[config.module] === "bloqueado") return `Módulo ${config.module} bloqueado`;
  if (profile?.modules_allowed && !profile.modules_allowed.includes(config.module)) return `Módulo ${config.module} não permitido`;
  
  return "Sem permissão";
}