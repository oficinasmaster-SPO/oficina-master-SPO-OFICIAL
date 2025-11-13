import Home from './pages/Home';
import Questionario from './pages/Questionario';
import Resultado from './pages/Resultado';
import PlanoAcao from './pages/PlanoAcao';
import Historico from './pages/Historico';
import Dashboard from './pages/Dashboard';
import Notificacoes from './pages/Notificacoes';
import Cadastro from './pages/Cadastro';
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
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: Layout,
};