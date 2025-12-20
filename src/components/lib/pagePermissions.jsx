/**
 * Mapeamento centralizado de páginas para permissões granulares
 * Fonte única da verdade para controle de acesso baseado em páginas
 * 
 * IMPORTANTE: Este arquivo é usado no browser (frontend)
 * Não use require(), fs, path ou qualquer dependência Node.js
 */

export const pagePermissions = {
  // Dashboard e Analytics
  Home: "dashboard.view",
  Dashboard: "dashboard.view",
  DashboardOverview: "dashboard.view",
  
  // Gestão de Oficina
  GestaoOficina: "workshop.view",
  DesdobramentoMeta: "workshop.manage_goals",
  HistoricoMetas: "workshop.manage_goals",
  PainelMetas: "workshop.manage_goals",
  DRETCMP2: "financeiro.view",
  ConsolidadoMensal: "financeiro.view",
  
  // Gestão de Pessoas
  Colaboradores: "employees.view",
  CadastroColaborador: "employees.create",
  DetalhesColaborador: "employees.view",
  ConvidarColaborador: "employees.create",
  MonitoramentoRH: "employees.view",
  DescricoesCargo: "employees.view",
  CriarDescricaoCargo: "employees.create",
  EditarDescricaoCargo: "employees.edit",
  Organograma: "employees.view",
  PortalColaborador: "employees.view",
  Feedbacks: "employees.view",
  
  // Financeiro
  DiagnosticoEndividamento: "financeiro.view",
  ResultadoEndividamento: "financeiro.view",
  
  // Diagnósticos
  SelecionarDiagnostico: "diagnostics.view",
  Questionario: "diagnostics.create",
  Resultado: "diagnostics.view",
  Historico: "diagnostics.view",
  DiagnosticoEmpresario: "diagnostics.create",
  ResultadoEmpresario: "diagnostics.view",
  DiagnosticoMaturidade: "diagnostics.create",
  ResultadoMaturidade: "diagnostics.view",
  DiagnosticoProducao: "diagnostics.create",
  ResultadoProducao: "diagnostics.view",
  DiagnosticoDesempenho: "diagnostics.create",
  ResultadoDesempenho: "diagnostics.view",
  DiagnosticoCarga: "diagnostics.create",
  ResultadoCarga: "diagnostics.view",
  DiagnosticoOS: "diagnostics.create",
  ResultadoOS: "diagnostics.view",
  DiagnosticoDISC: "diagnostics.create",
  ResultadoDISC: "diagnostics.view",
  DiagnosticoGerencial: "diagnostics.create",
  DiagnosticoComercial: "diagnostics.create",
  HistoricoDISC: "diagnostics.view",
  HistoricoMaturidade: "diagnostics.view",
  HistoricoDesempenho: "diagnostics.view",
  ResponderDISC: "diagnostics.create",
  ResponderMaturidade: "diagnostics.create",
  
  // Autoavaliações
  Autoavaliacoes: "diagnostics.view",
  AutoavaliacaoVendas: "diagnostics.create",
  AutoavaliacaoComercial: "diagnostics.create",
  AutoavaliacaoMarketing: "diagnostics.create",
  AutoavaliacaoPessoas: "diagnostics.create",
  AutoavaliacaoFinanceiro: "diagnostics.create",
  AutoavaliacaoEmpresarial: "diagnostics.create",
  AutoavaliacaoMA3: "diagnostics.create",
  ResultadoAutoavaliacao: "diagnostics.view",
  
  // Processos e Documentos
  MeusProcessos: "processes.view",
  VisualizarProcesso: "processes.view",
  GerenciarProcessos: "processes.create",
  RepositorioDocumentos: "documents.upload",
  EvidenceUpload: "documents.upload",
  
  // Cultura Organizacional
  CulturaOrganizacional: "culture.view",
  MissaoVisaoValores: "culture.edit",
  Rituais: "culture.view",
  RituaisAculturamento: "culture.manage_rituals",
  CronogramaAculturacao: "culture.manage_rituals",
  PesquisaClima: "culture.view",
  ResponderPesquisaClima: "culture.view",
  ResultadoClima: "culture.view",
  
  // Treinamentos
  MeusTreinamentos: "training.view",
  GerenciarTreinamentos: "training.manage",
  AcompanhamentoTreinamento: "training.evaluate",
  AcademiaTreinamento: "training.view",
  GerenciarModulo: "training.create",
  GerenciarAula: "training.create",
  AssistirAula: "training.view",
  AssistirCurso: "training.view",
  GerenciarModulosCurso: "training.create",
  ConfiguracaoAcademia: "training.manage",
  
  // Operações e QGP
  QGPBoard: "operations.view_qgp",
  TechnicianQGP: "operations.view_qgp",
  RegistroDiario: "operations.daily_log",
  DicasOperacao: "operations.view_qgp",
  
  // Gestão e Tarefas
  Tarefas: "operations.manage_tasks",
  PlanoAcao: "operations.manage_tasks",
  PainelAcoes: "operations.manage_tasks",
  
  // Gamificação
  Gamificacao: "operations.view_qgp",
  GestaoDesafios: "operations.manage_tasks",
  
  // IA e Analytics
  IAAnalytics: "diagnostics.ai_access",
  
  // Clientes e CDC/COEX
  Clientes: "employees.view",
  CDCList: "processes.view",
  CDCForm: "processes.create",
  COEXList: "processes.view",
  COEXForm: "processes.create",
  PublicFeedback: "culture.view",
  
  // Notificações
  Notificacoes: "dashboard.view",
  
  // Aceleração (apenas consultores internos)
  ControleAceleracao: "acceleration.manage",
  PainelClienteAceleracao: "acceleration.view",
  RelatoriosAceleracao: "acceleration.manage",
  CronogramaImplementacao: "acceleration.manage",
  CronogramaConsultoria: "acceleration.manage",
  RegistrarAtendimento: "acceleration.manage",
  CronogramaDetalhado: "acceleration.manage",
  AvaliarAtendimento: "acceleration.manage",
  CronogramaGeral: "acceleration.manage",
  AcessoAceleracao: "acceleration.view",
  RelatoriosAvancados: "acceleration.manage",
  
  // Ranking
  RankingBrasil: "dashboard.view",
  
  // Admin
  Usuarios: "admin.users",
  UsuariosAdmin: "admin.users",
  GestaoRBAC: "admin.profiles",
  GestaoPerfis: "admin.profiles",
  GerenciarPlanos: "admin.system_config",
  CadastroPlanos: "admin.system_config",
  Planos: "admin.system_config",
  MeuPlano: "dashboard.view",
  GerenciarToursVideos: "admin.system_config",
  AdminProdutividade: "admin.system_config",
  AdminDesafios: "admin.system_config",
  AdminMensagens: "admin.system_config",
  AdminNotificacoes: "admin.system_config",
  MonitoramentoUsuarios: "admin.audit",
  AuditLogs: "admin.audit",
  RelatorioUsuario: "admin.audit",
  TesteUsuarios: "admin.system_config",
  
  // Páginas públicas (sem permissão necessária)
  PrimeiroAcesso: null,
  Cadastro: null,
  ClientRegistration: null,
};

/**
 * Verifica se uma página é pública (não requer autenticação)
 */
export function isPublicPage(pageName) {
  return pagePermissions[pageName] === null;
}

/**
 * Obtém a permissão necessária para acessar uma página
 */
export function getRequiredPermission(pageName) {
  return pagePermissions[pageName];
}