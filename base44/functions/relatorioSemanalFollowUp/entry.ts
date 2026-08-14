import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * S6 — relatorioSemanalFollowUp
 *
 * Agrega dados da semana (seg–sex anterior ou semana atual) por consultor/cliente.
 * Retorna JSON estruturado pra o frontend gerar o PDF.
 *
 * Colunas:
 *   Consultor | Cliente | Dia que atendeu | FUs fechados | FUs atrasados | FUs sem retorno
 *
 * Invoke: base44.functions.invoke('relatorioSemanalFollowUp', { semana?: 'atual' | 'anterior' })
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const semana = body.semana || 'atual';

    // ── Calcular intervalo seg–sex ──
    const hoje = new Date();
    const diaSemana = hoje.getDay(); // 0=dom, 1=seg
    const offsetSeg = diaSemana === 0 ? -6 : -(diaSemana - 1);

    const segunda = new Date(hoje);
    segunda.setDate(hoje.getDate() + offsetSeg + (semana === 'anterior' ? -7 : 0));
    segunda.setHours(0, 0, 0, 0);

    const sexta = new Date(segunda);
    sexta.setDate(segunda.getDate() + 4);
    sexta.setHours(23, 59, 59, 999);

    const segStr = segunda.toISOString().split('T')[0];
    const sexStr = sexta.toISOString().split('T')[0];

    // ── Workshops ativos com consultor principal ──
    const workshops = await base44.asServiceRole.entities.Workshop.filter(
      { status: 'ativo' }, 'name', 500
    );
    const workshopMap = {};
    workshops.forEach(w => {
      if (w.id) workshopMap[w.id] = {
        name: w.name || w.id,
        consultorId: w.consultor_principal_id || null,
        consultorNome: w.consultor_principal_nome || 'Sem consultor',
      };
    });

    // ── Follow-ups concluídos no período ──
    const concluidos = await base44.asServiceRole.entities.FollowUpReminder.filter(
      { is_completed: true }, '-completed_at', 5000
    );
    const concluidosSemana = concluidos.filter(c => {
      const d = (c.completed_at || c.created_date || '').split('T')[0];
      return d >= segStr && d <= sexStr;
    });

    // ── Follow-ups pendentes (atrasados) ──
    const pendentes = await base44.asServiceRole.entities.FollowUpReminder.filter(
      { is_completed: false }, 'reminder_date', 5000
    );

    // ── Agregar por consultor → cliente ──
    // Estrutura: { consultorId: { consultorNome, clientes: { workshopId: { ... } } } }
    const relatorio = {};

    const getConsultorEntry = (wid) => {
      const ws = workshopMap[wid];
      if (!ws) return null;
      const cid = ws.consultorId || '__sem_consultor__';
      const cname = ws.consultorNome || 'Sem consultor';
      if (!relatorio[cid]) relatorio[cid] = { consultorNome: cname, clientes: {} };
      if (!relatorio[cid].clientes[wid]) {
        relatorio[cid].clientes[wid] = {
          clienteNome: ws.name,
          diasAtendidos: [],
          fusFechados: 0,
          fusAtrasados: 0,
          fusSemRetorno: 0,
        };
      }
      return relatorio[cid].clientes[wid];
    };

    // Concluídos da semana
    concluidosSemana.forEach(c => {
      if (!c.workshop_id) return;
      const entry = getConsultorEntry(c.workshop_id);
      if (!entry) return;
      entry.fusFechados++;
      const dia = (c.completed_at || c.created_date || '').split('T')[0];
      if (dia && !entry.diasAtendidos.includes(dia)) entry.diasAtendidos.push(dia);
      if (c.resultado === 'nao_atendeu' || c.resultado === 'aguardando') {
        entry.fusSemRetorno++;
      }
    });

    // Pendentes atrasados (reminder_date < hoje)
    const hojeStr = hoje.toISOString().split('T')[0];
    pendentes.forEach(r => {
      if (!r.workshop_id) return;
      if (r.reminder_date && r.reminder_date < hojeStr) {
        const entry = getConsultorEntry(r.workshop_id);
        if (entry) entry.fusAtrasados++;
      }
    });

    // ── Montar tabela flat pra o PDF ──
    const linhas = [];
    Object.entries(relatorio)
      .sort((a, b) => a[1].consultorNome.localeCompare(b[1].consultorNome, 'pt-BR'))
      .forEach(([_, consultor]) => {
        Object.entries(consultor.clientes)
          .sort((a, b) => a[1].clienteNome.localeCompare(b[1].clienteNome, 'pt-BR'))
          .forEach(([wid, cliente]) => {
            // Só inclui se teve alguma atividade na semana OU tem atrasados
            if (cliente.fusFechados > 0 || cliente.fusAtrasados > 0) {
              linhas.push({
                consultor: consultor.consultorNome,
                cliente: cliente.clienteNome,
                diasAtendidos: cliente.diasAtendidos.sort().join(', '),
                fusFechados: cliente.fusFechados,
                fusAtrasados: cliente.fusAtrasados,
                fusSemRetorno: cliente.fusSemRetorno,
              });
            }
          });
      });

    // ── Totais por consultor ──
    const totais = {};
    Object.entries(relatorio).forEach(([cid, c]) => {
      const t = { consultor: c.consultorNome, fusFechados: 0, fusAtrasados: 0, fusSemRetorno: 0, clientesAtendidos: 0 };
      Object.values(c.clientes).forEach(cl => {
        t.fusFechados += cl.fusFechados;
        t.fusAtrasados += cl.fusAtrasados;
        t.fusSemRetorno += cl.fusSemRetorno;
        if (cl.fusFechados > 0) t.clientesAtendidos++;
      });
      totais[cid] = t;
    });

    return Response.json({
      ok: true,
      periodo: `${segStr} a ${sexStr}`,
      semana,
      linhas,
      totais: Object.values(totais),
      totalLinhas: linhas.length,
    });
  } catch (error) {
    console.error('relatorioSemanalFollowUp: erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
