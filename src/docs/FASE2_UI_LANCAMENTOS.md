# 📅 FASE 2 - UI LANÇAMENTOS

**Status:** ✅ Implementado  
**Data:** 2026-05-17

---

## 🎯 OBJETIVO

Adicionar interface de frequência e configuração de recorrência nos modais de lançamento do DRE.

---

## ✅ ENTREGÁVEIS

### 1. **Componente: `FrequenciaSelector`** 🆕

**Arquivo:** `components/dre/FrequenciaSelector.jsx`

**Features:**
- Select com 5 opções: único, mensal, quinzenal, semanal, anual
- Descrição dinâmica abaixo do select
- Design simples e limpo

**Uso:**
```jsx
<FrequenciaSelector
  value={frequencia}
  onChange={setFrequencia}
/>
```

---

### 2. **Componente: `ConfiguracaoRecorrencia`** 🆕

**Arquivo:** `components/dre/ConfiguracaoRecorrencia.jsx`

**Features:**
- Campo data de início (obrigatório)
- Radio: "Número de parcelas" vs "Data final"
- Input numérico (1-60) para parcelas
- Date picker para data final
- Preview automático: "Serão criados 12 lançamentos de Jan a Dez"
- Só aparece quando `frequencia !== 'unico'`

**Uso:**
```jsx
<ConfiguracaoRecorrencia
  frequencia={frequencia}
  dataInicio={dataInicio}
  dataFim={dataFim}
  numeroParcelas={numeroParcelas}
  onChange={(updates) => {
    if (updates.data_inicio) setDataInicio(updates.data_inicio);
    if (updates.data_fim) setDataFim(updates.data_fim);
    if (updates.numero_parcelas) setNumeroParcelas(updates.numero_parcelas);
  }}
/>
```

---

### 3. **Atualização: `FormLancamento`** 🔧

**Arquivo:** `components/dre/DREAvancadoTab.jsx`

**Mudanças:**
1. ✅ Import dos novos componentes
2. ✅ Estados para frequência, data_inicio, data_fim, numero_parcelas
3. ✅ Lógica condicional:
   - Se `frequencia === 'unico'`: cria 1 registro normal
   - Se `frequencia !== 'unico'`: chama `criarLancamentoRecorrente`
4. ✅ Handler atualizado para usar backend function correta

**Exemplo:**
```javascript
// Lançamento recorrente
if (frequencia !== 'unico') {
  const response = await base44.functions.invoke('criarLancamentoRecorrente', {
    workshop_id: workshopId,
    mes_inicio: mes,
    tipo,
    categoria: catKey,
    valor: valorNum,
    frequencia,
    numero_parcelas: dataFim ? null : numeroParcelas,
    data_inicio: dataInicio,
    data_fim: dataFim
  });
  toast.success(response.data.mensagem);
} else {
  // Lançamento único normal
  await base44.entities.DRELancamento.create({...});
}
```

---

### 4. **Backend Function: `bulkDeleteLancamentos`** 🆕

**Arquivo:** `functions/bulkDeleteLancamentos.js`

**Input:**
```json
{
  "recorrencia_id": "abc-123"
}
// OU
{
  "lancamento_ids": ["id1", "id2", "id3"]
}
```

**Lógica:**
- Se `recorrencia_id`: busca todos e exclui
- Se `lancamento_ids`: exclui array específico
- Retorna count de excluídos + erros (se houver)

**Output:**
```json
{
  "success": true,
  "total_excluido": 12,
  "mensagem": "12 lançamento(s) excluído(s)!"
}
```

---

## 🖼️ FLUXO DO USUÁRIO

### Cenário 1: Lançamento Único (Comportamento Original)

1. Clicar "+ Despesa"
2. Preencher: categoria, descrição, valor
3. Frequência: "Único" (default)
4. Salvar
5. ✅ 1 registro criado

---

### Cenário 2: Lançamento Recorrente Mensal

1. Clicar "+ Despesa"
2. Preencher: categoria, descrição, valor
3. Frequência: **"Mensal"**
4. Configurar:
   - Data início: 01/01/2026
   - Término: "Número de parcelas" → 12
5. Preview: "💡 Serão criados 12 lançamentos de jan a dez"
6. Salvar
7. ✅ 12 registros criados (jan, fev, mar... dez)

---

### Cenário 3: Lançamento com Data Final

1. Clicar "+ Despesa"
2. Frequência: **"Mensal"**
3. Configurar:
   - Data início: 01/03/2026
   - Término: **"Data final específica"**
   - Data final: 31/08/2026
4. Preview: "💡 Serão criados 6 lançamentos de mar a ago"
5. Salvar
6. ✅ 6 registros criados

---

## 📋 REGRAS DE NEGÓCIO

### Validações

**Obrigatórios:**
- ✅ Categoria
- ✅ Subcategoria
- ✅ Descrição
- ✅ Valor (> 0)
- ✅ Data de início (se recorrência)

**Opcionais:**
- Data de vencimento
- Data de pagamento
- Número de parcelas OU data final

### Limites

| Campo | Mínimo | Máximo |
|-------|--------|--------|
| Número parcelas | 1 | 60 |
| Períodos criados | 1 | 60 |

---

## 🧪 TESTES

### Teste 1: Criar lançamento único

```
1. Abrir DRE Avançado
2. Clicar "+ Despesa"
3. Preencher dados básicos
4. Frequência: "Único"
5. Salvar
```

**Resultado esperado:**
- ✅ 1 registro no banco
- ✅ `frequencia: "unico"`
- ✅ `recorrencia_id: null`

---

### Teste 2: Criar recorrência mensal (12 meses)

```
1. Clicar "+ Despesa"
2. Preencher: Aluguel, R$ 5.000
3. Frequência: "Mensal"
4. Data início: 01/01/2026
5. Término: 12 parcelas
6. Salvar
```

**Resultado esperado:**
- ✅ 12 registros criados
- ✅ Todos com mesmo `recorrencia_id`
- ✅ `parcela_atual: 1, 2, 3...12`
- ✅ Mensagens: "12 lançamentos criados!"

---

### Teste 3: Criar recorrência com data final

```
1. Clicar "+ Receita"
2. Preencher: Venda, R$ 1.000
3. Frequência: "Mensal"
4. Data início: 01/03/2026
5. Término: "Data final" → 31/08/2026
6. Salvar
```

**Resultado esperado:**
- ✅ 6 registros (mar, abr, mai, jun, jul, ago)
- ✅ Preview mostrou "6 lançamentos"

---

### Teste 4: Excluir recorrência completa

```javascript
await base44.functions.invoke('bulkDeleteLancamentos', {
  recorrencia_id: "abc-123"
});
```

**Resultado esperado:**
- ✅ Todos os 12 registros excluídos
- ✅ `total_excluido: 12`

---

## 🎨 UI/UX

### Cores e Ícones

| Elemento | Cor | Ícone |
|----------|-----|-------|
| Frequência | Azul | `Repeat2` |
| Preview | Verde | `💡` |
| Data início | Azul | `Calendar` |
| Único | Cinza | - |

### Responsividade

- ✅ Mobile: 1 coluna
- ✅ Desktop: 2 colunas (data + valor)
- ✅ Preview: Alerta verde destacado

---

## 📊 PRÓXIMOS PASSOS (FASE 3)

1. ✅ **Filtro "Anual" no DRE/DFC**
2. ✅ **Backend: `getDREDataAnual`**
3. ✅ **Backend: `getDFCDataAnual`**
4. ✅ **UI: Consolidado anual**

---

## 🎯 CRITÉRIOS DE ACEITE

- ✅ Componente `FrequenciaSelector` funcional
- ✅ Componente `ConfiguracaoRecorrencia` funcional
- ✅ Preview calcula corretamente períodos
- ✅ Form chama `criarLancamentoRecorrente` quando tem frequência
- ✅ Form chama `create` normal quando é único
- ✅ Mensagens de sucesso mostram total criado
- ✅ `bulkDeleteLancamentos` funcional

---

**FASE 2 CONCLUÍDA!** 🚀  
Próximo: **FASE 3 - VISÃO ANUAL**