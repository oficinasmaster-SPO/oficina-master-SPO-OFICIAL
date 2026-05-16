import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const {
      atendimento_id,
      data_sugerida,
      hora_sugerida,
      mensagem_cliente,
      workshop_id
    } = await req.json();

    if (!atendimento_id || !data_sugerida || !hora_sugerida) {
      return Response.json({
        error: 'atendimento_id, data_sugerida e hora_sugerida são obrigatórios'
      }, { status: 400 });
    }

    // Validação: Verificar se a data sugerida é no futuro
    const dataSugerida = new Date(`${data_sugerida}T${hora_sugerida}:00`);
    if (dataSugerida <= new Date()) {
      return Response.json({
        error: 'A data e hora sugeridas devem ser no futuro'
      }, { status: 400 });
    }

    // Buscar atendimento original
    const atendimento = await base44.entities.ConsultoriaAtendimento.get(atendimento_id);
    if (!atendimento) {
      return Response.json({ error: 'Atendimento não encontrado' }, { status: 404 });
    }

    // Validação de segurança: Cliente só pode sugerir para sua própria oficina
    if (atendimento.workshop_id !== user.data?.workshop_id && user.role !== 'admin') {
      return Response.json({
        error: 'Você não tem permissão para sugerir horários para este atendimento'
      }, { status: 403 });
    }

    // Atualizar atendimento com sugestão (manter original, adicionar campos de sugestão)
    const atendimentoAtualizado = await base44.entities.ConsultoriaAtendimento.update(
      atendimento_id,
      {
        data_sugerida_cliente: dataSugerida.toISOString(),
        hora_sugerida_cliente: hora_sugerida,
        mensagem_cliente: mensagem_cliente || '',
        status_posta_venda: 'reagendada_pendente_confirmacao'
      }
    );

    // TODO: Enviar notificação ao consultor sobre a sugestão
    // await base44.functions.invoke('notificarConsultorSugestao', { ... })

    return Response.json({
      success: true,
      message: 'Sua sugestão foi enviada para o consultor. Você será notificado quando a nova data for confirmada.',
      atendimento_id: atendimento.id,
      data_sugerida,
      hora_sugerida
    });

  } catch (error) {
    console.error('Erro em sugerirNovoHorario:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});