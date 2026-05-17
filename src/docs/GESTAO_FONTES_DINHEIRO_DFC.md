# 💰 Gestão de Fontes de Dinheiro no DFC

**Implementado:** 2026-05-17  
**Status:** ✅ Funcionalidade Completa

---

## 📋 VISÃO GERAL

O DFC agora permite **gerenciar de onde vem e para onde vai o dinheiro** da sua oficina, com rastreabilidade completa por fonte:

- 🏦 **Banco** (conta corrente, poupança, aplicações)
- 💳 **Máquina Cartão** (recebíveis de cartão de crédito/débito)
- 💵 **Dinheiro em Caixa** (dinheiro físico na gaveta)

---

## 🎯 FUNCIONALIDADES IMPLEMENTADAS

### 1️⃣ **Saldo Inicial Detalhado**

**Onde:** Card "Saldo Inicial do Mês" → botão 👁️ (olho)

**O que faz:**
- Abre modal com 3 campos separados (banco, máquina, caixa)
- Calcula automaticamente o total geral
- Salva o detalhamento no banco de dados

**Exemplo de uso:**
```
Saldo Inicial: R$ 15.000
├─ Banco: R$ 8.000
├─ Máquina Cartão: R$ 5.000
└─ Caixa: R$ 2.000
```

---

### 2️⃣ **Seleção de Fonte de Saída**

**Onde:** Modal "Novo Lançamento Manual" → ao criar saída de caixa

**O que faz:**
- Para **lançamentos do tipo "Saída"**, mostra seletor com 3 opções
- Usuário marca checkbox indicando de onde saiu o dinheiro
- O sistema registra `fonte_saida` no lançamento

**Exemplo de uso:**
```
Nova Saída: R$ 500 (Pagamento de Fornecedor)
Fonte: [✓] Banco  [ ] Máquina  [ ] Caixa
→ Subtrai R$ 500 do saldo do Banco
```

---

## 💾 ESTRUTURA DE DADOS

### Entity: `DFCLancamento`

**Novos campos:**

```json
{
  "saldo_inicial": 15000,
  "detalhes": {
    "banco": 8000,
    "maquina_cartao": 5000,
    "caixa": 2000
  }
}
```

**Para lançamentos de saída:**

```json
{
  "grupo": "operacional",
  "tipo": "saida",
  "valor": 500,
  "fonte_saida": "banco"  // ← NOVO CAMPO
}
```

---

## 🖥️ INTERFACE DO USUÁRIO

### Modal de Saldo Inicial Detalhado

**Componente:** `ModalSaldoInicialDetalhado.jsx`

**Layout:**
- 3 cards coloridos (azul=banco, verde=máquina, âmbar=caixa)
- Campo de valor em cada card
- Total geral calculado automaticamente
- Botão "Salvar Saldo Detalhado"

### Seletor de Fonte de Saída

**Componente:** `FonteSaidaSelector.jsx`

**Layout:**
- 3 opções com checkboxes e ícones
- Design responsivo (1 coluna mobile, 3 colunas desktop)
- Highlight visual na opção selecionada
- Apenas exibido para lançamentos do tipo **Saída**

---

## 🔄 FLUXO DE USO

### Cenário 1: Configurar Saldo Inicial

1. Abrir DFC → selecionar mês
2. Card "Saldo Inicial" → clicar botão 👁️
3. Preencher valores:
   - Banco: R$ 10.000
   - Máquina: R$ 3.000
   - Caixa: R$ 1.000
4. Clicar "Salvar"
5. ✅ Total: R$ 14.000 registrado

---

### Cenário 2: Registrar Saída de Dinheiro

1. DFC → Seção Operacional → "Adicionar lançamento manual"
2. Preencher:
   - Tipo: **Saída**
   - Descrição: "Pagamento Fornecedor"
   - Valor: R$ 800
3. **Seletor de Fonte** aparece:
   - Marcar: ☑️ Banco
4. Salvar
5. ✅ Lançamento registrado com `fonte_saida: "banco"`

---

### Cenário 3: Visualizar Saldo por Fonte

1. DFC → Saldo Inicial → botão 👁️
2. Modal mostra detalhamento atual
3. ✅ Você vê quanto tem em cada fonte

---

## 📊 RELATÓRIOS FUTUROS (SUGESTÃO)

Com os dados de `fonte_saida`, você poderá criar:

- **Extrato por Fonte**: Mostrar movimentação separada de banco, máquina e caixa
- **Saldo Atualizado por Fonte**: `saldo_inicial.detalhes - somatório(saídas por fonte)`
- **Gráfico de Composição**: Pizza mostrando % do dinheiro em cada fonte

---

## 🛠️ COMPONENTES CRIADOS

| Arquivo | Responsabilidade |
|---------|------------------|
| `components/dfc/ModalSaldoInicialDetalhado.jsx` | Modal de detalhamento do saldo inicial |
| `components/dfc/FonteSaidaSelector.jsx` | Seletor visual de fonte de saída |
| `entities/DFCLancamento.json` | Schema atualizado com `detalhes` e `fonte_saida` |

---

## 🔧 INTEGRAÇÃO NO DFC

**Arquivo:** `components/dre/DFCTab.jsx`

**Mudanças:**
1. Import dos novos componentes
2. Estado `modalSaldoDetalhadoAberto`
3. Botão 👁️ no card de Saldo Inicial
4. Renderização do modal
5. Campo `fonte_saida` no form de lançamentos

---

## ✅ PRONTO PARA USO!

A funcionalidade está **completa e funcional**. Agora você pode:

1. ✅ Detalhar saldo inicial por fonte
2. ✅ Selecionar origem do dinheiro em cada saída
3. ✅ Rastrear de onde saiu o dinheiro
4. ✅ Visualizar composição do saldo inicial

**Próximos passos sugeridos:**
- Criar relatório de "Extrato por Fonte"
- Calcular saldo atualizado por fonte dinamicamente
- Adicionar filtros por fonte na visualização

---

**Dúvidas?** Consulte a documentação ou peça suporte! 🚀