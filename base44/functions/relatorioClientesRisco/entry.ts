import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Relatório de Clientes em Risco
 * Scheduled: toda sexta-feira às 8h (BRT)
 * Analisa padrões de risco nos últimos 60 dias.
 * Envia relatório completo aos admins E e-mail individual a cada consultor com seus clientes em risco + sugestão de ação.
 *
 * Critérios de risco:
 * - CRÍTICO: status_cliente = 'nao_responde'
 * - ALTO: 2+ faltas/cancelamentos nos últimos 30 dias
 * - ALTO: status_cliente = 'decrescente'
 * - MÉDIO: 1 falta + 1 cancelamento nos últimos 30 dias
 * - MÉDIO: sem nenhum atendimento realizado nos últimos 30 dias
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

  const agora = new Date();
  const trintaDiasAtras = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sessentaDiasAtras = new Date(agora.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [todosAtendimentos, todosWorkshops, todosUsuarios] = await Promise.all([
    base44.asServiceRole.entities.ConsultoriaAtendimento.list(),
    base44.asServiceRole.entities.Workshop.list(),
    base44.asServiceRole.entities.User.list(),
  ]);

  const workshopMap = Object.fromEntries(todosWorkshops.map(w => [w.id, w]));
  const userEmailMap = Object.fromEntries(todosUsuarios.map(u => [u.id, u.email]));
  const userNomeMap  = Object.fromEntries(todosUsuarios.map(u => [u.id, u.full_name || u.email]));
  const admins = todosUsuarios.filter(u => u.role === 'admin' && u.email);

  // Índice de workshops que tiveram atendimento algum dia (para detectar abandonados)
  const workshopsComHistorico = new Set(todosAtendimentos.map(a => a.workshop_id).filter(Boolean));

  // Apenas atendimentos dos últimos 60 dias
  const atendimentosRecentes = todosAtendimentos.filter(a => {
    if (!a.data_agendada) return false;
    return new Date(a.data_agendada) >= sessentaDiasAtras;
  });

  // Agrupar por workshop
  const porWorkshop = {};
  for (const a of atendimentosRecentes) {
    if (!a.workshop_id) continue;
    if (!porWorkshop[a.workshop_id]) {
      porWorkshop[a.workshop_id] = {
        workshop: workshopMap[a.workshop_id],
        consultorId: a.consultor_id || null,
        consultorNome: a.consultor_nome || userNomeMap[a.consultor_id] || 'Não atribuído',
        atendimentos60d: [],
        atendimentos30d: [],
        ultimoStatus: null,
        ultimaData: null,
      };
    }
    porWorkshop[a.workshop_id].atendimentos60d.push(a);
    if (new Date(a.data_agendada) >= trintaDiasAtras) {
      porWorkshop[a.workshop_id].atendimentos30d.push(a);
    }
    // Capturar status_cliente mais recente
    if (a.status_cliente) {
      const d = new Date(a.data_agendada);
      if (!porWorkshop[a.workshop_id].ultimaData || d > porWorkshop[a.workshop_id].ultimaData) {
        porWorkshop[a.workshop_id].ultimaData = d;
        porWorkshop[a.workshop_id].ultimoStatus = a.status_cliente;
      }
    }
  }

  // Detectar workshops com histórico mas ZERO atendimentos nos últimos 60 dias (risco MÉDIO: abandono)
  for (const wsId of workshopsComHistorico) {
    if (!porWorkshop[wsId]) {
      const ws = workshopMap[wsId];
      if (!ws || ws.status === 'inativo') continue;
      porWorkshop[wsId] = {
        workshop: ws,
        consultorNome: 'Não atribuído',
        atendimentos60d: [],
        atendimentos30d: [],
        ultimoStatus: null,
        _abandonado: true,
      };
    }
  }

  // Avaliar risco de cada cliente
  const clientesRisco = [];

  for (const [workshopId, dados] of Object.entries(porWorkshop)) {
    const ws = dados.workshop;
    if (!ws || ws.status === 'inativo') continue;

    const ats30 = dados.atendimentos30d;
    const faltas30 = ats30.filter(a => a.status === 'faltou').length;
    const cancelados30 = ats30.filter(a => ['cancelado', 'desmarcou'].includes(a.status)).length;
    const realizados30 = ats30.filter(a => a.status === 'realizado').length;
    const statusCliente = dados.ultimoStatus;

    let nivel = null;
    const motivos = [];

    // Nível CRÍTICO
    if (statusCliente === 'nao_responde') {
      nivel = 'CRÍTICO';
      motivos.push('Cliente não responde');
    }

    // Nível ALTO
    if (!nivel) {
      if (faltas30 + cancelados30 >= 2) {
        nivel = 'ALTO';
        motivos.push(`${faltas30} falta(s) e ${cancelados30} cancelamento(s) em 30 dias`);
      } else if (statusCliente === 'decrescente') {
        nivel = 'ALTO';
        motivos.push('Engajamento decrescente');
      }
    }

    // Nível MÉDIO
    if (!nivel) {
      if (dados._abandonado) {
        nivel = 'MÉDIO';
        motivos.push('Sem nenhum atendimento nos últimos 60 dias');
      } else if (faltas30 + cancelados30 >= 1 && realizados30 === 0) {
        nivel = 'MÉDIO';
        motivos.push(`Sem realizações nos últimos 30 dias (${faltas30} falta(s), ${cancelados30} cancelamento(s))`);
      } else if (ats30.length === 0 && dados.atendimentos60d.length > 0) {
        nivel = 'MÉDIO';
        motivos.push('Sem nenhum atendimento nos últimos 30 dias');
      }
    }

    if (!nivel) continue;

    // Sugestão de ação por nível
    const sugestaoAcao = nivel === 'CRÍTICO'
      ? 'Ligação imediata + contato por WhatsApp. Se sem resposta em 24h, escalar para gestor.'
      : nivel === 'ALTO'
      ? 'Entrar em contato esta semana para reagendamento. Verificar causa das faltas/cancelamentos.'
      : 'Enviar mensagem de check-in pelo WhatsApp e propor nova data de atendimento.';

    clientesRisco.push({
      nome: ws.name || workshopId,
      city: ws.city || '',
      state: ws.state || '',
      plano: ws.planoAtual || '-',
      consultorId: dados.consultorId,
      consultor: dados.consultorNome,
      nivel,
      motivos,
      sugestaoAcao,
      faltas30,
      cancelados30,
      realizados30,
      totalAtendimentos30: ats30.length,
    });
  }

  if (clientesRisco.length === 0) {
    console.log('[relatorioRisco] Nenhum cliente em risco identificado.');
    return Response.json({ status: 'ok', clientes_risco: 0, emails_sent: 0 });
  }

  // Ordenar: CRÍTICO > ALTO > MÉDIO
  const ordemNivel = { 'CRÍTICO': 0, 'ALTO': 1, 'MÉDIO': 2 };
  clientesRisco.sort((a, b) => ordemNivel[a.nivel] - ordemNivel[b.nivel]);

  const criticos = clientesRisco.filter(c => c.nivel === 'CRÍTICO').length;
  const altos = clientesRisco.filter(c => c.nivel === 'ALTO').length;
  const medios = clientesRisco.filter(c => c.nivel === 'MÉDIO').length;

  const corNivel = { 'CRÍTICO': '#dc2626', 'ALTO': '#d97706', 'MÉDIO': '#2563eb' };
  const bgNivel  = { 'CRÍTICO': '#fef2f2', 'ALTO': '#fffbeb', 'MÉDIO': '#eff6ff' };

  const linhasTabela = clientesRisco.map(c => `
    <tr>
      <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600">${c.nome}${c.city ? ` <span style="font-weight:400;color:#9ca3af;font-size:12px">(${c.city}/${c.state})</span>` : ''}</td>
      <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center">
        <span style="background:${bgNivel[c.nivel]};color:${corNivel[c.nivel]};padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700">${c.nivel}</span>
      </td>
      <td style="padding:10px 12px;border:1px solid #e5e7eb;font-size:13px;color:#555">${c.motivos.join('<br>')}</td>
      <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;color:#dc2626;font-weight:600">${c.faltas30}</td>
      <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;color:#d97706;font-weight:600">${c.cancelados30}</td>
      <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;color:#16a34a;font-weight:600">${c.realizados30}</td>
      <td style="padding:10px 12px;border:1px solid #e5e7eb;font-size:12px;color:#6b7280">${c.consultor}</td>
      <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;font-size:12px">${c.plano}</td>
      <td style="padding:10px 12px;border:1px solid #e5e7eb;font-size:12px;color:#1d4ed8;font-style:italic">${c.sugestaoAcao}</td>
    </tr>`).join('');

  const dataRelatorio = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;background:#fff">
    <div style="background:linear-gradient(135deg,#7f1d1d,#dc2626);padding:32px 24px;text-align:center;border-radius:8px 8px 0 0">
      <h1 style="color:#fff;margin:0;font-size:22px">⚠️ Relatório de Clientes em Risco</h1>
      <p style="color:#fecaca;margin:8px 0 0">${dataRelatorio}</p>
    </div>

    <div style="padding:24px">
      <!-- Resumo executivo -->
      <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap">
        <div style="flex:1;min-width:110px;background:#fef2f2;border-radius:8px;padding:16px;text-align:center;border:1px solid #fecaca">
          <p style="margin:0;font-size:28px;font-weight:700;color:#dc2626">${criticos}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#b91c1c">Crítico</p>
        </div>
        <div style="flex:1;min-width:110px;background:#fffbeb;border-radius:8px;padding:16px;text-align:center;border:1px solid #fde68a">
          <p style="margin:0;font-size:28px;font-weight:700;color:#d97706">${altos}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#b45309">Alto</p>
        </div>
        <div style="flex:1;min-width:110px;background:#eff6ff;border-radius:8px;padding:16px;text-align:center;border:1px solid #bfdbfe">
          <p style="margin:0;font-size:28px;font-weight:700;color:#2563eb">${medios}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#1d4ed8">Médio</p>
        </div>
        <div style="flex:1;min-width:110px;background:#f9fafb;border-radius:8px;padding:16px;text-align:center;border:1px solid #e5e7eb">
          <p style="margin:0;font-size:28px;font-weight:700;color:#374151">${clientesRisco.length}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#6b7280">Total em risco</p>
        </div>
      </div>

      <h2 style="font-size:16px;color:#7f1d1d;margin:0 0 12px;border-bottom:2px solid #dc2626;padding-bottom:6px">📋 Detalhamento por Cliente</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#7f1d1d;color:#fff">
            <th style="padding:10px 12px;text-align:left;border:1px solid #991b1b">Cliente</th>
            <th style="padding:10px 12px;text-align:center;border:1px solid #991b1b">Risco</th>
            <th style="padding:10px 12px;text-align:left;border:1px solid #991b1b">Motivo(s)</th>
            <th style="padding:10px 12px;text-align:center;border:1px solid #991b1b">Faltas</th>
            <th style="padding:10px 12px;text-align:center;border:1px solid #991b1b">Cancelados</th>
            <th style="padding:10px 12px;text-align:center;border:1px solid #991b1b">Realizados</th>
            <th style="padding:10px 12px;text-align:left;border:1px solid #991b1b">Consultor</th>
            <th style="padding:10px 12px;text-align:center;border:1px solid #991b1b">Plano</th>
            <th style="padding:10px 12px;text-align:left;border:1px solid #991b1b">Sugestão de Ação</th>
          </tr>
        </thead>
        <tbody>${linhasTabela}</tbody>
      </table>

      <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:24px;border-top:1px solid #f3f4f6;padding-top:16px">
        Análise baseada nos últimos 30–60 dias · Gerado automaticamente pelo sistema Oficinas Master
      </p>
    </div>
  </div>`;

  // ── Envio por consultor: lista personalizada dos SEUS clientes em risco ──
  const porConsultorRisco = {};
  for (const c of clientesRisco) {
    if (!c.consultorId) continue;
    const cEmail = userEmailMap[c.consultorId];
    if (!cEmail) continue;
    if (!porConsultorRisco[c.consultorId]) {
      porConsultorRisco[c.consultorId] = { nome: c.consultor, email: cEmail, clientes: [] };
    }
    porConsultorRisco[c.consultorId].clientes.push(c);
  }

  let emailsSent = 0;
  const errosEmail = [];

  await Promise.all(Object.values(porConsultorRisco).map(async (consultor) => {
    try {
      const linhasConsultor = consultor.clientes.map(c => `
        <tr>
          <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600">${c.nome}</td>
          <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center">
            <span style="background:${bgNivel[c.nivel]};color:${corNivel[c.nivel]};padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700">${c.nivel}</span>
          </td>
          <td style="padding:10px 12px;border:1px solid #e5e7eb;font-size:13px;color:#555">${c.motivos.join('<br>')}</td>
          <td style="padding:10px 12px;border:1px solid #e5e7eb;font-size:12px;color:#1d4ed8;font-style:italic">${c.sugestaoAcao}</td>
        </tr>`).join('');

      const htmlConsultor = `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;background:#fff">
        <div style="background:linear-gradient(135deg,#7f1d1d,#dc2626);padding:28px 24px;text-align:center;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">⚠️ Seus Clientes em Risco</h1>
          <p style="color:#fecaca;margin:8px 0 0;font-size:14px">${dataRelatorio} &middot; ${consultor.clientes.length} cliente(s)</p>
        </div>
        <div style="padding:24px">
          <p style="color:#374151;font-size:15px">Olá, <strong>${consultor.nome.split(' ')[0]}</strong>! Os clientes abaixo precisam de atenção prioritária hoje:</p>
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:16px">
            <thead>
              <tr style="background:#7f1d1d;color:#fff">
                <th style="padding:10px 12px;text-align:left;border:1px solid #991b1b">Cliente</th>
                <th style="padding:10px 12px;text-align:center;border:1px solid #991b1b">Risco</th>
                <th style="padding:10px 12px;text-align:left;border:1px solid #991b1b">Motivo</th>
                <th style="padding:10px 12px;text-align:left;border:1px solid #991b1b">💡 Sugestão de Ação</th>
              </tr>
            </thead>
            <tbody>${linhasConsultor}</tbody>
          </table>
          <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:20px;border-top:1px solid #f3f4f6;padding-top:12px">
            Oficinas Master · Gerado automaticamente
          </p>
        </div>
      </div>`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: consultor.email,
        subject: `⚠️ ${consultor.clientes.length} cliente(s) em risco para você agir hoje · ${dataRelatorio}`,
        body: htmlConsultor,
      });
      emailsSent++;
      console.log(`[relatorioRisco] E-mail consultor enviado: ${consultor.nome} (${consultor.clientes.length} clientes)`);
    } catch (err) {
      errosEmail.push(`Falha ao enviar para consultor ${consultor.email}: ${err.message}`);
      console.error(`[relatorioRisco] Erro consultor ${consultor.email}:`, err.message);
    }
  }));

  // ── Envio para admins: relatório completo ──
  await Promise.all(admins.map(async (admin) => {
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: admin.email,
        subject: `⚠️ Relatório de Clientes em Risco — ${criticos} crítico(s), ${altos} alto(s) · ${dataRelatorio}`,
        body: html,
      });
      emailsSent++;
    } catch (err) {
      errosEmail.push(`Falha ao enviar para ${admin.email}: ${err.message}`);
      console.error(`[relatorioRisco] Erro admin ${admin.email}:`, err.message);
    }
  }));

  if (errosEmail.length > 0) console.warn('[relatorioRisco] Erros de envio:', errosEmail);
  console.log(`[relatorioRisco] ${clientesRisco.length} clientes em risco (${criticos} críticos, ${altos} altos, ${medios} médios). ${emailsSent} e-mail(s) enviado(s).`);

  return Response.json({
    status: 'ok',
    clientes_risco: clientesRisco.length,
    criticos,
    altos,
    medios,
    emails_sent: emailsSent,
  });
});