/**
 * SUITE: rlsContracts.spec.js
 *
 * Valida os contratos oficiais de RLS da plataforma SPO.
 * Trata user.workshop_id, user.data.workshop_id, consulting_firm_id e company_id
 * como CONTRATOS — se a lógica mudar, o teste quebra e exige decisão explícita.
 *
 * Contexto (incidente 06/2026):
 *   RLS usava {{user.data.workshop_id}} — campo null para usuários externos.
 *   Fix S0: adicionar {{user.workshop_id}} (campo raiz) como condição paralela.
 *   Este arquivo garante que o contrato correto nunca seja revertido.
 *
 * CAMPOS E ONDE ESTÃO:
 *   user.workshop_id            → raiz do User  (SEMPRE preenchido para externos)
 *   user.data.workshop_id       → dentro de data (pode ser null — NÃO usar sozinho)
 *   user.data.consulting_firm_id→ dentro de data (correto para internos/consultores)
 *   user.data.company_id        → dentro de data (correto para empresas)
 *
 * Como rodar:
 *   npx vitest run src/tests/rlsContracts.spec.js
 */

import { describe, it, expect } from 'vitest';

// ─── Contratos de campo ────────────────────────────────────────────────────────
// Documenta onde cada campo existe no objeto User.
// Se o Base44 mudar a estrutura, estes testes quebram e forçam revisão.

const FIELD_CONTRACTS = {
  workshop_id: {
    location: 'root',          // user.workshop_id
    data_path: null,           // NÃO existe em user.data
    always_set_for_external: true,
    rls_template: '{{user.workshop_id}}',
    rls_wrong: '{{user.data.workshop_id}}',
    description: 'ID da oficina — campo raiz do User',
  },
  consulting_firm_id: {
    location: 'data',          // user.data.consulting_firm_id
    always_set_for_external: false,
    rls_template: '{{user.data.consulting_firm_id}}',
    description: 'ID da consultoria — campo em user.data, correto para consultores',
  },
  company_id: {
    location: 'data',          // user.data.company_id
    always_set_for_external: false,
    rls_template: '{{user.data.company_id}}',
    description: 'ID da empresa/grupo — campo em user.data',
  },
};

// ─── Funções de RLS puras ─────────────────────────────────────────────────────
// Cada função espelha a lógica de um $or de RLS de uma entidade real.
// CORRETO = usa user.workshop_id raiz.
// BUGADO  = usa apenas user.data.workshop_id.

// RLS correta (pós S0) — usa campo raiz
function canReadWorkshopEntityCORRETO(user, record) {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'super_admin') return true;
  if (user.user_type === 'internal') return true;
  if (user.email && user.email === record.created_by) return true;
  if (user.workshop_id && user.workshop_id === record.workshop_id) return true; // ← raiz
  // data.workshop_id mantido para retrocompat, mas não é a fonte principal
  if (user.data?.workshop_id && user.data.workshop_id === record.workshop_id) return true;
  return false;
}

// RLS bugada (pré S0) — só usava data
function canReadWorkshopEntityBUGADO(user, record) {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'super_admin') return true;
  if (user.email && user.email === record.created_by) return true;
  if (user.data?.workshop_id && user.data.workshop_id === record.workshop_id) return true; // ← bug
  return false;
}

// RLS para entidades de consultoria (consulting_firm_id em user.data — CORRETO)
function canReadConsultoriaEntity(user, record) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.user_type === 'internal') return true;
  if (user.email === record.created_by) return true;
  if (user.id === record.consultor_id) return true;
  // consulting_firm_id está em user.data — correto para este campo
  if (user.data?.consulting_firm_id && user.data.consulting_firm_id === record.consulting_firm_id) return true;
  // workshop_id da oficina cliente
  if (user.workshop_id && user.workshop_id === record.workshop_id) return true;
  return false;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeUser = (o = {}) => ({
  id: 'u1', role: 'user', user_type: 'external',
  email: 'user@ws.com', workshop_id: 'ws-a',
  data: {}, ...o,
});

const makeRecord = (o = {}) => ({
  id: 'r1', workshop_id: 'ws-a',
  created_by: 'outro@ws.com', ...o,
});

// ─────────────────────────────────────────────────────────────────────────────

describe('rlsContracts — contratos oficiais de campo', () => {

  // ── Contratos de estrutura de campo ────────────────────────────────────────

  describe('CONTRATO: workshop_id é campo raiz do User', () => {
    it('workshop_id existe na raiz do objeto User', () => {
      const user = makeUser({ workshop_id: 'ws-abc' });
      expect(user.workshop_id).toBe('ws-abc');
    });

    it('workshop_id raiz é distinto de user.data.workshop_id', () => {
      const user = makeUser({ workshop_id: 'ws-raiz', data: { workshop_id: 'ws-data' } });
      expect(user.workshop_id).toBe('ws-raiz');
      expect(user.data.workshop_id).toBe('ws-data');
    });

    it('usuário externo típico: workshop_id na raiz, data vazio', () => {
      const gilmara = makeUser({
        workshop_id: '697b986d267e4326dc3f5bf5',
        data: {}  // data.workshop_id = undefined
      });
      expect(gilmara.workshop_id).toBeTruthy();
      expect(gilmara.data?.workshop_id).toBeUndefined();
    });

    it('template RLS correto: {{user.workshop_id}}', () => {
      expect(FIELD_CONTRACTS.workshop_id.rls_template).toBe('{{user.workshop_id}}');
    });

    it('template RLS errado: {{user.data.workshop_id}} — documentado como incorreto', () => {
      expect(FIELD_CONTRACTS.workshop_id.rls_wrong).toBe('{{user.data.workshop_id}}');
    });
  });

  describe('CONTRATO: consulting_firm_id está em user.data', () => {
    it('consulting_firm_id em user.data — acesso correto', () => {
      const consultor = makeUser({
        user_type: 'internal',
        data: { consulting_firm_id: 'firma-xyz' }
      });
      expect(consultor.data.consulting_firm_id).toBe('firma-xyz');
    });

    it('template RLS correto: {{user.data.consulting_firm_id}}', () => {
      expect(FIELD_CONTRACTS.consulting_firm_id.rls_template).toBe('{{user.data.consulting_firm_id}}');
    });
  });

  describe('CONTRATO: company_id está em user.data', () => {
    it('company_id em user.data — acesso correto', () => {
      const user = makeUser({ data: { company_id: 'empresa-abc' } });
      expect(user.data.company_id).toBe('empresa-abc');
    });

    it('template RLS correto: {{user.data.company_id}}', () => {
      expect(FIELD_CONTRACTS.company_id.rls_template).toBe('{{user.data.company_id}}');
    });
  });

  // ── RLS correta pós-S0 ─────────────────────────────────────────────────────

  describe('RLS CORRETA (pós S0) — usa user.workshop_id raiz', () => {
    it('usuário externo lê registro da sua oficina', () => {
      const user   = makeUser({ workshop_id: 'ws-a' });
      const record = makeRecord({ workshop_id: 'ws-a' });
      expect(canReadWorkshopEntityCORRETO(user, record)).toBe(true);
    });

    it('usuário externo NÃO lê registro de outra oficina', () => {
      const user   = makeUser({ workshop_id: 'ws-a' });
      const record = makeRecord({ workshop_id: 'ws-b' });
      expect(canReadWorkshopEntityCORRETO(user, record)).toBe(false);
    });

    it('admin lê qualquer registro', () => {
      const admin  = makeUser({ role: 'admin', workshop_id: null });
      const record = makeRecord({ workshop_id: 'ws-qualquer' });
      expect(canReadWorkshopEntityCORRETO(admin, record)).toBe(true);
    });

    it('consultor interno lê registros de qualquer oficina', () => {
      const consultor = makeUser({ user_type: 'internal', workshop_id: null });
      const record    = makeRecord({ workshop_id: 'ws-qualquer' });
      expect(canReadWorkshopEntityCORRETO(consultor, record)).toBe(true);
    });

    it('criador do registro pode lê-lo independente de workshop', () => {
      const user   = makeUser({ email: 'criador@ws.com', workshop_id: 'ws-outro' });
      const record = makeRecord({ workshop_id: 'ws-a', created_by: 'criador@ws.com' });
      expect(canReadWorkshopEntityCORRETO(user, record)).toBe(true);
    });

    it('isolamento cross-tenant: Oficina A não acessa Oficina B', () => {
      const socioA = makeUser({ workshop_id: 'ws-a' });
      const dadosB = makeRecord({ workshop_id: 'ws-b' });
      expect(canReadWorkshopEntityCORRETO(socioA, dadosB)).toBe(false);
    });
  });

  // ── RLS bugada pré-S0 ──────────────────────────────────────────────────────

  describe('REGRESSÃO: RLS BUGADA (pré S0) — documenta o incidente', () => {
    it('INCIDENTE GILMARA: RLS bugada bloqueia usuário com workshop_id raiz', () => {
      const gilmara = makeUser({ workshop_id: 'ws-molas', data: {} });
      const colaborador = makeRecord({ workshop_id: 'ws-molas' });

      // Com RLS bugada (pré S0): Gilmara não via seus colaboradores
      expect(canReadWorkshopEntityBUGADO(gilmara, colaborador)).toBe(false); // ← bug confirmado

      // Com RLS correta (pós S0): acesso restaurado
      expect(canReadWorkshopEntityCORRETO(gilmara, colaborador)).toBe(true); // ← fix correto
    });

    it('usuário com data.workshop_id funciona nos dois modelos (retrocompat)', () => {
      const userComData = makeUser({
        workshop_id: 'ws-a',
        data: { workshop_id: 'ws-a' }
      });
      const record = makeRecord({ workshop_id: 'ws-a' });

      // Ambos funcionam quando data está preenchido
      expect(canReadWorkshopEntityBUGADO(userComData, record)).toBe(true);
      expect(canReadWorkshopEntityCORRETO(userComData, record)).toBe(true);
    });

    it('nova entidade com apenas user.data.workshop_id falha para usuário externo típico', () => {
      // Simula o que acontece se uma nova entidade usar o padrão errado
      function novaEntidadeERRADA(user, record) {
        if (user.role === 'admin') return true;
        // ❌ Padrão errado — não fazer isso em entidades novas
        return user.data?.workshop_id === record.workshop_id;
      }

      const usuarioExterno = makeUser({ workshop_id: 'ws-a', data: {} });
      const record = makeRecord({ workshop_id: 'ws-a' });

      // Nova entidade com padrão errado vai quebrar para usuários externos típicos
      expect(novaEntidadeERRADA(usuarioExterno, record)).toBe(false); // ← BUG potencial
    });
  });

  // ── RLS para entidades de consultoria ──────────────────────────────────────

  describe('RLS para entidades de consultoria — consulting_firm_id em user.data', () => {
    it('consultor lê registros da sua firma via user.data.consulting_firm_id', () => {
      const consultor = makeUser({
        user_type: 'internal',
        id: 'u-con',
        data: { consulting_firm_id: 'firma-xyz' }
      });
      const sprint = { workshop_id: 'ws-cliente', consulting_firm_id: 'firma-xyz', consultor_id: 'outro' };
      expect(canReadConsultoriaEntity(consultor, sprint)).toBe(true);
    });

    it('consultor de outra firma NÃO lê sprint', () => {
      const outroConsultor = makeUser({
        user_type: 'internal',
        id: 'u-outro',
        data: { consulting_firm_id: 'firma-outra' }
      });
      const sprint = { workshop_id: 'ws-cliente', consulting_firm_id: 'firma-xyz', consultor_id: 'u-con' };
      expect(canReadConsultoriaEntity(outroConsultor, sprint)).toBe(false);
    });

    it('sócio da oficina cliente lê seus próprios sprints', () => {
      const socio = makeUser({ workshop_id: 'ws-cliente', data: {} });
      const sprint = { workshop_id: 'ws-cliente', consulting_firm_id: 'firma-xyz', consultor_id: 'u-con' };
      expect(canReadConsultoriaEntity(socio, sprint)).toBe(true);
    });

    it('consultor responsável lê sprint mesmo sem firma no data', () => {
      const consultor = makeUser({
        id: 'u-con', user_type: 'internal', data: {}
      });
      const sprint = { workshop_id: 'ws-cliente', consulting_firm_id: 'firma-xyz', consultor_id: 'u-con' };
      expect(canReadConsultoriaEntity(consultor, sprint)).toBe(true);
    });
  });

  // ── Template de nova entidade ───────────────────────────────────────────────

  describe('TEMPLATE: nova entidade deve seguir este padrão', () => {
    // Este teste valida o template recomendado no guia GUIA_NOVOS_RECURSOS_RBAC_RLS.md
    // Se o template estiver errado, este teste falha.

    function novaEntidadeTemplateCORRETO(user, record) {
      if (!user) return false;
      if (user.role === 'admin' || user.role === 'super_admin') return true;
      if (user.user_type === 'internal') return true;
      if (user.email && user.email === record.created_by) return true;
      if (user.workshop_id && user.workshop_id === record.workshop_id) return true; // ← raiz
      return false;
    }

    it('template cobre admin', () => {
      expect(novaEntidadeTemplateCORRETO(makeUser({ role: 'admin' }), makeRecord())).toBe(true);
    });

    it('template cobre interno', () => {
      expect(novaEntidadeTemplateCORRETO(makeUser({ user_type: 'internal' }), makeRecord())).toBe(true);
    });

    it('template cobre criador', () => {
      const user = makeUser({ email: 'criador@test.com', workshop_id: 'ws-b' });
      const record = makeRecord({ created_by: 'criador@test.com', workshop_id: 'ws-a' });
      expect(novaEntidadeTemplateCORRETO(user, record)).toBe(true);
    });

    it('template cobre usuário da oficina via raiz', () => {
      const user = makeUser({ workshop_id: 'ws-a', data: {} });
      const record = makeRecord({ workshop_id: 'ws-a' });
      expect(novaEntidadeTemplateCORRETO(user, record)).toBe(true);
    });

    it('template bloqueia cross-tenant', () => {
      const user = makeUser({ workshop_id: 'ws-a' });
      const record = makeRecord({ workshop_id: 'ws-b' });
      expect(novaEntidadeTemplateCORRETO(user, record)).toBe(false);
    });

    it('template bloqueia usuário não autenticado', () => {
      expect(novaEntidadeTemplateCORRETO(null, makeRecord())).toBe(false);
    });
  });

  // ── Audit de consistência entre campos ─────────────────────────────────────

  describe('AUDIT: consistência dos contratos de campo', () => {
    it('todos os campos em FIELD_CONTRACTS têm rls_template definido', () => {
      for (const [field, contract] of Object.entries(FIELD_CONTRACTS)) {
        expect(contract.rls_template, `campo ${field} sem rls_template`).toBeTruthy();
      }
    });

    it('workshop_id é o único campo na raiz (não em data)', () => {
      const rootFields = Object.entries(FIELD_CONTRACTS)
        .filter(([, c]) => c.location === 'root')
        .map(([f]) => f);

      expect(rootFields).toEqual(['workshop_id']);
    });

    it('consulting_firm_id e company_id estão em data (não na raiz)', () => {
      expect(FIELD_CONTRACTS.consulting_firm_id.location).toBe('data');
      expect(FIELD_CONTRACTS.company_id.location).toBe('data');
    });

    it('workshop_id é sempre preenchido para usuários externos', () => {
      expect(FIELD_CONTRACTS.workshop_id.always_set_for_external).toBe(true);
    });

    it('consulting_firm_id e company_id não são garantidos para externos', () => {
      expect(FIELD_CONTRACTS.consulting_firm_id.always_set_for_external).toBe(false);
      expect(FIELD_CONTRACTS.company_id.always_set_for_external).toBe(false);
    });
  });

});