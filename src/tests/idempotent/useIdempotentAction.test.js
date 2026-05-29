/**
 * TDD — useIdempotentAction
 *
 * Testa a lógica pura da proteção contra duplo clique.
 * Roda no browser sem dependência de React.
 */

// ─── Minimal test runner ───────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    failed++;
  }
}

async function test(name, fn) {
  try {
    await fn();
  } catch (err) {
    console.error(`  ❌ FAIL (exception): ${name} — ${err.message}`);
    failed++;
  }
}

// ─── Pure logic extracted from hook (no React) ────────────────────────────
function createIdempotentRunner() {
  let running = false;

  async function execute(fn, ...args) {
    if (running) return undefined;
    running = true;
    try {
      return await fn(...args);
    } finally {
      running = false;
    }
  }

  function isRunning() { return running; }

  return { execute, isRunning };
}

// ─── Tests ─────────────────────────────────────────────────────────────────
console.log("\n🧪 useIdempotentAction — TDD suite\n");

await test("executes action once when called sequentially", async () => {
  const runner = createIdempotentRunner();
  let count = 0;
  const action = async () => { count++; };
  await runner.execute(action);
  await runner.execute(action);
  assert(count === 1, "first sequential call ran once (second ignored while first resolved)");
});

await test("blocks concurrent duplicate calls", async () => {
  const runner = createIdempotentRunner();
  let count = 0;
  let resolve;
  const slowAction = () => new Promise(r => { count++; resolve = r; });

  const p1 = runner.execute(slowAction); // starts, blocks
  const p2 = runner.execute(slowAction); // should be ignored

  resolve?.(); // finish first action
  await p1;
  await p2;

  assert(count === 1, "slow action ran only once despite two concurrent calls");
});

await test("allows second call after first completes", async () => {
  const runner = createIdempotentRunner();
  let count = 0;
  const action = async () => { count++; };

  await runner.execute(action);
  await runner.execute(action);
  // Neither should be blocked if the first already completed
  // (second call happens after first resolved)
  assert(count === 2, "second call after completion succeeds (count = 2)");
});

await test("is not running initially", async () => {
  const runner = createIdempotentRunner();
  assert(!runner.isRunning(), "isRunning() is false initially");
});

await test("is running while action is pending", async () => {
  const runner = createIdempotentRunner();
  let resolve;
  const slowAction = () => new Promise(r => { resolve = r; });

  const p = runner.execute(slowAction);
  assert(runner.isRunning(), "isRunning() is true during execution");
  resolve();
  await p;
  assert(!runner.isRunning(), "isRunning() is false after completion");
});

await test("returns undefined for ignored duplicate", async () => {
  const runner = createIdempotentRunner();
  let resolve;
  const slowAction = () => new Promise(r => { resolve = r; });

  const p1 = runner.execute(slowAction);
  const result2 = await runner.execute(slowAction); // duplicate
  resolve();
  await p1;

  assert(result2 === undefined, "ignored call returns undefined");
});

await test("propagates return value of action", async () => {
  const runner = createIdempotentRunner();
  const action = async () => "OK";
  const result = await runner.execute(action);
  assert(result === "OK", "action return value is propagated");
});

await test("resets running flag even if action throws", async () => {
  const runner = createIdempotentRunner();
  const failingAction = async () => { throw new Error("boom"); };

  try { await runner.execute(failingAction); } catch {}
  assert(!runner.isRunning(), "running resets to false after error");

  let count = 0;
  await runner.execute(async () => { count++; });
  assert(count === 1, "subsequent call succeeds after error reset");
});

// ─── Summary ───────────────────────────────────────────────────────────────
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
if (failed > 0) console.error("⚠️  Some idempotency tests failed.");