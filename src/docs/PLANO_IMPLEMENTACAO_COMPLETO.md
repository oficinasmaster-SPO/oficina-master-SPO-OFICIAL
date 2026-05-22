# 📅 Plano de Implementação - Arquitetura Financeira Enterprise
## Cronograma Completo (14 semanas)

**Documento:** IMPL-PLAN-001  
**Tipo:** Plano de Implementação  
**Prioridade:** CRÍTICA  
**Data:** 2026-05-22

---

## 🎯 VISÃO GERAL

```
┌─────────────────────────────────────────────────────────────┐
│  ┐
│  DURAÇÃO TOTAL: 14 SEMANAS (3,5 meses)                      │
│  EQUIPE: 2-3 desenvolvedores + 1 QA                         │
│  RISCO: ALTO (mudança arquitetural)                         │
│  IMPACTO: CRÍTICO (elimina divergência DRE/DFC)             │
└────────────────────────────────────────────────────────────  ┘

FASE 1: Fundação (Entities + Backend)     → 2 semanas
FASE 2: Conciliação Bancária              → 2 semanas
FASE 3: Financial Engine                  → 2 semanas
FASE 4: Snapshots + Fechamento            → 2 semanas
FASE 5: Backfill + Migração               → 3 semanas
FASE 6: UI + Frontend                     → 3 semanas
─────────────────────────────────────────────────────────────
TOTAL: 14 semanas
```

---

## 📦 FASE 1: FUNDAÇÃO (Entities + Backend)
**Duração:** 2 semanas  
**Objetivo:** Criar estrutura básica de dados e fluxos de liquidação

### 📋 TAREFAS

#### Semana 1: Entities

##### 1.1. Criar Entity: ContaReceber
**Arquivo:** `entities/ContaReceber.json`

```json
{
  "name": "ContaReceber",
  "type": "object",
  "properties": {
    "workshop_id": { "type": "string" },
    "dre_lancamento_id": { "type": "string" },
    "cliente_id": { "type": "string" },
    "cliente_nome": { "type": "string" },
    "valor_original": { "type": "number" },
    "valor_aberto": { "type": "number" },
    "valor_pago": { "type": "number" },
    "status": { 
      "type": "string",
      "enum": ["aberto", "parcial", "pago", "vencido", "cancelado", "antecipado"]
    },
    "data_vencimento": { "type": "string", "format": "date" },
    "data_emissao": { "type": "string", "format": "date" },
    "data_primeiro_pagamento": { "type": "string", "format": "date" },
    "numero_documento": { "type": "string" },
    "tipo_documento": { 
      "type": "string",
      "enum": ["nota_fiscal", "recibo", "duplicata", "carne", "boleto"]
    },
    "forma_pagamento": { 
      "type": "string",
      "enum": ["pix", "ted", "boleto", "cartao_credito", "cartao_debito", "dinheiro", "cheque"]
    },
    "parcela_numero": { "type": "integer" },
    "parcela_total": { "type": "integer" },
    "desconto": { "type": "number" },
    "juros": { "type": "number" },
    "multa": { "type": "number" },
    "dias_atraso": { "type": "integer" },
    "observacoes": { "type": "string" }
  },
  "required": [
    "workshop_id",
    "cliente_id",
    "valor_original",
    "status",
    "data_vencimento"
  ],
  "rls": {
    "create": { "$or": [{"workshop_id": "{{user.data.workshop_id}}"}, {"user_condition": {"role": "admin"}}] },
    "read": { "$or": [{"workshop_id": "{{user.data.workshop_id}}"}, {"user_condition": {"role": "admin"}}] },
    "update": { "$or": [{"workshop_id": "{{user.data.workshop_id}}"}, {"user_condition": {"role": "admin"}}] },
    "delete": {"user_condition": {"role": "admin"}}
  }
}
```

**Critérios de Aceite:**
- [ ] Entity criada no banco
- [ ] RLS configurado corretamente
- [ ] Validações de schema funcionando
- [ ] Teste de CRUD básico

---

##### 1.2. Criar Entity: ContaPagar
**Arquivo:** `entities/ContaPagar.json`

```json
{
  "name": "ContaPagar",
  "type": "object",
  "properties": {
    "workshop_id": { "type": "string" },
    "dre_lancamento_id": { "type": "string" },
    "fornecedor_id": { "type": "string" },
    "fornecedor_nome": { "type": "string" },
    "valor_original": { "type": "number" },
    "valor_aberto": { "type": "number" },
    "valor_pago": { "type": "number" },
    "status": { 
      "type": "string",
      "enum": ["aberto", "parcial", "pago", "vencido", "cancelado"]
    },
    "data_vencimento": { "type": "string", "format": "date" },
    "data_emissao": { "type": "string", "format": "date" },
    "numero_documento": { "type": "string" },
    "tipo_documento": { "type": "string" },
    "forma_pagamento": { "type": "string" },
    "parcela_numero": { "type": "integer" },
    "parcela_total": { "type": "integer" },
    "centro_custo": { "type": "string" },
    "categoria": { "type": "string" },
    "observacoes": { "type": "string" }
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

**Critérios de Aceite:**
- [ ] Entity criada no banco
- [ ] RLS configurado
- [ ] Validações funcionando

---

##### 1.3. Criar Entity: LiquidaçãoFinanceira
**Arquivo:** `entities/LiquidaçãoFinanceira.json`

```json
{
  "name": "LiquidaçãoFinanceira",
  "type": "object",
  "properties": {
    "workshop_id": { "type": "string" },
    "conta_receber_id": { "type": "string" },
    "conta_pagar_id": { "type": "string" },
    "tipo": { "type": "string", "enum": ["recebimento", "pagamento"] },
    "valor_liquidacao": { "type": "number" },
    "data_liquidacao": { "type": "string", "format": "date-time" },
    "forma_pagamento": { "type": "string" },
    "banco_origem": { "type": "string" },
    "banco_destino": { "type": "string" },
    "numero_documento": { "type": "string" },
    "numero_transacao": { "type": "string" },
    "taxa_cartao": { "type": "number" },
    "taxa_intermediacao": { "type": "number" },
    "desconto_concedido": { "type": "number" },
    "juros_recebido": { "type": "number" },
    "multa_recebida": { "type": "number" },
    "valor_liquido": { "type": "number" },
    "conciliado": { "type": "boolean", "default": false },
    "data_conciliacao": { "type": "string", "format": "date-time" },
    "conciliado_por": { "type": "string" },
    "observacoes": { "type": "string" },
    "comprovante_url": { "type": "string" },
    "metadados": { "type": "object" }
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

**Critérios de Aceite:**
- [ ] Entity criada
- [ ] Campos de conciliação presentes
- [ ] Metadados JSON flexível

---

#### Semana 2: Backend Functions

##### 2.1. Criar Function: registrarLiquidação
**Arquivo:** `functions/registrarLiquidação.js`

**Responsabilidade:** Criar liquidação + atualizar conta + gerar DFC

```javascript
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      conta_receber_id,
      conta_pagar_id,
      tipo,
      valor_liquidacao,
      forma_pagamento,
      data_liquidacao,
      banco,
      desconto,
      juros,
      multa,
      observacoes
    } = await req.json();

    // 1. Validações
    if (!valor_liquidacao || valor_liquidacao <= 0) {
      return Response.json({ error: 'Valor inválido' }, { status: 400 });
    }

    // 2. Atualiza ContaReceber ou ContaPagar
    const entidadeId = conta_receber_id || conta_pagar_id;
    const entityName = conta_receber_id ? 'ContaReceber' : 'ContaPagar';
    
    const conta = await base44.entities[entityName].get(entidadeId);
    
    const novoValorPago = (conta.valor_pago || 0) + valor_liquidacao;
    const novoValorAberto = conta.valor_original - novoValorPago;
    const novoStatus = novoValorAberto <= 0 ? 'pago' : 'parcial';

    await base44.entities[entityName].update(entidadeId, {
      valor_pago: novoValorPago,
      valor_aberto: novoValorAberto,
      status: novoStatus,
      data_primeiro_pagamento: data_liquidacao
    });

    // 3. Cria LiquidaçãoFinanceira
    const liquidacao = await base44.entities.LiquidaçãoFinanceira.create({
      workshop_id: conta.workshop_id,
      conta_receber_id,
      conta_pagar_id,
      tipo,
      valor_liquidacao,
      data_liquidacao,
      forma_pagamento,
      banco_destino: banco,
      desconto_concedido: desconto || 0,
      juros_recebido: juros || 0,
      multa_recebida: multa || 0,
      valor_liquido: valor_liquidacao + juros + multa - desconto,
      conciliado: false,
      observacoes
    });

    // 4. Gera DFC (SÓ AGORA!)
    await base44.entities.DFCLancamento.create({
      workshop_id: conta.workshop_id,
      mes: new Date(data_liquidacao).toISOString().slice(0, 7), // YYYY-MM
      origem: 'liquidacao_financeira',
      tipo: tipo === 'recebimento' ? 'entrada' : 'saida',
      grupo: 'operacional',
      descricao: `${tipo === 'recebimento' ? 'Recebimento' : 'Pagamento'} - ${conta.cliente_nome || conta.fornecedor_nome}`,
      valor: valor_liquidacao,
      data_pagamento: data_liquidacao,
      forma_pagamento: forma_pagamento,
      liquidacao_financeira_id: liquidacao.id,
      conta_receber_id: conta_receber_id,
      conta_pagar_id: conta_pagar_id
    });

    return Response.json({
      success: true,
      liquidacao_id: liquidacao.id,
      conta_status: novoStatus,
      dfc_gerado: true
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
```

**Critérios de Aceite:**
- [ ] Function criada e testada
- [ ] Atualiza ContaReceber corretamente
- [ ] Cria LiquidaçãoFinanceira
- [ ] Gera DFCLancamento
- [ ] Teste com pagamento parcial
- [ ] Teste com pagamento total

---

##### 2.2. Criar Function: desfazerLiquidação
**Arquivo:** `functions/desfazerLiquidação.js`

**Responsabilidade:** Reverter liquidação (caso erro)

```javascript
// Estrutura similar a registrarLiquidação
// Deleta: LiquidaçãoFinanceira, DFCLancamento
// Reverte: ContaReceber/ContaPagar
```

**Critérios de Aceite:**
- [ ] Deleta liquidação
- [ ] Deleta DFC gerado
- [ ] Reverte status da conta
- [ ] Audit log registrado

---

##### 2.3. Criar Function: gerarParcelamentoAutomatico
**Arquivo:** `functions/gerarParcelamentoAutomatico.js`

**Responsabilidade:** Criar múltiplas ContaReceber de uma venda

```javascript
// Input: { valor_total, entrada, parcelas, data_primeiro_vencimento }
// Output: Array de ContaReceber criadas
```

**Critérios de Aceite:**
- [ ] Cria entrada + parcelas
- [ ] Calcula vencimentos corretamente
- [ ] Linka com DRELancamento origem

---

### ✅ ENTREGÁVEIS FASE 1

- [ ] 3 entities criadas (ContaReceber, ContaPagar, LiquidaçãoFinanceira)
- [ ] 3 backend functions (registrarLiquidação, desfazerLiquidação, gerarParcelamentoAutomatico)
- [ ] Testes unitários passando
- [ ] Documentação técnica atualizada
- [ ] Schema validation test

**Critério de Conclusão:** Conseguir criar conta a receber, registrar liquidação parcial e ver DFC gerado automaticamente.

---

## 🔗 FASE 2: CONCILIAÇÃO BANCÁRIA
**Duração:** 2 semanas  
**Objetivo:** Importar extratos bancários e fazer match automático

### 📋 TAREFAS

#### Semana 3: Entity + Importação

##### 3.1. Criar Entity: BankTransaction
**Arquivo:** `entities/BankTransaction.json`

```json
{
  "name": "BankTransaction",
  "type": "object",
  "properties": {
    "workshop_id": { "type": "string" },
    "banco": { "type": "string" },
    "numero_conta": { "type": "string" },
    "tipo": { "type": "string", "enum": ["credito", "debito"] },
    "valor": { "type": "number" },
    "data_operacao": { "type": "string", "format": "date" },
    "data_lancamento": { "type": "string", "format": "date" },
    "descricao": { "type": "string" },
    "numero_documento": { "type": "string" },
    "categoria_bancaria": { "type": "string" },
    "liquidacao_financeira_id": { "type": "string" },
    "status_conciliacao": { 
      "type": "string",
      "enum": ["pendente", "conciliado", "divergente", "ignorado"]
    },
    "divergencia_valor": { "type": "number" },
    "divergencia_tipo": { "type": "string" },
    "conciliado_por": { "type": "string" },
    "data_conciliacao": { "type": "string", "format": "date-time" },
    "observacoes": { "type": "string" },
    "metadados": { "type": "object" }
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

---

##### 3.2. Criar Function: importarExtratoBancario
**Arquivo:** `functions/importarExtratoBancario.js`

**Responsabilidade:** Importar OFX/CSV do banco

```javascript
// Input: { banco, arquivo_url (OFX/CSV) }
// Output: Array de BankTransaction criadas
// Match inicial: Tenta encontrar por valor + data
```

**Critérios de Aceite:**
- [ ] Parse de OFX funcionando
- [ ] Parse de CSV funcionando
- [ ] Cria BankTransaction para cada linha
- [ ] Status inicial: "pendente"

---

#### Semana 4: Motor de Conciliação

##### 4.1. Criar Function: conciliarTransacoesAutomatico
**Arquivo:** `functions/conciliarTransacoesAutomatico.js`

**Responsabilidade:** Match automático sistema vs banco

```javascript
// Algoritmo de match:
// 1. Valor exato (±0.01)
// 2. Data mesma (±2 dias)
// 3. Documento igual (nosso_numero, id_pix)
// 4. Descrição similar (Levenshtein distance)

// Output: { conciliadas: X, divergentes: Y }
```

**Critérios de Aceite:**
- [ ] Match por valor + data
- [ ] Match por documento
- [ ] Match por descrição (fuzzy)
- [ ] Atualiza status para "conciliado"
- [ ] Cria alertas de divergência

---

##### 4.2. Criar Function: conciliarTransacaoManual
**Arquivo:** `functions/conciliarTransacaoManual.js`

**Responsabilidade:** Usuário faz match manualmente

```javascript
// Input: { bank_transaction_id, liquidacao_financeira_id }
// Valida: Valores batem?
// Output: Conciliação registrada
```

**Critérios de Aceite:**
- [ ] UI permite selecionar transações
- [ ] Valida valores antes de conciliar
- [ ] Atualiza ambos os lados
- [ ] Audit log

---

##### 4.3. Criar Function: detectarDivergencias
**Arquivo:** `functions/detectarDivergencias.js`

**Responsabilidade:** Alertar diferenças

```javascript
// Tipos de divergência:
// 1. Valor diferente (sistema vs banco)
// 2. Transação sem match (banco tem, sistema não)
// 3. Transação pendente (sistema tem, banco não)
// 4. Duplicidade detectada

// Output: Array de alertas
```

**Critérios de Aceite:**
- [ ] Detecta todos os tipos de divergência
- [ ] Gera alertas visíveis
- [ ] Sugere correções

---

### ✅ ENTREGÁVEIS FASE 2

- [ ] Entity BankTransaction criada
- [ ] Importação OFX/CSV funcionando
- [ ] Conciliação automática (80% dos casos)
- [ ] Conciliação manual (UI)
- [ ] Detector de divergências
- [ ] Relatório de conciliação

**Critério de Conclusão:** Conseguir importar extrato bancário, conciliar automaticamente 80% das transações e identificar divergências manualmente.

---

## ⚙️ FASE 3: FINANCIAL ENGINE
**Duração:** 2 semanas  
**Objetivo:** Centralizar todos os cálculos financeiros em uma engine única

### 📋 TAREFAS

#### Semana 5: Engine Core

##### 5.1. Criar Function: FinancialEngine (Classe)
**Arquivo:** `functions/FinancialEngine.js`

**Métodos:**
```javascript
class FinancialEngine {
  // DRE
  async getDRE(mes, workshopId) { }
  async getDREAcumulado(ano, workshopId) { }
  
  // DFC
  async getDFC(mes, workshopId) { }
  async getDFCAcumulado(ano, workshopId) { }
  
  // Contas
  async getContasReceber(filters) { }
  async getContasPagar(filters) { }
  async getContasVencidas(workshopId) { }
  
  // Caixa
  async getCashFlow(workshopId, periodo) { }
  async getSaldoAtual(workshopId) { }
  async getSaldoProjecao(workshopId, dias) { }
  
  // KPIs
  async getKPIs(mes, workshopId) { }
  async getTCMP2(mes, workshopId) { }
  async getR70I30(mes, workshopId) { }
  async getMargemLiquida(mes, workshopId) { }
  
  // Budget
  async getBudgetVsActual(mes, workshopId) { }
  
  // Conciliação
  async conciliateBankTransactions(workshopId, banco) { }
  async getConciliacaoStatus(workshopId) { }
}
```

**Critérios de Aceite:**
- [ ] Todos os métodos implementados
- [ ] Testes unitários passando
- [ ] Performance: < 2s por chamada
- [ ] Cache implementado (se necessário)

---

##### 5.2. Refatorar: getDREData
**Arquivo:** `functions/getDREData.js`

**Mudança:**
```javascript
// ANTES: Calculava direto do DRELancamento
// DEPOIS: Usa FinancialEngine.getDRE()

const engine = new FinancialEngine(base44);
return await engine.getDRE(mes, workshopId);
```

**Critérios de Aceite:**
- [ ] Mesmos resultados de antes
- [ ] Performance igual ou melhor
- [ ] Testes de regressão passando

---

##### 5.3. Refatorar: getDFCData
**Arquivo:** `functions/getDFCData.js`

**Mudança:**
```javascript
// ANTES: Calculava direto do DFCLancamento
// DEPOIS: Usa FinancialEngine.getDFC()
//        SÓ liquidações confirmadas!

const engine = new FinancialEngine(base44);
return await engine.getDFC(mes, workshopId);
```

**Critérios de Aceite:**
- [ ] DFC só mostra liquidações conciliadas
- [ ] Performance OK
- [ ] Testes passando

---

#### Semana 6: Métodos Avançados

##### 6.1. Implementar: getContasReceber
```javascript
async getContasReceber(filters) {
  const query = {
    workshop_id: filters.workshopId,
    status: { $in: ['aberto', 'parcial', 'vencido'] }
  };

  if (filters.vencido) {
    query.data_vencimento = { $lt: new Date() };
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
```

---

##### 6.2. Implementar: getCashFlow
```javascript
async getCashFlow(workshopId, periodo) {
  // Projeção de caixa futuro
  // 1. Saldo atual
  // 2. Contas a receber (vencimento futuro)
  // 3. Contas a pagar (vencimento futuro)
  // 4. Recorrências confirmadas
  
  const saldoAtual = await this.getSaldoAtual(workshopId);
  const receberFuturo = await this.getContasReceber({ 
    workshopId, 
    vencimento_futuro: true 
  });
  const pagarFuturo = await this.getContasPagar({ 
    workshopId, 
    vencimento_futuro: true 
  });

  return {
    saldo_inicial: saldoAtual,
    entradas_previstas: receberFuturo.valor_aberto,
    saidas_previstas: pagarFuturo.valor_aberto,
    saldo_final_projetado: saldoAtual + receberFuturo.valor_aberto - pagarFuturo.valor_aberto
  };
}
```

---

##### 6.3. Implementar: getKPIs
```javascript
async getKPIs(mes, workshopId) {
  const dre = await this.getDRE(mes, workshopId);
  const dfc = await this.getDFC(mes, workshopId);
  const contas = await this.getContasReceber({ workshopId });

  return {
    faturamento: dre.faturamento,
    lucro_liquido: dre.lucro_liquido,
    margem_liquida: dre.margem_liquida,
    tcmp2: dre.tcmp2,
    r70: dre.r70,
    i30: dre.i30,
    caixa_final: dfc.saldo_final,
    contas_receber_aberto: contas.valor_aberto,
    contas_receber_vencido: contas.valor_vencido,
    inadimplencia: (contas.valor_vencido / contas.valor_aberto) * 100
  };
}
```

---

### ✅ ENTREGÁVEIS FASE 3

- [ ] FinancialEngine implementada
- [ ] 15+ métodos funcionando
- [ ] Functions antigas refatoradas
- [ ] Testes de performance
- [ ] Documentação da API

**Critério de Conclusão:** Todas as telas (DRE, DFC, Budget) usando FinancialEngine como única fonte da verdade.

---

## 🔒 FASE 4: SNAPSHOTS + FECHAMENTO
**Duração:** 2 semanas  
**Objetivo:** Congelar KPIs mensalmente e impedir edições retroativas

### 📋 TAREFAS

#### Semana 7: Entity Snapshot

##### 7.1. Criar Entity: FinancialMonthSnapshot
**Arquivo:** `entities/FinancialMonthSnapshot.json`

```json
{
  "name": "FinancialMonthSnapshot",
  "type": "object",
  "properties": {
    "workshop_id": { "type": "string" },
    "mes": { "type": "string" }, // YYYY-MM
    "status": { "type": "string", "enum": ["aberto", "fechado"] },
    "data_fechamento": { "type": "string", "format": "date-time" },
    "fechado_por": { "type": "string" },
    "justificativa": { "type": "string" },
    
    // DRE Snapshot
    "dre_faturamento_total": { "type": "number" },
    "dre_custos_diretos": { "type": "number" },
    "dre_despesas_operacionais": { "type": "number" },
    "dre_lucro_liquido": { "type": "number" },
    "dre_margem_liquida": { "type": "number" },
    "dre_tcmp2": { "type": "number" },
    "dre_r70": { "type": "number" },
    "dre_i30": { "type": "number" },
    
    // DFC Snapshot
    "dfc_saldo_inicial": { "type": "number" },
    "dfc_entradas_totais": { "type": "number" },
    "dfc_saidas_totais": { "type": "number" },
    "dfc_saldo_final": { "type": "number" },
    "dfc_saldo_banco": { "type": "number" },
    "dfc_saldo_maquina": { "type": "number" },
    "dfc_saldo_caixa": { "type": "number" },
    
    // Contas
    "contas_receber_aberto": { "type": "number" },
    "contas_receber_vencido": { "type": "number" },
    "contas_pagar_aberto": { "type": "number" },
    
    // Budget
    "budget_meta_total": { "type": "number" },
    "budget_realizado_total": { "type": "number" },
    "budget_atingimento": { "type": "number" },
    
    // Auditoria
    "kpi_hash": { "type": "string" },
    "auditoria_json": { "type": "object" }
  },
  "required": ["workshop_id", "mes", "status"]
}
```

---

##### 7.2. Criar Function: fecharMes
**Arquivo:** `functions/fecharMes.js` (JÁ EXISTE - ADAPTAR)

**Nova Implementação:**
```javascript
// 1. Valida admin
// 2. Gera snapshot (FinancialEngine)
// 3. Salva FinancialMonthSnapshot
// 4. Bloqueia edições retroativas
// 5. Registra auditoria
```

**Critérios de Aceite:**
- [ ] Apenas admin fecha
- [ ] Snapshot gerado corretamente
- [ ] Mês bloqueado para edições
- [ ] Audit log completo
- [ ] Justificativa obrigatória

---

#### Semana 8: Bloqueios + Reabertura

##### 8.1. Criar Function: reabrirMes
**Arquivo:** `functions/reabrirMes.js`

```javascript
// Input: { mes, workshop_id, justificativa }
// Valida: Apenas admin
// Ação: 
//   - Deleta snapshot
//   - Reabilita edições
//   - Registra auditoria
```

---

##### 8.2. Criar Function: validarEdicaoRetroativa
**Arquivo:** `functions/validarEdicaoRetroativa.js`

```javascript
// Hook chamado antes de editar DRELancamento, DFCLancamento, etc.
// Verifica: Mês está fechado?
// Se sim: Bloqueia (ou exige admin + justificativa)
```

---

##### 8.3. Criar Function: gerarSnapshotAutomatico
**Arquivo:** `functions/gerarSnapshotAutomatico.js`

```javascript
// Automation: Roda dia 1 de cada mês
// Gera snapshot do mês anterior automaticamente
// Envia notificação para admin conferir
```

---

### ✅ ENTREGÁVEIS FASE 4

- [ ] Entity FinancialMonthSnapshot
- [ ] Function fecharMes (adaptada)
- [ ] Function reabrirMes
- [ ] Hook validarEdicaoRetroativa
- [ ] Automation gerarSnapshotAutomatico
- [ ] UI de fechamento (modal)

**Critério de Conclusão:** Conseguir fechar mês, gerar snapshot imutável e bloquear edições retroativas.

---

## 🔄 FASE 5: BACKFILL + MIGRAÇÃO
**Duração:** 3 semanas  
**Objetivo:** Migrar dados históricos para nova arquitetura

### 📋 TAREFAS

#### Semana 9-10: Backfill

##### 9.1. Criar Function: backfillContaReceberFromDRE
**Arquivo:** `functions/backfillContaReceberFromDRE.js`

```javascript
// Para cada DRELancamento (receita) dos últimos 12 meses:
// 1. Cria ContaReceber (valor total)
// 2. Se já tem data_pagamento: cria LiquidaçãoFinanceira
// 3. Linka: dre_lancamento_id

// Batch: 100 registros por vez
// Log: Progresso a cada 100
```

**Critérios de Aceite:**
- [ ] Migra últimos 12 meses
- [ ] Não duplica registros
- [ ] Log de erros detalhado
- [ ] Rollback em caso de falha

---

##### 9.2. Criar Function: backfillLiquidaçõesFromDFC
**Arquivo:** `functions/backfillLiquidaçõesFromDFC.js`

```javascript
// Para cada DFCLancamento histórico:
// 1. Cria LiquidaçãoFinanceira
// 2. Linka com ContaReceber (se encontrar)
// 3. Marca como "conciliado" (legado)
```

---

##### 9.3. Criar Function: migrarParcelamentos
**Arquivo:** `functions/migrarParcelamentos.js`

```javascript
// Identifica vendas parceladas no DRE
// Cria múltiplas ContaReceber (1 por parcela)
// Calcula vencimentos proporcionais
```

---

##### 9.4. Criar Function: validarIntegridadeMigracao
**Arquivo:** `functions/validarIntegridadeMigracao.js`

```javascript
// Valida após backfill:
// 1. DRE total = ContaReceber total?
// 2. DFC total = Liquidações total?
// 3. Sem registros órfãos?

// Output: { validado: boolean, erros: [] }
```

---

#### Semana 11: Ajustes + Validação

##### 11.1. Corrigir inconsistências
- [ ] Ajustar diferenças encontradas
- [ ] Registrar divergências
- [ ] Documentar decisões

##### 11.2. Teste de carga
- [ ] Migrar 1000+ registros
- [ ] Performance aceitável
- [ ] Sem memory leak

---

### ✅ ENTREGÁVEIS FASE 5

- [ ] Backfill ContaReceber (12 meses)
- [ ] Backfill Liquidações (12 meses)
- [ ] Validação de integridade
- [ ] Relatório de migração
- [ ] Rollback testado

**Critério de Conclusão:** Dados históricos migrados, validados e consistentes entre DRE/ContaReceber/DFC.

---

## 🎨 FASE 6: UI + FRONTEND
**Duração:** 3 semanas  
**Objetivo:** Criar interfaces para nova arquitetura

### 📋 TAREFAS

#### Semana 12: Contas a Receber/Pagar

##### 12.1. Criar Page: ContasReceber
**Arquivo:** `pages/ContasReceber.jsx`

**Componentes:**
```jsx
<ContasReceber>
  <FiltrosContasReceber />
  <KPIsContasReceber />
  <TabelaContasReceber>
    <ContaReceberRow />
  </TabelaContasReceber>
  <ModalRegistrarPagamento />
  <ModalVisualizarHistorico />
</ContasReceber>
```

**Funcionalidades:**
- [ ] Lista contas (aberto, parcial, vencido, pago)
- [ ] Filtros (período, cliente, status, valor)
- [ ] Ordenação (vencimento, valor, cliente)
- [ ] Paginação (50 por página)
- [ ] Exportação (CSV, PDF)

---

##### 12.2. Criar Component: ModalRegistrarPagamento
**Arquivo:** `components/financeiro/ModalRegistrarPagamento.jsx`

**Campos:**
```jsx
<ModalRegistrarPagamento>
  <InfoContaReceber /> {/* Dados da conta */}
  <InputMoeda label="Valor Recebido" />
  <Select label="Forma Pagamento" options={PIX, TED, ...} />
  <Select label="Banco" />
  <InputDate label="Data Pagamento" />
  <InputMoeda label="Descontos" />
  <InputMoeda label="Juros" />
  <InputMoeda label="Multa" />
  <TextArea label="Observações" />
  <Button onClick={registrarLiquidação} />
</ModalRegistrarPagamento>
```

**Ações:**
- [ ] Salvar pagamento (total ou parcial)
- [ ] Limpar pagamento (desfazer)
- [ ] Validar campos
- [ ] Mostrar preview do DFC que será gerado

---

##### 12.3. Criar Page: ContasPagar
**Arquivo:** `pages/ContasPagar.jsx`

**Similar a ContasReceber, mas para despesas**

---

#### Semana 13: Conciliação Bancária

##### 13.1. Criar Page: ConciliacaoBancaria
**Arquivo:** `pages/ConciliacaoBancaria.jsx`

**Componentes:**
```jsx
<ConciliacaoBancaria>
  <ImportarExtrato /> {/* Upload OFX/CSV */}
  <FiltrosConciliacao />
  <GridConciliacao>
    <ColunaSistema /> {/* Liquidações */}
    <ColunaBanco /> {/* BankTransactions */}
    <MatchVisual /> {/* Linhas conectando */}
  </GridConciliacao>
  <PainelDivergencias />
</ConciliacaoBancaria>
```

**Funcionalidades:**
- [ ] Upload de extrato (OFX, CSV)
- [ ] Match automático (destaque verde)
- [ ] Match manual (drag & drop)
- [ ] Marcar divergência
- [ ] Justificar diferença
- [ ] Conciliar em lote

---

##### 13.2. Criar Component: MatchVisual
**Arquivo:** `components/financeiro/MatchVisual.jsx`

```jsx
// Visual: Duas colunas com linhas conectando
// Verde: Conciliado
// Amarelo: Match sugerido
// Vermelho: Divergente

<MatchVisual>
  <SistemaColumn>
    <LiquidadeCard />
  </SistemaColumn>
  <BancoColumn>
    <BankTransactionCard />
  </BancoColumn>
  <ConnectionLines /> {/* SVG lines */}
</MatchVisual>
```

---

#### Semana 14: Dashboards + Relatórios

##### 14.1. Criar Page: DashboardFinanceiro
**Arquivo:** `pages/DashboardFinanceiro.jsx`

**Widgets:**
```jsx
<DashboardFinanceiro>
  <KPIsCard /> {/* Faturamento, Lucro, Margem */}
  <CashFlowChart /> {/* Entradas vs Saídas */}
  <ContasReceberWidget /> {/* Aberto, Vencido */}
  <ConciliacaoStatusWidget /> {/* % conciliado */}
  <BudgetVsActualChart />
  <DREvsDFCComparison />
</DashboardFinanceiro>
```

---

##### 14.2. Criar Component: DREvsDFCComparison
**Arquivo:** `components/financeiro/DREvsDFCComparison.jsx`

```jsx
// Visual: Side-by-side
// Esquerda: DRE (competência)
// Direita: DFC (caixa real)
// Destaque: Diferenças

<DREvsDFCComparison>
  <DREColumn>
    <KPICard title="Receita" value={dre.receita} />
    <KPICard title="Despesas" value={dre.despesas} />
    <KPICard title="Lucro" value={dre.lucro} />
  </DREColumn>
  
  <DFCColumn>
    <KPICard title="Entradas" value={dfc.entradas} />
    <KPICard title="Saídas" value={dfc.saidas} />
    <KPICard title="Caixa" value={dfc.caixa} />
  </DFCColumn>
  
  <DiferencaColumn>
    <Alert severity={diff > 0 ? 'warning' : 'success'}>
      Diferença: {formatBRL(diff)}
    </Alert>
  </DiferencaColumn>
</DREvsDFCComparison>
```

---

##### 14.3. Atualizar Page: DRETCMP2
**Arquivo:** `pages/DRETCMP2.jsx`

**Mudanças:**
```jsx
// Aba DRE: Igual (não muda)
// Aba DFC: Agora usa LiquidaçõesFinanceiras
// Nova Aba: "Conciliação" (link para page ConciliacaoBancaria)
// Nova Aba: "Contas a Receber" (link para page ContasReceber)
```

---

### ✅ ENTREGÁVEIS FASE 6

- [ ] Page ContasReceber (completa)
- [ ] Page ContasPagar (completa)
- [ ] Page ConciliacaoBancaria (completa)
- [ ] ModalRegistrarPagamento
- [ ] MatchVisual component
- [ ] DashboardFinanceiro
- [ ] DREvsDFCComparison
- [ ] DRETCMP2 atualizada
- [ ] Testes E2E passando

**Critério de Conclusão:** Usuário consegue registrar pagamentos, conciliar com banco e ver dashboard financeiro completo.

---

## 📊 CRONOGRAMA CONSOLIDADO

```
SEMANA  1-2:  FASE 1 - Fundação (Entities + Backend)
SEMANA  3-4:  FASE 2 - Conciliação Bancária
SEMANA  5-6:  FASE 3 - Financial Engine
SEMANA  7-8:  FASE 4 - Snapshots + Fechamento
SEMANA  9-11: FASE 5 - Backfill + Migração
SEMANA 12-14: FASE 6 - UI + Frontend
────────────────────────────────────────────────────
TOTAL: 14 SEMANAS (3,5 meses)
```

### Marcos Principais (Milestones)

```
M1 (Semana 2):  ✅ Entities criadas + Backend básico
M2 (Semana 4):  ✅ Conciliação automática funcionando
M3 (Semana 6):  ✅ FinancialEngine em produção
M4 (Semana 8):  ✅ Fechamento de mês implementado
M5 (Semana 11): ✅ Dados históricos migrados
M6 (Semana 14): ✅ UI completa + Go Live
```

---

## 🎯 CRITÉRIOS DE GO LIVE

### Pré-requisitos
- [ ] Todas as 6 fases completas
- [ ] 100% dos testes passando (unitários + integração + E2E)
- [ ] Performance: < 3s em todas as telas
- [ ] Zero divergências críticas
- [ ] Backup completo antes de migrar
- [ ] Rollback testado e documentado

### Validação Final
- [ ] DRE = ContaReceber (total)
- [ ] DFC = Liquidações (total)
- [ ] Conciliação: > 95% automático
- [ ] Snapshot: Imutável
- [ ] KPIs: Consistentes

### Comunicação
- [ ] Treinar equipe financeira
- [ ] Documentação de usuário
- [ ] Vídeo tutorial
- [ ] FAQ disponível

---

## ⚠️ RISCOS + MITIGAÇÃO

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Perda de dados na migração | Baixa | Crítico | Backup + Rollback testado |
| Performance ruim | Média | Alto | Cache + Otimização de queries |
| Resistência dos usuários | Alta | Médio | Treinamento + UI intuitiva |
| Divergências não detectadas | Média | Alto | Validação automática + Alertas |
| Prazo estourar | Média | Alto | Buffer de 2 semanas + Priorização |

---

## 📝 CHECKLIST DE IMPLANTAÇÃO

### Dia do Go Live
- [ ] Backup completo do banco
- [ ] Deploy em staging (último teste)
- [ ] Aprovação do PO
- [ ] Comunicado aos usuários
- [ ] Equipe de suporte em alerta

### Pós Go Live (Semana 1)
- [ ] Monitorar performance
- [ ] Coletar feedback dos usuários
- [ ] Corrigir bugs críticos (se houver)
- [ ] Validar dados (amostragem)

### Pós Go Live (Mês 1)
- [ ] Primeira conciliação automática
- [ ] Primeiro fechamento de mês
- [ ] Primeiro snapshot gerado
- [ ] Relatório de resultados

---

**Documento aprovado por:** Arquitetura Financeira  
**Próxima revisão:** Após cada fase  
**Status:** PRONTO PARA IMPLEMENTAÇÃO