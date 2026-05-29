/**
 * TDD — suporteHelper (pure logic)
 * Roda sem React, sem banco, sem DOM.
 */

import { isSuporteFlow, gerarSuporteId, buildSuporteFULocal } from "../../utils/suporteHelper.js";

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) { console.log(`  ✅ ${msg}`); passed++; }
  else { console.error(`  ❌ FAIL: ${msg}`); failed++; }
}

async function test(name, fn) {
  try { await fn(); }
  catch (err) { console.error(`  ❌ EXCEPTION: ${name} — ${err.message}`); failed++; }
}

console.log("\n🧪 suporteHelper — TDD suite\n");

// ── isSuporteFlow ─────────────────────────────────────────────────────────────

await test("isSuporteFlow: origin_type=suporte → true", async () => {
  assert(isSuporteFlow({ origin_type: 'suporte' }), "suporte → true");
});

await test("isSuporteFlow: origin_type=suporte_checkin → true", async () => {
  assert(isSuporteFlow({ origin_type: 'suporte_checkin' }), "suporte_checkin → true");
});

await test("isSuporteFlow: origin_type=ata → false", async () => {
  assert(!isSuporteFlow({ origin_type: 'ata' }), "ata → false");
});

await test("isSuporteFlow: origin_type=sprint → false", async () => {
  assert(!isSuporteFlow({ origin_type: 'sprint' }), "sprint → false");
});

await test("isSuporteFlow: null → false (não quebra)", async () => {
  assert(!isSuporteFlow(null), "null → false sem exceção");
});

await test("isSuporteFlow: undefined → false (não quebra)", async () => {
  assert(!isSuporteFlow(undefined), "undefined → false sem exceção");
});

await test("isSuporteFlow: {} sem origin_type → false", async () => {
  assert(!isSuporteFlow({}), "objeto vazio → false");
});

// ── gerarSuporteId ────────────────────────────────────────────────────────────

await test("gerarSuporteId: começa com SUP-", async () => {
  const id = gerarSuporteId();
  assert(id.startsWith("SUP-"), `"${id}" começa com SUP-`);
});

await test("gerarSuporteId: dois IDs são únicos", async () => {
  const a = gerarSuporteId();
  const b = gerarSuporteId();
  assert(a !== b, `"${a}" ≠ "${b}"`);
});

// ── buildSuporteFULocal ───────────────────────────────────────────────────────

const mockUser = { id: "user-123", full_name: "Ana Consultor", data: { consulting_firm_id: "firm-abc" } };
const mockWorkshop = { id: "ws-456", name: "Oficina Master" };

await test("buildSuporteFULocal: _isSuporteLocal = true", async () => {
  const fu = buildSuporteFULocal(mockUser, mockWorkshop);
  assert(fu._isSuporteLocal === true, "_isSuporteLocal is true");
});

await test("buildSuporteFULocal: origin_type = suporte", async () => {
  const fu = buildSuporteFULocal(mockUser, mockWorkshop);
  assert(fu.origin_type === 'suporte', "origin_type = 'suporte'");
});

await test("buildSuporteFULocal: consultor_id = user.id", async () => {
  const fu = buildSuporteFULocal(mockUser, mockWorkshop);
  assert(fu.consultor_id === "user-123", "consultor_id correto");
});

await test("buildSuporteFULocal: consultor_nome = user.full_name", async () => {
  const fu = buildSuporteFULocal(mockUser, mockWorkshop);
  assert(fu.consultor_nome === "Ana Consultor", "consultor_nome correto");
});

await test("buildSuporteFULocal: suporte_id inicia com SUP-", async () => {
  const fu = buildSuporteFULocal(mockUser, mockWorkshop);
  assert(fu.suporte_id.startsWith("SUP-"), `suporte_id = "${fu.suporte_id}"`);
});

await test("buildSuporteFULocal: workshop_id e workshop_name propagados", async () => {
  const fu = buildSuporteFULocal(mockUser, mockWorkshop);
  assert(fu.workshop_id === "ws-456", "workshop_id correto");
  assert(fu.workshop_name === "Oficina Master", "workshop_name correto");
});

await test("buildSuporteFULocal: consulting_firm_id propagado do user.data", async () => {
  const fu = buildSuporteFULocal(mockUser, mockWorkshop);
  assert(fu.consulting_firm_id === "firm-abc", "consulting_firm_id correto");
});

await test("buildSuporteFULocal: is_completed = false", async () => {
  const fu = buildSuporteFULocal(mockUser, mockWorkshop);
  assert(fu.is_completed === false, "is_completed = false");
});

await test("buildSuporteFULocal: sequence_number = 0 (suporte não tem sequência)", async () => {
  const fu = buildSuporteFULocal(mockUser, mockWorkshop);
  assert(fu.sequence_number === 0, "sequence_number = 0");
});

await test("buildSuporteFULocal: reminder_date = hoje (formato YYYY-MM-DD)", async () => {
  const fu = buildSuporteFULocal(mockUser, mockWorkshop);
  const hoje = new Date().toISOString().split('T')[0];
  assert(fu.reminder_date === hoje, `reminder_date = ${fu.reminder_date}`);
});

await test("buildSuporteFULocal: sem workshop → workshop_id null", async () => {
  const fu = buildSuporteFULocal(mockUser, {});
  assert(fu.workshop_id === null, "workshop_id null quando sem workshop");
});

await test("buildSuporteFULocal: user null → não explode", async () => {
  let fu;
  let ok = true;
  try { fu = buildSuporteFULocal(null, mockWorkshop); }
  catch { ok = false; }
  assert(ok, "não joga exceção com user=null");
  assert(fu?.origin_type === 'suporte', "origin_type ainda = suporte");
  assert(fu?.consultor_id === null, "consultor_id = null quando user=null");
});

// ── Regressão: isSuporteFlow compatível com objeto buildSuporteFULocal ────────

await test("regressão: buildSuporteFULocal → isSuporteFlow retorna true", async () => {
  const fu = buildSuporteFULocal(mockUser, mockWorkshop);
  assert(isSuporteFlow(fu), "FU local gerado é reconhecido como suporte");
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
if (failed > 0) throw new Error(`${failed} test(s) failed`);