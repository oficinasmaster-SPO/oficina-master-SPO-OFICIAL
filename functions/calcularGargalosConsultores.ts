import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.job_role !== 'acelerador')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const consultores = await base44.asServiceRole.entities.Employee.filter({
      tipo_vinculo: 'interno'
    });

    const atendimentos = await base44.asServiceRole.entities.ConsultoriaAtendimento.filter({
      status: { $in: ['agendado', 'confirmado', 'participando', 'reagendado'] }
    });

    const resultado = consultores.map(consultor => {
      const horasSemanais = 40;
      const produtividadeMedia = 0.70;
      const capacidadeSemanal = horasSemanais * produtividadeMedia;

      const atendimentosConsultor = atendimentos.filter(
        a => a.consultor_id === consultor.user_id
      );

      const cargaAtiva = atendimentosConsultor.reduce((total, atendimento) => {
        const duracaoHoras = (atendimento.duracao_minutos || 60) / 60;
        return total + duracaoHoras;
      }, 0);

      const indiceSaturacao = capacidadeSemanal > 0 ? cargaAtiva / capacidadeSemanal : 0;

      return {
        id: consultor.id,
        nome: consultor.full_name,
        capacidade_semanal: capacidadeSemanal,
        carga_ativa: cargaAtiva,
        produtividade_media: produtividadeMedia,
        indice_saturacao: indiceSaturacao,
        atendimentos_ativos: atendimentosConsultor.length
      };
    });

    return Response.json(resultado);

  } catch (error) {
    console.error('Error calculating bottlenecks:', error);
    return Response.json({ 
      error: error.message || 'Erro ao calcular gargalos'
    }, { status: 500 });
  }
});