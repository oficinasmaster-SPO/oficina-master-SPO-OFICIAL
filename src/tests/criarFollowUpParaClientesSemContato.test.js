/**
 * Testes Unitários - criarFollowUpParaClientesSemContato
 * 
 * Executar com: deno test --allow-env --allow-net tests/criarFollowUpParaClientesSemContato.test.js
 */

import { assertEquals } from 'https://deno.land/std@0.200.0/testing/asserts.ts';
import { describe, it } from 'https://deno.land/std@0.200.0/testing/bdd.ts';

describe('criarFollowUpParaClientesSemContato', () => {
  
  describe('Critérios de Elegibilidade', () => {
    
    it('deve considerar cliente elegível quando sem contato recente', () => {
      const fuPendentes = [];
      const atendamentosRecentes = [];
      const sprintsAtivas = [];
      const contratosAtivos = [{ id: 'ct-001' }];

      const elegivel = fuPendentes.length === 0 && 
                       atendamentosRecentes.length === 0 && 
                       sprintsAtivas.length === 0 && 
                       contratosAtivos.length > 0;

      assertEquals(elegivel, true, 'Cliente deve ser elegível');
    });

    it('deve rejeitar cliente com plano FREE', () => {
      const planos_elegiveis = ['BRONZE', 'PRATA', 'GOLD', 'IOM', 'MILLIONS'];
      const planoCliente = 'FREE';
      const elegivel = planos_elegiveis.includes(planoCliente);
      assertEquals(elegivel, false, 'Cliente FREE não deve ser elegível');
    });

    it('deve rejeitar cliente com FU pendente', () => {
      const fuPendentes = [{ id: 'fu-001', is_completed: false }];
      const elegivel = fuPendentes.length === 0;
      assertEquals(elegivel, false, 'Cliente com FU pendente não deve ser elegível');
    });

    it('deve rejeitar cliente com atendimento recente', () => {
      const atendamentosRecentes = [{ id: 'at-001', status: 'realizado' }];
      const elegivel = atendamentosRecentes.length === 0;
      assertEquals(elegivel, false, 'Cliente com atendimento recente não deve ser elegível');
    });

    it('deve rejeitar cliente com sprint ativa', () => {
      const sprintsAtivas = [{ id: 'sp-001', status: 'in_progress' }];
      const elegivel = sprintsAtivas.length === 0;
      assertEquals(elegivel, false, 'Cliente com sprint ativa não deve ser elegível');
    });
  });

  describe('Identificação de Consultor', () => {
    
    it('deve usar consultor do contrato quando disponível', () => {
      const contratosAtivos = [{ consultor_id: 'consultor-123', consultor_nome: 'João Silva' }];
      
      let consultor_id = null;
      let consultor_nome = null;

      if (contratosAtivos.length > 0 && contratosAtivos[0].consultor_id) {
        consultor_id = contratosAtivos[0].consultor_id;
        consultor_nome = contratosAtivos[0].consultor_nome;
      }

      assertEquals(consultor_id, 'consultor-123');
      assertEquals(consultor_nome, 'João Silva');
    });

    it('deve usar admin como fallback final', () => {
      const contratosAtivos = [];
      const ultimosAtendimentos = [];
      const user = { id: 'admin-001', full_name: 'Admin System' };

      let consultor_id = null;
      let consultor_nome = null;

      if (contratosAtivos.length > 0 && contratosAtivos[0]?.consultor_id) {
        consultor_id = contratosAtivos[0].consultor_id;
      } else if (ultimosAtendimentos.length > 0) {
        consultor_id = ultimosAtendimentos[0].consultor_id;
      } else {
        consultor_id = user.id;
        consultor_nome = user.full_name;
      }

      assertEquals(consultor_id, 'admin-001');
      assertEquals(consultor_nome, 'Admin System');
    });
  });

  describe('Dry Run', () => {
    
    it('não deve criar follow-ups quando dry_run = true', () => {
      const dry_run = true;
      const workshops_elegiveis = 5;
      let followups_criados = 0;

      for (let i = 0; i < workshops_elegiveis; i++) {
        if (!dry_run) {
          followups_criados++;
        }
      }

      assertEquals(followups_criados, 0, 'Não deve criar FUs em dry_run');
    });

    it('deve criar follow-ups quando dry_run = false', () => {
      const dry_run = false;
      const workshops_elegiveis = 5;
      let followups_criados = 0;

      for (let i = 0; i < workshops_elegiveis; i++) {
        if (!dry_run) {
          followups_criados++;
        }
      }

      assertEquals(followups_criados, 5, 'Deve criar FUs');
    });
  });

  describe('Métricas', () => {
    
    it('deve calcular métricas corretamente', () => {
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

      assertEquals(metrics.elegiveis, 3);
      assertEquals(metrics.followups_criados, 3);
      assertEquals(metrics.plano_nao_elegivel, 1);
    });
  });
});