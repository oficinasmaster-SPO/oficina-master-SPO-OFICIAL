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
    if (eventType !== 'create' || !data?.responsavel_id) {
      return Response.json({ ok: true, skip: true });
    }

    const pedidoId = data?.id || event?.entity_id;
    const titulo = data.titulo || 'Sem título';
    const descricao = data.descricao || '';
    const clienteNome = data.cliente_nome || '';
    const solicitanteNome = data.solicitante_nome || 'Sistema';
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
        user_id: data.responsavel_id,
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

    // Busca e-mail do responsável
    const users = await base44.asServiceRole.entities.User.filter({ id: data.responsavel_id });
    const responsavel = users?.[0];

    if (!responsavel?.email) {
      return Response.json({ ok: true, email: false, reason: 'responsavel sem email' });
    }

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #dc2626; padding: 24px 32px;">
      <h1 style="color: #fff; margin: 0; font-size: 18px;">📌 Novo Pedido Interno atribuído a você</h1>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #111; font-size: 20px; margin: 0 0 4px 0;">${titulo}</h2>
      <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 14px;">Tipo: <strong>${tipoLabel}</strong></p>
      ${clienteNome ? `<p style="color: #6b7280; margin: 0 0 20px 0; font-size: 14px;">🏢 Cliente relacionado: <strong>${clienteNome}</strong></p>` : ''}
      ${descricao ? `
      <div style="background: #f9fafb; border-left: 4px solid #dc2626; padding: 16px; border-radius: 4px; margin-bottom: 20px;">
        <p style="color: #374151; margin: 0; font-size: 14px; line-height: 1.6; white-space: pre-line;">${descricao}</p>
      </div>` : ''}
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; width: 40%;">Prioridade</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111; font-size: 14px; font-weight: 600;">${prioridadeLabel}</td>
        </tr>
        ${prazo ? `<tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Prazo</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111; font-size: 14px; font-weight: 600;">${prazo}</td>
        </tr>` : ''}
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Solicitado por</td>
          <td style="padding: 8px 0; color: #111; font-size: 14px;">${solicitanteNome}</td>
        </tr>
      </table>
      <p style="color: #6b7280; font-size: 13px; margin: 0;">Acesse a plataforma Oficinas Master para responder e gerenciar este pedido.</p>
    </div>
  </div>
</body>
</html>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: responsavel.email,
      subject: `[Pedido Interno] ${titulo}${clienteNome ? ` — ${clienteNome}` : ''}`,
      body: htmlBody
    });

    return Response.json({ ok: true, email_sent: true, to: responsavel.email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});