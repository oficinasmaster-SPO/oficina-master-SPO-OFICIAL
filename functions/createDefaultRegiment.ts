import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const DEFAULT_REGIMENT = [
  {
    id: "1",
    number: "1.",
    title: "HORÁRIOS DE TRABALHO E JORNADA",
    content: "A jornada de trabalho dos colaboradores da empresa será de até 8 horas diárias e 44 horas semanais, conforme previsto no Art. 7º, XIII da Constituição Federal e Art. 58 da CLT.",
    subsections: [
      { id: "1.1", number: "1.1", content: "A jornada de trabalho dos colaboradores da empresa será de até 8 horas diárias e 44 horas semanais, conforme previsto no Art. 7º, XIII da Constituição Federal e Art. 58 da CLT. Regimes especiais poderão ser aplicados conforme a legislação vigente e as necessidades específicas da empresa." },
      { id: "1.1.1", number: "1.1.1", content: "Eventos SP – O colaborador será convidado para participação com antecedência de 3 dias, eventos que acontecem a nível Brasil. Esses eventos tem carga horária de 12 horas dia." },
      { id: "1.2", number: "1.2", content: "O registro de ponto será obrigatório para todos os colaboradores, devendo ser feito no sistema eletrônico da empresa. Será observada a tolerância máxima de 5 minutos por registro, respeitando o limite diário total de 10 minutos conforme Art. 58, §1º da CLT." },
      { id: "1.2.1", number: "1.2.1", content: "Atestados devem ser entregues em até 24h do afastamento." },
      { id: "1.2.2", number: "1.2.2", content: "Para consulta médicas periódicas ser avisado com no mínimo 7 dias de antecedência, salvo em caso de urgência." },
      { id: "1.3", number: "1.3", content: "O descumprimento das regras de registro poderá impactar na apuração da jornada e no pagamento das horas trabalhadas." },
      { id: "1.4", number: "1.4", content: "Os intervalos para refeição e descanso serão garantidos conforme o disposto no Art. 71 da CLT, sendo de, no mínimo, 1 hora para jornadas superiores a 6 horas e de 15 minutos para jornadas superiores a 4 horas e inferiores a 6 horas." },
      { id: "1.4.1", number: "1.4.1", content: "A reposição de horas somente será permitida mediante autorização prévia e expressa da Diretoria. Qualquer tentativa de compensação de jornada sem a devida autorização será considerada descumprimento das normas internas e poderá resultar em medidas disciplinares cabíveis." },
      { id: "1.5", number: "1.5", content: "O descumprimento das regras de horários e jornada poderá implicar medidas disciplinares, incluindo advertências, suspensões e, em casos graves, demissão por justa causa, conforme previsto na legislação vigente." },
      { id: "1.6", number: "1.6", content: "A empresa adota o sistema de banco de horas, conforme permitido pelo Art. 59 da CLT, mediante acordo individual escrito com o colaborador. As horas extras poderão ser compensadas no prazo máximo de 6 meses. Caso não haja compensação dentro desse período, as horas acumuladas serão pagas como extras, com os devidos adicionais legais." },
      { id: "1.6.1", number: "1.6.1", content: "Participação em Eventos – As horas despendidas em eventos organizados ou autorizados pela empresa, realizados fora da jornada regular de trabalho, serão consideradas como horas extras, desde que previamente autorizadas pela Diretoria." }
    ]
  },
  {
    id: "2",
    number: "2.",
    title: "FALTAS E ATRASOS",
    content: "Pontualidade e Assiduidade",
    subsections: [
      { id: "2.1", number: "2.1", content: "Os colaboradores deverão comparecer ao trabalho pontualmente e cumprir integralmente sua jornada diária, conforme o horário estipulado no contrato." },
      { id: "2.2", number: "2.2", content: "Pequenos atrasos de até 10 minutos diários serão tolerados, mas atrasos recorrentes ou acima deste limite poderão acarretar descontos salariais e medidas disciplinares." },
      { id: "2.3", number: "2.3", content: "São consideradas faltas justificadas aquelas previstas no art. 473 da CLT, como: casamento, falecimento de parentes, nascimento de filho, doação de sangue, entre outros, desde que comprovados por documento oficial." },
      { id: "2.3.1", number: "2.3.1", content: "3 dias de afastamento em caso de falecimento de: Cônjuge ou companheiro(a); Ascendente (pai, mãe, avós); Descendente (filho, neto); Irmão(ã); Pessoa que, declaradamente, viva sob sua dependência econômica." },
      { id: "2.3.2", number: "2.3.2", content: "Apresentar atestado em dia máximo 48 horas, desde que comunicado a ausência – pode ser apresentado por foto." },
      { id: "2.4", number: "2.4", content: "Ausências sem justificativa válidas poderão resultar em desconto proporcional no salário, perda do DSR, férias e aplicação de medidas disciplinares." },
      { id: "2.5", number: "2.5", content: "Toda ausência ou atraso deve ser comunicado previamente ou, na impossibilidade, justificado em até 48 horas após o ocorrido." }
    ]
  },
  {
    id: "3",
    number: "3.",
    title: "CONDUTA NO AMBIENTE DE TRABALHO",
    content: "A empresa preza por um ambiente de trabalho harmonioso, respeitoso e ético.",
    subsections: [
      { id: "3.1", number: "3.1", content: "Tratar colegas, superiores, subordinados e clientes com respeito e cordialidade." },
      { id: "3.2", number: "3.2", content: "Obedecer às ordens de serviço, desde que estejam contidas na lei e nas normas da empresa." },
      { id: "3.3", number: "3.3", content: "Preservar o patrimônio da empresa, utilizando os equipamentos e ferramentas com responsabilidade." },
      { id: "3.4", number: "3.4", content: "Manter sigilo absoluto sobre informações confidenciais da empresa e dos clientes." },
      { id: "3.5", number: "3.5", content: "Apresentar-se pontualmente ao trabalho e observar as normas de horário." },
      { id: "3.6", number: "3.6", content: "É expressamente proibido: Praticar assédio moral ou sexual; Discriminar qualquer pessoa com base em raça, cor, gênero, orientação sexual, religião ou outras condições; Utilizar linguagem ou gestos ofensivos ou agressivos no ambiente de trabalho." }
    ]
  },
  {
    id: "4",
    number: "4.",
    title: "UTILIZAÇÃO DE RECURSOS DA EMPRESA",
    content: "Os recursos fornecidos pela empresa são de uso exclusivo profissional, sendo proibida qualquer utilização para fins pessoais sem autorização expressa da gestão.",
    subsections: [
      { id: "4.1", number: "4.1", content: "Os colaboradores devem utilizar os equipamentos, ferramentas e materiais da empresa com responsabilidade, zelando pela conservação, limpeza e correto funcionamento dos mesmos." },
      { id: "4.2", number: "4.2", content: "O uso dos recursos da empresa para fins particulares não é permitido, salvo nos casos em que haja autorização formal da administração." },
      { id: "4.3", number: "4.3", content: "Qualquer dano, falha ou defeito em equipamentos, ferramentas ou materiais da empresa deve ser comunicado imediatamente ao gestor responsável ou ao setor de manutenção." },
      { id: "4.4", number: "4.4", content: "O colaborador que abrir portas ou janelas será responsável por fechá-los ao sair do ambiente, garantindo a segurança do espaço e prevenindo incidentes." },
      { id: "4.5", number: "4.5", content: "É de responsabilidade dos colaboradores que utilizam os ambientes garantir o desligamento do ar-condicionado e das luzes ao final do expediente ou durante ausências prolongadas." },
      { id: "4.6", number: "4.6", content: "O uso de computadores, internet e e-mails corporativos é estritamente destinado a finalidades profissionais. É vedada a instalação de aplicativos, softwares ou programas em nome da empresa sem o devido cadastramento e autorização expressa da Diretoria." },
      { id: "4.7", number: "4.7", content: "É proibido o uso de aparelhos celulares dentro dos banheiros da empresa, em cumprimento às recomendações de higiene, segurança e privacidade." },
      { id: "4.8", number: "4.8", content: "É vedada a realização de refeições no ambiente de trabalho, exceto em casos de recomendação médica formalmente comprovada. Nessas situações, o colaborador deverá realizar suas refeições exclusivamente no refeitório da empresa." }
    ]
  },
  {
    id: "5",
    number: "5.",
    title: "POLÍTICA DE SIGILO E CONFIDENCIALIDADE",
    content: "A empresa estabelece a presente política com o objetivo de proteger informações confidenciais, estratégicas e pessoais.",
    subsections: [
      { id: "5.1", number: "5.1", content: "Todos os colaboradores têm a obrigação de manter sigilo absoluto sobre qualquer informação sigilosa da empresa, incluindo: Informações comerciais, financeiras, operacionais e estratégicas; Dados pessoais de colegas, clientes e fornecedores (LGPD); Propriedade intelectual da empresa." },
      { id: "5.2", number: "5.2", content: "É expressamente proibido: Divulgar ou compartilhar informações da empresa com terceiros sem autorização formal; Armazenar, copiar ou transferir dados corporativos para dispositivos pessoais; Utilizar informações internas da empresa para fins pessoais, concorrenciais ou para benefício próprio ou de terceiros." },
      { id: "5.3", number: "5.3", content: "O descumprimento desta política poderá acarretar medidas disciplinares, incluindo advertências, suspensões e, em casos graves, demissão por justa causa, conforme previsto no Art. 482 da CLT." },
      { id: "5.4", number: "5.4", content: "Fica estabelecida uma cláusula de não concorrência, não aliciamento e não convite a funcionários, válida pelo prazo de 24 (vinte e quatro) meses após o desligamento do colaborador. O descumprimento acarretará ao ex-colaborador o pagamento de multa compensatória no valor de R$ 200.000,00." }
    ]
  },
  {
    id: "6",
    number: "6.",
    title: "MEDIDAS DISCIPLINARES",
    content: "A empresa estabelece uma política com o objetivo de garantir um ambiente de trabalho organizado, produtivo e respeitoso.",
    subsections: [
      { id: "6.1", number: "6.1", content: "As sanções serão aplicadas de forma proporcional à gravidade da infração: Advertência verbal; Advertência escrita; Suspensão disciplinar; Demissão por justa causa." },
      { id: "6.2", number: "6.2", content: "É proibido qualquer tipo de agressão física ou verbal que tenha o objetivo de ofender, intimidar ou estranhar colegas, clientes ou fornecedores." },
      { id: "6.3", number: "6.3", content: "A prática de assédio moral ou sexual será tratada com tolerância zero, podendo resultar na demissão imediata por justa causa." },
      { id: "6.4", number: "6.4", content: "Antes da aplicação de sanções graves (como suspensão ou demissão por justa causa), o colaborador terá o direito de apresentar sua versão dos fatos." }
    ]
  },
  {
    id: "7",
    number: "7.",
    title: "ALTERAÇÃO DE CONTRATOS E ATENDIMENTO A CLIENTES",
    content: "Qualquer alteração de contratos somente poderá ser realizada por colaboradores expressamente autorizados.",
    subsections: [
      { id: "7.1", number: "7.1", content: "Alterações que afetem valores, prazos, condições comerciais ou cláusulas essenciais devem ser previamente aprovadas pelo Gerente responsável ou pelo Setor Jurídico da empresa." },
      { id: "7.2", number: "7.2", content: "O atendimento aos clientes deve ser realizado com clareza, ética, profissionalismo e respeito." },
      { id: "7.3", number: "7.3", content: "Ao receber uma demanda, o colaborador deve realizar o cadastro ou atualização do cliente no sistema, utilizando a metodologia SPIN Selling." },
      { id: "7.4", number: "7.4", content: "É terminantemente proibido prometer ao cliente alterações contratuais, benefícios ou condições especiais sem autorização expressa da empresa." }
    ]
  },
  {
    id: "8",
    number: "8.",
    title: "TREINAMENTO E DESENVOLVIMENTO",
    content: "A empresa valoriza o desenvolvimento profissional e pessoal de seus colaboradores.",
    subsections: [
      { id: "8.1", number: "8.1", content: "Fornecer treinamentos obrigatórios exigidos por lei, incluindo as disposições nas Normas Regulamentadoras (NRs)." },
      { id: "8.2", number: "8.2", content: "Participar obrigatoriamente de todos os treinamentos exigidos por lei ou determinados pela empresa." },
      { id: "8.3", number: "8.3", content: "Os treinamentos obrigatórios realizados fora do horário de trabalho serão compensados por meio de pagamento de horas extras ou banco de horas." },
      { id: "8.4", number: "8.4", content: "O não comparecimento a treinamentos obrigatórios sem justificativa válida poderá resultar em medidas disciplinares." }
    ]
  },
  {
    id: "9",
    number: "9.",
    title: "SEGURANÇA E SAÚDE NO TRABALHO",
    content: "A empresa compromete-se a garantir um ambiente de trabalho seguro e saudável, em conformidade com a CLT e as Normas Regulamentadoras (NRs).",
    subsections: [
      { id: "9.1", number: "9.1", content: "Receber gratuitamente Equipamentos de Proteção Individual (EPIs) adequados às suas funções." },
      { id: "9.2", number: "9.2", content: "Utilizar corretamente os EPIs fornecidos, sendo proibida qualquer alteração, descarte inadequado ou não utilização durante as atividades laborais." },
      { id: "9.3", number: "9.3", content: "Comunicar imediatamente ao gestor ou ao setor responsável qualquer condição de risco, falha em equipamentos ou ocorrência de acidente de trabalho." },
      { id: "9.4", number: "9.4", content: "O descumprimento das normas de segurança e saúde acarretará avaliações disciplinares, incluindo advertências, suspensões ou demissões por justa causa." },
      { id: "9.5", number: "9.5", content: "Exames médicos periódicos: De acordo com a NR-7, os exames periódicos devem ser feitos: A cada 2 anos para colaboradores em atividades de baixo risco; Anualmente para colaboradores expostos a riscos ocupacionais; A cada ano para trabalhadores menores de 18 anos ou maiores de 45 anos." }
    ]
  },
  {
    id: "10",
    number: "10.",
    title: "VESTIMENTA",
    content: "A empresa estabelece normas sobre vestimenta com o objetivo de manter um ambiente profissional alinhado à sua identidade corporativa.",
    subsections: [
      { id: "10.1", number: "10.1", content: "Os colaboradores devem vestir-se de forma adequada ao ambiente corporativo: Business social completo no dia a dia; Business social completo em reuniões ou eventos externos." },
      { id: "10.2", number: "10.2", content: "É proibido o uso de roupas excessivamente informais, como shorts, regatas, chinelos e calças rasgadas." },
      { id: "10.3", number: "10.3", content: "A empresa respeita a individualidade e a diversidade, permitindo o uso de vestimentas religiosas, culturais e adequadas à identidade de gênero." }
    ]
  },
  {
    id: "11",
    number: "11.",
    title: "POLÍTICA DE PRIVACIDADE E PROTEÇÃO DE DADOS",
    content: "A empresa está comprometida com a proteção de dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD).",
    subsections: [
      { id: "11.1", number: "11.1", content: "Os dados pessoais serão coletados exclusivamente para fins profissionais e armazenados de forma segura." },
      { id: "11.2", number: "11.2", content: "Os colaboradores devem assinar um Termo de Confidencialidade e zelar pelo sigilo de todas as informações acessadas." },
      { id: "11.3", number: "11.3", content: "É expressamente proibido o envio ou compartilhamento de dados, documentos ou qualquer informação sensível por meio de e-mails pessoais, aplicativos de mensagens ou quaisquer canais de comunicação não corporativos." },
      { id: "11.4", number: "11.4", content: "O descumprimento desta política poderá resultar em advertências, suspensões ou demissão por justa causa, além de responsabilizações civis e criminais, conforme previsto na LGPD e na CLT." }
    ]
  },
  {
    id: "12",
    number: "12.",
    title: "USO DE REDES SOCIAIS E IMAGEM DA EMPRESA",
    content: "A empresa valoriza a liberdade de expressão dos colaboradores, mas estabelece diretrizes para o uso de redes sociais.",
    subsections: [
      { id: "12.1", number: "12.1", content: "Os colaboradores devem evitar publicações que comprometam a imagem da empresa, colegas, clientes ou parceiros." },
      { id: "12.2", number: "12.2", content: "Durante o expediente, o uso de redes sociais para fins pessoais deve ser limitado a intervalos e momentos específicos." },
      { id: "12.3", number: "12.3", content: "O colaborador autoriza expressamente o uso de sua imagem em materiais institucionais, publicidades, treinamentos internos e redes sociais da empresa." },
      { id: "12.4", number: "12.4", content: "É proibido: Publicar informações confidenciais; Usar o nome ou a marca da empresa sem autorização; Realizar publicações discriminatórias, ofensivas ou que desrespeitem a ética profissional; Manter conduta neutra em relação à política e religião." }
    ]
  },
  {
    id: "13",
    number: "13.",
    title: "BENEFÍCIOS E RECONHECIMENTO",
    content: "Vale-Alimentação, Cartão Corporativo, Comissões de Vendas, Premiação Trimestral e Participação nos Lucros e Resultados (PLR).",
    subsections: [
      { id: "13.1", number: "13.1", content: "Vale-Alimentação: A empresa concede vale-alimentação aos colaboradores conforme definido pela política interna." },
      { id: "13.2", number: "13.2", content: "Cartão Corporativo: A empresa disponibiliza cartões corporativos exclusivamente para a Diretoria." },
      { id: "13.3", number: "13.3", content: "Comissões de Vendas: A empresa adota um sistema de comissões escalonadas para os colaboradores envolvidos em vendas." },
      { id: "13.4", number: "13.4", content: "Premiação Trimestral: A empresa concede prêmios a cada 3 meses como forma de reconhecimento ao desempenho dos colaboradores." },
      { id: "13.5", number: "13.5", content: "Participação nos Lucros e Resultados (PLR): A empresa adota um programa de PLR, em conformidade com a Lei nº 10.101/2000." }
    ]
  }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { workshop_id } = await req.json();

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id é obrigatório' }, { status: 400 });
    }

    const user = await base44.auth.me();
    const workshop = await base44.entities.Workshop.get(workshop_id);

    const regiment = await base44.entities.CompanyRegiment.create({
      workshop_id,
      version: "1.0",
      effective_date: new Date().toISOString().split('T')[0],
      sections: DEFAULT_REGIMENT,
      status: 'draft'
    });

    return Response.json({ 
      success: true, 
      regiment_id: regiment.id,
      message: 'Regimento padrão criado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar regimento padrão:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});