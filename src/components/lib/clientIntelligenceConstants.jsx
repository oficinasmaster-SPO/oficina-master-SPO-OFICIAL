// Constantes para o módulo de Inteligência do Cliente
// Estrutura: Áreas → Tipos → Subcategorias

export const INTELLIGENCE_AREAS = {
  vendas_conversao: {
    label: "Vendas & Conversão",
    icon: "TrendingUp",
    color: "bg-blue-100 text-blue-900",
    badgeColor: "bg-blue-600",
  },
  marketing_demanda: {
    label: "Marketing & Geração de Demanda",
    icon: "Megaphone",
    color: "bg-purple-100 text-purple-900",
    badgeColor: "bg-purple-600",
  },
  operacao_tecnica: {
    label: "Operação Técnica",
    icon: "Wrench",
    color: "bg-orange-100 text-orange-900",
    badgeColor: "bg-orange-600",
  },
  gestao_processos: {
    label: "Gestão & Processos",
    icon: "Workflow",
    color: "bg-green-100 text-green-900",
    badgeColor: "bg-green-600",
  },
  financeiro: {
    label: "Financeiro",
    icon: "DollarSign",
    color: "bg-emerald-100 text-emerald-900",
    badgeColor: "bg-emerald-600",
  },
  pessoas_contratacao: {
    label: "Pessoas & Contratação",
    icon: "Users",
    color: "bg-pink-100 text-pink-900",
    badgeColor: "bg-pink-600",
  },
  estoque_compras: {
    label: "Estoque & Compras",
    icon: "Package",
    color: "bg-indigo-100 text-indigo-900",
    badgeColor: "bg-indigo-600",
  },
  precificacao_margem: {
    label: "Precificação & Margem",
    icon: "Calculator",
    color: "bg-red-100 text-red-900",
    badgeColor: "bg-red-600",
  },
  atendimento_experiencia: {
    label: "Atendimento & Experiência",
    icon: "Smile",
    color: "bg-cyan-100 text-cyan-900",
    badgeColor: "bg-cyan-600",
  },
  lideranca_dono: {
    label: "Liderança & Dono",
    icon: "Crown",
    color: "bg-yellow-100 text-yellow-900",
    badgeColor: "bg-yellow-600",
  },
};

export const INTELLIGENCE_TYPES = {
  dor: {
    label: "🔴 Dor (problema ativo)",
    icon: "AlertCircle",
    color: "text-red-600",
    bgColor: "bg-red-50",
    badge: "bg-red-600",
    description: "Problema ativo",
  },
  duvida: {
    label: "🟡 Dúvida (falta de clareza)",
    icon: "HelpCircle",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    badge: "bg-yellow-600",
    description: "Falta de clareza",
  },
  desejo: {
    label: "🔵 Desejo (objetivo declarado)",
    icon: "Star",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    badge: "bg-blue-600",
    description: "Objetivo declarado",
  },
  risco: {
    label: "⚠️ Risco (potencial problema futuro)",
    icon: "AlertTriangle",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    badge: "bg-orange-600",
    description: "Potencial problema futuro",
  },
  evolucao: {
    label: "✅ Evolução (algo que melhorou)",
    icon: "CheckCircle",
    color: "text-green-600",
    bgColor: "bg-green-50",
    badge: "bg-green-600",
    description: "Algo que melhorou",
  },
};

export const SUBCATEGORIES = {
  vendas_conversao: [
    "Falta de fechamento",
    "Baixa taxa de aprovação de orçamento",
    "Vendedor inseguro",
    "Cliente pede desconto",
    "Orçamento mal explicado",
    "Ausência de follow-up",
  ],
  marketing_demanda: [
    "Poucos leads",
    "Lead desqualificado",
    "Dependência de indicação",
    "Campanha sem retorno",
    "Falta de oferta clara",
  ],
  operacao_tecnica: [
    "Retrabalho",
    "Diagnóstico errado",
    "Atraso na entrega",
    "Técnico sobrecarregado",
    "Falta de padrão técnico",
  ],
  gestao_processos: [
    "Falta de rotina",
    "Não acompanha indicadores",
    "Processos não documentados",
    "Decisão no improviso",
    "Falta de agenda gerencial",
  ],
  financeiro: [
    "Caixa apertado",
    "Mistura CPF e CNPJ",
    "Não sabe o lucro real",
    "Endividamento",
    "Falta de DRE",
  ],
  pessoas_contratacao: [
    "Falta de técnico",
    "Alta rotatividade",
    "Dono faz tudo",
    "Equipe desmotivada",
    "Falta de liderança",
  ],
  estoque_compras: [
    "Peça parada",
    "Falta de controle",
    "Compra errada",
    "Capital travado",
    "Dependência de fornecedor",
  ],
  precificacao_margem: [
    "Preço abaixo do ideal",
    "Não calcula margem",
    "Cobra errado mão de obra",
    "Medo de aumentar preço",
    "Concorrência pressiona preço",
  ],
  atendimento_experiencia: [
    "Cliente desconfiado",
    "Comunicação ruim",
    "Falta de padrão de atendimento",
    "Reclamações recorrentes",
    "Pós-venda inexistente",
  ],
  lideranca_dono: [
    "Falta de clareza de rumo",
    "Ansiedade",
    "Falta de tempo",
    "Medo de investir",
    "Resistência a mudança",
  ],
};

export const GRAVITY_LEVELS = {
  baixa: { label: "Baixa", color: "bg-blue-100 text-blue-800" },
  media: { label: "Média", color: "bg-yellow-100 text-yellow-800" },
  alta: { label: "Alta", color: "bg-orange-100 text-orange-800" },
  critica: { label: "Crítica", color: "bg-red-100 text-red-800" },
};

export const STATUS_OPTIONS = {
  ativo: { label: "Ativo", color: "bg-green-100 text-green-800" },
  em_progresso: { label: "Em Progresso", color: "bg-blue-100 text-blue-800" },
  resolvido: { label: "Resolvido", color: "bg-purple-100 text-purple-800" },
  arquivado: { label: "Arquivado", color: "bg-gray-100 text-gray-800" },
};