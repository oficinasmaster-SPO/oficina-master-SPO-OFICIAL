import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { atendimento_id, dados_reuniao } = body;

    const workshop_id_auth = user.data?.workshop_id || body.workshop_id;

    if (workshop_id_auth) {
      try {
        const planCheck = await base44.functions.invoke('checkPlanAccess', {
          tenantId: workshop_id_auth,
          feature: 'integrations',
          action: 'check_feature'
        });
        if (!planCheck.data?.success) {
          return Response.json({
            success: false,
            error: { code: 'PLAN_RESTRICTION', message: 'Recurso de IA não disponível no plano atual.' }
          }, { status: 403 });
        }
      } catch (e) {
        console.warn('Erro na validação do plano, continuando:', e);
      }
    }

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

    // Validação de Plano Global (Fonte de Verdade: Banco/Webhook)
    try {
      const planCheck = await base44.functions.invoke('checkPlanAccess', {
        tenantId: workshop.id,
        feature: 'reports',
        action: 'check_feature'
      });
      if (!planCheck.data?.success) {
        return Response.json({
          success: false,
          error: planCheck.data?.error?.message || "Recurso não disponível no seu plano."
        }, { status: 403 });
      }
    } catch (e) {
      console.error("Erro na validação do plano:", e);
    }

    // Buscar inteligência do cliente vinculada
    let clientIntelligence = [];
    try {
        clientIntelligence = await base44.entities.ClientIntelligence.filter({ 
            attendance_id: atendimento_id 
        });
    } catch (e) {
        console.error("Erro ao buscar inteligência:", e);
    }

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

Formate em Markdown para fácil leitura. Seja profissional, objetivo e completo. NÃO adicione saudações finais, despedidas ou coisas como "[Seu Nome]". Termine no último parágrafo de conteúdo.
    `;

    console.log("🤖 Gerando ata com IA...");

    // Chamar IA para gerar ata
    let ataGerada = await base44.integrations.Core.InvokeLLM({
      prompt: prompt
    });

    if (typeof ataGerada === 'string') {
        ataGerada = ataGerada.replace(/Atenciosamente,?\s*\[.*?\]/gi, '')
                             .replace(/\[Seu Nome\]/gi, atendimento.consultor_nome || 'Consultor')
                             .replace(/\[Nome do Consultor\]/gi, atendimento.consultor_nome || 'Consultor')
                             .trim();
    }

    console.log("✅ Ata gerada com sucesso!");

    // CRIAR REGISTRO NA ENTIDADE MeetingMinutes
    // Isso garante que todos os dados estruturados estejam disponíveis para o PDF
    // Preparar participantes com fallback
    let participantesAta = [];
    if (atendimento.participantes && atendimento.participantes.length > 0) {
      participantesAta = atendimento.participantes.map(p => ({
        name: p.nome || p.name || '',
        role: p.cargo || p.role || ''
      })).filter(p => p.name);
    }
    if (participantesAta.length === 0) {
      participantesAta = [{ name: 'Aceleradora Oficinas Master', role: 'Consultor/Acelerador' }];
    }

    // Preparar responsavel com fallback
    const responsavelName = workshop?.owner_name || workshop?.name || 'Oficina Cliente';

    // Preparar plano_nome com fallback
    const planoNome = atendimento.plano_cliente || 'Plano de Aceleracao';

    const dataAta = {
        code: `ATA${Math.floor(1000 + Math.random() * 9000)}`,
        workshop_id: atendimento.workshop_id,
        atendimento_id: atendimento.id,
        meeting_date: atendimento.data_realizada ? atendimento.data_realizada.split('T')[0] : atendimento.data_agendada.split('T')[0],
        meeting_time: atendimento.data_realizada ? atendimento.data_realizada.split('T')[1].slice(0, 5) : atendimento.data_agendada.split('T')[1].slice(0, 5),
        tipo_aceleracao: atendimento.tipo_atendimento,
        consultor_name: atendimento.consultor_nome,
        consultor_id: atendimento.consultor_id,
        participantes: participantesAta,
        responsavel: { name: responsavelName, role: 'Proprietario' },
        plano_nome: planoNome,
        pauta: atendimento.pauta,
        objetivos: atendimento.objetivos,
        objetivos_consultor: atendimento.objetivos_consultor || '',
        observacoes_consultor: atendimento.observacoes_consultor,
        proximos_passos: atendimento.proximos_passos,
        proximos_passos_list: atendimento.proximos_passos_list || [],
        decisoes_tomadas: atendimento.decisoes_tomadas || [],
        acoes_geradas: atendimento.acoes_geradas || [],
        client_intelligence: clientIntelligence || [],
        checklist_respostas: atendimento.checklist_respostas || [],
        processos_vinculados: atendimento.processos_vinculados,
        videoaulas_vinculadas: atendimento.videoaulas_vinculadas,
        midias_anexas: atendimento.midias_anexas,
        ata_ia: ataGerada,
        status: 'rascunho'
    };

    console.log("📝 Criando registro de ATA...", dataAta);
    const novaAta = await base44.entities.MeetingMinutes.create(dataAta);

    // Atualizar atendimento com a ata
    await base44.entities.ConsultoriaAtendimento.update(atendimento_id, {
      ata_id: novaAta.id,
      ata_gerada: true,
      ata_ia: ataGerada,
      ata_gerada_em: new Date().toISOString()
    });

    return Response.json({ 
      success: true, 
      ata_id: novaAta.id,
      ata: novaAta
    });

  } catch (error) {
    console.error('❌ Erro ao gerar ata:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});