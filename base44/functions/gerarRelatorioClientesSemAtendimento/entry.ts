import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hoje = new Date();
    console.log('[gerarRelatorioClientesSemAtendimento] Iniciando relatório');

    // 1. Buscar contratos ativos com planos que contemplam atendimentos
    const contratosAtivos = await base44.asServiceRole.entities.Contract.filter({
      status: { '$in': ['ativo', 'efetivado'] },
      plan_type: { '$in': ['START', 'BRONZE', 'PRATA', 'GOLD', 'IOM', 'MILLIONS'] }
    }, '-created_date', 2000);

    console.log('[gerarRelatorioClientesSemAtendimento] Contratos ativos:', contratosAtivos.length);

    const clientes = [];

    // 2. Para cada contrato, buscar dados complementares
    for (const contrato of contratosAtivos) {
      try {
        // Buscar última ata/reunião
        const atas = await base44.asServiceRole.entities.MeetingMinutes.filter({
          workshop_id: contrato.workshop_id
        }, '-meeting_date', 1);

        const dataUltimaReuniaoStr = atas.length > 0 ? atas[0].meeting_date : null;
        const dataUltimaReuniaoDate = dataUltimaReuniaoStr ? new Date(dataUltimaReuniaoStr) : null;

        // Buscar último follow-up completado
        const followups = await base44.asServiceRole.entities.FollowUpConcluido.filter({
          workshop_id: contrato.workshop_id
        }, '-completedAt', 1);

        const dataUltimoFollowupStr = followups.length > 0 ? followups[0].completedAt : null;
        const dataUltimoFollowupDate = dataUltimoFollowupStr ? new Date(dataUltimoFollowupStr) : null;

        // Calcular dias sem atendimento
        let diasSemAtendimento = 'Sem atendimento';
        if (dataUltimaReuniaoDate) {
          diasSemAtendimento = Math.floor((hoje - dataUltimaReuniaoDate) / (1000 * 60 * 60 * 24));
        }

        clientes.push({
          cliente: contrato.workshop_name || 'N/A',
          empresa: contrato.workshop_name || 'N/A',
          ultima_reuniao: dataUltimaReuniaoStr ? new Date(dataUltimaReuniaoStr).toLocaleDateString('pt-BR') : '—',
          ultimo_followup: dataUltimoFollowupStr ? new Date(dataUltimoFollowupStr).toLocaleDateString('pt-BR') : '—',
          dias_sem_atendimento: diasSemAtendimento,
          plano: contrato.plan_type,
          status_contrato: contrato.status
        });

      } catch (error) {
        console.warn(`[gerarRelatorioClientesSemAtendimento] Erro ao processar contrato ${contrato.id}:`, error.message);
      }
    }

    // 3. Ordenar por dias sem atendimento (descendente)
    clientes.sort((a, b) => {
      const diasA = typeof a.dias_sem_atendimento === 'number' ? a.dias_sem_atendimento : -1;
      const diasB = typeof b.dias_sem_atendimento === 'number' ? b.dias_sem_atendimento : -1;
      return diasB - diasA;
    });

    console.log('[gerarRelatorioClientesSemAtendimento] Total de clientes processados:', clientes.length);

    return Response.json({
      clientes,
      estatisticas: {
        total_contratos: contratosAtivos.length,
        total_processados: clientes.length,
        data_relatorio: hoje.toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('[gerarRelatorioClientesSemAtendimento] Erro:', error);
    return Response.json({ 
      error: error.message,
      clientes: []
    }, { status: 500 });
  }
});