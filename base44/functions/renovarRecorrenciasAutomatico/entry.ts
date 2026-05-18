import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Renovação Automática de Recorrências DRE
 * Roda mensalmente e detecta recorrências que estão na última parcela
 * ou já terminaram no mês atual, gerando automaticamente as próximas 12 parcelas.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Aceita chamada de automação agendada (sem user) OU admin
    let isScheduled = false;
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch {
      isScheduled = true; // chamada de automação sem contexto de usuário
    }

    const hoje = new Date();
    const mesAtual = formatarMes(hoje);
    const mesProximo = formatarMes(addMeses(hoje, 1));

    // Buscar todos lançamentos recorrentes que são última parcela ou parcela atual = total
    // Estratégia: pegar todos com recorrencia_id definido e parcela_atual = numero_parcelas
    const ultimasParcelas = await base44.asServiceRole.entities.DRELancamento.filter({
      frequencia: { $in: ['mensal', 'quinzenal', 'semanal', 'anual'] }
    }, '-created_date', 500);

    if (!ultimasParcelas || ultimasParcelas.length === 0) {
      return Response.json({ success: true, message: 'Nenhuma recorrência encontrada', renovadas: 0 });
    }

    // Agrupar por recorrencia_id
    const grupos = {};
    for (const l of ultimasParcelas) {
      if (!l.recorrencia_id) continue;
      if (!grupos[l.recorrencia_id]) {
        grupos[l.recorrencia_id] = { lancamentos: [], info: l };
      }
      grupos[l.recorrencia_id].lancamentos.push(l);
    }

    const renovadas = [];
    const ignoradas = [];

    for (const [recorrencia_id, grupo] of Object.entries(grupos)) {
      const lancamentos = grupo.lancamentos;
      const info = grupo.info;

      // Ordenar por parcela_atual
      lancamentos.sort((a, b) => (a.parcela_atual || 0) - (b.parcela_atual || 0));

      const ultimaParcela = lancamentos[lancamentos.length - 1];
      const totalParcelas = ultimaParcela.numero_parcelas || lancamentos.length;

      // Só renovar se: é realmente a última parcela E o mês dela é o atual ou o próximo
      const ehUltimaParcela = (ultimaParcela.parcela_atual || lancamentos.length) >= totalParcelas;
      const mesUltima = ultimaParcela.mes;
      const dentroJanela = mesUltima === mesAtual || mesUltima === mesProximo;

      if (!ehUltimaParcela || !dentroJanela) {
        ignoradas.push({ recorrencia_id, motivo: 'não está na última parcela ou fora da janela' });
        continue;
      }

      // Verificar se já existe algum lançamento desta recorrência no mês seguinte à última
      const mesAposUltima = formatarMes(addMesesFromStr(mesUltima, 1));
      const jaExiste = lancamentos.some(l => l.mes >= mesAposUltima);
      if (jaExiste) {
        ignoradas.push({ recorrencia_id, motivo: 'já renovada anteriormente' });
        continue;
      }

      // Gerar novo recorrencia_id para o próximo ciclo
      const novo_recorrencia_id = crypto.randomUUID();
      const novoInicio = mesAposUltima;
      const frequencia = info.frequencia || 'mensal';
      const novasParcelas = totalParcelas; // renovar com mesmo número de parcelas

      // Calcular períodos
      const periodos = calcularPeriodos(novoInicio, null, novasParcelas, frequencia);

      const criados = [];
      for (let i = 0; i < periodos.length; i++) {
        const lancamento = await base44.asServiceRole.entities.DRELancamento.create({
          workshop_id: info.workshop_id,
          mes: periodos[i].mes,
          tipo: info.tipo,
          categoria: info.categoria,
          subcategoria: info.subcategoria,
          descricao: info.descricao,
          valor: info.valor,
          entra_tcmp2: info.entra_tcmp2 ?? true,
          frequencia,
          recorrencia_id: novo_recorrencia_id,
          data_inicio: novoInicio,
          numero_parcelas: novasParcelas,
          parcela_atual: i + 1,
          renovacao_automatica: true,
          recorrencia_id_anterior: recorrencia_id
        });
        criados.push({ id: lancamento.id, mes: periodos[i].mes, parcela: i + 1 });
      }

      // Notificar o criador original
      try {
        const criadorEmail = info.created_by;
        if (criadorEmail) {
          const usuarios = await base44.asServiceRole.entities.User.filter({ email: criadorEmail });
          const criador = usuarios[0];
          if (criador) {
            await base44.asServiceRole.entities.Notification.create({
              user_id: criador.id,
              title: `🔄 Recorrência renovada automaticamente`,
              message: `"${info.descricao}" foi renovada por mais ${novasParcelas} parcelas a partir de ${novoInicio}. Valor: ${formatarMoeda(info.valor)}/parcela.`,
              type: 'renovacao_recorrencia',
              metadata: { novo_recorrencia_id, recorrencia_id_anterior: recorrencia_id, parcelas: novasParcelas }
            });
          }
        }
      } catch (notifErr) {
        console.error('Erro ao notificar renovação:', notifErr.message);
      }

      renovadas.push({
        recorrencia_id_anterior: recorrencia_id,
        novo_recorrencia_id,
        descricao: info.descricao,
        workshop_id: info.workshop_id,
        parcelas_criadas: criados.length,
        inicio: novoInicio
      });
    }

    return Response.json({
      success: true,
      mes_verificado: mesAtual,
      total_grupos: Object.keys(grupos).length,
      renovadas: renovadas.length,
      ignoradas: ignoradas.length,
      detalhe: renovadas
    });

  } catch (error) {
    console.error('Erro na renovação automática:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatarMes(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function addMeses(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function addMesesFromStr(mesStr, n) {
  const [year, month] = mesStr.split('-').map(Number);
  const d = new Date(year, month - 1, 1);
  d.setMonth(d.getMonth() + n);
  return d;
}

function calcularPeriodos(dataInicio, dataFim, numeroParcelas, frequencia) {
  const periodos = [];
  const [year, month] = dataInicio.split('-').map(Number);
  let current = new Date(year, month - 1, 1);
  const fim = dataFim ? new Date(dataFim) : null;
  let count = 0;

  while (true) {
    if (numeroParcelas && count >= numeroParcelas) break;
    if (fim && current > fim) break;
    if (count > 60) break;

    periodos.push({ mes: formatarMes(current) });
    count++;

    switch (frequencia) {
      case 'mensal': current.setMonth(current.getMonth() + 1); break;
      case 'quinzenal': current.setDate(current.getDate() + 15); break;
      case 'semanal': current.setDate(current.getDate() + 7); break;
      case 'anual': current.setFullYear(current.getFullYear() + 1); break;
      default: current.setMonth(current.getMonth() + 1);
    }
  }

  return periodos;
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}