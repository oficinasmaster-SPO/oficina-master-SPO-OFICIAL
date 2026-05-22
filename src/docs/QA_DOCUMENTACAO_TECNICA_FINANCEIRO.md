# 📊 Documentação Técnica — Módulo Financeiro
## DRE Avançado · DFC · Controle Orçamentário

**Documento:** QA-TECH-001  
**Versão:** 1.0  
**Data:** 2026-05-22  
**Responsável:** QA Senior

---

## 🎯 Visão Geral do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    MÓDULO FINANCEIRO                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │  DRE         │    │  DFC         │    │  Controle    │ │
│  │  Avançado    │───▶│  (Caixa)     │◀──▶│  Orçamentário│ │
│  │              │    │              │    │              │ │
│  │  Receitas    │    │  Entradas    │    │  Metas       │ │
│  │  Despesas    │    │  Saídas      │    │  Sazonalidade│ │
│  │  TCMP²       │    │  Saldo       │    │  Hierarquia  │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│         │                   │                   │          │
│         └───────────────────┼───────────────────┘          │
│                             │                              │
│                  ┌──────────▼──────────┐                   │
│                  │   Sincronização     │                   │
│                  │   Automática        │                   │
│                  └─────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 1. DRE AVANÇADO (Demonstrativo de Resultado)

### 1.1 Finalidade
Registrar **receitas e despesas** no regime de competência (quando ocorrem, independente de pagamento).

### 1.2 Estrutura de Dados

**Entity Principal:** `DRELancamento`
```json
{
  "workshop_id": "string",
  "mes": "YYYY-MM",
  "tipo": "receita | despesa",
  "categoria": "operacional | pessoas | marketing | etc",
  "subcategoria": "peças | mão_de_obra | aluguel | etc",
  "descricao": "string",
  "valor": "number",
  "entra_tcmp2": "boolean",
  "data_vencimento": "date",
  "data_pagamento": "date"
}
```

### 1.3 Categorias (Hierarquia)

```
RECEITAS
├── Receita de Serviços
├── Receita de Peças
├── Outros Serviços
└── Outras Receitas

DESPESAS
├── Custos Diretos (entra TCMP²)
│   ├── Peças e Materiais
│   ├── Mão de Obra Direta
│   └── Serviços de Terceiros
├── Despesas Operacionais
│   ├── Aluguel
│   ├── Energia
│   ├── Água
│   └── Telefone/Internet
├── Despesas com Pessoal
│   ├── Salários
│   ├── Encargos
│   └── Benefícios
├── Marketing
├── Administrativas
└── Financeiras
```

### 1.4 Regras de Negócio

#### TCMP² (Custo da Mão de Obra por Hora)
```javascript
// Função: calcularSaturacaoReal
TCMP² = (Custos Diretos + Mão de Obra) / Horas Trabalhadas

// Regras:
1. Apenas categorias com `entra_tcmp2 = true` entram no cálculo
2. Horas trabalhadas vêm do Registro Diário (QGP)
3. Atualização automática quando QGP é registrado
```

#### Sincronismo com DFC
```javascript
// Quando DRELancamento é criado/atualizado:
1. Se `data_pagamento` está preenchida → DFC automático
2. Se `data_vencimento` está preenchida → Vencimentos Card
3. Se `categoria` é "Peças" → Impacta R70/I30
```

### 1.5 Validações

```javascript
// Validações no frontend + backend
1. valor > 0 (sempre positivo)
2. mes no formato YYYY-MM
3. categoria deve existir em SubcategoriaDRE
4. entra_tcmp2 é automático pela categoria
5. data_pagamento >= data_vencimento (regra de negócio)
```

---

## 💰 2. DFC (Demonstrativo de Fluxo de Caixa)

### 2.1 Finalidade
Controlar **entradas e saídas reais** de dinheiro (regime de caixa).

### 2.2 Estrutura de Dados

**Entity Principal:** `DFCLancamento`
```json
{
  "workshop_id": "string",
  "mes": "YYYY-MM",
  "grupo": "operacional | investimento | financiamento | saldo_inicial",
  "tipo": "entrada | saida",
  "descricao": "string",
  "valor": "number",
  "origem": "manual | dre_automatico",
  "saldo_inicial": "number",
  "detalhes": {
    "banco": "number",
    "maquina_cartao": "number",
    "caixa": "number"
  },
  "fonte_saida": "banco | maquina_cartao | caixa"
}
```

### 2.3 Grupos do DFC

```
SALDO INICIAL
├── Banco
├── Máquina de Cartão
└── Caixa Físico

FLUXO OPERACIONAL
├── Entradas Operacionais
│   ├── Receitas de Vendas
│   └── Outros Recebimentos
└── Saídas Operacionais
    ├── Fornecedores
    ├── Salários
    ├── Impostos
    └── Despesas Gerais

FLUXO DE INVESTIMENTO
├── Compra de Equipamentos
├── Melhorias
└── Alienação de Ativos

FLUXO DE FINANCIAMENTO
├── Empréstimos
├── Amortizações
└── Investimentos de Sócios
```

### 2.4 Sincronismo DRE → DFC

#### Mapeamento Automático
```javascript
// Função: mapDREtoDFC
{
  DRELancamento.tipo === 'receita' → DFC.tipo === 'entrada'
  DRELancamento.tipo === 'despesa' → DFC.tipo === 'saida'
  
  DRELancamento.categoria → DFC.grupo
  DRELancamento.valor → DFC.valor
  DRELancamento.data_pagamento → DFC.mes (competência)
}
```

#### Regras de Conversão
```javascript
// 1. Lançamentos DRE com data_pagamento viram DFC automático
if (DRELancamento.data_pagamento) {
  DFCLancamento.create({
    origem: 'dre_automatico',
    grupo: mapearCategoria(DRELancamento.categoria),
    tipo: DRELancamento.tipo === 'receita' ? 'entrada' : 'saida',
    valor: DRELancamento.valor,
    descricao: DRELancamento.descricao
  });
}

// 2. Lançamentos manuais DFC não afetam DRE
if (DFCLancamento.origem === 'manual') {
  // Não sincroniza com DRE
  // Exemplo: Empréstimo bancário (DFC mas não DRE)
}
```

### 2.5 Cálculo de Saldo

```javascript
// Função: calcularSaldoDFC
saldo_final = saldo_inicial + entradas - saidas

// Detalhamento por fonte:
saldo_banco = banco_inicial + entradas_banco - saidas_banco
saldo_maquina = maquina_inicial + entradas_maquina - saidas_maquina
saldo_caixa = caixa_inicial + entradas_caixa - saidas_caixa

// Validação:
total_detalhes === saldo_final (integridade)
```

---

## 📈 3. CONTROLE ORÇAMENTÁRIO (Budget Control)

### 3.1 Finalidade
Comparar **REALIZADO (DRE)** vs **META (BudgetMeta)** com sazonalidade e hierarquia.

### 3.2 Estrutura de Dados

**Entity Principal:** `BudgetMeta`
```json
{
  "workshop_id": "string",
  "mes": "YYYY-MM",
  "item": "string (deve corresponder à descricao do DRELancamento)",
  "categoria": "string (espelha categoria do DRELancamento)",
  "group_id": "string | null (BudgetGroup)",
  "tipo": "receita | despesa",
  "periodicidade": "mensal | anual",
  "meta_anual_rs": "number",
  "peso_sazonal": "number (0.00-1.00)",
  "sazonalidade_config": {
    "01": "number", "02": "number", ..., "12": "number"
  },
  "meta_fixa_rs": "number",
  "meta_percentual": "number",
  "controlar_orcamento": "boolean"
}
```

**Entity Secundária:** `BudgetGroup`
```json
{
  "workshop_id": "string",
  "name": "string",
  "type": "receita | despesa | custo",
  "parent_group_id": "string | null",
  "order": "number",
  "color": "string (hex)",
  "meta_total": "number (calculado)",
  "realizado_total": "number (calculado)"
}
```

### 3.3 Sazonalidade

#### Conceito
Distribuir a meta anual de forma **não linear** ao longo dos meses, refletindo a realidade do negócio.

#### Cálculo
```javascript
// Função: aplicarSazonalidadeMetaAnual

// 1. Validar soma dos pesos (deve ser 1.00)
soma_pesos = sum(peso_sazonal[01..12])
if (soma_pesos !== 1.00) {
  throw Error("Soma dos pesos deve ser 1.00");
}

// 2. Calcular meta mensal
meta_fixa_rs[mês] = meta_anual_rs × peso_sazonal[mês]

// Exemplo:
meta_anual = R$ 3.600.000
peso_julho = 0.12 (12% - alta temporada)
meta_julho = 3.6M × 0.12 = R$ 432.000

peso_fevereiro = 0.06 (6% - baixa temporada)
meta_fevereiro = 3.6M × 0.06 = R$ 216.000
```

#### Configuração por Item
```javascript
// Cada BudgetMeta tem sua própria sazonalidade
BudgetMeta.sazonalidade_config = {
  "01": 0.08,  // Janeiro: 8%
  "02": 0.06,  // Fevereiro: 6%
  "03": 0.09,  // Março: 9%
  "04": 0.08,  // Abril: 8%
  "05": 0.09,  // Maio: 9%
  "06": 0.08,  // Junho: 8%
  "07": 0.12,  // Julho: 12% (alta)
  "08": 0.10,  // Agosto: 10%
  "09": 0.09,  // Setembro: 9%
  "10": 0.08,  // Outubro: 8%
  "11": 0.07,  // Novembro: 7%
  "12": 0.06   // Dezembro: 6% (baixa)
}
```

### 3.4 Hierarquia Orçamentária

#### Estrutura em Árvore
```
BudgetGroup (root)
├── Receitas (type: receita)
│   ├── Receita de Serviços
│   └── Receita de Peças
├── Despesas Operacionais (type: despesa)
│   ├── Custos Diretos (type: custo)
│   │   ├── Peças
│   │   └── Mão de Obra
│   └── Despesas Fixas
└── Despesas com Pessoal (type: despesa)
```

#### Cálculo de Totais
```javascript
// Função: calcularTotaisPorGrupo

// 1. Agregar metas por grupo
grupo.meta_total = sum(BudgetMeta.meta_fixa_rs WHERE group_id = grupo.id)

// 2. Agregar realizados do DRE por grupo
grupo.realizado_total = sum(DRELancamento.valor 
  WHERE DRELancamento.categoria IN (itens do grupo)
  AND DRELancamento.mes = mês_referência)

// 3. Calcular atingimento
grupo.atingimento_percentual = (grupo.realizado_total / grupo.meta_total) × 100
```

### 3.5 Sincronismo DRE → BudgetMeta

#### Comparação Automática
```javascript
// Quando DRELancamento é criado/atualizado:
1. Buscar BudgetMeta correspondente (mesma categoria + mês)
2. Calcular diferença:
   diferenca = DRELancamento.valor - BudgetMeta.meta_fixa_rs
3. Calcular atingimento:
   atingimento = (DRELancamento.valor / BudgetMeta.meta_fixa_rs) × 100
4. Atualizar UI em tempo real
```

#### Regras de Correspondência
```javascript
// Match por categoria + mês
BudgetMeta correspondente = BudgetMeta.find({
  workshop_id: DRE.workshop_id,
  mes: DRE.mes,
  categoria: DRE.categoria,
  tipo: DRE.tipo
});

// Se não encontrar → Sem meta definida (exibir alerta)
```

---

## 🔄 4. SINCRONISMO ENTRE AS TRÊS ABAS

### 4.1 Fluxo de Dados

```
┌──────────────────────────────────────────────────────────┐
│                  FLUXO PRINCIPAL                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  DRE (Competência)                                       │
│    │                                                     │
│    ├── data_pagamento → DFC (Caixa)                     │
│    │                                                     │
│    └── categoria + valor → BudgetMeta (Comparação)      │
│                                                          │
│  DFC (Caixa)                                             │
│    │                                                     │
│    └── saldo_inicial → Próximo mês (recursivo)          │
│                                                          │
│  BudgetMeta (Meta)                                       │
│    │                                                     │
│    ├── peso_sazonal → Calcula meta_fixa_rs              │
│    │                                                     │
│    └── group_id → BudgetGroup (hierarquia)              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 4.2 Eventos de Sincronização

#### Evento 1: Criação de DRELancamento
```javascript
// Trigger: DRELancamento.create
{
  // 1. Atualizar DFC (se data_pagamento)
  if (data_pagamento) {
    DFCLancamento.create({
      origem: 'dre_automatico',
      mes: month(data_pagamento),
      valor: DRE.valor,
      tipo: DRE.tipo === 'receita' ? 'entrada' : 'saida'
    });
  }
  
  // 2. Atualizar comparação orçamentária
  BudgetMetaComparison.update({
    mes: DRE.mes,
    categoria: DRE.categoria,
    realizado: DRE.valor
  });
  
  // 3. Recalcular TCMP² (se categoria direta)
  if (DRE.entra_tcmp2) {
    TCMP2.recalculate();
  }
}
```

#### Evento 2: Fechamento de Mês
```javascript
// Trigger: fecharMes function
{
  // 1. Bloquear edições em DRELancamento
  DRELancamento.update({
    mes: mes_fechamento,
    controlar_orcamento: false
  });
  
  // 2. Bloquear edições em BudgetMeta
  BudgetMeta.update({
    mes: mes_fechamento,
    controlar_orcamento: false
  });
  
  // 3. Registrar auditoria
  BudgetMetaHistory.create({
    field_changed: 'controlar_orcamento',
    old_value: 'true',
    new_value: 'false',
    reason: justificativa
  });
  
  // 4. Congelar saldo DFC
  DFCLancamento.create({
    grupo: 'saldo_inicial',
    mes: proximo_mes,
    saldo_inicial: saldo_final_mes_atual
  });
}
```

#### Evento 3: Aplicação de Sazonalidade
```javascript
// Trigger: aplicarSazonalidadeMetaAnual
{
  // 1. Validar pesos
  if (sum(pesos) !== 1.00) throw Error();
  
  // 2. Atualizar todas as metas do ano
  for (mes of [01..12]) {
    BudgetMeta.update({
      mes: `${ano}-${mes}`,
      meta_fixa_rs: meta_anual × peso_sazonal[mes],
      peso_sazonal: peso_sazonal[mes]
    });
    
    // 3. Registrar auditoria
    BudgetMetaHistory.create({
      field_changed: 'meta_fixa_rs',
      old_value: meta_antiga,
      new_value: meta_nova,
      reason: 'Aplicação de sazonalidade'
    });
  }
}
```

### 4.3 Regras de Integridade

#### Regra 1: DRE + DFC devem bater (com ressalvas)
```javascript
// Validação mensal
total_receitas_dre = sum(DRE.receitas.mes)
total_entradas_dfc = sum(DFC.entradas_operacionais.mes)

// Nem sempre são iguais (regime de competência vs caixa)
// Mas diferenças grandes devem ser investigadas
if (abs(total_receitas_dre - total_entradas_dfc) > 0.2 × total_receitas_dre) {
  alert("Diferença > 20% entre DRE e DFC. Verificar lançamentos.");
}
```

#### Regra 2: BudgetMeta deve espelhar DRE
```javascript
// Para cada BudgetMeta, deve existir categoria correspondente em DRE
BudgetMeta.categoria → Deve existir em SubcategoriaDRE

// Validação
if (!SubcategoriaDRE.exists(BudgetMeta.categoria)) {
  throw Error("Categoria inválida. Deve corresponder ao DRE.");
}
```

#### Regra 3: Soma dos pesos = 1.00
```javascript
// Validação crítica
pesos = BudgetMeta.sazonalidade_config.values()
soma = sum(pesos)

if (soma < 0.99 || soma > 1.01) {
  throw Error(`Soma dos pesos deve ser 1.00 (atual: ${soma})`);
}
```

#### Regra 4: Saldo DFC deve fechar
```javascript
// Equação fundamental
saldo_final = saldo_inicial + entradas - saidas

// Validação por fonte
for (fonte in ['banco', 'maquina_cartao', 'caixa']) {
  calculado = saldo_inicial_fonte + entradas_fonte - saidas_fonte
  if (abs(calculado - saldo_final_fonte) > 0.01) {
    throw Error(`Saldo ${fonte} não fecha!`);
  }
}
```

---

## 🛡️ 5. REGRAS DE SEGURANÇA E TRAVAS

### 5.1 Trava de Fechamento (FASE 3)

```javascript
// Mês fechado → Bloqueio total
if (BudgetMeta.controlar_orcamento === false) {
  // Usuário comum: Não pode editar
  if (user.role !== 'admin') {
    throw Error("Mês fechado. Apenas administradores podem editar.");
  }
  
  // Admin: Pode editar com justificativa
  if (!justificativa) {
    throw Error("Justificativa obrigatória para mês fechado.");
  }
  
  // Registrar auditoria
  BudgetMetaHistory.create({
    is_locked_change: true,
    reason: justificativa
  });
}
```

### 5.2 Permissões por Perfil

```javascript
// RLS (Row Level Security)
{
  create: {
    $or: [
      { workshop_id: "{{user.data.workshop_id}}" },
      { user_condition: { role: "admin" } }
    ]
  },
  read: {
    $or: [
      { workshop_id: "{{user.data.workshop_id}}" },
      { user_condition: { role: "admin" } }
    ]
  },
  update: {
    $or: [
      { workshop_id: "{{user.data.workshop_id}}" },
      { user_condition: { role: "admin" } }
    ]
  },
  delete: {
    user_condition: { role: "admin" }
  }
}
```

### 5.3 Auditoria Completa

```javascript
// Todo alteração é registrada
BudgetMetaHistory = {
  changed_by: user.id,
  changed_by_nome: user.full_name,
  changed_by_email: user.email,
  changed_at: ISO.now(),
  field_changed: "nome_do_campo",
  old_value: "valor_antigo",
  new_value: "valor_novo",
  reason: "justificativa (obrigatória se mês fechado)",
  is_locked_change: boolean,
  ip_address: request.ip,
  user_agent: request.userAgent,
  snapshot: { ...meta_completa }
}
```

---

## 📊 6. CÁLCULOS E FÓRMULAS

### 6.1 TCMP² (Custo da Mão de Obra por Hora)

```javascript
// Função: calcularTCMP2
TCMP² = (Custos Diretos + Mão de Obra Direta) / Horas Trabalhadas

// Onde:
// - Custos Diretos: DRELancamento WHERE entra_tcmp2 = true
// - Horas Trabalhadas: RegistroDiario.total_horas

// Exemplo:
custos_diretos = R$ 50.000
mao_obra_direta = R$ 30.000
horas_trabalhadas = 400h

TCMP² = (50.000 + 30.000) / 400 = R$ 200/hora
```

### 6.2 R70/I30 (Proporção Receita/Insumo)

```javascript
// Função: calcularR70I30
R70 = (Receita de Serviços / Receita Total) × 100
I30 = (Custo de Peças / Receita Total) × 100

// Meta ideal:
// R70 ≥ 70% (serviços)
// I30 ≤ 30% (peças)

// Exemplo:
receita_servicos = R$ 700.000
receita_pecas = R$ 300.000
receita_total = R$ 1.000.000

R70 = (700.000 / 1.000.000) × 100 = 70% ✅
I30 = (300.000 / 1.000.000) × 100 = 30% ✅
```

### 6.3 Atingimento de Meta

```javascript
// Função: calcularAtingimento
atingimento_percentual = (realizado / meta) × 100

// Classificação:
if (atingimento >= 100) status = "Acima da meta" ✅
else if (atingimento >= 80) status = "Dentro do esperado" ⚠️
else status = "Abaixo da meta" ❌

// Exemplo:
meta = R$ 100.000
realizado = R$ 85.000
atingimento = (85.000 / 100.000) × 100 = 85% ⚠️
```

### 6.4 Saldo DFC

```javascript
// Função: calcularSaldoDFC
saldo_final = saldo_inicial + total_entradas - total_saidas

// Detalhamento por fonte:
for (fonte in ['banco', 'maquina_cartao', 'caixa']) {
  saldo_fonte = saldo_inicial_fonte + entradas_fonte - saidas_fonte
}

// Validação:
total_detalhes = sum(saldo_fonte)
if (abs(total_detalhes - saldo_final) > 0.01) {
  throw Error("Divergência no saldo!");
}
```

---

## 🧪 7. CASOS DE TESTE (QA)

### 7.1 Testes de Sincronismo

#### Teste 1: DRE → DFC
```javascript
// Cenário: Criar lançamento DRE com data_pagamento
DRELancamento.create({
  tipo: 'receita',
  valor: 10000,
  data_pagamento: '2026-05-15'
});

// Esperado:
DFCLancamento.exists({
  origem: 'dre_automatico',
  tipo: 'entrada',
  valor: 10000,
  mes: '2026-05'
}); // ✅ Deve existir
```

#### Teste 2: DRE → BudgetMeta
```javascript
// Cenário: Lançar receita acima da meta
BudgetMeta.create({
  categoria: 'Receita de Serviços',
  meta_fixa_rs: 50000
});

DRELancamento.create({
  categoria: 'Receita de Serviços',
  valor: 60000
});

// Esperado:
atingimento = (60000 / 50000) × 100 = 120% ✅
status = "Acima da meta"
```

#### Teste 3: Sazonalidade
```javascript
// Cenário: Aplicar sazonalidade com pesos inválidos
BudgetMeta.update({
  sazonalidade_config: {
    "01": 0.10, "02": 0.10, ..., "12": 0.10  // Soma = 1.20 ❌
  }
});

// Esperado:
Error("Soma dos pesos deve ser 1.00") ✅
```

### 7.2 Testes de Trava

#### Teste 4: Mês Fechado
```javascript
// Cenário: Usuário comum tenta editar mês fechado
fecharMes({ mes: '2026-04', justificativa: 'Fechamento mensal' });

DRELancamento.update({
  id: lancamento_id,
  valor: 20000  // Usuário comum
});

// Esperado:
Error("Mês fechado. Apenas administradores podem editar.") ✅
```

#### Teste 5: Admin Editar Mês Fechado
```javascript
// Cenário: Admin edita mês fechado com justificativa
DRELancamento.update({
  id: lancamento_id,
  valor: 20000,  // Admin
  justificativa: 'Ajuste conforme convenção coletiva'
});

// Esperado:
1. Lançamento atualizado ✅
2. BudgetMetaHistory criado ✅
3. is_locked_change = true ✅
```

### 7.3 Testes de Performance

#### Teste 6: Carregamento com Cache
```javascript
// Cenário: Carregar 1000 metas com cache
const { metas, isLoading } = useOptimizedMetas(workshopId, mes);

// Esperado:
// 1ª carga: 0.2s ✅
// 2ª carga (cache): < 0.05s ✅
// Requisições: 90% menos ✅
```

#### Teste 7: Virtualização de Lista
```javascript
// Cenário: Renderizar 1000 itens
<ListaMetasVirtualizada metas={1000} />

// Esperado:
// Renderiza apenas 20 itens visíveis ✅
// Scroll suave 60fps ✅
// CPU < 20% ✅
```

---

## 📋 8. CHECKLIST DE VALIDAÇÃO (QA)

### 8.1 Validação Diária

```
[ ] DRE + DFC sincronizados (data_pagamento)
[ ] BudgetMeta espelha categorias do DRE
[ ] Soma dos pesos sazonalidade = 1.00
[ ] Saldo DFC fecha (banco + máquina + caixa)
[ ] TCMP² calculado corretamente
[ ] R70/I30 dentro do esperado (70%/30%)
```

### 8.2 Validação de Fechamento

```
[ ] Mês fechado → Bloqueio funcional
[ ] Justificativa registrada em auditoria
[ ] Saldo DFC transferido para próximo mês
[ ] Snapshots de metas criados
[ ] Histórico de versões completo
```

### 8.3 Validação de Performance

```
[ ] Carregamento < 0.5s
[ ] Scroll suave (60fps)
[ ] CPU < 20%
[ ] Requisições otimizadas (cache)
[ ] Virtualização ativa (>100 itens)
```

---

## 🔗 9. FLUXOGRAMAS

### 9.1 Fluxo: Criação de Lançamento DRE

```
┌─────────────────┐
│  Usuário cria   │
│  DRELancamento  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Validação:     │
│  - valor > 0    │
│  - categoria    │
│  - mês          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌─────────────────┐
│  Salvar no DB   │─────▶│  Calcular TCMP² │
└────────┬────────┘      │  (se direto)    │
         │               └─────────────────┘
         ▼
┌─────────────────┐
│  data_pagamento │
│  preenchida?    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
   SIM       NÃO
    │         │
    ▼         ▼
┌─────────┐ ┌──────────┐
│ Criar   │ │ Fim      │
│ DFC     │ │ (sem DFC)│
│ Autom.  │ └──────────┘
└────┬────┘
     │
     ▼
┌─────────────────┐
│  Atualizar      │
│  Comparação     │
│  BudgetMeta     │
└────────┬────────┘
         │
         ▼
      ┌─────┐
      │ Fim │
      └─────┘
```

### 9.2 Fluxo: Fechamento de Mês

```
┌─────────────────┐
│  Admin clica    │
│  "Fechar Mês"   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Preenche       │
│  Justificativa  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Validar:       │
│  - user = admin │
│  - justificativa│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Atualizar      │
│  BudgetMeta     │
│  (controlar =   │
│   false)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Atualizar      │
│  DRELancamento  │
│  (controlar =   │
│   false)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Registrar      │
│  Auditoria      │
│  (History)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Transferir     │
│  Saldo DFC      │
│  (próximo mês)  │
└────────┬────────┘
         │
         ▼
      ┌─────┐
      │ Fim │
      └─────┘
```

---

## 📚 10. GLOSSÁRIO

| Termo | Definição |
|-------|-----------|
| **DRE** | Demonstrativo de Resultado do Exercício (regime de competência) |
| **DFC** | Demonstrativo de Fluxo de Caixa (regime de caixa) |
| **TCMP²** | Custo da Mão de Obra por Hora (KPI operacional) |
| **R70/I30** | Proporção ideal: 70% serviços, 30% peças |
| **BudgetMeta** | Meta orçamentária mensal/anual |
| **BudgetGroup** | Grupo hierárquico de metas |
| **Sazonalidade** | Distribuição não-linear de metas ao longo do ano |
| **Controlar Orçamento** | Flag que indica se mês está fechado para edição |
| **Auditoria** | Registro completo de todas as alterações (BudgetMetaHistory) |

---

**Documento aprovado por:** QA Senior  
**Data de aprovação:** 2026-05-22  
**Próxima revisão:** 2026-06-22