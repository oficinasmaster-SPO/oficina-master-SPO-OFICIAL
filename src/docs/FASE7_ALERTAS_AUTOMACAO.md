# 🚨 FASE 7 - ALERTAS E AUTOMAÇÃO

**Status:** ✅ Implementado  
**Data:** 2026-05-17

---

## 🎯 OBJETIVO

Notificações proativas para desvios orçamentários e recorrências vencendo.

---

## ✅ ENTREGÁVEIS

### 7.1 BACKEND FUNCTION: CHECKMETASACUMULADO

**Arquivo:** `functions/checkMetasAcumulado.js`

**Trigger:** Mensal (dia 1, 09:00)

**Input:**
```json
{
  "workshop_id": "xyz",
  "mes_referencia": "2026-05"
}
```

**Lógica:**
1. Busca todas as metas anuais da oficina
2. Para cada meta:
   - Calcula meta acumulada esperada: `(meta_anual / 12) * mês_atual`
   - Soma realizados do DRE até o mês atual
   - Calcula % de atingimento: `(realizado / esperado) * 100`
3. Se % < 80%:
   - Cria notificação no sistema
   - Envia email para o usuário admin

**Output:**
```json
{
  "success": true,
  "message": "Verificação concluída. 2 alerta(s) gerado(s)",
  "alertas_gerados": 2,
  "alertas": [
    {
      "tipo": "desvio_orcamentario",
      "titulo": "Alerta: Aluguel abaixo da meta",
      "mensagem": "O item 'Aluguel' está com 65.5% da meta acumulada...",
      "percentual_atingimento": 65.5,
      "valor_realizado": 3900,
      "valor_esperado": 6000
    }
  ]
}
```

**Ações:**
- ✅ Cria `Notification` entity
- ✅ Envia email via `SendEmail` integration
- ✅ Retorna lista de alertas gerados

---

### 7.2 BACKEND FUNCTION: ALERTARECORRENCIAVENCENDO

**Arquivo:** `functions/alertaRecorrenciaVencendo.js`

**Trigger:** Diário (08:00)

**Lógica:**
1. Busca todas as recorrências ativas (`recorrencia_ativa: true`)
2. Agrupa por `recorrencia_id`
3. Para cada recorrência:
   - Verifica se `recorrencia_data_fim` está entre hoje e +30 dias
   - Calcula dias restantes
   - Identifica usuário criador
4. Se vencendo em ≤30 dias:
   - Cria notificação
   - Envia email

**Output:**
```json
{
  "success": true,
  "message": "Verificação concluída. 1 alerta(s) gerado(s)",
  "alertas_gerados": 1,
  "alertas": [
    {
      "tipo": "recorrencia_vencendo",
      "recorrencia_id": "abc123",
      "descricao": "Aluguel",
      "data_fim": "2026-06-15",
      "dias_restantes": 29
    }
  ]
}
```

**Email enviado:**
```
Assunto: Recorrência Vencendo em 29 dias - Aluguel

⏰ Recorrência Vencendo
Descrição: Aluguel
Categoria: operacional
Valor: R$ 5.000,00
Data de Término: 15/06/2026
Dias Restantes: 29 dias

Se desejar renovar, crie um novo lançamento ou estenda a data.
```

---

### 7.3 AUTOMATION: ALERTADESVIOORCAMENTARIO

**Arquivo:** `functions/alertaDesvioOrcamentario.js`

**Tipo:** Entity Automation (BudgetMeta update)

**Trigger:** Quando `BudgetMeta` é atualizada

**Condição:**
- `changed_fields` contém `meta_fixa_rs`
- `data.meta_fixa_rs > 0`

**Lógica:**
1. Calcula meta: `meta_percentual` ou `meta_fixa_rs`
2. Busca realizados do DRE (mesma categoria/item)
3. Calcula %: `(realizado / meta) * 100`
4. Se % < 80%:
   - Cria notificação
   - Envia email para responsável

**Exemplo de Notificação:**
```
🚨 Desvio Orçamentário: Aluguel
O item "Aluguel" está com apenas 65.5% da meta 
(R$ 3.900,00 realizado vs R$ 6.000,00 esperado)
```

---

## ⚙️ AUTOMAÇÕES CRIADAS

### 1. Check Metas Acumulado (Dia 1)

**ID:** `6a0a26a14344403d3376b069`

**Configuração:**
- Tipo: Scheduled
- Função: `checkMetasAcumulado`
- Schedule: Mensal, dia 1, 09:00 UTC (12:00 Brasília)
- Ativa: ✅

**Descrição:** No dia 1 de cada mês, compara realizado acumulado vs meta acumulada e gera alertas se < 80%

---

### 2. Alerta Recorrência Vencendo (Diário)

**ID:** `6a0a26a14344403d3376b06a`

**Configuração:**
- Tipo: Scheduled
- Função: `alertaRecorrenciaVencendo`
- Schedule: Diário, 08:00 UTC (11:00 Brasília)
- Ativa: ✅

**Descrição:** Diariamente, identifica recorrências terminando em 30 dias e notifica usuários

---

### 3. Alerta Desvio Orçamentário

**ID:** `6a0a26a14344403d3376b06b`

**Configuração:**
- Tipo: Entity
- Entity: `BudgetMeta`
- Eventos: `update`
- Função: `alertaDesvioOrcamentario`
- Trigger Conditions:
  ```json
  {
    "logic": "and",
    "conditions": [
      {"field": "changed_fields", "operator": "contains", "value": "meta_fixa_rs"},
      {"field": "data.meta_fixa_rs", "operator": "gt", "value": 0}
    ]
  }
  ```
- Ativa: ✅

**Descrição:** Quando BudgetMeta é atualizada e realizado < 80% da meta, envia alerta

---

## 📊 FLUXOS

### Fluxo 1: Check Mensal de Metas

```
Dia 1, 09:00 UTC
   ↓
Automation dispara checkMetasAcumulado
   ↓
Function busca metas anuais + realizados DRE
   ↓
Calcula % atingimento acumulado
   ↓
Se < 80% → Cria Notificação + Envia Email
   ↓
Retorna: { alertas_gerados: N }
```

### Fluxo 2: Alerta de Recorrência

```
Diário, 08:00 UTC
   ↓
Automation dispara alertaRecorrenciaVencendo
   ↓
Function busca recorrências ativas
   ↓
Filtra: data_fim entre hoje e +30 dias
   ↓
Para cada uma: Notificação + Email
   ↓
Retorna: { alertas_gerados: N }
```

### Fluxo 3: Desvio em Tempo Real

```
Usuário atualiza BudgetMeta
   ↓
Entity Automation detecta update
   ↓
alertaDesvioOrcamentario calcula %
   ↓
Se < 80% → Notificação + Email
   ↓
Log: { alerta: {...} }
```

---

## 🧪 TESTES

### Teste 1: Check Metas Acumulado

```bash
# Invocar function manualmente
base44.functions.invoke('checkMetasAcumulado', {
  workshop_id: 'xyz',
  mes_referencia: '2026-05'
})

# Verificar:
# ✅ Notificações criadas no DB
# ✅ Emails enviados
# ✅ alertas_gerados > 0 se aplicável
```

### Teste 2: Alerta Recorrência

```bash
# Criar recorrência terminando em 25 dias
base44.entities.DRELancamento.create({
  descricao: 'Teste Recorrência',
  recorrencia_ativa: true,
  recorrencia_data_fim: '2026-06-10' // 25 dias a partir de hoje
})

# Aguardar próximo run (08:00 UTC) ou invocar manualmente
base44.functions.invoke('alertaRecorrenciaVencendo', {})

# Verificar:
# ✅ Notificação criada para criador
# ✅ Email enviado
```

### Teste 3: Desvio Orçamentário

```bash
# Criar meta com realizado baixo
base44.entities.BudgetMeta.create({
  item: 'Aluguel',
  meta_fixa_rs: 5000,
  ...
})

# Atualizar (trigger da automation)
base44.entities.BudgetMeta.update(id, {
  meta_fixa_rs: 5000
})

# Verificar:
# ✅ Automation rodou
# ✅ Notificação criada se realizado < 80%
```

---

## 📧 MODELOS DE EMAIL

### Email 1: Desvio Orçamentário

```
Assunto: Alerta de Desvio Orçamentário - Aluguel

⚠️ Alerta de Desvio Orçamentário

Item: Aluguel
Categoria: operacional
Período: Acumulado até 05/2026
─────────────────────────────
Meta Acumulada: R$ 6.000,00
Realizado: R$ 3.900,00
Percentual: 65.5%
─────────────────────────────
⚠️ Atenção: O realizado está abaixo de 80% da meta esperada.

Recomendamos revisar as ações para este item e tomar medidas corretivas.
```

### Email 2: Recorrência Vencendo

```
Assunto: Recorrência Vencendo em 29 dias - Aluguel

⏰ Recorrência Vencendo

Descrição: Aluguel
Categoria: operacional
Valor: R$ 5.000,00
─────────────────────────────
Data de Término: 15/06/2026
Dias Restantes: 29 dias
─────────────────────────────
Se desejar renovar esta recorrência, crie um novo lançamento ou estenda a data de término.
```

---

## ✅ CRITÉRIOS DE ACEITE

- ✅ Function `checkMetasAcumulado` calcula acumulado corretamente
- ✅ Function `alertaRecorrenciaVencendo` identifica recorrências ≤30 dias
- ✅ Function `alertaDesvioOrcamentario` detecta desvios < 80%
- ✅ Automação scheduled mensal roda dia 1
- ✅ Automação scheduled diária roda 08:00
- ✅ Automação entity trigger em BudgetMeta update
- ✅ Notificações criadas no sistema
- ✅ Emails enviados via integration
- ✅ Logs e retornos adequados

---

## 🎯 PRÓXIMOS PASSOS

**Fase 8 (Opcional):**
- Dashboard de alertas
- Configuração de thresholds personalizados
- Alertas via WhatsApp/SMS
- Escalonamento de alertas não atendidos

---

**FASE 7 CONCLUÍDA!** 🚀  
**Status do Projeto:** 7 de 7 fases implementadas (~12 semanas / 3 meses)