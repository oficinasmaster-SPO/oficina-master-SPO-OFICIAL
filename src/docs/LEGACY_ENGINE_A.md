# LEGACY ENGINE A — Documentação de Deprecação

> **Status:** CONGELADO. Apenas manutenção crítica de estabilidade.
> **Data de congelamento:** 2026-05-09
> **Decisão arquitetural:** `CronogramaImplementacao` é a source of truth operacional.

---

## O que é a Engine A

Engine A é o conjunto original de geração e rastreamento de cronogramas, baseado em dados hardcoded e a entidade `CronogramaProgresso`.

### Arquivos da Engine A

| Arquivo | Papel | Status |
|---|---|---|
| `gerarCronogramaAutomatico.js` | Gera cronograma a partir de templates hardcoded por fase (1–4) | ⚠️ DEPRECATED |
| `syncCronogramaProgress.js` | Sincroniza status para `CronogramaProgresso` | ⚠️ DEPRECATED |
| `CronogramaProgresso` (entidade) | Read model / cache de progresso legado | ⚠️ READ-ONLY FUTURO |

---

## O que é a Engine B (nova)

| Arquivo | Papel | Status |
|---|---|---|
| `generateFullCronograma.js` | Única source de criação estrutural | ✅ ATIVO |
| `trackImplementacao.js` | Telemetria pura (nunca cria) | ✅ ATIVO |
| `CronogramaTemplateItem` (entidade) | Templates dinâmicos por plano | ✅ ATIVO |
| `CronogramaImplementacao` (entidade) | **Source of truth operacional** | ✅ ATIVO |

---

## Regras de engine_version

Todo item em `CronogramaImplementacao` deve ter `engine_version`:

| Valor | Origem |
|---|---|
| `legacy_v0` | `gerarCronogramaAutomatico` (Engine A) |
| `legacy_v1` | `generateFullCronograma` fallback (sem CronogramaTemplateItem) |
| `template_v2` | `generateFullCronograma` com `CronogramaTemplateItem` |
| `tracking_v1` | `trackImplementacao` (telemetria — não deve criar estrutural) |

---

## Fluxo correto (Engine B)

```
Plano ativado (adminUpdateWorkshopPlan / Kiwify webhook paid)
  ↓
generateFullCronograma()
  ↓ tenta CronogramaTemplateItem (engine: template_v2)
  ↓ fallback: PlanFeature + PlanAttendanceRule (engine: legacy_v1)
  ↓
CronogramaImplementacao (source of truth criado)

Usuário navega na UI
  ↓
trackImplementacao() — apenas atualiza telemetria se item JÁ EXISTE
  ↓ NÃO cria nada se item não encontrado

Conclusão registrada
  ↓
markCronogramaCompleted()
  ↓
syncCronogramaProgress() — mantém CronogramaProgresso atualizado (compatibilidade)
```

---

## O que NÃO fazer na Engine A

❌ Adicionar novos módulos hardcoded em `gerarCronogramaAutomatico.js`  
❌ Adicionar novas regras de SLA em `syncCronogramaProgress.js`  
❌ Fazer `CronogramaProgresso` voltar a ser source of truth  
❌ Criar novas automações que escrevam em `CronogramaProgresso` diretamente  

---

## Dependências identificadas

Processos que ainda dependem da Engine A (mapeados em 2026-05-09):

| Processo | Dependência | Plano de migração |
|---|---|---|
| `markCronogramaCompleted` | chama `syncCronogramaProgress` | Manter para compatibilidade, migrar quando UI for atualizada |
| Telas com `CronogramaProgresso` | leem o legado | Migrar gradualmente para ler `CronogramaImplementacao` |
| `gerarCronogramaAutomatico` | ainda é chamado por admin | Substituir por `generateFullCronograma` com CronogramaTemplateItem |

---

## Plano de morte (Strangler Fig)

**Etapa 1 (FEITO):** `CronogramaImplementacao` declarado como source of truth. Engine A congelada.  
**Etapa 2:** Toda nova UI lê somente `CronogramaImplementacao`.  
**Etapa 3:** Sync unidirecional — `CronogramaImplementacao` → `CronogramaProgresso` (sem mais escrita direta).  
**Etapa 4:** Remover chamadas ao `gerarCronogramaAutomatico` do admin.  
**Etapa 5:** Desativar Engine A definitivamente.  

---

## Backfill de engine_version para registros existentes

Registros anteriores ao congelamento não possuem `engine_version`. Regras de inferência:

| Condição | engine_version inferido |
|---|---|
| Tem `modulo_codigo` em `CronogramaProgresso` | `legacy_v0` |
| Criado por `generateFullCronograma` sem `template_item_id` | `legacy_v1` |
| Tem `template_item_id` preenchido | `template_v2` |
| Nenhuma das anteriores | `unknown` |

Para rodar o backfill, criar função admin `backfillCronogramaEngineVersion`.