import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const DEFAULT_REGIMENT = [
  {
    id: "0",
    number: "PREÂMBULO",
    title: "BASE LEGAL E PODER DIRETIVO DA EMPRESA",
    content: "Fundamento Jurídico do Regimento Interno",
    subsections: [
      { id: "0.1", number: "0.1", content: "Este Regimento Interno é elaborado com fundamento na Consolidação das Leis do Trabalho (CLT), especialmente nos artigos 2º (poder diretivo do empregador), 158 (deveres do empregado) e 482 (justa causa), na Constituição Federal (art. 7º), no Código Civil (responsabilidade por danos) e nas Normas Regulamentadoras (NRs) do Ministério do Trabalho e Emprego, em especial NR-01, NR-06 e NR-12." },
      { id: "0.2", number: "0.2", content: "PODER DIRETIVO: A empresa, no exercício legítimo de seu poder diretivo, organizacional e disciplinar, possui o direito de organizar, dirigir, fiscalizar e aplicar medidas disciplinares aos seus colaboradores, desde que respeitada a dignidade humana, a legislação trabalhista vigente e os princípios da proporcionalidade, gradualidade e imediatidade." },
      { id: "0.3", number: "0.3", content: "Este poder fundamenta juridicamente a aplicação de advertências, suspensões e demissão por justa causa, sempre mediante documentação e garantia do direito de defesa ao colaborador." },
      { id: "0.4", number: "0.4", content: "OBJETIVO: Estabelecer normas claras de conduta, proteger a empresa, os colaboradores e os clientes, garantir segurança jurídica nas relações de trabalho e servir como base documental para procedimentos disciplinares e decisões administrativas." }
    ]
  },
  {
    id: "1",
    number: "1.",
    title: "DEVERES DO COLABORADOR (Art. 158 CLT)",
    content: "São deveres obrigatórios de todo colaborador, sob pena de aplicação das medidas disciplinares previstas neste Regimento:",
    subsections: [
      { id: "1.1", number: "1.1", content: "Cumprir todas as ordens lícitas emanadas da empresa, respeitando a hierarquia e os procedimentos internos estabelecidos." },
      { id: "1.2", number: "1.2", content: "Respeitar rigorosamente os horários de trabalho, registrando corretamente o ponto eletrônico e cumprindo integralmente sua jornada diária." },
      { id: "1.3", number: "1.3", content: "Utilizar corretamente e de forma obrigatória os Equipamentos de Proteção Individual (EPIs) fornecidos pela empresa, conforme NR-06." },
      { id: "1.4", number: "1.4", content: "Zelar pela conservação, limpeza e correto uso de ferramentas, equipamentos, veículos de clientes e patrimônio da empresa." },
      { id: "1.5", number: "1.5", content: "Tratar clientes, colegas, superiores e fornecedores com respeito, cordialidade e profissionalismo." },
      { id: "1.6", number: "1.6", content: "Seguir todos os processos técnicos, procedimentos operacionais e normas de segurança estabelecidas pela empresa." },
      { id: "1.7", number: "1.7", content: "Manter sigilo absoluto sobre informações confidenciais, dados de clientes, estratégias comerciais, processos internos e valores praticados pela empresa." },
      { id: "1.8", number: "1.8", content: "Comunicar imediatamente à gestão qualquer acidente, dano a veículo, avaria em equipamento ou situação de risco identificada." },
      { id: "1.9", number: "1.9", content: "Apresentar-se ao trabalho em condições adequadas de higiene, vestimenta profissional e pleno discernimento (sem influência de álcool ou substâncias ilícitas)." },
      { id: "1.10", number: "1.10", content: "Cumprir todas as demais normas previstas neste Regimento Interno e na legislação trabalhista vigente." }
    ]
  },
  {
    id: "2",
    number: "2.",
    title: "CONDUTAS EXPRESSAMENTE PROIBIDAS",
    content: "São consideradas faltas disciplinares, passíveis de punição conforme a gravidade, as seguintes condutas:",
    subsections: [
      { id: "2.1", number: "2.1", content: "ATRASOS E FALTAS: Atrasos recorrentes, faltas injustificadas ou abandono de posto de trabalho durante o expediente." },
      { id: "2.2", number: "2.2", content: "USO INDEVIDO DE CELULAR: Uso excessivo ou inadequado de celular durante o horário de trabalho, especialmente em áreas operacionais ou de atendimento ao cliente." },
      { id: "2.3", number: "2.3", content: "DESÍDIA: Negligência, corpo mole, execução de tarefas sem o devido cuidado técnico, retrabalho constante por falta de atenção." },
      { id: "2.4", number: "2.4", content: "INDISCIPLINA: Descumprimento de ordens ou normas gerais da empresa que não caracterizam desobediência direta." },
      { id: "2.5", number: "2.5", content: "INSUBORDINAÇÃO: Recusa deliberada em cumprir ordem direta de superior hierárquico, desde que lícita." },
      { id: "2.6", number: "2.6", content: "OFENSAS E AGRESSÕES: Ofensas verbais, agressões físicas, assédio moral, assédio sexual ou qualquer forma de violência contra colegas, clientes ou terceiros." },
      { id: "2.7", number: "2.7", content: "USO DE ÁLCOOL OU DROGAS: Apresentar-se ao trabalho sob efeito de álcool ou substâncias ilícitas, ou consumir tais substâncias durante o expediente." },
      { id: "2.8", number: "2.8", content: "VAZAMENTO DE INFORMAÇÕES: Divulgar, compartilhar ou utilizar indevidamente informações confidenciais da empresa ou de clientes." },
      { id: "2.9", number: "2.9", content: "USO INDEVIDO DE FERRAMENTAS E VEÍCULOS: Utilizar ferramentas, equipamentos ou veículos da empresa para fins pessoais sem autorização; causar danos por negligência ou má utilização." },
      { id: "2.10", number: "2.10", content: "DESRESPEITO ÀS NORMAS DE SEGURANÇA: Não utilizar EPIs, operar máquinas sem autorização, executar procedimentos de risco sem treinamento ou violar normas de segurança do trabalho." },
      { id: "2.11", number: "2.11", content: "FRAUDE DE PONTO: Alterar, fraudar ou registrar ponto de forma incorreta ou realizar registro para terceiros." },
      { id: "2.12", number: "2.12", content: "EXPOSIÇÃO NEGATIVA DA EMPRESA: Publicar conteúdo difamatório, ofensivo ou que prejudique a imagem da empresa em redes sociais ou outros meios." },
      { id: "2.13", number: "2.13", content: "IMPROBIDADE: Furto, roubo, apropriação indébita de bens da empresa ou de clientes, ou qualquer ato de má-fé." }
    ]
  },
  {
    id: "3",
    number: "3.",
    title: "JORNADA DE TRABALHO, PONTO E BANCO DE HORAS",
    content: "Disposições sobre horários, registro de ponto e controle de jornada (Art. 58 e 74 da CLT)",
    subsections: [
      { id: "3.1", number: "3.1", content: "A jornada de trabalho será de até 8 horas diárias e 44 horas semanais, conforme Art. 7º, XIII da Constituição Federal e Art. 58 da CLT. Regimes especiais poderão ser aplicados conforme necessidade da empresa e legislação vigente." },
      { id: "3.2", number: "3.2", content: "O registro de ponto é obrigatório para todos os colaboradores, devendo ser feito no sistema eletrônico da empresa. Será observada a tolerância máxima de 5 minutos por registro, respeitando o limite diário total de 10 minutos (Art. 58, §1º da CLT)." },
      { id: "3.3", number: "3.3", content: "Qualquer tentativa de fraude, alteração ou manipulação no registro de ponto será considerada falta grave, passível de demissão por justa causa." },
      { id: "3.4", number: "3.4", content: "Os intervalos para refeição e descanso serão garantidos conforme Art. 71 da CLT: mínimo de 1 hora para jornadas superiores a 6 horas; mínimo de 15 minutos para jornadas entre 4 e 6 horas." },
      { id: "3.5", number: "3.5", content: "BANCO DE HORAS: A empresa adota o sistema de banco de horas mediante acordo individual escrito. As horas extras serão compensadas no prazo máximo de 6 meses. Caso não haja compensação dentro desse período, serão pagas como horas extras com os devidos adicionais legais." },
      { id: "3.6", number: "3.6", content: "A reposição de horas ou realização de horas extras somente será permitida mediante autorização prévia e expressa da Diretoria." },
      { id: "3.7", number: "3.7", content: "EVENTOS E TREINAMENTOS: A participação em eventos, treinamentos ou atividades fora da jornada regular será previamente comunicada com antecedência mínima de 3 dias e as horas serão registradas para compensação ou pagamento conforme legislação." }
    ]
  },
  {
    id: "4",
    number: "4.",
    title: "FALTAS, ATESTADOS E AFASTAMENTOS",
    content: "Regras sobre ausências, justificativas e comunicação de faltas (Art. 473 da CLT)",
    subsections: [
      { id: "4.1", number: "4.1", content: "São consideradas faltas justificadas aquelas previstas no Art. 473 da CLT: falecimento de familiares (3 dias), casamento (3 dias), nascimento de filho, doação de sangue, alistamento eleitoral, comparecimento judicial, entre outros, desde que devidamente comprovados." },
      { id: "4.2", number: "4.2", content: "ATESTADOS MÉDICOS: Devem ser apresentados em até 48 horas após o retorno ao trabalho. A ausência deve ser comunicada no mesmo dia, por telefone, WhatsApp ou outro meio disponível. O atestado pode ser apresentado por foto inicialmente e o original entregue posteriormente." },
      { id: "4.3", number: "4.3", content: "CONSULTAS MÉDICAS ELETIVAS: Devem ser agendadas preferencialmente para terças ou quartas-feiras, com aviso mínimo de 7 dias de antecedência. É vedado o agendamento em segundas, sextas, vésperas ou dias posteriores a feriados, salvo urgência comprovada." },
      { id: "4.4", number: "4.4", content: "FALTAS INJUSTIFICADAS: Acarretarão desconto proporcional no salário, perda do DSR (Descanso Semanal Remunerado) e redução proporcional das férias, conforme tabela prevista na CLT." },
      { id: "4.5", number: "4.5", content: "Toda ausência ou atraso deve ser comunicado previamente ou, na impossibilidade, justificado em até 48 horas. A falta de comunicação agrava a situação disciplinar." },
      { id: "4.6", number: "4.6", content: "AFASTAMENTO PROLONGADO: Acima de 3 dias consecutivos, o colaborador deverá apresentar documentação médica oficial (atestado, laudo, relatório) para instrução do processo de afastamento junto ao INSS, se aplicável." }
    ]
  },
  {
    id: "5",
    number: "5.",
    title: "ESCALA DE PENALIDADES E PROCEDIMENTOS DISCIPLINARES",
    content: "Gradação das medidas disciplinares conforme Art. 482 da CLT, observando proporcionalidade, gradualidade e imediatidade",
    subsections: [
      { id: "5.1", number: "5.1", content: "ADVERTÊNCIA VERBAL: Aplicada em casos de faltas leves ou eventuais. Será registrada em documento interno, podendo ser aplicada até 2 (duas) vezes antes de evoluir para advertência escrita." },
      { id: "5.2", number: "5.2", content: "ADVERTÊNCIA ESCRITA: Aplicada em casos de reincidência de falta leve, falta de gravidade média ou quando a advertência verbal não surtiu efeito. O colaborador deverá assinar o documento, sendo facultada a recusa mediante presença de duas testemunhas." },
      { id: "5.3", number: "5.3", content: "SUSPENSÃO DISCIPLINAR: Aplicada em casos de reincidência de falta média ou falta de gravidade considerável. O prazo máximo será de até 30 dias consecutivos, conforme Art. 474 da CLT, com desconto proporcional no salário." },
      { id: "5.4", number: "5.4", content: "DEMISSÃO POR JUSTA CAUSA: Aplicada nos casos previstos no Art. 482 da CLT, quando houver falta gravíssima ou reincidência contumaz após suspensões. A empresa observará os critérios de tipicidade, nexo causal, imediatidade e proporcionalidade." },
      { id: "5.5", number: "5.5", content: "CASOS GRAVÍSSIMOS: Em situações de improbidade, agressão física, assédio sexual, embriaguez habitual, violação de segredo da empresa ou abandono de emprego, a empresa poderá aplicar demissão por justa causa sem passar pelas etapas anteriores, desde que devidamente comprovada a falta." },
      { id: "5.6", number: "5.6", content: "DIREITO DE DEFESA: Antes da aplicação de suspensão ou demissão por justa causa, o colaborador terá direito de apresentar sua versão dos fatos, garantindo a ampla defesa prevista constitucionalmente." },
      { id: "5.7", number: "5.7", content: "REGISTRO DOCUMENTAL: Todas as penalidades serão registradas no prontuário do colaborador, datadas, assinadas (ou registrada a recusa de assinatura) e fundamentadas neste Regimento e na legislação aplicável." }
    ]
  },
  {
    id: "6",
    number: "6.",
    title: "ADVERTÊNCIA — PROCEDIMENTOS E FORMALIZAÇÃO",
    content: "Como deve ser elaborada e registrada uma advertência para ter validade jurídica",
    subsections: [
      { id: "6.1", number: "6.1", content: "Toda advertência escrita deverá conter obrigatoriamente: identificação do colaborador; descrição clara e objetiva da falta cometida; data, hora e local do ocorrido (quando aplicável); artigo ou item do Regimento Interno que foi violado; fundamentação legal (Art. 482 da CLT ou outro aplicável); data da aplicação; assinatura do superior hierárquico; espaço para assinatura do colaborador." },
      { id: "6.2", number: "6.2", content: "RECUSA DE ASSINATURA: Caso o colaborador se recuse a assinar a advertência, será registrado em campo próprio a expressão 'Recusou-se a assinar', com assinatura de duas testemunhas presentes no ato." },
      { id: "6.3", number: "6.3", content: "A advertência sem base neste Regimento Interno ou sem fundamentação legal clara será considerada juridicamente fraca e poderá ser questionada em reclamação trabalhista." },
      { id: "6.4", number: "6.4", content: "O colaborador poderá apresentar justificativa escrita no prazo de até 48 horas após o recebimento da advertência, a qual será anexada ao processo disciplinar." },
      { id: "6.5", number: "6.5", content: "Advertências antigas (superiores a 1 ano) não serão consideradas para fins de reincidência, salvo se houver continuidade na conduta faltosa." }
    ]
  },
  {
    id: "7",
    number: "7.",
    title: "SUSPENSÃO DISCIPLINAR",
    content: "Requisitos e procedimentos para aplicação de suspensão",
    subsections: [
      { id: "7.1", number: "7.1", content: "A suspensão disciplinar será aplicada quando houver reincidência de falta média, falta grave ou quando as advertências anteriores não surtiram efeito corretivo." },
      { id: "7.2", number: "7.2", content: "O prazo de suspensão será de 1 a 30 dias consecutivos, proporcional à gravidade da falta, conforme Art. 474 da CLT." },
      { id: "7.3", number: "7.3", content: "Durante o período de suspensão, o colaborador não receberá salário nem terá direito aos benefícios proporcionais (vale-alimentação, vale-transporte), salvo previsão diversa em convenção coletiva." },
      { id: "7.4", number: "7.4", content: "A suspensão será comunicada por escrito, com descrição da falta, fundamentação legal e registro em prontuário, garantindo ao colaborador o direito de apresentar defesa prévia." },
      { id: "7.5", number: "7.5", content: "Suspensão aplicada sem advertências prévias (em casos não gravíssimos) ou sem fundamentação adequada pode ser considerada abusiva e gerar reversão em indenização." }
    ]
  },
  {
    id: "8",
    number: "8.",
    title: "DEMISSÃO POR JUSTA CAUSA (Art. 482 CLT)",
    content: "Hipóteses legais que autorizam a rescisão por justa causa e procedimentos obrigatórios",
    subsections: [
      { id: "8.1", number: "8.1", content: "DESÍDIA: Negligência habitual, falta de cuidado na execução das tarefas, retrabalho constante por desatenção, desleixo técnico." },
      { id: "8.2", number: "8.2", content: "INSUBORDINAÇÃO: Recusa deliberada em cumprir ordem direta e lícita de superior hierárquico." },
      { id: "8.3", number: "8.3", content: "INDISCIPLINA: Descumprimento reiterado de normas gerais da empresa, regulamentos ou ordens de caráter geral." },
      { id: "8.4", number: "8.4", content: "IMPROBIDADE: Atos de desonestidade, furto, apropriação indébita, fraude, falsificação de documentos ou qualquer conduta que revele má-fé." },
      { id: "8.5", number: "8.5", content: "MAU PROCEDIMENTO: Conduta incorreta, ofensas morais, desrespeito a colegas ou clientes, atitudes incompatíveis com o ambiente de trabalho." },
      { id: "8.6", number: "8.6", content: "EMBRIAGUEZ: Comparecimento ao trabalho embriagado ou consumo de álcool ou drogas ilícitas durante o expediente (embriaguez habitual ou em serviço)." },
      { id: "8.7", number: "8.7", content: "VIOLAÇÃO DE SEGREDO DA EMPRESA: Divulgação de informações confidenciais, estratégicas, comerciais ou técnicas que possam causar prejuízo à empresa." },
      { id: "8.8", number: "8.8", content: "ABANDONO DE EMPREGO: Ausência injustificada por período superior a 30 dias consecutivos, caracterizando presunção de abandono (Súmula 32 do TST)." },
      { id: "8.9", number: "8.9", content: "ATO LESIVO DA HONRA: Agressões verbais ou físicas, ofensas graves, assédio moral, assédio sexual contra qualquer pessoa no ambiente de trabalho ou relacionado ao trabalho." },
      { id: "8.10", number: "8.10", content: "PRÁTICA DE ATOS ATENTATÓRIOS À SEGURANÇA NACIONAL: Embora rara, está prevista na CLT e pode ser invocada em casos extremos." },
      { id: "8.11", number: "8.11", content: "REQUISITOS OBRIGATÓRIOS: Para que a justa causa seja válida, a empresa deve observar: NEXO CAUSAL (relação clara entre a falta e a punição); IMEDIATIDADE (aplicação da penalidade logo após a ciência do fato); PROPORCIONALIDADE (punição compatível com a gravidade da falta); SINGULARIDADE (não punir duas vezes pela mesma falta); REGISTRO DOCUMENTAL (tudo deve estar registrado e comprovado)." }
    ]
  },
  {
    id: "9",
    number: "9.",
    title: "PEDIDO DE DEMISSÃO PELO COLABORADOR",
    content: "Procedimentos formais para desligamento voluntário",
    subsections: [
      { id: "9.1", number: "9.1", content: "O pedido de demissão deverá ser formalizado por escrito, datado e assinado pelo colaborador, não sendo aceitos pedidos verbais ou informais." },
      { id: "9.2", number: "9.2", content: "AVISO PRÉVIO: O colaborador deverá cumprir aviso prévio de 30 dias, salvo acordo entre as partes. Em caso de descumprimento do aviso, será descontado o valor correspondente das verbas rescisórias." },
      { id: "9.3", number: "9.3", content: "Antes do desligamento, o colaborador deverá: devolver uniformes, EPIs, ferramentas, chaves e quaisquer materiais de propriedade da empresa; quitar eventuais débitos (ferramentas perdidas, danos causados por negligência); realizar o acerto financeiro e assinar o Termo de Rescisão." },
      { id: "9.4", number: "9.4", content: "A empresa se reserva o direito de dispensar o cumprimento do aviso prévio, liberando o colaborador imediatamente, sem desconto, conforme conveniência administrativa." },
      { id: "9.5", number: "9.5", content: "Pedidos de demissão realizados sob coação, pressão ou sem livre vontade poderão ser anulados juridicamente, gerando direito à indenização ao colaborador." }
    ]
  },
  {
    id: "10",
    number: "10.",
    title: "SEGURANÇA E SAÚDE NO TRABALHO (NRs)",
    content: "Normas essenciais para proteção da integridade física dos colaboradores e responsabilização em acidentes",
    subsections: [
      { id: "10.1", number: "10.1", content: "A empresa compromete-se a fornecer gratuitamente Equipamentos de Proteção Individual (EPIs) adequados, em perfeito estado de conservação e dentro do prazo de validade, conforme NR-06." },
      { id: "10.2", number: "10.2", content: "É OBRIGATÓRIO o uso correto dos EPIs durante toda a jornada de trabalho nas atividades que exigem proteção. A não utilização caracteriza falta grave e pode ensejar advertência, suspensão ou justa causa." },
      { id: "10.3", number: "10.3", content: "PROIBIÇÕES: Operar máquinas, equipamentos ou ferramentas sem autorização prévia ou sem treinamento adequado; executar procedimentos de risco sem supervisão técnica; desativar ou remover dispositivos de segurança de máquinas; realizar improvisações técnicas que comprometam a segurança." },
      { id: "10.4", number: "10.4", content: "COMUNICAÇÃO DE ACIDENTES: Todo acidente de trabalho, por menor que seja, deverá ser comunicado imediatamente ao superior hierárquico ou à gestão, para registro, atendimento médico e emissão de CAT (Comunicação de Acidente de Trabalho), conforme exigido por lei." },
      { id: "10.5", number: "10.5", content: "A empresa manterá atualizados os programas obrigatórios: PGR (Programa de Gerenciamento de Riscos - substituto do PPRA); PCMSO (Programa de Controle Médico de Saúde Ocupacional - exames admissionais, periódicos e demissionais)." },
      { id: "10.6", number: "10.6", content: "EXAMES MÉDICOS PERIÓDICOS: Conforme NR-07, os exames periódicos serão realizados: A cada 2 anos para atividades de baixo risco; Anualmente para atividades com risco ocupacional ou insalubres; Anualmente para menores de 18 anos ou maiores de 45 anos; A cada 6 meses ou menos para atividades de risco elevado." },
      { id: "10.7", number: "10.7", content: "O colaborador que causar acidente por negligência, imprudência ou descumprimento de normas de segurança poderá ser responsabilizado disciplinarmente e civilmente pelos danos causados." },
      { id: "10.8", number: "10.8", content: "A empresa poderá manter seguro adicional para acidentes de trabalho, mas isso não substitui as obrigações legais previstas na legislação trabalhista e previdenciária." }
    ]
  },
  {
    id: "11",
    number: "11.",
    title: "UTILIZAÇÃO DE RECURSOS, EQUIPAMENTOS E PATRIMÔNIO",
    content: "Regras sobre uso de ferramentas, máquinas, veículos, materiais, sistemas e instalações da empresa",
    subsections: [
      { id: "11.1", number: "11.1", content: "Os recursos fornecidos pela empresa (computadores, ferramentas, equipamentos, veículos, internet, softwares) destinam-se exclusivamente ao uso profissional, sendo proibida a utilização para fins pessoais sem autorização expressa." },
      { id: "11.2", number: "11.2", content: "CONSERVAÇÃO E ZELO: O colaborador é responsável pela conservação, limpeza e correto funcionamento dos equipamentos sob sua guarda. Danos causados por negligência, má utilização ou uso indevido poderão gerar responsabilização e ressarcimento." },
      { id: "11.3", number: "11.3", content: "FERRAMENTAS: É proibido retirar ferramentas da empresa sem autorização. Perda ou dano intencional de ferramentas poderá ser descontado do salário, nos termos do Art. 462 da CLT (com autorização prévia do colaborador)." },
      { id: "11.4", number: "11.4", content: "VEÍCULOS DE CLIENTES: Qualquer dano causado a veículo de cliente deve ser comunicado imediatamente à gestão. Omitir danos é considerado falta gravíssima passível de justa causa." },
      { id: "11.5", number: "11.5", content: "COMPUTADORES E INTERNET: O uso de computadores, internet e e-mails corporativos é monitorado e destinado exclusivamente a atividades profissionais. É proibido: acessar sites inadequados; instalar programas não autorizados; compartilhar senhas; utilizar para fins pessoais sem autorização." },
      { id: "11.6", number: "11.6", content: "EQUIPAMENTOS ELETRÔNICOS: Todos os equipamentos devem ser desligados ao final do expediente e desconectados da tomada, com exceção de servidores e equipamentos essenciais. O carregamento de celulares pessoais deve ser feito com responsabilidade e bom senso." },
      { id: "11.7", number: "11.7", content: "AR-CONDICIONADO E ILUMINAÇÃO: O colaborador que abrir portas, janelas, ligar ar-condicionado ou luzes deverá desligá-los ao sair, garantindo economia de energia e segurança das instalações." },
      { id: "11.8", number: "11.8", content: "É vedada a aquisição de equipamentos, materiais, softwares ou qualquer objeto em nome da empresa sem autorização prévia da Diretoria." },
      { id: "11.9", number: "11.9", content: "USO DE COMPUTADOR PESSOAL COM AJUDA DE CUSTO: Colaboradores que utilizam equipamento próprio e recebem ajuda de custo (exemplo: R$ 100,00 mensais) deverão manter o equipamento em perfeito funcionamento e configurar o plano de fundo com a identidade visual institucional fornecida pela empresa." }
    ]
  },
  {
    id: "12",
    number: "12.",
    title: "POLÍTICA DE SIGILO E CONFIDENCIALIDADE (LGPD)",
    content: "Proteção de informações da empresa e responsabilização por vazamento de dados",
    subsections: [
      { id: "12.1", number: "12.1", content: "Todos os colaboradores têm o dever de manter sigilo absoluto sobre informações confidenciais da empresa, incluindo: dados comerciais, financeiros, operacionais e estratégicos; informações de clientes, fornecedores e parceiros; valores, margens, processos internos e metodologias; propriedade intelectual, projetos, estudos técnicos e relatórios; dados pessoais protegidos pela LGPD (Lei 13.709/2018)." },
      { id: "12.2", number: "12.2", content: "É EXPRESSAMENTE PROIBIDO: divulgar informações da empresa a terceiros sem autorização formal; copiar, transferir ou armazenar dados corporativos em dispositivos pessoais (pen drives, HDs externos, e-mails particulares, nuvem pessoal); utilizar informações internas para fins pessoais, concorrenciais ou em benefício próprio ou de terceiros; tirar fotos, gravar vídeos ou áudios em áreas restritas sem permissão da Diretoria." },
      { id: "12.3", number: "12.3", content: "VIGÊNCIA DO SIGILO: O dever de confidencialidade permanece vigente mesmo após o término do contrato de trabalho, seja por iniciativa do colaborador ou da empresa." },
      { id: "12.4", number: "12.4", content: "CLÁUSULA DE NÃO CONCORRÊNCIA E NÃO ALICIAMENTO: Pelo prazo de 24 (vinte e quatro) meses após o desligamento, o ex-colaborador se compromete a: não atuar direta ou indiretamente em empresa concorrente; não fundar ou participar de sociedade que explore atividade idêntica ou similar à da empresa; não aliciar, convidar ou recrutar outros funcionários da empresa; não abordar ou contatar fornecedores ou clientes (ativos ou inativos) com intuito de captar negócios." },
      { id: "12.5", number: "12.5", content: "MULTA POR DESCUMPRIMENTO: O descumprimento das cláusulas acima acarretará ao ex-colaborador o pagamento de multa compensatória no valor de R$ [XXXXXX] (valor a ser definido pela empresa), sem prejuízo de outras sanções legais e indenizações por perdas e danos." },
      { id: "12.6", number: "12.6", content: "Violações de sigilo e confidencialidade podem ensejar medidas disciplinares (advertência, suspensão, justa causa) e responsabilização civil, administrativa e criminal." }
    ]
  },
  {
    id: "13",
    number: "13.",
    title: "USO DE CELULAR, REDES SOCIAIS E IMAGEM DA EMPRESA",
    content: "Regras modernas sobre uso de tecnologia e proteção da imagem corporativa",
    subsections: [
      { id: "13.1", number: "13.1", content: "O uso de celular durante o expediente deve ser restrito às necessidades profissionais. O uso excessivo ou inadequado (especialmente em áreas operacionais ou de atendimento) caracteriza indisciplina e poderá gerar advertência." },
      { id: "13.2", number: "13.2", content: "É PROIBIDO: gravar vídeos, tirar fotos ou fazer áudios de clientes, colegas ou instalações da empresa sem autorização expressa; filmar ou fotografar veículos de clientes para fins pessoais ou exposição em redes sociais; usar o celular dentro dos banheiros da empresa (por questões de higiene, privacidade e segurança)." },
      { id: "13.3", number: "13.3", content: "REDES SOCIAIS: Os colaboradores devem evitar publicações que comprometam a imagem da empresa, colegas, clientes ou parceiros. É proibido: publicar informações confidenciais ou estratégicas da empresa; usar o nome, logotipo ou marca da empresa sem autorização; realizar publicações discriminatórias, ofensivas ou que desrespeitem a ética profissional; fazer exposição negativa ou difamatória da empresa ou de seus integrantes." },
      { id: "13.4", number: "13.4", content: "NEUTRALIDADE POLÍTICA E RELIGIOSA: Recomenda-se que os colaboradores mantenham postura neutra em relação a temas políticos e religiosos no ambiente de trabalho e em publicações que possam ser associadas à empresa." },
      { id: "13.5", number: "13.5", content: "USO DE IMAGEM: O colaborador autoriza expressamente o uso de sua imagem (fotos, vídeos, depoimentos) em materiais institucionais, publicidades, treinamentos internos e redes sociais da empresa, desde que respeitada sua dignidade e integridade." },
      { id: "13.6", number: "13.6", content: "Publicações ofensivas, difamatórias ou que causem prejuízo à empresa poderão ensejar advertência, suspensão ou demissão por justa causa, além de responsabilização cível por danos morais e materiais." }
    ]
  },
  {
    id: "14",
    number: "14.",
    title: "CONDUTA PROFISSIONAL E RELACIONAMENTO INTERPESSOAL",
    content: "Normas de convivência, respeito e ética no ambiente de trabalho",
    subsections: [
      { id: "14.1", number: "14.1", content: "Todos os colaboradores devem manter postura ética, respeitosa e profissional no ambiente de trabalho, tratando colegas, superiores, subordinados, clientes e fornecedores com cordialidade e educação." },
      { id: "14.2", number: "14.2", content: "É EXPRESSAMENTE PROIBIDO: agressões físicas ou verbais; assédio moral (intimidação, humilhação, perseguição); assédio sexual (investidas, insinuações, coação sexual); discriminação de qualquer natureza (raça, cor, gênero, orientação sexual, religião, idade, deficiência); discussões ou conflitos que prejudiquem o ambiente de trabalho; exposição vexatória de colegas ou subordinados." },
      { id: "14.3", number: "14.3", content: "CULTURA ENERGÉTICA: A empresa adota uma cultura dinâmica e energética em suas reuniões, treinamentos e comemorações, permitindo o uso de expressões informais para fins motivacionais, desde que não sejam dirigidas de forma ofensiva, pessoal ou discriminatória contra outro colaborador." },
      { id: "14.4", number: "14.4", content: "ASSÉDIO MORAL E SEXUAL: A prática de assédio será tratada com TOLERÂNCIA ZERO, podendo resultar em demissão imediata por justa causa, além de responsabilização civil e criminal do agressor." },
      { id: "14.5", number: "14.5", content: "Colaboradores vítimas de assédio ou discriminação devem comunicar imediatamente à gestão ou ao setor de Recursos Humanos, garantindo sigilo e proteção contra retaliação." }
    ]
  },
  {
    id: "15",
    number: "15.",
    title: "VESTIMENTA E APRESENTAÇÃO PESSOAL",
    content: "Padrão de vestimenta e higiene no ambiente profissional",
    subsections: [
      { id: "15.1", number: "15.1", content: "Os colaboradores devem apresentar-se ao trabalho com vestimenta adequada ao ambiente corporativo: Business social completo no dia a dia; Business social completo em reuniões externas ou eventos corporativos; Uniformes específicos para áreas operacionais (quando fornecidos pela empresa)." },
      { id: "15.2", number: "15.2", content: "É PROIBIDO o uso de roupas excessivamente informais, como: shorts, bermudas, regatas, chinelos, havaianas, calças rasgadas, roupas muito decotadas ou transparentes." },
      { id: "15.3", number: "15.3", content: "RESPEITO À DIVERSIDADE: A empresa respeita a individualidade e a diversidade, permitindo o uso de vestimentas religiosas, culturais e adequadas à identidade de gênero, desde que compatíveis com o ambiente profissional e a segurança do trabalho." },
      { id: "15.4", number: "15.4", content: "Em caso de dúvida sobre a adequação da vestimenta, o colaborador poderá consultar o setor de Recursos Humanos antes de comparecer ao trabalho." }
    ]
  },
  {
    id: "16",
    number: "16.",
    title: "TREINAMENTO E DESENVOLVIMENTO PROFISSIONAL",
    content: "Obrigatoriedade de participação em capacitações e treinamentos legais",
    subsections: [
      { id: "16.1", number: "16.1", content: "A empresa valoriza o desenvolvimento profissional e oferecerá treinamentos obrigatórios exigidos por lei (NRs, capacitações técnicas) e treinamentos de aperfeiçoamento para aumento de produtividade e segurança." },
      { id: "16.2", number: "16.2", content: "É OBRIGATÓRIA a participação em todos os treinamentos determinados pela empresa ou exigidos pela legislação. A ausência injustificada poderá gerar advertência." },
      { id: "16.3", number: "16.3", content: "TREINAMENTOS FORA DO EXPEDIENTE: Treinamentos obrigatórios realizados fora do horário de trabalho serão compensados por meio de: pagamento de horas extras conforme CLT e/ou convenção coletiva; ou banco de horas, se houver acordo formal." },
      { id: "16.4", number: "16.4", content: "Treinamentos não obrigatórios, oferecidos como benefício pela empresa, poderão ser realizados fora do expediente sem compensação, salvo acordo em contrário." }
    ]
  },
  {
    id: "17",
    number: "17.",
    title: "BENEFÍCIOS, BONIFICAÇÕES E RECONHECIMENTO",
    content: "Programas de incentivo, vale-alimentação, comissões, PLR e premiações",
    subsections: [
      { id: "17.1", number: "17.1", content: "VALE-ALIMENTAÇÃO: A empresa concede vale-alimentação conforme política interna. O benefício é de uso pessoal e intransferível, sendo proibida sua comercialização ou repasse a terceiros." },
      { id: "17.2", number: "17.2", content: "CARTÃO CORPORATIVO: Disponibilizado exclusivamente para a Diretoria, destinado a despesas profissionais (viagens, reuniões, eventos). O uso indevido enseja ressarcimento e medidas disciplinares." },
      { id: "17.3", number: "17.3", content: "COMISSÕES DE VENDAS: A empresa adota sistema de comissões escalonadas para colaboradores da área comercial, conforme política específica e metas estabelecidas. O pagamento será realizado conforme cronograma do setor financeiro." },
      { id: "17.4", number: "17.4", content: "PREMIAÇÃO TRIMESTRAL: A empresa concede prêmios a cada 3 meses como reconhecimento ao desempenho, produtividade e cumprimento de metas. A participação não configura direito adquirido e está sujeita a mudanças conforme política interna." },
      { id: "17.5", number: "17.5", content: "PARTICIPAÇÃO NOS LUCROS E RESULTADOS (PLR): Programa instituído conforme Lei 10.101/2000, baseado no desempenho financeiro da empresa e cumprimento de metas. Valores e critérios serão informados mediante acordo formal." },
      { id: "17.6", number: "17.6", content: "PERDA DE BONIFICAÇÕES: O não cumprimento deste Regimento Interno, especialmente em casos de advertências, suspensões ou faltas graves, pode acarretar perda parcial ou total de bonificações, comissões extras e participação em premiações." }
    ]
  },
  {
    id: "18",
    number: "18.",
    title: "POLÍTICA DE PRIVACIDADE E PROTEÇÃO DE DADOS (LGPD)",
    content: "Conformidade com a Lei Geral de Proteção de Dados Pessoais",
    subsections: [
      { id: "18.1", number: "18.1", content: "A empresa está comprometida com a proteção de dados pessoais em conformidade com a LGPD (Lei 13.709/2018). Dados pessoais de colaboradores, clientes e fornecedores serão coletados, armazenados e tratados exclusivamente para fins profissionais legítimos." },
      { id: "18.2", number: "18.2", content: "É PROIBIDO compartilhar dados pessoais sem autorização expressa do titular ou da empresa. Todos os colaboradores devem assinar Termo de Confidencialidade." },
      { id: "18.3", number: "18.3", content: "É EXPRESSAMENTE PROIBIDO enviar ou compartilhar dados, documentos ou informações sensíveis por meio de: e-mails pessoais; aplicativos de mensagens não corporativos (WhatsApp pessoal, Telegram, etc.); canais de comunicação não autorizados." },
      { id: "18.4", number: "18.4", content: "Violações à LGPD podem acarretar advertência, suspensão, demissão por justa causa e responsabilização civil, administrativa e criminal, com multas que podem chegar a R$ 50 milhões por infração." }
    ]
  },
  {
    id: "19",
    number: "19.",
    title: "ALTERAÇÃO DE CONTRATOS E ATENDIMENTO A CLIENTES",
    content: "Procedimentos para modificações contratuais e metodologia de atendimento",
    subsections: [
      { id: "19.1", number: "19.1", content: "Qualquer alteração de contratos (valores, prazos, condições comerciais) somente poderá ser realizada por colaboradores expressamente autorizados: Diretor, Diretor de TI, Sócios ou Gerentes responsáveis." },
      { id: "19.2", number: "19.2", content: "Alterações devem ser previamente aprovadas pelo Gerente responsável ou pelo Setor Jurídico e documentadas no sistema interno, com ciência expressa do cliente." },
      { id: "19.3", number: "19.3", content: "ATENDIMENTO AO CLIENTE: Deve ser realizado com clareza, ética, profissionalismo e respeito. Ao receber demanda, o colaborador deve: cadastrar ou atualizar o cliente no sistema utilizando metodologia SPIN Selling (Situação, Problema, Implicação, Necessidade); abrir 5W2H e gerar ticket de atendimento; utilizar metodologia Mapa 3D para identificar dores, dúvidas e desejos do cliente; finalizar registro no sistema ou baixar no CRM quando aplicável." },
      { id: "19.4", number: "19.4", content: "É TERMINANTEMENTE PROIBIDO prometer ao cliente alterações contratuais, benefícios ou condições especiais sem autorização expressa da empresa." }
    ]
  },
  {
    id: "20",
    number: "20.",
    title: "RESPONSABILIDADE SOBRE VEÍCULOS DE CLIENTES",
    content: "Normas específicas para manuseio, teste e circulação de veículos sob custódia da oficina (Código Civil - Responsabilidade por dano)",
    subsections: [
      { id: "20.1", number: "20.1", content: "RECEBIMENTO DO VEÍCULO: Todo veículo recebido deverá ter: checklist de entrada preenchido; registro fotográfico (mínimo 4 ângulos); anotação de avarias pré-existentes, nível de combustível, km atual e objetos deixados no interior." },
      { id: "20.2", number: "20.2", content: "É EXPRESSAMENTE PROIBIDO: utilizar o veículo do cliente para fins pessoais ou não relacionados ao serviço; circular com o veículo sem ordem de serviço e sem autorização expressa da gestão; realizar test-drive sem supervisão ou sem acompanhamento técnico; emprestar o veículo a terceiros ou permitir que pessoas não autorizadas o conduzam." },
      { id: "20.3", number: "20.3", content: "TESTES E CIRCULAÇÃO: Testes de veículos somente serão permitidos quando estritamente necessários à execução do serviço e devidamente autorizados. O colaborador responsável pelo teste deverá estar habilitado e apto a conduzir aquele tipo de veículo." },
      { id: "20.4", number: "20.4", content: "ACIDENTES, BATIDAS, ARRANHÕES OU DANOS: Qualquer dano causado ao veículo do cliente (batida, arranhão, amassado, dano mecânico ou elétrico) deverá ser comunicado IMEDIATAMENTE à gestão, com registro fotográfico e relato detalhado do ocorrido." },
      { id: "20.5", number: "20.5", content: "RESPONSABILIZAÇÃO POR DANOS: Se comprovada negligência, imprudência, imperícia ou uso indevido do veículo, o colaborador: responderá disciplinarmente (advertência, suspensão ou justa causa); poderá ser responsabilizado civilmente pelos prejuízos causados à empresa ou ao cliente, conforme Código Civil e Art. 462, §1º da CLT (em caso de dano doloso ou culposo comprovado)." },
      { id: "20.6", number: "20.6", content: "OMISSÃO DE DANOS: Omitir ou tentar ocultar danos causados a veículos de clientes é considerado FALTA GRAVÍSSIMA, caracterizando improbidade e má-fé, passível de demissão por justa causa imediata." },
      { id: "20.7", number: "20.7", content: "CUSTÓDIA E SEGURANÇA: A empresa é depositária do veículo durante o período de serviço. O colaborador deve zelar pela segurança, fechamento de portas, vidros e ativação de alarme quando deixar o veículo estacionado." }
    ]
  },
  {
    id: "21",
    number: "21.",
    title: "DANOS A PEÇAS, COMPONENTES E SISTEMAS",
    content: "Prevenção de prejuízos por erro técnico, negligência ou procedimento inadequado",
    subsections: [
      { id: "21.1", number: "21.1", content: "É DEVER DO COLABORADOR: seguir rigorosamente os procedimentos técnicos estabelecidos pela empresa ou pelo fabricante; utilizar ferramentas adequadas para cada tipo de serviço; consultar manuais técnicos, diagramas e especificações sempre que necessário; solicitar orientação técnica ao superior ou à gestão quando houver dúvida sobre procedimento." },
      { id: "21.2", number: "21.2", content: "É EXPRESSAMENTE PROIBIDO: forçar montagens ou desmontagens sem o devido cuidado técnico; estragar peças, componentes ou sistemas por uso de métodos improvisados ou incorretos; utilizar ferramentas inadequadas (exemplo: chave de fenda no lugar de torquímetro, marreta no lugar de saca-polia); realizar procedimentos para os quais não possui capacitação técnica comprovada." },
      { id: "21.3", number: "21.3", content: "DANOS POR FALHA TÉCNICA: Caso seja caracterizado dano a peça, componente ou sistema do veículo por negligência, desatenção ou descumprimento de procedimento técnico, o fato será apurado pela gestão e poderá resultar em: advertência (em casos leves ou eventuais); suspensão (em caso de reincidência); demissão por justa causa (se a falha técnica for recorrente, configurando desídia ou incapacidade técnica); responsabilização financeira pelo prejuízo material comprovado, nos termos do Código Civil e CLT." },
      { id: "21.4", number: "21.4", content: "REGISTRO DE OCORRÊNCIAS: Todo dano causado deverá ser comunicado imediatamente ao superior, com registro fotográfico e descrição técnica do ocorrido, para fins de apuração e definição de responsabilidade." }
    ]
  },
  {
    id: "22",
    number: "22.",
    title: "USO DE ELEVADORES, MACACOS E EQUIPAMENTOS PESADOS",
    content: "Normas críticas de segurança para operação de máquinas e ferramentas de risco (NR-12)",
    subsections: [
      { id: "22.1", number: "22.1", content: "Somente colaboradores treinados, capacitados e expressamente autorizados pela gestão podem operar: elevadores automotivos (2 colunas, 4 colunas, tesoura); macacos hidráulicos e pneumáticos; prensas hidráulicas; compressores de alta pressão; máquinas de solda (MIG, TIG, eletrodo); esmerilhadeiras e politrizes; equipamentos de alinhamento e balanceamento; qualquer máquina ou equipamento classificado como de risco pela NR-12." },
      { id: "22.2", number: "22.2", content: "PROCEDIMENTOS OBRIGATÓRIOS ANTES DO USO: checagem visual do equipamento (vazamentos, desgastes, funcionamento); verificação de travas de segurança e dispositivos de proteção; certificação de que a área está livre de pessoas ou objetos; uso obrigatório de EPIs específicos (luvas, óculos, protetor auricular, etc.)." },
      { id: "22.3", number: "22.3", content: "É EXPRESSAMENTE PROIBIDO: operar equipamentos sem treinamento ou autorização; desativar ou remover dispositivos de segurança de máquinas; exceder o limite de carga especificado pelo fabricante; permitir que terceiros operem equipamentos sem autorização; realizar manutenção ou ajuste em máquinas ligadas ou energizadas." },
      { id: "22.4", number: "22.4", content: "ELEVADORES AUTOMOTIVOS: Antes de elevar qualquer veículo, o colaborador deve: conferir pontos de apoio corretos conforme manual do fabricante; verificar se o veículo está posicionado centralmente; acionar lentamente e observar estabilidade; não permanecer sob veículo elevado sem travas de segurança acionadas." },
      { id: "22.5", number: "22.5", content: "RESPONSABILIZAÇÃO: Qualquer acidente, dano ou situação de risco causada por operação indevida, negligência ou descumprimento das normas de segurança poderá resultar em: advertência grave ou suspensão (em casos sem vítimas); demissão por justa causa (se houver risco iminente à vida ou reincidência); responsabilização civil e criminal pelos danos causados, conforme legislação vigente." },
      { id: "22.6", number: "22.6", content: "Todo acidente ou incidente com equipamentos deve ser comunicado imediatamente à gestão, ainda que não tenha havido ferimentos, para registro, investigação e prevenção." }
    ]
  },
  {
    id: "23",
    number: "23.",
    title: "DIAGNÓSTICO, ORDEM DE SERVIÇO E APROVAÇÃO DO CLIENTE",
    content: "Procedimentos técnicos e comerciais obrigatórios para execução de serviços",
    subsections: [
      { id: "23.1", number: "23.1", content: "NENHUM SERVIÇO PODERÁ SER EXECUTADO sem: abertura de ordem de serviço (OS) no sistema; autorização expressa do cliente (verbal registrada ou escrita); aprovação do orçamento quando aplicável." },
      { id: "23.2", number: "23.2", content: "DIAGNÓSTICO TÉCNICO: Todo diagnóstico deve ser: realizado com ferramentas adequadas (scanner, multímetro, manômetro, etc.); baseado em evidências técnicas e não em suposições; registrado na ordem de serviço com descrição clara do problema identificado; comunicado ao cliente de forma transparente, sem promessas de resultado garantido." },
      { id: "23.3", number: "23.3", content: "É PROIBIDO: prometer ao cliente resultado técnico absoluto (exemplo: 'vai ficar 100% resolvido'); executar serviços não autorizados ou além do escopo aprovado; realizar orçamentos ou diagnósticos sem conhecimento técnico suficiente; alterar valores ou condições sem autorização da gestão comercial." },
      { id: "23.4", number: "23.4", content: "ALTERAÇÕES NA OS: Qualquer alteração de escopo, valor ou prazo durante a execução do serviço deverá ser previamente comunicada ao cliente e registrada no sistema, com nova aprovação formal." },
      { id: "23.5", number: "23.5", content: "ENTREGA DO VEÍCULO: Ao finalizar o serviço, o colaborador deve: conferir se todos os itens da OS foram executados; testar o funcionamento correto do serviço realizado; preencher checklist de saída; solicitar assinatura do cliente no documento de entrega." },
      { id: "23.6", number: "23.6", content: "O descumprimento destes procedimentos poderá gerar retrabalho, reclamações de clientes, prejuízos financeiros à empresa e medidas disciplinares ao colaborador responsável." }
    ]
  },
  {
    id: "24",
    number: "24.",
    title: "RETRABALHO, FALHA OPERACIONAL E DESEMPENHO TÉCNICO",
    content: "Avaliação de qualidade técnica e consequências da reincidência de erros",
    subsections: [
      { id: "24.1", number: "24.1", content: "CONCEITO DE RETRABALHO: Caracteriza-se como retrabalho a necessidade de refazer, corrigir ou ajustar um serviço já executado em razão de: erro de diagnóstico; instalação incorreta de peças; aperto inadequado de componentes; desatenção ou falta de procedimento técnico; não observância de especificações do fabricante." },
      { id: "24.2", number: "24.2", content: "REGISTRO E APURAÇÃO: Todo retrabalho será registrado no sistema para: avaliação técnica do colaborador; identificação de necessidade de treinamento; apuração de responsabilidade quando aplicável." },
      { id: "24.3", number: "24.3", content: "RETRABALHO EVENTUAL: Retrabalhos pontuais, decorrentes de situações atípicas ou de baixa complexidade, serão tratados como oportunidade de aprendizado e não gerarão penalidade imediata." },
      { id: "24.4", number: "24.4", content: "RETRABALHO RECORRENTE: A reincidência de retrabalho por falha técnica, desatenção ou descumprimento de procedimentos poderá caracterizar: DESÍDIA (negligência habitual no trabalho); INCAPACIDADE TÉCNICA (falta de habilidade para a função)." },
      { id: "24.5", number: "24.5", content: "Nesses casos, a empresa poderá: aplicar advertência escrita registrando os casos de retrabalho; determinar treinamento técnico obrigatório; aplicar suspensão se houver prejuízo considerável ao cliente ou à empresa; aplicar demissão por justa causa se restar comprovada incapacidade técnica persistente ou desídia caracterizada (Art. 482, 'e' e 'h' da CLT)." },
      { id: "24.6", number: "24.6", content: "DIREITO DE DEFESA: Antes da aplicação de medidas graves, o colaborador terá direito de apresentar justificativa técnica, podendo demonstrar causas alheias à sua vontade ou responsabilidade." }
    ]
  },
  {
    id: "25",
    number: "25.",
    title: "ORGANIZAÇÃO, LIMPEZA E SEGURANÇA DO AMBIENTE",
    content: "Manutenção do ambiente de trabalho seguro, limpo e organizado (NR-01 e Código Civil)",
    subsections: [
      { id: "25.1", number: "25.1", content: "É OBRIGAÇÃO DE TODO COLABORADOR manter seu posto de trabalho organizado, limpo e seguro durante e ao final do expediente." },
      { id: "25.2", number: "25.2", content: "ORGANIZAÇÃO DE BANCADAS E FERRAMENTAS: Bancadas devem permanecer organizadas; Ferramentas devem ser guardadas após o uso nos locais apropriados; Peças devem ser identificadas e armazenadas corretamente; Materiais de uso comum (panos, produtos químicos) devem ser repostos aos devidos lugares." },
      { id: "25.3", number: "25.3", content: "LIMPEZA E HIGIENE: É proibido: deixar óleo, graxa ou produtos químicos derramados no chão (risco de acidente); acumular lixo, sucata ou materiais sem destinação adequada; deixar equipamentos sujos ou em condições inadequadas de uso." },
      { id: "25.4", number: "25.4", content: "SEGURANÇA DO AMBIENTE: É proibido: deixar equipamentos ligados ou energizados sem supervisão; obstruir saídas de emergência, extintores ou rotas de fuga; armazenar materiais inflamáveis de forma inadequada ou sem sinalização." },
      { id: "25.5", number: "25.5", content: "RESPONSABILIZAÇÃO: A falta de organização, limpeza ou descumprimento de normas de segurança ambiental poderá resultar em advertência, suspensão ou, em casos graves (risco ocupacional comprovado), demissão por justa causa." },
      { id: "25.6", number: "25.6", content: "A empresa poderá realizar inspeções periódicas de segurança e limpeza, registrando não conformidades para fins de avaliação e medidas corretivas." }
    ]
  },
  {
    id: "26",
    number: "26.",
    title: "FERRAMENTAS PESSOAIS E DA EMPRESA",
    content: "Distinção entre propriedade da empresa e ferramentas de uso pessoal do colaborador",
    subsections: [
      { id: "26.1", number: "26.1", content: "FERRAMENTAS DA EMPRESA: São de propriedade exclusiva da empresa e destinam-se ao uso profissional nas dependências da oficina. É PROIBIDO: retirar ferramentas da empresa sem autorização expressa e por escrito da gestão; emprestar ferramentas da empresa a terceiros (colegas, amigos, familiares); utilizar ferramentas da empresa para fins pessoais fora do ambiente de trabalho." },
      { id: "26.2", number: "26.2", content: "RESPONSABILIDADE POR PERDA OU DANO: O colaborador que receber ferramentas sob sua guarda (caixa de ferramentas, kit personalizado) será responsável pela conservação e devolução. Perda, dano intencional ou negligência comprovada poderá resultar em: advertência ou suspensão; desconto proporcional no salário mediante autorização prévia do colaborador (Art. 462 da CLT)." },
      { id: "26.3", number: "26.3", content: "FERRAMENTAS PESSOAIS: Ferramentas de propriedade pessoal do colaborador (trazidas por iniciativa própria) são de responsabilidade exclusiva do colaborador. A empresa NÃO se responsabiliza por perda, dano, furto ou extravio de ferramentas pessoais." },
      { id: "26.4", number: "26.4", content: "IDENTIFICAÇÃO: Recomenda-se que o colaborador identifique suas ferramentas pessoais (gravação, etiqueta) para evitar confusão com o patrimônio da empresa." },
      { id: "26.5", number: "26.5", content: "DEVOLUÇÃO NO DESLIGAMENTO: No ato do desligamento (seja por pedido de demissão, dispensa ou justa causa), o colaborador deverá devolver TODAS as ferramentas, equipamentos, uniformes, EPIs e materiais de propriedade da empresa, sob pena de desconto das verbas rescisórias ou cobrança judicial." }
    ]
  },
  {
    id: "27",
    number: "27.",
    title: "DESLIGAMENTO, PEDIDO DE DEMISSÃO E ENTREGA DE BENS",
    content: "Procedimentos formais para encerramento do vínculo empregatício e quitação de responsabilidades",
    subsections: [
      { id: "27.1", number: "27.1", content: "PEDIDO DE DEMISSÃO: Deverá ser formalizado por escrito, datado e assinado pelo colaborador. Pedidos verbais ou informais não serão aceitos. O colaborador deverá cumprir aviso prévio de 30 dias, salvo dispensa pela empresa." },
      { id: "27.2", number: "27.2", content: "DEVOLUÇÃO OBRIGATÓRIA NO DESLIGAMENTO: Antes da homologação da rescisão, o colaborador deverá devolver: uniformes (em bom estado de conservação ou com desconto proporcional); EPIs fornecidos pela empresa; ferramentas, caixas de ferramentas ou kits sob sua guarda; chaves de acesso (física ou eletrônica); crachás, cartões de acesso ou outros identificadores; materiais de trabalho (manuais, catálogos, documentos, pen drives)." },
      { id: "27.3", number: "27.3", content: "QUITAÇÃO DE DÉBITOS: O colaborador deverá quitar eventuais débitos com a empresa antes da rescisão: ferramentas perdidas ou danificadas por negligência; danos causados a veículos ou equipamentos (quando comprovada responsabilidade); adiantamentos salariais não compensados; outros débitos registrados e comprovados." },
      { id: "27.4", number: "27.4", content: "TERMO DE ENTREGA E QUITAÇÃO: Será emitido um Termo de Entrega de Bens e Quitação, que deverá ser assinado pelo colaborador, confirmando a devolução de todos os itens e a inexistência de débitos pendentes." },
      { id: "27.5", number: "27.5", content: "ACESSO A SISTEMAS: Todos os acessos a sistemas, e-mails corporativos, softwares e plataformas da empresa serão imediatamente bloqueados após o desligamento, em conformidade com a política de segurança da informação." },
      { id: "27.6", number: "27.6", content: "VIGÊNCIA DAS OBRIGAÇÕES DE SIGILO: O colaborador permanece obrigado ao sigilo de informações confidenciais e à cláusula de não concorrência pelo prazo de 24 meses após o desligamento, conforme item 12 deste Regimento." },
      { id: "27.7", number: "27.7", content: "Recusa em devolver bens da empresa poderá ensejar cobrança judicial e registro de ocorrência policial por apropriação indébita." }
    ]
  },
  {
    id: "28",
    number: "28.",
    title: "DISPOSIÇÕES FINAIS, ASSINATURA E VIGÊNCIA",
    content: "Declaração de ciência, concordância, compromisso e validade jurídica do documento",
    subsections: [
      { id: "28.1", number: "28.1", content: "CASOS OMISSOS: Situações não previstas expressamente neste Regimento serão resolvidas pela Diretoria da empresa, respeitando sempre os princípios da razoabilidade, proporcionalidade, boa-fé e conformidade com a legislação trabalhista vigente." },
      { id: "28.2", number: "28.2", content: "ALTERAÇÕES E ATUALIZAÇÕES: A empresa se reserva o direito de atualizar, modificar, complementar ou substituir este Regimento Interno a qualquer momento, mediante: comunicação prévia e formal a todos os colaboradores; disponibilização do novo texto para leitura; coleta de nova assinatura de ciência quando houver alterações substanciais." },
      { id: "28.3", number: "28.3", content: "HIERARQUIA NORMATIVA: Este Regimento Interno complementa, mas não substitui, a legislação trabalhista vigente (CLT, Constituição Federal, NRs, convenções coletivas). Em caso de conflito, prevalecerá sempre a norma mais favorável ao trabalhador, conforme princípio da norma mais benéfica." },
      { id: "28.4", number: "28.4", content: "DECLARAÇÃO FORMAL DE CIÊNCIA E COMPROMISSO: Ao assinar este documento, o colaborador DECLARA expressamente que: recebeu uma cópia física ou digital deste Regimento Interno; leu integralmente todas as seções, normas, regras, deveres, proibições e penalidades aqui estabelecidas; compreendeu plenamente o conteúdo e teve a oportunidade de esclarecer eventuais dúvidas com a gestão ou o setor de Recursos Humanos; está PLENAMENTE CIENTE de que o descumprimento de qualquer norma aqui prevista poderá acarretar medidas disciplinares (advertência verbal, advertência escrita, suspensão disciplinar ou demissão por justa causa), conforme a gravidade da infração e os critérios de proporcionalidade; COMPROMETE-SE a cumprir fielmente todas as disposições deste Regimento, contribuindo para um ambiente de trabalho seguro, ético, produtivo e juridicamente protegido." },
      { id: "28.5", number: "28.5", content: "VIGÊNCIA: Este Regimento Interno entra em vigor na data de sua publicação e aprovação formal pela Diretoria, permanecendo válido por prazo indeterminado ou até que seja expressamente revogado ou substituído por nova versão." },
      { id: "28.6", number: "28.6", content: "FUNDAMENTAÇÃO LEGAL: Este Regimento foi elaborado com base na Consolidação das Leis do Trabalho (CLT - Decreto-Lei nº 5.452/1943), Constituição Federal de 1988 (art. 7º), Código Civil (Lei nº 10.406/2002 - responsabilidade civil), Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), Normas Regulamentadoras (NRs) do Ministério do Trabalho e Emprego, e demais legislações trabalhistas e previdenciárias aplicáveis." },
      { id: "28.7", number: "28.7", content: "ASSINATURA E DADOS DO COLABORADOR: Nome completo: [XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX] / CPF: [XXX.XXX.XXX-XX] / RG: [XXXXXXXXXXXXXX] / Cargo/Função: [XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX] / Data de Admissão: [XX/XX/XXXX] / Data de Ciência do Regimento: [XX/XX/XXXX] / Local: [XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX] / Assinatura do Colaborador: _______________________________________ / Assinatura do Representante da Empresa: _______________________________________" },
      { id: "28.8", number: "28.8", content: "RECUSA DE ASSINATURA: Caso o colaborador se recuse a assinar este Regimento, será lavrado um TERMO DE RECUSA na presença de duas testemunhas, com data, horário e registro da recusa, preservando a validade do documento para fins disciplinares futuros." }
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

    // Gerar código único do documento
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const document_code = `RI-${timestamp}-${random}`;

    const regiment = await base44.entities.CompanyRegiment.create({
      workshop_id,
      document_code,
      version: "1.0",
      effective_date: new Date().toISOString().split('T')[0],
      objective: "Este Regimento Interno tem como finalidade estabelecer normas claras de conduta, direitos, deveres e procedimentos disciplinares, em conformidade com a Consolidação das Leis do Trabalho (CLT), a Constituição Federal e as Normas Regulamentadoras (NRs) do Ministério do Trabalho e Emprego, visando proteger a empresa, os colaboradores e os clientes, além de servir como base jurídica para todas as decisões administrativas e disciplinares.",
      sections: DEFAULT_REGIMENT,
      status: 'draft',
      warning_legal_text: "Esta advertência é aplicada com fundamento no artigo 482 da Consolidação das Leis do Trabalho (CLT), em razão do descumprimento das normas internas da empresa, previamente comunicadas ao colaborador através do Regimento Interno devidamente assinado. O presente ato disciplinar observa os princípios da proporcionalidade, gradualidade, imediatidade e registro documental, garantindo ao colaborador o direito à ampla defesa.",
      acknowledgment_text: "Declaro que recebi, li, compreendi e estou plenamente ciente de todas as normas, regras, deveres, proibições e consequências descritas neste Regimento Interno. Comprometo-me a cumprir fielmente todas as disposições aqui estabelecidas, sob pena de aplicação das medidas disciplinares previstas na legislação trabalhista vigente.",
      final_provisions: "Os casos omissos neste Regimento serão resolvidos pela Diretoria da empresa, respeitando sempre os princípios da razoabilidade, proporcionalidade e conformidade com a legislação trabalhista vigente. A empresa se reserva o direito de atualizar, modificar ou complementar este Regimento a qualquer momento, mediante comunicação prévia e formal aos colaboradores, garantindo a ciência de todos. O presente Regimento foi elaborado com base na CLT (Consolidação das Leis do Trabalho), Constituição Federal, Código Civil, NRs (Normas Regulamentadoras) e demais legislações aplicáveis."
    });

    return Response.json({ 
      success: true, 
      regiment_id: regiment.id,
      message: 'Regimento padrão jurídico completo criado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar regimento padrão:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});