# FASE 5: Sincronização Budget Control (Planejamento)

**Status:** 📋 Planejado | **Prioridade:** Média | **Estimativa:** 2-3 dias

---

## 📌 Objetivo

Integrar fluxo bidirecional entre:
- **DRELancamento** (dados reais de entrada)
- **BudgetMeta** (metas definidas no Controle Orçamentário)
- **Workshop.monthly_goals** (metas da empresa)
- **calculateBudgetControl()** (engine de cálculos consolidados)

---

## 🎯 5.1 - Backend Function: calculateBudgetControl()

### Assinatura
```javascript
async function calculateBudgetControl(workshopId, mes) {
  return {
    periodo: "2026-05",
    faturamento_meta_rs: 200000,
    totais: {
      meta_total_rs: 155000,
      realizado_total_rs: 158000,
      diferenca_rs: -3000,
      variacao_percentual: -1.93,
      status: "⚠️"
    },
    por_categoria: [
      {
        categoria: "operacional",
        item: "Aluguel",
        meta_rs: 20000,
        realizado_rs: 20500,
        diferenca_rs: -500,
        variacao_percentual: -2.5,
        responsavel_id: "user123",
        responsavel_nome: "João Silva",
        status: "✅"
      },
      // ... mais categorias
    ],
    historico_3_meses: [
      {
        mes: "2026-03",
        meta_total_rs: 150000,
        realizado_total_rs: 152000,
        variacao_percentual: -1.33
      },
      // ...
    ],
    alertas: [
      {
        categoria: "pró-lab",
        percentual: 125,
        status: "❌ CRÍTICO",
        mensagem: "Ultrapassou 25% da meta"
      }
    ]
  };
}
```

### Fluxo Interno
1. **Buscar BudgetMeta** para o mês
2. **Buscar DRELancamento** para o mês
3. **Calcular diferenças** por categoria
4. **Buscar histórico** dos últimos 3 meses (consolidado)
5. **Gerar alertas** automáticos (> 110% = crítico)
6. **Retornar payload consolidado**

### Endpoint
```
POST /functions/calculateBudgetControl
Payload: { workshopId: "123", mes: "2026-05" }
```

---

## 🎯 5.2 - Estender Workshop.monthly_goals

### Estrutura Atual (não tocar):
```json
{
  "monthly_goals": {
    "month": "2026-05",
    "growth_percentage": 10,
    "projected_revenue": 200000,
    "actual_revenue_achieved": 195000
  }
}
```

### Estrutura Futura (adicionar breakdown):
```json
{
  "monthly_goals": {
    "month": "2026-05",
    "projected_revenue": 200000,
    "actual_revenue_achieved": 195000,
    
    // ✨ NOVO: Breakdown de despesas
    "expense_breakdown": {
      "operacional": {
        "total_meta_rs": 45000,
        "realizado_rs": 44800,
        "items": [
          {
            "nome": "Aluguel",
            "meta_rs": 20000,
            "realizado_rs": 20500,
            "responsavel_id": "user123"
          }
        ]
      },
      "pessoas": {
        "total_meta_rs": 80000,
        "realizado_rs": 81200,
        "items": [ /* ... */ ]
      }
    }
  }
}
```

**Benefício:** Sincronização automática entre Gestão da Empresa e Controle Orçamentário

---

## 🎯 5.3 - Automação: Sync monthly_goals ↔ BudgetMeta

### Cenário 1: Usuário edita meta na GestaoOficina
```
[Gestão da Empresa] → monthly_goals.expense_breakdown
                    ↓
              [Backend: syncMonthlyGoalsToBudgetMeta]
                    ↓
              [BudgetMeta atualizado]
                    ↓
              [DRETCMP2 recarrega dados]
```

### Cenário 2: Admin cria nova meta no Controle Orçamentário
```
[BudgetMetaTab] → nova BudgetMeta criada
                 ↓
           [Automação entity]
                 ↓
        [syncBudgetMetaToMonthlyGoals]
                 ↓
   [Workshop.monthly_goals.expense_breakdown atualizado]
```

### Automação #1: Entity (on BudgetMeta create/update)
```javascript
// triggers/onBudgetMetaChange.js
automation_type: "entity"
entity_name: "BudgetMeta"
event_types: ["create", "update", "delete"]
function_name: "syncBudgetMetaToMonthlyGoals"

// Payload para função:
{
  event: { type: "create|update|delete", entity_id: "..." },
  data: { /* BudgetMeta inteiro */ },
  workshopId: "...",
  mes: "..."
}
```

### Automação #2: Sincronização Mensal
```javascript
// scheduled/syncMonthlyBudgetCheck.js
automation_type: "scheduled"
schedule_type: "simple"
repeat_unit: "months"
repeat_on_day_of_month: 1  // Executa no 1º de cada mês
start_time: "09:00"  // 9 AM SP timezone
function_name: "calculateBudgetControl"

// Para CADA workshop ativo:
// - Calcula totais do mês anterior
// - Gera relatório consolidado
// - Dispara alertas se > 110%
```

---

## 🔄 Fluxo Completo de Sincronização

```
┌─────────────────────────────────────────────────────────────┐
│                    USUÁRIO FINAL                             │
├────────────────────┬────────────────────────────────────────┤
│ GestaoOficina.jsx  │   DRETCMP2.jsx / BudgetMetaTab.jsx    │
│ (monthly_goals)    │   (BudgetMeta / DRELancamento)        │
└────────────────────┴────────────────────────────────────────┘
         ↓                              ↓
    [EditMonthlyGoals]           [CreateBudgetMeta]
         ↓                              ↓
    updateWorkshop()             createBudgetMeta()
         ↓                              ↓
┌────────────────────────────────────────────────────────────┐
│           AUTOMAÇÃO ENTITY (Bidirecional)                  │
│  - syncBudgetMetaToMonthlyGoals()                          │
│  - syncMonthlyGoalsToBudgetMeta()                          │
└────────────────────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────────────────────┐
│              CALCULATEBUDGETCONTROL()                       │
│  - Consolida BudgetMeta + DRELancamento                    │
│  - Calcula variações por categoria                         │
│  - Gera alertas (> 110%)                                  │
│  - Retorna dashboard consolidado                          │
└────────────────────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────────────────────┐
│              FRONTEND: Dashboard Atualizado                │
│  - Cards de resumo                                         │
│  - Progress bars                                           │
│  - Relatório de variações                                  │
│  - Alertas visuais                                         │
└────────────────────────────────────────────────────────────┘
```

---

## 📊 Backend Functions a Criar

### 1️⃣ calculateBudgetControl
**Input:** `{ workshopId, mes }`  
**Output:** Consolidado completo (totais, por categoria, histórico, alertas)  
**Custo:** Baixo (2-3 queries)

### 2️⃣ syncBudgetMetaToMonthlyGoals
**Trigger:** Quando BudgetMeta é criado/atualizado/deletado  
**Ação:** Atualiza `Workshop.monthly_goals.expense_breakdown`  
**Custo:** Médio (validação + 1 update)

### 3️⃣ syncMonthlyGoalsToBudgetMeta
**Trigger:** Quando `Workshop.monthly_goals` é editado  
**Ação:** Sincroniza com BudgetMeta (cria/atualiza items)  
**Custo:** Alto (múltiplas operações)

### 4️⃣ generateBudgetAlert
**Trigger:** Automação mensal + quando metas são ultrapassadas  
**Ação:** Cria alertas para categorias > 110%  
**Custo:** Médio (query + notification)

---

## 🚨 Alertas Automáticos

### Trigger: > 110% da meta
```javascript
if (variacao > 110) {
  // Criar alerta:
  {
    workshop_id: "...",
    categoria: "pró-lab",
    percentual: 125,
    meta_rs: 50000,
    realizado_rs: 62500,
    responsavel_id: "user123",
    status: "crítico",
    data_alerta: now(),
    notificacao_enviada: false
  }
  
  // Notificar responsável:
  // - Email (Resend)
  // - In-app (Notification entity)
}
```

---

## 📋 Checklist Implementação Futura

- [ ] Criar `calculateBudgetControl()` function
- [ ] Estender `Workshop.monthly_goals` schema
- [ ] Criar `syncBudgetMetaToMonthlyGoals()` function
- [ ] Criar `syncMonthlyGoalsToBudgetMeta()` function  
- [ ] Criar automação entity (on BudgetMeta change)
- [ ] Criar automação entity (on Workshop.monthly_goals change)
- [ ] Criar automação scheduled (1º do mês)
- [ ] Criar `generateBudgetAlert()` function
- [ ] Testar sincronização bidirecional
- [ ] Testar alertas (criar meta 110%+)
- [ ] Integrar com notificação email

---

## 💾 Dados para Teste Futuro

```javascript
// Criar BudgetMeta para teste:
{
  workshop_id: "test_ws",
  mes: "2026-05",
  faturamento_meta_rs: 200000,
  item: "Aluguel",
  categoria: "operacional",
  meta_percentual: 10,  // 10% do faturamento = 20.000
  responsavel_nome: "João Silva",
  responsavel_id: "user123"
}

// Criar DRELancamento para trigger alerta (> 110%):
{
  workshop_id: "test_ws",
  mes: "2026-05",
  categoria: "operacional",
  tipo: "despesa",
  descricao: "Aluguel",
  valor: 22500  // > 20.000 (110% da meta)
}
```

---

## 📚 Referências

- **FASE 2:** Estrutura de dados (BudgetMeta, DRELancamento)
- **FASE 3:** UI/UX (cards, progress bars, relatórios)
- **FASE 4:** Analytics (histórico, responsáveis, alertas)
- **FASE 5:** Sincronização (próxima)

---

**Próximos Passos:** Implementar quando projeto tiver estabilização de FASE 1-4.