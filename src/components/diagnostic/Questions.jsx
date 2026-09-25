// Ordem de exibição V2 (embaralhada para melhor distribuição de temas)
// Mantém IDs estáveis para comparabilidade histórica
export const DISPLAY_ORDER_V2 = [1, 6, 2, 11, 5, 9, 4, 10, 3, 8, 12, 7];

// Cada alternativa tem sua fase (1=F1 Base, 2=F2 Organização, 3=F3 Tração, 4=F4 Excelência).
// As letras estão embaralhadas por pergunta: NUNCA derive a fase da letra, use option.phase.
export const questions = [
  {
    id: 1,
    question: "1.1 - Sua empresa em relação ao lucro já se percebe?",
    options: [
      { letter: "A", phase: 3, text: "Estabelecida já tem uma reserva financeira e precisa se preocupar mais com os processos, organizar as atividades para continuar lucrando." },
      { letter: "B", phase: 2, text: "Já consegue respirar e já sente falta de aumentar o time para continuar lucrando." },
      { letter: "C", phase: 4, text: "Está consolidada no mercado e pode focar e pensar em um planejamento a longo prazo." },
      { letter: "D", phase: 1, text: "Precisa trabalhar focada em gerar lucro para consolidar o negócio." }
    ]
  },
  {
    id: 2,
    question: "1.2 - Sua empresa hoje em relação a gestão de pessoas está?",
    options: [
      { letter: "A", phase: 2, text: "Está focando em contratar pessoal para aumentar o quadro de funcionários para continuar lucrando e crescendo." },
      { letter: "B", phase: 4, text: "Tem um bom quadro de funcionários, os processos já estão estabelecidos e aumentamos o lucro." },
      { letter: "C", phase: 3, text: "Tem um bom quadro de funcionários mas enfrenta conflitos frequentes e falta de organização." },
      { letter: "D", phase: 1, text: "Tem a mão de obra bem reduzida para dar conta do trabalho, todos (ou a maioria) acumulam várias funções para produzir resultado." }
    ]
  },
  {
    id: 3,
    question: "1.3 - Em relação a gestão onde sua empresa está focada atualmente?",
    options: [
      { letter: "A", phase: 3, text: "Está focada em organizar, estruturar as atividades e criar indicadores." },
      { letter: "B", phase: 2, text: "A gestão está focada mais em pessoas, para gerar engajamento na equipe." },
      { letter: "C", phase: 1, text: "A gestão está focada em controlar gastos e gerar mais lucros." },
      { letter: "D", phase: 4, text: "Está focada em acompanhar o planejamento estratégico." }
    ]
  },
  {
    id: 4,
    question: "1.4 - Na questão formação de liderança como está sua empresa hoje?",
    options: [
      { letter: "A", phase: 4, text: "A empresa já tem uma liderança estabelecida e em constante desenvolvimento para alcançar as metas do planejamento estratégico." },
      { letter: "B", phase: 1, text: "Não há tanta necessidade de trabalhar liderança, pois todos estão bastante envolvidos e ocupados em fazer suas atividades, não sobra tempo para pensar em liderança." },
      { letter: "C", phase: 3, text: "A empresa já tem um bom time e se faz necessário a liderança até para controlar os processos." },
      { letter: "D", phase: 2, text: "Com o aumento da equipe percebe-se a necessidade de começar a estabelecer e trabalhar liderança." }
    ]
  },
  {
    id: 5,
    question: "1.5 - Em relação aos processos como está sua empresa hoje?",
    options: [
      { letter: "A", phase: 2, text: "Temos um quadro bem reduzido de colaboradores e sentimos a necessidade de aumentar o time para executar todos os processos da empresa." },
      { letter: "B", phase: 4, text: "Nossos processos estão estabelecidos e controlamos os indicadores." },
      { letter: "C", phase: 3, text: "Já estamos com o time formado e precisamos organizar as atividades, estabelecendo a melhor maneira de realizá-las, de acordo com a necessidade do negócio." },
      { letter: "D", phase: 1, text: "Os processos são mais focados em vender e controlar custos pois ainda não temos saúde financeira." }
    ]
  },
  {
    id: 6,
    question: "1.6 - Qual você percebe que é o foco de sua empresa no momento?",
    options: [
      { letter: "A", phase: 2, text: "Já temos um lucro razoável e para crescer sentimos a necessidade de mais braços." },
      { letter: "B", phase: 4, text: "Temos um time engajado, os conflitos internos diminuíram muito e aumentamos os lucros." },
      { letter: "C", phase: 3, text: "Já temos um bom lucro e um time, mas estamos com reclamações de clientes e conflitos internos." },
      { letter: "D", phase: 1, text: "Precisamos gerar lucro para continuar com a empresa e atingirmos mais lucratividade." }
    ]
  },
  {
    id: 7,
    question: "1.7 - A direção da empresa hoje?",
    options: [
      { letter: "A", phase: 2, text: "Está focada em cuidar do time e percebe que precisa de novos talentos para a empresa crescer." },
      { letter: "B", phase: 1, text: "Só tem tempo para fazer e não para planejar a longo prazo." },
      { letter: "C", phase: 3, text: "Já temos bons talentos dentro da empresa mais ainda temos muitos conflitos internos." },
      { letter: "D", phase: 4, text: "Nosso time é engajado e funciona bem mesmo na ausência dos gestores." }
    ]
  },
  {
    id: 8,
    question: "1.8 - Já é possível descentralizar e delegar atividades?",
    options: [
      { letter: "A", phase: 4, text: "Tenho uma boa equipe e já delego grande parte das atividades, ficando somente com as funções gerenciais para o alcance do planejamento estabelecido." },
      { letter: "B", phase: 3, text: "Já delego as atividades necessárias para o meu time e consigo desenvolver mais o pessoal." },
      { letter: "C", phase: 2, text: "Já sinto uma grande necessidade de dividir as atividades e delegar algumas tarefas." },
      { letter: "D", phase: 1, text: "No momento tenho que ficar atento a tudo que acontece e exercer diversas funções." }
    ]
  },
  {
    id: 9,
    question: "1.9 - Como é a relação da empresa com os consumidores?",
    options: [
      { letter: "A", phase: 3, text: "Temos uma equipe formada, mas nossos clientes ainda reclamam muito de nosso atendimento e produto." },
      { letter: "B", phase: 4, text: "Já estabelecemos nossa cultura, marca e nossos clientes já nos identificam no mercado, temos índice de reclamações bem baixos." },
      { letter: "C", phase: 2, text: "Para atender a demanda que temos no momento se percebe que precisamos aumentar a equipe." },
      { letter: "D", phase: 1, text: "Estamos focados em buscar mais clientes e entregar o que vendemos." }
    ]
  },
  {
    id: 10,
    question: "1.10 - Como é a relação da empresa hoje com os funcionários?",
    options: [
      { letter: "A", phase: 1, text: "Temos poucos funcionários, um quadro bem reduzido, só para conseguir manter o negócio funcionando." },
      { letter: "B", phase: 2, text: "Já conseguimos aumentar um pouco a equipe e dividir algumas atividades." },
      { letter: "C", phase: 3, text: "Já temos um bom quadro de funcionários, que desempenham suas funções mais ainda com grande necessidade de intervenção da gerencia." },
      { letter: "D", phase: 4, text: "Os funcionários já se mostram independentes e os lideres já tem poder decisório." }
    ]
  },
  {
    id: 11,
    question: "1.11 - Qual é a estratégia da empresa no momento?",
    options: [
      { letter: "A", phase: 2, text: "De aumentar o time para gerar mais lucros, já perdemos negócio por falta de pessoal." },
      { letter: "B", phase: 1, text: "De gerar lucro para se manter no mercado." },
      { letter: "C", phase: 4, text: "Focar no planejamento estratégico para que a empresa cresça mais." },
      { letter: "D", phase: 3, text: "De diminuir o número de conflitos e reclamações." }
    ]
  },
  {
    id: 12,
    question: "1.12 - Como está a cultura da empresa no momento?",
    options: [
      { letter: "A", phase: 3, text: "Já temos uma equipe, mas ainda não conseguimos encontrar a melhor maneira de trabalhar para alcançar os resultados." },
      { letter: "B", phase: 2, text: "Já contamos com uma equipe formada, mas a missão da empresa não é clara para todos." },
      { letter: "C", phase: 1, text: "Não temos uma cultura estabelecida, ainda não temos um jeito de trabalhar, resolvemos os problemas conforme aparecem." },
      { letter: "D", phase: 4, text: "A missão, visão e valores da empresa já são bem claros para todos." }
    ]
  }
];

// Função auxiliar para obter perguntas na ordem de exibição
export const getQuestionsInDisplayOrder = () => {
  return DISPLAY_ORDER_V2.map(id => questions.find(q => q.id === id)).filter(Boolean);
};