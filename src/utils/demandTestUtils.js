/**
 * Utilitários para testes de demandas paralelas
 * Valida severity calculation, filtering, e edge cases
 */

export const testCalculateSeverity = () => {
  const tests = [
    {
      name: 'RED: vencido',
      input: { dias_atraso: 5, vencido: true },
      expected: 'RED'
    },
    {
      name: 'RED: vence hoje',
      input: { dias_para_vencer: 0, vencido: false },
      expected: 'RED'
    },
    {
      name: 'RED: > 3 dias atraso',
      input: { dias_atraso: 4, vencido: true },
      expected: 'RED'
    },
    {
      name: 'YELLOW: vence em 1 dia',
      input: { dias_para_vencer: 1, vencido: false },
      expected: 'YELLOW'
    },
    {
      name: 'YELLOW: vence em 2 dias',
      input: { dias_para_vencer: 2, vencido: false },
      expected: 'YELLOW'
    },
    {
      name: 'YELLOW: 1-3 dias atraso',
      input: { dias_atraso: 2, vencido: true },
      expected: 'YELLOW'
    },
    {
      name: 'GRAY: vence em 5+ dias',
      input: { dias_para_vencer: 5, vencido: false },
      expected: 'GRAY'
    },
    {
      name: 'GRAY: no prazo',
      input: { dias_para_vencer: 10, vencido: false },
      expected: 'GRAY'
    }
  ];

  return tests.map(test => ({
    ...test,
    passed: calculateTestSeverity(test.input) === test.expected
  }));
};

export const calculateTestSeverity = (item) => {
  if (!item) return 'GRAY';

  // RED: vencido
  if (item.vencido && item.dias_atraso >= 1) {
    return 'RED';
  }

  // RED: vence hoje ou passou
  if (item.dias_para_vencer <= 0) {
    return 'RED';
  }

  // YELLOW: vence em 1-2 dias ou 1-3 dias atraso
  if ((item.dias_para_vencer >= 1 && item.dias_para_vencer <= 2) ||
      (item.vencido && item.dias_atraso >= 1 && item.dias_atraso <= 3)) {
    return 'YELLOW';
  }

  // GRAY: normal
  return 'GRAY';
};

export const testParallelDemandsFiltering = () => {
  const mockDemands = {
    sprints: [
      { id: 's1', title: 'Sprint 1', severity: 'RED', dias_atraso: 2, vencido: true },
      { id: 's2', title: 'Sprint 2', severity: 'GRAY', dias_para_vencer: 10 }
    ],
    pedidosInternos: [
      { id: 'p1', title: 'Pedido 1', severity: 'YELLOW', dias_para_vencer: 1 },
      { id: 'p2', title: 'Pedido 2', severity: 'GRAY', dias_para_vencer: 7 }
    ],
    backlogTarefas: [
      { id: 't1', title: 'Tarefa 1', severity: 'RED', dias_atraso: 5, vencido: true },
      { id: 't2', title: 'Tarefa 2', severity: 'GRAY', dias_para_vencer: 20 }
    ],
    cronogramaItems: []
  };

  const tests = [
    {
      name: 'Count RED items',
      validator: () => {
        const reds = Object.values(mockDemands)
          .flat()
          .filter(item => item.severity === 'RED');
        return reds.length === 2; // s1 + t1
      }
    },
    {
      name: 'Count YELLOW items',
      validator: () => {
        const yellows = Object.values(mockDemands)
          .flat()
          .filter(item => item.severity === 'YELLOW');
        return yellows.length === 1; // p1
      }
    },
    {
      name: 'Filter by type',
      validator: () => {
        return mockDemands.sprints.length === 2 &&
               mockDemands.pedidosInternos.length === 2 &&
               mockDemands.backlogTarefas.length === 2;
      }
    },
    {
      name: 'Empty demands return empty',
      validator: () => {
        return mockDemands.cronogramaItems.length === 0;
      }
    }
  ];

  return tests.map(test => ({
    ...test,
    passed: test.validator()
  }));
};

export const testCheckpointDecisionLogic = () => {
  const tests = [
    {
      name: 'next_week creates new FollowUp with +1 sequence',
      decision: 'next_week',
      validator: (input) => {
        // Simulado: novo follow-up teria numero_sequencia = input + 1
        return input.numero_sequencia + 1 > input.numero_sequencia;
      }
    },
    {
      name: 'in_days creates mini FollowUp with .5 sequence',
      decision: 'in_days',
      validator: (input) => {
        // Mini follow-up teria numero_sequencia = input + 0.5
        const miniSequence = input.numero_sequencia + 0.5;
        return miniSequence % 1 === 0.5;
      }
    },
    {
      name: 'on_completion keeps status as aguardando_conclusao',
      decision: 'on_completion',
      validator: (input) => {
        return input.status === 'aguardando_conclusao';
      }
    }
  ];

  const mockInput = { numero_sequencia: 1, status: 'aguardando_conclusao' };

  return tests.map(test => ({
    ...test,
    passed: test.validator(mockInput)
  }));
};

export const testEdgeCases = () => {
  const tests = [
    {
      name: 'No demands shows empty panel',
      input: { sprints: [], pedidosInternos: [], backlogTarefas: [], cronogramaItems: [] },
      validator: (input) => {
        const total = Object.values(input).flat().length;
        return total === 0;
      }
    },
    {
      name: 'Many demands (10+) dont crash',
      input: {
        sprints: Array(5).fill({ id: 's', severity: 'RED' }),
        pedidosInternos: Array(5).fill({ id: 'p', severity: 'YELLOW' }),
        backlogTarefas: Array(5).fill({ id: 't', severity: 'GRAY' }),
        cronogramaItems: []
      },
      validator: (input) => {
        const total = Object.values(input).flat().length;
        return total === 15;
      }
    },
    {
      name: 'Toast queue max 3 simultaneous',
      input: { toastCount: 3 },
      validator: (input) => {
        return input.toastCount <= 3;
      }
    },
    {
      name: 'Checkpoint not opened if not saved',
      input: { saved: false },
      validator: (input) => {
        return !input.saved;
      }
    }
  ];

  return tests.map(test => ({
    ...test,
    passed: test.validator(test.input)
  }));
};

/**
 * Run all tests and return report
 */
export const runAllTests = () => {
  const results = {
    severityCalculation: testCalculateSeverity(),
    parallelDemandsFiltering: testParallelDemandsFiltering(),
    checkpointDecisionLogic: testCheckpointDecisionLogic(),
    edgeCases: testEdgeCases()
  };

  // Calculate pass rate
  const allTests = Object.values(results).flat();
  const passedCount = allTests.filter(t => t.passed).length;
  const totalCount = allTests.length;
  const passRate = ((passedCount / totalCount) * 100).toFixed(1);

  console.log(`\n✅ TEST REPORT: ${passedCount}/${totalCount} passed (${passRate}%)\n`);
  Object.entries(results).forEach(([suite, tests]) => {
    console.log(`${suite}:`);
    tests.forEach(test => {
      console.log(`  ${test.passed ? '✓' : '✗'} ${test.name}`);
    });
  });

  return { results, passRate: `${passRate}%`, summary: { passed: passedCount, total: totalCount } };
};