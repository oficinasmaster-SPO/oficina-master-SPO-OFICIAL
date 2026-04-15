import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PHASE_DEFAULT_TASKS = {
  Planning: [
    "Revisar diagnóstico e prioridades",
    "Definir objetivo claro do sprint",
    "Listar entregáveis mensuráveis",
    "Distribuir tarefas e prazos",
  ],
  Execution: [
    "Assistir treinamentos da missão",
    "Implementar ferramentas e processos",
    "Executar tarefas priorizadas",
    "Registrar progresso na plataforma",
  ],
  Monitoring: [
    "Check-in: o que foi feito",
    "Medir resultados parciais",
    "Identificar bloqueios",
    "Ajustar tarefas se necessário",
  ],
  Review: [
    "Apresentar entregáveis concluídos",
    "Medir KPIs vs meta do sprint",
    "Validar com o cliente os resultados",
    "Documentar conquistas",
  ],
  Retrospective: [
    "O que funcionou bem?",
    "O que precisa melhorar?",
    "Quais ajustes fazer no processo?",
    "Planejar próximo sprint",
  ],
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const allSprints = await base44.asServiceRole.entities.ConsultoriaSprint.filter({});
  let updated = 0;

  for (const sprint of allSprints) {
    const phases = sprint.phases || [];
    let needsUpdate = false;

    const updatedPhases = phases.map(phase => {
      // Only add default tasks to phases that have NO tasks
      if (!phase.tasks || phase.tasks.length === 0) {
        const defaults = PHASE_DEFAULT_TASKS[phase.name];
        if (defaults) {
          needsUpdate = true;
          return {
            ...phase,
            tasks: defaults.map(desc => ({ description: desc, status: "to_do" })),
          };
        }
      }
      return phase;
    });

    if (needsUpdate) {
      // Recalculate progress
      const totalTasks = updatedPhases.reduce((sum, p) => sum + (p.tasks?.length || 0), 0);
      const doneTasks = updatedPhases.reduce((sum, p) => sum + (p.tasks?.filter(t => t.status === "done").length || 0), 0);
      const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

      await base44.asServiceRole.entities.ConsultoriaSprint.update(sprint.id, {
        phases: updatedPhases,
        progress_percentage: progress,
      });
      updated++;
    }
  }

  return Response.json({ 
    message: `Migration complete. Updated ${updated} sprints out of ${allSprints.length} total.`,
    updated,
    total: allSprints.length 
  });
});