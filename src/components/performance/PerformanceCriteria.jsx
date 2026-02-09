export const technicalCriteria = [
  { id: "conhece_funcao", text: "Conhece a função que executa e sabe o que fazer" },
  { id: "atinge_resultados", text: "Atinge os resultados desejados" },
  { id: "baixo_retrabalho", text: "Possui um alto índice de acerto e baixo retrabalho" },
  { id: "trabalha_alto_nivel", text: "Procura trabalhar consistentemente num alto nível na sua função" },
  { id: "toma_decisoes", text: "Toma decisões apropriadas quando necessário" },
  { id: "contribui_ideias", text: "Contribui com ideias e sugestões para melhoria na sua função" },
  { id: "produz_qualidade", text: "Produz na quantidade e na qualidade certas" },
  { id: "prioridade_certa", text: "Prioridade certa no momento certo" },
  { id: "sistemas_eficientes", text: "Tem práticas e sistemas eficientes para o seu trabalho individual" },
  { id: "transmite_informacoes", text: "Transmite as informações importantes aos outros de maneira eficiente" },
  { id: "cumpre_compromissos", text: "Cumpre todos os compromissos" },
  { id: "informa_impossibilidades", text: "Informa aos outros quando não terá condições de cumprir uma promessa" },
  { id: "da_recebe_feedback", text: "É habilidoso ao dar e receber feedbacks sobre desempenho" },
  { id: "excede_expectativas", text: "Procura exceder as expectativas dos clientes sempre que possível" },
  { id: "busca_conhecimento", text: "Busca conhecimento e atualização constantemente" },
  { id: "compreende_tecnologias", text: "Compreende bem as tecnologias de trabalho atuais e futuras" },
  { id: "desenvolvimento_profissional", text: "Assume a responsabilidade pelo próprio desenvolvimento profissional" }
];

export const emotionalCriteria = [
  { id: "autoconfianca", text: "Autoconfiança: ter um sólido senso do próprio valor, capacidades e potencial" },
  { id: "autocontrole", text: "Autocontrole emocional: mantém emoções e impulsos destrutivos sob controle" },
  { id: "superacao", text: "Superação: possui ímpeto para melhorar o desempenho a fim de satisfazer padrões interiores de excelência" },
  { id: "iniciativa", text: "Iniciativa: está sempre pronto para agir e aproveitar oportunidades" },
  { id: "transparencia", text: "Transparência e Credibilidade: é honesto e íntegro, digno de confiança" },
  { id: "flexibilidade", text: "Flexibilidade: tem flexibilidade na adaptação a pessoas com estilo diferente, a situações voláteis ou na maneira de pensar" },
  { id: "otimismo", text: "Otimismo: vê o lado bom dos acontecimentos em qualquer situação" },
  { id: "empatia", text: "Empatia: percebe as emoções alheias, compreende seus pontos de vista e se interessa ativamente pelas preocupações dos outros" },
  { id: "servico", text: "Serviço: reconhece e satisfaz as necessidades dos subordinados e clientes, servindo-os e ajudando-os a melhorar" },
  { id: "lideranca", text: "Liderança inspiradora: orienta e motiva, com uma visão instigante, conduzindo pessoas a objetivos de ganhos mútuos" },
  { id: "influencia", text: "Influência: dispõe da capacidade de persuadir e influenciar pessoas" },
  { id: "gerenciamento_conflitos", text: "Gerenciamento de conflitos: soluciona divergências entre pessoas, levando-as à integração e à aceitação mútua" },
  { id: "trabalho_equipe", text: "Trabalho em equipe: conquista a colaboração e o trabalho em equipe, com alto desempenho" }
];

export const classificationRules = {
  demissao: {
    condition: (tech, emo) => tech < 5.0 && emo < 5.0,
    title: "Demissão",
    color: "red",
    description: "Desempenho técnico e emocional abaixo do mínimo aceitável",
    recommendation: "O colaborador apresenta desempenho insatisfatório tanto em competências técnicas quanto emocionais. Recomenda-se avaliar a possibilidade de desligamento ou um plano intensivo de recuperação com metas claras e prazo definido."
  },
  treinamento_tecnico: {
    condition: (tech, emo) => tech < 7.0 && emo >= 7.0,
    title: "Treinamento Técnico",
    color: "orange",
    description: "Necessita desenvolver habilidades técnicas",
    recommendation: "O colaborador demonstra boas competências emocionais, mas precisa desenvolver suas habilidades técnicas. Invista em treinamentos específicos, mentorias e acompanhamento próximo para elevar o nível técnico."
  },
  treinamento_emocional: {
    condition: (tech, emo) => tech >= 7.0 && emo < 7.0,
    title: "Treinamento Emocional",
    color: "yellow",
    description: "Necessita desenvolver competências emocionais",
    recommendation: "O colaborador tem bom desempenho técnico, mas precisa trabalhar aspectos comportamentais e emocionais. Considere coaching, feedback estruturado e desenvolvimento de soft skills."
  },
  observacao: {
    condition: (tech, emo) => (tech >= 5.0 && tech < 7.0) && (emo >= 5.0 && emo < 7.0),
    title: "Observação",
    color: "blue",
    description: "Desempenho mediano, requer acompanhamento",
    recommendation: "O colaborador está em fase de desenvolvimento. Mantenha acompanhamento regular, estabeleça metas claras e ofereça suporte para evolução tanto técnica quanto comportamental."
  },
  reconhecimento: {
    condition: (tech, emo) => (tech >= 7.0 && tech < 9.0) && (emo >= 7.0 && emo < 9.0),
    title: "Reconhecimento",
    color: "green",
    description: "Desempenho satisfatório, atende expectativas",
    recommendation: "O colaborador apresenta bom desempenho em ambas as áreas. Reconheça publicamente seus resultados, ofereça desafios para continuar crescendo e mantenha-o motivado."
  },
  investimento: {
    condition: (tech, emo) => tech >= 9.0 && emo >= 9.0,
    title: "Investimento/Promoção",
    color: "purple",
    description: "Excelência em desempenho, candidato a promoção",
    recommendation: "Colaborador de alto desempenho e referência na equipe. Considere promoções, aumento de responsabilidades, projetos estratégicos e programas de retenção de talentos."
  }
};

export function calculateClassification(technicalAvg, emotionalAvg) {
  for (const [key, rule] of Object.entries(classificationRules)) {
    if (rule.condition(technicalAvg, emotionalAvg)) {
      return {
        classification: key,
        ...rule
      };
    }
  }
  return {
    classification: "observacao",
    ...classificationRules.observacao
  };
}