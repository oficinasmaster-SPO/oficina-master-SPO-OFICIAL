# 📘 Regras de Negócio — Controle Orçamentário

## Visão Geral

O sistema de controle orçamentário permite definir metas financeiras (receitas e despesas) e compará-las com o realizado (DRE), calculando indicadores de performance e gerando alertas.

---

## 1. Entidades Envolvidas

### BudgetMeta
```json
{
  "workshop_id": "string",
  "mes": "YYYY-MM",
  "item": "string (ex: Aluguel, Salários)",
  "categoria": "operacional | pessoas | marketing | etc",
  "tipo": "receita | despesa",
  "meta_percentual": "number (0-100)",
  "meta_fixa_rs": "number",
  "periodicidade": "mensal | anual",
  "meta_anual_rs": "number (quando periodicidade=anual)",
  "controlar_orcamento": "boolean"
}
```

### DRELancamento
```json
{
  "workshop_id": "string",
  "mes": "YYYY-MM",
  "tipo": "receita | despesa",
  "categoria": "string",
  "subcategoria": "string",
  "descricao": "string",
  "valor": "number",
  "data_vencimento": "date",
  "data_pagamento": "date"
}
```

---

## 2. Regras de Cálculo

### 2.1 Meta de Receita vs Meta de Despesa

| Tipo | Fórmula Performance | Semântica | Status |
|------|---------------------|-----------|--------|
| **Receita** | `(Realizado / Meta) × 100` | ≥100% = ✅ Batida<br>80-99% = ⚠️ Atenção<br><80% = ❌ Abaixo | Positivo = Bom |
| **Despesa** | `(Meta / Realizado) × 100` | ≤100% = ✅ Dentro<br>100-105% = ⚠️ Atenção<br>>105% = ❌ Estourou | Negativo = Ruim |

**IMPORTANTE:** Performance > 100% para despesas significa **orçamento excedido** (ruim).

### 2.2 Diferença (Variação)

```js
if (tipo === "receita") {
  diferenca = realizado - meta; // Positivo = acima da meta (bom)
  variacao_pct = ((realizado - meta) / meta) * 100;
} else {
  diferenca = meta - realizado; // Positivo = economizou (bom)
  variacao_pct = ((meta - realizado) / meta) * 100;
}
```

### 2.3 Realizado Acumulado

**Visão Mensal:**
- Soma de `DRELancamento.valor` filtrando por:
  - `workshop_id`
  - `mes` (ex: "2026-05")
  - `tipo` (receita ou despesa, dependendo da meta)
  - Match por `descricao` ou `subcategoria` quando definido na meta

**Visão Anual:**
- Soma de `DRELancamento.valor` de todos os 12 meses do ano
- Agrupamento mês a mês para gráfico
- Acumulado progressivo (Jan, Jan+Fev, Jan+Fev+Mar, ...)

---

## 3. Semântica Financeira

### 3.1 KPIs por Tipo de Meta

| Indicador | Receita | Despesa |
|-----------|---------|---------|
| **Meta > Realizado** | ❌ Abaixo da meta | ✅ Economia |
| **Meta = Realizado** | ✅ Na meta | ✅ No orçamento |
| **Meta < Realizado** | ✅ Acima da meta | ❌ Orçamento excedido |
| **% Atingimento ideal** | ≥100% | ≤100% |

### 3.2 Tratamento de Meta Zero

Quando `meta_anual_rs = 0` ou `meta_fixa_rs = 0`:

- `% Atingimento` → exibir `—` (null)
- `Restante` → exibir `—` (null)
- Card de status → cor cinza com texto "Defina uma meta anual"
- Gráficos comparativos → desabilitar ou exibir apenas realizado

---

## 4. Hierarquia Orçamentária

### Estrutura Atual (Plana)
```
BudgetMeta (item único)
├── Categoria: "operacional"
├── Item: "Aluguel"
└── Meta: R$ 5.000
```

### Estrutura Ideal (Futura)
```
Orçamento Anual 2026
├── RECEITAS
│   ├── Receita Oficina: R$ 3.6M
│   └── Outros: R$ 200k
├── CUSTOS DIRETOS
│   ├── Peças: R$ 720k
│   └── Terceirizados: R$ 180k
├── DESPESAS OPERACIONAIS
│   ├── Folha Salarial: R$ 720k
│   ├── Aluguel: R$ 120k
│   └── Marketing: R$ 180k
└── LUCRO ESPERADO
    └── Margem: 15%
```

---

## 5. Competência Contábil vs Caixa

### DRE (Competência)
- Receita reconhecida na venda (independente de recebimento)
- Despesa reconhecida no consumo (independente de pagamento)
- Usado para: **Meta vs Realizado Orçamentário**

### DFC (Caixa)
- Entrada/saída efetiva de dinheiro
- Usado para: **Fluxo de Caixa, Saldo em Banco**

**IMPORTANTE:** O Controle Orçamentário compara BudgetMeta vs DRELancamento (competência), não DFCLancamento (caixa).

---

## 6. Distribuição Sazonal

### Modelo Atual (12 avos)
```js
meta_mensal = meta_anual / 12;
```

### Modelo Ideal (Ponderado)
```js
const pesos_sazonais = {
  "01": 0.07, // Janeiro 7%
  "02": 0.07, // Fevereiro 7%
  "03": 0.08, // Março 8%
  "04": 0.08,
  "05": 0.09,
  "06": 0.09,
  "07": 0.10,
  "08": 0.09,
  "09": 0.08,
  "10": 0.08,
  "11": 0.09,
  "12": 0.08  // Dezembro 8%
};

meta_mes = meta_anual * pesos_sazonais[mes];
```

---

## 7. Auditoria e Versionamento

### Requisitos Futuros
- [ ] Snapshot de metas ao fechar mês
- [ ] Histórico de alterações (quem mudou, quando, valor anterior)
- [ ] Trava de edição após fechamento
- [ ] Versionamento de orçamento (v1, v2, v3)

---

## 8. Performance e Cache

### Problema Atual
Cálculos em tempo real via `.filter().reduce()` em cada render.

### Solução Futura
- Materialized View mensal
- Cache de indicadores no fechamento do mês
- Snapshot de `% Atingimento` ao encerrar período

---

## 9. Bugs Conhecidos e Correções

| Bug | Severidade | Status | Correção |
|-----|------------|--------|----------|
| Mistura receita+despesa no realizado | 🔴 Crítico | ✅ Fix | Filtrar por `tipo === "receita"` ou `"despesa"` |
| `.find()` ao invés de `.reduce()` | 🔴 Crítico | ✅ Fix | Usar `.filter().reduce()` para agregar mês |
| Semântica "acima da meta" invertida | 🔴 Crítico | ✅ Fix | Tratar receita vs despesa separadamente |
| Meta zero calcula KPI inválido | 🟡 Médio | ✅ Fix | Exibir `—` quando meta = 0 |
| Sem distribuição sazonal | 🟡 Médio | ⏳ Pendente | Implementar pesos mensais |
| Sem auditoria de alterações | 🟡 Médio | ⏳ Pendente | Criar entidade BudgetMetaHistory |
| Performance em grandes volumes | 🟡 Médio | ⏳ Pendente | Cache e materialized views |

---

## 10. Fórmulas Oficiais

### 10.1 Performance (Receita)
```
performance = (realizado / meta) × 100
status:
  - performance >= 100 → "✅"
  - performance >= 80  → "⚠️"
  - performance < 80   → "❌"
```

### 10.2 Performance (Despesa)
```
performance = (meta / realizado) × 100
status:
  - realizado <= meta           → "✅"
  - realizado <= meta × 1.05    → "⚠️"
  - realizado > meta × 1.05     → "❌"
```

### 10.3 Atingimento Global
```
atingimento_receita = (total_realizado_receita / total_meta_receita) × 100
economia_despesa = total_meta_despesa - total_realizado_despesa
```

---

## 11. Fluxo de Uso

### Passo 1: Definir Faturamento Esperado
```
Faturamento Meta: R$ 300.000
```

### Passo 2: Criar Metas por Categoria
```
Item: Salários
Categoria: pessoas
Tipo: despesa
Meta: 25% do faturamento (R$ 75.000)
Responsável: João Silva
```

### Passo 3: Lançar DRE no Avançado
```
Descrição: Folha de Pagamento Maio
Categoria: pessoas
Valor: R$ 72.000
Tipo: despesa
```

### Passo 4: Sistema Calcula Automaticamente
```
Meta: R$ 75.000
Realizado: R$ 72.000
Diferença: +R$ 3.000 (economia)
Status: ✅ Dentro do orçamento
Performance: 104% (meta/realizado)
```

---

## 12. Glossário

| Termo | Definição |
|-------|-----------|
| **BudgetMeta** | Registro de meta orçamentária (receita ou despesa) |
| **DRELancamento** | Lançamento contábil de receita ou despesa |
| **Competência** | Regime que reconhece fato na ocorrência, não no pagamento |
| **Meta Fixa** | Valor absoluto em R$ (ex: R$ 5.000) |
| **Meta Percentual** | % sobre faturamento (ex: 10% do faturamento) |
| **Realizado** | Soma dos lançamentos DRE do período |
| **Atingimento** | % da meta que foi alcançada |
| **Variação** | Diferença percentual entre meta e realizado |

---

## 13. Próximos Passos (Roadmap)

### Fase 2 — Melhoria de Estrutura (Q3 2026)
- [ ] Separar BudgetMeta por centro de custo
- [ ] Implementar distribuição sazonal
- [ ] Criar hierarchy: Grupo → Categoria → Item

### Fase 3 — Auditoria (Q4 2026)
- [ ] BudgetMetaHistory (versionamento)
- [ ] Trava de edição pós-fechamento
- [ ] Log de alterações (quem, quando, o quê)

### Fase 4 — Performance (Q1 2027)
- [ ] Materialized View mensal
- [ ] Cache de KPIs
- [ ] Snapshot de indicadores

---

**Última atualização:** 2026-05-22  
**Responsável:** QA Senior  
**Status:** Em implementação (Fase 1 concluída)