# 📊 FASE 4 - CONTROLE ORÇAMENTÁRIO ANUAL

**Status:** ✅ Implementado  
**Data:** 2026-05-17

---

## 🎯 OBJETIVO

Adicionar sistema de **metas anuais** com acompanhamento acumulado no Controle Orçamentário.

---

## ✅ ENTREGÁVEIS

### 4.1 ATUALIZAÇÃO: ENTITY BUDGETMETA

**Arquivo:** `entities/BudgetMeta.json`

**Novos campos:**
```json
{
  "periodicidade": {
    "type": "string",
    "enum": ["mensal", "anual"],
    "default": "mensal"
  },
  "meta_anual_rs": {
    "type": "number",
    "description": "Meta anual em R$ (quando periodicidade=anual)"
  },
  "meta_acumulada_mes": {
    "type": "number",
    "description": "Meta acumulada até este mês (calculado: meta_anual / 12 * número do mês)"
  }
}
```

**Funcionalidade:**
- Permite criar metas com periodicidade **mensal** ou **anual**
- Metas anuais são distribuídas automaticamente para 12 meses
- Campo `meta_acumulada_mes` calcula progresso acumulado

---

### 4.2 COMPONENTE: METAANUALEDITOR

**Arquivo:** `components/budgetcontrol/MetaAnualEditor.jsx`

**Funcionalidades:**
- Input de **meta anual** em R$
- Cálculo automático: **meta mensal = meta anual / 12**
- Toggle: **Distribuir igualmente** | **Editar mês a mês**
- Validação: soma dos meses deve bater com meta anual

**UI:**
```
┌─ Meta Anual - Faturamento Total ─────┐
│ 💰 Meta Anual (R$)                    │
│ [R$ 60.000,00]  → Mensal: R$ 5.000,00│
│                                        │
│ ☑️ Distribuir igualmente               │
│                                        │
│ [💾 Salvar Meta Anual]                │
└────────────────────────────────────────┘
```

**Quando "Distribuir igualmente" está DESATIVADO:**
```
┌─ Distribuição Mensal Personalizada ──┐
│ Jan   Fev   Mar   Abr   ...  Dez     │
│ [5000][5000][5000][5000]     [5000]  │
│                                        │
│ Total: R$ 60.000,00 ✅                │
└────────────────────────────────────────┘
```

---

### 4.3 BACKEND FUNCTION: SINCRONIZARMETASANUAIS

**Arquivo:** `functions/sincronizarMetasAnuais.js`

**Input:**
```json
{
  "workshop_id": "xyz",
  "ano": 2026,
  "item": "Faturamento Total",
  "categoria": "geral",
  "tipo": "receita",
  "meta_anual_rs": 60000,
  "distribuicao": "igual" | "personalizada",
  "metas_mensais": [...] // opcional
}
```

**Lógica:**
1. Calcula distribuição mensal (igual ou personalizada)
2. Para cada mês (jan-dez):
   - Busca `BudgetMeta` existente
   - **Atualiza** se existir
   - **Cria** se não existir
3. Define campos:
   - `periodicidade: "anual"`
   - `meta_anual_rs`
   - `meta_fixa_rs` (valor do mês)
   - `meta_acumulada_mes` (acumulado até o mês)

**Output:**
```json
{
  "success": true,
  "message": "Meta anual de R$ 60.000,00 sincronizada para Faturamento Total",
  "meses_atualizados": 12,
  "distribuicao": "igual"
}
```

---

### 4.4 COMPONENTE: BUDGETCONSOLIDADOANUAL

**Arquivo:** `components/budgetcontrol/BudgetConsolidadoAnual.jsx`

**KPIs (4 cards):**
1. **Meta Anual**: R$ 60.000,00
   - Mostra média mensal
2. **Realizado Acumulado**: R$ 55.000,00
   - Mostra % de atingimento
3. **% Atingimento**: 92%
   - Verde se ≥ 100%, âmbar se < 100%
4. **Restante**: R$ 5.000,00
   - Verde se falta atingir, vermelho se passou

**Gráfico:**
- **Barras**: Meta vs Realizado por mês
- **Linha**: Meta acumulada
- Eixo X: Jan, Fev, Mar... Dez
- Eixo Y: Valores em R$

**Tabela:**
| Mês | Meta | Realizado | % Atingimento | Meta Acumulada | Realizado Acumulado |
|-----|------|-----------|---------------|----------------|---------------------|
| Jan | R$ 5k | R$ 4.5k | 90% | R$ 5k | R$ 4.5k |
| Fev | R$ 5k | R$ 5.2k | 104% | R$ 10k | R$ 9.7k |
| ... | ... | ... | ... | ... | ... |

---

### 4.5 ATUALIZAÇÃO: BUDGETMETATAB

**Arquivo:** `components/budgetcontrol/BudgetMetaTab.jsx`

**Toggle no topo:**
```
[📅 Visão Mensal] | [📊 Visão Anual]
```

**Visão Mensal (existente):**
- Lista de metas do mês
- Comparação Real vs Meta
- Cards resumo, barras de progresso, etc.

**Visão Anual (nova):**
1. **MetaAnualEditor**: Configura meta anual
2. **BudgetConsolidadoAnual**: Mostra KPIs, gráfico e tabela

**Queries:**
```javascript
// Visão mensal (já existe)
queryKey: ["budget-metas", workshopId, mes]

// Visão anual (nova)
queryKey: ["budget-metas-anuais", workshopId, anoSelecionado]
queryKey: ["dre-realizados-ano", workshopId, anoSelecionado]
```

---

## 📊 TELAS

### Visão Mensal (Existente)
```
┌─ Controle Orçamentário ──────────────┐
│ [📅 Visão Mensal] [📊 Visão Anual]   │
│                                       │
│ ⚙️ Configurar Metas do Mês           │
│ [+ Nova Meta]                         │
│                                       │
│ ┌─ Aluguel - operacional ──────────┐ │
│ │ Meta: R$ 5.000 | Real: R$ 4.800  │ │
│ │ ✅ +R$ 200                        │ │
│ └───────────────────────────────────┘ │
│                                       │
│ 📊 Comparação: Real vs Meta          │
│ [Tabela com todas as metas]          │
└───────────────────────────────────────┘
```

### Visão Anual (Nova)
```
┌─ Controle Orçamentário ──────────────┐
│ [📅 Visão Mensal] [📊 Visão Anual]   │
│                                       │
│ ┌─ Meta Anual - Faturamento Total ──┐│
│ │ 💰 Meta Anual (R$)                 ││
│ │ [60.000,00] → Mensal: 5.000,00    ││
│ │ ☑️ Distribuir igualmente            ││
│ │ [💾 Salvar Meta Anual]             ││
│ └────────────────────────────────────┘│
│                                       │
│ ┌─ KPIs Anuais ─────────────────────┐│
│ │ Meta: R$ 60k | Realizado: R$ 55k  ││
│ │ Atingimento: 92% | Restante: R$ 5k││
│ └────────────────────────────────────┘│
│                                       │
│ 📊 Acompanhamento Mensal - 2026      │
│ [Gráfico: Barras + Linha]            │
│                                       │
│ 📋 Detalhamento por Mês              │
│ [Tabela Jan-Dez]                     │
└───────────────────────────────────────┘
```

---

## 🔧 COMO USAR

### Configurar Meta Anual

1. Acessar **Controle Orçamentário**
2. Clicar em **📊 Visão Anual**
3. Preencher **Meta Anual (R$)**
4. Escolher distribuição:
   - ☑️ **Distribuir igualmente** (automático)
   - ☐ **Editar mês a mês** (personalizado)
5. Clicar em **💾 Salvar Meta Anual**

**Resultado:**
- Sistema cria 12 registros `BudgetMeta` (jan-dez)
- Cada mês com sua meta proporcional
- Campo `meta_acumulada_mes` calculado automaticamente

---

### Acompanhar Progresso Anual

**Após salvar meta anual:**

1. **KPIs** mostram:
   - Meta total anual
   - Realizado acumulado (soma jan-mês atual)
   - % de atingimento
   - Quanto falta para bater meta

2. **Gráfico** mostra:
   - Barras azuis: Meta de cada mês
   - Barras verdes: Realizado de cada mês
   - Linha laranja: Meta acumulada

3. **Tabela** mostra:
   - Cada mês com meta, realizado e % atingimento
   - Colunas de acumulado (meta e realizado)

---

## 🧪 TESTES

### Teste 1: Criar Meta Anual

```bash
# Acessar Controle Orçamentário
# Clicar em "📊 Visão Anual"
# Preencher: Meta Anual = 60000
# Manter "Distribuir igualmente" ativado
# Clicar em "Salvar Meta Anual"

# Verificar:
# ✅ Toast de sucesso aparece
# ✅ 12 registros BudgetMeta criados no DB
# ✅ Cada mês com meta_fixa_rs = 5000
# ✅ meta_acumulada_mes = 5000, 10000, 15000...
```

### Teste 2: Visão Anual com Dados

```bash
# Após criar meta anual
# Verificar:
# ✅ Card "Meta Anual": R$ 60.000,00
# ✅ Card "Realizado Acumulado": soma dos realizados
# ✅ Card "% Atingimento": (realizado / meta) * 100
# ✅ Card "Restante": meta - realizado
# ✅ Gráfico mostra 12 meses
# ✅ Tabela Jan-Dez preenchida
```

### Teste 3: Alternar Visão Mensal/Anual

```bash
# Clicar em "📅 Visão Mensal"
# Verificar:
# ✅ UI mensal tradicional aparece
# ✅ Metas do mês selecionado

# Clicar em "📊 Visão Anual"
# Verificar:
# ✅ UI anual aparece
# ✅ KPIs, gráfico e tabela anuais
```

---

## 📊 FLUXO DE DADOS

```
1. Usuário configura meta anual (R$ 60k)
   ↓
2. MetaAnualEditor chama sincronizarMetasAnuais
   ↓
3. Function cria 12 BudgetMeta (jan-dez)
   - meta_anual_rs: 60000
   - meta_fixa_rs: 5000 (cada mês)
   - meta_acumulada_mes: 5000, 10000, 15000...
   ↓
4. BudgetConsolidadoAnual busca:
   - metas: 12 registros BudgetMeta
   - realizados: DRELancamentos do ano
   ↓
5. UI calcula e mostra:
   - KPIs anuais
   - Gráfico mensal
   - Tabela detalhada
```

---

## 🎯 PRÓXIMOS PASSOS

### Fase 5 (Backfill):
1. Migrar metas mensais antigas para formato anual
2. Validar integridade dos dados

### Fase 6 (Relatórios):
1. PDF anual de orçamento
2. Projeção baseada em metas anuais
3. Comparativo ano atual vs anterior

---

## ✅ CRITÉRIOS DE ACEITE

- ✅ Entidade `BudgetMeta` com campos anuais
- ✅ Componente `MetaAnualEditor` funcional
- ✅ Function `sincronizarMetasAnuais` cria 12 registros
- ✅ Componente `BudgetConsolidadoAnual` mostra KPIs, gráfico, tabela
- ✅ `BudgetMetaTab` com toggle mensal/anual
- ✅ Visão anual calcula acumulados corretamente
- ✅ Gráfico e tabela sincronizados com dados

---

**FASE 4 CONCLUÍDA!** 🚀  
Próximo: **FASE 5 - BACKFILL DE DADOS**