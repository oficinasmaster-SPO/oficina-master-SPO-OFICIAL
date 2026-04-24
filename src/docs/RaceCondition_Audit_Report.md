# Relatório de Auditoria — Race Conditions & useEffect Leaks
**Última atualização:** 2026-04-24

---

## 🔴 CORRIGIDOS — Críticos

### 1. `pages/RegistrarAtendimento` — Async load sem cleanup
**Problema:** `useEffect` que carrega atendimento via `.get()` não cancelava a operação ao trocar de `atendimentoId`. Dois requests podiam estar em voo: o segundo chegava primeiro, e o primeiro sobrescrevia o estado correto.  
**Fix:** Flag `cancelled = true` no cleanup. `setFormData` e `toast.error` só executam se `!cancelled`.

---

### 2. `pages/RegistrarAtendimento` — Auto-save vs manual save concorrentes
**Problema:** O auto-save (debounce 3s) e o `createMutation` (botão Salvar) podiam disparar simultaneamente, gerando dois PATCH concorrentes para o mesmo registro.  
**Fix:** `createMutation.mutationFn` cancela o timer do auto-save com `clearTimeout(autoSaveTimerRef.current)` antes de executar.

---

### 3. `components/aceleracao/sprint-client/SprintClientModal` — Saves concorrentes no toggle
**Problema:** `handleToggleTask`, `handleUpdateEvidence` e `handleUpdateNotes` chamam `saveMutation.mutate()` independentemente. Dois cliques rápidos geravam duas mutações; a segunda lia `phases` antes do `setLocalPhases` do primeiro completar, sobrescrevendo dados no banco.  
**Fix:** `savingRef.current` boolean guard no início de `mutationFn`. Liberado em `onSuccess` e `onError`.

---

### 4. `components/aceleracao/SprintPhaseDetailModalRedesigned` — Duplo toast no handleSave
**Problema:** `handleSave` chamava `persistPhases()` (que já faz `toast.success`) e depois chamava outro `toast.success`. Dois toasts por save.  
**Fix:** Removido o segundo `toast.success` do `handleSave`.

---

### 5. `components/aceleracao/ConsultoriaClienteTab` — toggleMissao com save automático não intencional
**Problema:** `toggleMissao` chamava tanto `setMissoesSelecionadas(local)` quanto `handleSetMissoesSelecionadas(api)` ao mesmo tempo — toda vez que o usuário clicava em uma missão, uma operação de API era disparada imediatamente (além de qualquer save manual). Isso criava writes redundantes e potenciais writes concorrentes se o usuário clicasse rápido em múltiplas missões.  
**Fix:** Removida a chamada a `handleSetMissoesSelecionadas` dentro de `toggleMissao`. Persiste apenas ao clicar "Salvar Trilha".

---

### 6. `components/aceleracao/ConsultoriaClienteTab` — `loadSprints` sem cleanup de AbortController
**Problema:** `CamadaSprints.loadSprints` era `useCallback` chamado num `useEffect` sem cleanup. Ao trocar de cliente, o componente desmontava antes do fetch completar, e `setSprints`/`setLoadError` eram chamados num componente já desmontado (React warning + potencial estado fantasma).  
**Fix:** `useEffect` agora cria `AbortController` e chama `loadSprints(controller.signal)`. Cleanup faz `controller.abort()`. `loadSprints` verifica `signal?.aborted` antes de cada `setState`.

---

### 7. `components/aceleracao/ConsultoriaClienteTab` — `loadSelectedMissions` sem cleanup
**Problema:** `useEffect` de `loadSelectedMissions` não tinha flag de cancelamento. Ao trocar de cliente (`workshopId` mudava), o request anterior podia completar depois do novo, sobrescrevendo `missoesSelecionadas` com dados do cliente errado.  
**Fix:** Flag `cancelled = true` no cleanup do `useEffect`. Todos os `setState` verificam `!cancelled`.

---

## 🟡 ATENÇÃO — Monitorar (não corrigidos, baixo impacto atual)

### 8. `pages/RegistrarAtendimento` — `hasUnsavedChanges` como state (stale closure no timer)
**Problema:** `closeTimerRef` chama `handleClose()` após 800ms via closure. `handleClose` lê `hasUnsavedChanges` do state — que pode ser stale se o usuário editar algo entre o save e os 800ms.  
**Impacto:** Muito baixo — janela de 800ms.  
**Recomendação:** Converter `hasUnsavedChanges` para `useRef` para garantir valor atual no callback do timer.

### 9. `components/aceleracao/SprintPhaseDetailModalRedesigned` — useEffect de sync sem signal de "save terminou"
**Problema:** O `useEffect` de sync (linhas 71-79) usa `isSavingRef.current` como guard mas não tem dep que force re-run quando o save termina. Se `freshSprint` chegar exatamente durante o save (via refetch), a atualização é descartada silenciosamente.  
**Impacto:** Baixo — o delay de 500ms no cleanup de `isSavingRef` minimiza a janela.  
**Recomendação:** Adicionar `savedVersion` counter como state e incluir nas deps do useEffect.

### 10. `components/aceleracao/ConsultoriaClienteTab` — `handleSetMissoesSelecionadas` sem debounce
**Problema:** O botão "Salvar Trilha" pode ser clicado várias vezes rapidamente. Cada clique faz uma sequência de `filter` + `update/create` + loop de `delete`. Não há guard contra cliques múltiplos além do `salvando` state (que tem um pequeno lag entre setState e o próximo render).  
**Impacto:** Baixo — o `disabled={salvando}` evita a maioria dos casos.  
**Recomendação:** Adicionar `savingRef` boolean para bloquear no início de `handleSalvarTrilha` antes do primeiro await.

---

## 🟢 OK — Sem race conditions

| Arquivo | Motivo |
|---------|--------|
| `components/aceleracao/AtendimentoModal` | Apenas wrapper ESC handler com cleanup correto |
| `pages/Home` | Queries independentes via react-query, sem mutações concorrentes |
| `components/aceleracao/DashboardOperacionalTabRedesigned` | Sem state async próprio, usa `useDashboardSprints` |
| `components/aceleracao/PlanoAceleracaoMensal` | Apenas reads (react-query) + callbacks upward |
| `components/aceleracao/SprintClientSection` | Subscribe com cleanup (`return unsubscribe`) |
| `components/aceleracao/hooks/useDashboardSprints` | Apenas reads via react-query |

---

## Próximos Passos

- [ ] **#8** — Converter `hasUnsavedChanges` para `useRef` em `RegistrarAtendimento`
- [ ] **#9** — `savedVersion` signal no `SprintPhaseDetailModalRedesigned`
- [ ] **#10** — `savingRef` guard no `handleSalvarTrilha` de `ConsultoriaClienteTab