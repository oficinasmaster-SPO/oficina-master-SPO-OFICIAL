import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { atendimento_id, dados_reuniao } = await req.json();

    if (!atendimento_id) {
      return Response.json({ error: 'atendimento_id é obrigatório' }, { status: 400 });
    }

    // Buscar dados do atendimento
    const atendimento = await base44.entities.ConsultoriaAtendimento.get(atendimento_id);
    
    if (!atendimento) {
      return Response.json({ error: 'Atendimento não encontrado' }, { status: 404 });
    }

    // Buscar dados da oficina
    const workshop = await base44.entities.Workshop.get(atendimento.workshop_id);

    // Preparar prompt para IA
    const prompt = `
Você é um consultor especializado em gestão de oficinas automotivas. Gere uma ata de reunião profissional e detalhada.

**INFORMAÇÕES DO ATENDIMENTO:**
- Data: ${atendimento.data_realizada || atendimento.data_agendada}
- Tipo: ${atendimento.tipo_atendimento}
- Duração: ${atendimento.duracao_minutos} minutos
- Oficina: ${workshop?.name || 'N/A'}
- Cidade/Estado: ${workshop?.city || 'N/A'} / ${workshop?.state || 'N/A'}
- Fase Atual: ${atendimento.fase_oficina || 'N/A'}
- Plano: ${atendimento.plano_cliente || 'N/A'}

**PARTICIPANTES:**
${atendimento.participantes?.map(p => `- ${p.nome} (${p.cargo})`).join('\n') || 'Não especificado'}

**PAUTA:**
${atendimento.pauta?.map((p, i) => `${i + 1}. ${p.titulo}: ${p.descricao}`).join('\n') || 'Não especificado'}

**OBJETIVOS:**
${atendimento.objetivos?.map(o => `- ${o}`).join('\n') || 'Não especificado'}

**TÓPICOS DISCUTIDOS:**
${atendimento.topicos_discutidos?.map(t => `- ${t}`).join('\n') || 'Não especificado'}

**DECISÕES TOMADAS:**
${atendimento.decisoes_tomadas?.map(d => `- ${d.decisao} (Responsável: ${d.responsavel}, Prazo: ${d.prazo})`).join('\n') || 'Nenhuma decisão registrada'}

**AÇÕES DE ACOMPANHAMENTO:**
${atendimento.acoes_geradas?.map(a => `- ${a.acao} (Responsável: ${a.responsavel}, Prazo: ${a.prazo})`).join('\n') || 'Nenhuma ação registrada'}

**OBSERVAÇÕES DO CONSULTOR:**
${atendimento.observacoes_consultor || 'Nenhuma observação'}

**PRÓXIMOS PASSOS:**
${atendimento.proximos_passos || 'A definir'}

${dados_reuniao ? `\n**DADOS ADICIONAIS DA REUNIÃO:**\n${JSON.stringify(dados_reuniao, null, 2)}` : ''}

---

Por favor, gere uma ata de reunião profissional e bem estruturada com os seguintes elementos:

1. **CABEÇALHO:** Data, horário, participantes e tipo de atendimento
2. **CONTEXTUALIZAÇÃO:** Breve contexto sobre a fase da oficina e objetivos do atendimento
3. **RESUMO EXECUTIVO:** Principais pontos discutidos (máximo 3-4 parágrafos)
4. **TÓPICOS ABORDADOS:** Lista detalhada dos assuntos tratados
5. **DECISÕES E ENCAMINHAMENTOS:** Tabela com decisão, responsável e prazo
6. **PLANO DE AÇÃO:** Ações específicas a serem executadas até próxima reunião
7. **MÉTRICAS E INDICADORES:** Se aplicável, mencione KPIs ou metas discutidas
8. **PRÓXIMOS PASSOS:** Agenda e expectativas para próximo encontro
9. **OBSERVAÇÕES FINAIS:** Comentários relevantes do consultor

Formate em Markdown para fácil leitura. Seja profissional, objetivo e completo.
    `;

    console.log("🤖 Gerando ata com IA...");

    // Chamar IA para gerar ata
    const ataGerada = await base44.integrations.Core.InvokeLLM({
      prompt: prompt
    });

    console.log("✅ Ata gerada com sucesso!");

    // Atualizar atendimento com a ata
    await base44.entities.ConsultoriaAtendimento.update(atendimento_id, {
      ata_ia: ataGerada,
      ata_gerada_em: new Date().toISOString()
    });

    return Response.json({ 
      success: true, 
      ata: ataGerada,
      atendimento_id: atendimento_id
    });

  } catch (error) {
    console.error('❌ Erro ao gerar ata:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});