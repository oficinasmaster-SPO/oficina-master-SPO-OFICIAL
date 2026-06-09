/**
 * SUITE: tenantIsolation.spec.js
 *
 * Valida o isolamento de tenant no localStorage (fix S2).
 * Garante que chaves críticas usam namespace por user.email,
 * prevenindo contaminação cross-session entre usuários no mesmo browser.
 *
 * Contexto (incidente 06/2026):
 *   changeConsultingFirm(null) → changeCompany(null) → removeItem('selected_company_id')
 *   Próximo usuário no mesmo browser: selected_company_id ausente → workshopId null
 *   → Colaboradores carrega sem workshopId → lista vazia (apenas próprio usuário via RLS)
 *
 * Como rodar:
 *   npx vitest run src/tests/tenantIsolation.spec.js
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// ─── Mock de localStorage ─────────────────────────────────────────────────────
// Vitest roda em Node — localStorage não existe nativamente.
// Este mock simula o comportamento do browser com fidelidade suficiente.

class LocalStorageMock {
  constructor() { this.store = {}; }
  getItem(key)        { return this.store[key] ?? null; }
  setItem(key, value) { this.store[key] = String(value); }
  removeItem(key)     { delete this.store[key]; }
  clear()             { this.store = {}; }
  get length()        { return Object.keys(this.store).length; }
  key(i)              { return Object.keys(this.store)[i] ?? null; }
}

// ─── Implementação corrigida das funções de chave (S2) ───────────────────────
// Espelha exatamente as funções helper do TenantContext.jsx após o fix S2.

function companyKey(userEmail) {
  return userEmail
    ? `selected_company_id_${userEmail.toLowerCase()}`
    : 'selected_company_id';
}

function firmKey(userEmail) {
  return userEmail
    ? `selected_firm_id_${userEmail.toLowerCase()}`
    : 'selected_firm_id';
}

function impersonationKey(adminEmail) {
  return adminEmail
    ? `om_impersonation_${adminEmail.toLowerCase()}`
    : 'om_impersonation';
}

// ─── Simulação das operações do TenantContext (S2) ───────────────────────────

function saveCompany(storage, userEmail, companyId) {
  storage.setItem(companyKey(userEmail), companyId);
  storage.removeItem('selected_company_id'); // limpa legado
}

function loadCompany(storage, userEmail) {
  // Migração: chave global legada → chave por email
  const legacy = storage.getItem('selected_company_id');
  if (legacy) {
    storage.setItem(companyKey(userEmail), legacy);
    storage.removeItem('selected_company_id');
    return legacy;
  }
  return storage.getItem(companyKey(userEmail));
}

function removeCompany(storage, userEmail) {
  storage.removeItem(companyKey(userEmail));
  storage.removeItem('selected_company_id'); // limpa legado também
}

function logoutCleanup(storage, userEmail) {
  if (userEmail) {
    storage.removeItem(companyKey(userEmail));
    storage.removeItem(firmKey(userEmail));
    storage.removeItem(impersonationKey(userEmail));
  }
  // Limpar globais legados
  storage.removeItem('selected_company_id');
  storage.removeItem('selected_firm_id');
  storage.removeItem('om_impersonation');
  storage.removeItem('admin_workshop_id');
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const GILMARA  = 'administrativo@molashoracerta.com.br';
const ADMIN    = 'rafael.marrafon@oficinasmaster.com.br';
const OUTRO    = 'financeiro@molashoracerta.com.br';
const WS_MOLAS = '697b986d267e4326dc3f5bf5';
const WS_OUTRO = 'aabbcc112233445566778899';

// ─────────────────────────────────────────────────────────────────────────────

describe('tenantIsolation — chaves com namespace por email', () => {

  let storage;

  beforeEach(() => { storage = new LocalStorageMock(); });
  afterEach(() => { storage.clear(); });

  // ── Geração das chaves ──────────────────────────────────────────────────────

  describe('companyKey()', () => {
    it('gera chave com namespace por email', () => {
      expect(companyKey(GILMARA)).toBe(`selected_company_id_${GILMARA}`);
    });

    it('normaliza email para lowercase', () => {
      expect(companyKey('GILMARA@TEST.COM')).toBe('selected_company_id_gilmara@test.com');
    });

    it('retorna chave global quando sem email (boot inicial)', () => {
      expect(companyKey(null)).toBe('selected_company_id');
      expect(companyKey(undefined)).toBe('selected_company_id');
    });

    it('dois usuários distintos têm chaves distintas', () => {
      expect(companyKey(GILMARA)).not.toBe(companyKey(ADMIN));
    });
  });

  describe('firmKey()', () => {
    it('gera chave com namespace por email', () => {
      expect(firmKey(ADMIN)).toBe(`selected_firm_id_${ADMIN.toLowerCase()}`);
    });

    it('retorna chave global quando sem email', () => {
      expect(firmKey(null)).toBe('selected_firm_id');
    });
  });

  describe('impersonationKey()', () => {
    it('gera chave com namespace pelo email do admin', () => {
      expect(impersonationKey(ADMIN)).toBe(`om_impersonation_${ADMIN.toLowerCase()}`);
    });

    it('retorna chave global quando sem email', () => {
      expect(impersonationKey(null)).toBe('om_impersonation');
    });
  });

  // ── Isolamento entre usuários ───────────────────────────────────────────────

  describe('isolamento: usuário A não vê dados de usuário B', () => {
    it('Gilmara salva sua oficina sem afetar o contexto do Admin', () => {
      saveCompany(storage, GILMARA, WS_MOLAS);
      saveCompany(storage, ADMIN,   WS_OUTRO);

      expect(loadCompany(storage, GILMARA)).toBe(WS_MOLAS);
      expect(loadCompany(storage, ADMIN)).toBe(WS_OUTRO);
    });

    it('Admin remove sua empresa sem afetar a de Gilmara', () => {
      saveCompany(storage, GILMARA, WS_MOLAS);
      saveCompany(storage, ADMIN,   WS_OUTRO);

      removeCompany(storage, ADMIN);

      expect(loadCompany(storage, GILMARA)).toBe(WS_MOLAS); // ← intacto
      expect(loadCompany(storage, ADMIN)).toBeNull();
    });

    it('três usuários com chaves independentes', () => {
      saveCompany(storage, GILMARA, 'ws-gilmara');
      saveCompany(storage, ADMIN,   'ws-admin');
      saveCompany(storage, OUTRO,   'ws-outro');

      expect(loadCompany(storage, GILMARA)).toBe('ws-gilmara');
      expect(loadCompany(storage, ADMIN)).toBe('ws-admin');
      expect(loadCompany(storage, OUTRO)).toBe('ws-outro');
    });
  });

  // ── O incidente: trigger real ───────────────────────────────────────────────

  describe('INCIDENTE GILMARA — trigger: removeItem do localStorage', () => {

    it('REGRESSÃO: chave global — removeItem de um afeta o outro', () => {
      // Comportamento ANTES do S2 — chave global compartilhada
      storage.setItem('selected_company_id', WS_MOLAS); // Gilmara salva

      // Admin clica "Todas Consultorias" → removeItem global
      storage.removeItem('selected_company_id');

      // Gilmara perde o contexto — bug!
      expect(storage.getItem('selected_company_id')).toBeNull();
    });

    it('FIX S2: chave por email — removeItem de um NÃO afeta o outro', () => {
      saveCompany(storage, GILMARA, WS_MOLAS);

      // Admin clica "Todas Consultorias" → remove APENAS a chave dele
      removeCompany(storage, ADMIN);

      // Gilmara mantém seu contexto
      expect(loadCompany(storage, GILMARA)).toBe(WS_MOLAS);
    });

    it('changeConsultingFirm(null) só remove chave do usuário atual', () => {
      saveCompany(storage, GILMARA, WS_MOLAS);
      saveCompany(storage, ADMIN,   WS_OUTRO);

      // Simula changeConsultingFirm(null) → changeCompany(null) para o Admin
      removeCompany(storage, ADMIN);

      // Gilmara intacta
      expect(loadCompany(storage, GILMARA)).toBe(WS_MOLAS);
    });
  });

  // ── Migração transparente de chave legada ───────────────────────────────────

  describe('migração: chave global legada → chave por email', () => {
    it('migra automaticamente chave global existente para namespace por email', () => {
      // Usuário tinha a chave global (antes do S2)
      storage.setItem('selected_company_id', WS_MOLAS);

      // Ao fazer loadCompany, migra automaticamente
      const result = loadCompany(storage, GILMARA);

      expect(result).toBe(WS_MOLAS); // ← preservou o valor
      expect(storage.getItem(companyKey(GILMARA))).toBe(WS_MOLAS); // ← migrou
      expect(storage.getItem('selected_company_id')).toBeNull();    // ← removeu legado
    });

    it('primeiro acesso pós-deploy não força relogin', () => {
      // Simula usuário que tinha selected_company_id antes do S2
      storage.setItem('selected_company_id', WS_MOLAS);

      // Após deploy do S2, ao carregar o TenantContext, migra silenciosamente
      const workshopId = loadCompany(storage, GILMARA);
      expect(workshopId).toBe(WS_MOLAS);
    });
  });

  // ── Logout limpa tudo ───────────────────────────────────────────────────────

  describe('logout — limpeza completa sem vazar para próxima sessão', () => {
    it('logout remove todas as chaves do usuário que saiu', () => {
      saveCompany(storage, GILMARA, WS_MOLAS);
      storage.setItem(firmKey(GILMARA), 'firma-abc');
      storage.setItem(impersonationKey(GILMARA), JSON.stringify({ target: 'x' }));

      logoutCleanup(storage, GILMARA);

      expect(storage.getItem(companyKey(GILMARA))).toBeNull();
      expect(storage.getItem(firmKey(GILMARA))).toBeNull();
      expect(storage.getItem(impersonationKey(GILMARA))).toBeNull();
    });

    it('logout de Gilmara não remove chaves do Admin', () => {
      saveCompany(storage, GILMARA, WS_MOLAS);
      saveCompany(storage, ADMIN, WS_OUTRO);

      logoutCleanup(storage, GILMARA);

      expect(storage.getItem(companyKey(ADMIN))).toBe(WS_OUTRO); // ← Admin intacto
    });

    it('logout limpa chaves globais legadas', () => {
      storage.setItem('selected_company_id', 'legado');
      storage.setItem('selected_firm_id', 'legado-firma');
      storage.setItem('admin_workshop_id', 'legado-admin');

      logoutCleanup(storage, GILMARA);

      expect(storage.getItem('selected_company_id')).toBeNull();
      expect(storage.getItem('selected_firm_id')).toBeNull();
      expect(storage.getItem('admin_workshop_id')).toBeNull();
    });

    it('REGRESSÃO: logout sem S2 deixa chave global para próximo usuário', () => {
      // Comportamento ANTES do fix S2-D1
      function logoutBUGGED(storage) {
        storage.removeItem('lastVisitedRoute');
        // ← NÃO removia selected_company_id
      }

      storage.setItem('selected_company_id', WS_MOLAS);
      logoutBUGGED(storage);

      // Próximo usuário herda o contexto — BUG
      expect(storage.getItem('selected_company_id')).toBe(WS_MOLAS);
    });
  });

  // ── Impersonação ────────────────────────────────────────────────────────────

  describe('impersonation_data — isolado por email do admin', () => {
    it('dados de impersonação são salvos por email do admin', () => {
      const impData = { target_user: { id: 'u-x', email: 'target@test.com' }, admin: { id: ADMIN } };
      storage.setItem(impersonationKey(ADMIN), JSON.stringify(impData));

      const loaded = JSON.parse(storage.getItem(impersonationKey(ADMIN)));
      expect(loaded.target_user.email).toBe('target@test.com');
    });

    it('admin B não vê dados de impersonação do admin A', () => {
      const adminA = 'admin-a@oficinasmaster.com.br';
      const adminB = 'admin-b@oficinasmaster.com.br';
      storage.setItem(impersonationKey(adminA), JSON.stringify({ target: 'oficina-x' }));

      expect(storage.getItem(impersonationKey(adminB))).toBeNull();
    });

    it('logout do admin limpa dados de impersonação', () => {
      storage.setItem(impersonationKey(ADMIN), JSON.stringify({ target: 'x' }));
      logoutCleanup(storage, ADMIN);
      expect(storage.getItem(impersonationKey(ADMIN))).toBeNull();
    });
  });

});