# 📘 Arquitetura de Identidade e Acesso (IAM)

> **Versão:** 2.0 — Atualizado em 2026-06-10  
> **Status:** ✅ Estável — modelo canônico confirmado e auditado  
> **Regressão:** rlsRegressionLote1 + Lote2 = 100% PASS (15 cenários)

---

## Visão Geral

O sistema utiliza uma arquitetura de **3 camadas** para gerenciar identidade, dados profissionais e permissões de acesso:

```
User (Auth)  →  Employee (RH + perfil)  →  UserProfile (RBAC)
```

A autorização é **completamente desacoplada** do `User`. O `PermissionsContext` resolve permissões exclusivamente via `Employee.profile_id → UserProfile.roles`.

---

## 🏗️ Estrutura de Entidades

### 1. **User** (Entidade Built-in do Base44)

**Propósito:** Autenticação, sessões e roteamento de acesso básico.

**Campos canônicos ativos:**
```json
{
  "id": "69984abc620579000193d920",
  "email": "joao@oficina.com",
  "full_name": "João Silva",
  "role": "user",
  "user_type": "external",
  "workshop_id": "695408b3ed74bfeb60d708c0",
  "consulting_firm_id": null
}
```

**⚠️ Campos DEPRECATED (não usar para autorização):**
| Campo | Status | Razão |
|-------|--------|-------|
| `profile_id` | ❌ DEPRECATED 2026-06-10 | Ignorado pelo engine de permissões. Usar `Employee.profile_id`. |
| `job_role` | ❌ DEPRECATED 2026-06-10 | Não determina acesso. Usar `Employee.job_role` para display/UX apenas. |

**Características:**
- ✅ Obrigatório para **qualquer pessoa** que acessa o sistema
- ✅ Gerencia login, senha, sessões, tokens de API
- ✅ `role` define apenas `admin` vs `user` (controle de plataforma)
- ✅ `user_type` é a fonte canônica de `internal` vs `external`

---

### 2. **Employee** (Entidade Customizada) — **Fonte canônica de autorização**

**Propósito:** Dados profissionais/RH + vínculo com `UserProfile` (permissões).

**Campos relevantes para autorização:**
```json
{
  "id": "69984a68bad6fd3a6c490b78",
  "user_id": "69984abc620579000193d920",
  "profile_id": "6a272f8ea3fa8dd02ca7350e",
  "job_role": "socio",
  "user_type": "internal",
  "status": "ativo",
  "workshop_id": "695408b3ed74bfeb60d708c0",
  "consulting_firm_id": "69bab264d7c3fe5d367c3959"
}
```

**Características:**
- ✅ `Employee.profile_id` → fonte **única** de autorização granular
- ✅ `Employee.status = "ativo"` é verificado antes de resolver permissões
- ✅ Múltiplos Employees podem compartilhar o mesmo `UserProfile`
- ✅ Link explícito para User via `user_id`

---

### 3. **UserProfile** (Entidade Customizada) — **Engine de permissões**

**Propósito:** Definir permissões granulares (RBAC).

```json
{
  "id": "6a272f8ea3fa8dd02ca7350e",
  "name": "Sócio - Acesso Total",
  "roles": ["dashboard_view", "employees_view", "employees_edit", "..."],
  "sidebar_permissions": { ... },
  "module_permissions": { "dashboard": "total", ... },
  "status": "ativo"
}
```

---

## 🔗 Chain Canônica de Autorização

```
PermissionsContext
  └─ busca Employee ativo por user_id
       └─ lê Employee.profile_id
            └─ busca UserProfile por profile_id
                 └─ resolve roles[] + sidebar_permissions
                      └─ expõe hasPermission() / canAccessPage()
```

**Regra de ouro:** Se o Employee não tem `profile_id` ou está `status != ativo`, o usuário não tem permissões granulares (mas pode ainda ter acesso por `isOwnerOrPartner` ou `role === 'admin'`).

---

## 🎯 Casos de Uso

| Perfil | User | Employee | UserProfile | Acesso via |
|--------|------|----------|-------------|------------|
| Admin plataforma | ✅ role=admin | ✅ | qualquer | `user.role === 'admin'` bypassa tudo |
| Equipe interna | ✅ user_type=internal | ✅ | ✅ | `user_type=internal` bypassa RouteGuard |
| Dono de oficina | ✅ | ✅ profile_id=Sócio | ✅ | `Employee.profile_id → UserProfile` |
| Colaborador oficina | ✅ | ✅ profile_id=X | ✅ | `Employee.profile_id → UserProfile` |
| Candidato externo | ✅ | ❌ | ❌ | Acesso limitado (páginas públicas) |

---

## 🔐 Fluxo de Autorização (RouteGuard)

```
RouteGuard(pageName)
  1. user.role === 'admin'        → acesso total (bypass)
  2. user.user_type === 'internal' → acesso total (bypass)
  3. adminOnly === true            → 403 (apenas admin/internal)
  4. !canAccessPage(pageName)     → 403 (RBAC granular via PermissionsContext)
  5. ✅ acesso liberado
```

---

## 🔄 Fluxo de Onboarding (Convite → Acesso)

```
1. Admin cria EmployeeInvite (com profile_id pré-selecionado)
2. Email enviado → usuário clica no link
3. createUserOnFirstAccess():
   - Cria/atualiza User (email, workshop_id)
   - Atualiza Employee (user_id, profile_id, status=ativo)
   - Cria EmployeeInviteAcceptance (dispara automação)
4. PermissionsContext carrega Employee → profile_id → UserProfile
5. Usuário tem acesso conforme perfil atribuído
```

---

## ⚙️ autoAssignProfile

Função backend que atribui `profile_id` ao `Employee` com base no `job_role`:

```
job_role → JOB_ROLE_TO_PROFILE_ID[job_role] → Employee.profile_id
```

**Importante:** Grava **exclusivamente** em `Employee.profile_id`. Nunca escreve em `User.profile_id`.

---

## 📊 Mapeamento job_role → UserProfile (tabela canônica)

| job_role | UserProfile | Profile ID |
|----------|-------------|------------|
| socio | Sócio - Acesso Total | `6a272f8ea3fa8dd02ca7350e` |
| diretor | Diretor - Gestão Estratégica | `6a272f8a983951dfc5cf3493` |
| gerente | Gerente - Gestão Operacional | `6a272f8976cba10c3232779a` |
| rh | RH - Gestão de Pessoas | `6a272f883b2162c800073ace` |
| financeiro | Financeiro - Controle Financeiro | `6a285fc9f76402dd73736656` |
| lider_tecnico | Líder Técnico - Coordenação Técnica | `6a272f85fc4b85767f964421` |
| comercial / consultor_vendas | Comercial - Vendas e Atendimento | `6a272f96bc6eedd434194fcf` |
| marketing | Marketing - Comunicação | `6a272f99aaeffc72c503fa5e` |
| tecnico / outros (operacional) | Técnico - Acesso Operacional | `6a272f876b16129b2f5f31be` |
| consultor (interno) | Consultor | `6a272f95957fe29d2e8a888a` |

---

## 🚫 Anti-patterns (Nunca Fazer)

```javascript
// ❌ ERRADO — profile_id do User é deprecated e ignorado
const profileId = user.profile_id;
const profileId = user.data.profile_id;

// ❌ ERRADO — job_role do User não determina acesso
if (user.job_role === 'socio') { ... }

// ✅ CORRETO — sempre via PermissionsContext
const { hasPermission, canAccessPage } = usePermissions();
if (hasPermission('dashboard.view')) { ... }

// ✅ CORRETO — tipo de usuário via campo canônico
const isInternal = user.user_type === 'internal';

// ✅ CORRETO — perfil de acesso sempre via Employee
const employee = await Employee.filter({ user_id: user.id });
const profileId = employee.profile_id; // fonte canônica
```

---

## ✅ Checklist de Saúde do Sistema

| Verificação | Função | Status (2026-06-10) |
|-------------|--------|---------------------|
| Regressão RLS Lote 1 (9 cenários) | `rlsRegressionLote1` | ✅ 100% PASS |
| Regressão RLS Lote 2 (6 cenários) | `rlsRegressionLote2` | ✅ 100% PASS |
| Leituras legadas `user.profile_id` | Auditoria P4.A | ✅ Removidas |
| `autoAssignProfile` grava em Employee | Auditoria P4.B | ✅ Confirmado |
| `profile_id` / `job_role` no User.json | P4.C | ✅ Marcados DEPRECATED |
| `useUserType` usa `job_role` apenas para UX | P4.A | ✅ Anotado |
| RouteGuard sem leituras legadas | Auditoria P4.A | ✅ Limpo |

---

## 📖 Glossário

| Termo | Definição |
|-------|-----------|
| **User** | Entidade de autenticação (built-in Base44) |
| **Employee** | Entidade de dados profissionais + link de autorização |
| **UserProfile** | Entidade de permissões RBAC (engine de acesso) |
| **profile_id** | Chave de autorização canônica — existe em `Employee`, não em `User` |
| **user_type** | Campo canônico: `internal` (equipe OM) vs `external` (cliente) |
| **job_role** | Função no sistema — relevante apenas no `Employee`, deprecated no `User` |
| **RLS** | Row-Level Security (filtro de dados por usuário) |
| **RBAC** | Role-Based Access Control (controle de acesso por perfil) |
| **PermissionsContext** | Hook React que resolve a chain `Employee → profile_id → UserProfile` |

---

**Contato:** oficinasmaster@gmail.com  
**Última Atualização:** 2026-06-10 | **Versão:** 2.0