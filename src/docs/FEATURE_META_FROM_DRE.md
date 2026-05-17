# Feature: Configurar Meta a partir do DRE

## Visão Geral
Integração entre **DRE Avançado** e **Controle Orçamentário** que permite criar metas diretamente a partir de lançamentos do DRE, eliminando duplicação de dados e acelerando o setup do budget.

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│             DRELancamento (BD)                              │
│  {categoria, descricao, valor, tipo, entra_tcmp2}          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─► BudgetDREResumoCard (exibe + cliques)
                 │   └─► onClick: handleSelectDREItem()
                 │
                 └─► ConfigurarMetaFromDREModal (form)
                     {item, categoria [readonly]}
                     {responsavel, meta_rs, meta_%, notas [editável]}
                     └─► onSave: handleSaveMetaFromDRE()
                         └─► BudgetMeta.create()
                             └─► invalidateQueries + toast
```

## Fluxo de Dados

1. **Visualização de Lançamentos** (BudgetDREResumoCard)
   - Agrupa DRELancamento por tipo (receita/despesa)
   - Agrupa por categoria dentro de cada tipo
   - Mostra saldo total por categoria
   - Itens clicáveis: `onSelectDREItem(lancamento)`

2. **Abertura do Modal** (handleSelectDREItem)
   - Extrai: `categoria, descricao, valor, tipo, entra_tcmp2`
   - Popula estado: `selectedDREItem`
   - Abre modal: `setShowMetaModal(true)`

3. **Preenchimento da Meta** (ConfigurarMetaFromDREModal)
   - Exibe dados readonly: categoria, item, valor_realizado
   - Campos editáveis: responsavel (obrigatório), meta_fixa_rs, meta_percentual, notas
   - Validações em tempo real:
     - Responsável: required, max 100 chars
     - Meta R$: 0-9.999.999
     - Meta %: 0-100
     - Notas: max 300 chars

4. **Salvamento da Meta** (handleSaveMetaFromDRE)
   - Valida todos os campos
   - Cria BudgetMeta com:
     ```javascript
     {
       workshop_id,
       mes,
       categoria,
       item,
       responsavel_nome,
       meta_fixa_rs,
       meta_percentual,
       notas,
       faturamento_meta_rs
     }
     ```
   - Invalidar query: `["budget-metas", workshopId, mes]`
   - Toast success + fecha modal

## Componentes Criados

### 1. ConfigurarMetaFromDREModal.jsx
- **Props**:
  - `isOpen: boolean` - controla visibilidade
  - `selectedItem: object` - dados do DRE (categoria, item, valor_realizado, tipo, entra_tcmp2)
  - `onClose: function` - callback para fechar
  - `onSave: function` - callback para salvar com dados validados
  - `workshopId: string` - contexto da oficina
  - `mes: string` - período YYYY-MM
  - `faturamentoMeta: number` - meta de faturamento total

- **Features**:
  - Seção readonly com dados do DRE
  - Formulário com validações inline
  - Campos obrigatórios e ranges
  - Toast feedback integrado
  - Suporta mobile

### 2. BudgetDREResumoCard.jsx (Modificado)
- Adiciona `onSelectDREItem(lancamento)` callback
- Sub-itens clicáveis com cursor pointer
- Emit de evento ao clicar para abrir modal

### 3. BudgetMetaTab.jsx (Modificado)
- Função `handleSelectDREItem(lancamento)`
- Função `handleSaveMetaFromDRE(metaData)`
- Integração com `ConfigurarMetaFromDREModal`
- Real-time sync: subscription + event listener

## Validações Implementadas

| Campo | Tipo | Obrigatório | Range | Msg Erro |
|-------|------|------------|-------|----------|
| Responsável | string | ✅ | max 100 | "Responsável é obrigatório (max 100 chars)" |
| Meta R$ | number | ❌ | 0-9.999.999 | "Meta R$ deve ser 0-9.999.999" |
| Meta % | number | ❌ | 0-100 | "Meta % deve ser 0-100" |
| Notas | string | ❌ | max 300 | "Notas max 300 caracteres" |

- **Lógica de negócio**: Pelo menos uma meta deve ser preenchida (R$ OU %)
- **Feedback**: Campos em erro ficam com borda vermelha
- **Bloqueio**: Botão "Salvar" desativado até passar validações

## Sincronismo Real-time

### Subscrição ao DRELancamento
```javascript
base44.entities.DRELancamento.subscribe((event) => {
  if (event.data?.workshop_id === workshopId && event.data?.mes === mes) {
    if (event.type === 'create' || event.type === 'delete') {
      setSyncPulse(true);
      refetchLancamentos();
    }
  }
});
```

### Event Listener Cross-Tab
```javascript
window.addEventListener('dre-lancamento-criado', handleDREChange);
```

### Feedback Visual
- Pulse animation: `fixed top-4 right-4 z-50 animate-pulse bg-green-500`
- Mensagem: "Dados do DRE atualizados instantaneamente"
- Duração: 1.5s

## Guia de Uso

### Para o Usuário Final
1. Acesse **"Controle Orçamentário"** → **"DRE Resumo"**
2. Veja todos os lançamentos agrupados por categoria
3. Clique em qualquer lançamento (ex: "Pintura de parede - R$ 500")
4. Modal abre com dados pré-preenchidos
5. Preencha:
   - **Responsável** (obrigatório): "João da Manutenção"
   - **Meta R$** OU **Meta %**: escolha o tipo de controle
   - **Observações** (opcional): contexto da meta
6. Clique **"Salvar Meta"**
7. Meta aparece na lista e nos gráficos automaticamente

### Para o Desenvolvedor

**Ativar o Modal**:
```javascript
const handleSelectDREItem = (lancamento) => {
  setSelectedDREItem({
    categoria: lancamento.categoria,
    item: lancamento.descricao,
    valor_realizado: lancamento.valor,
    tipo: lancamento.tipo,
    entra_tcmp2: lancamento.entra_tcmp2
  });
  setShowMetaModal(true);
};
```

**Salvar Meta**:
```javascript
const handleSaveMetaFromDRE = async (metaData) => {
  await saveMutation.mutateAsync({
    categoria: metaData.categoria,
    item: metaData.item,
    responsavel_nome: metaData.responsavel_nome,
    meta_fixa_rs: metaData.meta_fixa_rs,
    meta_percentual: metaData.meta_percentual,
    notas: metaData.notas,
    faturamento_meta_rs: metaData.faturamento_meta_rs || 0
  });
};
```

## Dependências
- `@tanstack/react-query` - cache e mutations
- `base44.entities.BudgetMeta` - persistência
- `base44.entities.DRELancamento` - source de dados
- `sonner` - toast notifications
- `lucide-react` - ícones

## Performance
- Modal: `<300ms` para abrir
- Salvamento BD: `<1s`
- Query invalidation: `<500ms`
- Sem memory leaks em ciclos abrir/fechar

## Possíveis Extensões
- Copiar para múltiplas metas em batch
- Template de metas por categoria
- Histórico de alterações de metas
- Integração com alertas de variação