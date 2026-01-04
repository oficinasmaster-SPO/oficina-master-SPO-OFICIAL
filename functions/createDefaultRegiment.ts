import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const DEFAULT_REGIMENT = [
  {
    id: "1",
    number: "1.",
    title: "IDENTIFICAÇÃO",
    content: "Dados da empresa e vigência do documento.",
    subsections: [
      { id: "1.1", number: "1.1", content: "Empresa: [Preenchido automaticamente]" },
      { id: "1.2", number: "1.2", content: "CNPJ: [Preenchido automaticamente]" },
      { id: "1.3", number: "1.3", content: "Endereço: [Preenchido automaticamente]" },
      { id: "1.4", number: "1.4", content: "Data de Vigência: [Preenchido automaticamente]" },
      { id: "1.5", number: "1.5", content: "Este documento substitui versões anteriores." }
    ]
  },
  {
    id: "2",
    number: "2.",
    title: "OBJETIVO DO REGIMENTO",
    content: "",
    subsections: [
      { id: "2.1", number: "2.1", content: "Estabelecer regras claras de convivência, conduta e execução do trabalho." },
      { id: "2.2", number: "2.2", content: "Garantir organização, segurança, produtividade e qualidade dos serviços prestados." },
      { id: "2.3", number: "2.3", content: "Proteger a empresa, os clientes e os colaboradores, assegurando conformidade com a legislação trabalhista." },
      { id: "2.4", number: "2.4", content: "Servir como base para procedimentos disciplinares, avaliações, bonificações e tomadas de decisão." }
    ]
  },
  {
    id: "3",
    number: "3.",
    title: "JORNADA DE TRABALHO, PONTO E ATRASOS",
    content: "",
    subsections: [
      { id: "3.1", number: "3.1", content: "Jornada de Trabalho" },
      { id: "3.1.1", number: "3.1.1", content: "Horário padrão: [Definir horário]" },
      { id: "3.1.2", number: "3.1.2", content: "Intervalos conforme legislação vigente." },
      { id: "3.2", number: "3.2", content: "Registro de Ponto" },
      { id: "3.2.1", number: "3.2.1", content: "O registro de ponto é obrigatório e deve refletir fielmente a jornada trabalhada." },
      { id: "3.2.2", number: "3.2.2", content: "Qualquer tentativa de fraude no ponto é considerada falta grave." },
      { id: "3.3", number: "3.3", content: "Atrasos" },
      { id: "3.3.1", number: "3.3.1", content: "Tolerância máxima diária: [Definir] minutos." },
      { id: "3.3.2", number: "3.3.2", content: "Atrasos recorrentes, mesmo dentro da tolerância, poderão gerar advertência." },
      { id: "3.3.3", number: "3.3.3", content: "Atrasos superiores à tolerância devem ser justificados." }
    ]
  },
  {
    id: "4",
    number: "4.",
    title: "FALTAS E ATESTADOS MÉDICOS",
    content: "",
    subsections: [
      { id: "4.1", number: "4.1", content: "Faltas Justificadas" },
      { id: "4.1.1", number: "4.1.1", content: "Serão aceitas faltas mediante apresentação de atestado médico válido." },
      { id: "4.2", number: "4.2", content: "Regras para Atestados" },
      { id: "4.2.1", number: "4.2.1", content: "O atestado deve ser entregue em até 24 horas após o retorno ao trabalho." },
      { id: "4.2.2", number: "4.2.2", content: "Não serão aceitos atestados entregues fora do prazo, salvo casos excepcionais devidamente comprovados." },
      { id: "4.2.3", number: "4.2.3", content: "Consultas médicas eletivas devem, obrigatoriamente, ser agendadas: Terças-feiras ou quartas-feiras, desde que não haja feriado na semana." },
      { id: "4.2.4", number: "4.2.4", content: "Não é permitido agendamento de consultas médicas: Segundas-feiras, Sextas-feiras, Véspera de feriado, Dia posterior a feriado." },
      { id: "4.2.5", number: "4.2.5", content: "O descumprimento destas regras poderá gerar advertência." }
    ]
  },
  {
    id: "5",
    number: "5.",
    title: "CONDUTA PROFISSIONAL E COMPORTAMENTO",
    content: "",
    subsections: [
      { id: "5.1", number: "5.1", content: "É dever do colaborador manter postura ética, respeitosa e profissional." },
      { id: "5.2", number: "5.2", content: "É expressamente proibido:" },
      { id: "5.2.1", number: "5.2.1", content: "Agressões verbais ou físicas." },
      { id: "5.2.2", number: "5.2.2", content: "Assédio moral ou sexual." },
      { id: "5.2.3", number: "5.2.3", content: "Discussões que prejudiquem o ambiente de trabalho." }
    ]
  },
  {
    id: "6",
    number: "6.",
    title: "EXECUÇÃO TÉCNICA E RESPONSABILIDADES",
    content: "",
    subsections: [
      { id: "6.1", number: "6.1", content: "Qualidade do Serviço" },
      { id: "6.1.1", number: "6.1.1", content: "O colaborador é responsável pela correta execução dos serviços." },
      { id: "6.1.2", number: "6.1.2", content: "Instalação incorreta de peças, diagnósticos errados ou retrabalho por erro técnico poderão gerar advertência." },
      { id: "6.2", number: "6.2", content: "Danos a Veículos" },
      { id: "6.2.1", number: "6.2.1", content: "Qualquer dano causado a veículos de clientes deve ser comunicado imediatamente ao gestor." },
      { id: "6.2.2", number: "6.2.2", content: "Omitir danos é considerado falta grave." },
      { id: "6.3", number: "6.3", content: "Organização e Limpeza" },
      { id: "6.3.1", number: "6.3.1", content: "Bancadas devem permanecer organizadas." },
      { id: "6.3.2", number: "6.3.2", content: "Ferramentas devem ser guardadas após o uso." },
      { id: "6.3.3", number: "6.3.3", content: "Perda ou dano por negligência poderá gerar responsabilização." },
      { id: "6.4", number: "6.4", content: "Ar-Condicionado, Equipamentos e Sistemas" },
      { id: "6.4.1", number: "6.4.1", content: "Equipamentos ligados indevidamente ou deixados em funcionamento sem necessidade caracterizam mau uso." }
    ]
  },
  {
    id: "7",
    number: "7.",
    title: "FERRAMENTAS, ESTOQUE E PATRIMÔNIO",
    content: "",
    subsections: [
      { id: "7.1", number: "7.1", content: "Ferramentas" },
      { id: "7.1.1", number: "7.1.1", content: "O colaborador é responsável pelas ferramentas sob sua guarda." },
      { id: "7.1.2", number: "7.1.2", content: "É proibido retirar ferramentas da empresa sem autorização." },
      { id: "7.2", number: "7.2", content: "Estoque" },
      { id: "7.2.1", number: "7.2.1", content: "Peças devem ser conferidas antes da instalação." },
      { id: "7.2.2", number: "7.2.2", content: "Erros de separação ou instalação devem ser reportados imediatamente." }
    ]
  },
  {
    id: "8",
    number: "8.",
    title: "USO DE CELULAR, INTERNET E IMAGEM DA EMPRESA",
    content: "",
    subsections: [
      { id: "8.1", number: "8.1", content: "O uso de celular deve ser restrito às necessidades do trabalho." },
      { id: "8.2", number: "8.2", content: "É proibido o uso excessivo durante o expediente." },
      { id: "8.3", number: "8.3", content: "É proibida a gravação de imagens, vídeos ou áudios sem autorização." }
    ]
  },
  {
    id: "9",
    number: "9.",
    title: "BONIFICAÇÕES, LUCROS E RECONHECIMENTO",
    content: "",
    subsections: [
      { id: "9.1", number: "9.1", content: "Bonificações" },
      { id: "9.1.1", number: "9.1.1", content: "Bonificações são condicionadas a desempenho, produtividade e cumprimento das regras." },
      { id: "9.1.2", number: "9.1.2", content: "O não cumprimento do regimento pode acarretar perda de bonificação." },
      { id: "9.2", number: "9.2", content: "Distribuição de Lucros" },
      { id: "9.2.1", number: "9.2.1", content: "A liberação de lucro segue critérios definidos pela empresa." },
      { id: "9.2.2", number: "9.2.2", content: "O colaborador deve estar adimplente com este regimento para participar." }
    ]
  },
  {
    id: "10",
    number: "10.",
    title: "PROCEDIMENTOS DISCIPLINARES",
    content: "",
    subsections: [
      { id: "10.1", number: "10.1", content: "As penalidades seguem o princípio da proporcionalidade:" },
      { id: "10.1.1", number: "10.1.1", content: "Advertência verbal." },
      { id: "10.1.2", number: "10.1.2", content: "Advertência escrita." },
      { id: "10.1.3", number: "10.1.3", content: "Suspensão." },
      { id: "10.1.4", number: "10.1.4", content: "Demissão por justa causa." },
      { id: "10.2", number: "10.2", content: "Toda advertência será fundamentada no Art. 482 da CLT." }
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