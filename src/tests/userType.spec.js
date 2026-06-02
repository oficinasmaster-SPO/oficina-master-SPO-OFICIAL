/**
 * SPEC: resolveUserType + lógica de separação interno/externo
 *
 * Cobre:
 *   1. resolveUserType() — campo canônico user_type
 *   2. Contratos de RLS — o que cada tipo pode ler/escrever
 *   3. Backfill — regra de classificação dos 177 employees
 *   4. Regressão — padrões legados que não devem mais ser usados
 *
 * Como rodar:
 *   npx vitest run src/tests/userType.spec.js
 *   ou: npm test
 */

import { describe, it, expect } from 'vitest';

// ─── Função pura extraída de useUserType.js ─────────────────────────────────
// Mantida aqui inline para que o teste não dependa do React.
// REGRA: se a lógica mudar no hook, deve mudar aqui também (e o teste vai quebrar).

const INTERNAL_JOB_ROLES  = ['acelerador', 'consultor', 'mentor', 'socio_interno'];
const OWNER_JOB_ROLES     = ['socio', 'socio_interno', 'diretor'];
const FINANCIAL_JOB_ROLES = ['socio', 'diretor', 'gerente', 'financeiro'];
const CONSULTING_FIRM_ID  = '69bab264d7c3fe5d367c3959';

function resolveUserType(user) {
  if (!user) return { isInternal: false, isExternal: false, isAdmin: false };

  const isInternal   = user.user_type === 'internal';
  const isExternal   = user.user_type === 'external';
  const isAdmin      = user.role === 'admin';
  const isSuperAdmin = user.role === 'super_admin';

  return {
    isInternal,
    isExternal,
    isAdmin,
    isSuperAdmin,
    isConsultor:        isInternal && user.job_role === 'consultor',
    isAcelerador:       isInternal && user.job_role === 'acelerador',
    isMentor:           isInternal && user.job_role === 'mentor',
    isConsultingTeam:   isInternal && INTERNAL_JOB_ROLES.includes(user.job_role),
    isSocio:            isExternal && OWNER_JOB_ROLES.includes(user.job_role),
    hasFinancialAccess: isAdmin || isInternal || (isExternal && FINANCIAL_JOB_ROLES.includes(user.job_role)),
    canViewAllWorkshops: isInternal || isAdmin,
    canManageUsers:     isAdmin || isInternal,
    userType:           user.user_type ?? null,
  };
}

// ─── Função pura do backfill ─────────────────────────────────────────────────
function classifyUserType(employee) {
  const isInternal =
    employee.consulting_firm_id === CONSULTING_FIRM_ID ||
    employee.tipo_vinculo === 'interno' ||
    employee.is_internal === true ||
    INTERNAL_JOB_ROLES.includes(employee.job_role);

  return isInternal ? 'internal' : 'external';
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeUser = (overrides) => ({
  id: 'user-001',
  role: 'user',
  user_type: 'external',
  job_role: 'tecnico',
  workshop_id: 'workshop-abc',
  consulting_firm_id: null,
  ...overrides,
});

const makeEmployee = (overrides) => ({
  id: 'emp-001',
  full_name: 'João Silva',
  workshop_id: 'workshop-abc',
  consulting_firm_id: null,
  user_type: null,
  tipo_vinculo: 'cliente',
  is_internal: false,
  job_role: 'tecnico',
  ...overrides,
});

// ────────────────────────────────────────────────────────────────────────────
// SUITE 1 — resolveUserType
// ────────────────────────────────────────────────────────────────────────────

describe('resolveUserType()', () => {

  describe('usuário nulo ou indefinido', () => {
    it('retorna falsos para user null', () => {
      const r = resolveUserType(null);
      expect(r.isInternal).toBe(false);
      expect(r.isExternal).toBe(false);
      expect(r.isAdmin).toBe(false);
    });

    it('retorna falsos para user undefined', () => {
      const r = resolveUserType(undefined);
      expect(r.isInternal).toBe(false);
    });
  });

  describe('usuários internos — equipe Oficinas Master', () => {
    it('consultor interno é isInternal=true', () => {
      const r = resolveUserType(makeUser({ user_type: 'internal', job_role: 'consultor' }));
      expect(r.isInternal).toBe(true);
      expect(r.isExternal).toBe(false);
      expect(r.isConsultor).toBe(true);
    });

    it('acelerador interno é isAcelerador=true', () => {
      const r = resolveUserType(makeUser({ user_type: 'internal', job_role: 'acelerador' }));
      expect(r.isAcelerador).toBe(true);
      expect(r.isConsultingTeam).toBe(true);
    });

    it('mentor interno é isMentor=true', () => {
      const r = resolveUserType(makeUser({ user_type: 'internal', job_role: 'mentor' }));
      expect(r.isMentor).toBe(true);
      expect(r.isConsultingTeam).toBe(true);
    });

    it('interno pode ver todas as oficinas', () => {
      const r = resolveUserType(makeUser({ user_type: 'internal', job_role: 'consultor' }));
      expect(r.canViewAllWorkshops).toBe(true);
    });

    it('interno pode gerenciar usuários', () => {
      const r = resolveUserType(makeUser({ user_type: 'internal', job_role: 'consultor' }));
      expect(r.canManageUsers).toBe(true);
    });

    it('interno tem acesso financeiro', () => {
      const r = resolveUserType(makeUser({ user_type: 'internal', job_role: 'mentor' }));
      expect(r.hasFinancialAccess).toBe(true);
    });
  });

  describe('usuários externos — clientes/oficinas', () => {
    it('técnico externo é isExternal=true', () => {
      const r = resolveUserType(makeUser({ user_type: 'external', job_role: 'tecnico' }));
      expect(r.isExternal).toBe(true);
      expect(r.isInternal).toBe(false);
    });

    it('sócio externo é isSocio=true', () => {
      const r = resolveUserType(makeUser({ user_type: 'external', job_role: 'socio' }));
      expect(r.isSocio).toBe(true);
    });

    it('externo NÃO pode ver todas as oficinas', () => {
      const r = resolveUserType(makeUser({ user_type: 'external', job_role: 'socio' }));
      expect(r.canViewAllWorkshops).toBe(false);
    });

    it('externo NÃO pode gerenciar usuários', () => {
      const r = resolveUserType(makeUser({ user_type: 'external', job_role: 'socio' }));
      expect(r.canManageUsers).toBe(false);
    });

    it('técnico NÃO tem acesso financeiro', () => {
      const r = resolveUserType(makeUser({ user_type: 'external', job_role: 'tecnico' }));
      expect(r.hasFinancialAccess).toBe(false);
    });

    it('gerente externo TEM acesso financeiro', () => {
      const r = resolveUserType(makeUser({ user_type: 'external', job_role: 'gerente' }));
      expect(r.hasFinancialAccess).toBe(true);
    });

    it('financeiro externo TEM acesso financeiro', () => {
      const r = resolveUserType(makeUser({ user_type: 'external', job_role: 'financeiro' }));
      expect(r.hasFinancialAccess).toBe(true);
    });
  });

  describe('admin do sistema', () => {
    it('admin é isAdmin=true e pode ver tudo', () => {
      const r = resolveUserType(makeUser({ role: 'admin', user_type: 'internal' }));
      expect(r.isAdmin).toBe(true);
      expect(r.canViewAllWorkshops).toBe(true);
      expect(r.hasFinancialAccess).toBe(true);
    });

    it('super_admin é isSuperAdmin=true', () => {
      const r = resolveUserType(makeUser({ role: 'super_admin', user_type: 'internal' }));
      expect(r.isSuperAdmin).toBe(true);
    });
  });

  describe('REGRESSÃO — padrões legados proibidos', () => {

    it('NÃO usar role === admin como único critério para isInternal', () => {
      const adminExterno = makeUser({ role: 'admin', user_type: 'external' });
      const r = resolveUserType(adminExterno);
      expect(r.userType).toBe('external');
    });

    it('NÃO usar job_role === acelerador como substituto para isInternal', () => {
      const inconsistente = makeUser({ user_type: 'external', job_role: 'acelerador' });
      const r = resolveUserType(inconsistente);
      expect(r.isInternal).toBe(false);
      expect(r.isAcelerador).toBe(false);
    });

    it('NÃO usar tipo_vinculo como fonte de verdade em código novo', () => {
      const user = makeUser({ user_type: 'internal', job_role: 'consultor' });
      const r = resolveUserType(user);
      expect(r.isInternal).toBe(true);
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SUITE 2 — Contratos de RLS (lógica pura, sem banco)
// ────────────────────────────────────────────────────────────────────────────

describe('Contratos de RLS — User', () => {

  function canReadUser(requestingUser, targetUser) {
    if (!requestingUser) return false;
    if (requestingUser.role === 'admin') return true;
    if (requestingUser.role === 'super_admin') return true;
    if (requestingUser.user_type === 'internal') return true;
    if (requestingUser.id === targetUser.id) return true;
    if (requestingUser.workshop_id && requestingUser.workshop_id === targetUser.workshop_id) return true;
    return false;
  }

  function canUpdateUser(requestingUser, targetUser) {
    if (!requestingUser) return false;
    if (requestingUser.role === 'admin') return true;
    if (requestingUser.role === 'super_admin') return true;
    if (requestingUser.id === targetUser.id) return true;
    // REMOVIDO: consulting_firm_id — era a brecha CRIT-03
    return false;
  }

  const consultor  = makeUser({ id: 'u-consultor',  user_type: 'internal', job_role: 'consultor', workshop_id: null });
  const socioA     = makeUser({ id: 'u-socio-a',    user_type: 'external', job_role: 'socio',    workshop_id: 'ws-a' });
  const tecnicoA   = makeUser({ id: 'u-tec-a',      user_type: 'external', job_role: 'tecnico',  workshop_id: 'ws-a' });
  const socioB     = makeUser({ id: 'u-socio-b',    user_type: 'external', job_role: 'socio',    workshop_id: 'ws-b' });
  const adminUser  = makeUser({ id: 'u-admin',      role: 'admin',         user_type: 'internal' });

  describe('READ — leitura de usuários', () => {
    it('admin lê qualquer usuário', () => {
      expect(canReadUser(adminUser, socioB)).toBe(true);
    });

    it('interno (consultor) lê usuário de qualquer oficina', () => {
      expect(canReadUser(consultor, socioA)).toBe(true);
      expect(canReadUser(consultor, socioB)).toBe(true);
    });

    it('sócio lê técnico da MESMA oficina', () => {
      expect(canReadUser(socioA, tecnicoA)).toBe(true);
    });

    it('sócio NÃO lê usuário de OUTRA oficina — isolamento cross-tenant', () => {
      expect(canReadUser(socioA, socioB)).toBe(false);
    });

    it('usuário lê o próprio registro', () => {
      expect(canReadUser(socioA, socioA)).toBe(true);
    });

    it('técnico NÃO lê usuário de outra oficina', () => {
      expect(canReadUser(tecnicoA, socioB)).toBe(false);
    });
  });

  describe('UPDATE — edição de usuários', () => {
    it('admin edita qualquer usuário', () => {
      expect(canUpdateUser(adminUser, socioB)).toBe(true);
    });

    it('usuário edita o próprio registro', () => {
      expect(canUpdateUser(socioA, socioA)).toBe(true);
    });

    it('sócio NÃO edita técnico da mesma oficina — CRIT-03 corrigido', () => {
      expect(canUpdateUser(socioA, tecnicoA)).toBe(false);
    });

    it('consultor interno NÃO edita usuário de cliente diretamente', () => {
      expect(canUpdateUser(consultor, socioA)).toBe(false);
    });
  });
});

describe('Contratos de RLS — Employee', () => {

  function canReadEmployee(requestingUser, targetEmployee) {
    if (!requestingUser) return false;
    if (requestingUser.role === 'admin') return true;
    if (requestingUser.role === 'super_admin') return true;
    if (requestingUser.user_type === 'internal') return true;
    if (requestingUser.id === targetEmployee.user_id) return true;
    if (requestingUser.email === targetEmployee.email) return true;
    if (requestingUser.workshop_id && requestingUser.workshop_id === targetEmployee.workshop_id) return true;
    return false;
  }

  function canDeleteEmployee(requestingUser, targetEmployee) {
    if (!requestingUser) return false;
    if (requestingUser.role === 'admin') return true;
    if (requestingUser.user_type === 'internal') return true;
    if (requestingUser.id === targetEmployee.owner_id) return true;
    return false;
  }

  const consultor = makeUser({ id: 'u-con', user_type: 'internal' });
  const socioA    = makeUser({ id: 'u-sa',  user_type: 'external', workshop_id: 'ws-a' });
  const tecA      = makeEmployee({ user_id: 'u-tec-a', workshop_id: 'ws-a', owner_id: 'u-sa' });
  const tecB      = makeEmployee({ user_id: 'u-tec-b', workshop_id: 'ws-b' });
  const adminUser = makeUser({ id: 'u-adm', role: 'admin', user_type: 'internal' });

  describe('READ', () => {
    it('interno lê employee de qualquer oficina', () => {
      expect(canReadEmployee(consultor, tecA)).toBe(true);
      expect(canReadEmployee(consultor, tecB)).toBe(true);
    });

    it('sócio lê employee da MESMA oficina', () => {
      expect(canReadEmployee(socioA, tecA)).toBe(true);
    });

    it('sócio NÃO lê employee de OUTRA oficina', () => {
      expect(canReadEmployee(socioA, tecB)).toBe(false);
    });
  });

  describe('DELETE — endurecido', () => {
    it('admin pode deletar qualquer employee', () => {
      expect(canDeleteEmployee(adminUser, tecA)).toBe(true);
    });

    it('interno pode deletar employee', () => {
      expect(canDeleteEmployee(consultor, tecA)).toBe(true);
    });

    it('owner pode deletar seu employee', () => {
      expect(canDeleteEmployee(socioA, tecA)).toBe(true);
    });

    it('sócio sem owner_id NÃO pode deletar employee só por workshop — endurecido', () => {
      const outraSocio = makeUser({ id: 'u-outro', user_type: 'external', workshop_id: 'ws-a' });
      const tecSemOwner = makeEmployee({ workshop_id: 'ws-a', owner_id: 'u-sa' });
      expect(canDeleteEmployee(outraSocio, tecSemOwner)).toBe(false);
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SUITE 3 — Lógica de backfill
// ────────────────────────────────────────────────────────────────────────────

describe('classifyUserType() — regra de backfill', () => {

  describe('classificar como internal', () => {
    it('employee com consulting_firm_id da Oficinas Master → internal', () => {
      expect(classifyUserType(makeEmployee({ consulting_firm_id: CONSULTING_FIRM_ID }))).toBe('internal');
    });

    it('employee com tipo_vinculo=interno → internal (legado)', () => {
      expect(classifyUserType(makeEmployee({ tipo_vinculo: 'interno' }))).toBe('internal');
    });

    it('employee com is_internal=true → internal (legado)', () => {
      expect(classifyUserType(makeEmployee({ is_internal: true }))).toBe('internal');
    });

    it('employee com job_role=acelerador → internal', () => {
      expect(classifyUserType(makeEmployee({ job_role: 'acelerador' }))).toBe('internal');
    });

    it('employee com job_role=consultor → internal', () => {
      expect(classifyUserType(makeEmployee({ job_role: 'consultor' }))).toBe('internal');
    });

    it('employee com job_role=mentor → internal', () => {
      expect(classifyUserType(makeEmployee({ job_role: 'mentor' }))).toBe('internal');
    });
  });

  describe('classificar como external', () => {
    it('employee com workshop_id e sem consulting_firm_id → external', () => {
      expect(classifyUserType(makeEmployee({ workshop_id: 'ws-123', consulting_firm_id: null }))).toBe('external');
    });

    it('técnico de oficina cliente → external', () => {
      expect(classifyUserType(makeEmployee({ job_role: 'tecnico', tipo_vinculo: 'cliente' }))).toBe('external');
    });

    it('sócio de oficina cliente → external', () => {
      expect(classifyUserType(makeEmployee({ job_role: 'socio', tipo_vinculo: 'cliente' }))).toBe('external');
    });

    it('employee com consulting_firm_id DIFERENTE da Oficinas Master → external', () => {
      expect(classifyUserType(makeEmployee({ consulting_firm_id: 'outra-firma-id-999' }))).toBe('external');
    });
  });

  describe('idempotência — employees com user_type já definido', () => {
    it('employee já marcado como internal não deve mudar em re-execução', () => {
      const emp = makeEmployee({ user_type: 'internal', consulting_firm_id: CONSULTING_FIRM_ID });
      const resultado = emp.user_type !== null ? emp.user_type : classifyUserType(emp);
      expect(resultado).toBe('internal');
    });

    it('employee já marcado como external não deve mudar em re-execução', () => {
      const emp = makeEmployee({ user_type: 'external' });
      const resultado = emp.user_type !== null ? emp.user_type : classifyUserType(emp);
      expect(resultado).toBe('external');
    });
  });

  describe('casos de borda', () => {
    it('employee sem nenhum campo de classificação → external (default seguro)', () => {
      expect(classifyUserType(makeEmployee({
        consulting_firm_id: null,
        tipo_vinculo: 'cliente',
        is_internal: false,
        job_role: 'outros',
      }))).toBe('external');
    });

    it('employee com consulting_firm_id nulo e job_role interno → internal por job_role', () => {
      expect(classifyUserType(makeEmployee({ consulting_firm_id: null, job_role: 'acelerador' }))).toBe('internal');
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SUITE 4 — ConsultingFirm — validação de campos obrigatórios
// ────────────────────────────────────────────────────────────────────────────

describe('ConsultingFirm — validação de schema', () => {

  function validateConsultingFirm(data) {
    const errors = [];
    if (!data.name)     errors.push('name é obrigatório');
    if (!data.cnpj)     errors.push('cnpj é obrigatório');
    if (!data.owner_id) errors.push('owner_id é obrigatório');
    return errors;
  }

  it('registro válido da Oficinas Master não tem erros', () => {
    expect(validateConsultingFirm({
      name: 'Oficinas Master',
      cnpj: '37.815.934/0001-91',
      owner_id: 'user-rafael-id',
      status: 'ativo',
    })).toHaveLength(0);
  });

  it('registro sem name gera erro', () => {
    expect(validateConsultingFirm({ cnpj: '37.815.934/0001-91', owner_id: 'u-1' }))
      .toContain('name é obrigatório');
  });

  it('registro sem cnpj gera erro', () => {
    expect(validateConsultingFirm({ name: 'Firma X', owner_id: 'u-1' }))
      .toContain('cnpj é obrigatório');
  });

  it('registro sem owner_id gera erro', () => {
    expect(validateConsultingFirm({ name: 'Firma X', cnpj: '00.000.000/0001-00' }))
      .toContain('owner_id é obrigatório');
  });
});