import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workshop_id } = await req.json();

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id required' }, { status: 400 });
    }

    // Data de referência (hoje)
    const hoje = new Date();
    const hojeDateString = hoje.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log(`[DIAGNÓSTICO] Iniciando para workshop: ${workshop_id}`);
    console.log(`[DIAGNÓSTICO] Data de referência: ${hojeDateString}`);

    // ============================================
    // 1. CONTAR CONTRACTS ATIVOS
    // ============================================
    console.log('[1/5] Buscando Contracts...');
    const contracts = await base44.asServiceRole.entities.Contract.filter({
      workshop_id,
      status: { '$in': ['ativo', 'efetivado'] }
    });
    
    const totalContratos = contracts.length;
    console.log(`✅ Total de contratos: ${totalContratos}`);

    // ============================================
    // 2. CONTAR FOLLOW-UP REMINDERS ATRASADOS
    // ============================================
    console.log('[2/5] Buscando FollowUpReminder atrasados...');
    const followupsDiretos = await base44.asServiceRole.entities.FollowUpReminder.filter({
      workshop_id,
      is_completed: false
    }, '-reminder_date', 1000);

    // Filtrar manualmente por data (JS side, pois BASE44 pode ter issues com date comparison)
    const followupsAtrasados = followupsDiretos.filter(f => {
      const dataReminder = new Date(f.reminder_date);
      const dataReminderString = dataReminder.toISOString().split('T')[0];
      return dataReminderString < hojeDateString;
    });

    console.log(`✅ Total de follow-ups atrasados: ${followupsAtrasados.length}`);

    // ============================================
    // 3. CONTAR MEETING MINUTES (ATAS)
    // ============================================
    console.log('[3/5] Buscando MeetingMinutes (ATAs)...');
    const atas = await base44.asServiceRole.entities.MeetingMinutes.filter({
      workshop_id
    }, '-meeting_date', 1000);

    console.log(`✅ Total de ATAs: ${atas.length}`);

    // ============================================
    // 4. VALIDAR CONTRACTS SEM ATA (2 DIAS)
    // ============================================
    console.log('[4/5] Validando Contracts sem ATA (últimos 2 dias)...');
    const diasAtrás2 = new Date(hoje);
    diasAtrás2.setDate(diasAtrás2.getDate() - 2);
    const dataLimite2Dias = diasAtrás2.toISOString().split('T')[0];

    const contractsRecentes = contracts.filter(c => {
      if (!c.activated_at) return false;
      const dataAtivacao = new Date(c.activated_at);
      const dataAtivacaoString = dataAtivacao.toISOString().split('T')[0];
      return dataAtivacaoString >= dataLimite2Dias;
    });

    const contractsSemAta = contractsRecentes.filter(c => {
      return !atas.some(a => {
        // Correlacionar por atendimento_id ou meeting_date >= activated_at
        if (c.atendimento_id && a.atendimento_id === c.atendimento_id) {
          return true;
        }
        // Ou por data
        const dataMeeting = new Date(a.meeting_date);
        const dataAtivacao = new Date(c.activated_at);
        return dataMeeting >= dataAtivacao;
      });
    });

    console.log(`✅ Contracts recentes sem ATA: ${contractsSemAta.length}`);

    // ============================================
    // 5. CONTAR CRONOGRAMA ATRASADO
    // ============================================
    console.log('[5/5] Buscando CronogramaImplementacao atrasado...');
    const cronogramaTodos = await base44.asServiceRole.entities.CronogramaImplementacao.filter({
      workshop_id
    }, '-created_date', 1000);

    const cronogramaAtrasado = cronogramaTodos.filter(c => {
      if (!c.data_termino_previsto || c.status === 'concluido') return false;
      const dataTermino = new Date(c.data_termino_previsto);
      const dataTerminoString = dataTermino.toISOString().split('T')[0];
      return dataTerminoString < hojeDateString;
    });

    console.log(`✅ Total cronograma atrasado: ${cronogramaAtrasado.length}`);

    // ============================================
    // 6. CONTAR ATENDIMENTOS COM RISCO
    // ============================================
    console.log('[6/6] Buscando ConsultoriaAtendimento com risco...');
    const atendimentosTodos = await base44.asServiceRole.entities.ConsultoriaAtendimento.filter({
      workshop_id
    }, '-created_date', 1000);

    const atendimentosRisco = atendimentosTodos.filter(a => {
      return ['atrasado', 'faltou', 'cancelado'].includes(a.status);
    });

    console.log(`✅ Total atendimentos em risco: ${atendimentosRisco.length}`);

    // ============================================
    // CONSOLIDAR CLIENTES ÚNICOS COM RISCO
    // ============================================
    const clientesComRiscoMap = {};

    // Adicionar por follow-up
    followupsAtrasados.forEach(f => {
      const key = f.workshop_id;
      if (!clientesComRiscoMap[key]) {
        clientesComRiscoMap[key] = { riscos: [] };
      }
      if (!clientesComRiscoMap[key].riscos.includes('followup_atrasado')) {
        clientesComRiscoMap[key].riscos.push('followup_atrasado');
      }
    });

    // Adicionar por ATA
    contractsSemAta.forEach(c => {
      const key = c.id;
      if (!clientesComRiscoMap[key]) {
        clientesComRiscoMap[key] = { riscos: [] };
      }
      if (!clientesComRiscoMap[key].riscos.includes('sem_ata')) {
        clientesComRiscoMap[key].riscos.push('sem_ata');
      }
    });

    // Adicionar por cronograma
    cronogramaAtrasado.forEach(c => {
      const key = c.workshop_id;
      if (!clientesComRiscoMap[key]) {
        clientesComRiscoMap[key] = { riscos: [] };
      }
      if (!clientesComRiscoMap[key].riscos.includes('cronograma_atrasado')) {
        clientesComRiscoMap[key].riscos.push('cronograma_atrasado');
      }
    });

    // Adicionar por atendimento
    atendimentosRisco.forEach(a => {
      const key = a.workshop_id;
      if (!clientesComRiscoMap[key]) {
        clientesComRiscoMap[key] = { riscos: [] };
      }
      if (!clientesComRiscoMap[key].riscos.includes('atendimento_risco')) {
        clientesComRiscoMap[key].riscos.push('atendimento_risco');
      }
    });

    const clientesEmRisco = Object.keys(clientesComRiscoMap).length;

    // ============================================
    // CALCULAR TAXA
    // ============================================
    const taxaRisco = totalContratos > 0 
      ? Math.round((clientesEmRisco / totalContratos) * 100)
      : 0;

    // ============================================
    // RELATÓRIO FINAL
    // ============================================
    const relatorio = {
      data_diagnostico: new Date().toISOString(),
      workshop_id,
      
      // Totais
      totais: {
        total_contratos: totalContratos,
        total_atas: atas.length,
        total_cronograma: cronogramaTodos.length,
        total_atendimentos: atendimentosTodos.length,
      },

      // Riscos identificados
      riscos: {
        followup_atrasado: followupsAtrasados.length,
        contracts_sem_ata_2dias: contractsSemAta.length,
        cronograma_atrasado: cronogramaAtrasado.length,
        atendimentos_risco: atendimentosRisco.length,
      },

      // Consolidação
      consolidacao: {
        clientes_com_risco: clientesEmRisco,
        clientes_sem_risco: totalContratos - clientesEmRisco,
        taxa_risco_percentual: taxaRisco,
      },

      // Diagnóstico
      diagnostico: {
        tem_dados: totalContratos > 0,
        tem_riscos: clientesEmRisco > 0,
        conclusao: getTipoProblema(
          totalContratos,
          clientesEmRisco,
          followupsAtrasados.length,
          contractsSemAta.length,
          cronogramaAtrasado.length,
          atendimentosRisco.length
        ),
      },

      // Detalhes para debug
      detalhes: {
        followup_atrasado_ids: followupsAtrasados.slice(0, 3).map(f => ({ id: f.id, dias: calcularDiasAtraso(f.reminder_date) })),
        contracts_sem_ata_ids: contractsSemAta.slice(0, 3).map(c => ({ id: c.id, name: c.workshop_name })),
        cronograma_atrasado_ids: cronogramaAtrasado.slice(0, 3).map(c => ({ id: c.id, dias_atraso: calcularDiasAtraso(c.data_termino_previsto) })),
      }
    };

    console.log('[✅] Diagnóstico completo');
    console.log(JSON.stringify(relatorio, null, 2));

    return Response.json(relatorio);

  } catch (error) {
    console.error('[ERROR]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Helper functions
function getTipoProblema(total, emRisco, followup, semAta, cronograma, atendimento) {
  if (total === 0) {
    return '⚠️ Nenhum contrato ativo. Problema: dados não criados no banco.';
  }
  
  if (emRisco === 0) {
    return '✅ Dados existem, mas sem riscos identificados. Situação controlada.';
  }

  if (followup > 0 || semAta > 0) {
    return '🔴 CRÍTICO: Follow-ups atrasados ou sem ATA recente. Código estava retornando zero - problema confirmado.';
  }

  return '🟠 ALTO: Riscos identificados em cronograma ou atendimentos.';
}

function calcularDiasAtraso(dataPrevista) {
  const hoje = new Date();
  const data = new Date(dataPrevista);
  const diff = hoje.getTime() - data.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}