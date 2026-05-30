/**
 * Test Runner Minimalista
 */

let tests = [];
let passed = 0;
let failed = 0;

export function test(name, fn) {
  tests.push({ name, fn });
}

export async function runTests(suiteName) {
  console.log(`\n🧪 Starting test suite: ${suiteName}`);
  console.log('=' .repeat(60));
  
  for (const { name, fn } of tests) {
    try {
      fn();
      passed++;
      console.log(`✅ ${name}`);
    } catch (error) {
      failed++;
      console.log(`❌ ${name}`);
      console.log(`   Error: ${error.message}`);
    }
  }
  
  console.log('=' .repeat(60));
  console.log(`📊 Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  
  if (failed > 0) {
    console.log('\n⚠️  Some tests failed — review the assertions above');
  } else {
    console.log('\n✨ All tests passed!');
  }
}

export function createTestUtils() {
  return {
    mockEntity: (name, data) => {
      console.log(`[MOCK] Creating ${name} with ${data.length} records`);
      return data;
    }
  };
}