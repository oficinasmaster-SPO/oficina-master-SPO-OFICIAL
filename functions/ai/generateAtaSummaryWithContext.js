import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { atendimento_id } = await req.json();

    if (!atendimento_id) {
      return Response.json({ error: 'atendimento_id é obrigatório' }, { status: 400 });
    }

    // Buscar atendimento atual
    const atendimento = await base44.asServiceRole.entities.ConsultoriaAtendimento.get(atendimento_id);
    
    // Buscar últimas 10 atas da mesma oficina
    const todasAtas = await base44.asServiceRole.entities.MeetingMinutes.filter(
      { workshop_id.workshop_id },
      '-created_date',
      10
    );

    // Montar contexto das atas anteriores
    const contextoAtas = todasAtas.map((ata, idx) => `
### Ata ${idx + 1} - ${ata.meeting_date}
**Pautas:** ${ata.pautas || 'N/A'}
**Objetivos:** ${ata.objetivos_atendimento || 'N/A'}
**Próximos Passos:** ${ata.proximos_passos?.map(p => p.descricao).join('; ') || 'N/A'}
**Observações:** ${ata.objetivos_consultor || 'N/A'}
`).join('\n---\n');

    // Montar prompt para IA
    const prompt = `
Você é um consultor empresarial especializado. Analise o atendimento atual e o histórico das últimas atas para gerar um resumo executivo e recomendações.

## HISTÓRICO DE ATAS ANTERIORES:
${contextoAtas}

## ATENDIMENTO ATUAL:
**Tipo:** ${atendimento.tipo_atendimento}
**Data:** ${atendimento.data_agendada}
**Participantes:** ${atendimento.participantes?.map(p => p.nome).join(', ') || 'N/A'}
**Pauta:** ${atendimento.pauta?.map(p => p.titulo).join(', ') || 'N/A'}
**Objetivos:** ${atendimento.objetivos?.join(', ') || 'N/A'}
**Observações do Consultor:** ${atendimento.observacoes_consultor || 'N/A'}
**Próximos Passos:** ${atendimento.proximos_passos || 'N/A'}

## INSTRUÇÕES:
1. Identifique problemas recorrentes nas atas anteriores que ainda não foram resolvidos
2. Avalie o progresso do cliente comparando atas antigas com a atual
3. Gere recomendações estratégicas considerando o contexto completo
4. Destaque pontos de atenção urgentes

Retorne um JSON estruturado.
`;

    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          resumo_executivo: { type: "string", description: "Resumo do atendimento atual" },
          problemas_recorrentes: {
            type: "array",
            items: { type: "string" },
            description: "Problemas que se repetem"
          },
          evolucao_cliente: { type: "string", description: "Análise da evolução" },
          recomendacoes: {
            type: "array",
            items: { type: "string" },
            description: "Recomendações estratégicas"
          },
          pontos_atencao: {
            type: "array",
            items: { type: "string" },
            description: "Pontos críticos"
          }
        }
      }
    });

    return Response.json({
      success,
      analise
    });
  } catch (error) {
    console.error('Erro ao gerar resumo:', error);
    return Response.json({ 
      error.message || 'Erro ao gerar resumo' 
    }, { status: 500 });
  }
});
