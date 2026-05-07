# RFC - FASE 2: FOUNDATION - CENTRALIZAR E SINCRONIZAR

## 📋 RESUMO EXECUTIVO

**Objetivo:** Centralizar todos os dados operacionais (Próximos Passos, Sprints, Cronograma, Backlog, Pedidos) em um único ponto de verdade gerenciado pelo `OperationalSyncManager`.

**Escopo:** 
- Não mexer em UI (IniciarAtendimentoModal, ClientDetailPanel, BucketAtendimentosTab já existem)
- Apenas **centralizar as queries e o gerenciamento de estado**
- Query keys padronizadas
- Cache strategy única

---

## 🏗️ ARQUITETURA - CAMADAS

```
┌─────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER                                         │
│  ├─ IniciarAtendimentoModal (já existe)                    │
│  ├─ ClientDetailPanel (já existe - consultoria tab)        │
│  ├─ BucketAtendimentosTab (já existe)                      │
│  └─ [Consumem dados de OperationalSyncManager]             │
└──────────────────────┬──────────────────────────────────────┘
                       │ useOperationalSync()
┌──────────────────────┴──────────────────────────────────────┐
│  SYNC LAYER (NOVO)                                          │
│  ├─ OperationalSyncManager (hook centralizado)             │
│  ├─ Query keys centralizadas                               │
│  ├─ Cache invalidation strategy                            │
│  └─ Derivações de dados                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │ base44.entities.X.filter()
┌──────────────────────┴──────────────────────────────────────┐
│  DATA LAYER                                                 │
│  ├─ ProximoPassoModal (ConsultoriaProximoPasso)            │
│  ├─ SprintsTab (ConsultoriaSprint)                         │
│  ├─ CronogramaImplementacao (CronogramaImplementacao)      │
│  ├─ BacklogTab (TarefaBacklog)                             │
│  └─ PedidosTab (PedidoInterno)                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 MAPEAMENTO DE DADOS ATUALMENTE DUPLICADOS

### IniciarAtendimentoModal (HOJE)
```javascript
// Linha 176-184: all-followups-modal
// Linha 187-200: atendimentos-hoje-modal
// Linha 203-211: concluidos-ia-modal
// Linha 286-297: atas-modal
// Linha 300-312: workshop-modal
// Linha 315-327: owner-employee-modal
```
**Total:** 6 queries paralelas, **cada uma com sua própria staleTime**

### ClientDetailPanel (HOJE)
```javascript
// Linha 20-21: Filtra atendimentos do cliente (recebe como prop)
// Linha 412-415: Procura progresso e implementação no cliente
```
**Total:** Dados recebidos como props, sem queries próprias

### BucketAtendimentosTab (HOJE)
```javascript
// Linha 27-38: bucket-atendimentos
// Linha 141-145: Filtra e busca em memória
```
**Total:** 1 query para bucket, filtra no client

---

## ✨ SOLUÇÃO - OPERATIONALSYNCMANAGER

### Arquivo: `hooks/useOperationalSync.js`

```javascript
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useMemo } from "react";

/**
 * QUERY KEYS CENTRALIZADAS
 * Garantem invalidação consistente e cache compartilhado
 */
const QUERY_KEYS = {
  // Follow-ups (Próximos Passos)
  allFollowUps: (workshopId) => ['operational', 'followups', 'all', workshopId],
  completedFollowUps: (workshopId) => ['operational', 'followups', 'completed', workshopId],
  
  // Sprints
  allSprints: (workshopId) => ['operational', 'sprints', 'all', workshopId],
  sprintProgress: (sprintId) => ['operational', 'sprints', 'progress', sprintId],
  
  // Cronograma
  cronograma: (workshopId) => ['operational', 'cronograma', workshopId],
  
  // Backlog
  backlogTasks: (workshopId) => ['operational', 'backlog', workshopId],
  
  // Pedidos Internos
  internalRequests: (workshopId) => ['operational', 'requests', workshopId],
  
  // ATAs
  atas: (workshopId) => ['operational', 'atas', workshopId],
  
  // Workshops
  workshop: (workshopId) => ['operational', 'workshop', workshopId],
  workshopOwner: (ownerId) => ['operational', 'workshop', 'owner', ownerId],
  
  // Atendimentos do consultor
  consultorAttendances: (consultorId, date) => ['operational', 'attendances', consultorId, date],
};

/**
 * Hook centralizado para sincronizar todos os dados operacionais
 */
export function useOperationalSync(workshopId, consultorId, user) {
  // ─── FOLLOW-UPS ───
  const { data: allFollowUps = [], ...followUpsQuery } = useQuery({
    queryKey: QUERY_KEYS.allFollowUps(workshopId),
    queryFn: async () => {
      if (!workshopId) return [];
      return base44.entities.FollowUpReminder.filter(
        { workshop_id: workshopId },
        "reminder_date",
        50
      );
    },
    enabled: !!workshopId,
    staleTime: 3 * 60 * 1000, // 3 min
  });

  const { data: completedFollowUps = [] } = useQuery({
    queryKey: QUERY_KEYS.completedFollowUps(workshopId),
    queryFn: async () => {
      if (!workshopId) return [];
      return base44.entities.FollowUpConcluido.filter(
        { workshop_id: workshopId },
        "-completedAt",
        10
      );
    },
    enabled: !!workshopId,
    staleTime: 5 * 60 * 1000,
  });

  // ─── SPRINTS ───
  const { data: allSprints = [] } = useQuery({
    queryKey: QUERY_KEYS.allSprints(workshopId),
    queryFn: async () => {
      if (!workshopId) return [];
      return base44.entities.ConsultoriaSprint.filter(
        { workshop_id: workshopId },
        "-start_date",
        50
      );
    },
    enabled: !!workshopId,
    staleTime: 4 * 60 * 1000,
  });

  // ─── CRONOGRAMA ───
  const { data: cronograma = [] } = useQuery({
    queryKey: QUERY_KEYS.cronograma(workshopId),
    queryFn: async () => {
      if (!workshopId) return [];
      return base44.entities.CronogramaImplementacao.filter(
        { workshop_id: workshopId },
        "-created_date",
        50
      );
    },
    enabled: !!workshopId,
    staleTime: 5 * 60 * 1000,
  });

  // ─── BACKLOG ───
  const { data: backlogTasks = [] } = useQuery({
    queryKey: QUERY_KEYS.backlogTasks(workshopId),
    queryFn: async () => {
      if (!workshopId) return [];
      return base44.entities.TarefaBacklog.filter(
        { cliente_id: workshopId },
        "-created_date",
        50
      );
    },
    enabled: !!workshopId,
    staleTime: 4 * 60 * 1000,
  });

  // ─── PEDIDOS INTERNOS ───
  const { data: internalRequests = [] } = useQuery({
    queryKey: QUERY_KEYS.internalRequests(workshopId),
    queryFn: async () => {
      if (!workshopId) return [];
      return base44.entities.PedidoInterno.filter(
        { cliente_id: workshopId },
        "-created_date",
        30
      );
    },
    enabled: !!workshopId,
    staleTime: 5 * 60 * 1000,
  });

  // ─── ATAs ───
  const { data: atas = [] } = useQuery({
    queryKey: QUERY_KEYS.atas(workshopId),
    queryFn: async () => {
      if (!workshopId) return [];
      return base44.entities.MeetingMinutes.filter(
        { workshop_id: workshopId },
        "-meeting_date",
        30
      );
    },
    enabled: !!workshopId,
    staleTime: 5 * 60 * 1000,
  });

  // ─── WORKSHOP ───
  const { data: workshop } = useQuery({
    queryKey: QUERY_KEYS.workshop(workshopId),
    queryFn: async () => {
      if (!workshopId) return null;
      const workshops = await base44.entities.Workshop.filter(
        { id: workshopId },
        undefined,
        1
      );
      return workshops[0] || null;
    },
    enabled: !!workshopId,
    staleTime: 10 * 60 * 1000,
  });

  // ─── WORKSHOP OWNER ───
  const { data: workshopOwner } = useQuery({
    queryKey: QUERY_KEYS.workshopOwner(workshop?.owner_id),
    queryFn: async () => {
      if (!workshop?.owner_id) return null;
      const employees = await base44.entities.Employee.filter(
        { user_id: workshop.owner_id },
        undefined,
        1
      );
      return employees[0] || null;
    },
    enabled: !!workshop?.owner_id,
    staleTime: 10 * 60 * 1000,
  });

  // ─── CONSULTOR ATTENDANCES ───
  const today = new Date().toISOString().split('T')[0];
  const { data: consultorAttendances = [] } = useQuery({
    queryKey: QUERY_KEYS.consultorAttendances(consultorId, today),
    queryFn: async () => {
      if (!consultorId) return [];
      const todos = await base44.entities.ConsultoriaAtendimento.filter(
        { consultor_id: consultorId },
        "data_agendada",
        50
      );
      return todos.filter(a => {
        if (!a.data_agendada) return false;
        if (!['agendado', 'confirmado', 'reagendado'].includes(a.status))
          return false;
        try {
          return isToday(parseISO(a.data_agendada));
        } catch {
          return false;
        }
      });
    },
    enabled: !!consultorId,
    staleTime: 2 * 60 * 1000,
  });

  // ─── DERIVED DATA ───
  // Derivações que servem múltiplos componentes
  const derivedData = useMemo(() => {
    return {
      // Follow-ups por sprint
      followUpsBySprintId: (sprintId) => allFollowUps.filter(
        f => f.origin_type === 'sprint' && f.sprint_id === sprintId
      ),
      
      // Sprints em progresso
      sprintsInProgress: allSprints.filter(s => s.status === 'in_progress'),
      
      // Backlog pendente
      pendingBacklog: backlogTasks.filter(t => t.status === 'aberta'),
      
      // Pedidos não respondidos
      pendingRequests: internalRequests.filter(
        r => r.status === 'pendente'
      ),
      
      // ATAs recentes
      recentAtas: atas.slice(0, 5),
    };
  }, [allFollowUps, allSprints, backlogTasks, internalRequests, atas]);

  return {
    // Dados brutos
    allFollowUps,
    completedFollowUps,
    allSprints,
    cronograma,
    backlogTasks,
    internalRequests,
    atas,
    workshop,
    workshopOwner,
    consultorAttendances,
    
    // Derivações
    ...derivedData,
    
    // Status das queries
    isLoading: followUpsQuery.isLoading,
    
    // Query keys para invalidação
    QUERY_KEYS,
  };
}
```

---

## 🔄 INVALIDATION STRATEGY

### Quando Invalidar?

| Evento | Query Keys a Invalidar |
|--------|------------------------|
| Próximo passo criado | `allFollowUps`, `completedFollowUps` |
| Sprint atualizada | `allSprints`, `sprintProgress` |
| Cronograma atualizado | `cronograma` |
| Backlog tarefa criada | `backlogTasks` |
| Pedido interno respondido | `internalRequests` |
| ATA criada | `atas` |

### Exemplo de uso:
```javascript
queryClient.invalidateQueries({ 
  queryKey: QUERY_KEYS.allFollowUps(workshopId) 
});
```

---

## 🎯 REFATORING DOS COMPONENTES EXISTENTES

### IniciarAtendimentoModal
**ANTES:**
```javascript
// 6 queries paralelas com staleTime diferente
const { data: allFollowUpsModal } = useQuery({...});
const { data: atendimentosHojeModal } = useQuery({...});
const { data: concluidosModal } = useQuery({...});
...
```

**DEPOIS:**
```javascript
const { 
  allFollowUps, 
  completedFollowUps,
  consultorAttendances,
  atas,
  workshop,
  workshopOwner 
} = useOperationalSync(followUp?.workshop_id, user?.id, user);

// Usar dados diretamente, sem múltiplas queries
```

### ClientDetailPanel
**ANTES:**
```javascript
// Dados recebidos como props, sem sincronização
const atendimentosCliente = client ? atendimentos.filter(...) : [];
```

**DEPOIS:**
```javascript
const { allSprints, cronograma, backlogTasks } = useOperationalSync(client?.id);

// Agora sincronizado automaticamente quando cliente muda
```

### BucketAtendimentosTab
**ANTES:**
```javascript
const { data: bucketItems } = useQuery({
  queryKey: ['bucket-atendimentos'],
  ...
});
```

**DEPOIS:**
```javascript
// Se BucketAtendimentosTab precisar de dados sincronizados
const { /* dados */ } = useOperationalSync(workshopId);

// Usar mesma invalidação strategy
```

---

## 📦 ESTRUTURA DE ARQUIVOS

```
hooks/
├─ useOperationalSync.js        (NOVO - centralizado)
├─ useOperationalSync.test.js   (testes)
└─ ...

components/
├─ aceleracao/
│  ├─ IniciarAtendimentoModal   (REFATORADO - usar hook)
│  ├─ ClientDetailPanel          (REFATORADO - usar hook)
│  ├─ BucketAtendimentosTab      (REFATORADO - usar hook)
│  └─ ...
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Criar `hooks/useOperationalSync.js`
- [ ] Refatorar `IniciarAtendimentoModal` para usar hook
- [ ] Refatorar `ClientDetailPanel` para usar hook
- [ ] Refatorar `BucketAtendimentosTab` para usar hook
- [ ] Testar invalidação de caches em tempo real
- [ ] Validar que dados sincronizam entre componentes
- [ ] Performance test: verificar se não há queries duplicadas

---

## 🚀 BENEFÍCIOS

1. **Single Source of Truth:** Todos os componentes usam mesmos dados
2. **Consistent Caching:** Mesmo staleTime, mesma invalidation strategy
3. **Better Performance:** Queries compartilhadas, sem duplicação
4. **Easier Testing:** Hook isolado, testável independentemente
5. **Future-proof:** Ready para Fase 3 (integração) e Fase 4 (persistência)