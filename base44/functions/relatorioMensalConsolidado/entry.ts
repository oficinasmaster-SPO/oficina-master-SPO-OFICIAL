import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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

  // Calcular mês passado
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59);

  const nomeMes = inicioMes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Buscar dados
  const [todosAtendimentos, todosUsuarios, todosWorkshops] = await Promise.all([
    base44.asServiceRole.entities.ConsultoriaAtendimento.list(),
    base44.asServiceRole.entities.User.list(),
    base44.asServiceRole.entities.Workshop.list(),
  ]);

  // Filtrar pelo mês passado
  const atendimentosMes = todosAtendimentos.filter(a => {
    if (!a.data_agendada) return false;
    const d = new Date(a.data_agendada);
    return d >= inicioMes && d <= fimMes;
  });

  const userEmailMap = Object.fromEntries(todosUsuarios.map(u => [u.id, u.email]));
  const userNomeMap = Object.fromEntries(todosUsuarios.map(u => [u.id, u.full_name || u.email]));
  const workshopNomeMap = Object.fromEntries(todosWorkshops.map(w => [w.id, w.name]));

  // Métricas globais
  const total = atendimentosMes.length;
  const realizados = atendimentosMes.filter(a => a.status === 'realizado').length;
  const faltaram = atendimentosMes.filter(a => a.status === 'faltou').length;
  const cancelados = atendimentosMes.filter(a => ['cancelado', 'desmarcou'].includes(a.status)).length;
  const taxaRealizacao = total > 0 ? Math.round((realizados / total) * 100) : 0;

  // Agrupar por consultor
  const porConsultor = {};
  for (const a of atendimentosMes) {
    const cId = a.consultor_id;
    if (!cId) continue;
    if (!porConsultor[cId]) {
      porConsultor[cId] = { nome: a.consultor_nome || userNomeMap[cId] || 'Consultor', total: 0, realizados: 0, faltaram: 0, cancelados: 0, clientes: new Set() };
    }
    porConsultor[cId].total++;
    if (a.status === 'realizado') porConsultor[cId].realizados++;
    if (a.status === 'faltou') porConsultor[cId].faltaram++;
    if (['cancelado', 'desmarcou'].includes(a.status)) porConsultor[cId].cancelados++;
    if (a.workshop_id) porConsultor[cId].clientes.add(a.workshop_id);
  }

  // Clientes com mais faltas
  const faltasPorCliente = {};
  for (const a of atendimentosMes.filter(a => a.status === 'faltou')) {
    const nome = workshopNomeMap[a.workshop_id] || a.workshop_id || 'Desconhecido';
    faltasPorCliente[nome] = (faltasPorCliente[nome] || 0) + 1;
  }
  const topFaltosos = Object.entries(faltasPorCliente)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Ranking consultores por taxa de realização
  const rankingConsultores = Object.entries(porConsultor)
    .map(([id, c]) => ({
      nome: c.nome,
      total: c.total,
      realizados: c.realizados,
      faltaram: c.faltaram,
      cancelados: c.cancelados,
      clientes: c.clientes.size,
      taxa: c.total > 0 ? Math.round((c.realizados / c.total) * 100) : 0,
    }))
    .sort((a, b) => b.taxa - a.taxa);

  // Montar HTML do e-mail
  const tabelaConsultores = rankingConsultores.map((c, i) => `
    <tr style="background:${i % 2 === 0 ? '#f9f9f9' : '#ffffff'}">
      <td style="padding:8px 12px;border:1px solid #e5e7eb;">${i + 1}º ${c.nome}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;">${c.total}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;color:#16a34a;font-weight:600;">${c.realizados}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;color:#dc2626;">${c.faltaram}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;color:#f59e0b;">${c.cancelados}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;">${c.clientes}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;font-weight:700;color:${c.taxa >= 80 ? '#16a34a' : c.taxa >= 60 ? '#f59e0b' : '#dc2626'};">${c.taxa}%</td>
    </tr>`).join('');

  const tabelaFaltosos = topFaltosos.length > 0 ? topFaltosos.map(([nome, qtd]) => `
    <tr>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;">${nome}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;color:#dc2626;font-weight:700;">${qtd}</td>
    </tr>`).join('') : '<tr><td colspan="2" style="padding:12px;text-align:center;color:#6b7280;">Nenhum cliente com faltas no mês 🎉</td></tr>';

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;background:#fff;">
    <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:32px 24px;text-align:center;border-radius:8px 8px 0 0;">
      <h1 style="color:#fff;margin:0;font-size:22px;">📊 Relatório Mensal Consolidado</h1>
      <p style="color:#bfdbfe;margin:8px 0 0;">${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}</p>
    </div>

    <div style="padding:24px;">
      <!-- KPIs -->
      <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;">
        <div style="flex:1;min-width:120px;background:#f0f9ff;border-radius:8px;padding:16px;text-align:center;border:1px solid #bae6fd;">
          <p style="margin:0;font-size:28px;font-weight:700;color:#0284c7;">${total}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#0369a1;">Total agendados</p>
        </div>
        <div style="flex:1;min-width:120px;background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;border:1px solid #bbf7d0;">
          <p style="margin:0;font-size:28px;font-weight:700;color:#16a34a;">${realizados}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#15803d;">Realizados</p>
        </div>
        <div style="flex:1;min-width:120px;background:#fef2f2;border-radius:8px;padding:16px;text-align:center;border:1px solid #fecaca;">
          <p style="margin:0;font-size:28px;font-weight:700;color:#dc2626;">${faltaram}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#b91c1c;">Faltaram</p>
        </div>
        <div style="flex:1;min-width:120px;background:#fffbeb;border-radius:8px;padding:16px;text-align:center;border:1px solid #fde68a;">
          <p style="margin:0;font-size:28px;font-weight:700;color:#d97706;">${cancelados}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#b45309;">Cancelados</p>
        </div>
        <div style="flex:1;min-width:120px;background:#faf5ff;border-radius:8px;padding:16px;text-align:center;border:1px solid #e9d5ff;">
          <p style="margin:0;font-size:28px;font-weight:700;color:#7c3aed;">${taxaRealizacao}%</p>
          <p style="margin:4px 0 0;font-size:12px;color:#6d28d9;">Taxa realização</p>
        </div>
      </div>

      <!-- Ranking Consultores -->
      <h2 style="font-size:16px;color:#1e3a5f;margin:0 0 12px;border-bottom:2px solid #2563eb;padding-bottom:6px;">🏆 Ranking de Consultores</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;">
        <thead>
          <tr style="background:#1e3a5f;color:#fff;">
            <th style="padding:10px 12px;text-align:left;border:1px solid #1e40af;">Consultor</th>
            <th style="padding:10px 12px;text-align:center;border:1px solid #1e40af;">Total</th>
            <th style="padding:10px 12px;text-align:center;border:1px solid #1e40af;">Realizados</th>
            <th style="padding:10px 12px;text-align:center;border:1px solid #1e40af;">Faltaram</th>
            <th style="padding:10px 12px;text-align:center;border:1px solid #1e40af;">Cancelados</th>
            <th style="padding:10px 12px;text-align:center;border:1px solid #1e40af;">Clientes</th>
            <th style="padding:10px 12px;text-align:center;border:1px solid #1e40af;">Taxa</th>
          </tr>
        </thead>
        <tbody>${tabelaConsultores || '<tr><td colspan="7" style="padding:12px;text-align:center;color:#6b7280;">Sem dados no período</td></tr>'}</tbody>
      </table>

      <!-- Top Clientes Faltosos -->
      <h2 style="font-size:16px;color:#1e3a5f;margin:0 0 12px;border-bottom:2px solid #dc2626;padding-bottom:6px;">⚠️ Clientes com Mais Faltas</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;">
        <thead>
          <tr style="background:#dc2626;color:#fff;">
            <th style="padding:10px 12px;text-align:left;border:1px solid #b91c1c;">Cliente / Oficina</th>
            <th style="padding:10px 12px;text-align:center;border:1px solid #b91c1c;">Faltas no Mês</th>
          </tr>
        </thead>
        <tbody>${tabelaFaltosos}</tbody>
      </table>

      <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:24px;border-top:1px solid #f3f4f6;padding-top:16px;">
        Gerado automaticamente pelo sistema Oficinas Master · ${new Date().toLocaleDateString('pt-BR')}
      </p>
    </div>
  </div>`;

  // Buscar admins para envio
  const admins = todosUsuarios.filter(u => u.role === 'admin' && u.email);
  let emailsSent = 0;

  for (const admin of admins) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: admin.email,
      subject: `📊 Relatório Mensal Consolidado — ${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}`,
      body: html,
    });
    emailsSent++;
  }

  console.log(`Relatório mensal enviado para ${emailsSent} gestor(es). Mês: ${nomeMes}. Total atendimentos: ${total}`);

  return Response.json({
    status: 'ok',
    mes: nomeMes,
    total_atendimentos: total,
    realizados,
    faltaram,
    cancelados,
    taxa_realizacao: `${taxaRealizacao}%`,
    consultores: rankingConsultores.length,
    emails_sent: emailsSent,
  });
});