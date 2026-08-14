import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * S3 — distribuirFollowUpsSemanal
 *
 * Distribui os follow-ups pendentes da semana entre os dias úteis (seg–sex),
 * respeitando o consultor_principal_id atribuído na Gestão de Tenants.
 *
 * Lógica:
 *   1. Lista Workshops ativos com consultor_principal_id definido
 *   2. Lista FollowUpReminders pendentes (is_completed: false)
 *   3. Agrupa empresas por consultor → calcula cota: ceil(total / 5)
 *   4. Distribui as empresas nos dias da semana (round-robin seg→sex)
 *   5. Atualiza reminder_date e consultor_principal_id nos reminders
 *   6. Sábado/domingo → puxados pra sexta
 *
 * Executar: toda segunda-feira via cron, ou manualmente via invoke.
 * Idempotente: pode ser chamada múltiplas vezes na mesma semana.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ── 1. Workshops ativos com consultor principal ──
    const workshops = await base44.asServiceRole.entities.Workshop.filter(
      { status: 'ativo' },
      'name',
      500
    );

    const workshopsComConsultor = workshops.filter(
      w => w.consultor_principal_id && w.id
    );

    // Mapa workshop_id → { consultor_principal_id, consultor_principal_nome, name }
    const workshopMap = {};
    workshopsComConsultor.forEach(w => {
      workshopMap[w.id] = {
        consultorId: w.consultor_principal_id,
        consultorNome: w.consultor_principal_nome || '',
        name: w.name || '',
      };
    });

    // ── 2. Follow-ups pendentes ──
    const reminders = await base44.asServiceRole.entities.FollowUpReminder.filter(
      { is_completed: false },
      'reminder_date',
      5000
    );

    // ── 3. Agrupar empresas por consultor ──
    // Uma empresa = um workshop_id. Um workshop pode ter múltiplos follow-ups.
    const empresasPorConsultor = {}; // { consultorId → Set<workshopId> }
    const remindersPorEmpresa = {}; // { workshopId → [reminders] }

    reminders.forEach(r => {
      if (!r.workshop_id) return;
      const ws = workshopMap[r.workshop_id];
      if (!ws) return; // workshop sem consultor principal — ignora

      const cid = ws.consultorId;
      if (!empresasPorConsultor[cid]) empresasPorConsultor[cid] = new Set();
      empresasPorConsultor[cid].add(r.workshop_id);

      if (!remindersPorEmpresa[r.workshop_id]) remindersPorEmpresa[r.workshop_id] = [];
      remindersPorEmpresa[r.workshop_id].push(r);
    });

    // ── 4. Calcular datas da semana (seg–sex) ──
    const hoje = new Date();
    const diaSemana = hoje.getDay(); // 0=dom, 1=seg, ..., 6=sab

    // Calcula a segunda-feira da semana CORRENTE (seg-sex).
    // Se executada no sábado ou domingo, avança pra próxima segunda
    // pra não redistribuir follow-ups pra dias já passados.
    let offsetParaSegunda;
    if (diaSemana === 0) offsetParaSegunda = 1;        // dom → próxima seg
    else if (diaSemana === 6) offsetParaSegunda = 2;   // sab → próxima seg
    else offsetParaSegunda = -(diaSemana - 1);         // seg=0, ter=-1, ...
    const segunda = new Date(hoje);
    segunda.setDate(hoje.getDate() + offsetParaSegunda);
    segunda.setHours(0, 0, 0, 0);

    const diasUteis = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(segunda);
      d.setDate(segunda.getDate() + i);
      diasUteis.push(d.toISOString().split('T')[0]); // "YYYY-MM-DD"
    }
    const sextaDate = diasUteis[4]; // sexta-feira

    // ── 5. Distribuir e atualizar ──
    const resultado = {};
    let totalAtualizado = 0;

    for (const [consultorId, empresasSet] of Object.entries(empresasPorConsultor)) {
      const empresas = Array.from(empresasSet);
      const total = empresas.length;
      const cotaDiaria = Math.ceil(total / 5);
      const consultorNome = workshopMap[empresas[0]]?.consultorNome || consultorId;

      resultado[consultorId] = {
        consultorNome,
        totalEmpresas: total,
        cotaDiaria,
        distribuicao: {},
      };

      // Round-robin: distribui empresas nos 5 dias
      empresas.forEach((workshopId, idx) => {
        const diaIdx = idx % 5;
        const diaAlvo = diasUteis[diaIdx];

        if (!resultado[consultorId].distribuicao[diaAlvo]) {
          resultado[consultorId].distribuicao[diaAlvo] = [];
        }
        resultado[consultorId].distribuicao[diaAlvo].push(
          workshopMap[workshopId]?.name || workshopId
        );

        // Atualiza os reminders desta empresa
        const fus = remindersPorEmpresa[workshopId] || [];
        for (const fu of fus) {
          let novaData = diaAlvo;

          // Se o reminder original é de sáb/dom → puxa pra sexta
          if (fu.reminder_date) {
            const rdDate = new Date(fu.reminder_date + 'T12:00:00');
            const rdDow = rdDate.getDay();
            if (rdDow === 0 || rdDow === 6) {
              novaData = sextaDate;
            }
          }

          // Só atualiza se mudou algo — evita writes desnecessários
          const mudouData = fu.reminder_date !== novaData;
          const mudouConsultor = fu.consultor_principal_id !== consultorId;

          if (mudouData || mudouConsultor) {
            // Fire-and-forget update — errors são logados mas não travam o loop
            base44.asServiceRole.entities.FollowUpReminder.update(fu.id, {
              reminder_date: novaData,
              consultor_principal_id: consultorId,
              consultor_principal_nome: consultorNome,
              atribuicao_automatica: true,
            }).catch(e => console.error(`Erro ao atualizar FU ${fu.id}:`, e.message));
            totalAtualizado++;
          }
        }
      });
    }

    return Response.json({
      ok: true,
      semana: `${diasUteis[0]} → ${diasUteis[4]}`,
      totalReminders: reminders.length,
      totalAtualizado,
      consultores: resultado,
    });
  } catch (error) {
    console.error('distribuirFollowUpsSemanal: erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
