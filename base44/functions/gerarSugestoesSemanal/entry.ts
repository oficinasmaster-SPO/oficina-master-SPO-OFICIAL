import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Função chamada pela automação toda segunda-feira às 08:00
// Gera sugestões para todos os consultores ativos
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Busca todos os usuários admin (consultores)
    const consultores = await base44.asServiceRole.entities.User.filter(
      { role: 'admin' }, '-created_date', 100
    );

    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    const dataInicio = amanha.toISOString().split('T')[0];

    let totalGeradas = 0;
    const erros = [];

    for (const consultor of consultores) {
      try {
        const res = await base44.asServiceRole.functions.invoke('gerarSugestoesAgendamento', {
          consultor_id: consultor.id,
          consultor_nome: consultor.full_name,
          data_inicio: dataInicio,
          max_por_dia: 2,
          horarios_disponiveis: ['09:00', '14:00'],
          dias_a_frente: 7,
        });
        totalGeradas += res?.total_geradas || 0;
      } catch (err) {
        erros.push({ consultor: consultor.full_name, erro: err.message });
      }
    }

    console.log(`[gerarSugestoesSemanal] Total geradas: ${totalGeradas} | Erros: ${erros.length}`);

    return Response.json({
      success: true,
      total_geradas: totalGeradas,
      consultores_processados: consultores.length,
      erros,
    });

  } catch (error) {
    console.error('Erro na geração semanal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});