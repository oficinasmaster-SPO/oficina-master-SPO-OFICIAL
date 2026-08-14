import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Dispara notificação in-app + e-mail para o responsável quando um
 * Pedido Interno é criado com responsável definido.
 * Acionado por entity automation em PedidoInterno (event: create).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data } = payload;
    const eventType = event?.type;

    // Só age na criação com responsável definido
    if (eventType !== 'create' || !data?.assignee_id) {
      return Response.json({ ok: true, skip: true });
    }

    const pedidoId = data?.id || event?.entity_id;
    const titulo = data.titulo || 'Sem título';
    const descricao = data.descricao || '';
    const clienteNome = data.workshop_nome || '';
    const solicitanteNome = data.requester_name || 'Sistema';
    const prioridade = data.prioridade || 'media';
    const prazo = data.prazo || '';
    const tipo = data.tipo || '';

    const tipoLabel = {
      apoio_tecnico: 'Apoio Técnico',
      decisao_estrategica: 'Decisão Estratégica',
      liberacao_material: 'Liberação de Material',
      excecao_escopo: 'Exceção de Escopo',
      outros: 'Outros'
    }[tipo] || tipo;

    const prioridadeLabel = { baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: '🔴 Crítica' }[prioridade] || prioridade;

    // Notificação in-app
    try {
      await base44.asServiceRole.entities.Notification.create({
        user_id: data.assignee_id,
        tipo: 'pedido_interno_criado',
        title: `Novo pedido interno: ${titulo}`,
        message: `${clienteNome ? `[${clienteNome}] ` : ''}${titulo}. Solicitado por: ${solicitanteNome}`,
        is_read: false,
        email_sent: false,
        metadata: { pedido_id: pedidoId }
      });
    } catch (e) {
      console.error('Erro ao criar notificação in-app:', e.message);
    }

    // Notificação in-app apenas (sem e-mail) — consolidação anti-duplicação
    return Response.json({ ok: true, in_app: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});