import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Envia NPS automático pós-atendimento de consultoria.
 * Disparado via automação de entidade: ConsultoriaAtendimento → update → status = 'realizado'
 *
 * Payload: { event, data (atendimento), old_data }
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const body = await req.json();
  const atendimento = body?.data;

  if (!atendimento) {
    return Response.json({ error: 'Payload inválido' }, { status: 400 });
  }

  // Garantir que só processa quando status mudou para 'realizado'
  const statusAtual = atendimento.status;
  const statusAnterior = body?.old_data?.status;
  if (statusAtual !== 'realizado' || statusAnterior === 'realizado') {
    return Response.json({ status: 'skip', reason: 'status não mudou para realizado' });
  }

  const workshopId = atendimento.workshop_id;
  if (!workshopId) {
    return Response.json({ status: 'skip', reason: 'sem workshop_id' });
  }

  // Buscar dados do workshop
  const workshops = await base44.asServiceRole.entities.Workshop.filter({ id: workshopId });
  const workshop = workshops?.[0];

  if (!workshop) {
    console.warn(`[NPS] Workshop ${workshopId} não encontrado.`);
    return Response.json({ status: 'skip', reason: 'workshop não encontrado' });
  }

  // E-mail de destino: email do workshop ou do responsável do atendimento
  const emailDestino = workshop.email || atendimento.responsavel_email || null;
  if (!emailDestino) {
    console.warn(`[NPS] Nenhum e-mail disponível para workshop ${workshop.name}`);
    return Response.json({ status: 'skip', reason: 'sem e-mail de destino' });
  }

  const appUrl = Deno.env.get('APP_URL') || 'https://app.oficinasmaster.com.br';
  const npsUrl = `${appUrl}/PublicNPS?wid=${workshopId}&ctx=consultoria&cid=${atendimento.id}`;

  const consultorNome = atendimento.consultor_nome || 'seu consultor';
  const dataAtendimento = atendimento.data_agendada
    ? new Date(atendimento.data_agendada).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' })
    : 'recente';

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff">
    <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:32px 24px;text-align:center;border-radius:8px 8px 0 0">
      ${workshop.logo_url ? `<img src="${workshop.logo_url}" alt="Logo" style="height:48px;object-fit:contain;background:#fff;border-radius:6px;padding:6px 10px;margin-bottom:16px" />` : ''}
      <h1 style="color:#fff;margin:0;font-size:22px">Como foi sua consultoria?</h1>
      <p style="color:#bfdbfe;margin:8px 0 0;font-size:14px">Atendimento de ${dataAtendimento}</p>
    </div>

    <div style="padding:32px 24px;text-align:center">
      <p style="color:#374151;font-size:16px;line-height:1.6;margin-bottom:8px">
        Olá, <strong>${workshop.name}</strong>!
      </p>
      <p style="color:#6b7280;font-size:15px;line-height:1.6;margin-bottom:28px">
        Acabamos de concluir seu atendimento com <strong>${consultorNome}</strong>. 
        Sua opinião é muito importante para continuarmos melhorando nosso serviço de consultoria.
        Leva menos de 1 minuto! 🙏
      </p>

      <a href="${npsUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:700;letter-spacing:0.3px">
        ⭐ Avaliar Atendimento
      </a>

      <p style="color:#9ca3af;font-size:12px;margin-top:24px;line-height:1.5">
        Ou acesse o link: <a href="${npsUrl}" style="color:#2563eb">${npsUrl}</a>
      </p>
    </div>

    <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 24px;border-radius:0 0 8px 8px;text-align:center">
      <p style="color:#9ca3af;font-size:11px;margin:0">
        Oficinas Master · Sistema de Consultoria Empresarial
      </p>
    </div>
  </div>`;

  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: emailDestino,
      subject: `⭐ Como foi seu atendimento de consultoria? — ${workshop.name}`,
      body: html,
    });
    console.log(`[NPS] Pesquisa enviada para ${emailDestino} | Workshop: ${workshop.name} | Atendimento: ${atendimento.id}`);
  } catch (err) {
    console.error(`[NPS] Falha ao enviar e-mail para ${emailDestino}:`, err.message);
    return Response.json({ status: 'error', reason: err.message }, { status: 500 });
  }

  return Response.json({ status: 'ok', sent_to: emailDestino, workshop: workshop.name });
});