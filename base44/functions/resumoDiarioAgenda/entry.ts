import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Resumo Diário de Agenda — Briefing Matinal
 * Scheduled: todo dia útil às 7h30 (BRT)
 * Envia a cada consultor o resumo do dia: atendimentos agendados,
 * detalhes do cliente, tipo, horário e link da reunião.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch (_) {
    // automação sem sessão — permitido
  }

  // Dia atual em BRT para comparação de datas
  const agora = new Date();
  const hojeStr = agora.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }); // DD/MM/YYYY

  const [todosAtendimentos, todosUsuarios, todosWorkshops] = await Promise.all([
    base44.asServiceRole.entities.ConsultoriaAtendimento.list(),
    base44.asServiceRole.entities.User.list(),
    base44.asServiceRole.entities.Workshop.list(),
  ]);

  const userEmailMap = Object.fromEntries(todosUsuarios.map(u => [u.id, u.email]));
  const userNomeMap  = Object.fromEntries(todosUsuarios.map(u => [u.id, u.full_name || u.email]));
  const workshopMap  = Object.fromEntries(todosWorkshops.map(w => [w.id, w]));

  // Filtrar atendimentos de hoje com status ativo
  const atendimentosHoje = todosAtendimentos.filter(a => {
    if (!a.data_agendada) return false;
    if (!['agendado', 'confirmado'].includes(a.status)) return false;
    const dStr = new Date(a.data_agendada).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    return dStr === hojeStr;
  });

  if (atendimentosHoje.length === 0) {
    console.log(`[resumoDiario] Nenhum atendimento agendado para hoje (${hojeStr}).`);
    return Response.json({ status: 'ok', atendimentos_hoje: 0, emails_sent: 0 });
  }

  // Agrupar por consultor
  const porConsultor = {};
  for (const a of atendimentosHoje) {
    const cId = a.consultor_id;
    if (!cId) continue;
    const cEmail = userEmailMap[cId];
    if (!cEmail) continue;
    if (!porConsultor[cId]) {
      porConsultor[cId] = {
        nome: a.consultor_nome || userNomeMap[cId] || 'Consultor',
        email: cEmail,
        atendimentos: [],
      };
    }
    porConsultor[cId].atendimentos.push(a);
  }

  // Ordenar atendimentos de cada consultor por horário
  for (const c of Object.values(porConsultor)) {
    c.atendimentos.sort((a, b) => new Date(a.data_agendada) - new Date(b.data_agendada));
  }

  const diaSemana = agora.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' });
  const dataFormatada = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });

  let emailsSent = 0;
  const erros = [];

  await Promise.all(Object.values(porConsultor).map(async (consultor) => {
    try {
      const total = consultor.atendimentos.length;

      const linhasAgenda = consultor.atendimentos.map((a, i) => {
        const ws = workshopMap[a.workshop_id] || {};
        const horario = new Date(a.data_agendada).toLocaleTimeString('pt-BR', {
          hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
        });
        const duracao = a.duracao_minutos ? `${a.duracao_minutos} min` : '60 min';
        const cidade = ws.city ? `${ws.city}/${ws.state}` : '';
        const plano = a.plano_cliente || ws.planoAtual || '';
        const fase = a.fase_oficina ? `Fase ${a.fase_oficina}` : '';
        const badgePlano = plano
          ? `<span style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:10px;font-size:11px;margin-left:6px">${plano}</span>`
          : '';
        const badgeFase = fase
          ? `<span style="background:#f0fdf4;color:#15803d;padding:2px 8px;border-radius:10px;font-size:11px;margin-left:4px">${fase}</span>`
          : '';
        const linkMeet = a.google_meet_link
          ? `<a href="${a.google_meet_link}" style="color:#2563eb;font-size:12px;text-decoration:none">🎥 Entrar no Meet</a>`
          : '';
        const statusBadge = a.status === 'confirmado'
          ? '<span style="background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:10px;font-size:11px">✓ Confirmado</span>'
          : '<span style="background:#fef9c3;color:#854d0e;padding:2px 8px;border-radius:10px;font-size:11px">Aguardando</span>';

        return `
          <tr style="border-bottom:1px solid #f3f4f6">
            <td style="padding:14px 12px;vertical-align:top;width:70px">
              <div style="font-size:20px;font-weight:700;color:#1e3a5f">${horario}</div>
              <div style="font-size:11px;color:#9ca3af;margin-top:2px">${duracao}</div>
            </td>
            <td style="padding:14px 12px;vertical-align:top;border-left:3px solid #2563eb">
              <div style="font-weight:700;font-size:14px;color:#111827">
                ${ws.name || 'Cliente'}${badgePlano}${badgeFase}
              </div>
              ${cidade ? `<div style="font-size:12px;color:#9ca3af;margin-top:2px">📍 ${cidade}</div>` : ''}
              <div style="font-size:12px;color:#6b7280;margin-top:4px">
                📋 ${a.tipo_atendimento || 'Atendimento'}
              </div>
              <div style="margin-top:6px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                ${statusBadge}
                ${linkMeet}
              </div>
              ${a.observacoes_consultor ? `<div style="font-size:12px;color:#6b7280;margin-top:6px;background:#f9fafb;padding:6px 8px;border-radius:4px">💬 ${a.observacoes_consultor}</div>` : ''}
            </td>
          </tr>`;
      }).join('');

      // Resumo de alertas: clientes em risco
      const riscos = consultor.atendimentos.filter(a => ['nao_responde', 'decrescente'].includes(a.status_cliente));
      const alertaRisco = riscos.length > 0
        ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin-bottom:16px">
            <p style="margin:0;font-size:13px;color:#b91c1c;font-weight:600">⚠️ Atenção: ${riscos.length} cliente(s) em situação de risco hoje</p>
            <ul style="margin:6px 0 0;padding-left:18px">
              ${riscos.map(a => `<li style="font-size:12px;color:#dc2626">${workshopMap[a.workshop_id]?.name || 'Cliente'} — ${a.status_cliente === 'nao_responde' ? 'Não responde' : 'Engajamento decrescente'}</li>`).join('')}
            </ul>
          </div>`
        : '';

      const html = `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;background:#fff">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:28px 24px;border-radius:8px 8px 0 0">
          <p style="color:#93c5fd;margin:0;font-size:13px;text-transform:uppercase;letter-spacing:1px">${diaSemana}</p>
          <h1 style="color:#fff;margin:6px 0 0;font-size:22px">☀️ Bom dia, ${consultor.nome.split(' ')[0]}!</h1>
          <p style="color:#bfdbfe;margin:6px 0 0;font-size:14px">${dataFormatada} · ${total} atendimento${total !== 1 ? 's' : ''} agendado${total !== 1 ? 's' : ''}</p>
        </div>

        <!-- Body -->
        <div style="padding:24px">
          ${alertaRisco}

          <!-- Agenda do dia -->
          <h2 style="font-size:15px;color:#1e3a5f;margin:0 0 12px;border-bottom:2px solid #2563eb;padding-bottom:6px">📅 Sua Agenda de Hoje</h2>
          <table style="width:100%;border-collapse:collapse">
            <tbody>${linhasAgenda}</tbody>
          </table>

          <!-- Dica do dia -->
          <div style="background:#f0f9ff;border-left:4px solid #2563eb;padding:12px 16px;border-radius:0 8px 8px 0;margin-top:20px">
            <p style="margin:0;font-size:13px;color:#1e40af">
              💡 <strong>Lembre-se:</strong> confirme os atendimentos com antecedência e registre as ATAs logo após cada reunião para manter o histórico atualizado.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background:#1e3a5f;padding:14px;border-radius:0 0 8px 8px;text-align:center">
          <p style="color:#93c5fd;font-size:11px;margin:0">Oficinas Master — Briefing gerado automaticamente às 7h30</p>
        </div>
      </div>`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: consultor.email,
        subject: `☀️ Sua agenda de hoje — ${total} atendimento${total !== 1 ? 's' : ''} · ${dataFormatada}`,
        body: html,
      });

      emailsSent++;
      console.log(`[resumoDiario] Briefing enviado: ${consultor.nome} (${consultor.email}) — ${total} atendimento(s)`);
    } catch (err) {
      erros.push(`Erro ao enviar para ${consultor.email}: ${err.message}`);
      console.error(`[resumoDiario] Falha no consultor ${consultor.email}:`, err.message);
    }
  }));

  if (erros.length > 0) console.warn('[resumoDiario] Erros:', erros);

  return Response.json({
    status: 'ok',
    data: hojeStr,
    atendimentos_hoje: atendimentosHoje.length,
    consultores_notificados: emailsSent,
    erros: erros.length,
  });
});