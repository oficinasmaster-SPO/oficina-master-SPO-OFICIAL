import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

/**
 * submitPerformanceEvaluation — caminho ÚNICO de gravação da Matriz de Decisão de Desempenho.
 * Sprint 1 / C3 (auditoria QA 25/09/2026).
 *
 * - Valida no servidor quem pode avaliar quem (antes era só na tela).
 * - Recalcula médias e classificação no servidor (o navegador não define resultado).
 * - Grava com service role; a entidade PerformanceMatrixDiagnostic não aceita mais
 *   criação direta pelo navegador.
 *
 * Regras de permissão:
 *   admin / interno (consultoria)          → pode avaliar qualquer colaborador (tipo 'manager')
 *   o próprio colaborador                   → autoavaliação (tipo 'self')
 *   dono da oficina / sócio / cargo de liderança DA MESMA oficina → avaliação 'manager'
 *   demais                                  → 403
 *
 * CÓPIAS FIÉIS (manter sincronizado):
 *   - critérios e classificationRules: src/components/performance/PerformanceCriteria.jsx
 *   - LEADER_JOB_ROLES: src/components/lib/jobRoles.jsx
 */

const TECHNICAL_IDS = [
  'conhece_funcao', 'atinge_resultados', 'baixo_retrabalho', 'trabalha_alto_nivel', 'toma_decisoes',
  'contribui_ideias', 'produz_qualidade', 'prioridade_certa', 'sistemas_eficientes', 'transmite_informacoes',
  'cumpre_compromissos', 'informa_impossibilidades', 'da_recebe_feedback', 'excede_expectativas',
  'busca_conhecimento', 'compreende_tecnologias', 'desenvolvimento_profissional',
];
const EMOTIONAL_IDS = [
  'autoconfianca', 'autocontrole', 'superacao', 'iniciativa', 'transparencia', 'flexibilidade', 'otimismo',
  'empatia', 'servico', 'lideranca', 'influencia', 'gerenciamento_conflitos', 'trabalho_equipe',
];
const LEADER_JOB_ROLES = ['socio', 'socio_interno', 'diretor', 'supervisor_loja', 'gerente', 'lider_tecnico'];

// Mesma ordem e condições de classificationRules (PerformanceCriteria.jsx)
const RULES = [
  ['demissao', (t, e) => t < 5 && e < 5,
    'O colaborador apresenta desempenho insatisfatório tanto em competências técnicas quanto emocionais. Recomenda-se avaliar a possibilidade de desligamento ou um plano intensivo de recuperação com metas claras e prazo definido.'],
  ['plano_recuperacao', (t, e) => t < 5 && e >= 5 && e < 7,
    'O colaborador necessita de acompanhamento intensivo nas competências técnicas. Estabeleça um PDI com metas técnicas claras e prazo definido. O ponto positivo é que as competências emocionais estão em desenvolvimento.'],
  ['treinamento_tecnico', (t, e) => t < 7 && e >= 7,
    'O colaborador demonstra boas competências emocionais, mas precisa desenvolver suas habilidades técnicas. Invista em treinamentos específicos, mentorias e acompanhamento próximo para elevar o nível técnico.'],
  ['treinamento_emocional', (t, e) => t >= 7 && e < 7,
    'O colaborador tem bom desempenho técnico, mas precisa trabalhar aspectos comportamentais e emocionais. Considere coaching, feedback estruturado e desenvolvimento de soft skills.'],
  ['alerta_comportamental', (t, e) => t >= 5 && t < 7 && e < 5,
    'O colaborador apresenta dificuldades emocionais significativas que podem impactar o ambiente de trabalho. Priorize o desenvolvimento comportamental imediato com coaching e feedback estruturado.'],
  ['observacao', (t, e) => t >= 5 && t < 7 && e >= 5 && e < 7,
    'O colaborador está em fase de desenvolvimento. Mantenha acompanhamento regular, estabeleça metas claras e ofereça suporte para evolução tanto técnica quanto comportamental.'],
  ['reconhecimento', (t, e) => t >= 7 && e >= 7 && !(t >= 9 && e >= 9),
    'O colaborador apresenta bom desempenho em ambas as áreas. Reconheça publicamente seus resultados, ofereça desafios para continuar crescendo e mantenha-o motivado.'],
  ['investimento', (t, e) => t >= 9 && e >= 9,
    'Colaborador de alto desempenho e referência na equipe. Considere promoções, aumento de responsabilidades, projetos estratégicos e programas de retenção de talentos.'],
];

function classify(t, e) {
  const hit = RULES.find(([, cond]) => cond(t, e)) || RULES.find(([k]) => k === 'observacao');
  return { classification: hit[0], recommendation: hit[2] };
}

function validateScores(scores, ids, label) {
  if (!scores || typeof scores !== 'object') return `${label}: notas ausentes`;
  const keys = Object.keys(scores);
  const missing = ids.filter((id) => !(id in scores));
  const extra = keys.filter((k) => !ids.includes(k));
  if (missing.length) return `${label}: critérios faltando (${missing.join(', ')})`;
  if (extra.length) return `${label}: critérios desconhecidos (${extra.join(', ')})`;
  for (const id of ids) {
    const v = scores[id];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 10) {
      return `${label}: nota inválida em ${id} (use 0 a 10)`;
    }
  }
  return null;
}

const avg2 = (scores, ids) => Number((ids.reduce((s, id) => s + scores[id], 0) / ids.length).toFixed(2));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ error: 'Payload inválido' }, { status: 400 });
    const { employee_id, technical_scores, emotional_scores } = body;
    if (!employee_id) return Response.json({ error: 'Colaborador avaliado é obrigatório' }, { status: 400 });

    const errT = validateScores(technical_scores, TECHNICAL_IDS, 'Competências técnicas');
    if (errT) return Response.json({ error: errT }, { status: 400 });
    const errE = validateScores(emotional_scores, EMOTIONAL_IDS, 'Competências emocionais');
    if (errE) return Response.json({ error: errE }, { status: 400 });

    const sr = base44.asServiceRole;
    const target = await sr.entities.Employee.get(employee_id).catch(() => null);
    if (!target || !target.workshop_id) {
      return Response.json({ error: 'Colaborador não encontrado' }, { status: 404 });
    }
    const workshopId = target.workshop_id;
    const workshop = await sr.entities.Workshop.get(workshopId).catch(() => null);
    if (!workshop) return Response.json({ error: 'Oficina do colaborador não encontrada' }, { status: 404 });

    // ── Permissão (servidor) ──────────────────────────────────────────────
    const isAdmin = user.role === 'admin';
    const isInternal = user.user_type === 'internal' || user.data?.user_type === 'internal';

    let evaluationType = null;
    if (isAdmin || isInternal) {
      evaluationType = 'manager';
    } else {
      const byUserId = await sr.entities.Employee.filter({ workshop_id: workshopId, user_id: user.id }).catch(() => []);
      const byEmail = user.email
        ? await sr.entities.Employee.filter({ workshop_id: workshopId, email: user.email }).catch(() => [])
        : [];
      const evaluator = [...byUserId, ...byEmail].find((e) => e.status !== 'inativo') || null;

      if (evaluator && evaluator.id === target.id) {
        evaluationType = 'self';
      } else {
        const isOwner = workshop.owner_id === user.id || evaluator?.owner_id === user.id;
        const isLeader = !!evaluator && (evaluator.is_partner === true || LEADER_JOB_ROLES.includes(evaluator.job_role));
        if (isOwner || isLeader) evaluationType = 'manager';
      }
    }

    if (!evaluationType) {
      console.warn(`[submitPerformanceEvaluation] ACESSO NEGADO: user ${user.id} (${user.email}) → employee ${employee_id} / workshop ${workshopId}`);
      return Response.json({ error: 'Você não tem permissão para avaliar este colaborador' }, { status: 403 });
    }

    // ── Resultado calculado no servidor ──────────────────────────────────
    // Classificação usa as médias arredondadas (as mesmas gravadas e exibidas).
    const technical_average = avg2(technical_scores, TECHNICAL_IDS);
    const emotional_average = avg2(emotional_scores, EMOTIONAL_IDS);
    const { classification, recommendation } = classify(technical_average, emotional_average);

    const created = await sr.entities.PerformanceMatrixDiagnostic.create({
      employee_id: target.id,
      evaluator_id: user.id,
      workshop_id: workshopId,
      technical_scores,
      emotional_scores,
      technical_average,
      emotional_average,
      classification,
      recommendation,
      evaluation_type: evaluationType,
      completed: true,
    });

    return Response.json({ ok: true, id: created.id, classification, technical_average, emotional_average, evaluation_type: evaluationType });
  } catch (error) {
    console.error('[submitPerformanceEvaluation] erro:', error);
    return Response.json({ error: error?.message || 'Erro interno' }, { status: 500 });
  }
});
