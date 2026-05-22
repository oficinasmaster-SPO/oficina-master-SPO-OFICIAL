# 🏦 Arquitetura Financeira Enterprise
## Solução para Conciliação DRE ≠ DFC ≠ Caixa Real

**Documento:** ARCH-FIN-001  
**Tipo:** Arquitetura de Sistema  
**Prioridade:** CRÍTICA  
**Data:** 2026-05-22

---

## ⚠️ PROBLEMA ATUAL (RISCO EXISTENCIAL)

### Cenário de Risco

```
┌─────────────────────────────────────────────────────────┐
│            ARQUITETURA ATUAL (PERIGOSA)                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  DRELancamento (Competência)                            │
│       │                                                 │
│       │ data_pagamento                                  │
│       ▼                                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  DFC Automático (Liquidação)                    │   │
│  │  ❌ PROBLEMA: Sincronização direta              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  RISCOS:                                                │
│  • Pagamento parcial não rastreável                    │
│  • Inadimplência não contabilizada                     │
│  • Antecipação de cartão sem conciliação               │
│  • Duplicidade de lançamentos                          │
│  • Diferença bancária não detectada                    │
│  • Lucro FAKE vs Caixa REAL                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Exemplo Real do Problema

```
Venda de Motor: R$ 10.000

Pagamento:
- Entrada: R$ 2.000 (hoje)
- Parcelado: R$ 8.000 (8x de R$ 1.000)

ARQUITETURA ATUAL (ERRADA):
┌────────────────────────────────────────────────┐
│ DRE (Agosto)                                   │
│ Receita: R$ 10.000 ✅ (competência correto)   │
└────────────────────────────────────────────────┘
         │
         │ data_pagamento = hoje
         ▼
┌────────────────────────────────────────────────┐
│ DFC (Agosto)                                   │
│ Entrada: R$ 10.000 ❌ (ERRADO!)               │
│                                                │
│ Problema: Só entrou R$ 2.000 reais!           │
│ Caixa FAKE: +R$ 8.000                         │
│ Lucro FAKE: +R$ 8.000                         │
└────────────────────────────────────────────────┘

RESULTADO:
- Caixa bancário real: R$ 2.000
- Caixa sistema: R$ 10.000
- DIVERGÊNCIA: R$ 8.000 (800% de erro!)
```

---

## ✅ ARQUITETURA CORRETA (ENTERPRISE)

### Visão Geral

```
┌─────────────────────────────────────────────────────────────┐
│         ARQUITETURA FINANCEIRA ENTERPRISE                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  VENDA / NOTA FISCAL                                        │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  DRE (Competência)                                  │   │
│  │  • Reconhece receita/despesa na competência         │   │
│  │  • NÃO mexe com caixa                               │   │
│  │  • KPIs: Faturamento, Lucro, Margem                 │   │
│  └─────────────────────────────────────────────────────┘   │
│       │                                                     │
│       │ Gera título financeiro                              │
│       ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  CONTAS A RECEBER/RECEBER (Financeiro)              │   │
│  │  • Controle de crédito                              │   │
│  │  • Parcelas e vencimentos                           │   │
│  │  • Status: aberto, parcial, pago, vencido           │   │
│  └─────────────────────────────────────────────────────┘   │
│       │                                                     │
│       │ Aguarda liquidação                                  │
│       ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LIQUIDAÇÃO FINANCEIRA (Caixa)                      │   │
│  │  • Pagamento recebido                               │   │
│  │  • Baixa parcial ou total                           │   │
│  │  • Método: PIX, TED, Cartão, Dinheiro               │   │
│  │  • Taxas e descontos                                │   │
│  └─────────────────────────────────────────────────────┘   │
│       │                                                     │
│       │ Liquidação confirmada                               │
│       ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  DFC / CAIXA REAL                                   │   │
│  │  • SÓ recebe liquidações confirmadas                │   │
│  │  • Caixa bancário real                              │   │
│  │  • Conciliação automática                           │   │
│  └─────────────────────────────────────────────────────┘   │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  CONCILIAÇÃO BANCÁRIA                               │   │
│  │  • Match: sistema vs banco                          │   │
│  │  • Detecção de divergências                         │   │
│  │  • Ajustes automáticos                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Regra de Ouro

```
╔════════════════════════════════════════════════════════╗
║  DRE reconhece COMPETÊNCIA (quando ocorre)             ║
║  DFC reconhece LIQUIDAÇÃO (quando recebe)              ║
║                                                        ║
║  NUNCA MISTURAR!                                       ║
╚════════════════════════════════════════════════════════╝
```

---

## 📊 NOVAS ENTIDADES OBRIGATÓRIAS

### 1. ContaReceber (Contas a Receber)

**Finalidade:** Rastrear crédito do cliente (parcelas, vencimentos, status)

```json
{
  "name": "ContaReceber",
  "type": "object",
  "properties": {
    "workshop_id": "string",
    "dre_lancamento_id": "string (origem)",
    "cliente_id": "string",
    "valor_original": "number",
    "valor_aberto": "number",
    "valor_pago": "number",
    "status": "aberto | parcial | pago | vencido | cancelado",
    "data_vencimento": "date",
    "data_emissao": "date",
    "numero_documento": "string",
    "tipo_documento": "nota_fiscal | recibo | duplicata | carne",
    "forma_pagamento": "pix | ted | boleto | cartao_credito | cartao_debito | dinheiro | cheque",
    "parcela_numero": "integer (1 de 8, 2 de 8...)",
    "parcela_total": "integer (8)",
    "desconto": "number",
    "juros": "number",
    "multa": "number",
    "valor_total_liquidacao": "number",
    "data_primeiro_vencimento": "date",
    "dias_atraso": "integer",
    "observacoes": "string"
  },
  "required": [
    "workshop_id",
    "cliente_id",
    "valor_original",
    "status",
    "data_vencimento"
  ]
}
```

**Exemplo de Uso:**
```javascript
// Venda de R$ 10.000 (1 entrada + 8 parcelas)
ContaReceber.create([
  {
    dre_lancamento_id: "abc123",
    cliente_id: "cliente_001",
    valor_original: 2000,
    valor_aberto: 2000,
    valor_pago: 0,
    status: "aberto",
    data_vencimento: "2026-08-22",
    parcela_numero: 1,
    parcela_total: 9,
    forma_pagamento: "pix"
  },
  {
    dre_lancamento_id: "abc123",
    cliente_id: "cliente_001",
    valor_original: 1000,
    valor_aberto: 1000,
    valor_pago: 0,
    status: "aberto",
    data_vencimento: "2026-09-22",
    parcela_numero: 2,
    parcela_total: 9,
    forma_pagamento: "boleto"
  },
  // ... mais 7 parcelas
])
```

---

### 2. ContaPagar (Contas a Pagar)

**Finalidade:** Rastrear obrigações da empresa (fornecedores, despesas)

```json
{
  "name": "ContaPagar",
  "type": "object",
  "properties": {
    "workshop_id": "string",
    "dre_lancamento_id": "string (origem)",
    "fornecedor_id": "string",
    "valor_original": "number",
    "valor_aberto": "number",
    "valor_pago": "number",
    "status": "aberto | parcial | pago | vencido | cancelado",
    "data_vencimento": "date",
    "data_emissao": "date",
    "numero_documento": "string",
    "tipo_documento": "nota_fiscal | boleto | duplicata | contrato",
    "forma_pagamento": "pix | ted | boleto | cheque | cartao",
    "parcela_numero": "integer",
    "parcela_total": "integer",
    "desconto_obtido": "number",
    "juros_pago": "number",
    "multa_pago": "number",
    "valor_total_liquidacao": "number",
    "centro_custo": "string",
    "categoria": "string",
    "observacoes": "string"
  },
  "required": [
    "workshop_id",
    "fornecedor_id",
    "valor_original",
    "status",
    "data_vencimento"
  ]
}
```

---

### 3. LiquidaçãoFinanceira (Pagamento/Recebimento)

**Finalidade:** Registrar liquidação REAL (quando dinheiro entra/sai)

```json
{
  "name": "LiquidaçãoFinanceira",
  "type": "object",
  "properties": {
    "workshop_id": "string",
    "conta_receber_id": "string (se recebimento)",
    "conta_pagar_id": "string (se pagamento)",
    "tipo": "recebimento | pagamento",
    "valor_liquidacao": "number",
    "data_liquidacao": "date-time",
    "forma_pagamento": "pix | ted | boleto | cartao_credito | cartao_debito | dinheiro | cheque",
    "banco_origem": "string",
    "banco_destino": "string",
    "numero_documento": "string",
    "numero_transacao": "string",
    "taxa_cartao": "number",
    "taxa_intermediacao": "number",
    "desconto_concedido": "number",
    "juros_recebido": "number",
    "multa_recebida": "number",
    "valor_liquido": "number",
    "conciliado": "boolean",
    "data_conciliacao": "date-time",
    "conciliado_por": "string",
    "observacoes": "string",
    "comprovante_url": "string",
    "metadados": {
      "codigo_barras": "string",
      "nosso_numero": "string",
      "id_cartao": "string",
      "parcela_cartao": "string",
      "id_pix": "string"
    }
  },
  "required": [
    "workshop_id",
    "tipo",
    "valor_liquidacao",
    "data_liquidacao",
    "forma_pagamento"
  ]
}
```

**Exemplo de Liquidação Parcial:**
```javascript
// Conta a Receber: R$ 10.000
// Cliente paga apenas R$ 3.000

// 1. Atualiza ContaReceber
ContaReceber.update("cr_001", {
  valor_pago: 3000,
  valor_aberto: 7000,
  status: "parcial"
})

// 2. Cria Liquidação
LiquidaçãoFinanceira.create({
  conta_receber_id: "cr_001",
  tipo: "recebimento",
  valor_liquidacao: 3000,
  data_liquidacao: "2026-08-22T14:30:00",
  forma_pagamento: "pix",
  valor_liquido: 3000, // sem taxa PIX
  conciliado: false // aguarda conciliação bancária
})

// 3. Gera DFC (SÓ AGORA!)
DFCLancamento.create({
  origem: "liquidacao_financeira",
  tipo: "entrada",
  valor: 3000,
  grupo: "operacional",
  descricao: "Recebimento parcial - Cliente XYZ",
  data_pagamento: "2026-08-22"
})
```

---

### 4. BankTransaction (Conciliação Bancária)

**Finalidade:** Importar transações bancárias e fazer match com sistema

```json
{
  "name": "BankTransaction",
  "type": "object",
  "properties": {
    "workshop_id": "string",
    "banco": "string",
    "numero_conta": "string",
    "tipo": "credito | debito",
    "valor": "number",
    "data_operacao": "date",
    "data_lancamento": "date",
    "descricao": "string",
    "numero_documento": "string",
    "categoria_bancaria": "string",
    "liquidez_financeira_id": "string (match)",
    "status_conciliacao": "pendente | conciliado | divergente | ignorado",
    "divergencia_valor": "number",
    "divergencia_tipo": "string",
    "conciliado_por": "string",
    "data_conciliacao": "date-time",
    "observacoes": "string",
    "metadados": {
      "id_transacao_banco": "string",
      "tipo_transacao": "string",
      "favorecido": "string",
      "cpf_cnpj": "string"
    }
  },
  "required": [
    "workshop_id",
    "banco",
    "tipo",
    "valor",
    "data_operacao",
    "descricao"
  ]
}
```

**Exemplo de Conciliação:**
```javascript
// Sistema: Liquidação de R$ 3.000 (PIX)
// Banco: PIX recebido de R$ 3.000

// Match automático
BankTransaction.update("bt_001", {
  liquidez_financeira_id: "lf_001",
  status_conciliacao: "conciliado",
  data_conciliacao: "2026-08-22T15:00:00",
  conciliado_por: "sistema_auto"
})

LiquidezFinanceira.update("lf_001", {
  conciliado: true,
  data_conciliacao: "2026-08-22T15:00:00"
})
```

---

### 5. FinancialMonthSnapshot (Snapshot Mensal)

**Finalidade:** Congelar KPIs no fechamento (imutável)

```json
{
  "name": "FinancialMonthSnapshot",
  "type": "object",
  "properties": {
    "workshop_id": "string",
    "mes": "YYYY-MM",
    "status": "aberto | fechado",
    "data_fechamento": "date-time",
    "fechado_por": "string",
    
    // DRE Snapshot
    "dre_faturamento_total": "number",
    "dre_custos_diretos": "number",
    "dre_despesas_operacionais": "number",
    "dre_lucro_liquido": "number",
    "dre_margem_liquida": "number",
    "dre_tcmp2": "number",
    "dre_r70": "number",
    "dre_i30": "number",
    
    // DFC Snapshot
    "dfc_saldo_inicial": "number",
    "dfc_entradas_totais": "number",
    "dfc_saidas_totais": "number",
    "dfc_saldo_final": "number",
    "dfc_saldo_banco": "number",
    "dfc_saldo_maquina": "number",
    "dfc_saldo_caixa": "number",
    
    // Contas a Receber
    "contas_receber_aberto": "number",
    "contas_receber_vencido": "number",
    "contas_receber_atraso_medio": "number",
    
    // Contas a Pagar
    "contas_pagar_aberto": "number",
    "contas_pagar_vencido": "number",
    
    // Budget
    "budget_meta_total": "number",
    "budget_realizado_total": "number",
    "budget_atingimento": "number",
    
    // Auditoria
    "kpi_hash": "string (integridade)",
    "auditoria_json": "object"
  },
  "required": [
    "workshop_id",
    "mes",
    "status"
  ]
}
```

---

## 🔄 FLUXOS COMPLETOS

### Fluxo 1: Venda Parcelada (8x)

```
1. VENDA REALIZADA (R$ 10.000)
   │
   ▼
2. DRE (Competência - Agosto)
   • Receita: R$ 10.000 (reconhece TUDO na competência)
   │
   ▼
3. GERA CONTAS A RECEBER (9 títulos)
   • Entrada: R$ 2.000 (vence em 22/08)
   • Parcela 1-8: R$ 1.000 cada (vencem 22/09 a 22/04)
   │
   ▼
4. AGUARDA LIQUIDAÇÃO
   • 22/08: Cliente paga entrada R$ 2.000 (PIX)
   │
   ▼
5. LIQUIDAÇÃO FINANCEIRA
   • Cria: LiquidaçãoFinanceira (R$ 2.000)
   • Atualiza: ContaReceber (pago: 2k, aberto: 8k, status: parcial)
   │
   ▼
6. DFC (Caixa Real - Agosto)
   • Entrada: R$ 2.000 (SÓ O QUE ENTROU!)
   │
   ▼
7. CONCILIAÇÃO BANCÁRIA
   • Importa extrato bancário
   • Match: Liquidação R$ 2.000 vs PIX R$ 2.000
   • Status: Conciliado ✅
   │
   ▼
8. PRÓXIMOS MESES
   • 22/09: Cliente paga parcela 2 (R$ 1.000)
   • Volta para passo 5-7
   • DFC Setembro: +R$ 1.000
```

**Código do Fluxo:**
```javascript
// 1. Venda
const venda = {
  valor: 10000,
  cliente: "cliente_001",
  parcelas: 9 // 1 entrada + 8x
}

// 2. DRE (competência)
await DRELancamento.create({
  tipo: 'receita',
  categoria: 'Receita de Serviços',
  valor: 10000,
  mes: '2026-08',
  descricao: 'Venda motor - Cliente 001'
})

// 3. Contas a Receber (9 títulos)
const contasReceber = []

// Entrada
contasReceber.push({
  dre_lancamento_id: dre.id,
  cliente_id: venda.cliente,
  valor_original: 2000,
  valor_aberto: 2000,
  valor_pago: 0,
  status: 'aberto',
  data_vencimento: '2026-08-22',
  parcela_numero: 1,
  parcela_total: 9
})

// Parcelas 2-9
for (let i = 2; i <= 9; i++) {
  contasReceber.push({
    dre_lancamento_id: dre.id,
    cliente_id: venda.cliente,
    valor_original: 1000,
    valor_aberto: 1000,
    valor_pago: 0,
    status: 'aberto',
    data_vencimento: `2026-${String(i).padStart(2, '0')}-22`,
    parcela_numero: i,
    parcela_total: 9
  })
}

await ContaReceber.bulkCreate(contasReceber)

// 4-5. LIQUIDAÇÃO (quando cliente paga)
async function registrarLiquidação(contaReceberId, valorPago, formaPagamento) {
  const conta = await ContaReceber.get(contaReceberId)
  
  // Atualiza conta
  await ContaReceber.update(contaReceberId, {
    valor_pago: conta.valor_pago + valorPago,
    valor_aberto: conta.valor_original - (conta.valor_pago + valorPago),
    status: valorPago >= conta.valor_aberto ? 'pago' : 'parcial'
  })
  
  // Cria liquidação
  const liquidacao = await LiquidaçãoFinanceira.create({
    conta_receber_id: contaReceberId,
    tipo: 'recebimento',
    valor_liquidacao: valorPago,
    data_liquidacao: new Date(),
    forma_pagamento: formaPagamento,
    valor_liquido: valorPago, // sem taxa PIX
    conciliado: false
  })
  
  // Gera DFC (SÓ AGORA!)
  await DFCLancamento.create({
    origem: 'liquidacao_financeira',
    tipo: 'entrada',
    valor: valorPago,
    grupo: 'operacional',
    descricao: `Recebimento parcial - ${formaPagamento}`,
    data_pagamento: new Date()
  })
  
  return liquidacao
}

// Uso: Cliente pagou entrada
await registrarLiquidação(contasReceber[0].id, 2000, 'pix')
// DFC Agosto: +R$ 2.000 ✅ (REAL)
```

---

### Fluxo 2: Antecipação de Cartão

```
1. VENDA NO CARTÃO (R$ 5.000 em 10x)
   │
   ▼
2. DRE (Agosto)
   • Receita: R$ 5.000 (competência)
   │
   ▼
3. CONTA A RECEBER (10 parcelas de R$ 500)
   • Vencimentos: 30, 60, 90... dias
   │
   ▼
4. ANTECIPAÇÃO (operação financeira)
   • Antecipa parcelas 3-10 (R$ 4.000)
   • Taxa: 2.5% (R$ 100)
   • Líquido: R$ 3.900
   │
   ▼
5. LIQUIDAÇÃO ANTECIPAÇÃO
   • Cria: LiquidaçãoFinanceira (R$ 3.900)
   • Cria: LiquidaçãoFinanceira (taxa R$ 100 - despesa)
   │
   ▼
6. DFC (Agosto)
   • Entrada: R$ 3.900 (antecipação)
   • Saída: R$ 100 (taxa antecipação)
   │
   ▼
7. PRÓXIMOS MESES
   • Parcelas 1-2: R$ 500 cada (normal)
   • Parcelas 3-10: JÁ RECEBIDAS (antecipadas)
   • Status: "antecipado"
```

**Código:**
```javascript
// Antecipação de cartão
async function anteciparParcelas(contasReceberIds, taxaAntecipacao) {
  const valorTotal = sum(await ContaReceber.getByIds(contasReceberIds))
  const taxa = valorTotal * taxaAntecipacao
  const valorLiquido = valorTotal - taxa
  
  // 1. Liquidação da antecipação (entrada)
  await LiquidaçãoFinanceira.create({
    tipo: 'recebimento',
    valor_liquidacao: valorLiquido,
    data_liquidacao: new Date(),
    forma_pagamento: 'ted',
    descricao: 'Antecipação de cartão',
    taxa_intermediacao: taxa,
    valor_liquido: valorLiquido
  })
  
  // 2. Liquidação da taxa (despesa)
  await LiquidaçãoFinanceira.create({
    tipo: 'pagamento',
    valor_liquidacao: taxa,
    data_liquidacao: new Date(),
    forma_pagamento: 'deducao',
    descricao: 'Taxa de antecipação de cartão',
    categoria: 'Despesas Financeiras'
  })
  
  // 3. Atualiza contas antecipadas
  await ContaReceber.bulkUpdate(contasReceberIds, {
    status: 'antecipado',
    data_antecipacao: new Date()
  })
  
  // 4. Gera DFC
  await DFCLancamento.create({
    origem: 'liquidacao_financeira',
    tipo: 'entrada',
    valor: valorLiquido,
    grupo: 'operacional',
    descricao: 'Antecipação de cartão'
  })
  
  await DFCLancamento.create({
    origem: 'liquidacao_financeira',
    tipo: 'saida',
    valor: taxa,
    grupo: 'operacional',
    categoria: 'Despesas Financeiras',
    descricao: 'Taxa de antecipação'
  })
}
```

---

### Fluxo 3: Inadimplência

```
1. CONTA A RECEBER (Vencimento: 22/08)
   │
   ▼
2. NÃO PAGA (atraso)
   │
   ▼
3. SISTEMA DETECTA (D+1)
   • Status: "vencido"
   • Dias atraso: 1
   │
   ▼
4. AÇÕES AUTOMÁTICAS
   • Notificação cliente (email/SMS)
   • Alerta consultor
   • Bloqueia nova venda (opcional)
   │
   ▼
5. DRE (mantém competência)
   • Receita: R$ 1.000 (já reconhecida)
   • NÃO altera!
   │
   ▼
6. DFC (NÃO reconhece)
   • Entrada: R$ 0 (não entrou!)
   │
   ▼
7. CONTAS A RECEBER (atualiza)
   • Status: "vencido"
   • Dias atraso: +1 a cada dia
   • Multa: 2%
   • Juros: 1% ao mês
   │
   ▼
8. QUANDO PAGAR (atrasado)
   • Liquidação: R$ 1.000 + multa + juros
   • DFC: Entrada real
   • Conciliação: Match
```

---

## 🏗️ FINANCIAL ENGINE (Motor Centralizado)

### Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│              FINANCIAL ENGINE                           │
│         (ÚNICA FONTE DA VERDADE)                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  getDRE(mes, workshopId)                                │
│    └── Calcula DRE (competência)                        │
│                                                         │
│  getDFC(mes, workshopId)                                │
│    └── Calcula DFC (SÓ liquidações)                     │
│                                                         │
│  getContasReceber(filters)                              │
│    └── Abertos, vencidos, atrasados                     │
│                                                         │
│  getContasPagar(filters)                                │
│    └── Abertos, vencidos, atrasados                     │
│                                                         │
│  getCashFlow(workshopId, periodo)                       │
│    └── Projeção de caixa (futuro)                       │
│                                                         │
│  getKPIs(mes, workshopId)                               │
│    └── Todos KPIs unificados                            │
│                                                         │
│  getBudgetVsActual(mes, workshopId)                     │
│    └── BudgetMeta vs DRE vs DFC                         │
│                                                         │
│  conciliateBankTransactions(workshopId, banco)          │
│    └── Auto match sistema vs banco                      │
│                                                         │
│  closeMonth(mes, workshopId, justificativa)             │
│    └── Fecha mês + snapshot                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Implementação

```javascript
// functions/FinancialEngine.js

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

export class FinancialEngine {
  constructor(base44) {
    this.base44 = base44;
  }

  // DRE (Competência)
  async getDRE(mes, workshopId) {
    const lancamentos = await this.base44.entities.DRELancamento.filter({
      mes,
      workshop_id: workshopId
    });

    const receitas = lancamentos.filter(l => l.tipo === 'receita');
    const despesas = lancamentos.filter(l => l.tipo === 'despesa');

    const faturamento = sum(receitas.map(l => l.valor));
    const custosDiretos = sum(despesas
      .filter(l => l.entra_tcmp2)
      .map(l => l.valor));
    const despesasTotais = sum(despesas.map(l => l.valor));
    const lucro = faturamento - despesasTotais;

    return {
      faturamento,
      custos_diretos: custosDiretos,
      despesas_totais: despesasTotais,
      lucro_liquido: lucro,
      margem_liquida: (lucro / faturamento) * 100,
      tcmp2: await this.calcularTCMP2(custosDiretos, mes, workshopId),
      r70: await this.calcularR70(receitas),
      i30: await this.calcularI30(receitas)
    };
  }

  // DFC (SÓ Liquidações)
  async getDFC(mes, workshopId) {
    // 1. Busca TODAS as liquidações do mês
    const liquidacoes = await this.base44.entities.LiquidaçãoFinanceira.filter({
      workshop_id: workshopId,
      data_liquidacao: { $gte: `${mes}-01`, $lte: `${mes}-31` }
    });

    // 2. Filtra por tipo
    const recebimentos = liquidacoes.filter(l => l.tipo === 'recebimento');
    const pagamentos = liquidacoes.filter(l => l.tipo === 'pagamento');

    // 3. Calcula totais
    const entradas = sum(recebimentos.map(l => l.valor_liquido));
    const saidas = sum(pagamentos.map(l => l.valor_liquidacao));

    // 4. Saldo inicial (do mês anterior)
    const saldoInicial = await this.getSaldoFinal(mes - 1, workshopId);

    // 5. Saldo final
    const saldoFinal = saldoInicial + entradas - saidas;

    // 6. Detalha por fonte
    const porBanco = sum(recebimentos
      .filter(l => l.forma_pagamento === 'pix' || l.forma_pagamento === 'ted')
      .map(l => l.valor_liquido));
    
    const porMaquina = sum(recebimentos
      .filter(l => l.forma_pagamento.includes('cartao'))
      .map(l => l.valor_liquido));
    
    const porCaixa = sum(recebimentos
      .filter(l => l.forma_pagamento === 'dinheiro')
      .map(l => l.valor_liquido));

    return {
      saldo_inicial: saldoInicial,
      entradas_totais: entradas,
      saidas_totais: saidas,
      saldo_final: saldoFinal,
      detalhamento: {
        banco: porBanco,
        maquina_cartao: porMaquina,
        caixa: porCaixa
      },
      conciliado: recebimentos.filter(l => l.conciliado).length / recebimentos.length * 100
    };
  }

  // Contas a Receber
  async getContasReceber(filters) {
    const query = {
      workshop_id: filters.workshopId,
      status: filters.status || { $in: ['aberto', 'parcial', 'vencido'] }
    };

    if (filters.vencido) {
      query.data_vencimento = { $lt: new Date() };
      query.status = { $ne: 'pago' };
    }

    const contas = await this.base44.entities.ContaReceber.filter(query);

    return {
      total: contas.length,
      valor_aberto: sum(contas.map(c => c.valor_aberto)),
      valor_vencido: sum(contas.filter(c => c.data_vencimento < new Date()).map(c => c.valor_aberto)),
      dias_atraso_medio: avg(contas.map(c => c.dias_atraso || 0)),
      contas
    };
  }

  // Conciliação Automática
  async conciliateBankTransactions(workshopId, banco) {
    // 1. Importa extrato bancário (API ou OFX)
    const transacoesBanco = await this.importarExtratoBancario(banco);

    // 2. Busca liquidações não conciliadas
    const liquidacoes = await this.base44.entities.LiquidaçãoFinanceira.filter({
      workshop_id: workshopId,
      conciliado: false
    });

    // 3. Match automático
    const matches = [];

    for (const transacao of transacoesBanco) {
      // Critérios de match
      const match = liquidacoes.find(l => 
        Math.abs(l.valor_liquidacao - transacao.valor) < 0.01 &&
        l.data_liquidacao.toDateString() === transacao.data_operacao.toDateString() &&
        (
          l.numero_documento === transacao.numero_documento ||
          l.metadados?.id_pix === transacao.metadados?.id_transacao
        )
      );

      if (match) {
        matches.push({
          bank_transaction: transacao,
          liquidacao: match,
          divergencia: 0
        });

        // Atualiza conciliação
        await this.base44.entities.BankTransaction.update(transacao.id, {
          liquidez_financeira_id: match.id,
          status_conciliacao: 'conciliado',
          data_conciliacao: new Date()
        });

        await this.base44.entities.LiquidaçãoFinanceira.update(match.id, {
          conciliado: true,
          data_conciliacao: new Date()
        });
      } else {
        // Sem match → divergência
        await this.base44.entities.BankTransaction.create({
          workshop_id: workshopId,
          banco,
          ...transacao,
          status_conciliacao: 'divergente'
        });
      }
    }

    return {
      total_transacoes: transacoesBanco.length,
      conciliadas: matches.length,
      divergentes: transacoesBanco.length - matches.length
    };
  }

  // Fechamento de Mês
  async closeMonth(mes, workshopId, justificativa, userId) {
    // 1. Valida admin
    const user = await this.base44.auth.me();
    if (user.role !== 'admin') {
      throw new Error('Apenas administradores podem fechar mês');
    }

    // 2. Gera snapshot
    const dre = await this.getDRE(mes, workshopId);
    const dfc = await this.getDFC(mes, workshopId);
    const contasReceber = await this.getContasReceber({ workshopId });

    const snapshot = {
      workshop_id: workshopId,
      mes,
      status: 'fechado',
      data_fechamento: new Date(),
      fechado_por: userId,
      
      // DRE
      dre_faturamento_total: dre.faturamento,
      dre_lucro_liquido: dre.lucro_liquido,
      dre_margem_liquida: dre.margem_liquida,
      
      // DFC
      dfc_saldo_final: dfc.saldo_final,
      dfc_entradas_totais: dfc.entradas_totais,
      dfc_saidas_totais: dfc.saidas_totais,
      
      // Contas
      contas_receber_aberto: contasReceber.valor_aberto,
      contas_receber_vencido: contasReceber.valor_vencido,
      
      // Hash de integridade
      kpi_hash: this.generateHash({ dre, dfc, contasReceber })
    };

    await this.base44.entities.FinancialMonthSnapshot.create(snapshot);

    // 3. Bloqueia edições
    await this.base44.entities.BudgetMeta.update({
      mes,
      workshop_id: workshopId
    }, {
      controlar_orcamento: false
    });

    // 4. Registra auditoria
    await this.base44.functions.registrarAlteracaoMeta({
      mes,
      workshop_id: workshopId,
      field_changed: 'fechamento_mes',
      old_value: 'aberto',
      new_value: 'fechado',
      reason: justificativa,
      is_locked_change: true
    });

    return snapshot;
  }

  // Helpers
  async calcularTCMP2(custosDiretos, mes, workshopId) {
    const horas = await this.base44.entities.RegistroDiario.filter({
      workshop_id: workshopId,
      data: { $gte: `${mes}-01`, $lte: `${mes}-31` }
    });
    
    const totalHoras = sum(horas.map(h => h.total_horas));
    return custosDiretos / totalHoras;
  }

  async calcularR70(receitas) {
    const servicos = sum(receitas
      .filter(r => r.categoria.includes('Serviço'))
      .map(r => r.valor));
    
    const total = sum(receitas.map(r => r.valor));
    return (servicos / total) * 100;
  }

  async calcularI30(receitas) {
    const pecas = sum(receitas
      .filter(r => r.categoria.includes('Peças'))
      .map(r => r.valor));
    
    const total = sum(receitas.map(r => r.valor));
    return (pecas / total) * 100;
  }

  generateHash(data) {
    // Hash para integridade do snapshot
    return btoa(JSON.stringify(data));
  }
}

// Export
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const engine = new FinancialEngine(base44);
  
  // Expor métodos via API
  // ...
});
```

---

## 📋 PLANO DE IMPLEMENTAÇÃO

### Fase 1: Fundação (2 semanas)
- [ ] Criar entities: ContaReceber, ContaPagar
- [ ] Criar entity: LiquidaçãoFinanceira
- [ ] Criar backend: registrarLiquidação
- [ ] Migrar DRE atual (não alterar)

### Fase 2: Conciliação (2 semanas)
- [ ] Criar entity: BankTransaction
- [ ] Implementar importação OFX (banco)
- [ ] Criar motor de match automático
- [ ] UI de conciliação manual

### Fase 3: Financial Engine (2 semanas)
- [ ] Criar classe FinancialEngine
- [ ] Implementar getDRE, getDFC, getKPIs
- [ ] Criar getContasReceber, getContasPagar
- [ ] Implementar conciliateBankTransactions

### Fase 4: Snapshots (1 semana)
- [ ] Criar entity: FinancialMonthSnapshot
- [ ] Implementar closeMonth
- [ ] Criar getSnapshot (leitura)
- [ ] Bloquear edições retroativas

### Fase 5: Migração (2 semanas)
- [ ] Backfill: Criar ContaReceber de DREs antigos
- [ ] Backfill: Criar Liquidações de DFCs antigos
- [ ] Validar integridade: DRE = Contas a Receber
- [ ] Validar integridade: DFC = Liquidações

### Fase 6: UI (2 semanas)
- [ ] Tela: Contas a Receber (lista, filtros)
- [ ] Tela: Contas a Pagar (lista, filtros)
- [ ] Tela: Conciliação Bancária (match manual)
- [ ] Modal: Registrar Liquidação
- [ ] Dashboard: Cash Flow (projeção)

---

## ✅ BENEFÍCIOS

### Antes (Arquitetura Atual)
```
Problema                  Impacto
─────────────────────────────────────
DRE ≠ DFC                 Caixa fake
Lucro fake                Decisão errada
KPI divergente            BI inútil
Duplicidade               Perda financeira
Fechamento inconsistente  Auditoria falha
```

### Depois (Nova Arquitetura)
```
Benefício                 Resultado
─────────────────────────────────────
DRE = Competência         Contábil correto
DFC = Liquidação          Caixa real
Conciliação auto          Divergência 0%
Snapshot imutável         Histórico fiel
Engine centralizada       KPI único
```

---

**Documento aprovado por:** Arquitetura Financeira  
**Próxima revisão:** Após implementação Fase 1  
**Status:** AGUARDANDO APROVAÇÃO