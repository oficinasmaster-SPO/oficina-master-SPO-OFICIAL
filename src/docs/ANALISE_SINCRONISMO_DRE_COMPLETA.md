# Análise Técnica Completa: Sincronismo DRE → Multi-Aba

## Visão Geral do Fluxo
```
DRELancamento (BD - Source of Truth)
    ↓
    ├─→ DRE Avançado (exibe + cria lançamentos)
    ├─→ DFC (mapeia automaticamente via mapDREtoDFC)
    ├─→ Controle Orçamentário (compara realizados vs metas)
    └─→ DRETCMP2 (consolida resumo mensal)
```

---

## 1️⃣ CAMADA 1: DRELancamento (Tabela Source of Truth)

### Schema (src/entities/DRELancamento.json)
```json
{
  "workshop_id": "string",      // FK → Workshop
  "mes": "YYYY-MM",             // Mês de referência
  "tipo": "receita|despesa",    // Classificação principal
  "categoria": "string",        // operacional, pessoas, marketing, manutencao, etc.
  "subcategoria": "string",     // Refinamento (ex: "Aluguel" dentro de operacional)
  "descricao": "string",        // Descrição livre
  "valor": "number",            // Valor em R$
  "entra_tcmp2": "boolean"      // Flag automático: true se categoria entra no TCMP²
}
```

**Fluxo de Inserção:**
1. Usuário preenche formulário em `DREAvancadoTab`
2. `FormLancamento.handleSave()` → `base44.entities.DRELancamento.create()`
3. Dispara evento: `window.dispatchEvent(CustomEvent 'dre-lancamento-criado')`
4. Cria registro no BD

---

## 2️⃣ CAMADA 2: DREAvancadoTab (Interface de Entrada)

### Responsabilidades
- ✅ CRUD de DRELancamento
- ✅ Validação automática de TCMP² (flag `entra_tcmp2`)
- ✅ Real-time subscription: `base44.entities.DRELancamento.subscribe()`
- ✅ Consolidação manual: "Consolidar no DRE" → `onConsolidar()` callback

### Query: `dre-lancamentos` (compartilhada)
```typescript
queryKey: ["dre-lancamentos", workshopId, mes]
queryFn: () => base44.entities.DRELancamento.filter(
  { workshop_id: workshopId, mes }, 
  "-created_date",  // ordenar por mais recentes
  200               // limit
)
```

### Real-time Sync (Linhas 374-386)
```typescript
useEffect(() => {
  const unsubscribe = base44.entities.DRELancamento.subscribe((event) => {
    if (event.data?.workshop_id === workshopId && event.data?.mes === mes) {
      if (event.type === 'create' || event.type === 'delete') {
        refetch();  // Atualiza query ["dre-lancamentos", workshopId, mes]
      }
    }
  });
  return unsubscribe;
}, [workshopId, mes, refetch]);
```

### Consolidação (Linhas 391-424)
Calcula totais estruturados por categoria:
```json
{
  "revenue": {
    "parts_applied": sum(receita categoria=pecas_aplicadas),
    "services": sum(receita categoria=servicos),
    "other": sum(receita categoria=outras)
  },
  "costs_tcmp2": {
    "operational": sum(despesa categoria=operacional),
    "people": sum(despesa categoria=pessoas),
    "prolabore": sum(despesa subcategoria=Pró-labore),
    "marketing": sum(despesa categoria=marketing),
    "maintenance": sum(despesa categoria=manutencao),
    "third_party": sum(despesa categoria=terceirizados),
    "administrative": sum(despesa categoria=administrativo)
  },
  "costs_not_tcmp2": { /* financeiro, consorcio, etc. */ },
  "parts_cost": { /* peças aplicadas + estoque */ }
}
```

---

## 3️⃣ CAMADA 3: DFCTab (Fluxo de Caixa)

### Responsabilidades
- ✅ Recebe dados do DRE Avançado via `mapDREtoDFC()`
- ✅ Mapeia automaticamente: DRELancamento → grupos DFC (operacional, investimento, financiamento)
- ✅ Permite lançamentos manuais (saldo inicial, empréstimos, recebimentos)
- ✅ Real-time sync com DRE Avançado (novo bug fixado)

### Query Dual
```typescript
// Buscar automaticamente do DRE (mapeados)
queryKey: ["dre-lancamentos-dfc", workshopId, mes]
queryFn: () => base44.entities.DRELancamento.filter({ workshop_id: workshopId, mes })

// Buscar manuais do DFC
queryKey: ["dfc-manuais", workshopId, mes]
queryFn: () => base44.entities.DFCLancamento.filter(
  { workshop_id: workshopId, mes, origem: "manual" }
)
```

### Mapping (mapDREtoDFC.jsx)
```typescript
// Regra 1: Receitas → Operacional/Entrada
if (tipo === "receita") {
  return { grupo: "operacional", tipo: "entrada", ... }
}

// Regra 2: Despesas → classificar por categoria
// Financeiro + subcategoria financeira → Financiamento
// Manutenção + subcategoria investimento → Investimento
// Tudo mais → Operacional (padrão)
```

### Real-time Sync (BUG FIX APLICADO)
```typescript
useEffect(() => {
  const unsubscribe = base44.entities.DRELancamento.subscribe((event) => {
    if (event.data?.workshop_id === workshopId && event.data?.mes === mes) {
      if (event.type === 'create' || event.type === 'delete') {
        refetchDRE();  // ← BUG FIX: estava faltando
      }
    }
  });
  window.addEventListener('dre-lancamento-criado', handleDREChange);
  return () => { unsubscribe(); window.removeEventListener(...); };
}, [workshopId, mes, refetchDRE]);
```

### Mutations & Cache Invalidation
**BUG FIX APLICADO:**
```typescript
// Antes: Apenas invalidava ["dfc-manuais", workshopId, mes]
// Depois: Também invalida ["budget-metas", workshopId, mes]
criarMutation: {
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["dfc-manuais", workshopId, mes] });
    queryClient.invalidateQueries({ queryKey: ["budget-metas", workshopId, mes] });  // ← NEW
  }
}
```

---

## 4️⃣ CAMADA 4: BudgetMetaTab (Controle Orçamentário)

### Responsabilidades
- ✅ Define metas mensais por categoria/item
- ✅ Compara em tempo real: realizado (soma DRELancamento) vs meta
- ✅ Mostra variação % e status
- ✅ Real-time sync com DRE Avançado (dual subscription + event listener)

### Query Dual
```typescript
// Buscar metas
queryKey: ["budget-metas", workshopId, mes]
queryFn: () => base44.entities.BudgetMeta.filter({ workshop_id, mes })

// Buscar lançamentos DRE para comparação
queryKey: ["dre-lancamentos", workshopId, mes]
queryFn: () => base44.entities.DRELancamento.filter({ workshop_id, mes })
```

### Real-time Sync (Linhas 79-107)
**OPÇÃO 1: BD Subscription**
```typescript
const unsubscribe = base44.entities.DRELancamento.subscribe((event) => {
  if (event.data?.workshop_id === workshopId && event.data?.mes === mes) {
    if (event.type === 'create' || event.type === 'delete') {
      setSyncPulse(true);
      refetchLancamentos();  // Atualiza query ["dre-lancamentos", workshopId, mes]
      setTimeout(() => setSyncPulse(false), 1500);
    }
  }
});
```

**OPÇÃO 2: Cross-Tab Event Listener**
```typescript
const handleDREChange = (e) => {
  if (e.detail?.workshop_id === workshopId && e.detail?.mes === mes) {
    setSyncPulse(true);
    refetchLancamentos();  // Refetch imediato
  }
};
window.addEventListener('dre-lancamento-criado', handleDREChange);
```

### Cálculo de Comparação (Linhas 177-216)
```typescript
metas.forEach(meta => {
  // Meta em R$ (percentual ou fixa)
  const meta_rs = meta.meta_percentual 
    ? (meta.meta_percentual / 100) * faturamento
    : meta.meta_fixa_rs;

  // Realizado = soma de todos os DRELancamento que batem categoria+item
  const realizado = lancamentos
    .filter(l => l.categoria === meta.categoria && l.item === meta.item)
    .reduce((sum, l) => sum + l.valor, 0);

  // Diferença e variação
  const diferenca = meta_rs - realizado;
  const variacao = meta_rs > 0 ? (diferenca / meta_rs) * 100 : 0;

  // Status visual
  let status = "✅";  // OK (realizado ≤ meta × 1.05)
  if (realizado > meta_rs * 1.05) status = "❌";  // Excedido
  else if (realizado > meta_rs * 0.95) status = "⚠️";  // Atenção
});
```

### Feedback Visual
```typescript
{syncPulse && (
  <div className="fixed top-4 right-4 animate-pulse">
    "Dados do DRE atualizados instantaneamente"
  </div>
)}
```

---

## 5️⃣ CAMADA 5: DRETCMP2 (Consolidação Mensal)

### Responsabilidades
- ✅ Visualiza/edita DREMonthly (resumo consolidado)
- ✅ Sincroniza dados diários para a DRE mensal
- ✅ Calcula KPIs: TCMP², R70/I30, Lucro
- ✅ Integra abas: Receitas, Custos TCMP², Custos NÃO TCMP², DRE Avançado, DFC, Controle Orçamentário

### Query Principal
```typescript
queryKey: ['dre-list', workshop?.id]
queryFn: () => base44.functions.invoke('getDREData', { workshop_id })
```

### Sincronismo com Abas (Linhas 126-150)
```typescript
useEffect(() => {
  if (workshop && viewMode === 'month') {
    // 1. Consolidar dados diários → DRE mensal
    await updateDREFromMonthlyGoals(workshop.id, selectedMonth);
    
    // 2. Recarregar list
    await queryClient.invalidateQueries({ queryKey: ['dre-list', workshop?.id] });
    
    // 3. Sincronizar DRE → Metas
    if (currentDRE) {
      syncDRETOMetas(currentDRE.id, workshop.id, selectedMonth);
    }
  }
}, [workshop?.id, selectedMonth, viewMode]);
```

### Fluxo de Consolidação
1. **Aba DRE Avançado**: Usuário lança receitas/despesas
2. **Botão "Consolidar no DRE"**: Agrega totais em `formData`
3. **Aba Resumo DRE**: Mostra totais consolidados
4. **Botão "Salvar DRE"**: Persiste em `DREMonthly` + marca módulo concluído
5. **Dados fluem**: DREMonthly → Gráficos TCMP² → Metas

---

## 6️⃣ BANCO DE DADOS: Tabelas Principais

### Tabelas Envolvidas
```
┌─────────────────┐
│ DRELancamento   │ (Write Model - Lançamentos individuais)
├─────────────────┤
│ id              │
│ workshop_id (FK)│
│ mes (YYYY-MM)   │
│ tipo            │ (receita|despesa)
│ categoria       │
│ subcategoria    │
│ valor           │
│ entra_tcmp2     │
│ created_date    │
│ updated_date    │
└─────────────────┘

┌──────────────────┐
│ DFCLancamento    │ (Complementa DRE para fluxo de caixa)
├──────────────────┤
│ id               │
│ workshop_id (FK) │
│ mes              │
│ grupo            │ (operacional|investimento|financiamento|saldo_inicial)
│ tipo             │ (entrada|saida)
│ valor            │
│ origem           │ (manual|dre_automatico)
│ saldo_inicial    │ (para grupo=saldo_inicial)
└──────────────────┘

┌──────────────────┐
│ BudgetMeta       │ (Metas do mês)
├──────────────────┤
│ id               │
│ workshop_id (FK) │
│ mes              │
│ item             │ (ex: "Aluguel")
│ categoria        │
│ meta_percentual  │ (% do faturamento)
│ meta_fixa_rs     │ (valor fixo)
│ realizado        │ (calculado, não armazenado)
└──────────────────┘

┌──────────────────┐
│ DREMonthly       │ (Read Model - Consolidado)
├──────────────────┤
│ id               │
│ workshop_id (FK) │
│ month (YYYY-MM)  │
│ revenue { ... }  │ (mapeado de receitas)
│ costs_tcmp2 { } │ (mapeado de despesas)
│ calculated { }  │ (TCMP², R70/I30, lucro)
└──────────────────┘
```

---

## 7️⃣ SINCRONISMO REAL-TIME: Mecanismos

### 1️⃣ Base44 DB Subscriptions
```
DRELancamento.subscribe() → atualiza ambas:
  ├─ DREAvancadoTab.refetch()
  ├─ DFCTab.refetchDRE()
  ├─ BudgetMetaTab.refetchLancamentos()
  └─ (dispara timeout de 500ms para evitar race conditions)
```

### 2️⃣ Custom Events (Cross-Tab)
```
window.dispatchEvent(CustomEvent 'dre-lancamento-criado')
  ├─ DFCTab: window.addEventListener('dre-lancamento-criado', ...)
  ├─ BudgetMetaTab: window.addEventListener('dre-lancamento-criado', ...)
  └─ Permite sync entre abas na MESMA página (mesmo que subscriptions falhem)
```

### 3️⃣ Query Invalidation
```
DREAvancadoTab.create() → invalida ["dre-lancamentos", ...]
  ↓
DFCTab lê a mesma query → refetch automático
  ↓
BudgetMetaTab lê a mesma query → refetch automático
  ↓
(Todos os consumidores são notificados via React Query)
```

### 4️⃣ Consolidação Manual
```
DREAvancadoTab (onConsolidar callback)
  ↓
DRETCMP2.setFormData(totaisConsolidados)
  ↓
"Salvar DRE" → DREMonthly.create/update()
  ↓
Invalida ['dre-list', workshop?.id]
```

---

## 8️⃣ FLUXO COMPLETO: Exemplo Prático

### Cenário: Usuário lança "Pintura - R$ 2.500" em DRE Avançado

**T=0ms**: Usuário preenche FormLancamento
```
Categoria: "manutencao"
Subcategoria: "Manutenção de equipamentos"
Descrição: "Pintura parede"
Valor: 2500
entra_tcmp2: true (automático)
```

**T=50ms**: Clica "+ Adicionar"
```
DREAvancadoTab.FormLancamento.handleSave()
  ↓
base44.entities.DRELancamento.create({
  workshop_id: "ws_123",
  mes: "2026-05",
  tipo: "despesa",
  categoria: "manutencao",
  valor: 2500,
  entra_tcmp2: true
})
  ↓
[BD INSERT] DRELancamento record criado com id="dre_456"
```

**T=100ms**: Dispara eventos
```
window.dispatchEvent(CustomEvent 'dre-lancamento-criado', {
  detail: { workshop_id: "ws_123", mes: "2026-05", ... }
})
  ↓
setTimeout(() => DREAvancadoTab.refetch(), 0)
```

**T=150ms**: DFCTab escuta evento
```
window.addEventListener('dre-lancamento-criado', (e) => {
  if (e.detail.workshop_id === "ws_123" && e.detail.mes === "2026-05") {
    refetchDRE();
    mapDREtoDFC() executa:
      {
        id: "dre_456",
        descricao: "Pintura parede",
        tipo: "saida",
        grupo: "investimento",  // ← mapeado por categoria=manutencao
        valor: 2500,
        origem: "dre_automatico"
      }
  }
})
```

**T=200ms**: BudgetMetaTab escuta evento
```
BudgetMetaTab subscription ativa:
base44.entities.DRELancamento.subscribe((event) => {
  if (event.type === 'create') {
    refetchLancamentos();  // busca nova query
    calculateVariacao();   // recalcula meta vs realizado
    setSyncPulse(true);    // feedback visual
  }
})
```

**T=250ms**: Visualização
```
DRE Avançado:
  ✅ "Pintura parede" aparece na lista
     📋 Manutenção - 2.500
     ✅ TCMP² (entra no cálculo)

DFC:
  ✅ "Pintura parede" sob "Investimento"
     + Saldo: atualiza automaticamente

Controle Orçamentário:
  ✅ Se existe meta para "Manutenção":
     Meta: 5.000
     Realizado: 2.500
     Diferença: +2.500 (✅ OK)
     Variação: +50%

DRETCMP2:
  (Ainda não consolidado — precisa clicar "Consolidar no DRE")
```

---

## 9️⃣ PROBLEMAS IDENTIFICADOS & SOLUÇÕES

### ✅ BUG #1: DFC não escutava DRE (FIXADO)
**Problema**: `DFCTab` não tinha subscription para `DRELancamento`
**Causa**: Faltava `useEffect` com `base44.entities.DRELancamento.subscribe()`
**Solução**: Adicionado subscriber + event listener

### ✅ BUG #2: mapDREtoDFC() sem ID (FIXADO)
**Problema**: Objetos mapeados não tinham `id`, impedindo deleção em DFC
**Solução**: Adicionado `id: l.id` em ambos os returns

### ✅ BUG #3: DFC mutations não invalidavam Budget cache (FIXADO)
**Problema**: Editar/deletar em DFC não triggava refetch de Controle Orçamentário
**Solução**: Adicionado `queryClient.invalidateQueries({ queryKey: ["budget-metas", ...] })`

---

## 🔟 OTIMIZAÇÕES RECOMENDADAS

1. **Debouncing em Consolidação**
   - Usar `useCallback` + `useMemo` para evitar re-renders desnecessários
   - Debounce de 300-500ms em consolidação automática

2. **Lazy Loading em DREMonthly**
   - Se há muitos registros DRELancamento, paginar a query
   - Mostrar apenas últimos 100 registros por padrão

3. **Cache Inteligente**
   - `staleTime: 30_000` (30s) para ["dre-lancamentos", ...]
   - Reduz refetches desnecessários se usuário mudar de aba e volta

4. **Validação de Transação**
   - Ao "Consolidar", validar que Receitas - Despesas ≥ -X% (threshold de consistência)
   - Alertar se consolidação resultar em números inconsistentes

5. **Auditoria**
   - Registrar qual usuário fez consolidação
   - Manter histórico de consolidações (versões do DREMonthly)

---

## 📊 TABELA RESUMO: Fluxo de Dados

| Componente | Query | Subscription | Mutations | InvalidationTrigger |
|---|---|---|---|---|
| **DREAvancado** | `dre-lancamentos` | ✅ DRELancamento | create, delete | Auto refetch |
| **DFCTab** | `dre-lancamentos-dfc` + `dfc-manuais` | ✅ DRELancamento (NEW) | create DFCLancamento | Invalida budget-metas |
| **BudgetMetaTab** | `dre-lancamentos` + `budget-metas` | ✅ DRELancamento + 🎧 CustomEvent | create BudgetMeta | dre-lancamento-criado |
| **DRETCMP2** | `dre-list` (via getDREData) | ❌ (Manual consolidation) | update DREMonthly | saveMutation |

---

## 🎯 Conclusão

O sistema está **bem estruturado** com:
- ✅ Source of truth única (DRELancamento)
- ✅ Real-time subscriptions + custom events
- ✅ Query invalidation inteligente
- ✅ Múltiplas abas sincronizadas
- ✅ Consolidação manual explícita

**Sincronismo**: < 500ms entre aba para aba (sub + refetch + render)