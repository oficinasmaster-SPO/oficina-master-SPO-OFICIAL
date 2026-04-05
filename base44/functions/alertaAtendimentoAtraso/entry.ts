import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Alerta de Atendimento em Atraso (tempo real)
 * Roda a cada 15 min via automação agendada.
 * Detecta atendimentos com status agendado/confirmado
 * que já passaram 15+ minutos da hora marcada.
 * Atualiza status para "atrasado" e envia e-mail ao consultor.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Permite chamada autenticada (admin) ou automação interna
  try {
    const user = await base44.auth.me();
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch (_) {
    // automação sem sessão de usuário — permitido
  }

  const agora = new Date();
  const quinzeMinAtras = new Date(agora.getTime() - 15 * 60 * 1000);
  // Janela de 3h: evita varredura histórica completa e cobre atrasos recentes
  const tresBufAtras = new Date(agora.getTime() - 3 * 60 * 60 * 1000);

  // Buscar dados em paralelo
  const [todosAtendimentos, todosUsuarios, todosWorkshops] = await Promise.all([
    base44.asServiceRole.entities.ConsultoriaAtendimento.list(),
    base44.asServiceRole.entities.User.list(),
    base44.asServiceRole.entities.Workshop.list(),
  ]);

  const userEmailMap = Object.fromEntries(todosUsuarios.map(u => [u.id, u.email]));
  const workshopNomeMap = Object.fromEntries(todosWorkshops.map(w => [w.id, w.name]));

  // Filtrar atendimentos atrasados:
  // - status agendado ou confirmado (já "atrasado" é ignorado — evita re-alerta)
  // - data_agendada entre 3h atrás e 15min atrás (janela ativa)
  const atrasados = todosAtendimentos.filter(a => {
    if (!['agendado', 'confirmado'].includes(a.status)) return false;
    if (!a.data_agendada) return false;
    const d = new Date(a.data_agendada);
    return d <= quinzeMinAtras && d >= tresBufAtras;
  });

  if (atrasados.length === 0) {
    console.log(`[alertaAtraso] Nenhum atendimento em atraso. ${agora.toISOString()}`);
    return Response.json({ status: 'ok', atrasados: 0 });
  }

  let alertasEnviados = 0;
  const erros = [];

  // Processar em paralelo com isolamento de falha por atendimento
  await Promise.all(atrasados.map(async (a) => {
    try {
      const consultorEmail = userEmailMap[a.consultor_id];
      const clienteNome = workshopNomeMap[a.workshop_id] || 'Cliente';
      const horaAgendada = new Date(a.data_agendada).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const minutosAtraso = Math.round((agora - new Date(a.data_agendada)) / 60000);

      // Atualizar status ANTES do e-mail — evita re-alerta se e-mail falhar depois
      await base44.asServiceRole.entities.ConsultoriaAtendimento.update(a.id, {
        status: 'atrasado',
      });

      if (!consultorEmail) {
        erros.push(`Sem e-mail para consultor_id: ${a.consultor_id} (atendimento ${a.id})`);
        console.warn(`[alertaAtraso] Consultor sem e-mail resolvido: ${a.consultor_id}`);
        return;
      }

      const corpo = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#dc2626;padding:24px;border-radius:8px 8px 0 0;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:20px">⏰ Atendimento em Atraso</h1>
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #fecaca;border-top:none;border-radius:0 0 8px 8px">
            <p style="color:#333;font-size:15px">Olá, <strong>${a.consultor_nome || 'Consultor'}</strong>!</p>
            <p style="color:#555">O atendimento abaixo ainda não foi iniciado:</p>

            <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px;border-radius:0 8px 8px 0;margin:16px 0">
              <p style="margin:0 0 8px;font-size:14px"><strong>Cliente:</strong> ${clienteNome}</p>
              <p style="margin:0 0 8px;font-size:14px"><strong>Tipo:</strong> ${a.tipo_atendimento || 'Atendimento'}</p>
              <p style="margin:0 0 8px;font-size:14px"><strong>Horário agendado:</strong> ${horaAgendada}</p>
              <p style="margin:0;font-size:16px;font-weight:bold;color:#dc2626">⏱ ${minutosAtraso} minutos de atraso</p>
            </div>

            <p style="color:#555;font-size:13px">Por favor, entre em contato com o cliente ou atualize o status do atendimento no sistema.</p>

            <p style="color:#9ca3af;font-size:11px;margin-top:24px;border-top:1px solid #f3f4f6;padding-top:12px">
              Oficinas Master — Alerta automático gerado em ${agora.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
            </p>
          </div>
        </div>`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: consultorEmail,
        subject: `⏰ Atendimento em atraso — ${clienteNome} (${minutosAtraso} min)`,
        body: corpo,
      });

      alertasEnviados++;
      console.log(`[alertaAtraso] Alerta enviado: ${a.consultor_nome} → ${clienteNome} (${minutosAtraso}min atraso)`);
    } catch (err) {
      // Isolamento: falha num atendimento não cancela os demais
      erros.push(`Erro ao processar atendimento ${a.id}: ${err.message}`);
      console.error(`[alertaAtraso] Erro no atendimento ${a.id}:`, err.message);
    }
  }));

  if (erros.length > 0) console.warn('[alertaAtraso] Erros:', erros);

  return Response.json({
    status: 'ok',
    atrasados: atrasados.length,
    alertas_enviados: alertasEnviados,
    erros: erros.length,
  });
});