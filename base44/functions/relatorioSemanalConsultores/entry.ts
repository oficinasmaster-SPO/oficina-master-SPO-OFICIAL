import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Relatório Semanal de Atendimentos por Consultor
 * Scheduled: toda segunda-feira às 8h (BRT = 11h UTC)
 * Envia e-mail para cada consultor com performance da semana anterior
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Apenas admin ou chamada automática (sem usuário autenticado)
  let user = null;
  try { user = await base44.auth.me(); } catch {}
  if (user && user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Período: semana anterior (segunda a domingo)
  const hoje = new Date();
  const diaSemana = hoje.getDay(); // 0=Dom, 1=Seg...
  const diasAteSegunda = diaSemana === 0 ? 6 : diaSemana - 1;
  const inicioSemanaPassada = new Date(hoje);
  inicioSemanaPassada.setDate(hoje.getDate() - diasAteSegunda - 7);
  inicioSemanaPassada.setHours(0, 0, 0, 0);
  const fimSemanaPassada = new Date(inicioSemanaPassada);
  fimSemanaPassada.setDate(inicioSemanaPassada.getDate() + 6);
  fimSemanaPassada.setHours(23, 59, 59, 999);

  const formatDate = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Buscar todos os atendimentos da semana passada
  const todosAtendimentos = await base44.asServiceRole.entities.ConsultoriaAtendimento.list();
  const atendimentosSemana = todosAtendimentos.filter(a => {
    if (!a.data_agendada) return false;
    const d = new Date(a.data_agendada);
    return d >= inicioSemanaPassada && d <= fimSemanaPassada;
  });

  if (atendimentosSemana.length === 0) {
    console.log('Nenhum atendimento na semana passada.');
    return Response.json({ status: 'ok', message: 'Sem atendimentos na semana', emails_sent: 0 });
  }

  // Buscar usuários para resolver e-mail dos consultores (consultor_email não existe na entidade)
  const todosUsuarios = await base44.asServiceRole.entities.User.list();
  const userEmailMap = Object.fromEntries(todosUsuarios.map(u => [u.id, u.email]));

  // Buscar workshops para resolver nomes
  const workshops = await base44.asServiceRole.entities.Workshop.list();
  const workshopMap = Object.fromEntries(workshops.map(w => [w.id, w.name]));

  // Agrupar por consultor
  const porConsultor = {};
  atendimentosSemana.forEach(a => {
    const cId = a.consultor_id;
    const cEmail = userEmailMap[cId]; // resolvido via User entity
    const cNome = a.consultor_nome || 'Consultor';
    if (!cId || !cEmail) return;
    if (!porConsultor[cId]) {
      porConsultor[cId] = { nome: cNome, email: cEmail, atendimentos: [] };
    }
    porConsultor[cId].atendimentos.push(a);
  });

  let emailsSent = 0;
  const erros = [];

  await Promise.all(Object.entries(porConsultor).map(async ([, consultor]) => {
    try {
    const ats = consultor.atendimentos;
    const realizados  = ats.filter(a => a.status === 'realizado').length;
    const agendados   = ats.filter(a => ['agendado', 'confirmado'].includes(a.status)).length;
    const faltaram    = ats.filter(a => a.status === 'faltou').length;
    const desmarcaram = ats.filter(a => ['desmarcou', 'cancelado'].includes(a.status)).length;
    const taxaRealizacao = ats.length > 0 ? Math.round((realizados / ats.length) * 100) : 0;

    // Clientes sem atendimento realizado na semana
    const clientesNaoRealizados = ats
      .filter(a => !['realizado', 'participando'].includes(a.status))
      .map(a => ({ nome: workshopMap[a.workshop_id] || 'Cliente', status: a.status, data: formatDate(new Date(a.data_agendada)) }));

    const linhasClientes = clientesNaoRealizados.length > 0
      ? clientesNaoRealizados.map(c =>
          `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${c.nome}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#e53e3e">${c.status}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#718096">${c.data}</td></tr>`
        ).join('')
      : '<tr><td colspan="3" style="padding:12px;text-align:center;color:#48bb78">✅ Todos os atendimentos foram realizados!</td></tr>';

    const corpo = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1a1a2e;padding:24px;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">📊 Relatório Semanal de Atendimentos</h1>
          <p style="color:#aaa;margin:4px 0 0">Semana de ${formatDate(inicioSemanaPassada)} a ${formatDate(fimSemanaPassada)}</p>
        </div>
        <div style="background:#f9f9f9;padding:24px">
          <p style="color:#333">Olá, <strong>${consultor.nome}</strong>! Aqui está o resumo da sua semana:</p>
          
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0">
            <div style="background:#fff;border-radius:8px;padding:16px;text-align:center;border:1px solid #e2e8f0">
              <div style="font-size:28px;font-weight:bold;color:#4299e1">${ats.length}</div>
              <div style="font-size:12px;color:#718096;margin-top:4px">Total</div>
            </div>
            <div style="background:#fff;border-radius:8px;padding:16px;text-align:center;border:1px solid #e2e8f0">
              <div style="font-size:28px;font-weight:bold;color:#48bb78">${realizados}</div>
              <div style="font-size:12px;color:#718096;margin-top:4px">Realizados</div>
            </div>
            <div style="background:#fff;border-radius:8px;padding:16px;text-align:center;border:1px solid #e2e8f0">
              <div style="font-size:28px;font-weight:bold;color:#e53e3e">${faltaram}</div>
              <div style="font-size:12px;color:#718096;margin-top:4px">Faltaram</div>
            </div>
            <div style="background:#fff;border-radius:8px;padding:16px;text-align:center;border:1px solid #e2e8f0">
              <div style="font-size:28px;font-weight:bold;color:#ed8936">${desmarcaram}</div>
              <div style="font-size:12px;color:#718096;margin-top:4px">Desmarcaram</div>
            </div>
          </div>

          <div style="background:#ebf8ff;border-left:4px solid #4299e1;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:20px">
            <strong style="color:#2b6cb0">Taxa de Realização: ${taxaRealizacao}%</strong>
            ${agendados > 0 ? `<span style="color:#718096;margin-left:12px">${agendados} pendente(s) ainda agendado(s)</span>` : ''}
          </div>

          ${clientesNaoRealizados.length > 0 ? `
          <h3 style="color:#333;font-size:14px;margin-bottom:8px">⚠️ Atendimentos não realizados</h3>
          <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">
            <thead>
              <tr style="background:#f7fafc">
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:#718096">Cliente</th>
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:#718096">Status</th>
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:#718096">Data</th>
              </tr>
            </thead>
            <tbody>${linhasClientes}</tbody>
          </table>` : ''}
        </div>
        <div style="background:#1a1a2e;padding:16px;border-radius:0 0 8px 8px;text-align:center">
          <p style="color:#aaa;font-size:12px;margin:0">Oficinas Master — Relatório gerado automaticamente</p>
        </div>
      </div>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: consultor.email,
      subject: `📊 Seu relatório semanal — ${formatDate(inicioSemanaPassada)} a ${formatDate(fimSemanaPassada)}`,
      body: corpo
    });

    emailsSent++;
    console.log(`Relatório enviado para ${consultor.nome} (${consultor.email}): ${realizados}/${ats.length} realizados`);
    } catch (err) {
      erros.push(`Erro ao enviar para ${consultor.email}: ${err.message}`);
      console.error(`[relatorioSemanal] Falha no consultor ${consultor.email}:`, err.message);
    }
  }));

  if (erros.length > 0) console.warn('[relatorioSemanal] Erros:', erros);

  return Response.json({ status: 'ok', emails_sent: emailsSent, erros: erros.length, period: `${formatDate(inicioSemanaPassada)} - ${formatDate(fimSemanaPassada)}` });
});