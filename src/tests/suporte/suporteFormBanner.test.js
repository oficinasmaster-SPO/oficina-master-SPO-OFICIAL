/**
 * TDD — SuporteFormBanner (pure logic / contract tests)
 *
 * Testa os contratos de visibilidade e conteúdo do banner de suporte.
 * Roda sem React, sem DOM — apenas validando as regras de negócio.
 *
 * Regras:
 *  1. Banner NÃO aparece quando followUp = null / undefined / origin_type padrão
 *  2. Banner aparece quando origin_type = 'suporte'
 *  3. Banner aparece quando origin_type = 'suporte_checkin'
 *  4. Texto do label muda conforme o tipo
 *  5. suporte_id é exibido quando presente
 *  6. Compatibilidade: buildSuporteFULocal sempre gera um FU que ACIONA o banner
 */

import { isSuporteFlow, buildSuporteFULocal } from "../../utils/suporteHelper.js";

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

// ── Funções puras que espelham a lógica do SuporteFormBanner ──────────────────

/** Determina se o banner deve ser exibido */
function shouldShowBanner(followUp) {
  return isSuporteFlow(followUp);
}

/** Retorna o label correto para o tipo */
function getBannerLabel(followUp) {
  if (followUp?.origin_type === 'suporte_checkin') return 'Check-in de Suporte';
  if (followUp?.origin_type === 'suporte') return 'Modo Suporte Ativo';
  return null;
}

/** Retorna o protocolo formatado ou null */
function getBannerProtocol(followUp) {
  if (!shouldShowBanner(followUp)) return null;
  return followUp?.suporte_id ?? null;
}

/** Retorna a descrição da urgência contextual */
function getBannerDescription(followUp) {
  if (!shouldShowBanner(followUp)) return null;
  if (followUp?.origin_type === 'suporte_checkin') {
    return 'Este é um check-in de acompanhamento pós-suporte.';
  }
  return 'Atendimento fora do fluxo padrão de follow-up — registre com atenção.';
}

// ── Testes ────────────────────────────────────────────────────────────────────

console.log("\n🧪 SuporteFormBanner — TDD contract suite\n");

// ── Visibilidade ──────────────────────────────────────────────────────────────

await test("null → banner oculto", async () => {
  assert(!shouldShowBanner(null), "null não exibe banner");
});

await test("undefined → banner oculto", async () => {
  assert(!shouldShowBanner(undefined), "undefined não exibe banner");
});

await test("origin_type='ata' → banner oculto", async () => {
  assert(!shouldShowBanner({ origin_type: 'ata' }), "ata não exibe banner");
});

await test("origin_type='sprint' → banner oculto", async () => {
  assert(!shouldShowBanner({ origin_type: 'sprint' }), "sprint não exibe banner");
});

await test("origin_type='suporte' → banner visível", async () => {
  assert(shouldShowBanner({ origin_type: 'suporte' }), "suporte exibe banner");
});

await test("origin_type='suporte_checkin' → banner visível", async () => {
  assert(shouldShowBanner({ origin_type: 'suporte_checkin' }), "suporte_checkin exibe banner");
});

// ── Label ─────────────────────────────────────────────────────────────────────

await test("label para 'suporte' = 'Modo Suporte Ativo'", async () => {
  assert(getBannerLabel({ origin_type: 'suporte' }) === 'Modo Suporte Ativo', "label suporte correto");
});

await test("label para 'suporte_checkin' = 'Check-in de Suporte'", async () => {
  assert(getBannerLabel({ origin_type: 'suporte_checkin' }) === 'Check-in de Suporte', "label checkin correto");
});

await test("label para tipo inválido = null", async () => {
  assert(getBannerLabel({ origin_type: 'ata' }) === null, "label null para tipo inválido");
});

// ── Protocolo ─────────────────────────────────────────────────────────────────

await test("suporte_id presente → protocolo exibido", async () => {
  const protocol = getBannerProtocol({ origin_type: 'suporte', suporte_id: 'SUP-123-ABCDE' });
  assert(protocol === 'SUP-123-ABCDE', `protocolo = "${protocol}"`);
});

await test("suporte_id ausente → protocolo null (não quebra)", async () => {
  const protocol = getBannerProtocol({ origin_type: 'suporte' });
  assert(protocol === null, "sem suporte_id retorna null sem exceção");
});

await test("tipo não-suporte → getBannerProtocol = null", async () => {
  const protocol = getBannerProtocol({ origin_type: 'ata', suporte_id: 'SUP-000' });
  assert(protocol === null, "protocolo null para não-suporte");
});

// ── Descrição ─────────────────────────────────────────────────────────────────

await test("descrição para 'suporte' é descritiva e não vazia", async () => {
  const desc = getBannerDescription({ origin_type: 'suporte' });
  assert(typeof desc === 'string' && desc.length > 5, `descrição = "${desc}"`);
});

await test("descrição para 'suporte_checkin' é diferente de 'suporte'", async () => {
  const a = getBannerDescription({ origin_type: 'suporte' });
  const b = getBannerDescription({ origin_type: 'suporte_checkin' });
  assert(a !== b, "textos distintos entre suporte e checkin");
});

await test("descrição para tipo inválido = null (não renderiza)", async () => {
  const desc = getBannerDescription({ origin_type: 'ata' });
  assert(desc === null, "descrição null para tipo inválido");
});

// ── Regressão: buildSuporteFULocal aciona o banner ────────────────────────────

await test("regressão: FU gerado por buildSuporteFULocal → banner visível", async () => {
  const mockUser = { id: "u1", full_name: "Consultor Teste", data: {} };
  const mockWorkshop = { id: "ws1", name: "Oficina Teste" };
  const fu = buildSuporteFULocal(mockUser, mockWorkshop);
  assert(shouldShowBanner(fu), "FU local aciona o banner");
  assert(getBannerLabel(fu) === 'Modo Suporte Ativo', "label correto no FU local");
  assert(getBannerProtocol(fu) !== null, `protocolo presente: ${getBannerProtocol(fu)}`);
});

await test("regressão: FU checkin → banner visível com label correto", async () => {
  const fuCheckin = { origin_type: 'suporte_checkin', suporte_id: 'SUP-999-XYZAB' };
  assert(shouldShowBanner(fuCheckin), "checkin aciona banner");
  assert(getBannerLabel(fuCheckin) === 'Check-in de Suporte', "label checkin correto");
  assert(getBannerProtocol(fuCheckin) === 'SUP-999-XYZAB', "protocolo checkin correto");
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
if (failed > 0) throw new Error(`${failed} test(s) failed`);