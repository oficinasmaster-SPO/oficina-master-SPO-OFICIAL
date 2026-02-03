/**
 * Mapa Central de Permissões - Fonte Única da Verdade
 * Define qual permissão é necessária para cada tela/recurso do sistema
 */

export const PERMISSIONS_MAP = {
  // Dashboard & Rankings
  'DashboardOverview': 'dashboard.view',
  'Dashboard': 'admin.audit',
  'Gamificacao': 'operations.view_qgp',
  
  // Cadastros
  'GestaoOficina': 'workshop.view',
  'Organograma': 'workshop.view',
  'OrganogramaFuncional': 'workshop.view',
  
  // Pátio Operação (QGP)
  'Tarefas': 'operations.manage_tasks',
  'Notificacoes': 'dashboard.view',
  'RegistroDiario': 'operations.daily_log',
  'QGPBoard': 'operations.view_qgp',
  'TechnicianQGP': 'operations.view_qgp',
  
  // Resultados
  'HistoricoMetas': 'workshop.manage_goals',
  'DesdobramentoMeta': 'workshop.manage_goals',
  'DRETCMP2': 'financeiro.view',
  'DiagnosticoOS': 'diagnostics.create',
  'DiagnosticoProducao': 'diagnostics.create',
  'DiagnosticoEndividamento': 'financeiro.view',
  'DiagnosticoGerencial': 'diagnostics.create',
  
  // Pessoas & RH
  'Autoavaliacoes': 'diagnostics.view',
  'Colaboradores': 'employees.view',
  'ConvidarColaborador': 'employees.create',
  'AprovarColaboradores': 'employees.create',
  'CESPECanal': 'employees.create',
  'CDCList': 'processes.view',
  'COEXList': 'processes.view',
  'DescricoesCargo': 'employees.view',
  'DiagnosticoEmpresario': 'diagnostics.create',
  'DiagnosticoDISC': 'diagnostics.create',
  'DiagnosticoMaturidade': 'diagnostics.create',
  'DiagnosticoDesempenho': 'diagnostics.create',
  'DiagnosticoCarga': 'diagnostics.create',
  
  // Diagnósticos & IA
  'IAAnalytics': 'diagnostics.ai_access',
  'TreinamentoVendas': 'training.view',
  'DiagnosticoComercial': 'diagnostics.create',
  'SelecionarDiagnostico': 'diagnostics.view',
  'Historico': 'diagnostics.view',
  
  // Processos
  'MeusProcessos': 'processes.view',
  'ManualProcessos': 'processes.view',
  
  // Documentos
  'RepositorioDocumentos': 'documents.upload',
  
  // Cultura
  'CulturaOrganizacional': 'culture.view',
  'Regimento': 'culture.edit',
  'MissaoVisaoValores': 'culture.edit',
  'RituaisAculturamento': 'culture.manage_rituals',
  'CronogramaAculturacao': 'culture.manage_rituals',
  'PesquisaClima': 'culture.view',
  
  // Treinamentos
  'AcademiaTreinamento': 'training.view',
  'GerenciarTreinamentos': 'training.manage',
  'ConfiguracaoAcademia': 'training.manage',
  'AcompanhamentoTreinamento': 'training.evaluate',
  'MeusTreinamentos': 'training.view',
  
  // Gestão da Operação
  'DicasOperacao': 'operations.view_qgp',
  'GestaoDesafios': 'operations.manage_tasks',
  
  // Inteligência do Cliente
  'IntelligenciaCliente': 'workshop.view',
  'MapaChecklists': 'workshop.view',
  'RelatoriosInteligencia': 'workshop.view',
  
  // Aceleração
  'PainelClienteAceleracao': 'acceleration.view',
  'CronogramaImplementacao': 'acceleration.view',
  'ControleAceleracao': 'acceleration.manage',
  'GestaoContratos': 'acceleration.manage',
  'RelatoriosAceleracao': 'acceleration.manage',
  
  // Administração (Telas Internas)
  'DashboardFinanceiro': 'admin.system_config',
  'ConfiguracoesKiwify': 'admin.system_config',
  'GestaoUsuariosEmpresas': 'admin.users',
  'AdminProdutividade': 'productivity.settings',
  'AdminDesafios': 'challenge.manage',
  'GerenciarPlanos': 'plans.manage',
  'CalendarioEventos': 'events.calendar',
  'CadastroUsuarioDireto': 'admin.users',
  'TestUsuarios': 'admin.system_config',
  'AdminMensagens': 'messages.templates',
  'AdminNotificacoes': 'email.manage',
  'GerenciarToursVideos': 'admin.system_config',
  'GerenciarProcessos': 'processes.admin',
  'GestaoRBAC': 'admin.profiles',
  'ConfiguracaoPermissoesGranulares': 'admin.system_config',
  'LogsAuditoriaRBAC': 'admin.audit',
  'UsuariosAdmin': 'internal_users.manage',
  'MonitoramentoUsuarios': 'admin.audit',
  'DiagnosticoPlano': 'admin.system_config',
  'Integracoes': 'admin.system_config',
  'TesteOpenAI': 'admin.system_config',
};

/**
 * Verifica se uma página requer usuário interno
 * Páginas de administração e controle de aceleração são exclusivas para internos
 */
export const INTERNAL_ONLY_PAGES = [
  'DashboardFinanceiro',
  'ConfiguracoesKiwify',
  'GestaoUsuariosEmpresas',
  'AdminProdutividade',
  'AdminDesafios',
  'GerenciarPlanos',
  'CalendarioEventos',
  'CadastroUsuarioDireto',
  'TestUsuarios',
  'AdminMensagens',
  'AdminNotificacoes',
  'GerenciarToursVideos',
  'GerenciarProcessos',
  'GestaoRBAC',
  'ConfiguracaoPermissoesGranulares',
  'LogsAuditoriaRBAC',
  'UsuariosAdmin',
  'MonitoramentoUsuarios',
  'DiagnosticoPlano',
  'Integracoes',
  'TesteOpenAI',
  'ConfiguracaoAcademia',
  'Dashboard'
];

/**
 * Verifica se uma página requer job_role específico
 */
export const ROLE_SPECIFIC_PAGES = {
  'ControleAceleracao': ['acelerador', 'consultor'],
  'GestaoContratos': ['acelerador', 'consultor'],
  'RelatoriosAceleracao': ['acelerador', 'consultor'],
  'QGPBoard': ['tecnico', 'lider_tecnico'],
  'TechnicianQGP': ['tecnico', 'lider_tecnico'],
};

/**
 * Páginas públicas que não requerem autenticação ou permissões
 */
export const PUBLIC_PAGES = [
  'Home',
  'PrimeiroAcesso',
  'ClientRegistration',
  'CadastroSucesso',
  'Planos'
];

/**
 * Retorna a permissão necessária para uma página
 * @param {string} pageName - Nome da página
 * @returns {string|null} - ID da permissão ou null se pública
 */
export function getRequiredPermissionForPage(pageName) {
  if (PUBLIC_PAGES.includes(pageName)) return null;
  return PERMISSIONS_MAP[pageName] || null;
}

/**
 * Verifica se a página requer usuário interno
 * @param {string} pageName - Nome da página
 * @returns {boolean}
 */
export function isInternalOnlyPage(pageName) {
  return INTERNAL_ONLY_PAGES.includes(pageName);
}

/**
 * Retorna job_roles permitidos para uma página
 * @param {string} pageName - Nome da página
 * @returns {string[]|null}
 */
export function getAllowedRolesForPage(pageName) {
  return ROLE_SPECIFIC_PAGES[pageName] || null;
}