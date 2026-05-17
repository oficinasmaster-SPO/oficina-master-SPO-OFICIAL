# 📦 FASE 1 - FUNDAÇÃO: Sistema de Recorrência

**Status:** ✅ Implementado  
**Data:** 2026-05-17

---

## 🎯 OBJETIVO

Estruturar banco de dados e backend functions para suportar lançamentos recorrentes no DRE.

---

## ✅ ENTREGÁVEIS

### 1. **Entity `DRELancamento` Atualizada**

**Novos campos:**
```json
{
  "frequencia": "unico"|"mensal"|"quinzenal"|"semanal"|"anual",
  "recorrencia_id": "uuid-que-agrupa-todos",
  "data_inicio": "2026-01-01",
  "data_fim": "2026-12-31",
  "numero_parcelas": 12,
  "parcela_atual": 5
}
```

**Exemplo:**
```
Aluguel R$ 5.000/mês (Jan-Dez 2026)
├─ Jan: parcela 1/12, recorrencia_id: abc-123
├─ Fev: parcela 2/12, recorrencia_id: abc-123
├─ Mar: parcela 3/12, recorrencia_id: abc-123
...
└─ Dez: parcela 12/12, recorrencia_id: abc-123
```

---

### 2. **Backend Function: `criarLancamentoRecorrente`**

**Input:**
```json
{
  "workshop_id": "xyz",
  "mes_inicio": "2026-01",
  "tipo": "despesa",
  "categoria": "operacional",
  "descricao": "Aluguel",
  "valor": 5000,
  "frequencia": "mensal",
  "numero_parcelas": 12,
  "data_inicio": "2026-01-01",
  "data_fim": "2026-12-31"
}
```

**Output:**
```json
{
  "success": true,
  "recorrencia_id": "abc-123-def",
  "total_criado": 12,
  "lancamentos": [
    {"id": "1", "mes": "2026-01", "parcela": 1},
    {"id": "2", "mes": "2026-02", "parcela": 2},
    ...
  ]
}
```

**Lógica:**
1. Gera `recorrencia_id` único (UUID)
2. Calcula períodos baseado na frequência
3. Cria N registros (1 por mês/semana/etc)
4. Todos com mesmo `recorrencia_id`
5. Marca `parcela_atual: 1, 2, 3...N`

---

### 3. **Backend Function: `editarRecorrencia`**

**Input:**
```json
{
  "recorrencia_id": "abc-123",
  "lancamento_id": "5",
  "modo_edicao": "futuro",
  "dados_atualizados": {
    "valor": 5500
  }
}
```

**Modos de Edição:**
- `este_mes`: Atualiza apenas 1 registro
- `futuro`: Atualiza deste mês em diante
- `todos`: Atualiza toda a série

**Output:**
```json
{
  "success": true,
  "total_atualizado": 8,
  "modo": "futuro",
  "lancamentos": [...],
  "mensagem": "8 lançamento(s) atualizado(s)!"
}
```

---

### 4. **Backend Function: `excluirRecorrencia`**

**Input:**
```json
{
  "recorrencia_id": "abc-123",
  "lancamento_id": "5",
  "modo_exclusao": "todos"
}
```

**Modos de Exclusão:**
- `este_mes`: Exclui apenas 1 registro
- `futuro`: Exclui deste mês em diante
- `todos`: Exclui série completa

**Output:**
```json
{
  "success": true,
  "total_excluido": 12,
  "modo": "todos",
  "mensagem": "12 lançamento(s) excluído(s)!"
}
```

---

## 📋 REGRAS DE NEGÓCIO

### Frequências Suportadas

| Frequência | Intervalo | Exemplo |
|------------|-----------|---------|
| `unico` | Uma vez | Bônus, evento único |
| `mensal` | 30 dias | Aluguel, salário |
| `quinzenal` | 15 dias | Pagamento quinzenal |
| `semanal` | 7 dias | Relatório semanal |
| `anual` | 365 dias | Taxa anual |

### Cálculo de Períodos

**Fórmula:**
```
Se frequency = "mensal":
  Mês 1: data_inicio
  Mês 2: data_inicio + 1 mês
  Mês 3: data_inicio + 2 meses
  ...
  Até: numero_parcelas OU data_fim
```

**Limites:**
- Máximo: 60 períodos (5 anos de lançamentos mensais)
- Mínimo: 1 período

---

## 🔧 COMO USAR

### Criar Lançamento Recorrente

```javascript
const response = await base44.functions.invoke('criarLancamentoRecorrente', {
  workshop_id: user.data.workshop_id,
  mes_inicio: "2026-01",
  tipo: "despesa",
  categoria: "operacional",
  descricao: "Aluguel da loja",
  valor: 5000,
  frequencia: "mensal",
  numero_parcelas: 12,
  data_inicio: "2026-01-01",
  data_fim: "2026-12-31"
});

console.log(response.data);
// → 12 lançamentos criados!
```

### Editar Recorrência

```javascript
// Aumentar aluguel de R$ 5.000 → R$ 5.500 a partir de Julho
await base44.functions.invoke('editarRecorrencia', {
  recorrencia_id: "abc-123",
  lancamento_id: "6", // Julho
  modo_edicao: "futuro",
  dados_atualizados: {
    valor: 5500
  }
});
// → Julho a Dezembro atualizados
```

### Excluir Recorrência

```javascript
// Cancelar contrato em Setembro
await base44.functions.invoke('excluirRecorrencia', {
  recorrencia_id: "abc-123",
  lancamento_id: "9", // Setembro
  modo_exclusao: "futuro"
});
// → Setembro a Dezembro excluídos
```

---

## 🧪 TESTES

### Teste 1: Criar recorrência mensal (12 meses)

```bash
curl -X POST https://[app].base44.app/functions/criarLancamentoRecorrente \
  -H "Content-Type: application/json" \
  -d '{
    "workshop_id": "test-123",
    "tipo": "despesa",
    "categoria": "operacional",
    "descricao": "Teste Aluguel",
    "valor": 1000,
    "frequencia": "mensal",
    "numero_parcelas": 12,
    "data_inicio": "2026-01-01",
    "data_fim": "2026-12-31"
  }'
```

**Esperado:**
- ✅ 12 lançamentos criados
- ✅ Todos com mesmo `recorrencia_id`
- ✅ `parcela_atual: 1, 2, 3...12`

---

### Teste 2: Editar recorrência (modo: futuro)

```bash
curl -X POST https://[app].base44.app/functions/editarRecorrencia \
  -H "Content-Type: application/json" \
  -d '{
    "recorrencia_id": "abc-123",
    "lancamento_id": "6",
    "modo_edicao": "futuro",
    "dados_atualizados": {"valor": 1200}
  }'
```

**Esperado:**
- ✅ Parcelas 6-12 atualizadas para R$ 1.200
- ✅ Parcelas 1-5 mantêm R$ 1.000

---

### Teste 3: Excluir recorrência (modo: todos)

```bash
curl -X POST https://[app].base44.app/functions/excluirRecorrencia \
  -H "Content-Type: application/json" \
  -d '{
    "recorrencia_id": "abc-123",
    "modo_exclusao": "todos"
  }'
```

**Esperado:**
- ✅ 12 lançamentos excluídos
- ✅ Nenhum registro com `recorrencia_id: abc-123`

---

## 📊 PRÓXIMOS PASSOS (FASE 2)

1. ✅ **UI Component: `FrequenciaSelector`**
2. ✅ **UI Component: `ConfiguracaoRecorrencia`**
3. ✅ **Integrar no `ModalNovoLancamento`**
4. ✅ **UI para editar/excluir recorrências**

---

## 🎯 CRITÉRIOS DE ACEITE

- ✅ Entity `DRELancamento` com campos de recorrência
- ✅ Function `criarLancamentoRecorrente` cria N registros
- ✅ Function `editarRecorrencia` atualiza múltiplos registros
- ✅ Function `excluirRecorrencia` exclui múltiplos registros
- ✅ Testes manuais passing

---

**FASE 1 CONCLUÍDA!** 🚀  
Próximo: **FASE 2 - UI LANÇAMENTOS**