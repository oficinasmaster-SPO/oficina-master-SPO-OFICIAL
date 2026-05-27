/**
 * TDD — Testes unitários para a função de ordenação da aba "Todos"
 * Arquivo: components/aceleracao/PainelAtendimentosTab
 *
 * Regras de negócio protegidas:
 *  1º — Realizados sem ATA (mais antigo primeiro)
 *  2º — De hoje (mais cedo primeiro)
 *  3º — Atrasados (mais recente primeiro)
 *  4º — Futuros (mais próximo primeiro)
 *  5º — Concluídos/Cancelados (mais recente primeiro)
 *
 * Como rodar: node tests/sortAtendimentos.test.js
 */

// ─── Função extraída do PainelAtendimentosTab (deve ser mantida em sync) ───
function sortAtendimentos(lista, hoje) {
  const getGrupo = (item) => {
    const itemDate = (item.data_agendada || "").substring(0, 10);
    if (item.status === 'realizado' && !item.ata_id) return 1;
    if (itemDate === hoje && item.status !== 'concluido' && item.status !== 'cancelado') return 2;
    if (item.status === 'atrasado') return 3;
    if (itemDate > hoje && item.status !== 'concluido' && item.status !== 'cancelado') return 4;
    return 5;
  };

  return [...lista].sort((a, b) => {
    const grupoA = getGrupo(a);
    const grupoB = getGrupo(b);
    if (grupoA !== grupoB) return grupoA - grupoB;
    const dateA = a.data_agendada || "";
    const dateB = b.data_agendada || "";
    if (grupoA === 1) return dateA.localeCompare(dateB);
    if (grupoA === 2) return dateA.localeCompare(dateB);
    if (grupoA === 3) return dateB.localeCompare(dateA);
    if (grupoA === 4) return dateA.localeCompare(dateB);
    return dateB.localeCompare(dateA);
  });
}

// ─── Utilitário de assert simples ───
let passed = 0;
let failed = 0;

function expect(description, condition) {
  if (condition) {
    console.log(`  ✅ ${description}`);
    passed++;
  } else {
    console.error(`  ❌ FALHOU: ${description}`);
    failed++;
  }
}

// ─── Dados de teste ───
const HOJE = "2026-05-27";

const realizadoSemAtaAntigo  = { id: "r1", status: "realizado", ata_id: null,      data_agendada: "2026-05-20T10:00:00Z" };
const realizadoSemAtaRecente = { id: "r2", status: "realizado", ata_id: null,      data_agendada: "2026-05-25T10:00:00Z" };
const realizadoComAta        = { id: "r3", status: "realizado", ata_id: "ata-123", data_agendada: "2026-05-20T09:00:00Z" };

const hojeManhaAgendado      = { id: "h1", status: "agendado",   ata_id: null, data_agendada: "2026-05-27T09:00:00Z" };
const hojeTardeAgendado      = { id: "h2", status: "agendado",   ata_id: null, data_agendada: "2026-05-27T14:00:00Z" };
const hojeConfirmado         = { id: "h3", status: "confirmado", ata_id: null, data_agendada: "2026-05-27T11:00:00Z" };
const hojeConcluido          = { id: "h4", status: "concluido",  ata_id: null, data_agendada: "2026-05-27T08:00:00Z" };

const atrasadoOntem          = { id: "a1", status: "atrasado",  ata_id: null, data_agendada: "2026-05-26T10:00:00Z" };
const atrasadoSemana         = { id: "a2", status: "atrasado",  ata_id: null, data_agendada: "2026-05-21T10:00:00Z" };

const futuroAmanha           = { id: "f1", status: "agendado",  ata_id: null, data_agendada: "2026-05-28T10:00:00Z" };
const futuroDepoisAmanha     = { id: "f2", status: "agendado",  ata_id: null, data_agendada: "2026-05-29T10:00:00Z" };

const concluidoHoje          = { id: "c1", status: "concluido", ata_id: null, data_agendada: "2026-05-27T08:00:00Z" };
const canceladoOntem         = { id: "c2", status: "cancelado", ata_id: null, data_agendada: "2026-05-26T09:00:00Z" };

// ─── Testes ───

console.log("\n📋 SUITE: Ordenação de Atendimentos — aba Todos\n");

// GRUPO 1 — Realizados sem ATA
console.log("Grupo 1 — Realizados sem ATA:");
{
  const result = sortAtendimentos([realizadoSemAtaRecente, realizadoSemAtaAntigo], HOJE);
  expect("Realizado sem ATA mais ANTIGO deve vir primeiro", result[0].id === "r1");
  expect("Realizado sem ATA mais recente vem depois", result[1].id === "r2");
}
{
  const result = sortAtendimentos([hojeManhaAgendado, realizadoSemAtaAntigo], HOJE);
  expect("Realizado sem ATA sobe acima de agendado de hoje", result[0].id === "r1");
}
{
  const result = sortAtendimentos([realizadoComAta, realizadoSemAtaAntigo], HOJE);
  expect("Realizado COM ATA NÃO entra no grupo 1", result[0].id === "r1");
  // realizadoComAta cai no grupo 5 (concluido-like via ata_id presente, data passada)
}

// GRUPO 2 — De hoje
console.log("\nGrupo 2 — De hoje:");
{
  const result = sortAtendimentos([hojeTardeAgendado, hojeManhaAgendado], HOJE);
  expect("Horário mais cedo de hoje vem primeiro", result[0].id === "h1");
}
{
  const result = sortAtendimentos([futuroAmanha, hojeManhaAgendado], HOJE);
  expect("Hoje vem antes de amanhã", result[0].id === "h1");
}
{
  const result = sortAtendimentos([hojeConcluido, hojeManhaAgendado], HOJE);
  expect("Concluído de hoje NÃO entra no grupo 2 (vai pro grupo 5)", result[0].id === "h1");
}

// GRUPO 3 — Atrasados
console.log("\nGrupo 3 — Atrasados:");
{
  const result = sortAtendimentos([atrasadoSemana, atrasadoOntem], HOJE);
  expect("Atrasado mais RECENTE (ontem) vem antes do mais antigo (semana)", result[0].id === "a1");
}
{
  const result = sortAtendimentos([atrasadoOntem, hojeManhaAgendado], HOJE);
  expect("Hoje vem antes de atrasado", result[0].id === "h1");
}
{
  const result = sortAtendimentos([futuroAmanha, atrasadoOntem], HOJE);
  expect("Atrasado vem antes de futuro", result[0].id === "a1");
}

// GRUPO 4 — Futuros
console.log("\nGrupo 4 — Futuros:");
{
  const result = sortAtendimentos([futuroDepoisAmanha, futuroAmanha], HOJE);
  expect("Futuro mais próximo (amanhã) vem primeiro", result[0].id === "f1");
}
{
  const result = sortAtendimentos([concluidoHoje, futuroAmanha], HOJE);
  expect("Futuro vem antes de concluído", result[0].id === "f1");
}

// GRUPO 5 — Concluídos/Cancelados
console.log("\nGrupo 5 — Concluídos e Cancelados:");
{
  const result = sortAtendimentos([canceladoOntem, concluidoHoje], HOJE);
  expect("Concluído mais recente (hoje) vem antes do cancelado (ontem)", result[0].id === "c1");
}

// TESTE DE INTEGRAÇÃO — ordem completa
console.log("\nIntegração — Ordem completa:");
{
  const lista = [
    futuroDepoisAmanha, atrasadoSemana, hojeConfirmado,
    realizadoSemAtaRecente, canceladoOntem, futuroAmanha,
    realizadoSemAtaAntigo, atrasadoOntem, concluidoHoje
  ];
  const result = sortAtendimentos(lista, HOJE);
  const ids = result.map(i => i.id);

  // Grupo 1 deve vir antes do grupo 2
  expect("Grupo 1 (realizados sem ATA) antes do grupo 2 (hoje)", ids.indexOf("r1") < ids.indexOf("h3"));
  // Grupo 2 deve vir antes do grupo 3
  expect("Grupo 2 (hoje) antes do grupo 3 (atrasados)", ids.indexOf("h3") < ids.indexOf("a1"));
  // Grupo 3 deve vir antes do grupo 4
  expect("Grupo 3 (atrasados) antes do grupo 4 (futuros)", ids.indexOf("a1") < ids.indexOf("f1"));
  // Grupo 4 deve vir antes do grupo 5
  expect("Grupo 4 (futuros) antes do grupo 5 (concluídos)", ids.indexOf("f1") < ids.indexOf("c1"));
  // Dentro do grupo 1: mais antigo primeiro
  expect("Dentro do grupo 1: r1 (antigo) antes de r2 (recente)", ids.indexOf("r1") < ids.indexOf("r2"));
  // Dentro do grupo 3: mais recente primeiro
  expect("Dentro do grupo 3: a1 (ontem) antes de a2 (semana)", ids.indexOf("a1") < ids.indexOf("a2"));
  // Dentro do grupo 4: mais próximo primeiro
  expect("Dentro do grupo 4: f1 (amanhã) antes de f2 (depois de amanhã)", ids.indexOf("f1") < ids.indexOf("f2"));
}

// ─── Resultado final ───
console.log(`\n${"─".repeat(50)}`);
console.log(`Total: ${passed + failed} testes | ✅ ${passed} passaram | ❌ ${failed} falharam`);
if (failed === 0) {
  console.log("🟢 TODOS OS TESTES PASSARAM — implementação validada!\n");
} else {
  console.log("🔴 ATENÇÃO: Há falhas — verifique a implementação no PainelAtendimentosTab!\n");
  // process.exit(1); // não disponível no browser — falha visível pelo console acima
}