# 📊 Guia Visual — Evolução do Controle Orçamentário

## 1. Distribuição Sazonal (12 avos → Pesos Mensais)

### ❌ COMO É HOJE (Distribuição Igual)

```
Meta Anual: R$ 1.200.000

Janeiro    R$ 100.000  ████████████
Fevereiro  R$ 100.000  ████████████
Março      R$ 100.000  ████████████
Abril      R$ 100.000  ████████████
Maio       R$ 100.000  ████████████
Junho      R$ 100.000  ████████████
Julho      R$ 100.000  ████████████
Agosto     R$ 100.000  ████████████
Setembro   R$ 100.000  ████████████
Outubro    R$ 100.000  ████████████
Novembro   R$ 100.000  ████████████
Dezembro   R$ 100.000  ████████████

PROBLEMA: Oficina fatura 30% a mais em Dezembro e 20% a menos em Fevereiro
```

### ✅ COMO VAI FICAR (Distribuição Ponderada)

```
Meta Anual: R$ 1.200.000 (com sazonalidade)

Janeiro    7%   R$ 84.000   ██████████
Fevereiro  7%   R$ 84.000   ██████████
Março      8%   R$ 96.000   ███████████
Abril      8%   R$ 96.000   ███████████
Maio       9%   R$ 108.000  █████████████
Junho      9%   R$ 108.000  █████████████
Julho      10%  R$ 120.000  ███████████████
Agosto     9%   R$ 108.000  █████████████
Setembro   8%   R$ 96.000   ███████████
Outubro    8%   R$ 96.000   ███████████
Novembro   9%   R$ 108.000  █████████████
Dezembro   8%   R$ 96.000   ███████████

VANTAGEM: Reflete realidade sazonal da oficina
```

### 📈 IMPACTO NO GRÁFICO

**Hoje (Irreal):**
```
Meta vs Realizado

Meta:     ████  ████  ████  ████  ████  ████  ████  ████  ████  ████  ████  ████
Real:     ███   █████ ████  ████  █████ █████ ██████ █████ █████ ██████ ██████
          Jan   Fev   Mar   Abr   Mai   Jun   Jul   Ago   Set   Out   Nov   Dez

❌ Dezembro: Meta R$ 100k, Real R$ 150k → "50% acima da meta" (falso positivo)
❌ Fevereiro: Meta R$ 100k, Real R$ 70k  → "30% abaixo da meta" (falso negativo)
```

**Futuro (Realista):**
```
Meta vs Realizado (com sazonalidade)

Meta:     ███   ███   ████  ████  █████ █████ ██████ █████ ████  ████  █████ ██████
Real:     ███   █████ ████  ████  █████ █████ ██████ █████ █████ ██████ ██████ ████
          Jan   Fev   Mar   Abr   Mai   Jun   Jul   Ago   Set   Out   Nov   Dez

✅ Dezembro: Meta R$ 120k, Real R$ 150k → "25% acima" (realista)
✅ Fevereiro: Meta R$ 84k, Real R$ 70k → "17% abaixo" (realista)
```

---

## 2. Auditoria / Versionamento de Metas

### ❌ COMO É HOJE (Sem Histórico)

```
TELA: Configurar Meta

Item: Salários
Meta: R$ 75.000
Responsável: João Silva

[Salvar]

❌ O que acontece depois?
   - Ninguém sabe quem mudou
   - Ninguém sabe quando mudou
   - Ninguém sabe o valor anterior
   - Usuário pode mudar meta em Maio e distorcer indicadores de Janeiro
```

### ✅ COMO VAI FICAR (Com Auditoria)

```
TELA: Configurar Meta

Item: Salários
Meta: R$ 75.000
Responsável: João Silva

[Salvar]

✅ Histórico de Alterações (visível):

Versão 3 (Atual)
  Valor: R$ 75.000
  Por: Maria Santos
  Quando: 2026-05-15 14:30
  Motivo: Ajuste conforme convenção coletiva

Versão 2
  Valor: R$ 70.000
  Por: João Silva
  Quando: 2026-03-01 09:15
  Motivo: Revisão anual

Versão 1
  Valor: R$ 65.000
  Por: João Silva
  Quando: 2026-01-01 08:00
  Motivo: Orçamento inicial

✅ TRAVA: Metas de meses fechados não podem ser alteradas
```

### 📊 IMPACTO NA AUDITORIA

**Hoje (Sem rastreio):**
```
Relatório: "Por que a meta de Março mudou?"

❌ "Não sabemos..."
❌ "Alguém deve ter mudado..."
❌ Indicadores históricos estão incorretos
```

**Futuro (Com rastreio):**
```
Relatório: "Por que a meta de Março mudou?"

✅ "Maria Santos alterou em 15/Mar às 14:30"
✅ "Motivo: Inclusão de novo benefício"
✅ "Valor anterior: R$ 70k → Novo valor: R$ 75k"
✅ "Indicadores de Jan-Fev mantidos com meta original"
```

---

## 3. Cache de KPIs (Performance)

### ❌ COMO É HOJE (Cálculo em Tempo Real)

```
USUÁRIO ABRE: Controle Orçamentário

🔄 O sistema faz AGORA:
   1. Busca 1.200 BudgetMetas (todas)
   2. Busca 5.000 DRELancamentos (todos)
   3. Filtra em memória: .filter().reduce()
   4. Calcula 50 KPIs na hora
   5. Renderiza gráfico

TEMPO: 3-5 segundos (lento com muitos dados)
```

### ✅ COMO VAI FICAR (Com Cache)

```
USUÁRIO ABRE: Controle Orçamentário

🔄 O sistema faz:
   1. ✅ KPIs já calculados no fechamento do mês
   2. ✅ Cache: "Maio/2026: Receita R$ 280k, Despesa R$ 210k"
   3. ✅ Busca apenas lançamentos do mês atual
   4. Renderiza instantaneamente

TEMPO: 200-500ms (instantâneo)
```

### 📈 IMPACTO NA PERFORMANCE

**Hoje:**
```
Oficina com 2 anos de histórico:
  - 24 meses × 50 metas = 1.200 BudgetMetas
  - 24 meses × 200 lançamentos = 4.800 DRELancamentos
  - Cálculo: 3-5 segundos
  - Scroll: travando
```

**Futuro:**
```
Oficina com 2 anos de histórico:
  - KPIs em cache (pré-calculados)
  - Busca apenas mês atual
  - Cálculo: 200-500ms
  - Scroll: fluido
```

---

## 4. Hierarquia Orçamentária (Estrutura)

### ❌ COMO É HOJE (Plano)

```
📋 Lista de Metas

☐ Aluguel          R$ 5.000
☐ Salários         R$ 75.000
☐ Marketing        R$ 15.000
☐ Peças            R$ 60.000
☐ Energia          R$ 3.000

❌ Problema: Não agrupa por categoria
❌ Problema: Não mostra totais por grupo
❌ Problema: Não separa Custo vs Despesa
```

### ✅ COMO VAI FICAR (Hierárquico)

```
📊 Orçamento 2026

📁 RECEITAS (R$ 300.000)
  ├─ Oficina          R$ 280.000  ████████████████████  93%
  └─ Outros           R$ 20.000   ██                    7%

📁 CUSTOS DIRETOS (R$ 90.000)
  ├─ Peças            R$ 60.000   ██████████████        67%
  └─ Terceirizados    R$ 30.000   ██████                33%

📁 DESPESAS OPERACIONAIS (R$ 120.000)
  ├─ Folha            R$ 75.000   ███████████████       63%
  ├─ Aluguel          R$ 25.000   █████                 21%
  ├─ Marketing        R$ 15.000   ███                   12%
  └─ Energia          R$ 5.000    █                     4%

📁 LUCRO ESPERADO (R$ 90.000)
  └─ Margem: 30%

✅ Vantagem: Visão consolidada por grupo
✅ Vantagem: Separa Custo vs Despesa
✅ Vantagem: Mostra totais e percentuais
```

---

## 5. Competência vs Caixa (Separação)

### ❌ COMO É HOJE (Misturado)

```
TELA: Controle Orçamentário

Meta: R$ 100.000
Realizado: R$ 85.000
Status: ⚠️ 85% atingimento

❌ Dúvida do usuário:
   "Isso é competência ou caixa?"
   "Vendas realizadas ou recebidas?"
   "Despesas empenhadas ou pagas?"
```

### ✅ COMO VAI FICAR (Separado)

```
TELA: DRE (Competência)

Meta Receita: R$ 100.000
Realizado (Competência): R$ 85.000
Status: ⚠️ 85% (vendas realizadas)

---

TELA: DFC (Caixa)

Entradas (Caixa): R$ 78.000
Saídas (Caixa): R$ 72.000
Saldo: R$ 6.000

✅ Dúvida respondida:
   "DRE = competência (venda/empenho)"
   "DFC = caixa (recebimento/pagamento)"
```

---

## 6. Semântica Financeira (Receita vs Despesa)

### ❌ COMO É HOJE (Confuso)

```
KPI: "Acima da meta"

Receita: R$ 120k (Meta R$ 100k) → ✅ "Acima da meta" (BOM)
Despesa: R$ 120k (Meta R$ 100k) → ❌ "Acima da meta" (RUIM)

❌ Mesma frase, significados opostos!
```

### ✅ COMO VAI FICAR (Claro)

```
KPIs Específicos por Tipo:

RECEITA:
  Meta: R$ 100k | Real: R$ 120k
  Status: ✅ "Meta batida" (+20%)
  Cor: 🟢 Verde

DESPESA:
  Orçamento: R$ 100k | Real: R$ 120k
  Status: ❌ "Orçamento excedido" (+20%)
  Cor: 🔴 Vermelho

✅ Frases diferentes para situações diferentes
✅ Cores coerentes (verde=bom, vermelho=ruim)
```

---

## 7. Exemplo Prático Completo

### CENÁRIO: Oficina Master Car

**Dados:**
- Faturamento Meta 2026: R$ 3.6M
- Meta Mensal Média: R$ 300k
- Sazonalidade: Julho +20%, Fevereiro -15%

---

### HOJE (Sem as melhorias)

```
📊 Janeiro/2026

Meta: R$ 300.000 (fixo)
Real: R$ 280.000
Status: ⚠️ 93% (abaixo da meta)

📊 Julho/2026

Meta: R$ 300.000 (fixo)
Real: R$ 360.000
Status: ✅ 120% (acima da meta)

❌ Problema:
   - Janeiro é historicamente fraco (pós-natal)
   - Julho é historicamente forte (férias)
   - Sistema trata os dois como "normal"
   - Gestor toma decisões erradas
```

---

### FUTURO (Com as melhorias)

```
📊 Janeiro/2026 (Sazonalidade: -15%)

Meta Ajustada: R$ 255.000 (-15%)
Real: R$ 280.000
Status: ✅ 110% (ACIMA da meta sazonal!)
Ação: Manter estratégia

📊 Julho/2026 (Sazonalidade: +20%)

Meta Ajustada: R$ 360.000 (+20%)
Real: R$ 360.000
Status: ✅ 100% (NA meta sazonal)
Ação: Celebrar, mas não comemorar "20% acima"

✅ Vantagem:
   - Meta reflete realidade sazonal
   - Gestor toma decisões corretas
   - Equipe não é penalizada/recompensada injustamente
```

---

## 8. Timeline de Implementação

```
2026-Q3 (Jul-Set)
├─ ✅ Distribuição Sazonal
│  └─ Pesos mensais configuráveis
├─ ✅ Hierarquia Orçamentária
│  └─ Grupos → Categorias → Itens
└─ ✅ Semântica Financeira
   └─ Receita vs Despesa (cores/frases)

2026-Q4 (Out-Dez)
├─ ✅ Auditoria/Versionamento
│  └─ Histórico de alterações
├─ ✅ Trava de Fechamento
│  └─ Meses fechados não editáveis
└─ ✅ Separação Competência vs Caixa
   └─ DRE vs DFC (telas diferentes)

2027-Q1 (Jan-Mar)
├─ ✅ Cache de KPIs
│  └─ Performance 10x mais rápida
├─ ✅ Materialized Views
│  └─ Snapshots mensais
└─ ✅ Relatórios Avançados
   └─ Export, PDF, Comparativo
```

---

## 9. ROI das Melhorias

| Melhoria | Tempo Economizado | Erros Evitados | Impacto |
|----------|------------------|----------------|---------|
| **Sazonalidade** | 2h/mês (revisão manual) | 100% (metas irreais) | Alto |
| **Auditoria** | 4h/mês (investigação) | 80% (mudanças indevidas) | Médio |
| **Cache KPIs** | 5s → 0.5s (carregamento) | 0% (performance) | Médio |
| **Hierarquia** | 1h/mês (consolidação) | 50% (visão fragmentada) | Alto |
| **Semântica** | 30min/mês (confusão) | 90% (interpretação errada) | Alto |

**Total:** ~8 horas economizadas por mês + decisões mais acertadas

---

## 10. Exemplo de Tela Futura

```
╔══════════════════════════════════════════════════════════╗
║  📊 CONTROLE ORÇAMENTÁRIO 2026                           ║
║  Oficina: Master Car | Período: Anual                    ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  🎯 META ANUAL: R$ 3.600.000 (com sazonalidade)          ║
║  📅 Realizado Acumulado: R$ 1.850.000 (51%)              ║
║  💰 Restante: R$ 1.750.000                               ║
║                                                          ║
╠══════════════════════════════════════════════════════════╣
║  📈 GRÁFICO MENSAL (Meta Sazonal vs Realizado)           ║
║                                                          ║
║  Meta:     ███  ██   ████ ████ █████ █████ ██████ ████   ║
║  Real:     ███  ███  ████ ████ █████ █████ ██████ ████   ║
║            Jan  Fev  Mar  Abr  Mai  Jun  Jul  Ago        ║
║                                                          ║
╠══════════════════════════════════════════════════════════╣
║  📁 RECEITAS (Meta: R$ 3.0M | Real: R$ 1.5M | 50%)       ║
║  ├─ Oficina         R$ 2.8M  ████████████████████  93%   ║
║  └─ Outros          R$ 200k  ██                    7%    ║
║                                                          ║
║  📁 DESPESAS (Orçamento: R$ 2.0M | Real: R$ 1.0M | 50%)  ║
║  ├─ Folha           R$ 750k  ███████████████       63%   ║
║  ├─ Peças           R$ 600k  ████████████          50%   ║
║  └─ Marketing       R$ 150k  ███                 12%     ║
║                                                          ║
╠══════════════════════════════════════════════════════════╣
║  🔍 AUDITORIA                                            ║
║  Última alteração: Maria em 15/Mai às 14:30              ║
║  Motivo: Ajuste sazonal de Julho (+20%)                  ║
║  [Ver Histórico Completo]                                ║
╚══════════════════════════════════════════════════════════╝

TEMPO DE CARREGAMENTO: 0.3s (com cache)
```

---

**Última atualização:** 2026-05-22  
**Responsável:** QA Senior  
**Status:** Documentação visual para aprovação