import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    // Permitir: admins, consultores (com consulting_firm_id) e usuários de oficina (com workshop_id)
    const isAdmin = user?.role === 'admin';
    const isConsultor = !!user?.data?.consulting_firm_id;
    const isOficina = !!user?.data?.workshop_id;
    if (!user || (!isAdmin && !isConsultor && !isOficina)) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { atendimento_id, dados_reuniao, ai_config } = body;

    // AI config defaults
    const selectedSections = ai_config?.selectedSections || ['pauta','objetivos','observacoes','decisoes','acoes','proximos_passos','metricas'];
    const tone = ai_config?.tone || 'formal';
    const suggestNextSteps = ai_config?.suggestNextSteps !== undefined ? ai_config.suggestNextSteps : false;

    // Consultores e admins não são bloqueados por checagem de plano — apenas oficinas em self-service
    const workshop_id_auth = user.data?.workshop_id || body.workshop_id;

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

    // Checagem de plano apenas para oficinas acessando por conta própria (não consultores/admins)
    if (!isConsultor && !isAdmin) {
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
        if (e.response && e.response.status === 403) {
          return Response.json(e.response.data, { status: 403 });
        }
        console.warn("Erro na validação do plano (reports), continuando:", e.message);
      }
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

    // Mapear tom para instrução
    const toneInstructions = {
      formal: 'Use linguagem corporativa, técnica e profissional.',
      direto: 'Seja extremamente objetivo e direto, sem rodeios. Frases curtas e assertivas.',
      informal: 'Use linguagem conversacional e acessível, mas mantendo profissionalismo.',
      motivacional: 'Use tom encorajador e positivo, destacando conquistas e oportunidades.'
    };
    const toneText = toneInstructions[tone] || toneInstructions.formal;

    // Montar blocos de dados condicionais
    const sectionBlocks = [];
    if (selectedSections.includes('pauta')) {
      sectionBlocks.push(`**PAUTA/TÓPICOS DISCUTIDOS:**\n${atendimento.pauta?.map((p, i) => `${i + 1}. ${p.titulo}: ${p.descricao}`).join('\n') || 'Não especificado'}\n${atendimento.topicos_discutidos?.map(t => `- ${t}`).join('\n') || ''}`);
    }
    if (selectedSections.includes('objetivos')) {
      sectionBlocks.push(`**OBJETIVOS:**\n${atendimento.objetivos?.map(o => `- ${o}`).join('\n') || 'Não especificado'}`);
    }
    if (selectedSections.includes('observacoes')) {
      sectionBlocks.push(`**OBSERVAÇÕES DO CONSULTOR:**\n${atendimento.observacoes_consultor || 'Nenhuma observação'}`);
    }
    if (selectedSections.includes('decisoes')) {
      sectionBlocks.push(`**DECISÕES TOMADAS:**\n${atendimento.decisoes_tomadas?.map(d => `- ${d.decisao} (Responsável: ${d.responsavel}, Prazo: ${d.prazo})`).join('\n') || 'Nenhuma decisão registrada'}`);
    }
    if (selectedSections.includes('acoes')) {
      sectionBlocks.push(`**AÇÕES DE ACOMPANHAMENTO:**\n${atendimento.acoes_geradas?.map(a => `- ${a.acao} (Responsável: ${a.responsavel}, Prazo: ${a.prazo})`).join('\n') || 'Nenhuma ação registrada'}`);
    }
    if (selectedSections.includes('proximos_passos')) {
      const passosTexto = atendimento.proximos_passos || '';
      const passosLista = (atendimento.proximos_passos_list || []).filter(p => p.descricao).map((p, i) => `${i + 1}. ${p.descricao} (Responsável: ${p.responsavel || 'N/A'}, Prazo: ${p.prazo || 'N/A'})`).join('\n');
      sectionBlocks.push(`**PRÓXIMOS PASSOS:**\n${passosLista || passosTexto || 'A definir'}`);
    }
    if (selectedSections.includes('checklist') && atendimento.checklist_respostas?.length > 0) {
      const checklistText = atendimento.checklist_respostas.map(bloco => {
        const perguntas = (bloco.perguntas || []).filter(p => p.resposta_atual || p.resposta_meta).map(p => `  - ${p.pergunta_texto}: Atual=${p.resposta_atual || 'N/A'}, Meta=${p.resposta_meta || 'N/A'}, Atingimento=${p.pct_atingimento || 0}%`).join('\n');
        return `Checklist: ${bloco.template_nome}\n${perguntas}`;
      }).join('\n');
      sectionBlocks.push(`**CHECKLIST DE DIAGNÓSTICO:**\n${checklistText}`);
    }
    if (selectedSections.includes('processos') && atendimento.processos_vinculados?.length > 0) {
      sectionBlocks.push(`**PROCESSOS (MAPs) VINCULADOS:**\n${atendimento.processos_vinculados.map(p => `- ${p.titulo} (${p.categoria})`).join('\n')}`);
    }
    if (selectedSections.includes('videoaulas') && atendimento.videoaulas_vinculadas?.length > 0) {
      sectionBlocks.push(`**VIDEOAULAS VINCULADAS:**\n${atendimento.videoaulas_vinculadas.map(v => `- ${v.titulo} (${v.descricao})`).join('\n')}`);
    }
    if (selectedSections.includes('metricas')) {
      sectionBlocks.push(`**MÉTRICAS E INDICADORES:** Mencione KPIs ou metas relevantes discutidas, se aplicável.`);
    }

    const nextStepsInstruction = suggestNextSteps
      ? `\n\n10. **SUGESTÕES DE PRÓXIMOS PASSOS ADICIONAIS:** Com base em TODO o conteúdo da reunião, sugira de 3 a 5 próximos passos concretos e acionáveis que não foram explicitamente mencionados mas que seriam valiosos para o cliente. Formato: lista com descrição, responsável sugerido e prazo sugerido.`
      : '';

    // Preparar prompt para IA
    const prompt = `
Você é um consultor especializado em gestão de oficinas automotivas. Gere uma ata de reunião.

**TOM:** ${toneText}

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

${sectionBlocks.join('\n\n')}

${dados_reuniao ? `\n**DADOS ADICIONAIS DA REUNIÃO:**\n${JSON.stringify(dados_reuniao, null, 2)}` : ''}

---

Gere uma ata de reunião bem estruturada APENAS com as seções correspondentes aos dados fornecidos acima. Inclua:

1. **CABEÇALHO:** Data, horário, participantes e tipo de atendimento
2. **CONTEXTUALIZAÇÃO:** Breve contexto sobre a fase da oficina
3. **RESUMO EXECUTIVO:** Principais pontos (máximo 3-4 parágrafos)
4-9. As demais seções relevantes conforme os dados fornecidos${nextStepsInstruction}

Formate em Markdown para fácil leitura. ${toneText} NÃO adicione saudações finais, despedidas ou coisas como "[Seu Nome]". Termine no último parágrafo de conteúdo.
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
        pautas: atendimento.pauta?.filter(p => p.titulo).map(p => `\u2022 ${p.titulo}${p.descricao ? ': ' + p.descricao : ''}`).join('\n') || '',
        pauta: atendimento.pauta || [],
        objetivos: atendimento.objetivos || [],
        objetivos_atendimento: (atendimento.objetivos || []).filter(o => o).map(o => `\u2022 ${o}`).join('\n') || '',
        objetivos_consultor: atendimento.observacoes_consultor || '',
        observacoes_consultor: atendimento.observacoes_consultor || '',
        proximos_passos: atendimento.proximos_passos || '',
        proximos_passos_list: atendimento.proximos_passos_list || [],
        decisoes_tomadas: atendimento.decisoes_tomadas || [],
        acoes_geradas: atendimento.acoes_geradas || [],
        client_intelligence: clientIntelligence || [],
        checklist_respostas: atendimento.checklist_respostas || [],
        processos_vinculados: atendimento.processos_vinculados || [],
        videoaulas_vinculadas: atendimento.videoaulas_vinculadas || [],
        midias_anexas: atendimento.midias_anexas || [],
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

    // 🔗 HOOK: Sincronizar próximos passos com tarefas pendentes
    try {
      await base44.functions.invoke('syncProximosPassosToTasks', {
        ata_id: novaAta.id,
        ata_data: dataAta,
        workshop_id: atendimento.workshop_id
      });
      console.log("✅ Próximos passos sincronizados com tarefas pendentes");
    } catch (syncError) {
      console.warn("⚠️ Erro ao sincronizar próximos passos (não bloqueia):", syncError.message);
    }

    // Se suggestNextSteps, extrair sugestões da IA
    let suggestedNextSteps = [];
    if (suggestNextSteps && typeof ataGerada === 'string') {
      try {
        const extractPrompt = `Analise esta ata de reunião e extraia APENAS os "Próximos Passos Adicionais" sugeridos pela IA (se existirem na seção 10 ou similar). Retorne um JSON com a estrutura especificada. Se não houver sugestões adicionais, retorne steps vazio.\n\nATA:\n${ataGerada.substring(0, 3000)}`;
        const extracted = await base44.integrations.Core.InvokeLLM({
          prompt: extractPrompt,
          response_json_schema: {
            type: 'object',
            properties: {
              steps: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    descricao: { type: 'string' },
                    responsavel: { type: 'string' },
                    prazo: { type: 'string' }
                  }
                }
              }
            }
          }
        });
        suggestedNextSteps = extracted?.steps || [];
      } catch (e) {
        console.warn('Erro ao extrair sugestões de próximos passos:', e);
      }
    }

    return Response.json({ 
      success: true, 
      ata_id: novaAta.id,
      ata: novaAta,
      suggested_next_steps: suggestedNextSteps
    });

  } catch (error) {
    console.error('❌ Erro ao gerar ata:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});