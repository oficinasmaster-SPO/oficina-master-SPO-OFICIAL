
// Estrutura completa da sidebar para gestão de permissões
export const sidebarStructure = [
  {
    id: "dashboard",
    label: "Dashboard & Rankings",
    items: [
      { name: "Visão Geral", description: "Resumo da oficina" },
      { name: "Dashboard Nacional", description: "Métricas e rankings" },
      { name: "Desafios & Conquistas", description: "Gamificação" },
    ],
  },
  {
    id: "cadastros",
    label: "Cadastros (Base de Dados)",
    items: [
      { name: "Gestão da Oficina", description: "Dados gerais" },
      { name: "Organograma Estrutural", description: "Áreas e funções" },
      { name: "Organograma Funcional", description: "Pessoas e equipes" },
    ],
  },
  {
    id: "patio",
    label: "Pátio Operação (QGP)",
    items: [
      { name: "Tarefas Operacionais", description: "Gestão de tarefas" },
      { name: "Notificações", description: "Alertas e prazos" },
      { name: "Diário de Produção", description: "Registro diário" },
      { name: "Quadro Geral (TV)", description: "Visão aeroporto" },
      { name: "Minha Fila (Técnico)", description: "Painel executor" },
    ],
  },
  {
    id: "resultados",
    label: "Resultados (OS, Metas, Finanças)",
    items: [
      { name: "Histórico de Metas", description: "Relatórios" },
      { name: "Desdobramento de Metas", description: "Esforço e resultado" },
      { name: "DRE & TCMP²", description: "DRE mensal" },
      { name: "OS - R70/I30", description: "Rentabilidade OS" },
      { name: "Produção vs Salário", description: "Custo x produtividade" },
      { name: "Curva de Endividamento", description: "Análise 12 meses" },
      { name: "Diagnóstico Gerencial", description: "Análise de áreas" },
    ],
  },
  {
    id: "pessoas",
    label: "Pessoas & RH",
    items: [
      { name: "Mapas de Autoavaliação", description: "Autoavaliações" },
      { name: "Colaboradores", description: "Gestão de equipe" },
      { name: "Convidar Colaborador", description: "Envio de convites" },
      { name: "Aprovar Colaboradores", description: "Aprovar acessos pendentes" },
      { name: "CESPE - Contratação Inteligente", description: "Canal → Entrevista → Sonho → Proposta → Integração" },
      { name: "CDC", description: "Conexão do colaborador" },
      { name: "COEX", description: "Contrato expectativa" },
      { name: "Perfil do Empresário", description: "Teste de perfil" },
      { name: "Teste DISC", description: "Perfil comportamental" },
      { name: "Maturidade do Colaborador", description: "Nível maturidade" },
      { name: "Matriz de Desempenho", description: "Competências" },
      { name: "Carga de Trabalho", description: "Distribuição" },
    ],
  },
  {
    id: "diagnosticos",
    label: "Diagnósticos & IA",
    items: [
      { name: "IA Analytics", description: "Previsões e recomendações" },
      { name: "Treinamento de Vendas", description: "Cenários com IA" },
      { name: "Diagnóstico Comercial", description: "Processos comerciais" },
      { name: "Selecionar Diagnóstico", description: "Central" },
      { name: "Histórico", description: "Todos diagnósticos" },
    ],
  },
  {
    id: "processos",
    label: "Processos",
    items: [
      { name: "Meus Processos (MAPs)", description: "Biblioteca" },
    ],
  },
  {
    id: "manual",
    label: "Manual",
    items: [
      { name: "Manual de Processos", description: "Manual completo da empresa" },
    ],
  },
  {
    id: "documentos",
    label: "Documentos",
    items: [
      { name: "Repositório", description: "Central de documentos" },
    ],
  },
  {
    id: "cultura",
    label: "Cultura",
    items: [
      { name: "Manual da Cultura", description: "Pilares e rituais" },
      { name: "Regimento Interno", description: "Regulamento jurídico" },
      { name: "Missão, Visão e Valores", description: "Cultura org" },
      { name: "Rituais", description: "34 rituais" },
      { name: "Cronograma Aculturação", description: "Atividades" },
      { name: "Pesquisa de Clima", description: "Satisfação" },
    ],
  },
  {
    id: "treinamentos",
    label: "Treinamentos",
    items: [
      { name: "Gestão de Treinamentos", description: "Módulos e aulas" },
      { name: "Acompanhamento", description: "Progresso" },
      { name: "Meus Treinamentos", description: "Área do aluno" },
    ],
  },
  {
    id: "gestao",
    label: "Gestão da Operação",
    items: [
      { name: "Dicas da Operação", description: "Mural de avisos" },
      { name: "Criar Desafios", description: "Competições" },
    ],
  },
  {
    id: "inteligencia",
    label: "Inteligência do Cliente",
    items: [
      { name: "Mapa de Checklists", description: "Visualizar e gerenciar checklists" },
      { name: "Relatórios de Inteligência", description: "Análises e indicadores" },
    ],
  },
  {
    id: "aceleracao",
    label: "Aceleração",
    items: [
      { name: "Plano de Aceleração", description: "Plano mensal IA" },
      { name: "CheckPoint", description: "Progresso" },
      { name: "Controle", description: "Painel gestão" },
      { name: "Relatórios", description: "Diagnósticos" },
      { name: "Contratos", description: "Gestão de contratos" },
    ],
  },
  {
    id: "admin",
    label: "Administração",
    items: [
      { name: "Dashboard Financeiro", description: "Métricas financeiras e pagamentos" },
      { name: "Usuários", description: "Gerenciar usuários" },
      { name: "Monitoramento de Usuários", description: "Relatórios e atividades" },
      { name: "Gestão de Perfis", description: "Perfis e permissões" },
      { name: "Tela Inicial", description: "Widgets Home" },
      { name: "Permissões", description: "Controle de acesso" },
      { name: "Produtividade", description: "Métricas KPIs" },
      { name: "Desafios Globais", description: "Nível Brasil" },
      { name: "Planos", description: "Gerenciar planos" },
      { name: "Mensagens", description: "Templates" },
      { name: "Notificações", description: "Automação" },
      { name: "Clientes", description: "Painel admin" },
      { name: "Tours e Vídeos", description: "Ajuda" },
      { name: "Processos Admin", description: "Gestão MAPs" },
      { name: "Integrações", description: "Google Calendar & Meet" },
    ],
  },
];
