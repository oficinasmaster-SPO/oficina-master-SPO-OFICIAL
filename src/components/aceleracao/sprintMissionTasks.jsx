/**
 * Tarefas padrão por missão e fase.
 * Quando um sprint é criado para uma missão específica,
 * essas tarefas são usadas em vez das genéricas.
 */

const GENERIC_PHASE_TASKS = {
  Planning: [
    "Revisar diagnóstico e prioridades",
    "Definir objetivo claro do sprint",
    "Listar entregáveis mensuráveis",
    "Distribuir tarefas e prazos",
  ],
  Execution: [
    "Assistir treinamentos da missão",
    "Implementar ferramentas e processos",
    "Executar tarefas priorizadas",
    "Registrar progresso na plataforma",
  ],
  Monitoring: [
    "Check-in: o que foi feito",
    "Medir resultados parciais",
    "Identificar bloqueios",
    "Ajustar tarefas se necessário",
  ],
  Review: [
    "Apresentar entregáveis concluídos",
    "Medir KPIs vs meta do sprint",
    "Validar com o cliente os resultados",
    "Documentar conquistas",
  ],
  Retrospective: [
    "O que funcionou bem?",
    "O que precisa melhorar?",
    "Quais ajustes fazer no processo?",
    "Planejar próximo sprint",
  ],
};

const MISSION_PHASE_TASKS = {
  agenda_cheia: {
    Planning: [
      "Levantar a base de clientes dos últimos 12 meses",
      "Filtrar clientes com mais de 90 dias sem retorno",
      "Classificar clientes por recorrência (recorrentes vs não-recorrentes)",
      "Definir oferta de reativação (Kit Master ou equivalente)",
      "Definir responsável pela execução (SDR/Vendedor)",
      "Validar capacitação dos treinamentos",
      "Montar agenda semanal com metas de contato",
    ],
    Execution: [
      "Iniciar ligações e mensagens para base de clientes inativos",
      "Agendar clientes para a semana corrente",
      "Aplicar script de reativação padronizado",
      "Registrar cada contato no controle de agendamento",
      "Acompanhar taxa de agendamento vs meta diária",
      "Garantir confirmação de agendamento no dia anterior",
    ],
    Monitoring: [
      "Verificar taxa de ocupação da agenda semanal",
      "Medir quantidade de clientes agendados vs entregues",
      "Analisar taxa de no-show e motivos",
      "Revisar performance do responsável pela execução",
      "Identificar bloqueios no processo de agendamento",
      "Ajustar script ou oferta se taxa de conversão estiver baixa",
    ],
    Review: [
      "Apresentar resultados: agendamentos realizados vs meta",
      "Calcular taxa de ocupação atingida",
      "Medir faturamento gerado pelos clientes reativados",
      "Comparar ticket médio dos reativados vs novos clientes",
      "Documentar aprendizados e boas práticas",
    ],
    Retrospective: [
      "O que funcionou na abordagem de reativação?",
      "Quais objeções mais frequentes dos clientes?",
      "O que precisa melhorar no script/processo?",
      "Quais ajustes para o próximo ciclo de agendamento?",
      "Planejar manutenção da agenda cheia",
    ],
  },
  fechamento_imbativel: {
    Planning: [
      "Mapear processo atual de vendas (do orçamento ao fechamento)",
      "Identificar taxa de conversão atual de orçamentos",
      "Definir meta de taxa de fechamento para o sprint",
      "Revisar scripts de venda e negociação existentes",
      "Identificar principais objeções dos clientes",
      "Definir responsáveis pelo acompanhamento de orçamentos",
      "Preparar material de apoio (tabela de preços, comparativos)",
    ],
    Execution: [
      "Treinar equipe no novo script de fechamento",
      "Implementar follow-up sistemático de orçamentos pendentes",
      "Aplicar técnicas de ancoragem e comparação de valor",
      "Registrar cada orçamento e status no controle",
      "Praticar simulações de fechamento com a equipe",
      "Implementar checklist pré-entrega do veículo",
    ],
    Monitoring: [
      "Acompanhar taxa de conversão diária de orçamentos",
      "Verificar tempo médio entre orçamento e fechamento",
      "Medir quantidade de follow-ups realizados",
      "Identificar orçamentos perdidos e motivos",
      "Analisar performance individual dos vendedores",
      "Ajustar abordagem conforme resultados parciais",
    ],
    Review: [
      "Apresentar taxa de fechamento atingida vs meta",
      "Calcular incremento de faturamento gerado",
      "Analisar quais técnicas tiveram maior impacto",
      "Comparar performance antes e depois do sprint",
      "Documentar os scripts e processos que funcionaram",
    ],
    Retrospective: [
      "O que mais impactou na taxa de fechamento?",
      "Quais objeções ainda não foram superadas?",
      "O que precisa ser ajustado no processo de venda?",
      "Como manter a disciplina de follow-up?",
      "Planejar evolução contínua do fechamento",
    ],
  },
  caixa_forte: {
    Planning: [
      "Levantar fluxo de caixa dos últimos 3 meses",
      "Identificar principais saídas e custos fixos",
      "Mapear inadimplência e contas a receber pendentes",
      "Definir meta de margem de lucro para o sprint",
      "Revisar precificação atual dos serviços",
      "Identificar oportunidades de redução de custos",
      "Definir controles financeiros a implementar",
    ],
    Execution: [
      "Implementar controle diário de caixa",
      "Revisar e ajustar precificação com base no TCMP²",
      "Iniciar cobrança ativa de inadimplentes",
      "Negociar prazos com fornecedores estratégicos",
      "Implementar aprovação prévia para compras acima do limite",
      "Treinar equipe sobre importância do controle financeiro",
    ],
    Monitoring: [
      "Verificar saldo de caixa vs projeção semanal",
      "Medir margem de lucro realizada vs meta",
      "Acompanhar evolução da inadimplência",
      "Conferir aderência ao novo controle de compras",
      "Identificar desvios no fluxo de caixa",
      "Ajustar projeções conforme resultados reais",
    ],
    Review: [
      "Apresentar evolução do fluxo de caixa",
      "Calcular margem de lucro atingida vs meta",
      "Medir redução de inadimplência alcançada",
      "Analisar impacto da nova precificação",
      "Documentar controles implementados",
    ],
    Retrospective: [
      "O que mais impactou na saúde financeira?",
      "Quais custos ainda precisam ser otimizados?",
      "O controle diário está sendo mantido?",
      "Quais ajustes na precificação são necessários?",
      "Planejar manutenção da disciplina financeira",
    ],
  },
  empresa_organizada: {
    Planning: [
      "Mapear processos atuais da oficina (fluxo de trabalho)",
      "Identificar gargalos operacionais principais",
      "Definir prioridade de processos a padronizar",
      "Levantar ferramentas e sistemas em uso",
      "Definir indicadores operacionais a acompanhar",
      "Estabelecer meta de produtividade do sprint",
      "Designar responsáveis por cada área/processo",
    ],
    Execution: [
      "Documentar processos prioritários (fluxogramas)",
      "Implementar checklist de recebimento de veículos",
      "Criar padrão de ordem de serviço completa",
      "Organizar layout da oficina para eficiência",
      "Implementar quadro de controle visual (Kanban/painel)",
      "Treinar equipe nos novos processos padronizados",
    ],
    Monitoring: [
      "Verificar aderência aos novos processos",
      "Medir tempo médio de atendimento/serviço",
      "Acompanhar produtividade dos técnicos",
      "Identificar resistências e dificuldades da equipe",
      "Conferir qualidade das ordens de serviço",
      "Ajustar processos conforme feedback prático",
    ],
    Review: [
      "Apresentar processos documentados e implementados",
      "Medir ganho de produtividade alcançado",
      "Analisar redução de retrabalho/erros",
      "Comparar tempo médio antes e depois",
      "Documentar padrões operacionais aprovados",
    ],
    Retrospective: [
      "O que mais contribuiu para a organização?",
      "Quais processos ainda precisam de ajuste?",
      "A equipe está seguindo os novos padrões?",
      "Quais ferramentas fizeram mais diferença?",
      "Planejar melhoria contínua dos processos",
    ],
  },
  funcoes_claras: {
    Planning: [
      "Mapear organograma atual da empresa",
      "Identificar sobreposições e lacunas de função",
      "Definir cargos e responsabilidades prioritários",
      "Levantar competências necessárias por cargo",
      "Avaliar maturidade atual dos colaboradores",
      "Definir meta de clareza organizacional do sprint",
      "Preparar templates de descrição de cargo",
    ],
    Execution: [
      "Criar/atualizar descrição de cada cargo",
      "Definir indicadores por função (KPIs individuais)",
      "Implementar organograma visual na oficina",
      "Comunicar responsabilidades a cada colaborador",
      "Implementar rituais de alinhamento por área",
      "Treinar líderes sobre gestão de equipe",
    ],
    Monitoring: [
      "Verificar se cada colaborador conhece suas responsabilidades",
      "Medir adesão aos indicadores individuais",
      "Acompanhar conflitos de função e sobreposições",
      "Avaliar efetividade dos rituais de alinhamento",
      "Identificar necessidades de treinamento",
      "Ajustar descrições conforme feedback prático",
    ],
    Review: [
      "Apresentar organograma e descrições finalizados",
      "Medir melhoria na clareza organizacional",
      "Analisar impacto na produtividade por área",
      "Validar indicadores individuais com a equipe",
      "Documentar estrutura organizacional aprovada",
    ],
    Retrospective: [
      "O que mais ajudou na clareza de funções?",
      "Quais resistências surgiram da equipe?",
      "Há funções que ainda precisam de ajuste?",
      "Os rituais estão funcionando?",
      "Planejar evolução da estrutura organizacional",
    ],
  },
  contratacao_certa: {
    Planning: [
      "Mapear necessidades atuais de contratação",
      "Definir perfil ideal para cada vaga em aberto",
      "Levantar canais de recrutamento disponíveis",
      "Criar/revisar processo seletivo estruturado",
      "Definir critérios de avaliação (DISC, maturidade)",
      "Preparar roteiro de entrevista padronizado",
      "Definir meta de contratação do sprint",
    ],
    Execution: [
      "Publicar vagas nos canais definidos",
      "Triar currículos conforme critérios do perfil",
      "Aplicar diagnósticos (DISC e maturidade) nos candidatos",
      "Realizar entrevistas estruturadas",
      "Aplicar testes práticos quando aplicável",
      "Implementar onboarding estruturado para novos",
    ],
    Monitoring: [
      "Acompanhar funil de recrutamento (candidatos por etapa)",
      "Medir tempo médio do processo seletivo",
      "Avaliar qualidade dos candidatos por canal",
      "Verificar aderência dos novos ao perfil ideal",
      "Acompanhar adaptação dos contratados (primeiros 30 dias)",
      "Ajustar processo conforme resultados",
    ],
    Review: [
      "Apresentar contratações realizadas vs meta",
      "Analisar qualidade das contratações (fit cultural)",
      "Medir efetividade dos canais de recrutamento",
      "Avaliar processo de onboarding implementado",
      "Documentar processo seletivo padronizado",
    ],
    Retrospective: [
      "O que funcionou melhor no recrutamento?",
      "Quais dificuldades no processo seletivo?",
      "O onboarding está sendo efetivo?",
      "Quais ajustes para futuras contratações?",
      "Planejar manutenção do pipeline de talentos",
    ],
  },
  cultura_forte: {
    Planning: [
      "Diagnosticar cultura atual da empresa",
      "Definir missão, visão e valores (se não existirem)",
      "Identificar comportamentos desejados vs praticados",
      "Mapear rituais e tradições existentes",
      "Definir pilares culturais prioritários",
      "Planejar ações de fortalecimento cultural",
      "Definir meta de engajamento do sprint",
    ],
    Execution: [
      "Comunicar/reforçar missão, visão e valores com equipe",
      "Implementar rituais de cultura (reunião semanal, celebrações)",
      "Criar manual de cultura/código de conduta",
      "Treinar líderes como guardiões da cultura",
      "Implementar reconhecimento por comportamentos desejados",
      "Criar canal de feedback e sugestões",
    ],
    Monitoring: [
      "Medir engajamento da equipe nos rituais",
      "Verificar aderência aos valores no dia a dia",
      "Coletar feedback dos colaboradores",
      "Identificar conflitos culturais e resistências",
      "Avaliar impacto da cultura no clima organizacional",
      "Ajustar ações conforme feedback recebido",
    ],
    Review: [
      "Apresentar evolução do engajamento da equipe",
      "Analisar adesão aos rituais implementados",
      "Medir impacto no clima e satisfação",
      "Validar manual de cultura com a equipe",
      "Documentar práticas culturais consolidadas",
    ],
    Retrospective: [
      "O que mais impactou na cultura da empresa?",
      "Quais rituais funcionaram melhor?",
      "Há resistências que persistem?",
      "O que precisa evoluir na cultura?",
      "Planejar manutenção e evolução cultural",
    ],
  },
  chefe_patio: {
    Planning: [
      "Criar e documentar a descrição de cargo do chefe de pátio (funções, metas, responsabilidades)",
      "Definir e formalizar o COEX (Contrato de Expectativa) entre dono e líder",
      "Aplicar o CDC (Conexão e Diagnóstico do Colaborador) para entender o perfil do líder",
      "Estabelecer metas de produção, faturamento e produtividade do pátio",
      "Apresentar o conceito e responsabilidade sobre o GPS de Vendas (120 pontos)",
      "Definir os KPIs principais (taxa de aprovação, ticket médio, produtividade, tempo de entrega)",
      "Direcionar o líder para treinamento de liderança e gestão (com rotina mensal)",
      "Criar o roteiro da rotina diária do chefe de pátio (abertura, acompanhamento, fechamento + checkpoint diário)",
    ],
    Execution: [
      "Implementar o ABGD (Abertura Baseada em Gestão de Dados) — revisão de números e projeção diária",
      "Realizar RPM diária (Reunião de 10 minutos) com foco em meta, números e prioridades",
      "Executar o acompanhamento ativo dos veículos em andamento",
      "Garantir aplicação prática do GPS de Vendas em todos os check-ups",
      "Monitorar a taxa de conversão de orçamentos e agir imediatamente nas perdas",
      "Acompanhar a produtividade individual da equipe e corrigir desvios em tempo real",
      "Garantir ritmo operacional com foco em intensidade, produtividade e resultado",
    ],
    Monitoring: [
      "Conferir se as RPMs estão acontecendo diariamente",
      "Validar se os números estão sendo acompanhados e atualizados diariamente",
      "Verificar se o GPS de Vendas está sendo aplicado corretamente (120 pontos)",
      "Analisar evolução da taxa de aprovação e geração de oportunidades",
      "Avaliar se o líder está com postura ativa (liderando) ou reativa (apagando incêndio)",
    ],
    Review: [
      "Acompanhar semanalmente os indicadores de desempenho da operação",
      "Realizar one-on-one semanal com o chefe de pátio",
      "Analisar gargalos que impactam produtividade e faturamento",
      "Validar se o processo está sendo seguido com consistência pela equipe",
      "Garantir que o líder está focado em resultado e não apenas operação",
      "Realizar RL semanal (Reunião de Liderança)",
      "Comparar resultados vs metas da semana",
      "Identificar falhas na execução e comportamento do líder",
      "Ajustar metas, direcionamento e prioridades",
    ],
    Retrospective: [
      "Ajustar processos para aumento de produtividade e eficiência operacional",
      "Reforçar a cultura de ritmo, energia e pressão por resultado",
      "Aplicar e atualizar o PDI (Plano de Desenvolvimento Individual) do líder",
      "Medir evolução do líder e impacto direto nos resultados da oficina",
    ],
  },
  sprint0: {
    Planning: [
      "Apresentação do programa de consultoria",
      "Coletar informações básicas da oficina",
      "Aplicar diagnóstico empresarial completo",
      "Mapear faturamento e indicadores atuais",
      "Identificar as 3 principais dores do proprietário",
      "Definir prioridades de atuação",
      "Alinhar expectativas e compromissos mútuos",
    ],
    Execution: [
      "Analisar resultados do diagnóstico",
      "Montar plano de ação inicial baseado nas prioridades",
      "Configurar ferramentas da plataforma para o cliente",
      "Cadastrar equipe e estrutura organizacional",
      "Definir trilha de missões personalizada",
      "Realizar primeira reunião de alinhamento com a equipe",
    ],
    Monitoring: [
      "Verificar se todos os dados foram coletados corretamente",
      "Confirmar acesso da equipe à plataforma",
      "Validar entendimento do proprietário sobre o programa",
      "Verificar disponibilidade para os próximos atendimentos",
      "Identificar riscos ou impedimentos iniciais",
    ],
    Review: [
      "Apresentar diagnóstico consolidado ao proprietário",
      "Validar prioridades e trilha proposta",
      "Confirmar calendário de atendimentos",
      "Documentar linha de base (indicadores iniciais)",
    ],
    Retrospective: [
      "O onboarding foi claro para o cliente?",
      "Há dúvidas que precisam ser esclarecidas?",
      "O que podemos melhorar no processo inicial?",
      "Próximos passos estão claros para todos?",
    ],
  },
};

/**
 * Retorna as tarefas padrão para uma fase de um sprint.
 * Se houver tarefas específicas para a missão, usa essas.
 * Caso contrário, usa as genéricas.
 */
export function getDefaultTasksForPhase(missionId, phaseName) {
  const missionTasks = MISSION_PHASE_TASKS[missionId];
  if (missionTasks && missionTasks[phaseName]) {
    return missionTasks[phaseName].map(desc => ({ description: desc, status: "to_do" }));
  }
  const genericTasks = GENERIC_PHASE_TASKS[phaseName];
  if (genericTasks) {
    return genericTasks.map(desc => ({ description: desc, status: "to_do" }));
  }
  return [];
}

/**
 * Retorna as fases padrão completas para um sprint de uma missão.
 */
export function getDefaultPhasesForMission(missionId) {
  return ["Planning", "Execution", "Monitoring", "Review", "Retrospective"].map(name => ({
    name,
    status: "not_started",
    notes: "",
    metrics: [],
    tasks: getDefaultTasksForPhase(missionId, name),
  }));
}

export { GENERIC_PHASE_TASKS, MISSION_PHASE_TASKS };