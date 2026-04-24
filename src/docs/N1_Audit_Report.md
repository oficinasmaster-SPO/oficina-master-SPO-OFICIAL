# Relatório de Auditoria N+1 — 2026-04-24

## 🔴 Crítico (Corrigido)

### 1. `pages/Home.jsx` — Query dentro de queryFn
**Arquivo:** `pages/Home.jsx`  
**Problema:** `Diagnostic.filter({ user_id })` era chamado **dentro** do `queryFn` de `user-progress`.  
Isso significa que cada execução do hook disparava 2 requests encadeados (UserProgress → Diagnostic).  
Em React StrictMode (dev), isso dobrava para 4 requests desnecessários.

**Fix aplicado:** Diagnósticos movidos para query independente com `enabled: !!user?.id && !!tenant?.id`.  
O sync do checklist foi movido para um `useEffect` que roda apenas quando os dados mudam.

---

## 🟡 Atenção (Padrão Arquitetural — Monitorar)

### 2. `components/home/DashboardHub.jsx` — Fan-out de queries independentes
**Arquivo:** `components/home/DashboardHub.jsx`  
**Problema:** O componente dispara 6+ queries simultâneas ao montar:
- `internal-notices`
- `system-setting-tips`
- `system-setting-permissions`
- `current-employee`
- `user-diagnostics`
- `user-tasks`
- `user-notifications`
- `user-game-profile`

**Impacto:** 8 requests simultâneos ao abrir a Home. Não é N+1 clássico (não é loop), mas é fan-out excessivo.  
**Recomendação:** Criar um BFF (`functions/bffDashboard.js`) que agregue essas consultas em 1 única chamada ao backend.  
> Nota: `functions/bffDashboard.js` já existe — verificar se está sendo usado.

### 3. `pages/PainelClienteAceleracao.jsx` — Fallback em cadeia para Workshop
**Arquivo:** `pages/PainelClienteAceleracao.jsx` (linhas 44-64)  
**Problema:** O `queryFn` de workshop faz até 3 fetches em cadeia:
1. `Workshop.get(workshopIdToUse)`
2. `Workshop.filter({ owner_id: user.id })` (fallback)
3. `Workshop.filter({ email: user.email })` (fallback 2)

**Impacto:** Pior caso = 3 requests sequenciais para resolver o workshop. Para usuários sem `workshopIdToUse` salvo no perfil, isso sempre acontece.  
**Recomendação:** Consolidar a lógica no backend em um endpoint único `getMyWorkshop`.

### 4. `components/aceleracao/sprint-client/SprintClientSection.jsx` + `pages/PainelClienteAceleracao.jsx`
**Problema:** Ambos os componentes fazem queries separadas para `ConsultoriaSprint` com o mesmo `workshop_id`:
- `sprints-reais` (PainelClienteAceleracao)  
- `sprints-client` (SprintClientSection)

**Impacto:** 2 requests idênticos para a mesma entidade, com chaves de cache diferentes — os dados não são compartilhados.  
**Recomendação:** Usar uma única query key canônica (ex: `['sprints', workshopId]`) ou passar os sprints como prop para `SprintClientSection`.

### 5. `components/aceleracao/ControleAceleracaoView.jsx` → `DashboardOperacionalTabRedesigned`
**Problema:** O tab `dashboard-operacional` usa `forceMount` — o componente `DashboardOperacionalTabRedesigned` está sempre montado, mesmo quando não visível.  
**Impacto:** Queries do dashboard de sprints rodam mesmo quando o usuário está em outra aba.  
**Recomendação:** Usar `visitedTabs.has("dashboard-operacional")` como guard (igual ao padrão das outras abas).

---

## 🟢 OK — Sem N+1

| Arquivo | Motivo |
|---------|--------|
| `hooks/useDashboardSprints` | Usa `$in` batch query corretamente |
| `SprintPhaseDetailModalRedesigned` | Fetch único por sprint ID |
| `SprintClientSection` | Subscribe WebSocket em vez de polling |
| `PainelClienteAceleracao` | Subscribe WebSocket em vez de polling |

---

## Próximos Passos Recomendados

1. **[ ] Fix SprintClientSection N+2** — passar `sprints` como prop do `PainelClienteAceleracao` em vez de re-fetchar
2. **[ ] Fix Workshop fallback** — criar função `getMyWorkshop` no backend
3. **[ ] Fix forceMount DashboardOperacional** — montar apenas na primeira visita
4. **[ ] Avaliar BFF Dashboard** — verificar se `bffDashboard` cobre os 8 requests da Home