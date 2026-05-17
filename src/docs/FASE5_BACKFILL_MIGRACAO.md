# 📊 FASE 5 - BACKFILL E MIGRAÇÃO

**Status:** ✅ Implementado  
**Data:** 2026-05-17

---

## 🎯 OBJETIVO

Migrar dados legados para a nova estrutura de recorrências e metas anuais.

---

## ✅ ENTREGÁVEIS

### 1. **Function: `backfillRecorrencias`**

**Propósito:** Identifica e marca lançamentos recorrentes automaticamente

**Input:**
```json
{
  "workshop_id": "xyz",
  "ano": 2026,
  "dry_run": true
}
```

**Output:**
```json
{
  "dry_run": true,
  "total_lancamentos": 156,
  "grupos_analisados": 42,
  "recorrencias_identificadas": [
    {
      "descricao": "Aluguel",
      "categoria": "operacional",
      "tipo": "despesa",
      "meses": ["2026-01", "2026-02", "2026-03"],
      "qtd_meses": 3,
      "valor_medio": 2500,
      "variacao": 0.02,
      "consecutivos": true,
      "lancamentos_ids": ["id1", "id2", "id3"],
      "acao": "SERIA_ATUALIZADO"
    }
  ],
  "atualizacoes_pendentes": 48
}
```

**Critérios para identificar recorrência:**
- ✅ Mesma descrição + categoria + tipo
- ✅ Pelo menos 2 meses
- ✅ Variação de valor <= 15%
- ✅ Preferência: meses consecutivos

**Fluxo:**
1. **Dry Run (recomendado primeiro):**
   ```json
   { "dry_run": true }
   ```
   - Apenas identifica, não altera nada
   - Mostra preview do que será migrado

2. **Execução:**
   ```json
   { "dry_run": false }
   ```
   - Aplica mudanças
   - Adiciona `recorrencia_id` e `recorrente: true`

---

### 2. **Function: `migrarMetasAnuais`**

**Propósito:** Soma metas mensais e cria BudgetMeta anual

**Input:**
```json
{
  "workshop_id": "xyz",
  "ano": 2026,
  "dry_run": true
}
```

**Output:**
```json
{
  "dry_run": true,
  "total_metas_mensais": 48,
  "itens_analisados": 12,
  "metas_anuais_preview": [
    {
      "item": "Aluguel",
      "categoria": "operacional",
      "tipo": "despesa",
      "meta_anual_rs": 30000,
      "meta_mensal_media": 2500,
      "qtd_meses_com_meta": 12,
      "meta_acumulada_por_mes": {
        "2026-01": 2500,
        "2026-02": 5000,
        "2026-03": 7500,
        ...
      },
      "acao": "SERIA_CRIADA"
    }
  ]
}
```

**Lógica:**
1. Busca todas as BudgetMeta mensais do ano
2. Agrupa por item + categoria + tipo
3. Soma as 12 metas mensais
4. Cria BudgetMeta anual com:
   - `mes: "2026-ANUAL"`
   - `periodicidade: "anual"`
   - `meta_anual_rs: <soma>`
   - `meta_acumulada_mes: {objeto}`

**Fluxo:**
1. **Dry Run:** Preview sem criar
2. **Execução:** Cria metas anuais

---

### 3. **Function: `validarIntegridadeMigracao`**

**Propósito:** Verifica integridade dos dados após migração

**Input:**
```json
{
  "workshop_id": "xyz",
  "ano": 2026
}
```

**Output:**
```json
{
  "timestamp": "2026-05-17T10:30:00Z",
  "dre": {
    "total_lancamentos": 156,
    "com_recorrencia": 48,
    "sem_recorrencia": 108,
    "inconsistencias": [
      {
        "tipo": "POSSIVEL_RECORRENCIA_NAO_MARCADA",
        "descricao": "Internet",
        "meses": 4,
        "valor_medio": 150,
        "severidade": "MEDIA"
      }
    ]
  },
  "budget": {
    "total_metas": 50,
    "metas_anuais": 12,
    "metas_mensais": 38,
    "inconsistencias": [
      {
        "tipo": "DIVERGENCIA_ANUAL_VS_MENSAIS",
        "item": "Marketing",
        "valor_anual": 50000,
        "soma_mensais": 48000,
        "diff_percentual": "4.17%",
        "severidade": "MEDIA"
      }
    ]
  },
  "resumo": {
    "status": "ATENCAO",
    "total_inconsistencias": 3,
    "recomendacoes": [
      "Executar backfillRecorrencias para marcar 2 possíveis recorrências",
      "Revisar 1 divergência entre metas anuais e mensais"
    ]
  }
}
```

**Validações:**
1. ✅ DRE: Identifica recorrências não marcadas
2. ✅ Budget: Compara anual vs soma das mensais
3. ✅ Budget: Verifica meses faltantes
4. ✅ Status: OK | ATENCAO | CRITICO

---

## 📊 FLUXO DE MIGRAÇÃO

### Passo 1: Backfill de Recorrências

```bash
# 1. Dry run (preview)
POST /functions/backfillRecorrencias
{
  "workshop_id": "xyz",
  "ano": 2026,
  "dry_run": true
}

# Revisa o preview...

# 2. Execução
POST /functions/backfillRecorrencias
{
  "workshop_id": "xyz",
  "ano": 2026,
  "dry_run": false
}
```

### Passo 2: Migrar Metas Anuais

```bash
# 1. Dry run (preview)
POST /functions/migrarMetasAnuais
{
  "workshop_id": "xyz",
  "ano": 2026,
  "dry_run": true
}

# Revisa o preview...

# 2. Execução
POST /functions/migrarMetasAnuais
{
  "workshop_id": "xyz",
  "ano": 2026,
  "dry_run": false
}
```

### Passo 3: Validar Integridade

```bash
POST /functions/validarIntegridadeMigracao
{
  "workshop_id": "xyz",
  "ano": 2026
}

# Revisa relatório de inconsistências
# Se tiver erros, corrige manualmente
```

---

## 🔍 EXEMPLOS DE INCONSISTÊNCIAS

### Tipo: `POSSIVEL_RECORRENCIA_NAO_MARCADA`

**Causa:** Lançamentos com mesma descrição em meses consecutivos mas sem `recorrencia_id`

**Solução:** Executar `backfillRecorrencias` com `dry_run: false`

---

### Tipo: `DIVERGENCIA_ANUAL_VS_MENSAIS`

**Causa:** Meta anual não bate com soma das mensais (> 5% diff)

**Exemplo:**
- Meta anual: R$ 50.000
- Soma mensais: R$ 48.000
- Diferença: 4.17%

**Solução:**
1. Verificar se há erro nas metas mensais
2. Ou atualizar meta anual manualmente

---

### Tipo: `MESES_FALTANTES`

**Causa:** Alguns meses sem BudgetMeta

**Exemplo:**
```json
{
  "tipo": "MESES_FALTANTES",
  "meses": ["07", "08"],
  "severidade": "BAIXA"
}
```

**Solução:** Criar metas faltantes manualmente ou validar se é intencional

---

## 📊 STATUS DO RELATÓRIO

| Status | Significado | Ação |
|--------|-------------|------|
| ✅ OK | Nenhuma inconsistência | Nenhuma ação necessária |
| ⚠️ ATENCAO | Inconsistências médias/baixas | Revisar recomendações |
| 🚨 CRITICO | Múltiplas inconsistências graves | Ação imediata necessária |

---

## 🧪 TESTES

### Teste 1: Backfill Dry Run

```bash
# Executar backfillRecorrencias (dry_run=true)
# Verificar:
#   ✅ Mostra recorrências identificadas
#   ✅ Não altera dados
#   ✅ Calcula valor médio e variação corretamente
```

### Teste 2: Backfill Execução

```bash
# Executar backfillRecorrencias (dry_run=false)
# Verificar:
#   ✅ Adiciona recorrencia_id nos lançamentos
#   ✅ Adiciona recorrente: true
#   ✅ Mesmo recorrencia_id para grupo
```

### Teste 3: Migrar Metas Dry Run

```bash
# Executar migrarMetasAnuais (dry_run=true)
# Verificar:
#   ✅ Soma metas mensais corretamente
#   ✅ Calcula meta acumulada por mês
#   ✅ Não cria registros
```

### Teste 4: Migrar Metas Execução

```bash
# Executar migrarMetasAnuais (dry_run=false)
# Verificar:
#   ✅ Cria BudgetMeta com mes="2026-ANUAL"
#   ✅ periodicidade="anual"
#   ✅ meta_anual_rs = soma das mensais
```

### Teste 5: Validar Integridade

```bash
# Executar validarIntegridadeMigracao
# Verificar:
#   ✅ Status correto (OK/ATENCAO/CRITICO)
#   ✅ Inconsistências listadas
#   ✅ Recomendações claras
```

---

## ⚠️ IMPORTANTE

### Ordem de Execução

1. ✅ **backfillRecorrencias** (dry_run=true)
2. ✅ **backfillRecorrencias** (dry_run=false)
3. ✅ **migrarMetasAnuais** (dry_run=true)
4. ✅ **migrarMetasAnuais** (dry_run=false)
5. ✅ **validarIntegridadeMigracao**

### Segurança

- ✅ Sempre executar **dry_run** primeiro
- ✅ Revisar preview antes de aplicar
- ✅ Validar integridade após migração
- ✅ Apenas admin pode executar

### Rollback

Se necessário reverter:
- Remover `recorrencia_id` manualmente via query
- Deletar BudgetMeta com `mes: "2026-ANUAL"`

---

## ✅ CRITÉRIOS DE ACEITE

- ✅ `backfillRecorrencias` identifica recorrências corretamente
- ✅ `backfillRecorrencias` marca lançamentos com dry_run=false
- ✅ `migrarMetasAnuais` soma metas mensais
- ✅ `migrarMetasAnuais` cria BudgetMeta anual
- ✅ `validarIntegridadeMigracao` detecta inconsistências
- ✅ `validarIntegridadeMigracao` retorna recomendações
- ✅ Todas functions apenas para admin

---

**FASE 5 CONCLUÍDA!** 🚀  
Próximo: **FASE 6 - RELATÓRIOS E PROJEÇÕES**