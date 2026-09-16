// Motor único de cálculo DISC — usado por todos os caminhos de submissão
// (autoavaliação, diagnóstico do gestor e link público).
// Padrão: rank 1 = mais parecido (4 pontos) … rank 4 = menos parecido (1 ponto).
// A conversão garante consistência histórica dos registros gravados.

export function validarEConverterRespostas(rawAnswers) {
  if (!Array.isArray(rawAnswers) || rawAnswers.length !== 24) {
    return { error: 'Envie as respostas dos 24 conjuntos' };
  }

  const seenIds = new Set();
  const answers = [];
  for (const raw of rawAnswers) {
    const qid = parseInt(raw.question_id);
    if (isNaN(qid) || seenIds.has(qid)) {
      return { error: 'question_id inválido ou duplicado' };
    }
    seenIds.add(qid);

    const ranks = [raw.d, raw.i, raw.s, raw.c].map((v) => parseInt(v));
    if (ranks.some((r) => isNaN(r) || r < 1 || r > 4)) {
      return { error: `Conjunto ${qid}: use valores de 1 a 4` };
    }
    if (new Set(ranks).size !== 4) {
      return { error: `Conjunto ${qid}: use cada número de 1 a 4 apenas uma vez` };
    }

    answers.push({
      question_id: qid,
      d_score: 5 - ranks[0],
      i_score: 5 - ranks[1],
      s_score: 5 - ranks[2],
      c_score: 5 - ranks[3]
    });
  }

  return { answers };
}

export function calcularPerfilDISC(answers) {
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
  return { profileScores, dominant, recommendedRoles: getRecommendedRoles(profileScores) };
}

export function getRecommendedRoles(scores) {
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