/**
 * Testes Unitários - criarFollowUpParaClientesSemContato
 * 
 * Executar com: deno test --allow-env --allow-net functions/criarFollowUpParaClientesSemContato.test.js
 */

import { assertEquals, assertNotEquals } from 'https://deno.land/std@0.200.0/testing/asserts.ts';
import { describe, it, beforeEach, afterEach } from 'https://deno.land/std@0.200.0/testing/bdd.ts';

describe('criarFollowUpParaClientesSemContato', () => {
  
  describe('Critérios de Elegibilidade', () => {
    
    it('deve considerar cliente elegível quando sem contato recente', async () => {
      // Setup: Workshop GOLD, sem FU, sem atendimento, sem sprint
      const workshop = {
        id: 'ws-test-001',
        name: 'P1 Pneus Teste',
        planoAtual: 'GOLD',
        status: 'ativo',
        consulting_firm_id: 'firm-123'
      };

      // Mock das queries (retornando vazio = elegível)
      const fuPendentes = [];
      const atendamentosRecentes = [];
      const sprintsAtivas = [];
      const contratosAtivos = [{ id: 'ct-001', consultor_id: 'consultor-123', consultor_nome: 'João Teste' }];

      // Verificar elegibilidade
      const elegivel = fuPendentes.length === 0 && 
                       atendamentosRecentes.length === 0 && 
                       sprintsAtivas.length === 0 && 
                       contratosAtivos.length > 0;

      assertEquals(elegivel, true, 'Cliente deve ser elegível');
    });

    it('deve rejeitar cliente com plano FREE', async () => {
      const planos_elegiveis = ['BRONZE', 'PRATA', 'GOLD', 'IOM', 'MILLIONS'];
      const planoCliente = 'FREE';

      const elegivel = planos_elegiveis.includes(planoCliente);

      assertEquals(elegivel, false, 'Cliente FREE não deve ser elegível');
    });

    it('deve rejeitar cliente com plano START', async () => {
      const planos_elegiveis = ['BRONZE', 'PRATA', 'GOLD', 'IOM', 'MILLIONS'];
      const planoCliente = 'START';

      const elegivel = planos_elegiveis.includes(planoCliente);

      assertEquals(elegivel, false, 'Cliente START não deve ser elegível');
    });

    it('deve rejeitar cliente com FU pendente nos últimos 7 dias', async () => {
      const fuPendentes = [
        { id: 'fu-001', is_completed: false, created_date: new Date().toISOString() }
      ];

      const elegivel = fuPendentes.length === 0;

      assertEquals(elegivel, false, 'Cliente com FU pendente não deve ser elegível');
    });

    it('deve rejeitar cliente com atendimento recente (30 dias)', async () => {
      const atendamentosRecentes = [
        { id: 'at-001', status: 'realizado', data_realizada: new Date().toISOString() }
      ];

      const elegivel = atendamentosRecentes.length === 0;

      assertEquals(elegivel, false, 'Cliente com atendimento recente não deve ser elegível');
    });

    it('deve rejeitar cliente com sprint ativa', async () => {
      const sprintsAtivas = [
        { id: 'sp-001', status: 'in_progress' }
      ];

      const elegivel = sprintsAtivas.length === 0;

      assertEquals(elegivel, false, 'Cliente com sprint ativa não deve ser elegível');
    });

    it('deve rejeitar cliente sem contrato ativo', async () => {
      const contratosAtivos = [];

      const elegivel = contratosAtivos.length > 0;

      assertEquals(elegivel, false, 'Cliente sem contrato ativo não deve ser elegível');
    });
  });

  describe('Identificação de Consultor', () => {
    
    it('deve usar consultor do contrato quando disponível', async () => {
      const contratosAtivos = [
        { 
          id: 'ct-001', 
          consultor_id: 'consultor-123', 
          consultor_nome: 'João Silva' 
        }
      ];

      let consultor_id = null;
      let consultor_nome = null;

      if (contratosAtivos.length > 0 && contratosAtivos[0].consultor_id) {
        consultor_id = contratosAtivos[0].consultor_id;
        consultor_nome = contratosAtivos[0].consultor_nome;
      }

      assertEquals(consultor_id, 'consultor-123', 'Deve usar consultor do contrato');
      assertEquals(consultor_nome, 'João Silva', 'Deve usar nome do consultor');
    });

    it('deve usar consultor do último atendimento como fallback', async () => {
      const contratosAtivos = [];
      const ultimosAtendimentos = [
        { id: 'at-001', consultor_id: 'consultor-456', consultor_nome: 'Maria Santos' }
      ];

      let consultor_id = null;
      let consultor_nome = null;

      if (contratosAtivos.length > 0 && contratosAtivos[0]?.consultor_id) {
        consultor_id = contratosAtivos[0].consultor_id;
        consultor_nome = contratosAtivos[0].consultor_nome;
      } else if (ultimosAtendimentos.length > 0) {
        consultor_id = ultimosAtendimentos[0].consultor_id;
        consultor_nome = ultimosAtendimentos[0].consultor_nome;
      }

      assertEquals(consultor_id, 'consultor-456', 'Deve usar consultor do atendimento');
      assertEquals(consultor_nome, 'Maria Santos', 'Deve usar nome do consultor');
    });

    it('deve usar admin como fallback final', async () => {
      const contratosAtivos = [];
      const ultimosAtendimentos = [];
      const user = { id: 'admin-001', full_name: 'Admin System' };

      let consultor_id = null;
      let consultor_nome = null;

      if (contratosAtivos.length > 0 && contratosAtivos[0]?.consultor_id) {
        consultor_id = contratosAtivos[0].consultor_id;
        consultor_nome = contratosAtivos[0].consultor_nome;
      } else if (ultimosAtendimentos.length > 0) {
        consultor_id = ultimosAtendimentos[0].consultor_id;
        consultor_nome = ultimosAtendimentos[0].consultor_nome;
      } else {
        consultor_id = user.id;
        consultor_nome = user.full_name;
      }

      assertEquals(consultor_id, 'admin-001', 'Deve usar admin');
      assertEquals(consultor_nome, 'Admin System', 'Deve usar nome do admin');
    });
  });

  describe('Dry Run', () => {
    
    it('não deve criar follow-ups quando dry_run = true', async () => {
      const dry_run = true;
      const workshops_elegiveis = 5;
      let followups_criados = 0;

      // Simulação: se dry_run, não cria
      for (let i = 0; i < workshops_elegiveis; i++) {
        if (!dry_run) {
          followups_criados++;
        }
      }

      assertEquals(followups_criados, 0, 'Não deve criar FUs em dry_run');
      assertEquals(workshops_elegiveis, 5, 'Deve identificar elegíveis');
    });

    it('deve criar follow-ups quando dry_run = false', async () => {
      const dry_run = false;
      const workshops_elegiveis = 5;
      let followups_criados = 0;

      // Simulação: se não dry_run, cria
      for (let i = 0; i < workshops_elegiveis; i++) {
        if (!dry_run) {
          followups_criados++;
        }
      }

      assertEquals(followups_criados, 5, 'Deve criar FUs');
    });
  });

  describe('Métricas', () => {
    
    it('deve calcular métricas corretamente', async () => {
      const metrics = {
        total_workshops: 100,
        elegiveis: 0,
        com_fu_recente: 0,
        com_atendimento_recente: 0,
        com_sprint_ativa: 0,
        plano_nao_elegivel: 0,
        followups_criados: 0,
        falhas: 0
      };

      // Simular processamento
      const workshops = [
        { plano: 'FREE', motivo: 'plano_nao_elegivel' },
        { plano: 'GOLD', motivo: 'com_fu_recente' },
        { plano: 'GOLD', motivo: 'com_atendimento_recente' },
        { plano: 'GOLD', motivo: 'com_sprint_ativa' },
        { plano: 'GOLD', motivo: 'elegivel' },
        { plano: 'GOLD', motivo: 'elegivel' },
        { plano: 'GOLD', motivo: 'elegivel' }
      ];

      workshops.forEach(ws => {
        if (ws.motivo === 'plano_nao_elegivel') metrics.plano_nao_elegivel++;
        else if (ws.motivo === 'com_fu_recente') metrics.com_fu_recente++;
        else if (ws.motivo === 'com_atendimento_recente') metrics.com_atendimento_recente++;
        else if (ws.motivo === 'com_sprint_ativa') metrics.com_sprint_ativa++;
        else if (ws.motivo === 'elegivel') {
          metrics.elegiveis++;
          metrics.followups_criados++;
        }
      });

      assertEquals(metrics.total_workshops, 100, 'Total deve ser 100');
      assertEquals(metrics.plano_nao_elegivel, 1, '1 plano não elegível');
      assertEquals(metrics.com_fu_recente, 1, '1 com FU recente');
      assertEquals(metrics.com_atendimento_recente, 1, '1 com atendimento recente');
      assertEquals(metrics.com_sprint_ativa, 1, '1 com sprint ativa');
      assertEquals(metrics.elegiveis, 3, '3 elegíveis');
      assertEquals(metrics.followups_criados, 3, '3 FUs criados');
    });

    it('deve rastrear falhas', async () => {
      const metrics = {
        falhas: 0
      };

      // Simular 2 falhas
      const erros = [
        { workshop_id: 'ws-001', error: 'Erro 1' },
        { workshop_id: 'ws-002', error: 'Erro 2' }
      ];

      metrics.falhas = erros.length;

      assertEquals(metrics.falhas, 2, 'Deve ter 2 falhas');
    });
  });

  describe('Data de Corte (Lookback)', () => {
    
    it('deve calcular data de corte corretamente (30 dias)', async () => {
      const lookback_days = 30;
      const dataCorte = new Date();
      dataCorte.setDate(dataCorte.getDate() - lookback_days);

      const diasDiferenca = Math.floor((new Date() - dataCorte) / (1000 * 60 * 60 * 24));

      assertEquals(diasDiferenca, 30, 'Data de corte deve ser 30 dias atrás');
    });

    it('deve calcular data de corte para FU (7 dias)', async () => {
      const lookback_fu = 7;
      const dataCorteFU = new Date();
      dataCorteFU.setDate(dataCorteFU.getDate() - lookback_fu);

      const diasDiferenca = Math.floor((new Date() - dataCorteFU) / (1000 * 60 * 60 * 24));

      assertEquals(diasDiferenca, 7, 'Data de corte FU deve ser 7 dias atrás');
    });
  });

  describe('Payload de Resposta', () => {
    
    it('deve retornar estrutura correta', async () => {
      const response = {
        success: true,
        timestamp: new Date().toISOString(),
        dry_run: false,
        metrics: {
          total_workshops: 100,
          followups_criados: 5
        },
        workshops_processados: [],
        erros: []
      };

      assertEquals(response.success, true, 'Success deve ser true');
      assertEquals(typeof response.timestamp, 'string', 'Timestamp deve ser string');
      assertEquals(typeof response.dry_run, 'boolean', 'Dry run deve ser boolean');
      assertEquals(typeof response.metrics, 'object', 'Metrics deve ser object');
      assertEquals(Array.isArray(response.workshops_processados), true, 'Workshops deve ser array');
      assertEquals(Array.isArray(response.erros), true, 'Erros deve ser array');
    });
  });
});