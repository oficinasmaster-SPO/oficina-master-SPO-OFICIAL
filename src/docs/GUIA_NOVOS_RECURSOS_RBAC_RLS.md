# GUIA: Como criar novos recursos no SPO sem quebrar RBAC e RLS

> **Contexto:** Este guia foi criado após o incidente de junho/2026 onde um bug de RLS
> causou um usuário (sócio proprietário) ver apenas 1 de 28 colaboradores.
> Causa raiz: `{{user.data.workshop_id}}` em vez de `{{user.workshop_id}}` nas entidades.

---

## TL;DR — Checklist rápido antes de cada deploy

```
[ ] Nova página? → adicionar em pagePermissions.jsx
[ ] Nova permissão? → adicionar em systemRoles.jsx primeiro
[ ] Nova entidade? → usar user.workshop_id na RLS (não user.data.workshop_id)
[ ] Nova função backend? → telemetria com .catch(), não await direto
[ ] Rodei os testes? → npx vitest run src/tests/prevention.spec.js
```

---

## 1. Nova Página

### O que fazer

Toda página criada em `pages.config.js` DEVE ter entrada em `pagePermissions.jsx`.

```js
// pages.config.js — registrar a página
const MinhaNovaPage = lazy(() => import('./pages/MinhaNovaPage'));
export const PAGES = {
  "MinhaNovaPage": MinhaNovaPage,
  // ...
};

// pagePermissions.jsx — definir quem acessa
export const pagePermissions = {
  "MinhaNovaPage": {
    roles: ["admin", "socio", "gerente"],
    job_roles: ["socio", "gerente"],
    min_plan: "START",
  },
  // ...
};
```

### O que NÃO fazer

```js
// ❌ ERRADO — página sem permissão definida = acesso negado para todos
export const PAGES = { "MinhaNovaPage": MinhaNovaPage };
// (sem entrada em pagePermissions.jsx)
```

---

## 2. Nova Permissão / Role

### O que fazer

Sempre adicionar a role em `systemRoles.jsx` antes de usá-la em qualquer outro lugar.

```js
// systemRoles.jsx
export const SYSTEM_ROLES = {
  // roles existentes...
  "nova_role": {
    label: "Nova Role",
    description: "Descrição clara do que esta role permite",
    permissions: ["module_x:read", "module_x:write"],
  },
};
```

### Ordem obrigatória

1. `systemRoles.jsx` — definir a role
2. `pagePermissions.jsx` — associar páginas
3. Entidade `UserProfile` — criar perfil de acesso
4. Testar com usuário real antes de deploy

---

## 3. Nova Entidade — Regra de Ouro RLS

### ✅ CORRETO — usar `user.workshop_id` (raiz)

```json
{
  "rls": {
    "read": {
      "$or": [
        { "user_condition": { "role": "admin" } },
        { "workshop_id": "{{user.workshop_id}}" },
        { "consulting_firm_id": "{{user.data.consulting_firm_id}}" }
      ]
    },
    "create": {
      "$or": [
        { "user_condition": { "role": "admin" } },
        { "workshop_id": "{{user.workshop_id}}" },
        { "consulting_firm_id": "{{user.data.consulting_firm_id}}" }
      ]
    },
    "update": {
      "$or": [
        { "user_condition": { "role": "admin" } },
        { "workshop_id": "{{user.workshop_id}}" },
        { "consulting_firm_id": "{{user.data.consulting_firm_id}}" }
      ]
    },
    "delete": {
      "$or": [
        { "user_condition": { "role": "admin" } },
        { "workshop_id": "{{user.workshop_id}}" }
      ]
    }
  }
}
```

### ❌ ERRADO — `user.data.workshop_id` quebra o RLS

```json
{
  "rls": {
    "read": {
      "workshop_id": "{{user.data.workshop_id}}"
    }
  }
}
```

> ⚠️ `user.data.workshop_id` é um campo legado. Para a maioria dos usuários está `null`.
> Isso faz com que o filtro retorne **0 registros** mesmo que o usuário tenha dados.
> **Sempre use `user.workshop_id`** (campo raiz, sempre preenchido).

### Campos seguros por contexto

| Campo | Uso correto | Observação |
|---|---|---|
| `user.workshop_id` | ✅ Filtro principal de tenant | Campo raiz — sempre preenchido |
| `user.data.consulting_firm_id` | ✅ Para consultoras | Ainda em `data.*` — mantido por compatibilidade |
| `user.data.company_id` | ✅ Para empresas/matrizes | Ainda em `data.*` — mantido por compatibilidade |
| `user.data.workshop_id` | ❌ PROIBIDO em RLS | Legado — quebra acesso para ~80% dos usuários |
| `user.id` | ✅ Para ownership pessoal | `owner_id`, `user_id`, `created_by` |

---

## 4. Nova Função Backend

### O que fazer

```js
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  // ✅ Sempre validar autenticação
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ✅ Para funções admin-only
  if (user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ✅ Telemetria com .catch() — não deixar erro silencioso
  const items = await base44.entities.MinhaEntidade
    .filter({ workshop_id: user.workshop_id })
    .catch(e => { console.error('fetch error:', e.message); return []; });

  return Response.json({ items });
});
```

### O que NÃO fazer

```js
// ❌ Sem autenticação
Deno.serve(async (req) => {
  const items = await base44.asServiceRole.entities.MinhaEntidade.list(); // bypass RLS
  return Response.json({ items });
});

// ❌ await direto sem .catch() — erro silencioso em produção
const items = await base44.entities.MinhaEntidade.list();
```

---

## 5. Testes obrigatórios antes do deploy

### Suite de regressão RLS

```bash
# Rodar suite completa de prevenção
npx vitest run src/tests/prevention.spec.js

# Verificar guard de legacy workshop_id
# (via dashboard Base44 → Functions → checkLegacyWorkshopIdGuard)
```

### Funções de auditoria disponíveis

| Função | O que faz |
|---|---|
| `checkLegacyWorkshopIdGuard` | Verifica se alguma entidade tem RLS bypass via sentinel |
| `rlsUserPerspectiveRegression` | Simula perspectiva do usuário `administrativo@molashoracerta.com.br` |
| `auditLegacyWorkshopId` | Audit comportamental das entidades críticas |
| `rlsRegressionLote1` | Lote 1 de entidades (Employee, DRE, Budget, DISC) |
| `rlsRegressionLote2` | Lote 2 de entidades (Contas, Sprints, Cronograma) |

### Automations ativas

| Automation | Frequência | Função |
|---|---|---|
| Guard Semanal RLS | Toda sexta 09:00 BRT | `checkLegacyWorkshopIdGuard` |
| Auditoria Semanal | Toda segunda 09:00 BRT | `auditLegacyWorkshopId` |

---

## 6. Checklist de Code Review

Antes de aprovar qualquer PR que toque em entidades ou permissões:

```
[ ] RLS usa {{user.workshop_id}} e não {{user.data.workshop_id}}?
[ ] Entidade tem $or com admin + workshop_id + consulting_firm_id?
[ ] Nova página tem entrada em pagePermissions.jsx?
[ ] Nova role tem entrada em systemRoles.jsx?
[ ] Função backend valida user antes de usar asServiceRole?
[ ] Testou com usuário não-admin em ambiente de staging?
[ ] Rodou checkLegacyWorkshopIdGuard após mudanças?
```

---

## 7. Histórico de Incidentes

### Incidente Junho/2026 — Gilmara / Molas Hora Certa

- **Sintoma:** Usuária `administrativo@molashoracerta.com.br` via apenas 1 de 28 colaboradores
- **Causa raiz:** RLS de 19 entidades usava `{{user.data.workshop_id}}` (null para este usuário)
- **Correção:** Migração para `{{user.workshop_id}}` com `$or` incluindo fallback
- **Entidades corrigidas:** Employee, DRE*, Budget*, DISC*, ContaPagar, ContaReceber, Cronograma*, Consultoria*, SaldoInicialHistorico, BudgetMetaHistory, SubcategoriaDRE, DISCPublicSession
- **Documentação:** `docs/TENANT_SOURCE_OF_TRUTH.md`, `docs/RELATORIO_ENCERRAMENTO_INCIDENTE_GILMARA.md`

---

*Última atualização: Junho/2026 — Sprint S1 pós-incidente*