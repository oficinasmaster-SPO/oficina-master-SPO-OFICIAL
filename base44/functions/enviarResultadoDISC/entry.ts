import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { secrets } from 'base44:runtime';

/**
 * enviarResultadoDISC — Sprint 1 do pipeline DISC.
 * Envia por e-mail (Resend) o resultado de um teste DISC concluído:
 *  - variante "colaborador" para o avaliado;
 *  - variante "liderança" para cada líder da oficina.
 * Idempotente: flags resultado_email_colaborador_enviado /
 * resultado_email_lideranca_enviado gravadas no diagnóstico.
 * Payload aceito: { diagnostic_id } (frontend) ou { event, data } (automação).
 */

const BRAIN_ICON_URL = 'https://media.base44.com/images/public/69540822472c4a70b54d47aa/97cc7167b_generated_image.png';

const PERFIS = {
  executor_d: {
    letra: 'D',
    nome: 'Executor',
    cor: '#d82f43',
    bg: '#fdf2f3',
    border: '#f3ccd1',
    descricao: 'Determinação, decisão e foco em resultados.'
  },
  comunicador_i: {
    letra: 'I',
    nome: 'Comunicador',
    cor: '#c17800',
    bg: '#fdf8ec',
    border: '#f0e0bb',
    descricao: 'Influência, interação e otimismo.'
  },
  planejador_s: {
    letra: 'S',
    nome: 'Planejador',
    cor: '#087b54',
    bg: '#edf7f2',
    border: '#c9e6da',
    descricao: 'Estabilidade, paciência e trabalho em equipe.'
  },
  analista_c: {
    letra: 'C',
    nome: 'Analista',
    cor: '#295dc4',
    bg: '#eef3fc',
    border: '#ccd9f2',
    descricao: 'Precisão, análise e qualidade.'
  }
};

const JOB_ROLES_LIDERANCA = [
  'socio', 'socio_interno', 'diretor', 'gerente', 'supervisor_loja', 'lider_tecnico'
];

const escapeHtml = (str) => String(str || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const roundPct = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

const formatarData = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });
  } catch {
    return '';
  }
};

function buildEmailHtml(ctx, variant, recipientName) {
  const p = PERFIS[ctx.dominantKey] || PERFIS.executor_d;
  const pctD = ctx.pctD, pctI = ctx.pctI, pctS = ctx.pctS, pctC = ctx.pctC;
  const isColaborador = variant === 'colaborador';

  const saudacao = isColaborador
    ? `Olá, ${escapeHtml(ctx.colaboradorNome)}`
    : `Olá, ${escapeHtml(recipientName || 'líder')}`;
  const intro = isColaborador
    ? 'Sua avaliação foi concluída. Abaixo está uma visão clara das suas tendências comportamentais.'
    : `Segue abaixo o resultado da avaliação DISC de <strong>${escapeHtml(ctx.colaboradorNome)}</strong>.`;
  const preheader = isColaborador
    ? 'Seu resultado DISC está pronto: veja seu perfil comportamental.'
    : `Resultado DISC de ${ctx.colaboradorNome} disponível.`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light only">
    <title>Resultado da Avaliação DISC</title>
</head>
<body style="margin:0; padding:0; background-color:#f7eef8; font-family:Arial, Helvetica, sans-serif; color:#1f2942;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; background-color:#f7eef8;">
        <tr>
            <td align="center" style="padding:32px 12px;">
                <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:640px; background-color:#ffffff; border:1px solid #ead9f0; border-radius:12px; overflow:hidden; box-shadow:0 18px 45px rgba(61,31,76,0.12);">
                    <tr>
                        <td align="center" bgcolor="#a126e8" style="padding:34px 30px 32px; background-color:#a126e8; background-image:linear-gradient(120deg,#912fee 0%,#d91e7f 100%);">
                            <img src="${BRAIN_ICON_URL}" width="64" height="64" alt="" style="display:block; width:64px; height:64px; margin:0 auto 14px; border:0; object-fit:contain;">
                            <h1 style="margin:0; color:#ffffff; font-size:26px; line-height:34px; font-weight:700;">Resultado da Avaliação DISC</h1>
                            <p style="margin:7px 0 0; color:#f7dcff; font-size:15px; line-height:22px;">Análise de Perfil Comportamental</p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:28px 32px 10px;">
                            <p style="margin:0 0 8px; color:#7b278e; font-size:12px; line-height:18px; font-weight:bold; text-transform:uppercase; letter-spacing:1px;">Relatório individual</p>
                            <p style="margin:0; color:#1f2942; font-size:20px; line-height:28px; font-weight:bold;">${saudacao}</p>
                            <p style="margin:8px 0 0; color:#667085; font-size:14px; line-height:22px;">${intro}</p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:16px 32px 8px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#faf7fc; border:1px solid #eadff0; border-radius:8px;">
                                <tr>
                                    <td width="50%" valign="top" style="padding:15px 18px; border-right:1px solid #eadff0;">
                                        <p style="margin:0 0 3px; color:#8a8290; font-size:11px; line-height:16px; text-transform:uppercase; letter-spacing:.7px;">Oficina</p>
                                        <p style="margin:0; color:#353044; font-size:14px; line-height:20px; font-weight:bold;">${escapeHtml(ctx.oficinaNome)}</p>
                                    </td>
                                    <td width="50%" valign="top" style="padding:15px 18px;">
                                        <p style="margin:0 0 3px; color:#8a8290; font-size:11px; line-height:16px; text-transform:uppercase; letter-spacing:.7px;">Avaliação</p>
                                        <p style="margin:0; color:#353044; font-size:14px; line-height:20px;"><strong>${escapeHtml(ctx.tipoAvaliacao)}</strong> · ${escapeHtml(ctx.data)}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:16px 32px 8px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${p.bg}" style="background-color:${p.bg}; border:1px solid ${p.border}; border-radius:8px;">
                                <tr>
                                    <td width="74" align="center" valign="middle" style="padding:22px 10px 22px 22px;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" bgcolor="${p.cor}" style="background-color:${p.cor}; border-radius:8px;">
                                            <tr>
                                                <td align="center" width="50" height="50" style="width:50px; height:50px; color:#ffffff; font-size:24px; line-height:50px; font-weight:bold;">${p.letra}</td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td valign="middle" style="padding:20px 22px 20px 10px;">
                                        <p style="margin:0 0 4px; color:#756b7a; font-size:11px; line-height:16px; text-transform:uppercase; letter-spacing:1px;">Seu perfil dominante</p>
                                        <p style="margin:0; color:${p.cor}; font-size:23px; line-height:29px; font-weight:bold;">${p.nome}</p>
                                        <p style="margin:5px 0 0; color:#625a66; font-size:13px; line-height:20px;">${p.descricao}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:22px 32px 4px;">
                            <p style="margin:0 0 16px; color:#2b2530; font-size:16px; line-height:22px; font-weight:bold;">Composição do perfil</p>

                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="color:#3e3745; font-size:13px; line-height:19px; font-weight:bold;">Executor <span style="color:#d82f43;">(D)</span></td>
                                    <td align="right" style="color:#d82f43; font-size:13px; line-height:19px; font-weight:bold;">${pctD}%</td>
                                </tr>
                                <tr>
                                    <td colspan="2" style="padding:7px 0 14px;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td bgcolor="#f2e9ed" style="height:9px; background-color:#f2e9ed; border-radius:5px;">
                                                    <table role="presentation" width="${pctD}%" cellpadding="0" cellspacing="0" border="0">
                                                        <tr><td height="9" bgcolor="#e43b4f" style="height:9px; background-color:#e43b4f; border-radius:5px; font-size:0; line-height:0;">&nbsp;</td></tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <tr>
                                    <td style="color:#3e3745; font-size:13px; line-height:19px; font-weight:bold;">Comunicador <span style="color:#c17800;">(I)</span></td>
                                    <td align="right" style="color:#c17800; font-size:13px; line-height:19px; font-weight:bold;">${pctI}%</td>
                                </tr>
                                <tr>
                                    <td colspan="2" style="padding:7px 0 14px;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td bgcolor="#f6edda" style="height:9px; background-color:#f6edda; border-radius:5px;">
                                                    <table role="presentation" width="${pctI}%" cellpadding="0" cellspacing="0" border="0">
                                                        <tr><td height="9" bgcolor="#e9a51b" style="height:9px; background-color:#e9a51b; border-radius:5px; font-size:0; line-height:0;">&nbsp;</td></tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <tr>
                                    <td style="color:#3e3745; font-size:13px; line-height:19px; font-weight:bold;">Planejador <span style="color:#087b54;">(S)</span></td>
                                    <td align="right" style="color:#087b54; font-size:13px; line-height:19px; font-weight:bold;">${pctS}%</td>
                                </tr>
                                <tr>
                                    <td colspan="2" style="padding:7px 0 14px;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td bgcolor="#e5f3ed" style="height:9px; background-color:#e5f3ed; border-radius:5px;">
                                                    <table role="presentation" width="${pctS}%" cellpadding="0" cellspacing="0" border="0">
                                                        <tr><td height="9" bgcolor="#16a56f" style="height:9px; background-color:#16a56f; border-radius:5px; font-size:0; line-height:0;">&nbsp;</td></tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <tr>
                                    <td style="color:#3e3745; font-size:13px; line-height:19px; font-weight:bold;">Analista <span style="color:#295dc4;">(C)</span></td>
                                    <td align="right" style="color:#295dc4; font-size:13px; line-height:19px; font-weight:bold;">${pctC}%</td>
                                </tr>
                                <tr>
                                    <td colspan="2" style="padding:7px 0 4px;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td bgcolor="#e7eef9" style="height:9px; background-color:#e7eef9; border-radius:5px;">
                                                    <table role="presentation" width="${pctC}%" cellpadding="0" cellspacing="0" border="0">
                                                        <tr><td height="9" bgcolor="#3976df" style="height:9px; background-color:#3976df; border-radius:5px; font-size:0; line-height:0;">&nbsp;</td></tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:20px 32px 8px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fbf6ff" style="background-color:#fbf6ff; border-left:4px solid #aa2bdd; border-radius:6px;">
                                <tr>
                                    <td style="padding:17px 18px;">
                                        <p style="margin:0 0 6px; color:#66217d; font-size:14px; line-height:20px; font-weight:bold;">Funções recomendadas</p>
                                        <p style="margin:0; color:#625a66; font-size:14px; line-height:22px;">${escapeHtml(ctx.funcoesRecomendadas)}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding:20px 32px 30px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f0f7" style="background-color:#f4f0f7; border-radius:6px;">
                                <tr>
                                    <td align="center" style="padding:14px 18px;">
                                        <p style="margin:0; color:#5f5664; font-size:13px; line-height:20px;">A <strong>versão completa do relatório</strong> está disponível na plataforma Oficinas Master.</p>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin:14px 0 0; color:#918899; font-size:11px; line-height:17px;">${isColaborador ? 'Seu resultado é individual e deve ser interpretado como apoio ao desenvolvimento.' : 'Este resultado é individual e deve ser interpretado como apoio ao desenvolvimento do colaborador.'}</p>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" bgcolor="#faf8fb" style="padding:20px 28px; background-color:#faf8fb; border-top:1px solid #eee5f1;">
                            <p style="margin:0 0 5px; color:#5f5664; font-size:12px; line-height:18px; font-weight:bold;">Oficinas Master</p>
                            <p style="margin:0; color:#9b929f; font-size:11px; line-height:17px;">Resultado automático da plataforma. Em caso de dúvidas, fale com seu consultor.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

async function enviarResend(to, subject, html) {
  const apiKey = secrets.get('RESEND_API_KEY');
  if (!apiKey) throw new Error('RESEND_API_KEY não configurada');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Oficinas Master <onboarding@resend.dev>',
      to: [to],
      subject,
      html
    })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `Resend respondeu ${response.status}`);
  }
  return true;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));

    // Aceita chamada direta { diagnostic_id } ou payload de automação { event, data }
    const diagnosticId = payload?.diagnostic_id || payload?.data?.id || payload?.event?.entity_id;
    if (!diagnosticId) {
      return Response.json({ ok: false, error: 'diagnostic_id é obrigatório' }, { status: 400 });
    }

    const diagnostic = await base44.asServiceRole.entities.DISCDiagnostic.get(diagnosticId);
    if (!diagnostic || diagnostic.completed !== true) {
      return Response.json({ ok: true, skip: true, motivo: 'Diagnóstico inexistente ou não concluído' });
    }

    const enviadoColaborador = diagnostic.resultado_email_colaborador_enviado === true;
    const enviadoLideranca = diagnostic.resultado_email_lideranca_enviado === true;
    if (enviadoColaborador && enviadoLideranca) {
      return Response.json({ ok: true, skip: true, motivo: 'E-mails de resultado já enviados' });
    }

    const scores = diagnostic.profile_scores;
    if (!scores) {
      return Response.json({ ok: true, skip: true, motivo: 'Diagnóstico sem profile_scores' });
    }

    // Colaborador + oficina (fail-open por parte)
    let employee = null;
    if (diagnostic.employee_id) {
      try {
        employee = await base44.asServiceRole.entities.Employee.get(diagnostic.employee_id);
      } catch (e) {
        console.error('Employee não encontrado:', e.message);
      }
    }
    let workshop = null;
    if (diagnostic.workshop_id) {
      try {
        workshop = await base44.asServiceRole.entities.Workshop.get(diagnostic.workshop_id);
      } catch (e) {
        console.error('Workshop não encontrado:', e.message);
      }
    }

    const colaboradorNome = employee?.full_name || diagnostic.candidate_name || 'Colaborador';
    const oficinaNome = workshop?.name || 'Oficina';

    const ctx = {
      colaboradorNome,
      oficinaNome,
      tipoAvaliacao: diagnostic.evaluation_type === 'self' ? 'Autoavaliação' : 'Avaliação do Gestor',
      data: formatarData(diagnostic.created_date),
      dominantKey: diagnostic.dominant_profile || 'executor_d',
      pctD: roundPct(scores.executor_d),
      pctI: roundPct(scores.comunicador_i),
      pctS: roundPct(scores.planejador_s),
      pctC: roundPct(scores.analista_c),
      funcoesRecomendadas: (diagnostic.recommended_roles && diagnostic.recommended_roles.length > 0)
        ? diagnostic.recommended_roles.join(' · ')
        : 'Consulte a plataforma para a análise completa de funções.'
    };

    const agora = new Date().toISOString();
    const resultado = { colaborador: null, lideranca: [] };
    const erros = [];

    // ── E-mail do colaborador ──
    if (!enviadoColaborador) {
      const emailColaborador = employee?.email;
      if (emailColaborador) {
        try {
          await enviarResend(
            emailColaborador,
            'Seu Resultado DISC — Oficinas Master',
            buildEmailHtml(ctx, 'colaborador', colaboradorNome)
          );
          resultado.colaborador = emailColaborador;
          await base44.asServiceRole.entities.DISCDiagnostic.update(diagnosticId, {
            resultado_email_colaborador_enviado: true,
            resultado_email_enviado_em: agora
          });
        } catch (e) {
          console.error('Falha e-mail colaborador:', e.message);
          erros.push(`colaborador: ${e.message}`);
        }
      } else {
        erros.push('colaborador: sem e-mail cadastrado');
      }
    }

    // ── E-mails da liderança ──
    if (!enviadoLideranca) {
      const destinatarios = new Map(); // email -> nome

      if (diagnostic.workshop_id) {
        try {
          const funcionarios = await base44.asServiceRole.entities.Employee.filter(
            { workshop_id: diagnostic.workshop_id },
            undefined,
            100
          );
          for (const f of funcionarios || []) {
            if (f.email && (f.user_status === 'ativo' || f.status === 'ativo') &&
                JOB_ROLES_LIDERANCA.includes(f.job_role)) {
              destinatarios.set(f.email.toLowerCase(), f.full_name || '');
            }
          }
        } catch (e) {
          console.error('Falha ao listar colaboradores da oficina:', e.message);
        }
      }

      // Proprietário da oficina (via User)
      if (workshop?.owner_id) {
        try {
          const owner = await base44.asServiceRole.entities.User.get(workshop.owner_id);
          if (owner?.email) destinatarios.set(owner.email.toLowerCase(), owner.full_name || '');
        } catch (e) {
          console.error('Falha ao carregar proprietário:', e.message);
        }
      }

      // Não enviar variante liderança para o próprio avaliado
      if (employee?.email) destinatarios.delete(employee.email.toLowerCase());

      if (destinatarios.size > 0) {
        let peloMenosUmEnviado = false;
        for (const [email, nome] of destinatarios) {
          try {
            await enviarResend(
              email,
              `Resultado DISC de ${colaboradorNome}`,
              buildEmailHtml(ctx, 'lideranca', nome)
            );
            resultado.lideranca.push(email);
            peloMenosUmEnviado = true;
          } catch (e) {
            console.error(`Falha e-mail liderança (${email}):`, e.message);
            erros.push(`liderança ${email}: ${e.message}`);
          }
        }
        if (peloMenosUmEnviado) {
          await base44.asServiceRole.entities.DISCDiagnostic.update(diagnosticId, {
            resultado_email_lideranca_enviado: true,
            resultado_email_enviado_em: agora
          });
        }
      } else {
        console.log('Nenhum destinatário de liderança identificado');
      }
    }

    return Response.json({ ok: true, ...resultado, erros: erros.length ? erros : undefined });
  } catch (error) {
    console.error('Erro enviarResultadoDISC:', error.message);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}