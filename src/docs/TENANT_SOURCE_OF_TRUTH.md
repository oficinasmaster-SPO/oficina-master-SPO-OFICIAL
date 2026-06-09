# Tenant Source of Truth — Documentação Oficial
**Fase 3 do Epic: Padronização Definitiva de Contexto Multi-Tenant**

---

## 📌 Regra Canônica

> **`user.workshop_id` é a única fonte de verdade para contexto de oficina.**

---

## ❌ Campo Legado (PROIBIDO em novas implementações)

```
user.data.workshop_id
```

**Motivo da deprecação:**
- Armazenado dentro do objeto `data` (campo JSON aninhado)
- Novos usuários criados após 06/2026 recebem `workshop_id` na raiz do objeto User
- Causa direta do Incidente Gilmara: `administrativo@molashoracerta.com.br` tinha `user.data.workshop_id=null` mas `user.workshop_id="697b986d267e4326dc3f5bf5"`
- Resultado: apenas 1 de 28 colaboradores visíveis antes do hotfix

---

## ✅ Campo Canônico (OBRIGATÓRIO em novas implementações)

```
user.workshop_id
```

---

## Padrão RLS Obrigatório

Para **toda entidade** com isolamento por oficina, o `$or` de cada operação deve conter **ambas** as condições durante o período de transição:

```json
{
  "$or": [
    { "workshop_id": "{{user.data.workshop_id}}" },
    { "workshop_id": "{{user.workshop_id}}" }
  ]
}
```

> ⚠️ **NÃO remover** `user.data.workshop_id` até confirmação de que 100% dos usuários foram migrados para `user.workshop_id`.

---

## Entidades Migradas (Sprint S0 — 06/2026)

### PRÉ-DEPLOY
| Entidade | Operação | Status |
|---|---|---|
| Workshop | read | ✅ |

### Lote 1 — CRÍTICO
| Entidade | Operações | Status |
|---|---|---|
| Employee | read/create/update/delete | ✅ |
| Goal | read/create/update/delete | ✅ |
| Task | read/create/update/delete | ✅ |
| DRELancamento | read/create/update/delete | ✅ |
| DFCLancamento | read/create/update/delete | ✅ |
| DREMonthly | read/create/update/delete | ✅ |
| BudgetMeta | read/update/delete | ✅ |
| ContaPagar | read/create/update | ✅ |
| ContaReceber | read/create/update | ✅ |
| CronogramaImplementacao | read/update | ✅ |
| ConsultoriaSprint | read/update | ✅ |
| ConsultoriaProximoPasso | read/update | ✅ |
| DISCDiagnostic | read/update/delete | ✅ |

### Lote 2 — ALTO/MÉDIO
| Entidade | Operações | Status |
|---|---|---|
| BudgetGroup | read/create/update/delete | ✅ |
| BudgetMetaHistory | read/create | ✅ |
| SaldoInicialHistorico | read/create | ✅ |
| SubcategoriaDRE | create/update | ✅ |
| DISCPublicSession | delete | ✅ |

### Sem alteração (acesso via outros campos)
| Entidade | Razão |
|---|---|
| FollowUpReminder | Acesso via `consultor_id` |
| ConsultoriaAtendimento | Acesso via `consulting_firm_id` |
| COEXContract | Acesso via `created_by` |
| ProcessDocument | `read=true` (público) |
| UserProfile | `read=true` (público) |
| Notification | Acesso via `user_id` |
| Contract | Acesso via `created_by` / admin |
| PlanAttendanceRule | `read=true` (público) |

---

## Fase 2 — Bloqueio de Novas Implementações

### Lint Check (CI/CD)

Adicionar ao pipeline de CI a seguinte regra de lint:

```bash
# Bloquear user.data.workshop_id em novos arquivos de entidade
grep -rn "user\.data\.workshop_id" entities/ --include="*.json" | \
  grep -v "# retrocompat" && exit 1 || echo "OK"
```

### Code Review Checklist

- [ ] Nenhuma nova entidade usa `user.data.workshop_id` sem o par `user.workshop_id`
- [ ] Toda nova entidade com isolamento por oficina usa o padrão dual-mode
- [ ] Após migração completa dos usuários, remover `user.data.workshop_id` do dual-mode

---

## Fase 1 — Auditoria Automática

**Automation:** `auditLegacyWorkshopId` (scheduled, semanal, segunda-feira 09:00 BRT)

**Resultado esperado:**
```json
{
  "legacy_only_entities": [],
  "recommendation": "CLEAN — Nenhuma entidade com legacy_only. Sistema padronizado."
}
```

---

## Fase 4 — Regressão Automatizada

**Função:** `rlsRegressionLote2`

**Critério de aprovação:**
```json
{
  "regression_pass_rate": "100%",
  "lote_2_validated": true,
  "sprint_s0_complete": true
}
```

**Prova do fix (evidência em produção):**
```json
{
  "target_user": "administrativo@molashoracerta.com.br",
  "workshop_id_legacy": null,
  "workshop_id_root": "697b986d267e4326dc3f5bf5",
  "proof": "CONFIRMED — user.data.workshop_id=null, fix user.workshop_id é o único caminho funcional"
}
```

---

## Linha do Tempo

| Data | Evento |
|---|---|
| Antes 06/2026 | Usuários antigos com `user.data.workshop_id` populado |
| 06/2026 | Incidente Gilmara — 1 de 28 colaboradores visíveis |
| 09/06/2026 | Sprint S0 — hotfix RLS dual-mode em 19 entidades |
| 09/06/2026 | Regressão 10/10 PASS — incident_reproduced: false |
| TBD | Migração completa de usuários → remoção do campo legado |

---

*Aprovado por: Vitor Albuquerque — DevOps*
*Data: 09/06/2026*
*Sprint: S0 v3-final-aprovado*