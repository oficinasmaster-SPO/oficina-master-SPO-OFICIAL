# Governança Arquitetural — SPO (Single Path of Ownership)

> **Versão:** 1.0 — 2026-06-16  
> **Status:** Vigente. Toda auditoria começa aqui.

---

## A Pergunta Fundamental

Antes de qualquer auditoria, correção ou novo recurso, pergunte:

> **Existe alguma página, componente ou dado que foge desta cadeia?**

```
pagePermissions
      ↓
PermissionsContext
      ↓
canAccessPage()
      ↓
RouteGuard
      ↓
Sidebar
      ↓
Página
      ↓
resolveCurrentWorkshop()
      ↓
RLS
```

Se a resposta for **sim** — esse é o bug.

---

## A Cadeia Completa

### 1. `pagePermissions` — `components/lib/pagePermissions.js`
**Fonte de verdade para quais roles dão acesso a quais páginas.**

- Toda página deve ter uma entrada aqui.
- Valor `null` = pública (sem login necessário).
- Valor `"public_authenticated"` = requer login, sem role específica.
- Qualquer outra string = role canônica do `systemRoles`.
- **Página sem entrada = Fail Close** (`canAccessPage` retorna `false`).

```js
// ✅ Correto
Colaboradores: "employees.view",
PublicDISC: null,
MeuPerfil: "public_authenticated",

// ❌ Errado — não existe mais
Colaboradores: { sidebar: true, modules: ['pessoas'] }
```

---

### 2. `PermissionsContext` — `components/contexts/PermissionsContext.jsx`
**Carrega e expõe as permissões do usuário logado.**

Fluxo interno:
```
User.id
  → Employee.filter({ user_id })   ← única query de Employee
  → Employee.profile_id            ← ÚNICA fonte canônica
  → UserProfile.roles[]            ← ÚNICA fonte de roles
  → permissions[]                  ← array final deduplicated
```

**Regras invioláveis:**
- `Employee.profile_id` é a **única fonte canônica** de profile.
- `UserProfile.roles[]` é a **única fonte canônica** de permissões.
- Sem Employee → `permissions = []` → Fail Close. **Nunca fallback.**
- Sem Profile → `permissions = []` → Fail Close. **Nunca fallback.**
- Admin e `user_type=internal` recebem bypass total **exceto** em impersonação.

**Campos proibidos como fonte de permissão:**
```
❌ sidebar_permissions
❌ module_permissions
❌ modules_allowed
❌ user.profile_id
❌ hasNoProfile
❌ essentialPages
❌ aceleradorOnly
❌ owner_id (como fonte de permissão)
❌ partner_ids (como fonte de permissão)
```

---

### 3. `canAccessPage(pageName)` — dentro de `PermissionsContext`
**Única função que decide se um usuário pode ver uma página.**

```js
canAccessPage("Colaboradores")
  → resolvePagePermission("Colaboradores")   // "employees.view"
  → hasPermission("employees.view")          // permissions.includes(...)
  → true | false
```

- **Fail Close:** página não mapeada em `pagePermissions` → `false`.
- **Sem fallback de UI:** se `canAccessPage` retorna `false`, o usuário não vê nada.
- **Nunca** mostrar menu básico, essentialPages ou qualquer fallback quando `permissions = []`.

---

### 4. `RouteGuard` — `components/auth/RouteGuard.jsx`
**Bloqueia renderização de página no nível de rota.**

```jsx
// App.jsx
<Route element={<LayoutWrapper currentPageName="Colaboradores">
  <RouteGuard pageName="Colaboradores">     ← bloqueia aqui
    <Colaboradores />
  </RouteGuard>
</LayoutWrapper>} />
```

- Chama `canAccessPage(pageName)` — **não reimplementa a lógica**.
- Se negado → renderiza `<AccessDenied />` (nunca redireciona silenciosamente).
- `adminOnly=true` → valida `user.role === 'admin'` explicitamente.

---

### 5. `Sidebar` — `components/navigation/Sidebar.jsx`
**Exibe apenas os itens que o usuário pode acessar.**

```js
// Para cada item de navigationGroups:
canAccessPage(item.page)  →  visível ou invisível
```

- **Nunca** mostrar item se `canAccessPage` retorna `false`.
- **Nunca** usar `sidebar_permissions` para filtrar itens.
- **Nunca** hardcodar exceções por `job_role` ou `user_type` na Sidebar.
- Sidebar vazia = comportamento correto para usuário sem permissões.

---

### 6. `Página` — renderização do componente
**Cada página assume que RouteGuard já validou o acesso.**

- Páginas **não** reimplementam verificação de acesso.
- Páginas **não** consultam `pagePermissions` diretamente.
- Páginas podem usar `hasPermission("role.especifica")` apenas para **funcionalidades internas** (ex: mostrar botão de editar).

---

### 7. `resolveCurrentWorkshop()` — `useWorkshopContext`
**Resolve qual Workshop está ativo para o usuário.**

```
User.workshop_id || User.data.workshop_id
  → Workshop.get(workshopId)
  → workshop (objeto completo)
```

- Toda query de dados usa `workshopId` como filtro.
- **Nunca** buscar dados sem `workshop_id` para usuário não-admin.
- Admin pode operar sem workshop (modo global).

---

### 8. `RLS` — Row Level Security nas Entities
**Última linha de defesa. Garante isolamento em nível de dados.**

Campos obrigatórios em toda entidade operacional:
- `workshop_id` — isolamento por oficina
- `created_by` — rastreabilidade

**Regra:** Nenhum registro pode ter `workshop_id = null` em entidades de operação, financeiro ou pessoas.

---

## Campos Permitidos vs Proibidos

### ✅ Permitidos (arquitetura atual)

| Campo | Onde | Para quê |
|-------|------|----------|
| `Employee.profile_id` | Employee | Fonte canônica de profile |
| `UserProfile.roles[]` | UserProfile | Fonte canônica de permissões |
| `pagePermissions` | lib | Mapeamento página → role |
| `PermissionsContext` | Context | Estado de permissões |
| `canAccessPage()` | PermissionsContext | Decisão de acesso |
| `RouteGuard` | Auth | Bloqueio de rota |
| `resolveCurrentWorkshop()` | Hook | Workshop ativo |
| `RLS` | Entities | Isolamento de dados |
| `Workshop.owner_id` | Workshop | Dono da oficina |
| `Workshop.partner_ids` | Workshop | Sócios da oficina |

### ❌ Proibidos (nunca usar como fonte de permissão)

| Campo | Motivo |
|-------|--------|
| `sidebar_permissions` | Substituído por `roles[]` |
| `module_permissions` | Substituído por `roles[]` |
| `modules_allowed` | Substituído por `pagePermissions` |
| `user.profile_id` | Fonte canônica é `Employee.profile_id` |
| `hasNoProfile` | Fallback proibido — Fail Close |
| `essentialPages` | Fallback proibido — Fail Close |
| `aceleradorOnly` | Hardcode proibido |
| `owner_id` em Employees/Tasks/Financeiro | Ownership legado — suspeito |
| `admin_responsavel_id` em dados operacionais | Legado — não usar |

---

## Regra do Fail Close

```
Sem Employee
    ↓
Sem profile_id
    ↓
Sem roles[]
    ↓
permissions = []
    ↓
canAccessPage() = false para tudo
    ↓
Sidebar vazia
    ↓
RouteGuard bloqueia
    ↓
Usuário vê tela de acesso negado
```

**Nunca** interromper essa cadeia com fallback. O usuário sem permissão deve ver a tela de acesso negado — não um menu básico, não uma página vazia, não uma exceção silenciosa.

---

## Investigação de Bug — Ordem Correta

Quando um usuário não consegue acessar uma página (ou acessa sem deveria):

```
1. pagePermissions["NomeDaPagina"]   → tem entrada? qual role?
          ↓
2. Employee.filter({ user_id })      → encontrou Employee?
          ↓
3. Employee.profile_id               → tem profile vinculado?
          ↓
4. UserProfile.get(profile_id)       → profile existe? está ativo?
          ↓
5. UserProfile.roles[]               → tem a role necessária?
          ↓
6. canAccessPage("NomeDaPagina")     → retorna true?
          ↓
7. Sidebar / RouteGuard              → está bloqueando?
          ↓
8. resolveCurrentWorkshop()          → workshop correto carregado?
          ↓
9. RLS                               → dados retornam?
```

**Só investigar cache React Query depois de percorrer toda essa cadeia.**  
Cache nunca é a causa — é sintoma de estado inconsistente na cadeia.

---

## Checklist de Auditoria

Use este checklist antes de qualquer deploy ou após qualquer restore:

- [ ] Toda página nova tem entrada em `pagePermissions`?
- [ ] Nenhuma página usa `sidebar_permissions` ou `module_permissions` como fonte?
- [ ] Todos os Employees ativos têm `profile_id` válido?
- [ ] Todos os UserProfiles ativos têm `roles[]` não-vazio?
- [ ] Nenhuma entidade operacional tem `workshop_id = null`?
- [ ] `RouteGuard` está em toda rota autenticada no `App.jsx`?
- [ ] A Sidebar não tem itens hardcoded por `job_role`?
- [ ] Nenhuma página reimplementa lógica de acesso (fallback, essentialPages)?
- [ ] Impersonação desativa bypass de admin?
- [ ] `resolveCurrentWorkshop()` retorna o workshop correto antes de qualquer query?

Execute `auditPostRestoreSprint75` para validar automaticamente os itens de dados.

---

## Referências de Código

| Arquivo | Responsabilidade |
|---------|-----------------|
| `components/lib/pagePermissions.js` | Mapa página → role |
| `components/lib/systemRoles.jsx` | Catálogo de roles válidas |
| `components/contexts/PermissionsContext.jsx` | Estado e funções de permissão |
| `components/auth/RouteGuard.jsx` | Bloqueio de rota |
| `components/navigation/Sidebar.jsx` | Filtragem de menu |
| `components/hooks/useWorkshopContext.js` | Workshop ativo |
| `functions/auditPostRestoreSprint75` | Auditoria automatizada |
| `functions/auditRBACHealth` | Saúde do RBAC |