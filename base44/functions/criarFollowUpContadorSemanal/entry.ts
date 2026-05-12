import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Cron toda 2ª-feira 08:00
 * Para cada bucket/sprint ativo sem FU esta semana:
 * - Cria novo FU incrementando numero_sequencia
 * 
 * Acionada por: Scheduled automation (segunda-feira 08:00)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Busca todos os FUs com status != "concluido"
    const fusAtivos = await base44.asServiceRole.entities.FollowUpContador.filter({
      status: { '$ne': 'concluido' }
    }, '-data_criacao', 1000);

    if (fusAtivos.length === 0) {
      return Response.json({ info: 'Nenhum FU ativo encontrado', criados: 0 }, { status: 200 });
    }

    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1); // Segunda
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // Agrupa por origem_id
    const porOrigem = {};
    fusAtivos.forEach(fu => {
      const chave = `${fu.origem_tipo}:${fu.origem_id}`;
      if (!porOrigem[chave]) {
        porOrigem[chave] = [];
      }
      porOrigem[chave].push(fu);
    });

    let criados = 0;

    // Para cada origem, verifica se precisa criar novo FU esta semana
    for (const [chave, fus] of Object.entries(porOrigem)) {
      const [tipo, id] = chave.split(':');
      const fusMaRecentes = fus.sort((a, b) =>
        new Date(b.data_criacao) - new Date(a.data_criacao)
      );
      const fuMaisRecente = fusMaRecentes[0];

      // Se o FU mais recente já é desta semana, skip
      if (fuMaisRecente.data_ciclo_inicio === weekStartStr) {
        console.log(`ℹ️  ${chave}: FU desta semana já existe (#${fuMaisRecente.numero_sequencia})`);
        continue;
      }

      // Verifica se a origem ainda está "ativa" (não concluída)
      let origemAtiva = true;
      
      if (tipo === 'bucket') {
        // Bucket: verifica se status != completed
        const buckets = await base44.asServiceRole.entities.ConsultoriaSprint.filter({ id });
        origemAtiva = buckets.length > 0 && buckets[0].status !== 'completed';
      } else if (tipo === 'sprint') {
        // Sprint: verifica se status != completed
        const sprints = await base44.asServiceRole.entities.ConsultoriaSprint.filter({ id });
        origemAtiva = sprints.length > 0 && sprints[0].status !== 'completed';
      }

      if (!origemAtiva) {
        console.log(`ℹ️  ${chave}: Origem inativa ou concluída, pulando`);
        continue;
      }

      // ✅ Cria novo FU
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Domingo

      const proximoNumero = fuMaisRecente.numero_sequencia + 1;

      await base44.asServiceRole.entities.FollowUpContador.create({
        workshop_id: fuMaisRecente.workshop_id,
        consultor_id: fuMaisRecente.consultor_id,
        consultor_nome: fuMaisRecente.consultor_nome,
        origem_tipo: tipo,
        origem_id: id,
        origem_nome: fuMaisRecente.origem_nome,
        numero_sequencia: proximoNumero,
        status: 'ativo',
        ciclo_numero_semana: proximoNumero,
        data_ciclo_inicio: weekStartStr,
        data_ciclo_fim: weekEnd.toISOString().split('T')[0],
        data_criacao: new Date().toISOString(),
        contexto: {},
        historico: fuMaisRecente.historico || [],
        consulting_firm_id: fuMaisRecente.consulting_firm_id
      });

      console.log(`✅ ${chave}: FU #${proximoNumero} criado (cron semanal)`);
      criados++;
    }

    return Response.json({
      success: true,
      criados,
      semana: `${weekStartStr} a ${weekStart.toISOString().split('T')[0].slice(0, 10)}`
    });

  } catch (error) {
    console.error('❌ Erro em criarFollowUpContadorSemanal:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});