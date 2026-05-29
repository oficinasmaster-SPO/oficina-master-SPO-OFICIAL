/**
 * TDD — deduplicarAtasDuplicadas (pure logic)
 *
 * Testa groupDuplicates e resolveGroup sem banco de dados.
 */

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) { console.log(`  ✅ ${msg}`); passed++; }
  else { console.error(`  ❌ FAIL: ${msg}`); failed++; }
}

async function test(name, fn) {
  try { await fn(); }
  catch (err) { console.error(`  ❌ FAIL (exception): ${name} — ${err.message}`); failed++; }
}

// ── Inline pure logic (mirrors functions/deduplicarAtasDuplicadas.js) ──────

function groupDuplicates(atas) {
  const map = new Map();
  for (const ata of atas) {
    const day = (ata.meeting_date || ata.created_date || "").slice(0, 10);
    const key = [
      ata.workshop_id || "",
      ata.atendimento_id || "",
      day,
      ata.tipo_aceleracao || ata.tipo_atendimento || "",
      ata.consultor_id || "",
    ].join("|");
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(ata);
  }
  const duplicateGroups = new Map();
  for (const [key, group] of map.entries()) {
    if (group.length > 1) duplicateGroups.set(key, group);
  }
  return duplicateGroups;
}

function resolveGroup(group) {
  const sorted = [...group].sort((a, b) => {
    const da = a.created_date || a.meeting_date || "";
    const db = b.created_date || b.meeting_date || "";
    return da.localeCompare(db);
  });
  const [keep, ...toDelete] = sorted;
  return { keep, toDelete };
}

// ── Sample data ─────────────────────────────────────────────────────────────

const BASE_ATA = {
  workshop_id: "WS1",
  atendimento_id: "AT1",
  meeting_date: "2026-05-29",
  tipo_aceleracao: "mensal",
  consultor_id: "C1",
  status: "finalizada",
};

// ── Tests ───────────────────────────────────────────────────────────────────

console.log("\n🧪 deduplicarAtas — TDD suite\n");

await test("no duplicates → empty groups", async () => {
  const atas = [
    { ...BASE_ATA, id: "A1" },
    { ...BASE_ATA, id: "A2", atendimento_id: "AT2" }, // different atendimento
  ];
  const groups = groupDuplicates(atas);
  assert(groups.size === 0, "no duplicate group when atendimentos differ");
});

await test("exact duplicates → 1 group with 2 members", async () => {
  const atas = [
    { ...BASE_ATA, id: "A1", created_date: "2026-05-29T10:00:00Z" },
    { ...BASE_ATA, id: "A2", created_date: "2026-05-29T10:00:05Z" }, // 5s later (double click)
  ];
  const groups = groupDuplicates(atas);
  assert(groups.size === 1, "exactly 1 group found");
  const group = [...groups.values()][0];
  assert(group.length === 2, "group contains 2 atas");
});

await test("resolveGroup keeps oldest ata", async () => {
  const group = [
    { ...BASE_ATA, id: "A2", created_date: "2026-05-29T10:00:05Z" },
    { ...BASE_ATA, id: "A1", created_date: "2026-05-29T10:00:00Z" }, // older
  ];
  const { keep, toDelete } = resolveGroup(group);
  assert(keep.id === "A1", "keeps the oldest ata (A1)");
  assert(toDelete.length === 1, "one ata marked for deletion");
  assert(toDelete[0].id === "A2", "newer ata (A2) is deleted");
});

await test("3 duplicates → keeps 1, deletes 2", async () => {
  const group = [
    { ...BASE_ATA, id: "A3", created_date: "2026-05-29T10:00:10Z" },
    { ...BASE_ATA, id: "A1", created_date: "2026-05-29T10:00:00Z" },
    { ...BASE_ATA, id: "A2", created_date: "2026-05-29T10:00:05Z" },
  ];
  const { keep, toDelete } = resolveGroup(group);
  assert(keep.id === "A1", "keeps oldest (A1)");
  assert(toDelete.length === 2, "deletes 2 newer atas");
});

await test("different dates → no group", async () => {
  const atas = [
    { ...BASE_ATA, id: "A1", meeting_date: "2026-05-28" },
    { ...BASE_ATA, id: "A2", meeting_date: "2026-05-29" },
  ];
  const groups = groupDuplicates(atas);
  assert(groups.size === 0, "different meeting dates are not duplicates");
});

await test("different tipo_aceleracao → no group", async () => {
  const atas = [
    { ...BASE_ATA, id: "A1", tipo_aceleracao: "mensal" },
    { ...BASE_ATA, id: "A2", tipo_aceleracao: "semanal" },
  ];
  const groups = groupDuplicates(atas);
  assert(groups.size === 0, "different tipo_aceleracao are not duplicates");
});

await test("different consultor_id → no group", async () => {
  const atas = [
    { ...BASE_ATA, id: "A1", consultor_id: "C1" },
    { ...BASE_ATA, id: "A2", consultor_id: "C2" },
  ];
  const groups = groupDuplicates(atas);
  assert(groups.size === 0, "different consultor_id are not duplicates");
});

await test("date with time — only day matters", async () => {
  const atas = [
    { ...BASE_ATA, id: "A1", meeting_date: "2026-05-29T09:00:00" },
    { ...BASE_ATA, id: "A2", meeting_date: "2026-05-29T10:00:00" }, // same day, different time
  ];
  const groups = groupDuplicates(atas);
  assert(groups.size === 1, "same day with different times = duplicate");
});

await test("multiple workshops — no cross-contamination", async () => {
  const atas = [
    { ...BASE_ATA, id: "A1", workshop_id: "WS1" },
    { ...BASE_ATA, id: "A2", workshop_id: "WS2" }, // different workshop
    { ...BASE_ATA, id: "A3", workshop_id: "WS1" }, // same as A1 → duplicate
  ];
  const groups = groupDuplicates(atas);
  assert(groups.size === 1, "only WS1 pair is a duplicate group");
  const group = [...groups.values()][0];
  assert(group.every(a => a.workshop_id === "WS1"), "group only contains WS1 atas");
});

// ── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
if (failed > 0) console.error("⚠️  Some dedup tests failed.");