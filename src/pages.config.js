/**
 * pages.config.js - Page routing configuration with code-splitting
 * 
 * All pages are loaded via React.lazy() for automatic code-splitting.
 * The Vite bundler creates separate chunks per page.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 */
import { lazy } from 'react';

// Code-split imports: Each page loads only when accessed
const AcademiaTreinamento = lazy(() => import('./pages/AcademiaTreinamento'));
const AcessoAceleracao = lazy(() => import('./pages/AcessoAceleracao'));
const AcompanhamentoTreinamento = lazy(() => import('./pages/AcompanhamentoTreinamento'));
const AdminDesafios = lazy(() => import('./pages/AdminDesafios'));
const AdminMensagens = lazy(() => import('./pages/AdminMensagens'));
const AdminNotificacoes = lazy(() => import('./pages/AdminNotificacoes'));
const AdminProdutividade = lazy(() => import('./pages/AdminProdutividade'));
const AnalisesRH = lazy(() => import('./pages/AnalisesRH'));
const AssistirAula = lazy(() => import('./pages/AssistirAula'));
const AssistirCurso = lazy(() => import('./pages/AssistirCurso'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const AuditoriaPermissoes = lazy(() => import('./pages/AuditoriaPermissoes'));
const AutoavaliacaoComercial = lazy(() => import('./pages/AutoavaliacaoComercial'));
const AutoavaliacaoDISC = lazy(() => import('./pages/AutoavaliacaoDISC'));
const AutoavaliacaoDesempenho = lazy(() => import('./pages/AutoavaliacaoDesempenho'));
const AutoavaliacaoEmpresarial = lazy(() => import('./pages/AutoavaliacaoEmpresarial'));
const AutoavaliacaoFinanceiro = lazy(() => import('./pages/AutoavaliacaoFinanceiro'));
const AutoavaliacaoMA3 = lazy(() => import('./pages/AutoavaliacaoMA3'));
const AutoavaliacaoMarketing = lazy(() => import('./pages/AutoavaliacaoMarketing'));
const AutoavaliacaoMaturidade = lazy(() => import('./pages/AutoavaliacaoMaturidade'));
const AutoavaliacaoPessoas = lazy(() => import('./pages/AutoavaliacaoPessoas'));
const AutoavaliacaoVendas = lazy(() => import('./pages/AutoavaliacaoVendas'));
const Autoavaliacoes = lazy(() => import('./pages/Autoavaliacoes'));
const AvaliarAtendimento = lazy(() => import('./pages/AvaliarAtendimento'));
const CDCForm = lazy(() => import('./pages/CDCForm'));
const CDCList = lazy(() => import('./pages/CDCList'));
const CESPECanal = lazy(() => import('./pages/CESPECanal'));
const CESPEEntrevista = lazy(() => import('./pages/CESPEEntrevista'));
const CESPEIntegracao = lazy(() => import('./pages/CESPEIntegracao'));
const CESPEProposta = lazy(() => import('./pages/CESPEProposta'));
const CESPESonho = lazy(() => import('./pages/CESPESonho'));
const COEXForm = lazy(() => import('./pages/COEXForm'));
const COEXList = lazy(() => import('./pages/COEXList'));
const Cadastro = lazy(() => import('./pages/Cadastro'));
const CadastroColaborador = lazy(() => import('./pages/CadastroColaborador'));
const CadastroPlanos = lazy(() => import('./pages/CadastroPlanos'));
const CadastroSucesso = lazy(() => import('./pages/CadastroSucesso'));
const CadastroUsuarioDireto = lazy(() => import('./pages/CadastroUsuarioDireto'));
const CalendarioEventos = lazy(() => import('./pages/CalendarioEventos'));
const ChatGestorOficina = lazy(() => import('./pages/ChatGestorOficina'));
const ChatQGPTecnico = lazy(() => import('./pages/ChatQGPTecnico'));
const ClientRegistration = lazy(() => import('./pages/ClientRegistration'));
const Clientes = lazy(() => import('./pages/Clientes'));
const Colaboradores = lazy(() => import('./pages/Colaboradores'));
const ConfiguracaoAcademia = lazy(() => import('./pages/ConfiguracaoAcademia'));
const ConfiguracaoPermissoesGranulares = lazy(() => import('./pages/ConfiguracaoPermissoesGranulares'));
const ConfiguracoesKiwify = lazy(() => import('./pages/ConfiguracoesKiwify'));
const ConfiguracoesNotificacao = lazy(() => import('./pages/ConfiguracoesNotificacao'));
const ConsolidadoMensal = lazy(() => import('./pages/ConsolidadoMensal'));
const ControleAceleracao = lazy(() => import('./pages/ControleAceleracao'));
const ConvidarColaborador = lazy(() => import('./pages/ConvidarColaborador'));
const CriarDescricaoCargo = lazy(() => import('./pages/CriarDescricaoCargo'));
const CriarRitualMAP = lazy(() => import('./pages/CriarRitualMAP'));
const CronogramaAculturacao = lazy(() => import('./pages/CronogramaAculturacao'));
const CronogramaConsultoria = lazy(() => import('./pages/CronogramaConsultoria'));
const CronogramaDetalhado = lazy(() => import('./pages/CronogramaDetalhado'));
const CronogramaGeral = lazy(() => import('./pages/CronogramaGeral'));
const CronogramaImplementacao = lazy(() => import('./pages/CronogramaImplementacao'));
const CulturaOrganizacional = lazy(() => import('./pages/CulturaOrganizacional'));
const DRETCMP2 = lazy(() => import('./pages/DRETCMP2'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DashboardFinanceiro = lazy(() => import('./pages/DashboardFinanceiro'));
const DashboardOverview = lazy(() => import('./pages/DashboardOverview'));
const DescricoesCargo = lazy(() => import('./pages/DescricoesCargo'));
const DesdobramentoMeta = lazy(() => import('./pages/DesdobramentoMeta'));
const DesesosCliente = lazy(() => import('./pages/DesesosCliente'));
const DetalhesColaborador = lazy(() => import('./pages/DetalhesColaborador'));
const DiagnosticoCarga = lazy(() => import('./pages/DiagnosticoCarga'));
const DiagnosticoComercial = lazy(() => import('./pages/DiagnosticoComercial'));
const DiagnosticoDISC = lazy(() => import('./pages/DiagnosticoDISC'));
const DiagnosticoDesempenho = lazy(() => import('./pages/DiagnosticoDesempenho'));
const DiagnosticoEmpresario = lazy(() => import('./pages/DiagnosticoEmpresario'));
const DiagnosticoEndividamento = lazy(() => import('./pages/DiagnosticoEndividamento'));
const DiagnosticoGerencial = lazy(() => import('./pages/DiagnosticoGerencial'));
const DiagnosticoMaturidade = lazy(() => import('./pages/DiagnosticoMaturidade'));
const DiagnosticoOS = lazy(() => import('./pages/DiagnosticoOS'));
const DiagnosticoPlano = lazy(() => import('./pages/DiagnosticoPlano'));
const DiagnosticoProducao = lazy(() => import('./pages/DiagnosticoProducao'));
const DicasOperacao = lazy(() => import('./pages/DicasOperacao'));
const DocumentacaoCompleta = lazy(() => import('./pages/DocumentacaoCompleta'));
const DocumentacaoRBAC = lazy(() => import('./pages/DocumentacaoRBAC'));
const DoresAtivas = lazy(() => import('./pages/DoresAtivas'));
const DuvidasCliente = lazy(() => import('./pages/DuvidasCliente'));
const EditarDescricaoCargo = lazy(() => import('./pages/EditarDescricaoCargo'));
const EvidenceUpload = lazy(() => import('./pages/EvidenceUpload'));
const EvolucoesCliente = lazy(() => import('./pages/EvolucoesCliente'));
const Feedbacks = lazy(() => import('./pages/Feedbacks'));
const Gamificacao = lazy(() => import('./pages/Gamificacao'));
const GerenciarAula = lazy(() => import('./pages/GerenciarAula'));
const GerenciarChecklists = lazy(() => import('./pages/GerenciarChecklists'));
const GerenciarGruposClientes = lazy(() => import('./pages/GerenciarGruposClientes'));
const GerenciarModulo = lazy(() => import('./pages/GerenciarModulo'));
const GerenciarModulosCurso = lazy(() => import('./pages/GerenciarModulosCurso'));
const GerenciarPlanos = lazy(() => import('./pages/GerenciarPlanos'));
const GerenciarProcessos = lazy(() => import('./pages/GerenciarProcessos'));
const GerenciarRoles = lazy(() => import('./pages/GerenciarRoles'));
const GerenciarToursVideos = lazy(() => import('./pages/GerenciarToursVideos'));
const GerenciarTreinamentos = lazy(() => import('./pages/GerenciarTreinamentos'));
const GestaoContratos = lazy(() => import('./pages/GestaoContratos'));
const GestaoDesafios = lazy(() => import('./pages/GestaoDesafios'));
const GestaoOficina = lazy(() => import('./pages/GestaoOficina'));
const GestaoRBAC = lazy(() => import('./pages/GestaoRBAC'));
const GestaoRoles = lazy(() => import('./pages/GestaoRoles'));
const GestaoUsuariosEmpresas = lazy(() => import('./pages/GestaoUsuariosEmpresas'));
const GraficosProducao = lazy(() => import('./pages/GraficosProducao'));
const Historico = lazy(() => import('./pages/Historico'));
const HistoricoDISC = lazy(() => import('./pages/HistoricoDISC'));
const HistoricoDesempenho = lazy(() => import('./pages/HistoricoDesempenho'));
const HistoricoMaturidade = lazy(() => import('./pages/HistoricoMaturidade'));
const HistoricoMetas = lazy(() => import('./pages/HistoricoMetas'));
const Home = lazy(() => import('./pages/Home'));
const IAAnalytics = lazy(() => import('./pages/IAAnalytics'));
const Integracoes = lazy(() => import('./pages/Integracoes'));
const IntelligenciaCliente = lazy(() => import('./pages/IntelligenciaCliente'));
const LogsAuditoriaRBAC = lazy(() => import('./pages/LogsAuditoriaRBAC'));
const ManualProcessos = lazy(() => import('./pages/ManualProcessos'));
const MapaChecklists = lazy(() => import('./pages/MapaChecklists'));
const MeuPerfil = lazy(() => import('./pages/MeuPerfil'));
const MeuPlano = lazy(() => import('./pages/MeuPlano'));
const MeusProcessos = lazy(() => import('./pages/MeusProcessos'));
const MeusTreinamentos = lazy(() => import('./pages/MeusTreinamentos'));
const MissaoVisaoValores = lazy(() => import('./pages/MissaoVisaoValores'));
const MonitoramentoRH = lazy(() => import('./pages/MonitoramentoRH'));
const MonitoramentoUsuarios = lazy(() => import('./pages/MonitoramentoUsuarios'));
const Notificacoes = lazy(() => import('./pages/Notificacoes'));
const Organograma = lazy(() => import('./pages/Organograma'));
const OrganogramaFuncional = lazy(() => import('./pages/OrganogramaFuncional'));
const PainelAcoes = lazy(() => import('./pages/PainelAcoes'));
const PainelClienteAceleracao = lazy(() => import('./pages/PainelClienteAceleracao'));
const PainelMetas = lazy(() => import('./pages/PainelMetas'));
const PesquisaClima = lazy(() => import('./pages/PesquisaClima'));
const PlanoAcao = lazy(() => import('./pages/PlanoAcao'));
const Planos = lazy(() => import('./pages/Planos'));
const PortalColaborador = lazy(() => import('./pages/PortalColaborador'));
const PrimeiroAcesso = lazy(() => import('./pages/PrimeiroAcesso'));
const PublicFeedback = lazy(() => import('./pages/PublicFeedback'));
const QGPBoard = lazy(() => import('./pages/QGPBoard'));
const Questionario = lazy(() => import('./pages/Questionario'));
const RankingBrasil = lazy(() => import('./pages/RankingBrasil'));
const Regimento = lazy(() => import('./pages/Regimento'));
const RegistrarAtendimento = lazy(() => import('./pages/RegistrarAtendimento'));
const RegistroDiario = lazy(() => import('./pages/RegistroDiario'));
const RelatorioCDC = lazy(() => import('./pages/RelatorioCDC'));
const RelatorioUsuario = lazy(() => import('./pages/RelatorioUsuario'));
const RelatoriosAceleracao = lazy(() => import('./pages/RelatoriosAceleracao'));
const RelatoriosAvancados = lazy(() => import('./pages/RelatoriosAvancados'));
const RelatoriosInteligencia = lazy(() => import('./pages/RelatoriosInteligencia'));
const RepositorioDocumentos = lazy(() => import('./pages/RepositorioDocumentos'));
const ResponderDISC = lazy(() => import('./pages/ResponderDISC'));
const ResponderMaturidade = lazy(() => import('./pages/ResponderMaturidade'));
const ResponderPesquisaClima = lazy(() => import('./pages/ResponderPesquisaClima'));
const Resultado = lazy(() => import('./pages/Resultado'));
const ResultadoAutoavaliacao = lazy(() => import('./pages/ResultadoAutoavaliacao'));
const ResultadoCarga = lazy(() => import('./pages/ResultadoCarga'));
const ResultadoClima = lazy(() => import('./pages/ResultadoClima'));
const ResultadoDISC = lazy(() => import('./pages/ResultadoDISC'));
const ResultadoDesempenho = lazy(() => import('./pages/ResultadoDesempenho'));
const ResultadoEmpresario = lazy(() => import('./pages/ResultadoEmpresario'));
const ResultadoEndividamento = lazy(() => import('./pages/ResultadoEndividamento'));
const ResultadoMaturidade = lazy(() => import('./pages/ResultadoMaturidade'));
const ResultadoOS = lazy(() => import('./pages/ResultadoOS'));
const ResultadoProducao = lazy(() => import('./pages/ResultadoProducao'));
const RiscosCliente = lazy(() => import('./pages/RiscosCliente'));
const Rituais = lazy(() => import('./pages/Rituais'));
const RituaisAculturamento = lazy(() => import('./pages/RituaisAculturamento'));
const SelecionarDiagnostico = lazy(() => import('./pages/SelecionarDiagnostico'));
const SolicitarPermissoes = lazy(() => import('./pages/SolicitarPermissoes'));
const Tarefas = lazy(() => import('./pages/Tarefas'));
const TechnicianQGP = lazy(() => import('./pages/TechnicianQGP'));
const TreinamentoVendas = lazy(() => import('./pages/TreinamentoVendas'));
const UsuariosAdmin = lazy(() => import('./pages/UsuariosAdmin'));
const VisualizarProcesso = lazy(() => import('./pages/VisualizarProcesso'));
const GestaoTenants = lazy(() => import('./pages/GestaoTenants'));
const GestaoEmpresas = lazy(() => import('./pages/GestaoEmpresas'));
const PublicNPS = lazy(() => import('./pages/PublicNPS'));
const PublicDISC = lazy(() => import('./pages/PublicDISC'));
import __Layout from './Layout.jsx';

export const PAGES = {
    "AcademiaTreinamento": AcademiaTreinamento,
    "AcessoAceleracao": AcessoAceleracao,
    "AcompanhamentoTreinamento": AcompanhamentoTreinamento,
    "AdminDesafios": AdminDesafios,
    "AdminMensagens": AdminMensagens,
    "AdminNotificacoes": AdminNotificacoes,
    "AdminProdutividade": AdminProdutividade,
    "AnalisesRH": AnalisesRH,
    "AssistirAula": AssistirAula,
    "AssistirCurso": AssistirCurso,
    "AuditLogs": AuditLogs,
    "AuditoriaPermissoes": AuditoriaPermissoes,
    "AutoavaliacaoComercial": AutoavaliacaoComercial,
    "AutoavaliacaoDISC": AutoavaliacaoDISC,
    "AutoavaliacaoDesempenho": AutoavaliacaoDesempenho,
    "AutoavaliacaoEmpresarial": AutoavaliacaoEmpresarial,
    "AutoavaliacaoFinanceiro": AutoavaliacaoFinanceiro,
    "AutoavaliacaoMA3": AutoavaliacaoMA3,
    "AutoavaliacaoMarketing": AutoavaliacaoMarketing,
    "AutoavaliacaoMaturidade": AutoavaliacaoMaturidade,
    "AutoavaliacaoPessoas": AutoavaliacaoPessoas,
    "AutoavaliacaoVendas": AutoavaliacaoVendas,
    "Autoavaliacoes": Autoavaliacoes,
    "AvaliarAtendimento": AvaliarAtendimento,
    "CDCForm": CDCForm,
    "CDCList": CDCList,
    "CESPECanal": CESPECanal,
    "CESPEEntrevista": CESPEEntrevista,
    "CESPEIntegracao": CESPEIntegracao,
    "CESPEProposta": CESPEProposta,
    "CESPESonho": CESPESonho,
    "COEXForm": COEXForm,
    "COEXList": COEXList,
    "Cadastro": Cadastro,
    "CadastroColaborador": CadastroColaborador,
    "CadastroPlanos": CadastroPlanos,
    "CadastroSucesso": CadastroSucesso,
    "CadastroUsuarioDireto": CadastroUsuarioDireto,
    "CalendarioEventos": CalendarioEventos,
    "ChatGestorOficina": ChatGestorOficina,
    "ChatQGPTecnico": ChatQGPTecnico,
    "ClientRegistration": ClientRegistration,
    "Clientes": Clientes,
    "Colaboradores": Colaboradores,
    "ConfiguracaoAcademia": ConfiguracaoAcademia,
    "ConfiguracaoPermissoesGranulares": ConfiguracaoPermissoesGranulares,
    "ConfiguracoesKiwify": ConfiguracoesKiwify,
    "ConfiguracoesNotificacao": ConfiguracoesNotificacao,
    "ConsolidadoMensal": ConsolidadoMensal,
    "ControleAceleracao": ControleAceleracao,
    "ConvidarColaborador": ConvidarColaborador,
    "CriarDescricaoCargo": CriarDescricaoCargo,
    "CriarRitualMAP": CriarRitualMAP,
    "CronogramaAculturacao": CronogramaAculturacao,
    "CronogramaConsultoria": CronogramaConsultoria,
    "CronogramaDetalhado": CronogramaDetalhado,
    "CronogramaGeral": CronogramaGeral,
    "CronogramaImplementacao": CronogramaImplementacao,
    "CulturaOrganizacional": CulturaOrganizacional,
    "DRETCMP2": DRETCMP2,
    "Dashboard": Dashboard,
    "DashboardFinanceiro": DashboardFinanceiro,
    "DashboardOverview": DashboardOverview,
    "DescricoesCargo": DescricoesCargo,
    "DesdobramentoMeta": DesdobramentoMeta,
    "DesesosCliente": DesesosCliente,
    "DetalhesColaborador": DetalhesColaborador,
    "DiagnosticoCarga": DiagnosticoCarga,
    "DiagnosticoComercial": DiagnosticoComercial,
    "DiagnosticoDISC": DiagnosticoDISC,
    "DiagnosticoDesempenho": DiagnosticoDesempenho,
    "DiagnosticoEmpresario": DiagnosticoEmpresario,
    "DiagnosticoEndividamento": DiagnosticoEndividamento,
    "DiagnosticoGerencial": DiagnosticoGerencial,
    "DiagnosticoMaturidade": DiagnosticoMaturidade,
    "DiagnosticoOS": DiagnosticoOS,
    "DiagnosticoPlano": DiagnosticoPlano,
    "DiagnosticoProducao": DiagnosticoProducao,
    "DicasOperacao": DicasOperacao,
    "DocumentacaoCompleta": DocumentacaoCompleta,
    "DocumentacaoRBAC": DocumentacaoRBAC,
    "DoresAtivas": DoresAtivas,
    "DuvidasCliente": DuvidasCliente,
    "EditarDescricaoCargo": EditarDescricaoCargo,
    "EvidenceUpload": EvidenceUpload,
    "EvolucoesCliente": EvolucoesCliente,
    "Feedbacks": Feedbacks,
    "Gamificacao": Gamificacao,
    "GerenciarAula": GerenciarAula,
    "GerenciarChecklists": GerenciarChecklists,
    "GerenciarGruposClientes": GerenciarGruposClientes,
    "GerenciarModulo": GerenciarModulo,
    "GerenciarModulosCurso": GerenciarModulosCurso,
    "GerenciarPlanos": GerenciarPlanos,
    "GerenciarProcessos": GerenciarProcessos,
    "GerenciarRoles": GerenciarRoles,
    "GerenciarToursVideos": GerenciarToursVideos,
    "GerenciarTreinamentos": GerenciarTreinamentos,
    "GestaoContratos": GestaoContratos,
    "GestaoDesafios": GestaoDesafios,
    "GestaoOficina": GestaoOficina,
    "GestaoRBAC": GestaoRBAC,
    "GestaoRoles": GestaoRoles,
    "GestaoUsuariosEmpresas": GestaoUsuariosEmpresas,
    "GraficosProducao": GraficosProducao,
    "Historico": Historico,
    "HistoricoDISC": HistoricoDISC,
    "HistoricoDesempenho": HistoricoDesempenho,
    "HistoricoMaturidade": HistoricoMaturidade,
    "HistoricoMetas": HistoricoMetas,
    "Home": Home,
    "IAAnalytics": IAAnalytics,
    "Integracoes": Integracoes,
    "IntelligenciaCliente": IntelligenciaCliente,
    "LogsAuditoriaRBAC": LogsAuditoriaRBAC,
    "ManualProcessos": ManualProcessos,
    "MapaChecklists": MapaChecklists,
    "MeuPerfil": MeuPerfil,
    "MeuPlano": MeuPlano,
    "MeusProcessos": MeusProcessos,
    "MeusTreinamentos": MeusTreinamentos,
    "MissaoVisaoValores": MissaoVisaoValores,
    "MonitoramentoRH": MonitoramentoRH,
    "MonitoramentoUsuarios": MonitoramentoUsuarios,
    "Notificacoes": Notificacoes,
    "Organograma": Organograma,
    "OrganogramaFuncional": OrganogramaFuncional,
    "PainelAcoes": PainelAcoes,
    "PainelClienteAceleracao": PainelClienteAceleracao,
    "PainelMetas": PainelMetas,
    "PesquisaClima": PesquisaClima,
    "PlanoAcao": PlanoAcao,
    "Planos": Planos,
    "PortalColaborador": PortalColaborador,
    "PrimeiroAcesso": PrimeiroAcesso,
    "PublicFeedback": PublicFeedback,
    "QGPBoard": QGPBoard,
    "Questionario": Questionario,
    "RankingBrasil": RankingBrasil,
    "Regimento": Regimento,
    "RegistrarAtendimento": RegistrarAtendimento,
    "RegistroDiario": RegistroDiario,
    "RelatorioCDC": RelatorioCDC,
    "RelatorioUsuario": RelatorioUsuario,
    "RelatoriosAceleracao": RelatoriosAceleracao,
    "RelatoriosAvancados": RelatoriosAvancados,
    "RelatoriosInteligencia": RelatoriosInteligencia,
    "RepositorioDocumentos": RepositorioDocumentos,
    "ResponderDISC": ResponderDISC,
    "ResponderMaturidade": ResponderMaturidade,
    "ResponderPesquisaClima": ResponderPesquisaClima,
    "Resultado": Resultado,
    "ResultadoAutoavaliacao": ResultadoAutoavaliacao,
    "ResultadoCarga": ResultadoCarga,
    "ResultadoClima": ResultadoClima,
    "ResultadoDISC": ResultadoDISC,
    "ResultadoDesempenho": ResultadoDesempenho,
    "ResultadoEmpresario": ResultadoEmpresario,
    "ResultadoEndividamento": ResultadoEndividamento,
    "ResultadoMaturidade": ResultadoMaturidade,
    "ResultadoOS": ResultadoOS,
    "ResultadoProducao": ResultadoProducao,
    "RiscosCliente": RiscosCliente,
    "Rituais": Rituais,
    "RituaisAculturamento": RituaisAculturamento,
    "SelecionarDiagnostico": SelecionarDiagnostico,
    "SolicitarPermissoes": SolicitarPermissoes,
    "Tarefas": Tarefas,
    "TechnicianQGP": TechnicianQGP,
    "TreinamentoVendas": TreinamentoVendas,
    "UsuariosAdmin": UsuariosAdmin,
    "VisualizarProcesso": VisualizarProcesso,
    "GestaoTenants": GestaoTenants,
    "GestaoEmpresas": GestaoEmpresas,
    "PublicNPS": PublicNPS,
    "PublicDISC": PublicDISC,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};