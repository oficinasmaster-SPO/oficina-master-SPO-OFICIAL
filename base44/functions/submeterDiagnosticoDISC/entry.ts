import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { waitUntil } from 'base44:runtime';

// Caminho único de submissão DISC (autoavaliação e diagnóstico do gestor).
// Padrão: rank 1 = mais parecido (4 pontos) … rank 4 = menos parecido (1 ponto).
// Conversão, cálculo e disparo de e-mail ficam no backend para garantir consistência histórica.
const rankToScore = (rank) => 5 - rank;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const payload = await req.json().catch(() => null);
    if (!payload) return Response.json({ error: 'Payload inválido' }, { status: 400 });

    const employeeId = payload.employee_id;
    const evaluationType = payload.evaluation_type === 'self' ? 'self' : 'manager';
    const rawAnswers = Array.isArray(payload.answers) ? payload.answers : [];

    if (!employeeId) return Response.json({ error: 'Colaborador avaliado é obrigatório' }, { status: 400 });
    if (rawAnswers.length !== 24) return Response.json({ error: 'Envie as respostas dos 24 conjuntos' }, { status: 400 });

    // ── Validação dos rankings + conversão para scores ──
    const seenIds = new Set();
    const answers = [];
    for (const raw of rawAnswers) {
      const qid = parseInt(raw.question_id);
      if (isNaN(qid) || seenIds.has(qid)) {
        return Response.json({ error: 'question_id inválido ou duplicado' }, { status: 400 });
      }
      seenIds.add(qid);

      const ranks = [raw.d, raw.i, raw.s, raw.c].map((v) => parseInt(v));
      if (ranks.some((r) => isNaN(r) || r < 1 || r > 4)) {
        return Response.json({ error: `Conjunto ${qid}: use valores de 1 a 4` }, { status: 400 });
      }
      if (new Set(ranks).size !== 4) {
        return Response.json({ error: `Conjunto ${qid}: use cada número de 1 a 4 apenas uma vez` }, { status: 400 });
      }

      answers.push({
        question_id: qid,
        d_score: rankToScore(ranks[0]),
        i_score: rankToScore(ranks[1]),
        s_score: rankToScore(ranks[2]),
        c_score: rankToScore(ranks[3])
      });
    }

    // ── Cálculo centralizado dos percentuais, perfil dominante e funções recomendadas ──
    const totals = { d: 0, i: 0, s: 0, c: 0 };
    answers.forEach((a) => {
      totals.d += a.d_score;
      totals.i += a.i_score;
      totals.s += a.s_score;
      totals.c += a.c_score;
    });
    const sum = totals.d + totals.i + totals.s + totals.c;
    const profileScores = {
      executor_d: (totals.d / sum) * 100,
      comunicador_i: (totals.i / sum) * 100,
      planejador_s: (totals.s / sum) * 100,
      analista_c: (totals.c / sum) * 100
    };
    // Empate segue a prioridade histórica: D > I > S > C
    const dominant = Object.entries(profileScores).sort((a, b) => b[1] - a[1])[0][0];
    const recommendedRoles = getRecommendedRoles(profileScores);

    // ── Resolução da oficina (fonte: payload ou cadastro do colaborador) ──
    let workshopId = payload.workshop_id || null;
    if (!workshopId) {
      const employee = await base44.entities.Employee.get(employeeId).catch(() => null);
      workshopId = employee?.workshop_id || null;
    }
    if (!workshopId) {
      return Response.json({ error: 'Oficina não resolvida para o colaborador' }, { status: 400 });
    }

    const created = await base44.entities.DISCDiagnostic.create({
      employee_id: employeeId,
      evaluator_id: user.id,
      workshop_id: workshopId,
      evaluation_type: evaluationType,
      is_leader: payload.is_leader === true,
      team_name: payload.team_name || null,
      answers,
      profile_scores: profileScores,
      dominant_profile: dominant,
      recommended_roles: recommendedRoles,
      completed: true
    });

    // Gatilho do pipeline de e-mail — assíncrono; travas antirreenvio ficam no destino
    waitUntil(
      base44.functions.invoke('enviarResultadoDISC', { diagnostic_id: created.id }).catch(() => {})
    );

    return Response.json({
      ok: true,
      id: created.id,
      dominant_profile: dominant,
      profile_scores: profileScores
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function getRecommendedRoles(scores) {
  const roles = [];
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const top1 = sorted[0][0];
  const top2 = sorted[1][0];

  if ((top1 === "executor_d" || top2 === "executor_d") && scores.executor_d > 30) {
    roles.push("Gerente Geral", "Líder de Equipe", "Coordenador de Produção");
  }
  if ((top1 === "comunicador_i" || top2 === "comunicador_i") && scores.comunicador_i > 30) {
    roles.push("Consultor de Vendas", "Atendimento ao Cliente", "Marketing");
  }
  if ((top1 === "planejador_s" || top2 === "planejador_s") && scores.planejador_s > 30) {
    roles.push("Coordenador Administrativo", "Supervisor de Processos", "Planejador", "Gestor de Qualidade");
  }
  if ((top1 === "analista_c" || top2 === "analista_c") && scores.analista_c > 30) {
    roles.push("Analista de Qualidade", "Controlador Financeiro", "Técnico Especialista");
  }

  return roles.length > 0 ? roles : ["Função a definir conforme necessidade da oficina"];
}