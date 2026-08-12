import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Gera um overview estruturado do cliente baseado nas 3 últimas ATAs (MeetingMinutes)
 * e nos próximos passos em andamento (ConsultoriaProximoPasso).
 *
 * Saída (JSON estruturado):
 * - ultima_reuniao: pontos-chave da ATA mais recente
 * - resumo_3_reunioes: síntese das 3 últimas reuniões
 * - passos_andamento: próximos passos acordados × quanto % fizeram
 * - overview: parágrafo narrativo de visão geral
 *
 * Usado por:
 *  - gerarAtaConsultoria (injeta resultado como "HISTÓRICO DE CONTEXTO" no prompt da ATA atual)
 *  - Front-end (drawer do cliente / follow-up) para preview sem regenerar ATA
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const isAdmin = user?.role === 'admin';
    const isConsultor = !!user?.data?.consulting_firm_id;
    const isOficina = !!user?.data?.workshop_id;
    if (!user || (!isAdmin && !isConsultor && !isOficina)) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const workshop_id = body.workshop_id || user?.data?.workshop_id;
    const atendimento_id_atual = body.atendimento_id_atual || null;

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id é obrigatório' }, { status: 400 });
    }

    // 1. Buscar as 3 últimas ATAs do workshop (excluindo o atendimento atual, se houver)
    let atasAnteriores = [];
    try {
      const filter = { workshop_id };
      const list = await base44.entities.MeetingMinutes.filter(filter, '-meeting_date', 50);
      atasAnteriores = (Array.isArray(list) ? list : [])
        .filter(a => a.atendimento_id !== atendimento_id_atual)
        .slice(0, 3);
    } catch (e) {
      console.warn('Aviso: não foi possível buscar MeetingMinutes:', e.message);
    }

    // 2. Buscar próximos passos em andamento do workshop (não finalizados/cancelados)
    let passosAndamento = [];
    try {
      const list = await base44.entities.ConsultoriaProximoPasso.filter(
        { workshop_id },
        '-created_date',
        100
      );
      passosAndamento = (Array.isArray(list) ? list : [])
        .filter(p => !['finalizado', 'cancelado'].includes(p.status));
    } catch (e) {
      console.warn('Aviso: não foi possível buscar ConsultoriaProximoPasso:', e.message);
    }

    // Caso não haja histórico nem passos: retorna overview vazio estruturado
    if (atasAnteriores.length === 0 && passosAndamento.length === 0) {
      return Response.json({
        success: true,
        overview: {
          ultima_reuniao: null,
          resumo_3_reunioes: 'Sem histórico de reuniões anteriores registradas para este cliente.',
          passos_andamento: [],
          overview: 'Primeira reunião registrada para este cliente. Não há histórico de acompanhamento anterior disponível.'
        }
      });
    }

    // 3. Montar blocos de contexto (compactos para não estourar tokens)
    const statusLabel = {
      pendente: 'Pendente',
      em_andamento: 'Em andamento',
      aguardando_cliente: 'Ag. Cliente',
      aguardando_consultor: 'Ag. Consultor',
      validacao: 'Validação',
      atrasado: '⚠️ Atrasado'
    };

    const atasBloco = atasAnteriores.map((a, i) => {
      const pautas = (a.pauta || []).filter(p => p?.titulo).map(p => `  - ${p.titulo}${p.descricao ? ': ' + p.descricao : ''}`).join('\n') || '  (sem pautas registradas)';
      const decisoes = (a.decisoes_tomadas || []).filter(d => d?.decisao).map(d => `  - ${d.decisao}${d.responsavel ? ` (Resp: ${d.responsavel})` : ''}`).join('\n') || '  (sem decisões registradas)';
      const passos = (a.proximos_passos_list || []).filter(p => p?.descricao).map(p => `  - ${p.descricao}${p.responsavel ? ` (Resp: ${p.responsavel})` : ''}${p.prazo ? ` | Prazo: ${p.prazo}` : ''}`).join('\n') || '  (sem próximos passos registrados)';
      return `**REUNIÃO ${i + 1}** (Data: ${a.meeting_date || 'N/A'} | Tipo: ${a.tipo_aceleracao || 'N/A'} | Consultor: ${a.consultor_name || 'N/A'})\nPAUTAS:\n${pautas}\nDECISÕES:\n${decisoes}\nPRÓXIMOS PASSOS:\n${passos}`;
    }).join('\n\n');

    const passosBloco = passosAndamento.length > 0
      ? passosAndamento.map(p => {
          const label = statusLabel[p.status] || p.status;
          return `- ${p.titulo} | ${label} | ${p.percentual_execucao || 0}% | Resp: ${p.responsavel_nome || 'N/A'} | Prazo: ${p.prazo || 'N/A'}`;
        }).join('\n')
      : '(nenhum próximo passo em andamento)';

    // 4. Prompt para a IA gerar o overview estruturado
    const prompt = `Você é um consultor sênior de gestão de oficinas automotivas. Analise o histórico de reuniões e os próximos passos em andamento de um cliente e gere um OVERVIEW ESTRUTURADO.

**HISTÓRICO DAS ${atasAnteriores.length} ÚLTIMA(S) REUNIÃO(ÕES):**
${atasBloco}

**PRÓXIMOS PASSOS EM ANDAMENTO (status operacional real):**
${passosBloco}

Gere um JSON com:
1. **ultima_reuniao**: pontos-chave da reunião mais recente (data, tipo, pautas resumidas, decisões, próximos passos). Se não houver, use null.
2. **resumo_3_reunioes**: síntese narrativa curta (máx 3 parágrafos) do que vem acontecendo nas últimas reuniões. Destaque padrões, evolução e temas recorrentes.
3. **passos_andamento**: lista dos próximos passos em andamento com titulo, status, percentual, responsavel, prazo e origem_ata_data (se disponível). Echoe os dados fornecidos, sem inventar.
4. **overview**: parágrafo narrativo de visão geral do cliente — onde está, o que vem sendo trabalhado, riscos de execução (passos atrasados/bloqueados) e o que precisa de atenção na próxima reunião. Tom profissional e objetivo.

Regras:
- Use dados REAIS fornecidos acima. NÃO invente números, datas ou responsáveis.
- Se um campo não tiver dado, use string vazia ou null apropriado.
- Seja conciso. Evite rodeios.`;

    const overview = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          ultima_reuniao: {
            type: ['object', 'null'],
            properties: {
              data: { type: 'string' },
              tipo: { type: 'string' },
              pautas: { type: 'array', items: { type: 'string' } },
              decisoes: { type: 'array', items: { type: 'string' } },
              proximos_passos: { type: 'array', items: { type: 'string' } }
            }
          },
          resumo_3_reunioes: { type: 'string' },
          passos_andamento: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                titulo: { type: 'string' },
                status: { type: 'string' },
                percentual: { type: 'integer' },
                responsavel: { type: 'string' },
                prazo: { type: 'string' },
                origem_ata_data: { type: 'string' }
              }
            }
          },
          overview: { type: 'string' }
        }
      }
    });

    return Response.json({ success: true, overview });
  } catch (error) {
    console.error('❌ Erro ao gerar overview do cliente:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}