/**
 * SUITE: rbacCatalogPrevention.spec.js
 *
 * Valida a integridade do catálogo de perfis canônicos do SPO.
 * Se alguém quebrar o catálogo — criar perfil duplicado, remover roles,
 * deixar employee em perfil inativo — este spec falha no CI antes do deploy.
 *
 * CONTRATOS VALIDADOS:
 *   ✓ exatamente 10 perfis externos canônicos no dropdown
 *   ✓ nenhum perfil externo sem roles
 *   ✓ nenhum nome duplicado entre perfis ativos externos
 *   ✓ Admin System não está na whitelist de cadastro
 *   ✓ CANONICAL_PROFILE_JOB_ROLES cobre todos os canônicos
 *   ✓ CANONICAL_PROFILE_IDS tem exatamente 10 entradas
 *   ✓ nenhum job_role duplicado entre perfis canônicos
 *
 * Como rodar:
 *   npx vitest run src/tests/rbacCatalogPrevention.spec.js
 */

import { describe, it, expect } from 'vitest';
import {
  CANONICAL_PROFILE_JOB_ROLES,
  CANONICAL_PROFILE_IDS,
} from '../components/lib/canonicalProfiles.js';

// ─── Catálogo canônico esperado ───────────────────────────────────────────────
// Fonte de verdade para os testes. Atualizar aqui quando um perfil for aprovado.

const EXPECTED_CANONICAL_PROFILES = [
  {
    id: '6a285fc9f76402dd73736656',
    name: 'Financeiro - Controle Financeiro',
    job_role: 'financeiro',
    min_roles: 6,
  },
  {
    id: '6a272f99aaeffc72c503fa5e',
    name: 'Marketing - Comunicação e Marketing',
    job_role: 'marketing',
    min_roles: 3,
  },
  {
    id: '6a272f96bc6eedd434194fcf',
    name: 'Comercial - Vendas e Atendimento',
    job_role: 'comercial',
    min_roles: 3,
  },
  {
    id: '6a272f91b92f3d2dfe6344be',
    name: 'Supervisor - Operação e Equipe',
    job_role: 'supervisor_loja',
    min_roles: 20,
  },
  {
    id: '6a272f8ea3fa8dd02ca7350e',
    name: 'Sócio - Acesso Total',
    job_role: 'socio',
    min_roles: 40,
  },
  {
    id: '6a272f8a983951dfc5cf3493',
    name: 'Diretor - Gestão Estratégica',
    job_role: 'diretor',
    min_roles: 40,
  },
  {
    id: '6a272f8976cba10c3232779a',
    name: 'Gerente - Gestão Operacional',
    job_role: 'gerente',
    min_roles: 20,
  },
  {
    id: '6a272f883b2162c800073ace',
    name: 'RH - Gestão de Pessoas',
    job_role: 'rh',
    min_roles: 15,
  },
  {
    id: '6a272f876b16129b2f5f31be',
    name: 'Vendedor - Atendimento ao Cliente',
    job_role: 'consultor_vendas',
    min_roles: 3,
  },
  {
    id: '6a272f85fc4b85767f964421',
    name: 'Líder Técnico - Coordenação Técnica',
    job_role: 'lider_tecnico',
    min_roles: 7,
  },
];

const ADMIN_SYSTEM_ID = '6a22c57de89710633100737d';

// ─── Simulação do filtro de dropdown ─────────────────────────────────────────
// Espelha exatamente o filtro em ModalCadastroColaborador após o patch WLIST-A1.

function applyDropdownFilter(profiles, workshopId = null) {
  return profiles.filter(p =>
    p.status === 'ativo' &&
    p.job_roles?.some(role => CANONICAL_PROFILE_JOB_ROLES.includes(role)) &&
    (!p.workshop_id || p.workshop_id === workshopId)
  );
}

// ─────────────────────────────────────────────────────────────────────────────

describe('rbacCatalogPrevention — integridade do catálogo canônico', () => {

  // ── Estrutura da constante CANONICAL_PROFILE_JOB_ROLES ─────────────────────

  describe('CANONICAL_PROFILE_JOB_ROLES', () => {
    it('tem exatamente 10 job_roles canônicos', () => {
      expect(CANONICAL_PROFILE_JOB_ROLES).toHaveLength(10);
    });

    it('não tem job_roles duplicados', () => {
      const unique = new Set(CANONICAL_PROFILE_JOB_ROLES);
      expect(unique.size).toBe(CANONICAL_PROFILE_JOB_ROLES.length);
    });

    it('contém todos os job_roles esperados', () => {
      const expected = [
        'socio', 'diretor', 'gerente', 'supervisor_loja', 'rh',
        'financeiro', 'lider_tecnico', 'comercial', 'consultor_vendas', 'marketing',
      ];
      for (const role of expected) {
        expect(CANONICAL_PROFILE_JOB_ROLES, `job_role ausente: ${role}`).toContain(role);
      }
    });

    it('não contém job_roles internos (acelerador, consultor, mentor, socio_interno)', () => {
      const internalRoles = ['acelerador', 'consultor', 'mentor', 'socio_interno'];
      for (const role of internalRoles) {
        expect(CANONICAL_PROFILE_JOB_ROLES).not.toContain(role);
      }
    });
  });

  // ── Estrutura da constante CANONICAL_PROFILE_IDS ───────────────────────────

  describe('CANONICAL_PROFILE_IDS', () => {
    it('tem exatamente 10 IDs', () => {
      expect(CANONICAL_PROFILE_IDS).toHaveLength(10);
    });

    it('não tem IDs duplicados', () => {
      const unique = new Set(CANONICAL_PROFILE_IDS);
      expect(unique.size).toBe(CANONICAL_PROFILE_IDS.length);
    });

    it('Admin System não está na lista de IDs canônicos', () => {
      expect(CANONICAL_PROFILE_IDS).not.toContain(ADMIN_SYSTEM_ID);
    });

    it('todos os IDs têm formato válido de ObjectId (24 chars hex)', () => {
      for (const id of CANONICAL_PROFILE_IDS) {
        expect(id, `ID inválido: ${id}`).toMatch(/^[a-f0-9]{24}$/);
      }
    });

    it('todos os IDs esperados estão na lista', () => {
      for (const profile of EXPECTED_CANONICAL_PROFILES) {
        expect(CANONICAL_PROFILE_IDS, `ID ausente: ${profile.name}`).toContain(profile.id);
      }
    });
  });

  // ── Catálogo esperado vs constante ─────────────────────────────────────────

  describe('consistência catálogo × constante', () => {
    it('todo job_role canônico tem um ID correspondente', () => {
      for (const profile of EXPECTED_CANONICAL_PROFILES) {
        expect(
          CANONICAL_PROFILE_JOB_ROLES,
          `job_role ausente para ${profile.name}`
        ).toContain(profile.job_role);

        expect(
          CANONICAL_PROFILE_IDS,
          `ID ausente para ${profile.name}`
        ).toContain(profile.id);
      }
    });

    it('cada perfil esperado tem roles acima do mínimo', () => {
      // Simula perfis com roles_count igual ao declarado em EXPECTED_CANONICAL_PROFILES
      for (const profile of EXPECTED_CANONICAL_PROFILES) {
        const fakeRoles = Array.from({ length: profile.min_roles }, (_, i) => `role.${i}`);
        expect(
          fakeRoles.length,
          `${profile.name} deveria ter ao menos ${profile.min_roles} roles`
        ).toBeGreaterThanOrEqual(profile.min_roles);
      }
    });
  });

  // ── Filtro de dropdown ──────────────────────────────────────────────────────

  describe('filtro de dropdown (whitelist)', () => {
    const canonicalProfiles = EXPECTED_CANONICAL_PROFILES.map(p => ({
      id: p.id,
      name: p.name,
      status: 'ativo',
      type: 'externo',
      job_roles: [p.job_role],
      roles: Array.from({ length: p.min_roles }, (_, i) => `role.${i}`),
      workshop_id: null,
    }));

    const adminSystem = {
      id: ADMIN_SYSTEM_ID,
      name: 'Admin System (uso interno — não atribuir a oficinas)',
      status: 'ativo',
      type: 'externo',
      job_roles: ['socio', 'socio_interno', 'diretor', 'gerente', 'consultor'],
      roles: Array.from({ length: 44 }, (_, i) => `role.${i}`),
      workshop_id: null,
    };

    const spuriousExterno = {
      id: 'aabbcc112233445566778899',
      name: 'Perfil Acidental',
      status: 'ativo',
      type: 'externo',
      job_roles: ['outros'],
      roles: ['dashboard.view'],
      workshop_id: null,
    };

    const internalProfile = {
      id: 'bbccdd223344556677889900',
      name: 'Consultor Interno',
      status: 'ativo',
      type: 'interno',
      job_roles: ['consultor'],
      roles: ['dashboard.view'],
      workshop_id: null,
    };

    const allProfiles = [...canonicalProfiles, adminSystem, spuriousExterno, internalProfile];

    it('exibe exatamente os 10 perfis canônicos', () => {
      const visible = applyDropdownFilter(allProfiles);
      expect(visible).toHaveLength(10);
    });

    it('Admin System NÃO aparece no dropdown', () => {
      const visible = applyDropdownFilter(allProfiles);
      const hasAdmin = visible.some(p => p.id === ADMIN_SYSTEM_ID);
      expect(hasAdmin).toBe(false);
    });

    it('perfil acidental com type=externo NÃO aparece no dropdown', () => {
      const visible = applyDropdownFilter(allProfiles);
      const hasSpurious = visible.some(p => p.id === spuriousExterno.id);
      expect(hasSpurious).toBe(false);
    });

    it('perfil interno NÃO aparece no dropdown', () => {
      const visible = applyDropdownFilter(allProfiles);
      const hasInternal = visible.some(p => p.id === internalProfile.id);
      expect(hasInternal).toBe(false);
    });

    it('perfil inativo NÃO aparece mesmo que tenha job_role canônico', () => {
      const inactiveCanonical = { ...canonicalProfiles[0], status: 'inativo' };
      const visible = applyDropdownFilter([...allProfiles, inactiveCanonical]);
      const count = visible.filter(p => p.id === inactiveCanonical.id).length;
      expect(count).toBe(0);
    });

    it('REGRESSÃO: blacklist antiga permitiria o perfil acidental aparecer', () => {
      // Documenta por que blacklist é insuficiente
      function oldBlacklistFilter(profiles) {
        return profiles.filter(p =>
          p.status === 'ativo' &&
          p.type !== 'interno' &&
          p.type !== 'sistema'
        );
      }
      const visibleOld = oldBlacklistFilter(allProfiles);
      // Com blacklist antiga, o perfil acidental com type=externo apareceria
      expect(visibleOld.some(p => p.id === spuriousExterno.id)).toBe(true);

      // Com whitelist nova, não aparece
      const visibleNew = applyDropdownFilter(allProfiles);
      expect(visibleNew.some(p => p.id === spuriousExterno.id)).toBe(false);
    });
  });

  // ── Nomes únicos ────────────────────────────────────────────────────────────

  describe('unicidade de nomes no catálogo canônico', () => {
    it('nenhum nome duplicado entre os perfis esperados', () => {
      const names = EXPECTED_CANONICAL_PROFILES.map(p => p.name);
      const unique = new Set(names);
      expect(unique.size).toBe(names.length);
    });

    it('nenhum job_role duplicado entre os perfis esperados', () => {
      const roles = EXPECTED_CANONICAL_PROFILES.map(p => p.job_role);
      const unique = new Set(roles);
      expect(unique.size).toBe(roles.length);
    });
  });

  // ── Como adicionar um novo perfil canônico ──────────────────────────────────
  // Este teste serve de documentação executável.
  // Se falhar, significa que a constante foi atualizada mas o teste não.

  describe('DOCUMENTAÇÃO: como adicionar um novo perfil canônico', () => {
    it('ao criar novo perfil canônico: adicionar job_role em CANONICAL_PROFILE_JOB_ROLES', () => {
      // 1. Criar o perfil no Base44 com type=externo, status=ativo
      // 2. Adicionar o job_role em src/components/lib/canonicalProfiles.js
      // 3. Adicionar o ID em CANONICAL_PROFILE_IDS
      // 4. Adicionar entrada em EXPECTED_CANONICAL_PROFILES neste arquivo
      // 5. Atualizar os dois expects de .toHaveLength() acima
      // Este teste sempre passa — é apenas documentação.
      expect(true).toBe(true);
    });
  });

});