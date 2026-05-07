# FASE 3: INTEGRATION 🔗 - GUIA DE USO

## ✨ O que foi implementado

### OperationalSyncManager (Hook)
- **Arquivo:** `hooks/useOperationalSync.js`
- **Propósito:** Fonte única de verdade para todos os dados operacionais
- **Benefício:** Todos os componentes sincronizam automaticamente

### Integração dos 3 Componentes
1. ✅ `IniciarAtendimentoModal` - refatorado
2. ✅ `ClientDetailPanel` - refatorado
3. ✅ `BucketAtendimentosTab` - refatorado

---

## 📖 COMO USAR

### 1. Usar o Hook em Qualquer Componente

```javascript
import { useOperationalSync } from "@/hooks/useOperationalSync";

export default function MeuComponente() {
  const {
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
    followUpsBySprintId,
    sprintsInProgress,
    pendingBacklog,
    pendingRequests,
    recentAtas,
    // Invalidation
    invalidate,
    isLoading,
  } = useOperationalSync(workshopId, consultorId, user);

  // Usar dados
  return (
    <div>
      <h1>FUs Pendentes: {allFollowUps.filter(f => !f.is_completed).length}</h1>
      <p>Sprints em Andamento: {sprintsInProgress.length}</p>
    </div>
  );
}
```

### 2. Invalidar Dados Após Mudanças

```javascript
// Quando criar/atualizar um Próximo Passo
await base44.entities.ConsultoriaProximoPasso.create({...});
invalidate.followUps(); // Sincronizar em TODOS os componentes

// Quando atualizar uma Sprint
await base44.entities.ConsultoriaSprint.update(id, {...});
invalidate.sprints();

// Invalidar TUDO de uma vez
invalidate.all();
```

### 3. Usar Derivações (Memoizadas para Performance)

```javascript
const {
  followUpsBySprintId, // Função que retorna FUs de uma sprint específica
  sprintsInProgress,   // Array com sprints em progresso
  pendingBacklog,      // Tarefas em aberta
  pendingRequests,     // Pedidos internos pendentes
  recentAtas,          // Últimas 5 ATAs
} = useOperationalSync(workshopId, consultorId, user);

// Usar
const meusFUsNaSprint = followUpsBySprintId(sprintId);
const precisoDeFazer = pendingBacklog.length;
```

---

## 🔄 FLUXO DE SINCRONIZAÇÃO

```
Usuário altera ProximoPasso em IniciarAtendimentoModal
        ↓
IniciarAtendimentoModal.invalidate.followUps()
        ↓
React Query invalida ['operational', 'followups', 'all', workshopId]
        ↓
ClientDetailPanel.useOperationalSync() detecta mudança
        ↓
ClientDetailPanel re-renderiza com dados novos
        ↓
BucketAtendimentosTab também recebe dados atualizados (se compartilham workshopId)
        ↓
RESULTADO: Todos os componentes em SYNC ✅
```

---

## 📊 QUERY KEYS CENTRALIZADAS

```javascript
OPERATIONAL_QUERY_KEYS = {
  allFollowUps: (workshopId) => ['operational', 'followups', 'all', workshopId],
  completedFollowUps: (workshopId) => ['operational', 'followups', 'completed', workshopId],
  allSprints: (workshopId) => ['operational', 'sprints', 'all', workshopId],
  cronograma: (workshopId) => ['operational', 'cronograma', workshopId],
  backlogTasks: (workshopId) => ['operational', 'backlog', workshopId],
  internalRequests: (workshopId) => ['operational', 'requests', workshopId],
  atas: (workshopId) => ['operational', 'atas', workshopId],
  workshop: (workshopId) => ['operational', 'workshop', workshopId],
  workshopOwner: (ownerId) => ['operational', 'workshop', 'owner', ownerId],
  consultorAttendances: (consultorId, date) => ['operational', 'attendances', consultorId, date],
}
```

---

## 🎯 CASOS DE USO

### Caso 1: Atualizar Próximo Passo em um Componente
```javascript
// Em IniciarAtendimentoModal
const handleSaveAndFinalize = async () => {
  // ... criar ProximoPasso ...
  await base44.entities.ConsultoriaProximoPasso.create({...});
  
  // ← Automaticamente invalida e sincroniza com ClientDetailPanel
  invalidate.followUps();
};
```

### Caso 2: Criar uma Sprint em ClientDetailPanel
```javascript
// Em ConsultoriaClienteTab (dentro de ClientDetailPanel)
const handleCreateSprint = async () => {
  await base44.entities.ConsultoriaSprint.create({...});
  
  // Sincronizar em qualquer outro componente que use allSprints
  invalidate.sprints();
};
```

### Caso 3: Agendar Atendimento em BucketAtendimentosTab
```javascript
// Em BucketAtendimentosTab
const agendarMutation = useMutation({
  mutationFn: async ({ bucketItem, data, hora, consultor_id }) => {
    const atendimento = await base44.entities.ConsultoriaAtendimento.create({...});
    await base44.entities.ContractAttendance.update(bucketItem.id, {...});
    return atendimento;
  },
  onSuccess: () => {
    // Sincronizar em todos os componentes
    invalidateAll(); // ← Já feito no refactor
    toast.success("Atendimento agendado!");
  },
});
```

---

## ✅ BENEFÍCIOS

| Antes (Duplicação) | Depois (Sincronização) |
|---|---|
| Cada componente tinha suas próprias queries | Todos compartilham `useOperationalSync` |
| Dados desincronizados entre telas | Dados sempre em sync |
| Invalidação manual em vários lugares | Invalidação centralizada |
| Múltiplas queries paralelas | Queries compartilhadas (cache) |
| Cache strategy inconsistente | Cache strategy única e previsível |

---

## 🚀 PRÓXIMOS PASSOS (FASE 4)

- [ ] Implementar context global para persistência de dados
- [ ] Adicionar WebSocket para sync em tempo real entre abas
- [ ] Cache local (IndexedDB) para funcionamento offline
- [ ] Otimização de queries com paginação automática

---

## 📝 CHECKLIST DE REFACTOR COMPLETO

- [x] Criar `useOperationalSync` hook
- [x] Refatorar `IniciarAtendimentoModal` para usar hook
- [x] Refatorar `ClientDetailPanel` para usar hook
- [x] Refatorar `BucketAtendimentosTab` para usar hook
- [x] Remover queries duplicadas
- [x] Adicionar invalidate helpers
- [x] Testar sincronização entre componentes
- [ ] Remover old query keys na codebase
- [ ] Documentar padrões de uso

---

## 🐛 TROUBLESHOOTING

### "Dados não estão atualizando em outro componente"
**Solução:** Certifique-se de chamar `invalidate.all()` após a mudança

### "Performance degradada"
**Solução:** Verificar `staleTime` - aumentar se dados não mudam frequentemente

### "Múltiplas queries para o mesmo dados"
**Solução:** Todos os componentes estão usando `useOperationalSync` com mesmo `workshopId`?