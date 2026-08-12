import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Gera a "Leitura das últimas 3 atas" de um cliente.
 *
 * Para cada uma das 3 ATAs (MeetingMinutes) mais recentes do workshop (excluindo
 * o atendimento atual quando informado), a IA lê:
 *   - pautas (pauta[])
 *   - observações do consultor (observacoes_consultor)
 *   - inteligência de negócio capturada (client_intelligence[])
 *   - decisões tomadas (decisoes_tomadas[])
 *   - próximos passos (proximos_passos_list[])
 *   - demais informações (pautas texto, objetivos, visao_geral_projeto)
 *
 * Saída por ata (curto + detalhado):
 *   - resumo_curto: 1-2 linhas (teaser)
 *   - resumo_detalhado: "o que foi definido" estruturado
 *   - proximos_passos_acordados: [{ descricao, responsavel, prazo }]
 *
 * As atas são retornadas em ordem cronológica crescente:
 *   [0] = antepenúltima, [1] = penúltima, [2] = última
 *
 * Usado por:
 *   - LeituraTresAtasCard (Opções Avançadas do Registrar Atendimento)
 *   - LeituraTresAtasCard (rail do IniciarAtendimentoModal / Central de Follow-up)
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
    let atas = [];
    try {
      const list = await base44.entities.MeetingMinutes.filter(
        { workshop_id },
        '-meeting_date',
        50
      );
      atas = (Array.isArray(list) ? list : [])
        .filter(a => a.atendimento_id !== atendimento_id_atual)
        .slice(0, 3);
    } catch (e) {
      console.warn('Aviso: não foi possível buscar MeetingMinutes:', e.message);
    }

    // Sem histórico: retorna estrutura vazia pronta para a UI
    if (atas.length === 0) {
      return Response.json({
        success: true,
        atas: [],
        mensagem: 'Sem histórico de reuniões anteriores registradas para este cliente.'
      });
    }

    // 2. Montar bloco de contexto por ata (compacto, legível para a IA)
    const atasBloco = atas.map((a, i) => {
      const pautasLista = (a.pauta || []).filter(p => p?.titulo).map(p => `  - ${p.titulo}${p.descricao ? ': ' + p.descricao : ''}`).join('\n') || '  (sem pautas registradas)';
      const pautasTexto = a.pautas || '(sem pautas em texto)';
      const obsConsultor = a.observacoes_consultor || '(sem observações do consultor)';
      const decisoes = (a.decisoes_tomadas || []).filter(d => d?.decisao).map(d => `  - ${d.decisao}${d.responsavel ? ` (Resp: ${d.responsavel})` : ''}`).join('\n') || '  (sem decisões registradas)';
      const passos = (a.proximos_passos_list || []).filter(p => p?.descricao).map(p => `  - ${p.descricao}${p.responsavel ? ` (Resp: ${p.responsavel})` : ''}${p.prazo ? ` | Prazo: ${p.prazo}` : ''}`).join('\n') || '  (sem próximos passos registrados)';
      const intel = (a.client_intelligence || []).filter(c => c?.description).map(c => `  - [${c.area || '?'}${c.subcategory ? '/' + c.subcategory : ''}${c.gravity ? ' ' + c.gravity : ''}] ${c.description}`).join('\n') || '  (sem inteligência de negócio capturada)';
      return `**ATA ${i + 1}** (id: ${a.id} | Data: ${a.meeting_date || 'N/A'} | Tipo: ${a.tipo_aceleracao || 'N/A'} | Consultor: ${a.consultor_name || 'N/A'})
PAUTAS:
${pautasLista}
PAUTAS (texto livre):
${pautasTexto}
OBSERVAÇÕES DO CONSULTOR:
${obsConsultor}
DECISÕES TOMADAS:
${decisoes}
INTELIGÊNCIA DE NEGÓCIO CAPTURADA (dores/oportunidades):
${intel}
PRÓXIMOS PASSOS:
${passos}`;
    }).join('\n\n');

    // 3. Prompt para a IA gerar os resumos curto + detalhado por ata
    const prompt = `Você é um consultor sênior de gestão de oficinas automotivas. Para cada ATA abaixo, gere DOIS resumos a partir do que foi registrado (pautas, observações do consultor, inteligência de negócio capturada, decisões e próximos passos):

**ATAs:**
${atasBloco}

Gere um JSON com uma propriedade "atas" (array), na MESMA ORDEM informada (ata 1, 2, 3). Cada elemento deve ter:
- ata_id: o id informado
- resumo_curto: 1 a 2 linhas, no máximo ~30 palavras, indicando o essencial do que foi tratado (teaser).
- resumo_detalhado: parágrafo estruturado (3 a 6 linhas) com "o que foi definido" — destaque pautas, decisões, inteligência de negócio relevante e observações do consultor.
- proximos_passos_acordados: array (echoe os dados da ATA, sem inventar) de objetos { descricao, responsavel, prazo }.

Regras:
- Use SOMENTE dados reais fornecidos acima. NÃO invente números, datas ou responsáveis.
- Se um campo não tiver dado, use string vazia ou array vazio conforme o caso.
- Seja conciso e objetivo. Tom profissional.
- Mantenha a ordem das atas (ata 1 = antepenúltima, ata 3 = última).`;

    const llmResp = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          atas: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                ata_id: { type: 'string' },
                resumo_curto: { type: 'string' },
                resumo_detalhado: { type: 'string' },
                proximos_passos_acordados: {
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
          }
        }
      }
    });

    // 4. Montar resposta final cruzando metadados da ATA com o resumo da IA
    const resumidos = (llmResp?.atas || []).reduce((acc, r) => {
      acc[r.ata_id] = r;
      return acc;
    }, {});

    // Ordem de exibição: antepenúltima → penúltima → última (cronológica crescente).
    // atas veio ordenado decrescente (newest first); inverter para oldest first.
    const atasAsc = [...atas].reverse();
    const atasResultado = atasAsc.map((a, idx) => {
      const r = resumidos[a.id] || {};
      const fromEnd = atasAsc.length - 1 - idx; // 0 = última, 1 = penúltima, 2 = antepenúltima
      const posicao = fromEnd === 0 ? 'última' : fromEnd === 1 ? 'penúltima' : 'antepenúltima';
      return {
        ata_id: a.id,
        meeting_date: a.meeting_date || null,
        tipo: a.tipo_aceleracao || a.tipo_atendimento || 'ATA',
        consultor_name: a.consultor_name || null,
        posicao,
        resumo_curto: r.resumo_curto || 'Resumo indisponível para esta ATA.',
        resumo_detalhado: r.resumo_detalhado || 'Resumo indisponível para esta ATA.',
        proximos_passos_acordados: Array.isArray(r.proximos_passos_acordados) ? r.proximos_passos_acordados : []
      };
    });

    return Response.json({ success: true, atas: atasResultado });
  } catch (error) {
    console.error('❌ Erro ao gerar leitura das 3 atas:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}