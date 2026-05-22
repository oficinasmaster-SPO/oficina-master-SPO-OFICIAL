# 💰 Guia Detalhado de UI — DFC (Fluxo de Caixa)

**Documento:** UI-GUIDE-002  
**Tela:** DRE & TCMP² → Aba "DFC"  
**Arquivo:** `components/dre/DFCTab.jsx`

---

## 🎯 VISÃO GERAL DA TELA

### Finalidade
Controlar **entradas e saídas reais** de dinheiro (regime de caixa) com projeção de saldo e detalhamento por fonte (banco, máquina, caixa).

### Localização
`/DRETCMP2` → Aba superior "DFC"

---

## 📐 ESTRUTURA DA TELA (Hierarquia)

```
DFCTab (Componente Principal)
│
├── 1. FiltroPeríodo (Topo)
│   └── Seletor de Mês/Ano
│
├── 2. Cards de Saldo (Linha 1)
│   ├── Card: Saldo Inicial
│   ├── Card: Entradas Totais
│   ├── Card: Saídas Totais
│   └── Card: Saldo Final
│
├── 3. Cards de Detalhamento (Linha 2)
│   ├── Card: Saldo por Fonte (Banco)
│   ├── Card: Saldo por Fonte (Máquina)
│   └── Card: Saldo por Fonte (Caixa)
│
├── 4. Gráfico Waterfall
│   └── Visualização de fluxo (entradas → saídas → saldo)
│
├── 5. Tabs Internas (Sub-abas)
│   ├── "Visão Geral" (Agrupado por grupos)
│   ├── "Lançamentos Manuais" (Inseridos pelo usuário)
│   ├── "Mapeamento DRE" (Automáticos do DRE)
│   └── "Datas de Pagamento" (Calendário de vencimentos)
│
└── 6. Modais
    ├── ModalSaldoInicialDetalhado
    ├── ModalLancamentoManual
    └── ModalDatasPagamento
```

---

## 🔍 DETALHAMENTO POR COMPONENTE

### 1. FILTRO DE PERÍODO

**Componente:** `FiltroPeriodo.jsx` (mesmo do DRE)

#### Funcionalidades Específicas DFC
- Mostra mês de referência do caixa
- Navegação igual ao DRE
- Sincronizado com aba DRE (mesmo período)

---

### 2. CARDS DE SALDO (Linha 1)

#### Card 1: SALDO INICIAL

**Componente:** `SaldoInicialCard.jsx` + `Popover`

##### Visual
```
┌────────────────────────────────┐
│ 🏦 Saldo Inicial               │
│ R$ 245.000,00                  │
│ 👁️ Ver detalhamento           │
└────────────────────────────────┘
```

##### Dados
```javascript
{
  titulo: "Saldo Inicial",
  icone: "🏦",
  valor: 245000.00,
  formato: "BRL",
  showDetalhamento: true,
  popoverContent: {
    banco: 180000.00,
    maquina_cartao: 45000.00,
    caixa: 20000.00
  }
}
```

##### Cálculo
```javascript
saldo_inicial = 
  DFCLancamento.saldo_inicial 
  WHERE mes = selectedMonth
  AND grupo = 'saldo_inicial'
```

##### Popover (Detalhamento)
```
┌─────────────────────────────┐
│ Detalhamento do Saldo       │
├─────────────────────────────┤
│ Banco:       R$ 180.000,00  │
│ Máquina:     R$ 45.000,00   │
│ Caixa:       R$ 20.000,00   │
├─────────────────────────────┤
│ Total:       R$ 245.000,00  │
└─────────────────────────────┘
```

##### Clique no Ícone
- Abre `ModalSaldoInicialDetalhado`
- Permite editar valores por fonte
- Salva em `DFCLancamento.detalhes`

---

#### Card 2: ENTRADAS TOTAIS

**Componente:** `MetricCard.jsx`

##### Visual
```
┌────────────────────────────────┐
│ 📥 Entradas Totais             │
│ R$ 1.450.000,00                │
│ ▲ 15% vs mês anterior          │
└────────────────────────────────┘
```

##### Dados
```javascript
{
  titulo: "Entradas Totais",
  icone: "📥",
  valor: 1450000.00,
  formato: "BRL",
  variacao: +15.2,
  corVariacao: "green"
}
```

##### Cálculo
```javascript
entradas_totais = sum(DFCLancamento.valor 
  WHERE tipo = 'entrada' 
  AND mes = selectedMonth
  AND grupo != 'saldo_inicial')
```

##### Origens
```javascript
// Inclui:
- Receitas de vendas (DRE mapeado)
- Recebimento de clientes
- Empréstimos
- Investimentos de sócios
- Outras entradas
```

---

#### Card 3: SAÍDAS TOTAIS

**Componente:** `MetricCard.jsx`

##### Visual
```
┌────────────────────────────────┐
│ 📤 Saídas Totais               │
│ R$ 1.180.000,00                │
│ ▼ 8% vs mês anterior           │
└────────────────────────────────┘
```

##### Dados
```javascript
{
  titulo: "Saídas Totais",
  icone: "📤",
  valor: 1180000.00,
  formato: "BRL",
  variacao: -8.5,
  corVariacao: "green" // redução de saída = bom
}
```

##### Cálculo
```javascript
saidas_totais = sum(DFCLancamento.valor 
  WHERE tipo = 'saida' 
  AND mes = selectedMonth
  AND grupo != 'saldo_inicial')
```

##### Destinos
```javascript
// Inclui:
- Fornecedores (DRE mapeado)
- Salários
- Impostos
- Aluguel
- Empréstimos (amortização)
- Outras saídas
```

---

#### Card 4: SALDO FINAL

**Componente:** `SaldoFinalCard.jsx` + `ProgressBar`

##### Visual
```
┌────────────────────────────────┐
│ 💰 Saldo Final                 │
│ R$ 515.000,00                  │
│                                │
│ ████████████████░░  100%      │
│ (Saldo positivo)               │
└────────────────────────────────┘
```

##### Dados
```javascript
{
  titulo: "Saldo Final",
  icone: "💰",
  valor: 515000.00,
  formato: "BRL",
  status: "positivo", // positivo | negativo
  barraProgresso: {
    valor: 100, // sempre 100% (referência)
    cor: "green" // green=positivo, red=negativo
  }
}
```

##### Cálculo
```javascript
saldo_final = saldo_inicial + entradas_totais - saidas_totais
```

##### Regras
- Se `saldo_final < 0` → cor vermelha + alerta
- Barra sempre 100% (referência visual)
- Cor indica saúde do caixa

---

### 3. CARDS DE DETALHAMENTO (Linha 2)

#### Card 5: SALDO - BANCO

**Componente:** `FonteSaldoCard.jsx`

##### Visual
```
┌────────────────────────────────┐
│ 🏦 Banco                       │
│                                │
│ Saldo Inicial: R$ 180.000     │
│ (+) Entradas:  R$ 950.000     │
│ (-) Saídas:    R$ 720.000     │
│ ─────────────────────────────  │
│ Saldo Final:   R$ 410.000     │
│                                │
│ Fonte de saídas:               │
│ ████ Banco (65%)              │
│ ██ Caixa (25%)                │
│ █ Máquina (10%)               │
└────────────────────────────────┘
```

##### Dados
```javascript
{
  fonte: "banco",
  icone: "🏦",
  saldo_inicial: 180000.00,
  entradas: 950000.00,
  saidas: 720000.00,
  saldo_final: 410000.00,
  percentual_saidas_por_origem: {
    banco: 65,
    caixa: 25,
    maquina_cartao: 10
  }
}
```

##### Cálculo
```javascript
// Entradas que vão para banco
entradas_banco = sum(DFCLancamento.valor 
  WHERE tipo = 'entrada' 
  AND (grupo = 'operacional' OR grupo = 'financiamento')
  AND destino = 'banco')

// Saídas que saem do banco
saidas_banco = sum(DFCLancamento.valor 
  WHERE tipo = 'saida' 
  AND fonte_saida = 'banco')

saldo_final_banco = saldo_inicial_banco + entradas_banco - saidas_banco
```

##### Fonte de Saídas (Gráfico)
```javascript
// Mostra de onde saiu o dinheiro para pagar as saídas
// Útil para entender fluxo entre fontes

total_saidas = saidas_banco + saidas_caixa + saidas_maquina

percentual_banco = (saidas_banco / total_saidas) × 100
percentual_caixa = (saidas_caixa / total_saidas) × 100
percentual_maquina = (saidas_maquina / total_saidas) × 100
```

---

#### Card 6: SALDO - MÁQUINA DE CARTÃO

**Componente:** `FonteSaldoCard.jsx`

##### Visual
```
┌────────────────────────────────┐
│ 💳 Máquina de Cartão           │
│                                │
│ Saldo Inicial: R$ 45.000      │
│ (+) Entradas:  R$ 380.000     │
│ (-) Saídas:    R$ 120.000     │
│ ─────────────────────────────  │
│ Saldo Final:   R$ 305.000     │
│                                │
│ Recebíveis: R$ 380k            │
│ Taxa média: 2.5%               │
│ Antecipações: R$ 50k           │
└────────────────────────────────┘
```

##### Dados
```javascript
{
  fonte: "maquina_cartao",
  icone: "💳",
  saldo_inicial: 45000.00,
  entradas: 380000.00,
  saidas: 120000.00,
  saldo_final: 305000.00,
  info_adicional: {
    recebiveis: 380000.00,
    taxa_media: 2.5,
    antecipacoes: 50000.00
  }
}
```

##### Cálculo
```javascript
// Entradas na máquina (vendas no cartão)
entradas_maquina = sum(DFCLancamento.valor 
  WHERE tipo = 'entrada' 
  AND origem = 'maquina_cartao')

// Saídas da máquina (antecipações, transferências)
saidas_maquina = sum(DFCLancamento.valor 
  WHERE tipo = 'saida' 
  AND fonte_saida = 'maquina_cartao')
```

##### Info Adicional
- **Recebíveis:** Total a receber de cartões
- **Taxa média:** Média das taxas das operadoras
- **Antecipações:** Valor antecipado no mês

---

#### Card 7: SALDO - CAIXA FÍSICO

**Componente:** `FonteSaldoCard.jsx`

##### Visual
```
┌────────────────────────────────┐
│ 💵 Caixa Físico                │
│                                │
│ Saldo Inicial: R$ 20.000      │
│ (+) Entradas:  R$ 120.000     │
│ (-) Saídas:    R$ 95.000      │
│ ─────────────────────────────  │
│ Saldo Final:   R$ 45.000      │
│                                │
│ ⚠️ Limite recomendado: R$ 10k │
│ (Acima do limite)              │
└────────────────────────────────┘
```

##### Dados
```javascript
{
  fonte: "caixa",
  icone: "💵",
  saldo_inicial: 20000.00,
  entradas: 120000.00,
  saidas: 95000.00,
  saldo_final: 45000.00,
  alerta: {
    tipo: "excesso", // excesso | escassez
    limite_recomendado: 10000.00,
    mensagem: "Acima do limite recomendado"
  }
}
```

##### Cálculo
```javascript
// Entradas em caixa (vendas em dinheiro)
entradas_caixa = sum(DFCLancamento.valor 
  WHERE tipo = 'entrada' 
  AND origem = 'caixa')

// Saídas em caixa (pagamentos em dinheiro)
saidas_caixa = sum(DFCLancamento.valor 
  WHERE tipo = 'saida' 
  AND fonte_saida = 'caixa')
```

##### Alerta de Limite
```javascript
if (saldo_final_caixa > limite_recomendado) {
  alerta = {
    tipo: "excesso",
    mensagem: "Acima do limite recomendado"
  }
} else if (saldo_final_caixa < 5000) {
  alerta = {
    tipo: "escassez",
    mensagem: "Caixa baixo. Recomenda-se reforço."
  }
}
```

---

### 4. GRÁFICO WATERFALL

**Componente:** `WaterfallChart.jsx` + `Recharts`

##### Visual
```
┌─────────────────────────────────────────────────────────┐
│ FLUXO DE CAIXA - AGOSTO 2026                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│    R$ 245k                                              │
│    ┌─────┐                                              │
│    │     │                                              │
│    │     │   +R$ 1.45M                                  │
│    │     │   ┌─────┐                                    │
│    │     │   │     │                                    │
│    │     │   │     │   -R$ 1.18M                        │
│    │     │   │     │   ┌─────┐                          │
│    │     │   │     │   │     │                          │
│    │     │   │     │   │     │   R$ 515k                │
│    │     │   │     │   │     │   ┌─────┐                │
│    └─────┘   └─────┘   └─────┘   └─────┘                │
│                                                         │
│   Inicial   Entradas   Saídas     Final                │
│                                                         │
│   █ Saldo   ▓ Entradas ░ Saídas                        │
└─────────────────────────────────────────────────────────┘
```

##### Dados
```javascript
{
  data: [
    { 
      categoria: 'Saldo Inicial', 
      valor: 245000, 
      tipo: 'total',
      acumulado: 245000
    },
    { 
      categoria: 'Entradas', 
      valor: 1450000, 
      tipo: 'entrada',
      acumulado: 1695000
    },
    { 
      categoria: 'Saídas', 
      valor: -1180000, 
      tipo: 'saida',
      acumulado: 515000
    },
    { 
      categoria: 'Saldo Final', 
      valor: 515000, 
      tipo: 'total',
      acumulado: 515000
    }
  ]
}
```

##### Cores
```javascript
const colors = {
  entrada: '#22c55e',  // green
  saida: '#ef4444',    // red
  total: '#3b82f6'     // blue
}
```

##### Tooltip
```
┌─────────────────────────────┐
│ Entradas                    │
│ Valor: R$ 1.450.000,00      │
│ Acumulado: R$ 1.695.000,00  │
└─────────────────────────────┘
```

---

### 5. TABS INTERNAS (SUB-ABAS)

#### Tab 1: VISÃO GERAL

**Componente:** `VisaoGeralDFC.jsx`

##### Estrutura
```
Visão Geral
│
├── Grupo: SALDO INICIAL
│   └── Card: Detalhamento por fonte
│       ├── Banco: R$ 180k
│       ├── Máquina: R$ 45k
│       └── Caixa: R$ 20k
│
├── Grupo: FLUXO OPERACIONAL
│   ├── Subgrupo: Entradas Operacionais
│   │   ├── Linha: Receitas de Vendas
│   │   │   ├── Valor: R$ 1.2M
│   │   │   ├── Origem: DRE mapeado
│   │   │   └── % do total: 83%
│   │   │
│   │   └── Linha: Outros Recebimentos
│   │       ├── Valor: R$ 250k
│   │       └── ...
│   │
│   └── Subgrupo: Saídas Operacionais
│       ├── Linha: Fornecedores
│       │   ├── Valor: R$ 680k
│       │   ├── Destino: Banco (70%)
│       │   └── % do total: 58%
│       │
│       ├── Linha: Salários
│       │   ├── Valor: R$ 180k
│       │   └── ...
│       │
│       └── Linha: Impostos
│           └── ...
│
├── Grupo: FLUXO DE INVESTIMENTO
│   ├── Linha: Compra de Equipamentos
│   └── Linha: Melhorias
│
└── Grupo: FLUXO DE FINANCIAMENTO
    ├── Linha: Empréstimos
    └── Linha: Amortizações
```

##### Componentes
```javascript
<VisaoGeralDFC>
  <Section title="SALDO INICIAL">
    <SaldoDetalhamentoCard />
  </Section>

  <Section title="FLUXO OPERACIONAL">
    <Subgroup title="Entradas Operacionais">
      <LinhaDFC 
        descricao="Receitas de Vendas"
        valor={1200000}
        origem="dre_automatico"
        percentual={83}
      />
      <LinhaDFC 
        descricao="Outros Recebimentos"
        valor={250000}
        origem="manual"
        percentual={17}
      />
    </Subgroup>

    <Subgroup title="Saídas Operacionais">
      <LinhaDFC 
        descricao="Fornecedores"
        valor={680000}
        destino={{ banco: 70, caixa: 30 }}
        percentual={58}
      />
    </Subgroup>
  </Section>
</VisaoGeralDFC>
```

##### Regras de Exibição
- **Ordem:** Saldo → Entradas → Saídas → Saldo Final
- **Cores:** Verde (entradas), Vermelho (saídas), Azul (totais)
- **Agrupamento:** Por grupo (operacional, investimento, financiamento)

---

#### Tab 2: LANÇAMENTOS MANUAIS

**Componente:** `LancamentosManuaisTab.jsx` + `Table`

##### Estrutura da Tabela
```
┌──────────────────────────────────────────────────────────────┐
│ LANÇAMENTOS MANUAIS              [+ Novo Lançamento Manual] │
├──────────────────────────────────────────────────────────────┤
│ Data  │ Grupo      │ Descrição      │ Valor    │ Ações     │
├───────┼────────────┼────────────────┼──────────┼───────────┤
│ 05/08 │ Investimento│ Compra Equip. │ R$ 50k   │ ✏️ 🗑️    │
│ 10/08 │ Financiamento│ Empréstimo  │ R$ 100k  │ ✏️ 🗑️    │
│ 15/08 │ Operacional │ Outros        │ R$ 5k    │ ✏️ 🗑️    │
└──────────────────────────────────────────────────────────────┘
```

##### Colunas
```javascript
[
  {
    header: "Data",
    accessor: "data_pagamento",
    format: "DD/MM/YYYY"
  },
  {
    header: "Grupo",
    accessor: "grupo",
    render: (value) => (
      <Badge variant={getGrupoVariant(value)}>
        {formatGrupo(value)}
      </Badge>
    )
  },
  {
    header: "Descrição",
    accessor: "descricao"
  },
  {
    header: "Valor",
    accessor: "valor",
    format: "BRL",
    align: "right",
    render: (value, row) => (
      <span className={row.tipo === 'entrada' ? 'text-green' : 'text-red'}>
        {formatBRL(value)}
      </span>
    )
  },
  {
    header: "Ações",
    render: (id) => (
      <ButtonGroup>
        <ButtonEdit onClick={() => handleEdit(id)} />
        <ButtonDelete onClick={() => handleDelete(id)} />
      </ButtonGroup>
    )
  }
]
```

##### Filtros
```javascript
<FiltrosManuais>
  <Select 
    label="Grupo"
    options={['Todos', 'Operacional', 'Investimento', 'Financiamento']}
  />
  <Select 
    label="Tipo"
    options={['Todos', 'Entrada', 'Saída']}
  />
  <Input 
    label="Descrição"
    placeholder="Buscar..."
  />
</FiltrosManuais>
```

---

#### Tab 3: MAPEAMENTO DRE

**Componente:** `MapeamentoDRETab.jsx` + `Table`

##### Estrutura
```
┌─────────────────────────────────────────────────────────────┐
│ LANÇAMENTOS AUTOMÁTICOS (DO DRE)                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Data       │ DRE Categoria   │ DFC Descrição  │ Valor      │
├────────────┼─────────────────┼────────────────┼────────────┤
│ 10/08/2026 │ Peças           │ Fornecedor XYZ │ R$ 280k    │
│ 15/08/2026 │ Salários        │ Folha Pagto    │ R$ 180k    │
│ 20/08/2026 │ Aluguel         │ Aluguel Loja   │ R$ 8k      │
│ ...        │ ...             │ ...            │ ...        │
└─────────────────────────────────────────────────────────────┘
```

##### Colunas
```javascript
[
  {
    header: "Data Pagamento",
    accessor: "data_pagamento",
    format: "DD/MM/YYYY",
    tooltip: "Data do DRELancamento.data_pagamento"
  },
  {
    header: "Categoria DRE",
    accessor: "dre_categoria",
    render: (value) => (
      <div className="flex items-center gap-2">
        <LinkIcon className="w-4 h-4" />
        {value}
      </div>
    )
  },
  {
    header: "Descrição DFC",
    accessor: "descricao"
  },
  {
    header: "Valor",
    accessor: "valor",
    format: "BRL"
  }
]
```

##### Regras
- **Somente leitura** (não pode editar/excluir)
- **Ícone de link:** Indica vínculo com DRE
- **Click no link:** Abre DRELancamento em modal

---

#### Tab 4: DATAS DE PAGAMENTO

**Componente:** `DatasPagamentoModal.jsx` + `Calendar`

##### Visual
```
┌─────────────────────────────────────────────────────────┐
│ CALENDÁRIO DE PAGAMENTOS - AGOSTO 2026                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  D   S   T   Q   Q   S   S                              │
│                      1   2   3                          │
│  4   5   6   7   8   9   10                             │
│  ▲               ▲                                      │
│  │               │                                      │
│  Salários        Fornecedor XYZ                         │
│  R$ 180k         R$ 280k                                │
│                                                         │
│  11  12  13  14  15  16  17                             │
│              ▲                                          │
│              │                                          │
│              Impostos                                   │
│              R$ 45k                                     │
│                                                         │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

##### Funcionalidades
- **Visualização mensal** (calendário)
- **Marcadores:** Dias com pagamentos
- **Tooltip:** Lista de pagamentos do dia
- **Click no dia:** Abre lista detalhada

##### Dados por Dia
```javascript
{
  data: '2026-08-05',
  pagamentos: [
    {
      descricao: 'Salários',
      valor: 180000.00,
      categoria: 'Salários',
      origem: 'dre_automatico'
    },
    {
      descricao: 'Fornecedor ABC',
      valor: 50000.00,
      categoria: 'Peças',
      origem: 'dre_automatico'
    }
  ],
  total_dia: 230000.00
}
```

---

### 6. MODAIS

#### Modal 1: SALDO INICIAL DETALHADO

**Componente:** `ModalSaldoInicialDetalhado.jsx`

##### Estrutura
```
┌─────────────────────────────────────────────────────┐
│ Detalhar Saldo Inicial                           X  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Mês de referência: Agosto 2026                    │
│                                                     │
│  Saldo Total: R$ 245.000,00                        │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ Banco                                         │ │
│  │ Valor: R$ [180.000,00]                        │ │
│  │                                               │ │
│  │ Máquina de Cartão                             │ │
│  │ Valor: R$ [45.000,00]                         │ │
│  │                                               │ │
│  │ Caixa Físico                                  │ │
│  │ Valor: R$ [20.000,00]                         │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ⚠️ A soma deve ser igual ao saldo total          │
│                                                     │
│  [Cancelar]              [Salvar Detalhamento]     │
└─────────────────────────────────────────────────────┘
```

##### Validações
```javascript
const soma = banco + maquina + caixa

if (soma !== saldo_total) {
  error(`A soma (R$ ${soma}) deve ser igual ao total (R$ ${saldo_total})`)
  disableSave()
}
```

##### Ação Salvar
```javascript
const handleSave = async (detalhes) => {
  await DFCLancamento.update({
    mes: selectedMonth,
    grupo: 'saldo_inicial'
  }, {
    detalhes: {
      banco: detalhes.banco,
      maquina_cartao: detalhes.maquina,
      caixa: detalhes.caixa
    }
  })
  
  closeModal()
  refetch()
  toast.success("Detalhamento salvo!")
}
```

---

#### Modal 2: LANÇAMENTO MANUAL

**Componente:** `ModalLancamentoManual.jsx`

##### Estrutura
```
┌─────────────────────────────────────────────────────┐
│ Novo Lançamento Manual                           X  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Tipo *                                            │
│  ● Entrada  ○ Saída                                │
│                                                     │
│  Grupo *                                           │
│  [Selecione: Operacional, Investimento, ... ▼]    │
│                                                     │
│  Descrição *                                       │
│  [Digite a descrição]                              │
│                                                     │
│  Valor R$ *                                        │
│  [0,00]                                            │
│                                                     │
│  Data do Lançamento *                              │
│  [DD/MM/AAAA]                                      │
│                                                     │
│  Se SAÍDA:                                         │
│  Fonte do dinheiro *                               │
│  ○ Banco  ○ Máquina  ○ Caixa                       │
│                                                     │
│  [Cancelar]              [Salvar Lançamento]       │
└─────────────────────────────────────────────────────┘
```

##### Campos
```javascript
{
  tipo: 'entrada' | 'saida',
  grupo: 'operacional' | 'investimento' | 'financiamento',
  descricao: string,
  valor: number,
  data_pagamento: date,
  fonte_saida: 'banco' | 'maquina_cartao' | 'caixa' // se saída
}
```

##### Validações
```javascript
if (!tipo) error("Tipo obrigatório")
if (!grupo) error("Grupo obrigatório")
if (!descricao) error("Descrição obrigatória")
if (!valor || valor <= 0) error("Valor > 0")
if (!data_pagamento) error("Data obrigatória")

if (tipo === 'saida' && !fonte_saida) {
  error("Informe a fonte do dinheiro para saídas")
}
```

---

## 🎨 ESTILOS E CORES

### Paleta DFC
```javascript
const colors = {
  // Tipos
  entrada: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    icon: 'text-green-600'
  },
  saida: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    icon: 'text-red-600'
  },
  total: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: 'text-blue-600'
  },
  
  // Grupos
  operacional: 'bg-gray-100 text-gray-800',
  investimento: 'bg-purple-100 text-purple-800',
  financiamento: 'bg-orange-100 text-orange-800',
  saldo_inicial: 'bg-blue-100 text-blue-800',
  
  // Fontes
  banco: 'bg-blue-100 text-blue-800',
  maquina_cartao: 'bg-pink-100 text-pink-800',
  caixa: 'bg-green-100 text-green-800'
}
```

---

## 📱 RESPONSIVIDADE

### Breakpoints DFC
```javascript
// Desktop (≥1024px)
- 2 linhas de cards (4 + 3 cards)
- Gráfico waterfall largura total
- Tabela com todas as colunas

// Tablet (768px - 1023px)
- 2 cards por linha
- Gráfico com scroll horizontal
- Tabela responsiva

// Mobile (<768px)
- 1 card por linha
- Gráfico simplificado (barras verticais)
- Calendário em lista vertical
```

---

**Documento criado por:** QA Senior  
**Data:** 2026-05-22  
**Próxima atualização:** 2026-06-22