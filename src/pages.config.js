import Home from './pages/Home';
import Questionario from './pages/Questionario';
import Resultado from './pages/Resultado';
import PlanoAcao from './pages/PlanoAcao';
import Historico from './pages/Historico';
import Dashboard from './pages/Dashboard';
import Notificacoes from './pages/Notificacoes';
import Cadastro from './pages/Cadastro';
import DiagnosticoEmpresario from './pages/DiagnosticoEmpresario';
import ResultadoEmpresario from './pages/ResultadoEmpresario';
import DiagnosticoMaturidade from './pages/DiagnosticoMaturidade';
import ResultadoMaturidade from './pages/ResultadoMaturidade';
import DiagnosticoProducao from './pages/DiagnosticoProducao';
import ResultadoProducao from './pages/ResultadoProducao';
import DiagnosticoDesempenho from './pages/DiagnosticoDesempenho';
import ResultadoDesempenho from './pages/ResultadoDesempenho';
import DiagnosticoCarga from './pages/DiagnosticoCarga';
import ResultadoCarga from './pages/ResultadoCarga';
import DiagnosticoOS from './pages/DiagnosticoOS';
import ResultadoOS from './pages/ResultadoOS';
import DiagnosticoDISC from './pages/DiagnosticoDISC';
import ResultadoDISC from './pages/ResultadoDISC';
import Clientes from './pages/Clientes';
import Colaboradores from './pages/Colaboradores';
import Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Questionario": Questionario,
    "Resultado": Resultado,
    "PlanoAcao": PlanoAcao,
    "Historico": Historico,
    "Dashboard": Dashboard,
    "Notificacoes": Notificacoes,
    "Cadastro": Cadastro,
    "DiagnosticoEmpresario": DiagnosticoEmpresario,
    "ResultadoEmpresario": ResultadoEmpresario,
    "DiagnosticoMaturidade": DiagnosticoMaturidade,
    "ResultadoMaturidade": ResultadoMaturidade,
    "DiagnosticoProducao": DiagnosticoProducao,
    "ResultadoProducao": ResultadoProducao,
    "DiagnosticoDesempenho": DiagnosticoDesempenho,
    "ResultadoDesempenho": ResultadoDesempenho,
    "DiagnosticoCarga": DiagnosticoCarga,
    "ResultadoCarga": ResultadoCarga,
    "DiagnosticoOS": DiagnosticoOS,
    "ResultadoOS": ResultadoOS,
    "DiagnosticoDISC": DiagnosticoDISC,
    "ResultadoDISC": ResultadoDISC,
    "Clientes": Clientes,
    "Colaboradores": Colaboradores,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: Layout,
};