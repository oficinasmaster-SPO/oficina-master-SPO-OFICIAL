# 📊 Guia Detalhado de UI — DRE Avançado

**Documento:** UI-GUIDE-001  
**Tela:** DRE & TCMP² → Aba "DRE Avançado"  
**Arquivo:** `components/dre/DREAvancadoTab.jsx`

---

## 🎯 VISÃO GERAL DA TELA

### Finalidade
Registrar e analisar **receitas e despesas** no regime de competência com cálculos automáticos de KPIs (TCMP², R70/I30, margens).

### Localização
`/DRETCMP2` → Aba superior "DRE Avançado"

---

## 📐 ESTRUTURA DA TELA (Hierarquia)

```
DREAvancadoTab (Componente Principal)
│
├── 1. FiltroPeríodo (Topo)
│   ├── Seletor de Mês/Ano
│   └── Botões de Navegação (< mês >)
│
├── 2. Cards de KPIs (Linha 1)
│   ├── Card: Faturamento Total
│   ├── Card: Custos Diretos
│   ├── Card: TCMP²
│   ├── Card: Lucro Líquido
│   └── Card: Margem de Lucro
│
├── 3. Cards de Proporção (Linha 2)
│   ├── Card: R70/I30 (Gráfico pizza)
│   └── Card: Composição Receita (Serviços vs Peças)
│
├── 4. Tabs Internas (Sub-abas)
│   ├── "Visão Geral" (Agrupado por categorias)
│   ├── "Lançamentos" (Lista completa)
│   └── "Recorrências" (Lançamentos recorrentes)
│
└── 5. Modal de Lançamento
    ├── Formulário de Criação/Edição
    └── Seletor de Recorrência
```

---

## 🔍 DETALHAMENTO POR COMPONENTE

### 1. FILTRO DE PERÍODO

**Componente:** `FiltroPeriodo.jsx`

#### Estrutura Visual
```
┌─────────────────────────────────────────────┐
│  < Agosto 2026 >                            │
│  [◄ Mês Anterior]  [Próximo Mês ►]         │
└─────────────────────────────────────────────┘
```

#### Campos
```javascript
{
  mes: "2026-08",  // Formato YYYY-MM
  ano: 2026,
  mesNome: "Agosto"
}
```

#### Funcionalidades
- **Seta esquerda:** `selectedMonth = month - 1`
- **Seta direita:** `selectedMonth = month + 1`
- **Click no mês:** Abre date picker (opcional)
- **Validação:** Não permite mês futuro (mês atual OK)

#### Estado
```javascript
const [selectedMonth, setSelectedMonth] = useState('2026-08');
```

---

### 2. CARDS DE KPIs (Linha 1)

#### Card 1: FATURAMENTO TOTAL

**Componente:** `MetricCard.jsx`

##### Visual
```
┌────────────────────────────┐
│ 📦 Faturamento Total       │
│ R$ 1.250.000,00            │
│ ▲ 12% vs mês anterior      │
└────────────────────────────┘
```

##### Dados
```javascript
{
  titulo: "Faturamento Total",
  icone: "📦",
  valor: 1250000.00,
  formato: "BRL",
  variacao: +12.5,
  corVariacao: "green" // green=positivo, red=negativo
}
```

##### Cálculo
```javascript
faturamento_total = sum(DRELancamento.valor 
  WHERE tipo = 'receita' 
  AND mes = selectedMonth)
```

##### Regras
- Inclui TODAS as receitas (Serviços, Peças, Outras)
- Compara com mês anterior automaticamente
- Variação em porcentagem (%)

---

#### Card 2: CUSTOS DIRETOS

**Componente:** `MetricCard.jsx`

##### Visual
```
┌────────────────────────────┐
│ ⚙️ Custos Diretos          │
│ R$ 450.000,00              │
│ ▼ 5% vs mês anterior       │
└────────────────────────────┘
```

##### Dados
```javascript
{
  titulo: "Custos Diretos",
  icone: "⚙️",
  valor: 450000.00,
  formato: "BRL",
  variacao: -5.2,
  corVariacao: "green" // negativo em custo = positivo
}
```

##### Cálculo
```javascript
custos_diretos = sum(DRELancamento.valor 
  WHERE categoria IN ['Peças', 'Mão de Obra Direta', 'Serviços de Terceiros']
  AND entra_tcmp2 = true
  AND mes = selectedMonth)
```

##### Regras
- Apenas categorias com `entra_tcmp2 = true`
- Usado no cálculo do TCMP²
- Variação negativa = bom (redução de custos)

---

#### Card 3: TCMP²

**Componente:** `MetricCard.jsx` + `Tooltip`

##### Visual
```
┌────────────────────────────┐
│ ⏱️ TCMP²                   │
│ R$ 185,50/h                │
│ ℹ️ (hover: ver fórmula)   │
└────────────────────────────┘
```

##### Dados
```javascript
{
  titulo: "TCMP²",
  icone: "⏱️",
  valor: 185.50,
  formato: "BRL/hora",
  tooltip: "Custo da Mão de Obra por Hora"
}
```

##### Cálculo
```javascript
// Função: calcularTCMP2
TCMP² = (custos_diretos + mao_obra_direta) / horas_trabalhadas

// Onde:
// - custos_diretos: DRELancamento (entra_tcmp2=true)
// - mao_obra_direta: DRELancamento (categoria='Mão de Obra')
// - horas_trabalhadas: RegistroDiario.total_horas (QGP)
```

##### Tooltip (Conteúdo)
```
TCMP² = Custo da Mão de Obra por Hora

Fórmula:
(Custos Diretos + Mão de Obra) / Horas Trabalhadas

Este mês:
(R$ 450.000 + R$ 180.000) / 3.400h = R$ 185,50/h

Meta ideal: < R$ 150/h
```

---

#### Card 4: LUCRO LÍQUIDO

**Componente:** `MetricCard.jsx`

##### Visual
```
┌────────────────────────────┐
│ 💰 Lucro Líquido           │
│ R$ 320.000,00              │
│ ▲ 8% vs mês anterior       │
└────────────────────────────┘
```

##### Dados
```javascript
{
  titulo: "Lucro Líquido",
  icone: "💰",
  valor: 320000.00,
  formato: "BRL",
  variacao: +8.3,
  corVariacao: "green"
}
```

##### Cálculo
```javascript
lucro_liquido = receitas_totais - despesas_totais
```

##### Regras
- Pode ser negativo (prejuízo)
- Se negativo → cor vermelha
- Variação calculada sobre lucro do mês anterior

---

#### Card 5: MARGEM DE LUCRO

**Componente:** `MetricCard.jsx` + `ProgressBar`

##### Visual
```
┌────────────────────────────┐
│ 📊 Margem de Lucro         │
│ 25.6%                      │
│ ████████░░░░░░ 25.6%       │
└────────────────────────────┘
```

##### Dados
```javascript
{
  titulo: "Margem de Lucro",
  icone: "📊",
  valor: 25.6,
  formato: "percentual",
  barraProgresso: true
}
```

##### Cálculo
```javascript
margem_lucro = (lucro_liquido / receitas_totais) × 100
```

##### Cores da Barra
```javascript
if (margem >= 20) cor = "green"   // Excelente
else if (margem >= 15) cor = "blue"  // Bom
else if (margem >= 10) cor = "yellow" // Atenção
else cor = "red"  // Crítico
```

---

### 3. CARDS DE PROPORÇÃO (Linha 2)

#### Card 6: R70/I30

**Componente:** `R70I30Card.jsx` + `PieChart`

##### Visual
```
┌──────────────────────────────────┐
│ 🎯 R70/I30 (Proporção Ideal)    │
│                                  │
│       ┌──────────┐               │
│       │   GRAFICO│               │
│       │  PIZZA   │               │
│       │  70% █   │               │
│       │  30% ░   │               │
│       └──────────┘               │
│                                  │
│  █ 70% Serviços (R$ 875k)       │
│  ░ 30% Peças (R$ 375k)          │
│                                  │
│  Status: ✅ Dentro da meta       │
└──────────────────────────────────┘
```

##### Dados
```javascript
{
  titulo: "R70/I30",
  descricao: "Proporção Receita de Serviços vs Peças",
  meta: {
    servicos: 70,  // %
    pecas: 30      // %
  },
  atual: {
    servicos: 70.0,  // % calculado
    pecas: 30.0,
    valor_servicos: 875000.00,
    valor_pecas: 375000.00
  },
  status: "dentro" // dentro | acima | abaixo
}
```

##### Cálculo
```javascript
receita_servicos = sum(DRELancamento.valor 
  WHERE categoria IN ['Receita de Serviços', 'Outros Serviços'])

receita_pecas = sum(DRELancamento.valor 
  WHERE categoria = 'Receita de Peças')

receita_total = receita_servicos + receita_pecas

R70 = (receita_servicos / receita_total) × 100
I30 = (receita_pecas / receita_total) × 100
```

##### Status
```javascript
if (R70 >= 70 && I30 <= 30) 
  status = "✅ Dentro da meta"
else if (R70 < 70)
  status = "⚠️ Serviços abaixo (R70 < 70%)"
else
  status = "⚠️ Peças acima (I30 > 30%)"
```

##### Gráfico (Recharts)
```javascript
<PieChart>
  <Pie
    data={[
      { name: 'Serviços', value: 70, color: '#22c55e' },
      { name: 'Peças', value: 30, color: '#eab308' }
    ]}
    cx="50%"
    cy="50%"
    outerRadius={80}
  />
</PieChart>
```

---

#### Card 7: COMPOSIÇÃO DE RECEITA

**Componente:** `ComposicaoReceitaCard.jsx` + `BarChart`

##### Visual
```
┌──────────────────────────────────┐
│ 📦 Composição de Receita         │
│                                  │
│  ┌────────────────────────────┐  │
│  │   GRÁFICO BARRAS           │  │
│  │  ██████████ Serviços       │  │
│  │  ████ Peças                │  │
│  │  ██ Outras                 │  │
│  └────────────────────────────┘  │
│                                  │
│  Serviços:  R$ 875.000 (70%)    │
│  Peças:     R$ 375.000 (30%)    │
│  Outras:    R$ 50.000 (4%)      │
│  ─────────────────────────────  │
│  Total:     R$ 1.300.000        │
└──────────────────────────────────┘
```

##### Dados
```javascript
{
  titulo: "Composição de Receita",
  categorias: [
    { nome: 'Serviços', valor: 875000, percentual: 70 },
    { nome: 'Peças', valor: 375000, percentual: 30 },
    { nome: 'Outras', valor: 50000, percentual: 4 }
  ]
}
```

##### Cálculo
```javascript
for (categoria in categorias_receita) {
  valor = sum(DRELancamento.valor 
    WHERE categoria = categoria
    AND tipo = 'receita')
  
  percentual = (valor / receita_total) × 100
}
```

---

### 4. TABS INTERNAS (SUB-ABAS)

#### Tab 1: VISÃO GERAL

**Componente:** `VisaoGeralTab.jsx`

##### Estrutura
```
Visão Geral
│
├── Grupo: RECEITAS
│   ├── Card: Receita de Serviços
│   │   ├── Valor: R$ 875.000
│   │   ├── Meta: R$ 800.000
│   │   ├── Atingimento: 109% ✅
│   │   └── Variação: +12% vs mês anterior
│   │
│   ├── Card: Receita de Peças
│   │   ├── Valor: R$ 375.000
│   │   ├── Meta: R$ 400.000
│   │   ├── Atingimento: 94% ⚠️
│   │   └── Variação: -5% vs mês anterior
│   │
│   └── Card: Outras Receitas
│       ├── Valor: R$ 50.000
│       └── ...
│
└── Grupo: DESPESAS
    ├── Subgrupo: Custos Diretos
    │   ├── Linha: Peças e Materiais
    │   │   ├── Valor: R$ 280.000
    │   │   ├── TCMP²: Sim
    │   │   └── % do faturamento: 22.4%
    │   │
    │   └── Linha: Mão de Obra Direta
    │       ├── Valor: R$ 170.000
    │       └── ...
    │
    └── Subgrupo: Despesas Operacionais
        ├── Linha: Aluguel
        ├── Linha: Energia
        └── Linha: Água
```

##### Componentes
```javascript
<VisaoGeralTab>
  <Section title="RECEITAS">
    <CategoryCard 
      categoria="Receita de Serviços"
      valor={875000}
      meta={800000}
      atingimento={109}
      variacao={+12}
    />
    <CategoryCard 
      categoria="Receita de Peças"
      valor={375000}
      meta={400000}
      atingimento={94}
      variacao={-5}
    />
  </Section>

  <Section title="DESPESAS">
    <Subgroup title="Custos Diretos">
      <CategoryRow 
        categoria="Peças e Materiais"
        valor={280000}
        entra_tcmp2={true}
        percentual_faturamento={22.4}
      />
      <CategoryRow 
        categoria="Mão de Obra Direta"
        valor={170000}
        entra_tcmp2={true}
        percentual_faturamento={13.6}
      />
    </Subgroup>
  </Section>
</VisaoGeralTab>
```

##### Regras de Exibição
- **Receitas:** Ordem decrescente de valor
- **Despesas:** Agrupado por subcategoria
- **Custos Diretos:** Badge "TCMP²" visível
- **Cores:**
  - Verde: Atingimento ≥ 100%
  - Amarelo: Atingimento 80-99%
  - Vermelho: Atingimento < 80%

---

#### Tab 2: LANÇAMENTOS

**Componente:** `LancamentosTab.jsx` + `Table`

##### Estrutura da Tabela
```
┌──────────────────────────────────────────────────────────────────┐
│ LANÇAMENTOS                          [+ Novo Lançamento]         │
├──────────────────────────────────────────────────────────────────┤
│ Data       │ Categoria      │ Descrição   │ Valor    │ Ações    │
├────────────┼────────────────┼─────────────┼──────────┼──────────┤
│ 01/08/2026 │ Receita Serv.  │ Projeto X   │ R$ 50k   │ ✏️ 🗑️   │
│ 05/08/2026 │ Peças          │ Motor       │ R$ 12k   │ ✏️ 🗑️   │
│ 10/08/2/08/2026 │ Aluguel        │ Loja        │ R$ 8k    │ ✏️ 🗑️   │
│ ...        │ ...            │ ...         │ ...      │ ...      │
└──────────────────────────────────────────────────────────────────┘
```

##### Colunas
```javascript
[
  {
    header: "Data",
    accessor: "data_vencimento",
    format: "DD/MM/YYYY",
    width: "120px"
  },
  {
    header: "Categoria",
    accessor: "categoria",
    render: (value) => (
      <Badge variant={getCategoryVariant(value)}>
        {value}
      </Badge>
    )
  },
  {
    header: "Descrição",
    accessor: "descricao",
    width: "300px",
    truncate: true
  },
  {
    header: "Valor",
    accessor: "valor",
    format: "BRL",
    align: "right",
    render: (value, row) => (
      <span className={row.tipo === 'receita' ? 'text-green' : 'text-red'}>
        {formatBRL(value)}
      </span>
    )
  },
  {
    header: "Ações",
    accessor: "id",
    width: "100px",
    render: (id) => (
      <div className="flex gap-2">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => handleEdit(id)}
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => handleDelete(id)}
        >
          <Trash className="w-4 h-4" />
        </Button>
      </div>
    )
  }
]
```

##### Filtros da Tabela
```javascript
<FiltrosLancamentos>
  <Select 
    label="Tipo"
    options={['Todos', 'Receita', 'Despesa']}
  />
  <Select 
    label="Categoria"
    options={todas_categorias}
  />
  <Input 
    label="Descrição"
    placeholder="Buscar..."
  />
  <DateRangePicker
    label="Período"
  />
</FiltrosLancamentos>
```

##### Paginação
```javascript
<Pagination
  currentPage={1}
  totalPages={10}
  pageSize={20}
  totalRecords={200}
/>
```

---

#### Tab 3: RECORRÊNCIAS

**Componente:** `RecorrenciasTab.jsx`

##### Estrutura
```
┌─────────────────────────────────────────────────────────┐
│ LANÇAMENTOS RECORRENTES    [+ Nova Recorrência]        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌────────────────────────────────────────────────┐    │
│  │ 🔄 Aluguel - Loja                              │    │
│  │    Categoria: Aluguel                          │    │
│  │    Valor: R$ 8.000,00                          │    │
│  │    Frequência: Mensal                          │    │
│  │    Próximo vencimento: 10/Set/2026             │    │
│  │    Status: ✅ Ativa                            │    │
│  │    Ações: ✏️ Editar  🗑️ Excluir  ⏸️ Pausar   │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  ┌────────────────────────────────────────────────┐    │
│  │ 🔄 Internet - Vivo                             │    │
│  │    Categoria: Telefone/Internet                │    │
│  │    Valor: R$ 350,00                            │    │
│  │    Frequência: Mensal                          │    │
│  │    Próximo vencimento: 05/Set/2026             │    │
│  │    Status: ✅ Ativa                            │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

##### Card de Recorrência
```javascript
<RecorrenciaCard>
  <CardHeader>
    <div className="flex items-center gap-2">
      <RefreshCw className="w-5 h-5 text-blue-500" />
      <h3>{descricao}</h3>
      <Badge variant={status === 'ativa' ? 'success' : 'secondary'}>
        {status}
      </Badge>
    </div>
  </CardHeader>
  
  <CardContent>
    <div className="grid grid-cols-2 gap-4">
      <InfoRow label="Categoria" value={categoria} />
      <InfoRow label="Valor" value={formatBRL(valor)} />
      <InfoRow label="Frequência" value={frequencia} />
      <InfoRow 
        label="Próximo Vencimento" 
        value={formatDate(proximo_vencimento)} 
      />
      <InfoRow 
        label="Última Execução" 
        value={formatDate(ultima_execucao)} 
      />
      <InfoRow 
        label="Total Já Executado" 
        value={`R$ ${total_executado}`} 
      />
    </div>
  </CardContent>
  
  <CardFooter>
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleEdit}>
        <Pencil className="w-4 h-4" />
        Editar
      </Button>
      <Button variant="outline" size="sm" onClick={handlePause}>
        {pausada ? 'Ativar' : 'Pausar'}
      </Button>
      <Button variant="destructive" size="sm" onClick={handleDelete}>
        <Trash className="w-4 h-4" />
        Excluir
      </Button>
    </div>
  </CardFooter>
</RecorrenciaCard>
```

##### Tipos de Frequência
```javascript
const frequencias = [
  { value: 'diaria', label: 'Diária', dias: 1 },
  { value: 'semanal', label: 'Semanal', dias: 7 },
  { value: 'mensal', label: 'Mensal', dias: 30 },
  { value: 'bimestral', label: 'Bimestral', dias: 60 },
  { value: 'trimestral', label: 'Trimestral', dias: 90 },
  { value: 'semestral', label: 'Semestral', dias: 180 },
  { value: 'anual', label: 'Anual', dias: 365 }
]
```

---

### 5. MODAL DE LANÇAMENTO

**Componente:** `LancamentoModal.jsx` + `Dialog`

#### Estrutura do Modal
```
┌─────────────────────────────────────────────────────────┐
│ Novo Lançamento                                      X │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Tipo *                                               │
│  ○ Receita  ● Despesa                                 │
│                                                         │
│  Categoria *                                          │
│  [Selecione uma categoria ▼]                          │
│                                                         │
│  Descrição *                                          │
│  [Digite a descrição]                                 │
│                                                         │
│  Valor R$ *                                           │
│  [0,00]                                               │
│                                                         │
│  Data de Vencimento                                   │
│  [DD/MM/AAAA]                                         │
│                                                         │
│  Data de Pagamento                                    │
│  [DD/MM/AAAA]                                         │
│                                                         │
│  ┌─ Este lançamento é recorrente?                     │
│  │                                                     │
│  │  Frequência: [Mensal ▼]                            │
│  │  Data de início: [01/08/2026]                      │
│  │  Data de término: [ ] (opcional)                   │
│  │                                                     │
│  └─────────────────────────────────────────────────────┘
│                                                         │
│  [Cancelar]                    [Salvar Lançamento]     │
└─────────────────────────────────────────────────────────┘
```

#### Campos do Formulário
```javascript
{
  tipo: 'receita' | 'despesa',  // Radio group
  categoria: string,            // Select (depende do tipo)
  descricao: string,            // Input text
  valor: number,                // InputMoeda (BRL)
  data_vencimento: date,        // DatePicker
  data_pagamento: date,         // DatePicker (opcional)
  recorrente: boolean,          // Checkbox
  frequencia: string,           // Select (se recorrente)
  data_inicio: date,            // DatePicker (se recorrente)
  data_fim: date                // DatePicker (opcional)
}
```

#### Validações
```javascript
// Obrigatórios
if (!tipo) error("Tipo é obrigatório")
if (!categoria) error("Categoria é obrigatória")
if (!descricao) error("Descrição é obrigatória")
if (!valor || valor <= 0) error("Valor deve ser > 0")

// Opcionais
if (data_pagamento && data_pagamento < data_vencimento) {
  warn("Data de pagamento anterior ao vencimento")
}

// Recorrência
if (recorrente && !frequencia) {
  error("Frequência é obrigatória para recorrentes")
}
if (data_fim && data_fim < data_inicio) {
  error("Data de término deve ser após início")
}
```

#### Ações
```javascript
// Salvar
const handleSave = async (formData) => {
  // 1. Criar lançamento
  await DRELancamento.create(formData)
  
  // 2. Se recorrente, criar recorrência
  if (formData.recorrente) {
    await LancamentoRecorrente.create({
      ...formData,
      proxima_execucao: calcularProximaExecucao()
    })
  }
  
  // 3. Fechar modal e atualizar lista
  closeModal()
  refetch()
  toast.success("Lançamento criado com sucesso!")
}

// Editar
const handleEdit = async (id, formData) => {
  await DRELancamento.update(id, formData)
  closeModal()
  refetch()
  toast.success("Lançamento atualizado!")
}

// Excluir
const handleDelete = async (id) => {
  const confirmed = confirm("Tem certeza?")
  if (!confirmed) return
  
  await DRELancamento.delete(id)
  refetch()
  toast.success("Lançamento excluído!")
}
```

---

## 🎨 ESTILOS E CORES

### Paleta de Cores
```javascript
const colors = {
  // Receitas
  receita: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    icon: 'text-green-600'
  },
  
  // Despesas
  despesa: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    icon: 'text-red-600'
  },
  
  // Status
  success: {
    bg: 'bg-green-100',
    text: 'text-green-800'
  },
  warning: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800'
  },
  error: {
    bg: 'bg-red-100',
    text: 'text-red-800'
  },
  
  // Categorias
  categorias: {
    'Receita de Serviços': 'bg-blue-100 text-blue-800',
    'Receita de Peças': 'bg-purple-100 text-purple-800',
    'Peças e Materiais': 'bg-orange-100 text-orange-800',
    'Mão de Obra': 'bg-pink-100 text-pink-800',
    'Aluguel': 'bg-gray-100 text-gray-800',
    'Energia': 'bg-yellow-100 text-yellow-800'
  }
}
```

---

## 📱 RESPONSIVIDADE

### Breakpoints
```javascript
// Desktop (≥1024px)
- 2 linhas de cards (5 + 2 cards)
- Tabela com todas as colunas
- Modal largura 600px

// Tablet (768px - 1023px)
- 1 linha de cards (3 cards por linha)
- Tabela com scroll horizontal
- Modal largura 80%

// Mobile (<768px)
- 1 card por linha
- Tabela vira cards empilhados
- Modal tela cheia
- Menu hambúrguer para filtros
```

---

**Documento criado por:** QA Senior  
**Data:** 2026-05-22  
**Próxima atualização:** 2026-06-22