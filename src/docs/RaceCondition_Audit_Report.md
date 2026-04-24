# Relatório de Auditoria Race Conditions — 2026-04-24

## 🔴 Crítico (Corrigidos)

### 1. `pages/RegistrarAtendimento.jsx` — Async load sem cancelamento
**Problema:** O `useEffect` que carrega um atendimento via `ConsultoriaAtendimento.get()` não possuía cleanup.  
Se o usuário abrisse o modal com `atendimentoId=A`, fechasse rapidamente e reabrisse com `atendimentoId=B`, dois requests poderiam estar em voo simultaneamente. O response de B poderia chegar antes de A, e A sobrescreveria o formData correto com dados do atendimento errado.

**Fix aplicado:** Flag `cancelled = true` no cleanup do useEffect. O `setFormData` e o `toast.error` só executam se `!cancelled`.

---

### 2. `components/aceleracao/sprint-client/SprintClientModal.jsx` — Saves concorrentes
**Problema:** `handleToggleTask`, `handleUpdateEvidence` e `handleUpdateNotes` todos chamam `saveMutation.mutate(updatedPhases)` de forma independente. Se o usuário clicasse em duas tarefas rapidamente (ex: duplo clique ou dois checkboxes em sequência), dois saves seriam disparados quase simultaneamente.  
O segundo save usaria `[...phases]` lido do estado local — que ainda não refletia a mudança do primeiro save (o `setLocalPhases` do `onSuccess` ainda não teria rodado).  
**Resultado:** a segunda mutação sobrescreveria o estado no banco com dados sem a primeira mudança.

**Fix aplicado:** `savingRef.current` boolean guard. O segundo `mutationFn` retorna early se `savingRef.current === true`. Liberado em `onSuccess` e `onError`.

---

### 3. `components/aceleracao/SprintPhaseDetailModalRedesigned.jsx` — Duplo toast
**Problema:** `handleSave` chamava `persistPhases()` que internamente já faz `toast.success("Alteração salva com sucesso!")`, e depois `handleSave` fazia um segundo `toast.success("Fase salva com sucesso!")`. Resultado: dois toasts para cada save.

**Fix aplicado:** Removido o segundo `toast.success` do `handleSave`.

---

## 🟡 Atenção (Padrão — Não corrigido, monitorar)

### 4. `pages/RegistrarAtendimento.jsx` — Auto-save vs manual save concorrentes
**Problema:** O auto-save (debounce de 3s) e o `createMutation` (botão Salvar) podem disparar simultaneamente.  
**Cenário:** usuário altera o texto → auto-save aguarda 3s → antes dos 3s, clica "Salvar" → `createMutation` dispara → 3s depois, auto-save também dispara → dois PATCH simultâneos para o mesmo `formData.id`.  
**Impacto atual:** Baixo — ambos enviam o mesmo dado e o último a chegar "ganha" no banco. Não causa corrupção.  
**Recomendação:** Ao iniciar `createMutation`, cancelar o timer do auto-save com `clearTimeout(autoSaveTimerRef.current)`.

### 5. `pages/RegistrarAtendimento.jsx` — `handleClose` stale closure com timers
**Problema:** `closeTimerRef` chama `handleClose()` após 800ms. `handleClose` lê `formData` e `hasUnsavedChanges` via closure. Se o usuário editar algum campo entre o save e os 800ms, o confirm dialog pode disparar quando não deveria (ou não disparar quando deveria).  
**Impacto:** Baixo — janela de 800ms é muito pequena.  
**Recomendação:** Usar `useRef` para `hasUnsavedChanges` em vez de state, para garantir que o valor lido no callback do timer seja sempre o mais atual.

### 6. `SprintPhaseDetailModalRedesigned` — `useEffect` de sync sem `isSavingRef` em todas as deps
**Problema:** O `useEffect` que sincroniza estado local (linhas 71-79) usa `isSavingRef.current` como guard mas a dep array não inclui uma signal state para re-rodar quando o save termina.  
**Impacto:** Em teoria, se `freshSprint` chegar via refetch exatamente enquanto `isSavingRef.current === true`, a atualização é silenciosamente descartada. Na prática, o delay de 500ms no cleanup do `isSavingRef` minimiza isso.  
**Recomendação:** Criar um `savedVersion` state que incrementa em cada save, e usá-lo como dep do useEffect.

---

## 🟢 OK — Sem race condition

| Arquivo | Motivo |
|---------|--------|
| `SprintClientSection` | Subscribe + invalidateQueries é idempotente |
| `useDashboardSprints` | Apenas reads, sem mutações |
| `PainelClienteAceleracao` | Subscriptions com cleanup correto (`return unsubscribe`) |
| `AtendimentoModal` | Apenas wrapper, sem estado próprio |

---

## Próximos Passos Recomendados

1. **[ ] Auto-save vs manual save** — `clearTimeout(autoSaveTimerRef.current)` no início do `createMutation.mutationFn`
2. **[ ] `hasUnsavedChanges` como ref** — para evitar stale closure no close timer
3. **[ ] `savedVersion` signal no SprintPhaseDetailModal** — garantir sync após save