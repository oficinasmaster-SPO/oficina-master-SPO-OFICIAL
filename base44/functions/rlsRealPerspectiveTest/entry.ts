import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Regressão RLS HONESTA: consulta na perspectiva do usuário autenticado.
// NUNCA usa asServiceRole nas asserções — o que este teste vê é exatamente
// o que o usuário logado vê no app.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userWorkshopIds = [user.workshop_id, user.data?.workshop_id].filter(Boolean);

    // [entidade, campo que aponta para a oficina]
    const entities = [
      ['DRELancamento', 'workshop_id'],
      ['DREMonthly', 'workshop_id'],
      ['DFCLancamento', 'workshop_id'],
      ['BudgetMeta', 'workshop_id'],
      ['ContaPagar', 'workshop_id'],
      ['ContaReceber', 'workshop_id'],
      ['LiquidacaoFinanceira', 'workshop_id'],
      ['CronogramaImplementacao', 'workshop_id'],
      ['ConsultoriaSprint', 'workshop_id'],
      ['ConsultoriaAtendimento', 'workshop_id'],
      ['Goal', 'workshop_id'],
      ['Task', 'workshop_id'],
      ['PedidoInterno', 'cliente_id']
    ];

    const resultados = {};
    let entidadesComVazamento = 0;

    for (const [name, field] of entities) {
      try {
        const records = await base44.entities[name].list('-created_date', 1000);
        const arr = Array.isArray(records) ? records : [];
        let own = 0;
        let other = 0;
        let semOficina = 0;
        const oficinasVazadas = new Set();

        for (const r of arr) {
          const wid = r[field];
          if (!wid) {
            semOficina++;
          } else if (userWorkshopIds.includes(wid)) {
            own++;
          } else {
            other++;
            oficinasVazadas.add(wid);
          }
        }

        const vazamento = other > 0;
        if (vazamento) entidadesComVazamento++;

        resultados[name] = {
          campo_oficina: field,
          total_visiveis: arr.length,
          da_minha_oficina: own,
          de_outras_oficinas: other,
          sem_oficina: semOficina,
          vazamento,
          oficinas_vazadas: Array.from(oficinasVazadas).slice(0, 20)
        };
      } catch (error) {
        resultados[name] = { erro: error.message };
      }
    }

    return Response.json({
      executado_em: new Date().toISOString(),
      perspectiva: 'usuario_autenticado (sem asServiceRole)',
      usuario: {
        id: user.id,
        email: user.email,
        role: user.role,
        workshop_id_raiz: user.workshop_id || null,
        workshop_id_legado: user.data?.workshop_id || null
      },
      oficinas_do_usuario: userWorkshopIds,
      nota: user.role === 'admin'
        ? 'Usuário é admin — visibilidade global é esperada e não conta como vazamento real.'
        : 'Usuário não-admin — qualquer registro de outra oficina é vazamento real.',
      resumo: {
        entidades_testadas: entities.length,
        entidades_com_registros_de_outras_oficinas: entidadesComVazamento
      },
      resultados
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});