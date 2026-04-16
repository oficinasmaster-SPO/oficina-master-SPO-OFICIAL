# Developer Notes — Oficinas Master

## Contexto do Projeto
- App de gestão para oficinas mecânicas com sistema de consultoria/aceleração
- Usa sprints com fases (Planning, Execution, Monitoring, Review, Retrospective)
- Dois perfis principais: **Consultor** (gerencia e revisa) e **Oficina/Cliente** (executa tarefas)
- Stack: React + Tailwind + Base44 backend

## Decisões de Arquitetura (Sprint/Aceleração)

### Review History (2026-04-16)
- Adicionado `review_history[]` em cada fase do sprint para preservar histórico completo de submissões e revisões
- Formato: `{ action: "submitted"|"approved"|"returned", date, actor, actor_id?, feedback? }`
- Timeline lê do `review_history` com fallback para dados legados (`reviewed_at`, `submitted_for_review_at`)
- Anteriormente só o último evento de revisão era preservado (sobrescrevia `reviewed_at`)

### Permissões de Status (2026-04-16)
- Consultores NÃO podem selecionar `pending_review` manualmente — só a oficina pode submeter para revisão
- `handleSave` no modal do consultor agora grava `reviewed_at`/`reviewed_by` ao marcar como `completed`
- Ao reverter status de `completed`, limpa `completion_date`

### Feedback Duplicado (2026-04-16)
- `SprintClientModal` mostra feedback do consultor em banner prominente
- `SprintSubmitReview` recebe `hideFeedback` prop para evitar duplicação

### Rollback em Erro (2026-04-16)
- `saveMutation` no `SprintClientModal` tem `onError` que invalida queries para forçar refetch (rollback de estado local como auto-start de fase)

## Preferências do Desenvolvedor
- (adicionar conforme conversas futuras)

## Instruções Permanentes
- (adicionar conforme conversas futuras)