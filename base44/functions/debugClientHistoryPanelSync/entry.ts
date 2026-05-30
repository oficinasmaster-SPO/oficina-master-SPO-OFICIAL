import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Debug: ClientHistoryFloatingPanel Sync Issues
 * 
 * Analisa por que o painel não está reconciliando corretamente:
 * 1. Conexão: Plano sumiu
 * 2. Autoelétrica Amateluso: 4 realizadas, painel mostra zero
 * 3. Renovação: Realizadas não contabilizam
 * 4. Simplão: Tipo errado, histórico se perde
 * 
 * Root cause: Mismatch entre nomes de tipos de atendimento
 * + vincular apenas por tipo_atendimento (frágil)
 * + deveria vincular por consultoria_atendimento_id (robusto)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { workshop_id } = await req.json();

    // Step 1: Buscar ContractAttendance (plano)
    const contracts = await base44.entities.ContractAttendance.filter(
      { workshop_id },
      null,
      500
    );

    // Step 2: Buscar ConsultoriaAtendimento (realizadas)
    const realizados = await base44.entities.ConsultoriaAtendimento.filter(
      { workshop_id },
      null,
      500
    );

    // Step 3: Normalizar tipos
    const normalize = (str) => (str || '')
      .toLowerCase()
      .replace(/[_\s-]+/g, ' ')
      .trim();

    // Step 4: Analisar matching
    const analysis = {
      workshop_id,
      total_contracts: (contracts || []).length,
      total_realizados: (realizados || []).length,
      by_type: {},
      mismatches: [],
      orphans_realizados: [],
      missing_linkage: []
    };

    // Agrupar por tipo
    const contractsByType = {};
    for (const c of (contracts || [])) {
      const norm = normalize(c.attendance_type_name);
      if (!contractsByType[norm]) {
        contractsByType[norm] = {
          original_name: c.attendance_type_name,
          contracts: [],
          realizados_found: []
        };
      }
      contractsByType[norm].contracts.push(c);
    }

    // Cruzar com realizados
    for (const r of (realizados || [])) {
      const norm = normalize(r.tipo_atendimento);
      
      if (contractsByType[norm]) {
        contractsByType[norm].realizados_found.push(r);
      } else {
        analysis.orphans_realizados.push({
          id: r.id,
          tipo: r.tipo_atendimento,
          data: r.data_realizada
        });
      }
    }

    // Step 5: Validar integridade de linkagem
    for (const [typeNorm, data] of Object.entries(contractsByType)) {
      const hasLinks = data.contracts.some(c => c.consultoria_atendimento_id);
      const shouldHaveLinks = data.realizados_found.length > 0;

      if (shouldHaveLinks && !hasLinks) {
        analysis.missing_linkage.push({
          type: typeNorm,
          original_name: data.original_name,
          contracts_count: data.contracts.length,
          realizados_count: data.realizados_found.length,
          message: 'ContractAttendance não estão linkados aos ConsultoriaAtendimento'
        });
      }

      analysis.by_type[typeNorm] = {
        original_name: data.original_name,
        planned: data.contracts.length,
        realized: data.realizados_found.length,
        linked: data.contracts.filter(c => c.consultoria_atendimento_id).length,
        is_overbooking: data.realizados_found.length > data.contracts.length
      };
    }

    // Step 6: Diagnosticar problemas específicos
    const diagnosis = {
      conexao_plano_desaparecido: contracts.length === 0 && realizados.length > 0,
      painel_mostra_zero: contracts.length > 0 && analysis.missing_linkage.length > 0,
      realizadas_nao_contabilizam: Object.values(analysis.by_type).some(t => t.realized > 0 && t.planned > 0 && t.realized !== t.planned),
      tipo_errado_perdeu_historico: analysis.orphans_realizados.length > 0
    };

    return Response.json({
      analysis,
      diagnosis,
      recommendations: generateRecommendations(analysis, diagnosis)
    });

  } catch (error) {
    console.error('Debug error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});

function generateRecommendations(analysis, diagnosis) {
  const recs = [];

  if (diagnosis.conexao_plano_desaparecido) {
    recs.push({
      issue: 'Conexão: Plano desapareceu',
      cause: 'ContractAttendance foi deletado ou não foi gerado',
      solution: 'Rodar generateContractAttendances com workshop_id específico'
    });
  }

  if (analysis.missing_linkage.length > 0) {
    recs.push({
      issue: 'Painel mostra zero apesar de realizadas',
      cause: 'ContractAttendance não estão linkados (consultoria_atendimento_id vazio)',
      solution: 'Rodar backfillLinkAttendancesToRealized para vincular registro',
      affected_types: analysis.missing_linkage.map(m => m.type)
    });
  }

  if (analysis.orphans_realizados.length > 0) {
    recs.push({
      issue: 'Tipo errado na criação = histórico perdido',
      cause: 'ConsultoriaAtendimento foi criado com tipo diferente do plano',
      solution: 'Atualizar consultoria_atendimento_id diretamente no ContractAttendance',
      orphans: analysis.orphans_realizados
    });
  }

  return recs;
}