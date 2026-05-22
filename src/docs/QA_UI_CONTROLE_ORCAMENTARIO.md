# 📈 Guia Detalhado de UI — Controle Orçamentário

**Documento:** UI-GUIDE-003  
**Tela:** DRE & TCMP² → Aba "Controle Orçamentário"  
**Arquivo:** `components/budgetcontrol/BudgetMetaTab.jsx`

---

## 🎯 VISÃO GERAL DA TELA

### Finalidade
Comparar **REALIZADO (DRE)** vs **META (BudgetMeta)** com controle de sazonalidade, hierarquia e fechamento de meses.

### Localização
`/DRETCMP2` → Aba superior "Controle Orçamentário"

---

## 📐 ESTRUTURA DA TELA (Hierarquia)

```
BudgetMetaTab (Componente Principal)
│
├── 1. Header com Ações
│   ├── Título: "Controle Orçamentário"
│   ├── Botão: 🔒 Fechar Mês (FecharMesModal)
│   └── Botão: 📜 Histórico (HistoricoMetasModal)
│
├── 2. Botões de Funcionalidades FASE 2
│   ├── Card: 📊 Distribuição Sazonal
│   └── Card: 📁 Hierarquia Orçamentária
│
├── 3. Filtro de Período
│   └── Seletor de Mês/Ano
│
├── 4. Cards de Resumo
│   ├── Card: Meta Total vs Realizado
│   ├── Card: Atingimento Global (%)
│   ├── Card: Variação (R$)
│   └── Card: Status do Mês (Aberto/Fechado)
│
├── 5. Lista de Metas (Cards Individuais)
│   ├── MetaCard (Receitas)
│   │   ├── Cabeçalho (Nome + Responsável)
│   │   ├── Valores (Meta vs Realizado)
│   │   ├── Barra de Progresso
│   │   ├── Atingimento (%)
│   │   ├── Status (✅ ⚠️ ❌)
│   │   ├── Ações (✏️ 🗑️ 📜)
│   │   └── Badge (Mês Fechado)
│   │
│   └── MetaCard (Despesas)
│       └── ... (mesma estrutura)
│
└── 6. Modais
    ├── ModalCriacaoMeta
    ├── ModalEdicaoMeta
    ├── HistoricoMetasModal
    └── FecharMesModal
```

---

## 🔍 DETALHAMENTO POR COMPONENTE

### 1. HEADER COM AÇÕES

**Componente:** `BudgetMetaHeader.jsx`

#### Estrutura Visual
```
┌─────────────────────────────────────────────────────────┐
│ 💳 Controle Orçamentário        [🔒 Fechar] [📜 Histórico] │
└─────────────────────────────────────────────────────────┘
```

#### Botões
```javascript
[
  {
    label: "Fechar Mês",
    icone: "🔒",
    variant: "outline",
    color: "amber",
    onClick: () => openFecharMesModal()
  },
  {
    label: "Histórico",
    icone: "📜",
    variant: "outline",
    color: "blue",
    onClick: () => openHistoricoModal()
  }
]
```

#### Estados do Mês
```javascript
if (mes_fechado) {
  badge = "🔒 Mês Fechado"
  corBadge = "amber"
  botoes_edicao = disabled
} else {
  badge = "🔓 Mês Aberto"
  corBadge = "green"
  botoes_edicao = enabled
}
```

---

### 2. BOTÕES DE FUNCIONALIDADES FASE 2

#### Card 1: DISTRIBUIÇÃO SAZONAL

**Componente:** `FuncionalidadeCard.jsx`

##### Visual
```
┌────────────────────────────────┐
│ 📊 Distribuição Sazonal        │
│                                │
│ Configure pesos mensais para   │
│ metas realistas                │
│                                │
│ [Abrir Editor]                 │
└────────────────────────────────┘
```

##### Ação
```javascript
onClick: () => {
  window.dispatchEvent(
    new CustomEvent('open-sazonalidade-editor')
  )
}
```

##### Descrição
- Abre `SazonalidadeEditor.jsx`
- Permite configurar pesos para cada mês (01-12)
- Valida soma = 1.00 (100%)

---

#### Card 2: HIERARQUIA ORÇAMENTÁRIA

**Componente:** `FuncionalidadeCard.jsx`

##### Visual
```
┌────────────────────────────────┐
│ 📁 Hierarquia Orçamentária     │
│                                │
│ Organize por grupos e          │
│ categorias                     │
│                                │
│ [Abrir Editor]                 │
└────────────────────────────────┘
```

##### Ação
```javascript
onClick: () => {
  window.dispatchEvent(
    new CustomEvent('open-hierarquia-editor')
  )
}
```

##### Descrição
- Abre `HierarquiaOrcamentaria.jsx`
- Permite criar/editar `BudgetGroup`
- Estrutura em árvore (grupos e subgrupos)

---

### 3. FILTRO DE PERÍODO

**Componente:** `FiltroPeriodo.jsx` (mesmo do DRE/DFC)

#### Funcionalidades Específicas
- Mostra mês de referência das metas
- Sincronizado com DRE e DFC
- Navegação (< mês >) igual

---

### 4. CARDS DE RESUMO

#### Card 1: META TOTAL VS REALIZADO

**Componente:** `BudgetSummaryCard.jsx`

##### Visual
```
┌────────────────────────────────┐
│ 📊 Meta Total vs Realizado     │
│                                │
│ Meta:      R$ 1.200.000        │
│ Realizado: R$ 1.150.000        │
│ ─────────────────────────────  │
│ Diferença: -R$ 50.000 (-4.2%)  │
│                                │
│ ████░░░░░░  95.8%              │
└────────────────────────────────┘
```

##### Dados
```javascript
{
  titulo: "Meta Total vs Realizado",
  icone: "📊",
  meta_total: 1200000.00,
  realizado_total: 1150000.00,
  diferenca_absoluta: -50000.00,
  diferenca_percentual: -4.2,
  barra_progresso: 95.8
}
```

##### Cálculo
```javascript
meta_total = sum(BudgetMeta.meta_fixa_rs 
  WHERE mes = selectedMonth)

realizado_total = sum(DRELancamento.valor 
  WHERE mes = selectedMonth 
  AND tipo = 'receita')

diferenca = realizado_total - meta_total
percentual = (realizado_total / meta_total) × 100
```

---

#### Card 2: ATINGIMENTO GLOBAL

**Componente:** `AtingimentoCard.jsx` + `GaugeChart`

##### Visual
```
┌────────────────────────────────┐
│ 🎯 Atingimento Global          │
│                                │
│       ┌──────────┐             │
│       │   95.8%  │             │
│       │  GAUGE   │             │
│       └──────────┘             │
│                                │
│ Status: ⚠️ Dentro do esperado  │
└────────────────────────────────┘
```

##### Dados
```javascript
{
  titulo: "Atingimento Global",
  icone: "🎯",
  percentual: 95.8,
  status: "dentro", // acima | dentro | abaixo
  gauge: {
    min: 0,
    max: 150, // permite > 100%
    valor: 95.8
  }
}
```

##### Status
```javascript
if (percentual >= 100) {
  status = "✅ Acima da meta"
  cor = "green"
} else if (percentual >= 80) {
  status = "⚠️ Dentro do esperado"
  cor = "yellow"
} else {
  status = "❌ Abaixo da meta"
  cor = "red"
}
```

---

#### Card 3: VARIAÇÃO (R$)

**Componente:** `VariacaoCard.jsx`

##### Visual
```
┌────────────────────────────────┐
│ 💹 Variação vs Meta            │
│                                │
│ -R$ 50.000,00                  │
│ ▼ 4.2% abaixo da meta          │
│                                │
│ 🔴 Negativo                    │
└────────────────────────────────┘
```

##### Dados
```javascript
{
  titulo: "Variação vs Meta",
  icone: "💹",
  valor_absoluto: -50000.00,
  valor_percentual: -4.2,
  status: "negativo", // positivo | negativo
  cor: "red" // green=positivo, red=negativo
}
```

##### Cálculo
```javascript
variacao_absoluta = realizado_total - meta_total
variacao_percentual = (variacao_absoluta / meta_total) × 100
```

---

#### Card 4: STATUS DO MÊS

**Componente:** `StatusMesCard.jsx`

##### Visual (Mês Aberto)
```
┌────────────────────────────────┐
│ 🔓 Status do Mês               │
│                                │
│ Mês ABERTO para edição         │
│                                │
│ ✅ Usuários podem editar metas │
│ ⚠️ Admin pode fechar a qualquer│
│   momento                      │
└────────────────────────────────┘
```

##### Visual (Mês Fechado)
```
┌────────────────────────────────┐
│ 🔒 Status do Mês               │
│                                │
│ Mês FECHADO desde 05/Set/2026  │
│                                │
│ ❌ Usuários não podem editar   │
│ ✅ Admin pode editar com       │
│   justificativa                │
│                                │
│ [Reabrir Mês] (apenas admin)   │
└────────────────────────────────┘
```

##### Dados
```javascript
{
  titulo: "Status do Mês",
  icone: mes_fechado ? "🔒" : "🔓",
  status: mes_fechado ? "fechado" : "aberto",
  data_fechamento: mes_fechado ? "2026-09-05" : null,
  quem_fechou: mes_fechado ? "Admin User" : null,
  justificativa: mes_fechado ? "Fechamento mensal" : null
}
```

---

### 5. LISTA DE METAS (CARDS INDIVIDUAIS)

#### MetaCard: ESTRUTURA PADRÃO

**Componente:** `MetaCardOtimizado.jsx` (memoizado)

##### Estrutura Visual
```
┌─────────────────────────────────────────────────────────┐
│ 📦 Receita de Serviços        👤 João Silva             │
│                                📅 Agosto 2026           │
│                                                        │
│  Meta:      R$ 800.000,00                              │
│  Realizado: R$ 875.000,00                              │
│  ─────────────────────────────                         │
│  Diferença: +R$ 75.000,00 (+9.4%)                      │
│                                                        │
│  ████████████░░░░  109.4%                             │
│                                                        │
│  ✅ Acima da meta                                      │
│                                                        │
│  [✏️ Editar]  [🗑️ Excluir]  [📜 Histórico]            │
│                                                        │
│  🔒 Mês Fechado (badge, se aplicável)                 │
└─────────────────────────────────────────────────────────┘
```

---

##### Cabeçalho do Card
```javascript
<CardHeader>
  <div className="flex justify-between items-start">
    <div className="flex items-center gap-2">
      <Icon 
        nome={getCategoriaIcon(meta.categoria)} 
        className="w-6 h-6"
      />
      <div>
        <h3 className="font-bold text-lg">
          {meta.item}
        </h3>
        <p className="text-sm text-muted-foreground">
          {meta.categoria}
        </p>
      </div>
    </div>
    
    <div className="text-right">
      <div className="flex items-center gap-2">
        <User className="w-4 h-4" />
        <span className="text-sm font-medium">
          {meta.responsavel_nome || 'Não atribuído'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        <span className="text-sm text-muted-foreground">
          {formatMonth(meta.mes)}
        </span>
      </div>
    </div>
  </div>
</CardHeader>
```

---

##### Seção de Valores
```javascript
<CardContent>
  <div className="grid grid-cols-2 gap-4">
    <ValueRow 
      label="Meta"
      value={meta.meta_fixa_rs}
      variant="meta"
    />
    <ValueRow 
      label="Realizado"
      value={realizado}
      variant={realizado >= meta.meta_fixa_rs ? 'success' : 'warning'}
    />
  </div>
  
  <div className="mt-4">
    <div className="flex justify-between text-sm mb-1">
      <span>Diferença</span>
      <span className={diferenca >= 0 ? 'text-green' : 'text-red'}>
        {formatBRL(diferenca)} ({percentual}%)
      </span>
    </div>
    
    <ProgressBar 
      value={atingimento}
      max={150}
      color={getProgressBarColor(atingimento)}
    />
  </div>
</CardContent>
```

---

##### Barra de Progresso
```javascript
<ProgressBar>
  {({ value, max, color }) => (
    <div className="w-full bg-gray-200 rounded-full h-3">
      <div 
        className={`h-3 rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(value, max)}%` }}
      />
    </div>
  )}
</ProgressBar>
```

##### Cores da Barra
```javascript
function getProgressBarColor(atingimento) {
  if (atingimento >= 100) return 'bg-green-500'
  if (atingimento >= 80) return 'bg-yellow-500'
  if (atingimento >= 60) return 'bg-orange-500'
  return 'bg-red-500'
}
```

---

##### Status Badge
```javascript
<Badge variant={status}>
  {status === 'acima' && '✅ Acima da meta'}
  {status === 'dentro' && '⚠️ Dentro do esperado'}
  {status === 'abaixo' && '❌ Abaixo da meta'}
</Badge>
```

---

##### Ações do Card
```javascript
<CardFooter>
  <div className="flex gap-2">
    <Button 
      variant="outline" 
      size="sm"
      onClick={() => handleEdit(meta.id)}
      disabled={mes_fechado && user.role !== 'admin'}
    >
      <Pencil className="w-4 h-4" />
      Editar
    </Button>
    
    <Button 
      variant="outline" 
      size="sm"
      onClick={() => handleDelete(meta.id)}
      disabled={mes_fechado && user.role !== 'admin'}
    >
      <Trash className="w-4 h-4" />
      Excluir
    </Button>
    
    <Button 
      variant="outline" 
      size="sm"
      onClick={() => openHistorico(meta.id)}
    >
      <Scroll className="w-4 h-4" />
      Histórico
    </Button>
  </div>
</CardFooter>
```

---

##### Badge de Mês Fechado
```javascript
{mes_fechado && (
  <Badge variant="amber" className="mt-4">
    <Lock className="w-3 h-3 mr-1" />
    Mês Fechado - Apenas admin edita
  </Badge>
)}
```

---

#### Tipos de MetaCard

##### MetaCard: RECEITA
```javascript
{
  tipo: "receita",
  icone: "📦",
  cor: "green",
  regra_atingimento: "quanto maior, melhor",
  status: {
    acima: "✅ Acima da meta",
    dentro: "⚠️ Dentro do esperado",
    abaixo: "❌ Abaixo da meta"
  }
}
```

##### MetaCard: DESPESA
```javascript
{
  tipo: "despesa",
  icone: "💸",
  cor: "red",
  regra_atingimento: "quanto menor, melhor",
  status: {
    acima: "❌ Acima da meta (ruim)",
    dentro: "⚠️ Dentro do esperado",
    abaixo: "✅ Abaixo da meta (bom)"
  }
}
```

---

### 6. MODAIS

#### Modal 1: CRIAÇÃO DE META

**Componente:** `CriarMetaModal.jsx`

##### Estrutura
```
┌─────────────────────────────────────────────────────┐
│ Nova Meta Orçamentária                           X  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Item *                                            │
│  [Selecione o item ▼]                              │
│  (deve corresponder à categoria do DRE)            │
│                                                     │
│  Tipo *                                            │
│  ● Receita  ○ Despesa                              │
│                                                     │
│  Periodicidade *                                   │
│  ● Mensal  ○ Anual                                 │
│                                                     │
│  Se MENSAL:                                        │
│  Meta Fixa (R$) *                                  │
│  [0,00]                                            │
│                                                     │
│  Se ANUAL:                                         │
│  Meta Anual (R$) *                                 │
│  [0,00]                                            │
│                                                     │
│  Sazonalidade:                                     │
│  ○ Usar pesos mensais (configurar depois)          │
│  ○ Distribuir igualmente (12 meses)                │
│                                                     │
│  Responsável                                       │
│  [Selecione ▼]                                     │
│                                                     │
│  Notas                                             │
│  [Observações adicionais]                          │
│                                                     │
│  [Cancelar]              [Criar Meta]              │
└─────────────────────────────────────────────────────┘
```

##### Campos
```javascript
{
  item: string,             // Nome (deve existir em DRE)
  categoria: string,        // Categoria do DRE
  tipo: 'receita' | 'despesa',
  periodicidade: 'mensal' | 'anual',
  meta_fixa_rs: number,     // Se mensal
  meta_anual_rs: number,    // Se anual
  peso_sazonal: number,     // 0.00-1.00
  sazonalidade_config: {    // Se anual
    "01": number, "02": number, ..., "12": number
  },
  responsavel_nome: string,
  notas: string
}
```

##### Validações
```javascript
// Obrigatórios
if (!item) error("Item obrigatório")
if (!categoria) error("Categoria obrigatória")
if (!tipo) error("Tipo obrigatório")
if (!periodicidade) error("Periodicidade obrigatória")

// Meta
if (periodicidade === 'mensal' && !meta_fixa_rs) {
  error("Meta fixa obrigatória para mensal")
}
if (periodicidade === 'anual' && !meta_anual_rs) {
  error("Meta anual obrigatória")
}

// Validação DRE
if (!DRECategoriaExists(item)) {
  error("Item deve existir nas categorias do DRE")
}
```

##### Ação Criar
```javascript
const handleCreate = async (formData) => {
  // 1. Criar BudgetMeta
  await BudgetMeta.create(formData)
  
  // 2. Se anual + sazonalidade, criar 12 meses
  if (formData.periodicidade === 'anual') {
    for (mes of [01..12]) {
      await BudgetMeta.create({
        ...formData,
        mes: `${ano}-${mes}`,
        meta_fixa_rs: formData.meta_anual_rs × formData.peso_sazonal[mes]
      })
    }
  }
  
  closeModal()
  refetch()
  toast.success("Meta criada com sucesso!")
}
```

---

#### Modal 2: EDIÇÃO DE META

**Componente:** `EditarMetaModal.jsx`

##### Estrutura
```
┌─────────────────────────────────────────────────────┐
│ Editar Meta                                      X  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Item: Receita de Serviços (não editável)          │
│                                                     │
│  Meta Fixa (R$) *                                  │
│  [800.000,00]                                      │
│                                                     │
│  Responsável                                       │
│  [João Silva ▼]                                    │
│                                                     │
│  Notas                                             │
│  [Meta baseada no histórico...]                    │
│                                                     │
│  ┌─ Este mês está FECHADO                         │
│  │                                                 │
│  │  ⚠️ Justificativa obrigatória para edição      │
│  │                                                 │
│  │  Justificativa *                               │
│  │  [Digite o motivo da alteração]                │
│  │                                                 │
│  └─────────────────────────────────────────────────┘
│                                                     │
│  [Cancelar]              [Salvar Alterações]       │
└─────────────────────────────────────────────────────┘
```

##### Validações (Mês Fechado)
```javascript
if (mes_fechado && !justificativa) {
  error("Justificativa obrigatória para mês fechado")
  disableSave()
}
```

##### Ação Salvar
```javascript
const handleSave = async (metaId, formData) => {
  // 1. Atualizar BudgetMeta
  await BudgetMeta.update(metaId, formData)
  
  // 2. Registrar auditoria (automático via backend)
  // Função: registrarAlteracaoMeta
  
  closeModal()
  refetch()
  toast.success("Meta atualizada!")
}
```

---

#### Modal 3: HISTÓRICO DE METAS

**Componente:** `HistoricoMetasModal.jsx`

##### Estrutura
```
┌─────────────────────────────────────────────────────┐
│ 📜 Histórico de Alterações                       X  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Meta: Receita de Serviços                          │
│  Mês: Agosto 2026                                   │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ VERSÃO 3 - 15/Set/2026 14:30                 │ │
│  │                                               │ │
│  │ 👤 Maria Santos (maria@empresa.com)          │ │
│  │ 📝 Campo: meta_fixa_rs                        │ │
│  │ 💰 De: R$ 70.000 → Para: R$ 75.000           │ │
│  │ 🔒 Mês Fechado: SIM                           │ │
│  │                                               │ │
│  │ Justificativa:                                │ │
│  │ "Ajuste conforme convenção coletiva de       │ │
│  │  salários da categoria."                      │ │
│  │                                               │ │
│  │ 🖥️ IP: 192.168.1.100                         │ │
│  │ 🌐 Navegador: Chrome 120.0                    │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ VERSÃO 2 - 01/Set/2026 09:15                 │ │
│  │                                               │ │
│  │ 👤 João Silva (joao@empresa.com)             │ │
│  │ 📝 Campo: meta_fixa_rs                        │ │
│  │ 💰 De: R$ 65.000 → Para: R$ 70.000           │ │
│  │ 🔒 Mês Fechado: NÃO                           │ │
│  │                                               │ │
│  │ Justificativa:                                │ │
│  (não obrigatória)                │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ VERSÃO 1 - 01/Ago/2026 10:00                 │ │
│  │                                               │ │
│  │ 👤 Admin User (admin@empresa.com)            │ │
│  │ 📝 CRIAÇÃO DA META                            │ │
│  │ 💰 Valor inicial: R$ 65.000                  │ │
│  │                                               │ │
│  │ Responsável: João Silva                       │ │
│  │ Notas: Meta baseada no histórico...          │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  [Fechar]                                           │
└─────────────────────────────────────────────────────┘
```

##### Dados do Histórico
```javascript
{
  meta_id: "abc123",
  historico: [
    {
      versao: 3,
      changed_at: "2026-09-15T14:30:00",
      changed_by_nome: "Maria Santos",
      changed_by_email: "maria@empresa.com",
      field_changed: "meta_fixa_rs",
      old_value: "70000",
      new_value: "75000",
      is_locked_change: true,
      reason: "Ajuste conforme convenção coletiva...",
      ip_address: "192.168.1.100",
      user_agent: "Chrome 120.0",
      snapshot: { ...meta_completa }
    },
    {
      versao: 2,
      changed_at: "2026-09-01T09:15:00",
      changed_by_nome: "João Silva",
      changed_by_email: "joao@empresa.com",
      field_changed: "meta_fixa_rs",
      old_value: "65000",
      new_value: "70000",
      is_locked_change: false,
      reason: null,
      ...
    },
    {
      versao: 1,
      changed_at: "2026-08-01T10:00:00",
      changed_by_nome: "Admin User",
      field_changed: "criacao",
      old_value: null,
      new_value: "65000",
      is_locked_change: false,
      ...
    }
  ]
}
```

##### Cores dos Cards
```javascript
const cardColors = {
  criacao: "bg-green-50 border-green-200",
  alteracao_normal: "bg-blue-50 border-blue-200",
  alteracao_fechado: "bg-amber-50 border-amber-200"
}
```

---

#### Modal 4: FECHAR MÊS

**Componente:** `FecharMesModal.jsx`

##### Estrutura (Fechar)
```
┌─────────────────────────────────────────────────────┐
│ 🔒 Fechar Mês                                    X  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ⚠️ Atenção: Esta ação bloqueia edições no mês    │
│                                                     │
│  Mês: Agosto 2026                                   │
│  Total de metas: 24                                 │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ O que acontece ao fechar:                     │ │
│  │                                               │ │
│  │ ❌ Usuários comuns não podem editar metas     │ │
│  │ ❌ Usuários comuns não podem editar DRE       │ │
│  │ ✅ Admin pode editar com justificativa        │ │
│  │ ✅ Todas alterações são auditadas             │ │
│  │ ✅ Histórico completo é registrado            │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  Justificativa *                                   │
│  [Por que deseja fechar este mês?]                 │
│  Mínimo 20 caracteres                              │
│                                                     │
│  [Cancelar]              [Fechar Mês]              │
└─────────────────────────────────────────────────────┘
```

##### Validações
```javascript
// Apenas admin
if (user.role !== 'admin') {
  error("Apenas administradores podem fechar meses")
  disableSave()
}

// Justificativa obrigatória
if (!justificativa || justificativa.length < 20) {
  error("Justificativa obrigatória (mínimo 20 caracteres)")
  disableSave()
}
```

---

##### Estrutura (Reabrir)
```
┌─────────────────────────────────────────────────────┐
│ 🔓 Reabrir Mês                                   X  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Mês: Agosto 2026 (Fechado em 05/Set/2026)         │
│  Fechado por: Admin User                            │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ O que acontece ao reabrir:                    │ │
│  │                                               │ │
│  │ ✅ Usuários voltam a poder editar metas       │ │
│  │ ✅ Usuários voltam a poder editar DRE         │ │
│  │ ⚠️ Histórico de fechamento é mantido          │ │
│  │ ⚠️ Alterações futuras serão auditadas         │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  Justificativa *                                   │
│  [Por que deseja reabrir este mês?]                │
│                                                     │
│  [Cancelar]              [Reabrir Mês]             │
└─────────────────────────────────────────────────────┘
```

##### Ação Fechar/Reabrir
```javascript
const handleFecharMes = async (mes, justificativa) => {
  await fecharMes({
    mes,
    justificativa,
    acao: 'fechar' // ou 'reabrir'
  })
  
  closeModal()
  refetch()
  toast.success(acao === 'fechar' 
    ? "Mês fechado com sucesso!" 
    : "Mês reaberto com sucesso!")
}
```

---

## 🎨 ESTILOS E CORES

### Paleta Controle Orçamentário
```javascript
const colors = {
  // Status de atingimento
  acima_meta: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    badge: 'bg-green-100 text-green-800'
  },
  dentro_esperado: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    badge: 'bg-yellow-100 text-yellow-800'
  },
  abaixo_meta: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-800'
  },
  
  // Tipo de meta
  receita: {
    icone: '📦',
    cor: 'green'
  },
  despesa: {
    icone: '💸',
    cor: 'red'
  },
  
  // Status do mês
  aberto: {
    icone: '🔓',
    badge: 'bg-green-100 text-green-800'
  },
  fechado: {
    icone: '🔒',
    badge: 'bg-amber-100 text-amber-800'
  },
  
  // Histórico
  versao_criacao: 'bg-green-50 border-green-200',
  versao_alteracao: 'bg-blue-50 border-blue-200',
  versao_fechado: 'bg-amber-50 border-amber-200'
}
```

---

## 📱 RESPONSIVIDADE

### Breakpoints Controle Orçamentário
```javascript
// Desktop (≥1024px)
- 2 cards de metas por linha
- Cards de resumo em linha única (4 cards)
- Modal largura 600px

// Tablet (768px - 1023px)
- 1 card de meta por linha
- Cards de resumo em 2 linhas (2 cards cada)
- Modal largura 80%

// Mobile (<768px)
- 1 card de meta por linha
- Cards de resumo empilhados (1 por linha)
- Modal tela cheia
- Botões de ação em coluna
```

---

## 🔗 SINCRONISMO COM DRE

### Como Funciona a Comparação

```javascript
// 1. BudgetMeta busca correspondência no DRE
const realizado = DRELancamento.filter({
  mes: BudgetMeta.mes,
  categoria: BudgetMeta.categoria,
  tipo: BudgetMeta.tipo
})

// 2. Soma valores do DRE
const total_realizado = sum(realizado.valor)

// 3. Calcula atingimento
const atingimento = (total_realizado / BudgetMeta.meta_fixa_rs) × 100

// 4. Atualiza UI em tempo real
<BudgetMetaCard 
  meta={BudgetMeta.meta_fixa_rs}
  realizado={total_realizado}
  atingimento={atingimento}
/>
```

### Validação de Correspondência
```javascript
// Regra: BudgetMeta.item DEVE existir em DRELancamento.categoria
if (!SubcategoriaDRE.exists(BudgetMeta.categoria)) {
  error("Categoria da meta não existe no DRE. Verifique.")
}

// Se não encontrar correspondência no DRE
if (!DRELancamento.exists({
  categoria: BudgetMeta.categoria,
  mes: BudgetMeta.mes
})) {
  warning("Sem lançamentos no DRE para esta categoria")
  realizado = 0
}
```

---

**Documento criado por:** QA Senior  
**Data:** 2026-05-22  
**Próxima atualização:** 2026-06-22