import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const RITUAIS = [
  {
    id: "ritual_alinhamento_cultural",
    name: "Ritual de Alinhamento Cultural",
    frequency: "semanal",
    description: "Reunião semanal para reforçar os valores, missão e visão da empresa, garantindo que todos estejam alinhados com a cultura organizacional."
  },
  {
    id: "ritual_dono",
    name: "Ritual do Dono (Pensar Como Dono)",
    frequency: "diario",
    description: "Momento diário para cada colaborador refletir sobre suas responsabilidades como se fosse dono do negócio, tomando decisões com visão de longo prazo."
  },
  {
    id: "ritual_excelencia",
    name: "Ritual da Excelência",
    frequency: "diario",
    description: "Prática diária de buscar a excelência em cada tarefa, revisando o trabalho antes de entregar e garantindo qualidade máxima."
  },
  {
    id: "ritual_clareza",
    name: "Ritual de Clareza",
    frequency: "semanal",
    description: "Sessão semanal para esclarecer dúvidas, alinhar expectativas e garantir que todos entendam suas metas e responsabilidades."
  },
  {
    id: "ritual_conexao",
    name: "Ritual de Conexão",
    frequency: "semanal",
    description: "Momento para fortalecer os laços entre a equipe, compartilhando experiências pessoais e profissionais que aproximam o time."
  },
  {
    id: "ritual_mesa_redonda",
    name: "Ritual da Mesa Redonda",
    frequency: "quinzenal",
    description: "Reunião onde todos têm voz igual para discutir problemas, propor soluções e tomar decisões colaborativas."
  },
  {
    id: "ritual_start_diario",
    name: "Ritual do Start Diário",
    frequency: "diario",
    description: "Reunião rápida no início do dia para alinhar prioridades, compartilhar desafios e energizar a equipe para o trabalho."
  },
  {
    id: "ritual_entrega",
    name: "Ritual da Entrega",
    frequency: "diario",
    description: "Momento ao final do dia para revisar o que foi entregue, celebrar conquistas e identificar pendências para o próximo dia."
  },
  {
    id: "ritual_responsabilidade",
    name: "Ritual da Responsabilidade",
    frequency: "semanal",
    description: "Prática de assumir responsabilidade pelos resultados, reconhecendo erros e buscando soluções ao invés de culpados."
  },
  {
    id: "ritual_maturidade",
    name: "Ritual da Maturidade Profissional",
    frequency: "mensal",
    description: "Avaliação mensal do crescimento profissional de cada colaborador, identificando evolução e áreas de desenvolvimento."
  },
  {
    id: "ritual_alta_performance",
    name: "Ritual da Alta Performance",
    frequency: "semanal",
    description: "Sessão para revisar métricas de desempenho, celebrar resultados excepcionais e definir metas desafiadoras."
  },
  {
    id: "ritual_foco_cliente",
    name: "Ritual do Foco no Cliente",
    frequency: "diario",
    description: "Lembrete diário de que o cliente é a razão do negócio, revisando feedbacks e buscando formas de superar expectativas."
  },
  {
    id: "ritual_confianca",
    name: "Ritual da Confiança",
    frequency: "semanal",
    description: "Prática de construir e manter a confiança na equipe através de transparência, cumprimento de promessas e apoio mútuo."
  },
  {
    id: "ritual_voz_ativa",
    name: "Ritual da Voz Ativa",
    frequency: "semanal",
    description: "Momento em que todos são incentivados a expressar opiniões, sugestões e preocupações sem medo de julgamento."
  },
  {
    id: "ritual_consistencia",
    name: "Ritual da Consistência",
    frequency: "diario",
    description: "Prática de manter padrões consistentes de qualidade e comportamento, independente das circunstâncias."
  },
  {
    id: "ritual_cultura_viva",
    name: "Ritual da Cultura Viva",
    frequency: "mensal",
    description: "Revisão mensal de como a cultura está sendo vivida na prática, identificando gaps e celebrando exemplos positivos."
  },
  {
    id: "ritual_transparencia",
    name: "Ritual da Transparência",
    frequency: "semanal",
    description: "Compartilhamento aberto de informações relevantes sobre o negócio, resultados e desafios com toda a equipe."
  },
  {
    id: "ritual_acao_imediata",
    name: "Ritual da Ação Imediata",
    frequency: "diario",
    description: "Cultura de resolver problemas assim que identificados, sem procrastinação ou transferência de responsabilidade."
  },
  {
    id: "ritual_planejamento_vivo",
    name: "Ritual do Planejamento Vivo",
    frequency: "semanal",
    description: "Revisão e ajuste semanal dos planos, garantindo flexibilidade e adaptação às mudanças do mercado."
  },
  {
    id: "ritual_kick_off",
    name: "Ritual de Abertura de Semana (Kick Off)",
    frequency: "semanal",
    description: "Reunião na segunda-feira para definir prioridades da semana, alinhar expectativas e motivar a equipe."
  },
  {
    id: "ritual_virada",
    name: "Ritual da Virada",
    frequency: "eventual",
    description: "Momento especial quando há mudança de padrão ou direção, garantindo que todos entendam e se comprometam com o novo rumo."
  },
  {
    id: "ritual_compromisso",
    name: "Ritual do Compromisso",
    frequency: "semanal",
    description: "Prática de assumir compromissos públicos com a equipe e honrá-los, fortalecendo a cultura de accountability."
  },
  {
    id: "ritual_semana_dono",
    name: "Ritual da Semana do Dono",
    frequency: "semanal",
    description: "Semana em que cada colaborador assume responsabilidades extras, vivenciando os desafios de ser dono do negócio."
  },
  {
    id: "ritual_checkpoint",
    name: "Ritual do Checkpoint",
    frequency: "diario",
    description: "Verificação rápida ao meio do dia para garantir que as prioridades estão sendo cumpridas e ajustar rotas se necessário."
  },
  {
    id: "ritual_feedback_continuo",
    name: "Ritual do Feedback Contínuo",
    frequency: "diario",
    description: "Cultura de dar e receber feedback constante, de forma construtiva e respeitosa, para melhoria contínua."
  },
  {
    id: "ritual_pulso_cultura",
    name: "Ritual do Pulso da Cultura",
    frequency: "mensal",
    description: "Pesquisa mensal rápida para medir o engajamento e a percepção da equipe sobre a cultura organizacional."
  },
  {
    id: "ritual_norte_claro",
    name: "Ritual do Norte Claro",
    frequency: "mensal",
    description: "Revisão mensal dos objetivos estratégicos, garantindo que todos saibam para onde a empresa está indo."
  },
  {
    id: "ritual_postura",
    name: "Ritual da Postura",
    frequency: "diario",
    description: "Lembrete diário sobre a importância da postura profissional, comunicação adequada e comportamento exemplar."
  },
  {
    id: "ritual_presenca",
    name: "Ritual da Presença",
    frequency: "diario",
    description: "Prática de estar 100% presente nas atividades, evitando distrações e dando atenção total ao que está sendo feito."
  },
  {
    id: "ritual_identidade",
    name: "Ritual da Identidade",
    frequency: "mensal",
    description: "Momento para reforçar a identidade da empresa, seus valores únicos e o que a diferencia no mercado."
  },
  {
    id: "ritual_forca_operacional",
    name: "Ritual da Força Operacional",
    frequency: "semanal",
    description: "Avaliação da capacidade operacional da equipe, identificando gargalos e otimizando processos."
  },
  {
    id: "ritual_flow_equipe",
    name: "Ritual do Flow da Equipe",
    frequency: "semanal",
    description: "Análise de como a equipe está fluindo junto, identificando conflitos e promovendo harmonia no trabalho."
  },
  {
    id: "ritual_compromisso_ativo",
    name: "Ritual do Compromisso Ativo",
    frequency: "diario",
    description: "Renovação diária do compromisso com as metas e valores da empresa, mantendo a motivação alta."
  },
  {
    id: "ritual_3_verdades",
    name: "Ritual das 3 Verdades",
    frequency: "diario",
    description: "Prática diária de revisitar os três pilares fundamentais: Clareza (saber o que fazer), Responsabilidade (assumir o que é seu) e Entrega (cumprir o prometido)."
  }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas admin pode gerar MAPs' }, { status: 403 });
    }

    const created = [];
    const errors = [];

    for (const ritual of RITUAIS) {
      try {
        console.log(`🔄 Gerando MAP para: ${ritual.name}`);

        const prompt = `
Você é um especialista em processos de oficinas mecânicas e cultura organizacional.
Crie um MAP (Mapa de Auto Gestão do Processo) COMPLETO para o seguinte ritual cultural:

**Ritual:** ${ritual.name}
**Frequência:** ${ritual.frequency}
**Descrição:** ${ritual.description}

Gere um MAP profissional com:

1. **OBJETIVO**: Por que este ritual existe? Qual comportamento/valor ele reforça na cultura?
2. **CAMPO DE APLICAÇÃO**: Quem deve participar? Em que momento? Onde acontece?
3. **INFORMAÇÕES COMPLEMENTARES**: Duração, materiais necessários, EPIs (se aplicável), preparação prévia
4. **FLUXO DO PROCESSO**: Descrição passo a passo detalhada (mínimo 6 etapas)
5. **ATIVIDADES**: Lista de 5-8 atividades com responsável e ferramentas/recursos
6. **MATRIZ DE RISCOS**: 5-7 riscos que podem comprometer o ritual (baixa participação, falta de engajamento, etc)
7. **INTER-RELAÇÕES**: 5-8 áreas/processos que se relacionam com este ritual
8. **INDICADORES**: 4-6 KPIs para medir efetividade do ritual (taxa de participação, engajamento, etc)

Retorne APENAS JSON estruturado.
`;

        const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              objetivo: { type: "string" },
              campo_aplicacao: { type: "string" },
              informacoes_complementares: { type: "string" },
              fluxo_processo: { type: "string" },
              atividades: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    atividade: { type: "string" },
                    responsavel: { type: "string" },
                    ferramentas: { type: "string" }
                  }
                }
              },
              matriz_riscos: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    identificacao: { type: "string" },
                    fonte: { type: "string" },
                    impacto: { type: "string" },
                    categoria: { type: "string" },
                    controle: { type: "string" }
                  }
                }
              },
              inter_relacoes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    area: { type: "string" },
                    interacao: { type: "string" }
                  }
                }
              },
              indicadores: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    indicador: { type: "string" },
                    meta: { type: "string" },
                    como_medir: { type: "string" }
                  }
                }
              }
            }
          }
        });

        // Gerar código sequencial para rituais
        const allMaps = await base44.asServiceRole.entities.ProcessDocument.list();
        const ritualMaps = allMaps.filter(d => d.code && d.code.startsWith('MAP-RIT-'));
        const numbers = ritualMaps.map(d => {
          const match = d.code.match(/MAP-RIT-(\d+)/);
          return match ? parseInt(match[1]) : 0;
        });
        const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
        const newCode = `MAP-RIT-${String(maxNumber + created.length + 1).padStart(4, '0')}`;

        // Normalizar dados (converter arrays em strings se necessário)
        const normalizedContent = {
          objetivo: typeof aiResponse.objetivo === 'string' ? aiResponse.objetivo : (Array.isArray(aiResponse.objetivo) ? aiResponse.objetivo.join('\n') : ''),
          campo_aplicacao: typeof aiResponse.campo_aplicacao === 'string' ? aiResponse.campo_aplicacao : (Array.isArray(aiResponse.campo_aplicacao) ? aiResponse.campo_aplicacao.join('\n') : ''),
          informacoes_complementares: typeof aiResponse.informacoes_complementares === 'string' ? aiResponse.informacoes_complementares : (Array.isArray(aiResponse.informacoes_complementares) ? aiResponse.informacoes_complementares.join('\n') : ''),
          fluxo_processo: typeof aiResponse.fluxo_processo === 'string' ? aiResponse.fluxo_processo : (Array.isArray(aiResponse.fluxo_processo) ? aiResponse.fluxo_processo.join('\n') : ''),
          atividades: aiResponse.atividades || [],
          matriz_riscos: aiResponse.matriz_riscos || [],
          inter_relacoes: aiResponse.inter_relacoes || [],
          indicadores: aiResponse.indicadores || []
        };

        const mapData = {
          code: newCode,
          title: ritual.name,
          category: "Ritual",
          description: ritual.description,
          content_json: normalizedContent,
          is_template: true,
          plan_access: ["FREE", "START", "BRONZE", "PRATA", "GOLD", "IOM", "MILLIONS"],
          operational_status: "operacional",
          status: "ativo",
          revision: "1",
          version_history: [{
            revision: "1",
            date: new Date().toISOString(),
            changed_by: "Sistema - Geração Automática",
            changes: "Criação automática do MAP do Ritual com IA"
          }]
        };

        const createdMap = await base44.asServiceRole.entities.ProcessDocument.create(mapData);
        created.push({ ritual: ritual.name, map_id: createdMap.id, code: newCode });

        console.log(`✅ MAP criado: ${newCode} - ${ritual.name}`);

      } catch (error) {
        console.error(`❌ Erro ao criar MAP para ${ritual.name}:`, error);
        errors.push({ ritual: ritual.name, error: error.message });
      }
    }

    return Response.json({
      success: true,
      created: created.length,
      total: RITUAIS.length,
      details: created,
      errors
    });

  } catch (error) {
    console.error("Erro geral:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});