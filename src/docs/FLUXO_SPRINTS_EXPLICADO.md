# 🚀 Fluxo de Dados das Sprints no Painel de Aceleração

## 📍 Localização da Tela
**Página:** `pages/PainelClienteAceleracao`  
**Componente Visual:** `components/aceleracao/sprint-client/SprintClientSection`  
**Seção na tela:** "Sprints de Aceleração" (abaixo do Plano Mensal)

---

## 1️⃣ DE ONDE VÊEM OS DADOS (ORIGEM)

### Entidade Principal: `ConsultoriaSprint`
A entidade que armazena TODAS as informações das Sprints está no banco:

```
Base44 Database
└── ConsultoriaSprint (entidade)
    ├── id
    ├── workshop_id (vinculo com a oficina)
    ├── sprint_number (0, 1, 2...)
    ├── title (nome da sprint)
    ├── objective (objetivo da sprint)
    ├── status (pending, in_progress, completed, overdue)
    ├── start_date (data início)
    ├── end_date (data término)
    ├── progress_percentage (0-100%)
    ├── phases[] (fases da sprint com tarefas)
    ├── mission_id (tipo de missão)
    └── created_date (data de criação)
```

### Exemplo Real (Oficina Master Aceleradora)
Atualmente existem 3 sprints no banco para essa oficina:

| Sprint | Título | Status | Progresso | Fase |
|--------|--------|--------|-----------|------|
| 0 | Diagnóstico & Alinhamento | in_progress | 12% | Recolhimento de dados |
| 1 | Agenda Cheia | in_progress | 3% | Implementação |
| 2 | Fechamento Imbatível | in_progress | 0% | Planejamento |

---

## 2️⃣ COMO OS DADOS SÃO BUSCADOS (FLUXO DE CARREGAMENTO)

### Sequência de Busca:

```
1. Usuário acessa: pages/PainelClienteAceleracao
   ↓
2. Component monta → useQuery hook dispara

3. Query Key: ['sprints-reais', workshop?.id]
   
4. QueryFn executa:
   ```javascript
   await base44.entities.ConsultoriaSprint.filter(
     { workshop_id: workshop.id },  // Filtro por oficina
     'sprint_number'                // Ordem: Sprint 0, 1, 2...
   )
   ```
   
5. Resultado = Array de sprints reais do banco

6. Component: SprintClientSection recebe os dados
   └─ Renderiza: SprintClientCard para cada sprint
```

### Configuração de Polling (Atualização Automática)

```javascript
// Em: pages/PainelClienteAceleracao (linha 159-172)
useQuery({
  queryKey: ['sprints-reais', workshop?.id],
  queryFn: ...,
  staleTime: 0,              // ❌ Dados sempre "velhos" = sempre busca
  refetchInterval: 5000,     // ✅ Refaz query a cada 5 segundos
})

// Em: components/aceleracao/sprint-client/SprintClientSection (linha 14-26)
useQuery({
  queryKey: ["sprints-client", workshopId],
  queryFn: ...,
  staleTime: 0,
  refetchInterval: 5000,     // 🔄 Sincronização automática
})
```

---

## 3️⃣ REAL-TIME SYNC (SINCRONIZAÇÃO EM TEMPO REAL)

### Hook de Subscrição Automática

Quando uma sprint é criada, movida ou atualizada em QUALQUER lugar do app:

```javascript
// Em: pages/PainelClienteAceleracao (linha 177-189)
useEffect(() => {
  const unsubscribe = base44.entities.ConsultoriaSprint.subscribe((event) => {
    if (event.data?.workshop_id === workshop.id) {
      queryClient.refetchQueries(['sprints-reais', workshop.id]);      // Refaz query
      queryClient.refetchQueries(['progresso-implementacao', workshop.id]); // Sincroniza cronograma
    }
  });
  
  return unsubscribe; // Cleanup ao desmontar
}, [workshop?.id, queryClient]);

// Em: SprintClientSection (linha 29-39)
useEffect(() => {
  const unsubscribe = base44.entities.ConsultoriaSprint.subscribe((event) => {
    if (event.data?.workshop_id === workshopId) {
      queryClient.refetchQueries(['sprints-client', workshopId]); // Atualiza UI
    }
  });
  
  return unsubscribe;
}, [workshopId, queryClient]);
```

### O Que Isso Significa?
✅ Se você muda uma sprint no **ControleAceleração**  
✅ Ela aparece **imediatamente** em **PainelClienteAceleracao**  
✅ Sem refresh da página  
✅ Sincronização a cada 5 segundos + eventos em tempo real

---

## 4️⃣ COMO CRIAR, MOVER E ATUALIZAR SPRINTS

### ⚙️ Criação de Sprints

**Onde?** Função backend: `functions/criarSprintsOficinaMaster.js`

```javascript
// Cria as 3 sprints padrão quando a oficina é criada/diagnosticada
await base44.entities.ConsultoriaSprint.bulkCreate([
  {
    workshop_id: workshop.id,
    sprint_number: 0,
    title: "Sprint 0 — Diagnóstico & Alinhamento",
    status: "pending",  // ou in_progress após diagnóstico
    phases: [...]
  },
  {
    workshop_id: workshop.id,
    sprint_number: 1,
    title: "Sprint 1 — Agenda Cheia",
    status: "pending",
    phases: [...]
  },
  // ... Sprint 2
]);
```

### 🔄 Movimentação de Sprints

**Onde?** Componentes abaixo:
- `components/aceleracao/sprint-client/SprintClientModal`
- `components/aceleracao/sprint-consultant/ConsultorReviewPanel`

```javascript
// Atualizar status de uma sprint
await base44.entities.ConsultoriaSprint.update(sprint.id, {
  status: "in_progress",  // Muda de pending → in_progress
  start_date: new Date().toISOString()
});

// Ao salvar → evento dispara
// → useEffect em PainelClienteAceleracao escuta
// → queryClient.refetchQueries(['sprints-reais', ...])
// → UI atualiza automaticamente ✅
```

### 📊 Atualização de Progresso

**Onde?** Função: `functions/syncSprintPhaseProgress.js`

```javascript
// Recalcula progresso baseado em tarefas concluídas
const completedTasks = sprint.phases.reduce((sum, phase) => {
  return sum + phase.tasks.filter(t => t.status === 'completed').length;
}, 0);

const totalTasks = sprint.phases.reduce((sum, phase) => {
  return sum + phase.tasks.length;
}, 0);

const newProgress = Math.round((completedTasks / totalTasks) * 100);

await base44.entities.ConsultoriaSprint.update(sprint.id, {
  progress_percentage: newProgress,
  updated_date: new Date().toISOString()
});
```

---

## 5️⃣ ESTRUTURA DE FASES (Phases)

Cada sprint contém fases com tarefas:

```javascript
{
  id: "phase-1",
  title: "Planejamento",
  status: "completed",  // completed, in_progress, pending_review
  tasks: [
    {
      id: "task-1",
      title: "Definir escopo",
      status: "completed",
      assigned_to: "user_id",
      due_date: "2026-05-10"
    },
    // ... mais tarefas
  ]
}
```

### Componente de Visualização: `SprintPhaseProgress`
```
Mostra barra de progresso de cada fase
├─ Planejamento: ████████░░ 80%
├─ Implementação: ██░░░░░░░░ 20%
└─ Revisão: ░░░░░░░░░░ 0%
```

---

## 6️⃣ ESTRUTURA COMPLETA DO FLUXO

```
┌─────────────────────────────────────────────────────────┐
│           PainelClienteAceleracao (Página)              │
│                    ↓                                     │
│   useQuery(['sprints-reais', workshop.id])              │
│       refetchInterval: 5000 (a cada 5s)                 │
│                    ↓                                     │
│  ConsultoriaSprint.subscribe() [REAL-TIME]              │
│       Quando há mudança → refetchQueries                │
│                    ↓                                     │
├─────────────────────────────────────────────────────────┤
│             SprintClientSection (Componente)            │
│       Também escuta mudanças em tempo real               │
│                    ↓                                     │
│  sprints.filter(s => s.status in [...])                 │
│       Categoriza: Em Execução vs Concluídos             │
│                    ↓                                     │
├─────────────────────────────────────────────────────────┤
│              SprintClientCard (Card Visual)             │
│       Mostra: título, objetivo, progresso, status       │
│                    ↓                                     │
│          SprintPhaseProgress (Barras)                   │
│       Progresso de cada fase da sprint                  │
│                    ↓                                     │
│           SprintClientModal (Detalhes)                  │
│       Abre ao clicar "Abrir" no card                    │
│                    ↓                                     │
│    Permite: revisar tarefas, submeter progresso         │
│    ao clicar "Enviar Revisão"                          │
│                    ↓                                     │
│ Atualiza: status da fase → pending_review               │
│   Consultor revisa → completa ou pede ajustes           │
└─────────────────────────────────────────────────────────┘
```

---

## 7️⃣ FLUXO DE REVISÃO (Review Workflow)

```
Cliente clica "Enviar Revisão" na fase
    ↓
Status: in_progress → pending_review
    ↓
Notificação enviada ao Consultor
    ↓
Consultor acessa: ControleAceleração → Dashboard Sprints
    ↓
ConsultorReviewPanel mostra fases pendentes
    ↓
Consultor escolhe:
    ├─ ✅ Aprovar → status: completed
    │              progresso% += 20/5 (5 fases)
    │
    └─ ❌ Requerer Ajustes → volta para in_progress
       + Adiciona comentários do que corrigir
    ↓
Cliente recebe notificação + comentários
    ↓
Volta ao PainelClienteAceleracao
    ↓
Vê a sprint atualizada em tempo real ✅
```

---

## 8️⃣ RESUMO: ONDE ESTÃO AS OPERAÇÕES

| Operação | Arquivo | Função/Component |
|----------|---------|------------------|
| **Buscar Sprints** | `pages/PainelClienteAceleracao` | `useQuery(['sprints-reais'])` linha 159 |
| **Escutar Mudanças** | `pages/PainelClienteAceleracao` | `useEffect → subscribe()` linha 177 |
| **Renderizar Sprints** | `sprint-client/SprintClientSection` | `filter()` e `map()` linha 56-103 |
| **Criar Sprint** | `functions/criarSprintsOficinaMaster.js` | `bulkCreate()` |
| **Atualizar Status** | `sprint-client/SprintClientModal` | `ConsultoriaSprint.update()` |
| **Calcular Progresso** | `functions/syncSprintPhaseProgress.js` | Recalcula % por fase |
| **Revisar Fase** | `sprint-consultant/ConsultorReviewPanel` | Muda status para pending_review |
| **Aprovar Fase** | `sprint-consultant/ConsultorReviewPanel` | Muda status para completed |

---

## 🎯 CONCLUSÃO

### Fluxo Simplificado:
1. **Dados moram em:** `ConsultoriaSprint` (banco)
2. **São buscados em:** `PainelClienteAceleracao` a cada 5s
3. **Sincronizam em tempo real** via `.subscribe()`
4. **Renderizados em:** Cards visuais de sprint
5. **Atualizados por:** Cliente (submitir revisão) ou Consultor (aprovar)
6. **Refletem imediatamente** em todas as telas

✨ **Tudo conectado, tudo sincronizado, zero latência visível!**