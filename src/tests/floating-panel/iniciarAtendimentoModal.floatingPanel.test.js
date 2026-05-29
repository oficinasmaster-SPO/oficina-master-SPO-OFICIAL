/**
 * TDD — ClientHistoryFloatingPanel dentro do IniciarAtendimentoModal
 *
 * Testa APENAS a lógica pura de integração:
 *  - O painel recebe workshopId correto do followUp atual
 *  - Ao trocar de followUp, o workshopId atualiza
 *  - O painel pode ser fechado (showPanel → false) sem fechar o modal
 *  - Ao fechar o painel e reabrir, ele volta ao workshopId atual
 *  - Trocar de followUp com painel fechado não reabre o painel
 *
 * Sem React — testa lógica derivada pura.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

function assert(condition, msg) {
  if (!condition) throw new Error(`FAIL: ${msg}`);
}
function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(`FAIL: ${msg} — expected "${b}", got "${a}"`);
}

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (e) {
    results.push({ name, ok: false, error: e.message });
  }
}

// ─── Lógica pura extraída do modal ────────────────────────────────────────────

/**
 * Simula o estado do modal que controla o painel flutuante.
 * Retorna funções puras que espelham o comportamento do componente.
 */
function createModalState(initialFollowUp) {
  let followUp = initialFollowUp;
  let showPanel = true; // painel abre junto com o modal

  return {
    getWorkshopId: () => followUp?.workshop_id ?? null,
    getWorkshopName: () => followUp?.workshop_name ?? null,
    getPlanId: () => followUp?.plano ?? null,
    isShowingPanel: () => showPanel,

    // Ao clicar no X do painel flutuante → esconde, mas NÃO fecha o modal
    closePanel: () => { showPanel = false; },

    // Ao trocar de followUp (trocarFollowUp) — painel NÃO reabre se estava fechado
    switchFollowUp: (novoFU) => {
      followUp = novoFU;
      // painel permanece no estado anterior (não força reabertura)
    },

    // Reabertura manual (futura: botão no header do modal)
    openPanel: () => { showPanel = true; },
  };
}

// ─── Testes ───────────────────────────────────────────────────────────────────

(async () => {
  const fu1 = { id: "fu-1", workshop_id: "ws-aaa", workshop_name: "Oficina Alpha", plano: "GOLD" };
  const fu2 = { id: "fu-2", workshop_id: "ws-bbb", workshop_name: "Oficina Beta",  plano: "PRATA" };

  await test("Painel recebe workshopId correto ao abrir o modal", () => {
    const state = createModalState(fu1);
    assertEqual(state.getWorkshopId(), "ws-aaa", "workshopId deve ser do followUp inicial");
  });

  await test("Painel recebe workshopName correto ao abrir o modal", () => {
    const state = createModalState(fu1);
    assertEqual(state.getWorkshopName(), "Oficina Alpha", "workshopName deve ser do followUp inicial");
  });

  await test("Painel recebe planId correto ao abrir o modal", () => {
    const state = createModalState(fu1);
    assertEqual(state.getPlanId(), "GOLD", "planId deve ser do followUp inicial");
  });

  await test("Painel está visível ao abrir o modal", () => {
    const state = createModalState(fu1);
    assert(state.isShowingPanel(), "painel deve estar visível por padrão");
  });

  await test("Fechar o painel não fecha o modal (showPanel=false, modal permanece)", () => {
    const state = createModalState(fu1);
    state.closePanel();
    assert(!state.isShowingPanel(), "painel deve estar oculto após fechar");
    // workshopId ainda acessível — modal continua vivo
    assertEqual(state.getWorkshopId(), "ws-aaa", "modal ainda tem acesso ao workshopId");
  });

  await test("Ao trocar de followUp, workshopId atualiza corretamente", () => {
    const state = createModalState(fu1);
    state.switchFollowUp(fu2);
    assertEqual(state.getWorkshopId(), "ws-bbb", "workshopId deve ser do novo followUp");
  });

  await test("Ao trocar de followUp, workshopName atualiza corretamente", () => {
    const state = createModalState(fu1);
    state.switchFollowUp(fu2);
    assertEqual(state.getWorkshopName(), "Oficina Beta", "workshopName deve ser do novo followUp");
  });

  await test("Trocar followUp com painel fechado NÃO reabre o painel", () => {
    const state = createModalState(fu1);
    state.closePanel();
    state.switchFollowUp(fu2);
    assert(!state.isShowingPanel(), "painel deve continuar fechado após troca de followUp");
  });

  await test("Painel reabre manualmente após ter sido fechado", () => {
    const state = createModalState(fu1);
    state.closePanel();
    state.openPanel();
    assert(state.isShowingPanel(), "painel deve estar visível após reabertura manual");
  });

  await test("followUp sem plano retorna planId=null sem crash", () => {
    const fuSemPlano = { id: "fu-3", workshop_id: "ws-ccc", workshop_name: "Sem Plano" };
    const state = createModalState(fuSemPlano);
    assertEqual(state.getPlanId(), null, "planId deve ser null se followUp não tem plano");
  });

  await test("followUp nulo retorna workshopId=null sem crash", () => {
    const state = createModalState(null);
    assertEqual(state.getWorkshopId(), null, "workshopId deve ser null se followUp é null");
  });

  await test("Trocar para followUp nulo não quebra o estado do painel", () => {
    const state = createModalState(fu1);
    state.switchFollowUp(null);
    assertEqual(state.getWorkshopId(), null, "workshopId deve ser null após troca para null");
    assert(state.isShowingPanel(), "painel continua visível (não crasha)");
  });

  // ── Sumário ──────────────────────────────────────────────────────────────────
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;

  console.log(`\n╔══════════════════════════════════════════════════════╗`);
  console.log(`║  ClientHistoryFloatingPanel × IniciarAtendimentoModal ║`);
  console.log(`╚══════════════════════════════════════════════════════╝`);
  results.forEach(r => {
    console.log(`  ${r.ok ? "✅" : "❌"} ${r.name}${r.ok ? "" : `\n     → ${r.error}`}`);
  });
  console.log(`\n  Total: ${passed} passou | ${failed} falhou`);
  if (failed > 0) console.error("Some tests failed.");
})();