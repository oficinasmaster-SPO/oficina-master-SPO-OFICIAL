/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AcademiaTreinamento from './pages/AcademiaTreinamento';
import AcessoAceleracao from './pages/AcessoAceleracao';
import AcompanhamentoTreinamento from './pages/AcompanhamentoTreinamento';
import AdminDesafios from './pages/AdminDesafios';
import AdminMensagens from './pages/AdminMensagens';
import AdminNotificacoes from './pages/AdminNotificacoes';
import AdminProdutividade from './pages/AdminProdutividade';
import AnalisesRH from './pages/AnalisesRH';
import AprovarColaboradores from './pages/AprovarColaboradores';
import AssistirAula from './pages/AssistirAula';
import AssistirCurso from './pages/AssistirCurso';
import AuditLogs from './pages/AuditLogs';
import AuditoriaPermissoes from './pages/AuditoriaPermissoes';
import AutoavaliacaoComercial from './pages/AutoavaliacaoComercial';
import AutoavaliacaoDISC from './pages/AutoavaliacaoDISC';
import AutoavaliacaoDesempenho from './pages/AutoavaliacaoDesempenho';
import AutoavaliacaoEmpresarial from './pages/AutoavaliacaoEmpresarial';
import AutoavaliacaoFinanceiro from './pages/AutoavaliacaoFinanceiro';
import AutoavaliacaoMA3 from './pages/AutoavaliacaoMA3';
import AutoavaliacaoMarketing from './pages/AutoavaliacaoMarketing';
import AutoavaliacaoMaturidade from './pages/AutoavaliacaoMaturidade';
import AutoavaliacaoPessoas from './pages/AutoavaliacaoPessoas';
import AutoavaliacaoVendas from './pages/AutoavaliacaoVendas';
import Autoavaliacoes from './pages/Autoavaliacoes';
import AvaliarAtendimento from './pages/AvaliarAtendimento';
import CDCForm from './pages/CDCForm';
import CDCList from './pages/CDCList';
import CESPECanal from './pages/CESPECanal';
import CESPEEntrevista from './pages/CESPEEntrevista';
import CESPEIntegracao from './pages/CESPEIntegracao';
import CESPEProposta from './pages/CESPEProposta';
import CESPESonho from './pages/CESPESonho';
import COEXForm from './pages/COEXForm';
import COEXList from './pages/COEXList';
import Cadastro from './pages/Cadastro';
import CadastroColaborador from './pages/CadastroColaborador';
import CadastroPlanos from './pages/CadastroPlanos';
import CadastroSucesso from './pages/CadastroSucesso';
import CadastroUsuarioDireto from './pages/CadastroUsuarioDireto';
import ChatGestorOficina from './pages/ChatGestorOficina';
import ChatQGPTecnico from './pages/ChatQGPTecnico';
import ClientRegistration from './pages/ClientRegistration';
import Clientes from './pages/Clientes';
import Colaboradores from './pages/Colaboradores';
import ConfiguracaoAcademia from './pages/ConfiguracaoAcademia';
import ConfiguracaoPermissoesGranulares from './pages/ConfiguracaoPermissoesGranulares';
import ConfiguracoesNotificacao from './pages/ConfiguracoesNotificacao';
import ConsolidadoMensal from './pages/ConsolidadoMensal';
import ControleAceleracao from './pages/ControleAceleracao';
import ConvidarColaborador from './pages/ConvidarColaborador';
import CriarDescricaoCargo from './pages/CriarDescricaoCargo';
import CriarRitualMAP from './pages/CriarRitualMAP';
import CronogramaAculturacao from './pages/CronogramaAculturacao';
import CronogramaConsultoria from './pages/CronogramaConsultoria';
import CronogramaDetalhado from './pages/CronogramaDetalhado';
import CronogramaGeral from './pages/CronogramaGeral';
import CronogramaImplementacao from './pages/CronogramaImplementacao';
import CulturaOrganizacional from './pages/CulturaOrganizacional';
import DRETCMP2 from './pages/DRETCMP2';
import Dashboard from './pages/Dashboard';
import DashboardFinanceiro from './pages/DashboardFinanceiro';
import DashboardOverview from './pages/DashboardOverview';
import DescricoesCargo from './pages/DescricoesCargo';
import DesdobramentoMeta from './pages/DesdobramentoMeta';
import DesesosCliente from './pages/DesesosCliente';
import DetalhesColaborador from './pages/DetalhesColaborador';
import DiagnosticoCarga from './pages/DiagnosticoCarga';
import DiagnosticoComercial from './pages/DiagnosticoComercial';
import DiagnosticoDISC from './pages/DiagnosticoDISC';
import DiagnosticoDesempenho from './pages/DiagnosticoDesempenho';
import DiagnosticoEmpresario from './pages/DiagnosticoEmpresario';
import DiagnosticoEndividamento from './pages/DiagnosticoEndividamento';
import DiagnosticoGerencial from './pages/DiagnosticoGerencial';
import DiagnosticoMaturidade from './pages/DiagnosticoMaturidade';
import DiagnosticoOS from './pages/DiagnosticoOS';
import DiagnosticoPlano from './pages/DiagnosticoPlano';
import DiagnosticoProducao from './pages/DiagnosticoProducao';
import DicasOperacao from './pages/DicasOperacao';
import DocumentacaoCompleta from './pages/DocumentacaoCompleta';
import DocumentacaoRBAC from './pages/DocumentacaoRBAC';
import DoresAtivas from './pages/DoresAtivas';
import DuvidasCliente from './pages/DuvidasCliente';
import EditarDescricaoCargo from './pages/EditarDescricaoCargo';
import EvidenceUpload from './pages/EvidenceUpload';
import EvolucoesCliente from './pages/EvolucoesCliente';
import Feedbacks from './pages/Feedbacks';
import Gamificacao from './pages/Gamificacao';
import GerenciarAula from './pages/GerenciarAula';
import GerenciarChecklists from './pages/GerenciarChecklists';
import GerenciarGruposClientes from './pages/GerenciarGruposClientes';
import GerenciarModulo from './pages/GerenciarModulo';
import GerenciarModulosCurso from './pages/GerenciarModulosCurso';
import GerenciarPlanos from './pages/GerenciarPlanos';
import GerenciarProcessos from './pages/GerenciarProcessos';
import GerenciarRoles from './pages/GerenciarRoles';
import GerenciarToursVideos from './pages/GerenciarToursVideos';
import GerenciarTreinamentos from './pages/GerenciarTreinamentos';
import GestaoContratos from './pages/GestaoContratos';
import GestaoDesafios from './pages/GestaoDesafios';
import GestaoOficina from './pages/GestaoOficina';
import GestaoRBAC from './pages/GestaoRBAC';
import GestaoRoles from './pages/GestaoRoles';
import GestaoUsuariosEmpresas from './pages/GestaoUsuariosEmpresas';
import GraficosProducao from './pages/GraficosProducao';
import Historico from './pages/Historico';
import HistoricoDISC from './pages/HistoricoDISC';
import HistoricoDesempenho from './pages/HistoricoDesempenho';
import HistoricoMaturidade from './pages/HistoricoMaturidade';
import HistoricoMetas from './pages/HistoricoMetas';
import Home from './pages/Home';
import IAAnalytics from './pages/IAAnalytics';
import Integracoes from './pages/Integracoes';
import IntelligenciaCliente from './pages/IntelligenciaCliente';
import LogsAuditoriaRBAC from './pages/LogsAuditoriaRBAC';
import ManualProcessos from './pages/ManualProcessos';
import MapaChecklists from './pages/MapaChecklists';
import MeuPerfil from './pages/MeuPerfil';
import MeuPlano from './pages/MeuPlano';
import MeusProcessos from './pages/MeusProcessos';
import MeusTreinamentos from './pages/MeusTreinamentos';
import MissaoVisaoValores from './pages/MissaoVisaoValores';
import MonitoramentoRH from './pages/MonitoramentoRH';
import MonitoramentoUsuarios from './pages/MonitoramentoUsuarios';
import Notificacoes from './pages/Notificacoes';
import Organograma from './pages/Organograma';
import OrganogramaFuncional from './pages/OrganogramaFuncional';
import PainelAcoes from './pages/PainelAcoes';
import PainelClienteAceleracao from './pages/PainelClienteAceleracao';
import PainelMetas from './pages/PainelMetas';
import PesquisaClima from './pages/PesquisaClima';
import PlanoAcao from './pages/PlanoAcao';
import Planos from './pages/Planos';
import PortalColaborador from './pages/PortalColaborador';
import PrimeiroAcesso from './pages/PrimeiroAcesso';
import PublicFeedback from './pages/PublicFeedback';
import QGPBoard from './pages/QGPBoard';
import Questionario from './pages/Questionario';
import RankingBrasil from './pages/RankingBrasil';
import Regimento from './pages/Regimento';
import RegistrarAtendimento from './pages/RegistrarAtendimento';
import RegistroDiario from './pages/RegistroDiario';
import RelatorioUsuario from './pages/RelatorioUsuario';
import RelatoriosAceleracao from './pages/RelatoriosAceleracao';
import RelatoriosAvancados from './pages/RelatoriosAvancados';
import RelatoriosInteligencia from './pages/RelatoriosInteligencia';
import RepositorioDocumentos from './pages/RepositorioDocumentos';
import ResponderDISC from './pages/ResponderDISC';
import ResponderMaturidade from './pages/ResponderMaturidade';
import ResponderPesquisaClima from './pages/ResponderPesquisaClima';
import Resultado from './pages/Resultado';
import ResultadoAutoavaliacao from './pages/ResultadoAutoavaliacao';
import ResultadoCarga from './pages/ResultadoCarga';
import ResultadoClima from './pages/ResultadoClima';
import ResultadoDISC from './pages/ResultadoDISC';
import ResultadoDesempenho from './pages/ResultadoDesempenho';
import ResultadoEmpresario from './pages/ResultadoEmpresario';
import ResultadoEndividamento from './pages/ResultadoEndividamento';
import ResultadoMaturidade from './pages/ResultadoMaturidade';
import ResultadoOS from './pages/ResultadoOS';
import ResultadoProducao from './pages/ResultadoProducao';
import RiscosCliente from './pages/RiscosCliente';
import Rituais from './pages/Rituais';
import RituaisAculturamento from './pages/RituaisAculturamento';
import SelecionarDiagnostico from './pages/SelecionarDiagnostico';
import SolicitarPermissoes from './pages/SolicitarPermissoes';
import Tarefas from './pages/Tarefas';
import TechnicianQGP from './pages/TechnicianQGP';
import TestUsuarios from './pages/TestUsuarios';
import TesteClickSign from './pages/TesteClickSign';
import TesteOpenAI from './pages/TesteOpenAI';
import TreinamentoVendas from './pages/TreinamentoVendas';
import UsuariosAdmin from './pages/UsuariosAdmin';
import VisualizarProcesso from './pages/VisualizarProcesso';
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
    "AprovarColaboradores": AprovarColaboradores,
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
    "ChatGestorOficina": ChatGestorOficina,
    "ChatQGPTecnico": ChatQGPTecnico,
    "ClientRegistration": ClientRegistration,
    "Clientes": Clientes,
    "Colaboradores": Colaboradores,
    "ConfiguracaoAcademia": ConfiguracaoAcademia,
    "ConfiguracaoPermissoesGranulares": ConfiguracaoPermissoesGranulares,
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
    "TestUsuarios": TestUsuarios,
    "TesteClickSign": TesteClickSign,
    "TesteOpenAI": TesteOpenAI,
    "TreinamentoVendas": TreinamentoVendas,
    "UsuariosAdmin": UsuariosAdmin,
    "VisualizarProcesso": VisualizarProcesso,
}

export const pagesConfig = {
    mainPage: "CadastroColaborador",
    Pages: PAGES,
    Layout: __Layout,
};