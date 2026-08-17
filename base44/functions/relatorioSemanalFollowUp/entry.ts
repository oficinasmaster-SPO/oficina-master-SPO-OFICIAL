import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * S6 — relatorioSemanalFollowUp
 *
 * Agrega dados da semana (seg–sex) por consultor/cliente.
 * Retorna JSON estruturado pra o frontend gerar o PDF.
 *
 * Colunas da tabela principal:
 *   Consultor | Cliente | Dia(s) atendido(s) | FUs fechados | FUs atrasados | FUs sem retorno
 *
 * Inclui TODOS os workshops ativos, mesmo aqueles sem nenhum FU.
 *
 * Listas separadas (query adicional Workshop.filter({status:'ativo'})):
 *   - clientesSemFollowUp: workshops ativos com ZERO FUs no sistema
 *   - clientesSemRetorno:   workshops com FU atrasado e nenhum contato na semana
 *
 * Semântica das colunas:
 *   - fusFechados:   FUs concluídos cujo completed_at cai na semana
 *   - fusAtrasados:  FUs pendentes com reminder_date < hoje
 *   - fusSemRetorno: subconjunto de atrasados de clientes que NÃO foram
 *                    atendidos na semana (0 fechados) — cliente não respondeu
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
    const hojeStr = hoje.toISOString().split('T')[0];

    // ── Query 1: Workshops ativos com consultor principal ──
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

    // ── Query 2: Follow-ups concluídos (todos) ──
    const concluidos = await base44.asServiceRole.entities.FollowUpReminder.filter(
      { is_completed: true }, '-completed_at', 5000
    );
    const concluidosSemana = concluidos.filter(c => {
      const d = (c.completed_at || c.created_date || '').split('T')[0];
      return d >= segStr && d <= sexStr;
    });

    // ── Query 3: Follow-ups pendentes (todos) ──
    const pendentes = await base44.asServiceRole.entities.FollowUpReminder.filter(
      { is_completed: false }, 'reminder_date', 5000
    );

    // ── Mapa de workshops que aparecem em algum FU (para detectar "sem follow-up") ──
    const workshopsComFu = new Set();
    concluidos.forEach(c => { if (c.workshop_id) workshopsComFu.add(c.workshop_id); });
    pendentes.forEach(p => { if (p.workshop_id) workshopsComFu.add(p.workshop_id); });

    // ── Inicializar relatório com TODOS os workshops ativos ──
    // Cada workshop ativo vira uma linha, mesmo sem nenhum FU.
    const relatorio = {};
    Object.entries(workshopMap).forEach(([wid, ws]) => {
      const cid = ws.consultorId || '__sem_consultor__';
      const cname = ws.consultorNome || 'Sem consultor';
      if (!relatorio[cid]) relatorio[cid] = { consultorNome: cname, clientes: {} };
      relatorio[cid].clientes[wid] = {
        clienteNome: ws.name,
        diasAtendidos: [],
        fusFechados: 0,
        fusAtrasados: 0,
        fusSemRetorno: 0,
        temFu: workshopsComFu.has(wid),
      };
    });

    // Helper: entry de um FU (workshop órfão/fora do mapa é ignorado)
    const getEntry = (wid) => {
      const ws = workshopMap[wid];
      if (!ws) return null;
      const cid = ws.consultorId || '__sem_consultor__';
      return relatorio[cid]?.clientes[wid] || null;
    };

    // Concluídos da semana → fusFechados + dias atendidos
    concluidosSemana.forEach(c => {
      const entry = getEntry(c.workshop_id);
      if (!entry) return;
      entry.fusFechados++;
      const dia = (c.completed_at || c.created_date || '').split('T')[0];
      if (dia && !entry.diasAtendidos.includes(dia)) entry.diasAtendidos.push(dia);
    });

    // Pendentes atrasados (reminder_date < hoje) → fusAtrasados
    pendentes.forEach(r => {
      const entry = getEntry(r.workshop_id);
      if (!entry) return;
      if (r.reminder_date && r.reminder_date < hojeStr) {
        entry.fusAtrasados++;
      }
    });

    // "Sem retorno" = atrasados de clientes que NÃO foram atendidos na semana
    // (o consultor tinha FUs a vencer mas não fechou nenhum — cliente sumiu)
    Object.values(relatorio).forEach(consultor => {
      Object.values(consultor.clientes).forEach(cliente => {
        if (cliente.fusAtrasados > 0 && cliente.fusFechados === 0) {
          cliente.fusSemRetorno = cliente.fusAtrasados;
        }
      });
    });

    // ── Montar tabela flat: TODOS os workshops ativos ──
    const linhas = [];
    Object.entries(relatorio)
      .sort((a, b) => a[1].consultorNome.localeCompare(b[1].consultorNome, 'pt-BR'))
      .forEach(([_, consultor]) => {
        Object.entries(consultor.clientes)
          .sort((a, b) => a[1].clienteNome.localeCompare(b[1].clienteNome, 'pt-BR'))
          .forEach(([wid, cliente]) => {
            linhas.push({
              consultor: consultor.consultorNome,
              cliente: cliente.clienteNome,
              diasAtendidos: cliente.diasAtendidos.sort().join(', '),
              fusFechados: cliente.fusFechados,
              fusAtrasados: cliente.fusAtrasados,
              fusSemRetorno: cliente.fusSemRetorno,
              semFollowUp: !cliente.temFu,
            });
          });
      });

    // ── Query separada: workshops ativos SEM nenhum FU no sistema ──
    // Workshop.filter({status:'ativo'}) menos os que aparecem em algum FU.
    const clientesSemFollowUp = Object.entries(workshopMap)
      .filter(([wid]) => !workshopsComFu.has(wid))
      .map(([wid, ws]) => ({
        cliente: ws.name,
        consultor: ws.consultorNome,
      }))
      .sort((a, b) =>
        a.consultor.localeCompare(b.consultor, 'pt-BR') ||
        a.cliente.localeCompare(b.cliente, 'pt-BR')
      );

    // ── Query separada: workshops com FU atrasado e nenhum contato na semana ──
    const clientesSemRetorno = [];
    Object.entries(relatorio).forEach(([_, consultor]) => {
      Object.entries(consultor.clientes).forEach(([wid, cliente]) => {
        if (cliente.fusSemRetorno > 0) {
          clientesSemRetorno.push({
            cliente: cliente.clienteNome,
            consultor: consultor.consultorNome,
            fusSemRetorno: cliente.fusSemRetorno,
          });
        }
      });
    });
    clientesSemRetorno.sort((a, b) =>
      a.consultor.localeCompare(b.consultor, 'pt-BR') ||
      a.cliente.localeCompare(b.cliente, 'pt-BR')
    );

    // ── Totais por consultor ──
    const totais = {};
    Object.entries(relatorio).forEach(([cid, c]) => {
      const t = {
        consultor: c.consultorNome,
        fusFechados: 0,
        fusAtrasados: 0,
        fusSemRetorno: 0,
        clientesAtendidos: 0,
        totalClientes: 0,
        clientesSemFollowUp: 0,
      };
      Object.values(c.clientes).forEach(cl => {
        t.fusFechados += cl.fusFechados;
        t.fusAtrasados += cl.fusAtrasados;
        t.fusSemRetorno += cl.fusSemRetorno;
        t.totalClientes++;
        if (cl.fusFechados > 0) t.clientesAtendidos++;
        if (!cl.temFu) t.clientesSemFollowUp++;
      });
      totais[cid] = t;
    });

    return Response.json({
      ok: true,
      periodo: `${segStr} a ${sexStr}`,
      semana,
      totalWorkshopsAtivos: Object.keys(workshopMap).length,
      linhas,
      totalLinhas: linhas.length,
      clientesSemFollowUp,
      totalSemFollowUp: clientesSemFollowUp.length,
      clientesSemRetorno,
      totalSemRetorno: clientesSemRetorno.length,
      totais: Object.values(totais),
    });
  } catch (error) {
    console.error('relatorioSemanalFollowUp: erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});