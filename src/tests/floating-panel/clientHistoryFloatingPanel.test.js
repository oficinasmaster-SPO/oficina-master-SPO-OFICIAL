/**
 * TDD SUITE — ClientHistoryFloatingPanel
 *
 * Testa o comportamento esperado do painel flutuante de histórico do cliente
 * sem dependência de DOM/React — apenas a lógica pura de agrupamento e display.
 *
 * Cobertura:
 *  - Agrupamento de ContractAttendances por tipo (bucket)
 *  - Contagem correta de done vs total
 *  - Troca de workshop_id → novo fetch (simulado)
 *  - Painel oculto quando workshop_id é nulo
 *  - Resiliência a dados mal-formados
 */

// ─────────────────────────────────────────────────────────────────────────────
// LÓGICA PURA EXTRAÍDA DO COMPONENTE (testável sem React)
// ─────────────────────────────────────────────────────────────────────────────

function groupBucketByType(buckets = []) {
  const bucketByType = {};
  for (const b of buckets) {
    const key = b.attendance_type_id;
    if (!key) continue;
    if (!bucketByType[key]) {
      bucketByType[key] = { name: b.attendance_type_name || key, total: 0, done: 0 };
    }
    bucketByType[key].total++;
    if (b.status === "realizado" || b.consultoria_atendimento_id) {
      bucketByType[key].done++;
    }
  }
  return bucketByType;
}

function getLastRealizados(atendimentos = [], max = 5) {
  return atendimentos
    .filter(a => a.status === "realizado" || a.status === "concluido")
    .slice(0, max)
    .map(a => ({
      tipo: a.tipo_atendimento || "—",
      data: a.data_agendada ? a.data_agendada.split("T")[0] : null,
    }));
}

function shouldShowPanel(workshopId) {
  return !!workshopId;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function assert(cond, msg) {
  if (!cond) throw new Error(`❌ FAIL: ${msg}`);
}
function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(`❌ FAIL: ${msg}\n   Expected: ${JSON.stringify(b)}\n   Got:      ${JSON.stringify(a)}`);
}

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, status: "PASS" });
    console.log(`  ✅ ${name}`);
  } catch (e) {
    results.push({ name, status: "FAIL", error: e.message });
    console.error(`  ${e.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 1 — groupBucketByType
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n📦 GROUP 1: groupBucketByType");

await test("Agrupa corretamente 6 items PRATA em 6 tipos únicos", () => {
  const buckets = [
    { attendance_type_id: "t1", attendance_type_name: "Onboarding", status: "agendado", consultoria_atendimento_id: "x" },
    { attendance_type_id: "t2", attendance_type_name: "Avaliação Perfil", status: "pendente", consultoria_atendimento_id: null },
    { attendance_type_id: "t3", attendance_type_name: "Treinamento", status: "pendente", consultoria_atendimento_id: null },
    { attendance_type_id: "t4", attendance_type_name: "Teste Comportamental", status: "pendente", consultoria_atendimento_id: null },
    { attendance_type_id: "t5", attendance_type_name: "Mentoria", status: "pendente", consultoria_atendimento_id: null },
    { attendance_type_id: "t6", attendance_type_name: "Diagnóstico", status: "pendente", consultoria_atendimento_id: null },
  ];
  const result = groupBucketByType(buckets);
  assertEqual(Object.keys(result).length, 6, "deve ter 6 tipos");
  assertEqual(result["t1"].done, 1, "Onboarding done=1 (tem consultoria_atendimento_id)");
  assertEqual(result["t2"].done, 0, "Avaliação Perfil done=0");
});

await test("Carlão MILLIONS — 12 Treinamentos: done soma corretamente", () => {
  const buckets = Array.from({ length: 12 }, (_, i) => ({
    attendance_type_id: "treinamento",
    attendance_type_name: "Treinamento acelera time",
    status: i < 3 ? "realizado" : "pendente",
    consultoria_atendimento_id: null,
  }));
  const result = groupBucketByType(buckets);
  assertEqual(result["treinamento"].total, 12, "total=12");
  assertEqual(result["treinamento"].done, 3, "done=3");
});

await test("status='realizado' conta como done mesmo sem consultoria_atendimento_id", () => {
  const b = [{ attendance_type_id: "x", attendance_type_name: "X", status: "realizado", consultoria_atendimento_id: null }];
  assertEqual(groupBucketByType(b)["x"].done, 1, "done deve ser 1");
});

await test("consultoria_atendimento_id preenchido conta como done mesmo com status='agendado'", () => {
  const b = [{ attendance_type_id: "x", attendance_type_name: "X", status: "agendado", consultoria_atendimento_id: "abc123" }];
  assertEqual(groupBucketByType(b)["x"].done, 1, "done deve ser 1");
});

await test("Item sem attendance_type_id é ignorado silenciosamente", () => {
  const b = [{ attendance_type_id: null, attendance_type_name: "Sem tipo", status: "pendente", consultoria_atendimento_id: null }];
  assertEqual(Object.keys(groupBucketByType(b)).length, 0, "deve retornar {} para item sem type_id");
});

await test("Array vazio retorna {} sem erros", () => {
  assertEqual(Object.keys(groupBucketByType([])).length, 0, "deve ser {}");
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 2 — getLastRealizados
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n📦 GROUP 2: getLastRealizados");

await test("Retorna max 5 atendimentos realizados", () => {
  const atendimentos = Array.from({ length: 10 }, (_, i) => ({
    status: "realizado",
    tipo_atendimento: `Tipo ${i}`,
    data_agendada: `2026-05-0${i < 9 ? i + 1 : 9}T10:00:00Z`,
  }));
  assertEqual(getLastRealizados(atendimentos).length, 5, "máximo 5");
});

await test("Filtra apenas status realizado ou concluido", () => {
  const atendimentos = [
    { status: "agendado", tipo_atendimento: "T1", data_agendada: "2026-05-01T10:00:00Z" },
    { status: "realizado", tipo_atendimento: "T2", data_agendada: "2026-05-02T10:00:00Z" },
    { status: "concluido", tipo_atendimento: "T3", data_agendada: "2026-05-03T10:00:00Z" },
    { status: "cancelado", tipo_atendimento: "T4", data_agendada: "2026-05-04T10:00:00Z" },
  ];
  const result = getLastRealizados(atendimentos);
  assertEqual(result.length, 2, "deve retornar apenas T2 e T3");
  assertEqual(result[0].tipo, "T2", "primeiro deve ser T2");
});

await test("data é extraída corretamente removendo parte de hora", () => {
  const atendimentos = [{ status: "realizado", tipo_atendimento: "T", data_agendada: "2026-05-15T14:30:00.000Z" }];
  assertEqual(getLastRealizados(atendimentos)[0].data, "2026-05-15", "data sem hora");
});

await test("Atendimento sem data_agendada retorna data=null sem crash", () => {
  const atendimentos = [{ status: "realizado", tipo_atendimento: "T", data_agendada: undefined }];
  assertEqual(getLastRealizados(atendimentos)[0].data, null, "data deve ser null");
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 3 — shouldShowPanel (trigger logic)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n📦 GROUP 3: visibilidade do painel");

await test("Panel visível quando workshopId existe", () => {
  assert(shouldShowPanel("abc123"), "deve ser true");
});

await test("Panel oculto quando workshopId é null/undefined/empty", () => {
  assert(!shouldShowPanel(null), "null → false");
  assert(!shouldShowPanel(undefined), "undefined → false");
  assert(!shouldShowPanel(""), "string vazia → false");
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 4 — Regressão: troca de cliente reseta dados
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n📦 GROUP 4: troca de cliente");

await test("Novo workshopId → novo grupo de buckets (sem contaminação)", () => {
  const clienteA = [
    { attendance_type_id: "onboarding", attendance_type_name: "Onboarding", status: "realizado", consultoria_atendimento_id: null },
  ];
  const clienteB = [
    { attendance_type_id: "diagnostico", attendance_type_name: "Diagnóstico", status: "pendente", consultoria_atendimento_id: null },
  ];
  const resultA = groupBucketByType(clienteA);
  const resultB = groupBucketByType(clienteB);

  assert("onboarding" in resultA, "A deve ter onboarding");
  assert(!("onboarding" in resultB), "B não deve ter onboarding");
  assert("diagnostico" in resultB, "B deve ter diagnostico");
  assert(!("diagnostico" in resultA), "A não deve ter diagnostico");
});

// ─────────────────────────────────────────────────────────────────────────────
// RELATÓRIO
// ─────────────────────────────────────────────────────────────────────────────
const passed = results.filter(r => r.status === "PASS").length;
const failed = results.filter(r => r.status === "FAIL").length;

console.log("\n" + "─".repeat(60));
console.log(`📊 RESULTADO: ${passed} passed | ${failed} failed | ${results.length} total`);

if (failed > 0) {
  results.filter(r => r.status === "FAIL").forEach(r => {
    console.log(`  • ${r.name}\n    ${r.error}`);
  });
  throw new Error(`${failed} test(s) failed`);
} else {
  console.log("✅ Todos os testes passaram.");
}