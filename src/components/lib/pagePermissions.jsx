import { systemRoles } from "./systemRoles";

/**
 * Mapeamento de permissões necessárias para acessar cada página
 * 
 * Convenções:
 * - null = página pública (não requer autenticação)
 * - "public_authenticated" = requer autenticação, mas sem permissão específica
 * - "module.permission" = requer permissão granular específica
 * - "admin" = requer role admin no User
 */
export const pagePermissions = {
  // Home
  Home: "public_authenticated",

  // Dashboard
  Dashboard: "public_authenticated",
  DashboardOverview: "public_authenticated",

  // Admin / Global
  GestaoTenants: "admin",
  GestaoEmpresas: "admin",
  GestaoUsuariosEmpresas: "admin",
  GestaoRBAC: "admin.rbac",
  GestaoOficina: "admin",
  ConfiguracoesKiwify: "admin",
  Integracoes: "admin",
  GerenciarPlanos: "admin",
  AdminProdutividade: "admin",
  AdminDesafios: "admin",
  AdminMensagens: "admin",
  AdminNotificacoes: "admin",
  GerenciarToursVideos: "admin",
  GerenciarProcessos: "admin",
  AuditoriaPermissoes: "admin.rbac",
  LogsAuditoriaRBAC: "admin.rbac",
  UsuariosAdmin: "admin.rbac",
  MonitoramentoUsuarios: "admin.rbac",
  ConfiguracaoPermissoesGranulares: "admin.rbac",
  DiagnosticoPlano: "admin",
  TesteOpenAI: "admin",
  AdminQADashboard: "admin",
  AdminTemplatesBacklog: "admin",
  CadastroUsuarioDireto: "admin",
  TestUsuarios: "admin",

  // Cultura
  CulturaOrganizacional: "culture.view",
  MissaoVisaoValores: "culture.view",
  DocumentacaoCompleta: "culture.view",
  Regimento: "culture.view",
  RituaisAculturamento: "culture.rituals",
  Rituais: "culture.rituals",
  CriarRitualMAP: "culture.rituals",
  ManualProcessos: "processes.view",
  MeusProcessos: "processes.view",
  VisualizarProcesso: "processes.view",
  GerenciarChecklists: "processes.checklists",
  MapaChecklists: "processes.checklists",
  RepositorioDocumentos: "documents.view",
  DocumentosProcessos: "documents.view",

  // Diagnósticos
  SelecionarDiagnostico: "diagnostics.create",
  DiagnosticoDISC: "diagnostics.create",
  ResultadoDISC: "diagnostics.view",
  HistoricoDISC: "diagnostics.view",
  AutoavaliacaoDISC: "diagnostics.create",
  PublicDISC: null,
  PublicNPS: null,
  PublicFeedback: null,
  DiagnosticoMaturidade: "diagnostics.create",
  ResultadoMaturidade: "diagnostics.view",
  AutoavaliacaoMaturidade: "diagnostics.create",
  HistoricoMaturidade: "diagnostics.view",
  DiagnosticoCarga: "diagnostics.create",
  ResultadoCarga: "diagnostics.view",
  AutoavaliacaoCarga: "diagnostics.create",
  DiagnosticoDesempenho: "diagnostics.create",
  ResultadoDesempenho: "diagnostics.view",
  AutoavaliacaoDesempenho: "diagnostics.create",
  HistoricoDesempenho: "diagnostics.view",
  MatrizDesempenho: "diagnostics.view",
  DiagnosticoEmpresario: "diagnostics.create",
  ResultadoEmpresario: "diagnostics.view",
  AutoavaliacaoEmpresarial: "diagnostics.create",
  DiagnosticoEndividamento: "diagnostics.create",
  ResultadoEndividamento: "diagnostics.view",
  AutoavaliacaoEndividamento: "diagnostics.create",
  DiagnosticoGerencial: "diagnostics.create",
  ResultadoGerencial: "diagnostics.view",
  AutoavaliacaoGerencial: "diagnostics.create",
  DiagnosticoOS: "diagnostics.create",
  ResultadoOS: "diagnostics.view",
  AutoavaliacaoOS: "diagnostics.create",
  DiagnosticoProducao: "diagnostics.create",
  ResultadoProducao: "diagnostics.view",
  AutoavaliacaoProducao: "diagnostics.create",
  GraficosProducao: "diagnostics.view",
  DiagnosticoComercial: "diagnostics.create",
  ResultadoComercial: "diagnostics.view",
  AutoavaliacaoComercial: "diagnostics.create",
  DiagnosticoFinanceiro: "diagnostics.create",
  ResultadoFinanceiro: "diagnostics.view",
  AutoavaliacaoFinanceiro: "diagnostics.create",
  DiagnosticoVendas: "diagnostics.create",
  ResultadoVendas: "diagnostics.view",
  AutoavaliacaoVendas: "diagnostics.create",
  DiagnosticoMarketing: "diagnostics.create",
  ResultadoMarketing: "diagnostics.view",
  AutoavaliacaoMarketing: "diagnostics.create",
  DiagnosticoPessoas: "diagnostics.create",
  ResultadoPessoas: "diagnostics.view",
  AutoavaliacaoPessoas: "diagnostics.create",
  DiagnosticoMA3: "diagnostics.create",
  ResultadoMA3: "diagnostics.view",
  AutoavaliacaoMA3: "diagnostics.create",
  CentralAvaliacoes: "diagnostics.view",
  HistoricoDiagnosticos: "diagnostics.view",
  DiagnosticoRiscos: "diagnostics.view",
  DashboardTempoAtencao: "admin.audit",

  // Pessoas / Colaboradores
  Colaboradores: "employees.view",
  CadastroColaborador: "employees.create",
  ConvidarColaborador: "employees.create",
  DetalhesColaborador: "employees.view",
  DescricaoCargos: "employees.view",
  CriarDescricaoCargo: "employees.create",
  EditarDescricaoCargo: "employees.edit",
  PortalColaborador: "public_authenticated",
  MeuPerfil: "public_authenticated",
  CDCList: "employees.cdc",
  CDCForm: "employees.cdc",
  RelatorioCDC: "employees.cdc",
  AnalisesRH: "employees.view",
  MonitoramentoRH: "employees.view",
  Feedbacks: "employees.feedback",
  PesquisaClima: "employees.climate",
  ResponderPesquisaClima: "public_authenticated",
  ResultadoClima: "employees.climate",
  Autoavaliacoes: "employees.view",
  Organograma: "employees.view",
  OrganogramaFuncional: "employees.view",
  GestaoRoles: "admin.rbac",
  GerenciarRoles: "admin.rbac",
  DocumentacaoRBAC: "admin.rbac",

  // Processos
  GerenciarProcessos: "processes.manage",
  ManualProcessos: "processes.view",
  MeusProcessos: "processes.view",
  VisualizarProcesso: "processes.view",

  // Treinamentos
  AcademiaTreinamento: "training.view",
  GerenciarTreinamentos: "training.manage",
  MeusTreinamentos: "public_authenticated",
  AssistirCurso: "public_authenticated",
  AssistirAula: "public_authenticated",
  ConfiguracaoAcademia: "training.manage",

  // Gamificação
  Gamificacao: "public_authenticated",
  RankingBrasil: "public_authenticated",
  Desafios: "public_authenticated",

  // Gestão
  Dashboard: "dashboard.view",
  PainelMetas: "goals.view",
  DesdobramentoMeta: "goals.create",
  HistoricoMetas: "goals.view",
  PainelAcoes: "actions.view",
  Tarefas: "tasks.view",
  RegistroDiario: "productivity.view",
  QGPBoard: "qgp.view",
  TechnicianQGP: "qgp.technician",
  DicasOperacao: "qgp.view",
  IAAnalytics: "analytics.view",
  RelatoriosAvancados: "analytics.view",
  RelatoriosInteligencia: "analytics.view",
  Clientes: "clients.view",
  ClientRegistration: null,
  CadastroSucesso: null,

  // Aceleração / Consultoria
  ControleAceleracao: "aceleracao.view",
  AcessoAceleracao: "aceleracao.view",
  PainelClienteAceleracao: "aceleracao.view",
  RelatoriosAceleracao: "aceleracao.view",
  CronogramaAculturacao: "aceleracao.view",
  CronogramaImplementacao: "aceleracao.view",
  CronogramaGeral: "aceleracao.view",
  CronogramaDetalhado: "aceleracao.view",
  RegistrarAtendimento: "aceleracao.create",
  AvaliarAtendimento: "aceleracao.create",
  MeuAgendamento: "public_authenticated",
  CentralFollowUp: "aceleracao.view",
  CentralProximosPassos: "aceleracao.view",
  ProximosPassosConsultoria: "aceleracao.view",
  ConsultoriaGlobal: "aceleracao.view",
  ListagemClientesSprints: "aceleracao.view",

  // Financeiro
  DRETCMP2: "financeiro.view",
  DreMockup: "financeiro.view",
  DashboardFinanceiro: "financeiro.view",
  ContasReceber: "financeiro.view",
  ContasPagar: "financeiro.view",
  ConciliacaoBancaria: "financeiro.view",
  RelatoriosAnuais: "financeiro.view",
  GerenciarSubcategorias: "admin.financeiro",
  CorrigirParcelasDuplicadas: "admin.financeiro",
  BackfillSaldosHistoricos: "admin.financeiro",

  // Planos
  Planos: "public_authenticated",
  BemVindoPlanos: "public_authenticated",
  MeuPlano: "public_authenticated",
  CadastroPlanos: "admin",

  // Primeiros Acessos
  PrimeiroAcesso: null,
  Cadastro: null,
  CompletarPerfil: "public_authenticated",

  // Páginas públicas (sem permissão necessária)
  PrimeiroAcesso: null,
  Cadastro: null,
  ClientRegistration: null,

  // Página pública para autenticados (qualquer usuário logado pode acessar)
  MeuPerfil: "public_authenticated",
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