import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { format } from 'npm:date-fns@3';
import { ptBR } from 'npm:date-fns@3/locale/pt-BR';

const MENSAGEM_POLITICA = `Ficou alinhado que, após a reunião ser confirmada e agendada, qualquer solicitação de cancelamento ou remarcação deverá ser realizada com no mínimo 48 horas de antecedência. Caso o aviso não seja feito dentro desse prazo, a reunião será considerada como realizada e contabilizada normalmente dentro do plano contratado como reunião concluída.`;

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { atendimento_id, workshop_id } = await req.json();
  if (!atendimento_id) return Response.json({ error: 'atendimento_id obrigatório' }, { status: 400 });

  // Buscar atendimento pelo workshop_id (campo indexado no schema)
  let atendimento = null;
  if (workshop_id) {
    try {
      const lista = await base44.entities.ConsultoriaAtendimento.filter({ workshop_id }, '-data_agendada', 500);
      atendimento = lista?.find(a => a.id === atendimento_id) || null;
    } catch (_) {}
  }

  // Fallback: buscar via asServiceRole sem filtro se não temos workshop_id
  if (!atendimento) {
    try {
      const lista = await base44.asServiceRole.entities.ConsultoriaAtendimento.filter({ workshop_id: user?.data?.workshop_id || '' }, '-data_agendada', 500);
      atendimento = lista?.find(a => a.id === atendimento_id) || null;
    } catch (_) {}
  }

  if (!atendimento) return Response.json({ error: 'Atendimento não encontrado' }, { status: 404 });

  // ✅ Validar janela de 24h (até 24h ANTES do atendimento)
  const dataAtendimento = new Date(atendimento.data_agendada);
  const agora = new Date();
  const horas24Antes = new Date(dataAtendimento.getTime() - 24 * 60 * 60 * 1000);

  if (agora > dataAtendimento) {
    return Response.json({ 
      error: 'Não é possível confirmar um atendimento que já passou',
      status: 400
    });
  }

  if (agora < horas24Antes) {
    const diasFaltando = Math.ceil((horas24Antes - agora) / (1000 * 60 * 60 * 24));
    return Response.json({ 
      error: 'Confirmação de presença só é aceita até 24 horas antes do atendimento',
      dias_faltando: diasFaltando,
      status: 400
    });
  }

  // Idempotência: só confirma se ainda estiver agendado
  if (atendimento.status !== 'agendado') {
    return Response.json({ success: true, message: 'Já confirmado anteriormente', enviados: [] });
  }

  // Atualizar status para confirmado
  await base44.entities.ConsultoriaAtendimento.update(atendimento_id, { status: 'confirmado' });

  // Buscar workshop para dados do cliente
  let workshopName = '';
  let clienteEmail = '';
  try {
    const workshops = await base44.entities.Workshop.filter({ id: atendimento.workshop_id });
    const workshop = workshops?.[0];
    workshopName = workshop?.name || '';
    clienteEmail = workshop?.email || '';
  } catch (_) {}

  // Buscar email do consultor
  let consultorEmail = '';
  try {
    const users = await base44.asServiceRole.entities.User.list();
    const consultorUser = users.find(u => u.id === atendimento.consultor_id);
    consultorEmail = consultorUser?.email || '';
  } catch (_) {}

  const dataFormatada = format(new Date(atendimento.data_agendada), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
  const assunto = `✅ Presença Confirmada — ${atendimento.tipo_atendimento || 'Reunião'} em ${dataFormatada}`;

  const corpo = `
<p>Olá,</p>
<p>A presença para a reunião abaixo foi <strong>confirmada pelo cliente</strong>:</p>
<ul>
  <li><strong>Tipo:</strong> ${atendimento.tipo_atendimento || '—'}</li>
  <li><strong>Data:</strong> ${dataFormatada}</li>
  <li><strong>Consultor:</strong> ${atendimento.consultor_nome || '—'}</li>
  <li><strong>Cliente:</strong> ${workshopName || '—'}</li>
  ${atendimento.google_meet_link ? `<li><strong>Link Meet:</strong> <a href="${atendimento.google_meet_link}">${atendimento.google_meet_link}</a></li>` : ''}
</ul>
<hr/>
<p><strong>⚠️ Política de cancelamento e remarcação:</strong></p>
<p>${MENSAGEM_POLITICA}</p>
<br/>
<p>Atenciosamente,<br/>Equipe Oficinas Master</p>
  `.trim();

  const destinatarios = [consultorEmail, clienteEmail].filter(Boolean);
  for (const email of destinatarios) {
    try {
      await base44.integrations.Core.SendEmail({ to: email, subject: assunto, body: corpo });
    } catch (_) {}
  }

  return Response.json({ success: true, enviados: destinatarios });
});