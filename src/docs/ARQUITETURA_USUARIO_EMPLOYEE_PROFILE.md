# 📘 Arquitetura de Identidade e Acesso (IAM)

## Visão Geral

O sistema utiliza uma arquitetura de **3 camadas** para gerenciar identidade, dados profissionais e permissões de acesso. Esta separação permite flexibilidade para diferentes tipos de usuários (funcionários, clientes, candidatos) e controle granular de permissões.

---

## 🏗️ Estrutura de Entidades

### 1. **User** (Entidade Built-in do Base44)

**Propósito:** Gerenciar autenticação e acesso básico ao sistema.

**Campos Principais:**
```json
{
  "id": "69984abc620579000193d920",
  "email": "mateus.mtssaraiva@gmail.com",
  "full_name": "mateus.mtssaraiva",
  "role": "admin",
  "is_verified": true,
  "data": {
    "workshop_id": "695408b3ed74bfeb60d708c0",
    "consulting_firm_id": "69bab264d7c3fe5d367c3959",
    "first_access_completed": true,
    "profile_completed": true,
    "is_collaborator": true,
    "role": "admin"
  }
}
```

**Características:**
- ✅ Obrigatório para **qualquer pessoa** que acessa o sistema
- ✅ Gerencia login, senha, sessões, tokens de API
- ✅ Role básico: `admin` ou `user`
- ✅ Pode existir **sem** Employee (ex: clientes externos)
- ✅ Campos imutáveis: `id`, `email`, `created_date`

**Casos de Uso:**
| Cenário | User Existe? |
|---------|-------------|
| Funcionário interno | ✅ Sim |
| Cliente/oficina | ✅ Sim |
| Candidato em processo seletivo | ✅ Sim (acesso limitado) |
| Ex-funcionário | ❌ (desativado) |

---

### 2. **Employee** (Entidade Customizada)

**Propósito:** Armazenar dados profissionais e de RH.

**Campos Principais:**
```json
{
  "id": "69984a68bad6fd3a6c490b78",
  "user_id": "69984abc620579000193d920",
  "full_name": "Mateus Silveira Sairaiva",
  "email": "mateus.mtssaraiva@gmail.com",
  "cpf": "0964799950",
  "rg": "131802650",
  "data_nascimento": "1996-05-18",
  "telefone": "4499494382",
  "position": "Head Marketing",
  "job_role": "marketing",
  "area": "marketing",
  "user_type": "internal",
  "tipo_vinculo": "interno",
  "user_status": "ativo",
  "profile_id": "6981e1904f21fbeca5620f73",
  "workshop_id": "695408b3ed74bfeb60d708c0",
  "company_id": "69bab329dd0a253653721ca2",
  "consulting_firm_id": "69bab264d7c3fe5d367c3959",
  "salary": 0.0,
  "commission": 0.0,
  "bonus": 0.0,
  "benefits": [],
  "hire_date": "",
  "profile_picture_url": "...",
  "digital_signature_url": "",
  "work_contract_url": "",
  "career_history": [],
  "contract_history": [],
  "audit_log": []
}
```

**Características:**
- ✅ **Opcional** - apenas para funcionários internos
- ✅ Contém dados sensíveis de RH (salário, CPF, RG)
- ✅ Mantém histórico profissional (cargo, contratos)
- ✅ Link explícito para User via `user_id`
- ✅ Link para UserProfile via `profile_id`

**Campos Sensíveis (RLS):**
- `salary`, `commission`, `bonus`, `benefits` - Apenas admin e próprio usuário
- `cpf`, `rg`, `data_nascimento` - Apenas admin e RH
- `audit_log`, `contract_history` - Apenas admin

**Casos de Uso:**
| Cenário | Employee Existe? |
|---------|-----------------|
| Funcionário interno | ✅ Sim |
| Cliente/oficina | ❌ Não |
| Candidato (não contratado) | ❌ Não |
| Ex-funcionário | ✅ Sim (histórico mantido) |

---

### 3. **UserProfile** (Entidade Customizada)

**Propósito:** Definir permissões granulares de acesso (RBAC - Role-Based Access Control).

**Campos Principais:**
```json
{
  "id": "69f216f1ff2a38a5612e8842",
  "name": "Perfil Admin Completo",
  "type": "interno",
  "permission_type": "job_role",
  "job_roles": ["marketing", "comercial", "gerencia"],
  "status": "ativo",
  "description": "Perfil com acesso total para administradores",
  "roles": ["dashboard_view", "employees_view", "employees_edit", "..."],
  "sidebar_permissions": {
    "dashboard_Visão Geral": {
      "view": true,
      "edit": true,
      "create": true,
      "delete": true,
      "export": true,
      "approve": true
    },
    "pessoas_Colaboradores": {
      "view": true,
      "edit": true,
      "create": true,
      "delete": true,
      "export": true,
      "approve": true
    }
    // ... mais módulos
  },
  "module_permissions": {
    "dashboard": "total",
    "cadastros": "total",
    "pessoas": "total",
    "gestao": "total",
    "admin": "total"
  },
  "modules_allowed": ["dashboard", "cadastros", "pessoas", "..."],
  "users_count": 0,
  "is_system": false,
  "audit_log": []
}
```

**Características:**
- ✅ **Reutilizável** - Múltiplos funcionários podem compartilhar o mesmo profile
- ✅ Controle granular por tela/módulo
- ✅ 6 tipos de permissão: `view`, `edit`, `create`, `delete`, `export`, `approve`
- ✅ Pode ser baseado em `job_role` ou `custom_role`
- ✅ Audit log de alterações de permissão

**Tipos de Profile:**
| Tipo | Descrição | Exemplo |
|------|-----------|---------|
| `job_role` | Vinculado a cargo | "Gerente", "Técnico" |
| `role` | Vinculado ao role do User | "admin", "user" |
| `custom_role` | Roles customizadas | "Gestor Financeiro" |

---

## 🔗 Relacionamentos entre Entidades

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│    User     │────────▶│   Employee   │────────▶│ UserProfile  │
│ (Auth/Login)│  1:1    │  (Dados RH)  │  N:1    │ (Permissões) │
└─────────────┘         └──────────────┘         └──────────────┘
      │                        │                        │
      │                        │                        │
      ▼                        ▼                        ▼
  workshop_id            workshop_id              (compartilhado)
  consulting_firm_id     consulting_firm_id
```

**Regras de Vinculação:**

1. **User → Employee** (1:1)
   - `Employee.user_id` referencia `User.id`
   - Nem todo User tem Employee
   - Todo Employee tem exatamente 1 User

2. **Employee → UserProfile** (N:1)
   - `Employee.profile_id` referencia `UserProfile.id`
   - Múltiplos Employees podem compartilhar o mesmo Profile
   - Profile é reutilizável por cargo/função

3. **User → Workshop** (N:1)
   - `User.data.workshop_id` referencia `Workshop.id`
   - Define a oficina principal do usuário

---

## 🎯 Casos de Uso por Tipo de Usuário

### 1. **Funcionário Interno**
```
User ✅ → Employee ✅ → UserProfile ✅
```
**Exemplo:** Mateus (Head Marketing)
- User: Login, email, role=admin
- Employee: CPF, salário, cargo, foto
- Profile: Permissões completas de admin

### 2. **Cliente (Dono de Oficina)**
```
User ✅ → Employee ❌ → UserProfile ❌
```
**Exemplo:** João (Oficina Silva)
- User: Login, email, role=user, workshop_id
- Employee: Não se aplica (não é funcionário)
- Profile: Permissões limitadas à própria oficina

### 3. **Candidato em Processo Seletivo**
```
User ✅ → Employee ❌ → UserProfile ❌
```
**Exemplo:** Maria (Candidata)
- User: Login temporário, email
- Employee: Não existe (ainda não foi contratada)
- Profile: Acesso apenas ao teste DISC/avaliação

### 4. **Ex-Funcionário**
```
User ❌ → Employee ✅ → UserProfile ✅
```
**Exemplo:** Pedro (Desligado)
- User: Desativado (não pode logar)
- Employee: Mantido (histórico, contratos)
- Profile: Mantido (auditoria)

---

## 🔐 Regras de Segurança (RLS)

### User Entity
```json
{
  "read": {
    "$or": [
      {"user_id": "{{user.id}}"},
      {"email": "{{user.email}}"},
      {"role": "admin"},
      {"consulting_firm_id": "{{user.data.consulting_firm_id}}"},
      {"workshop_id": "{{user.data.workshop_id}}"}
    ]
  },
  "update": {
    "$or": [
      {"user_id": "{{user.id}}"},
      {"role": "admin"}
    ]
  },
  "delete": {"role": "admin"}
}
```

### Employee Entity
```json
{
  "read": {
    "$or": [
      {"user_id": "{{user.id}}"},
      {"created_by": "{{user.email}}"},
      {"role": "admin"},
      {"consulting_firm_id": "{{user.data.consulting_firm_id}}"},
      {"workshop_id": "{{user.data.workshop_id}}"}
    ]
  },
  "update": {
    "$or": [
      {"user_id": "{{user.id}}"},
      {"owner_id": "{{user.id}}"},
      {"admin_responsavel_id": "{{user.id}}"},
      {"role": "admin"}
    ]
  }
}
```

### UserProfile Entity
```json
{
  "read": true,
  "create": {"role": "admin"},
  "update": {"role": "admin"},
  "delete": {"role": "admin"}
}
```

---

## 📊 Fluxo de Consulta de Usuário Completo

### Passo 1: Buscar User pelo email
```javascript
const user = await base44.entities.User.filter({
  email: "mateus.mtssaraiva@gmail.com"
});
```

### Passo 2: Buscar Employee pelo user_id
```javascript
const employee = await base44.entities.Employee.filter({
  user_id: user.id
});
```

### Passo 3: Buscar UserProfile pelo profile_id
```javascript
const profile = await base44.entities.UserProfile.get({
  id: employee.profile_id
});
```

### Resultado Consolidado
```javascript
{
  user: { ... },      // Auth e dados básicos
  employee: { ... },  // Dados profissionais
  profile: { ... }    // Permissões
}
```

---

## 🛠️ Funções Auxiliares Sugeridas

### 1. `getUserCompleteData(userId)`
Retorna dados completos de um usuário (User + Employee + Profile).

### 2. `checkUserPermission(userId, pageName, action)`
Verifica se usuário tem permissão para uma ação específica.

### 3. `getUsersByWorkshop(workshopId)`
Lista todos os usuários (User + Employee) de uma oficina.

### 4. `getUsersByProfile(profileId)`
Lista todos os funcionários vinculados a um perfil.

### 5. `syncUserEmployeeData(userId)`
Garante consistência entre User e Employee (ex: email, nome).

---

## 📝 Boas Práticas

### ✅ Sempre Fazer
1. Buscar User primeiro (fonte primária de autenticação)
2. Verificar RLS antes de acessar dados sensíveis
3. Manter consistência entre User.email e Employee.email
4. Usar `user_type` como fonte canônica (internal/external)
5. Auditoria de alterações de permissão

### ❌ Nunca Fazer
1. Assumir que todo User tem Employee
2. Acessar dados de Employee sem verificar RLS
3. Modificar UserProfile sem ser admin
4. Excluir Employee (apenas inativar)
5. Duplicar dados entre User e Employee (manter só o necessário)

---

## 🔄 Cenários de Migração

### Novo Funcionário
1. Criar User (convite por email)
2. Criar Employee (dados de RH)
3. Atribuir UserProfile (permissões do cargo)
4. Link: `Employee.user_id = User.id`

### Promoção/Mudança de Cargo
1. Atualizar Employee.position e Employee.job_role
2. Atualizar Employee.profile_id (se necessário)
3. Manter audit_log da mudança

### Desligamento
1. User: Manter (histórico de login)
2. Employee: Manter `user_status = "inativo"`
3. Profile: Manter (auditoria)
4. **Nunca excluir** registros

### Cliente vira Funcionário
1. User: Já existe (role=user → admin se necessário)
2. Criar Employee (dados de RH)
3. Atribuir UserProfile
4. Atualizar `user_type = "internal"`

---

## 📖 Glossário

| Termo | Definição |
|-------|-----------|
| **User** | Entidade de autenticação (built-in Base44) |
| **Employee** | Entidade de dados profissionais (customizada) |
| **UserProfile** | Entidade de permissões RBAC (customizada) |
| **RLS** | Row-Level Security (segurança por linha) |
| **RBAC** | Role-Based Access Control |
| **user_type** | Campo canônico: `internal` vs `external` |
| **job_role** | Função específica no sistema (ex: "marketing") |
| **profile_id** | Link entre Employee e UserProfile |

---

## 📞 Suporte

Para dúvidas sobre esta arquitetura, consultar:
- Documentação Base44: https://docs.base44.app
- Equipe de Desenvolvimento: oficinasmaster@gmail.com

**Última Atualização:** 2026-06-02  
**Versão:** 1.0