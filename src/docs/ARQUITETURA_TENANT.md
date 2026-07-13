# ARQUITETURA TENANT — Regras de Congelamento (ETAPA 2)

> **Status: REGRA ARQUITETURAL VIGENTE.** Todo código novo DEVE seguir estas 5 regras.
> Violações são bloqueadas em code review. Código legado que viola estas regras está
> em processo de migração — não replique padrões antigos.

---

## Regra 1 — Proibido novo código lendo `user.data.workshop_id` ou `user.data.company_id`

O objeto `user` não é fonte de verdade de tenant. O vínculo usuário→oficina vive em
`TenantMembership`; `Employee` e os campos do usuário são apenas fallbacks temporários.
O backend (`resolveTenant`/`getUserWorkshops`) resolve o vínculo e o hook central o expõe.

**❌ Errado:**
```jsx
const user = await base44.auth.me();
const workshopId = user.data?.workshop_id || user.workshop_id; // PROIBIDO
const lancamentos = await base44.entities.DRELancamento.filter({ workshop_id: workshopId });
```

**✅ Certo:**
```jsx
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";

const { workshopId } = useWorkshopContext(); // fonte única de verdade no frontend
const lancamentos = await base44.entities.DRELancamento.filter({ workshop_id: workshopId });
```

> Exceção: as policies RLS existentes usam `{{user.data.workshop_id}}` como template —
> isso é infraestrutura de segurança, não leitura de código de aplicação, e permanece.

---

## Regra 2 — Proibida nova function que aceite `workshop_id` do payload sem validar vínculo

Toda backend function que recebe `workshop_id` (ou `cliente_id` de oficina) no payload
DEVE validar que o usuário autenticado tem vínculo com aquela oficina antes de usar
`asServiceRole`. Padrão de referência: `getUserWorkshops` e `generateFullCronograma`.

**❌ Errado:**
```js
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  const { workshop_id } = await req.json();
  // usa direto — qualquer usuário autenticado lê dados de qualquer oficina. PROIBIDO
  const dados = await base44.asServiceRole.entities.DRELancamento.filter({ workshop_id });
  return Response.json({ dados });
});
```

**✅ Certo:**
```js
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { workshop_id } = await req.json();

  // Guard de vínculo ANTES de qualquer asServiceRole
  const isAdmin = user.role === "admin";
  let autorizado = isAdmin;
  if (!autorizado) {
    const employees = await base44.asServiceRole.entities.Employee.filter({
      email: user.email, workshop_id
    });
    const workshop = (await base44.asServiceRole.entities.Workshop.filter({ id: workshop_id }))[0];
    autorizado = employees.length > 0
      || workshop?.owner_id === user.id
      || (workshop?.partner_ids || []).includes(user.id);
  }
  if (!autorizado) return Response.json({ error: "Forbidden" }, { status: 403 });

  const dados = await base44.asServiceRole.entities.DRELancamento.filter({ workshop_id });
  return Response.json({ dados });
});
```

---

## Regra 3 — Proibido `create: true` em policies de entidades com dados de oficina

Toda entidade que carrega `workshop_id` (ou `cliente_id` de oficina) deve restringir
o `create` ao vínculo do usuário, com exceções explícitas para admin/internos.
`create: true` só é aceitável em entidades de log/telemetria sem dado de tenant sensível.

**❌ Errado:**
```jsonc
"rls": {
  "create": true, // qualquer usuário cria registro para qualquer oficina. PROIBIDO
  "read": { "workshop_id": "{{user.data.workshop_id}}" }
}
```

**✅ Certo:**
```jsonc
"rls": {
  "create": {
    "$or": [
      { "data.workshop_id": "{{user.workshop_id}}" },
      { "data.workshop_id": "{{user.data.workshop_id}}" },
      { "user_condition": { "role": "admin" } },
      { "user_condition": { "user_type": "internal" } },
      { "user_condition": { "data.user_type": "internal" } }
    ]
  }
}
```

---

## Regra 4 — Proibido novo componente resolvendo oficina por conta própria

Nenhum componente/página novo pode buscar Workshop/Employee, ler localStorage ou
inspecionar o user para descobrir a oficina ativa. A resolução de tenant é exclusiva
do hook central `useWorkshopContext` (e `useTenant` para firma/empresa).

**❌ Errado:**
```jsx
export default function MinhaPagina() {
  const [workshop, setWorkshop] = useState(null);
  useEffect(() => {
    // resolução própria de tenant. PROIBIDO
    base44.auth.me().then(async (u) => {
      const ws = await base44.entities.Workshop.filter({ owner_id: u.id });
      setWorkshop(ws[0]);
    });
  }, []);
}
```

**✅ Certo:**
```jsx
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";

export default function MinhaPagina() {
  const { workshop, workshopId, isLoading } = useWorkshopContext();
  // usa workshop/workshopId direto — impersonação, admin mode e fallbacks já resolvidos
}
```

---

## Regra 5 — `cliente_id` e `company_id` nunca devem receber um `workshop_id` (e vice-versa)

Cada campo de vínculo tem semântica própria e não são intercambiáveis:

| Campo | Aponta para | Exemplo de entidade |
|---|---|---|
| `workshop_id` | `Workshop.id` (oficina/unidade) | DRELancamento, ContaPagar |
| `company_id` | `Company.id` (matriz/grupo) | Workshop, Employee |
| `cliente_id` | depende da entidade — verifique a descrição no schema | TarefaBacklog (`cliente_id` = workshop), Client (`cliente_id` = pessoa) |

> Nota de legado: em `TarefaBacklog` e `PedidoInterno` o campo `cliente_id` armazena
> semanticamente um `Workshop.id`. As policies e functions devem tratá-lo como chave de
> tenant, usando `TenantMembership` como autoridade e `tenant_workshop_id` como projeção
> para RLS. O renomeio físico para `workshop_id` fica para uma migração posterior; até lá,
> não crie novos campos com esse padrão ambíguo.

**❌ Errado:**
```js
await base44.entities.PedidoInterno.create({
  company_id: workshopId, // mistura de semânticas. PROIBIDO
});
await base44.entities.Employee.create({
  company_id: workshop.id, // company_id espera Company.id, não Workshop.id
});
```

**✅ Certo:**
```js
await base44.entities.Employee.create({
  workshop_id: workshop.id,
  company_id: workshop.company_id, // propaga o Company.id real da matriz
});
```

---

## Checklist rápido para PRs

- [ ] Nenhuma leitura nova de `user.data.workshop_id` / `user.data.company_id`
- [ ] Function nova com `workshop_id` no payload tem guard de vínculo (403 quando não autorizado)
- [ ] Entidade nova/alterada com dado de oficina não tem `create: true`
- [ ] Componente novo obtém tenant só via `useWorkshopContext` / `useTenant`
- [ ] Nenhum `workshop_id` gravado em `company_id` (ou vice-versa); campos novos não reutilizam `cliente_id` para oficina