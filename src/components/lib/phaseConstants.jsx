// Constantes canônicas para diagnóstico de fase da oficina
// Mapeamento oficial: A=F1 Base, B=F2 Organização, C=F3 Tração, D=F4 Excelência

export const PHASE_LETTER_TO_NUMBER = {
  A: 1,
  B: 2,
  C: 3,
  D: 4
};

export const PHASE_INFO = {
  1: {
    code: 'F1',
    name: 'Base',
    fullName: 'F1 - Base',
    title: 'Sobrevivência e Geração de Caixa',
    shortTitle: 'Sobrevivência',
    description: 'Sua oficina está na fase inicial, focada em gerar lucro para consolidar o negócio. Nesta etapa, é fundamental trabalhar com foco em resultados imediatos, controlar custos rigorosamente e estabelecer uma base sólida de clientes.',
    color: 'from-red-500 to-orange-500',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    chartColor: '#ef4444'
  },
  2: {
    code: 'F2',
    name: 'Organização',
    fullName: 'F2 - Organização',
    title: 'Crescimento e Estruturação',
    shortTitle: 'Crescimento',
    description: 'Sua oficina está em crescimento! Já tem lucro razoável e agora precisa aumentar a equipe para continuar expandindo. É hora de contratar pessoas certas e começar a estruturar processos básicos de gestão.',
    color: 'from-yellow-500 to-amber-500',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
    chartColor: '#f59e0b'
  },
  3: {
    code: 'F3',
    name: 'Tração',
    fullName: 'F3 - Tração',
    title: 'Processos e Liderança',
    shortTitle: 'Organização',
    description: 'Sua oficina está ganhando tração! Você já tem uma equipe formada e agora precisa estabelecer processos claros, desenvolver liderança e criar indicadores para medir resultados. Foco em estruturação e eficiência.',
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    chartColor: '#3b82f6'
  },
  4: {
    code: 'F4',
    name: 'Excelência',
    fullName: 'F4 - Excelência',
    title: 'Consolidação e Escala',
    shortTitle: 'Consolidação',
    description: 'Parabéns! Sua oficina está consolidada no mercado. Você tem processos estabelecidos, equipe engajada e pode focar em planejamento estratégico de longo prazo. É hora de pensar em expansão e escala.',
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    chartColor: '#10b981'
  }
};

// Helper: converter letra para fase com informações completas
export const getPhaseFromLetter = (letter) => {
  const phaseNumber = PHASE_LETTER_TO_NUMBER[letter];
  return phaseNumber ? PHASE_INFO[phaseNumber] : null;
};

// Helper: obter informações da fase por número
export const getPhaseInfo = (phaseNumber) => {
  return PHASE_INFO[phaseNumber] || PHASE_INFO[1];
};

// Prioridade de desempate por severidade (mais crítico primeiro)
export const TIE_BREAK_PRIORITY = ['D', 'A', 'C', 'B'];

// Termos padronizados (UI vs Código)
export const TERMINOLOGY = {
  // UI (exibição ao usuário)
  UI: {
    TCMP2: 'TCMP²',
    R70_I30: 'R70/I30',
    GPS_VENDAS: 'GPS de Vendas',
    KIT_MASTER: 'Kit Master',
    PAVE_COMERCIAL: 'PAVE Comercial',
    PPV: 'PPV',
    PRE_DIAGNOSTICO: 'Pré-diagnóstico'
  },
  // Código/Entidades (campos de banco)
  CODE: {
    TCMP2: 'tcmp2',
    R70_I30: 'r70_i30',
    GPS_VENDAS: 'gps_vendas',
    KIT_MASTER: 'kit_master',
    PAVE_COMERCIAL: 'pave_commercial',
    PPV: 'ppv',
    PRE_DIAGNOSTICO: 'pre_diagnostico'
  }
};