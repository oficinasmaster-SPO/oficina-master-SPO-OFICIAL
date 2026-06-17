# 📋 Tour Guiado — DRE & TCMP² — Documentação Definitiva
> **Versão:** 2.0 — Corrigida e validada contra o código-fonte  
> **Escopo:** DRETCMP2, DREAvancadoTab, DFCTab, BudgetMetaTab, FecharMesModal  
> **Audiência:** Usuário novo que nunca usou o módulo financeiro

---

## ⚠️ ERRATA DA VERSÃO 1.0 — Correções Críticas

### 1. R70/I30 — Duas fórmulas coexistem (não é erro, é perspectiva)

| Onde | Fórmula | Código-fonte |
|---|---|---|
| **DRE Principal** (DRETCMP2, aba Peças) | `R70 = (Receita − Peças Aplicadas − Peças Estoque) / Receita` | `calculateDRE()` em DRETCMP2 |
| **DRE Avançado** (PainelAnalise) | `R70 = (Receita Total − Receita de Peças Aplicadas) / Receita Total` | `PainelAnalise` em DREAvancadoTab |

**Por que diferem:** O DRE Principal considera também as peças compradas para estoque (que consomem caixa), enquanto o DRE Avançado mede apenas a proporção de receita que vem de peças vs serviços. **São perspectivas complementares, não erro.** O tour deve alertar o usuário sobre essa diferença para evitar confusão.

> 💡 **Explicação para o usuário no tour:** "Os dois R70 são complementares. O da aba Peças mede o impacto das peças no caixa total. O do DRE Avançado mede de onde vem sua receita (produto vs serviço). Se divergirem, é normal."

### 2. Fechar Mês — isLocked está hardcoded como `false` em DRETCMP2

**Status do código (confirmado):**
```jsx
// DRETCMP2.jsx linha 1139-1143
<FecharMesModal
  workshopId={workshop.id}
  mes={selectedMonth}
  isLocked={false}   // ← hardcoded, nunca lê o estado real do backend
/>
```

**O que o `FecharMesModal` faz internamente (confirmado via código):**
- Chama o backend `fecharMes` com `action: 'fechar'` ou `action: 'abrir'`
- Exige justificativa obrigatória
- A justificativa é registrada em auditoria
- O modal exibe: *"Apenas administradores poderão editar com justificativa"*

**Conclusão para o tour:** O bloqueio de edições retroativas **depende exclusivamente da implementação do backend `fecharMes`**. A UI não reflete o estado de lock visualmente (isLocked sempre false). **O tour NÃO deve prometer bloqueio automático de campos** — deve apenas descrever o que o botão dispara (auditoria + notificação ao backend).

### 3. Lançamento Manual no DFC ≠ ContaReceber/ContaPagar

**Comportamento real (confirmado via código `LinhaItem` em DFCTab):**

| Tipo de lançamento | Ao clicar na linha | O que acontece |
|---|---|---|
| **Origem: DRE** (badge cinza `DRE`) | Abre modal `ModalLiquidacaoDRE` | Pode criar/atualizar `ContaReceber` ou `ContaPagar` com data de pagamento |
| **Origem: Manual** (badge azul `Manual`) | Não abre modal de liquidação | Mostra apenas os botões ✏️ Editar / 🗑️ Excluir no hover |

```jsx
// LinhaItem em DFCTab.jsx
const handleRowClick = () => {
  // Apenas itens do DRE (com ID) abrem o modal de pagamento ao clicar na linha
  if (item.origem !== "manual" && item.id) {
    onMarcarPagamento(item);
  }
};
```

**O tour deve diferenciar explicitamente esses dois comportamentos.**

### 4. Sincronização automática ao trocar de mês (invisível ao usuário)

Ao mudar o `selectedMonth`, dois `useEffect` disparam automaticamente **sem nenhum aviso na tela**:

```
1. updateDREFromMonthlyGoals(workshop.id, selectedMonth)
   → Importa os valores das metas mensais para o DRE do mês
   
2. syncDRETOMetas(currentDRE.id, ...) — dispara quando currentDRE muda
   → Se detectar divergência, exibe o DiscrepancyAlert (banner amarelo)
```

**O DiscrepancyAlert** (quando aparece) pergunta ao usuário qual valor usar como fonte de verdade:
- **"Usar DRE"** — mantém o que está no lançamento manual do DRE
- **"Usar Metas"** — sobrescreve o DRE com os valores das metas mensais

---

## 🗺️ FLUXO RECOMENDADO (Confirmado Correto)

```
Selecionar Mês/Ano
    └── Aba Receitas        → informar faturamento + técnicos + horas
        └── Aba Custos TCMP²      → custos operacionais (base do valor hora)
            └── Aba Custos NÃO TCMP²   → financeiros/investimentos
                └── Aba Peças               → custo peças aplicadas e estoque
                    └── [Salvar DRE] ← OBRIGATÓRIO antes de continuar
                        └── [DiscrepancyAlert?] → resolver divergência se aparecer
                            └── Aba Resumo DRE      → leitura do resultado completo
                                └── Aba DRE Avançado   → modo alternativo (lançamento individual)
                                    └── Aba DFC            → fluxo de caixa (importa DRE Avançado)
                                        └── Aba Controle Orçamentário → metas vs realizado
                                            └── Fechar Mês (fim do período)
```

---

## 🎯 STEP 1 — Seletor de Mês + Modo de Visualização

### O que filtrar mês e ano faz?
- Todas as abas carregam exclusivamente os dados do período selecionado
- No dropdown de mês: **🟢 verde** = tem DRE salvo; **⚫ cinza** = mês em branco; valor TCMP² exibido ao lado para referência rápida
- Ao mudar o mês, dois processos disparam automaticamente em background (veja Correção #4)

### Modo "Mensal" vs Modo "Média Geral"

| Modo | Comportamento | Editável? |
|---|---|---|
| **Mensal** | Dados do mês selecionado | ✅ Sim |
| **Média Geral** | Média automática de todos os meses preenchidos | ❌ Não — somente leitura |

> ⚠️ **Atenção:** O seletor de modo fica visualmente idêntico nos dois casos. Se o usuário selecionar "Média Geral" e tentar editar, os campos estarão preenchidos com a média mas o botão Salvar não está visível (ele só aparece no modo Mensal). Isso pode confundir.

---

## 🎯 STEP 2 — KPIs do Topo (4 cards coloridos)

Os 4 indicadores são calculados **em tempo real** conforme você preenche os campos:

| Card | Fórmula | Meta |
|---|---|---|
| **TCMP² (Valor Hora)** | `Custos TCMP² ÷ (Técnicos × Horas)` | Quanto mais alto, maior o custo da hora |
| **R70 (Renda)** | `(Receita − Peças Aplicadas − Peças Estoque) ÷ Receita` | ≥ 70% (verde) |
| **I30 (Investimento)** | `100% − R70` | ≤ 30% (verde) |
| **Lucro** | `Receita − Todos os Custos − Peças` | Positivo (verde) |

> 💡 Se o TCMP² for R$ 0,00, um dica aparece automaticamente: *"Lance os custos na aba Custos TCMP² para calcular o valor hora"*

---

## 🎯 STEP 3 — Botão "Sincronizar Receitas"

**O que faz:** Chama manualmente `updateDREFromMonthlyGoals` — importa os valores das metas mensais da Workshop para os campos de receita do DRE. É a alternativa ao sync automático que acontece ao trocar o mês.

**Quando usar:** Se você acabou de definir/alterar as metas mensais e quer que o DRE reflita esses valores.

> ⚠️ Se houver divergência entre o DRE atual e as metas, o **DiscrepancyAlert** (banner amarelo) pode aparecer perguntando qual valor usar como fonte de verdade.

---

## 🎯 STEP 4 — Badge "Não Salvo" + Botão Salvar DRE

- O botão **Salvar DRE** fica **amarelo** com a tag `Não salvo` quando há alterações pendentes
- A comparação é feita via `JSON.stringify(formData) !== JSON.stringify(savedFormData)`
- **Navegar para outra página sem salvar = perder as alterações** (não há auto-save)
- Ao salvar com sucesso, o botão volta a verde e o badge "Não salvo" desaparece

---

## 🎯 STEP 5 — Gráfico de Evolução TCMP² (Interativo)

- Exibe a evolução do TCMP² mês a mês
- A linha vermelha tracejada = média histórica
- **Clicável:** ao clicar em qualquer ponto do gráfico, o sistema navega direto para aquele mês na aba Receitas

---

## 🎯 STEP 6 — Aba Receitas

Preencher aqui impacta:
1. **TCMP²** (precisa de receita + custos para calcular)
2. **R70/I30** (proporcional à receita total)
3. **Lucro** (receita − todos os custos)
4. O campo **Técnicos Produtivos** e **Horas Disponíveis/Mês** são a base do denominador do TCMP²

---

## 🎯 STEP 7 — Aba Custos TCMP² (Entram)

Custos operacionais que **definem o valor mínimo da hora técnica**. A fórmula é:
```
TCMP² = (Soma de todos os Custos TCMP²) ÷ (Técnicos × Horas/Mês)
```

| Campo | Exemplos | Entra no TCMP²? |
|---|---|---|
| Operacionais | Aluguel, energia, água, telefone | ✅ |
| Pessoas | Salários, FGTS, benefícios | ✅ |
| Pró-labore | Retirada dos sócios | ✅ |
| Marketing | Tráfego pago, agência | ✅ |
| Manutenção | Predial e equipamentos | ✅ |
| Terceirizados | Contabilidade, advocacia | ✅ |
| Administrativo | Material de escritório, seguros | ✅ |

---

## 🎯 STEP 8 — Aba Custos NÃO TCMP²

Não distorcem o valor hora porque são compromissos pontuais ou de longo prazo:

| Campo | Entra no TCMP²? | Entra no Lucro? |
|---|---|---|
| Financiamentos | ❌ | ✅ |
| Consórcios | ❌ | ✅ |
| Equipamentos Parcelados | ❌ | ✅ |
| Boletos de Peças (Estoque) | ❌ | ✅ |
| Processos Judiciais | ❌ | ✅ |
| Compra de Terreno/Imóvel | ❌ | ✅ |
| Investimentos Diversos | ❌ | ✅ |

---

## 🎯 STEP 9 — Aba Peças

**Fórmula R70/I30 desta aba (DRE Principal):**
```
R70 = (Receita Total − Custo Peças Aplicadas − Peças Estoque) ÷ Receita Total
I30 = 100% − R70
```

> ⚠️ **Esta fórmula é diferente da exibida no DRE Avançado** (que usa receita de peças, não custo). Ver Correção #1.

---

## 🎯 STEP 10 — DiscrepancyAlert (Alerta de Divergência)

Aparece como um banner amarelo na página quando o sistema detecta que os valores do DRE diferem das metas mensais cadastradas.

**Duas opções:**
- **"Usar DRE"** — mantém o que foi digitado manualmente no DRE
- **"Usar Metas"** — substitui os valores do DRE pelos valores das metas mensais

> 💡 Regra de bolso: se suas metas são a referência, escolha "Usar Metas". Se você já lançou os valores reais do mês, escolha "Usar DRE".

---

## 🎯 STEP 11 — Aba Resumo DRE

Relatório completo em formato contábil, gerado automaticamente. Contém:
1. RECEITAS (Peças + Serviços + Outras)
2. CUSTOS TCMP² (7 categorias)
3. CUSTOS NÃO TCMP² (7 categorias, com linhas detalhadas)
4. CUSTOS COM PEÇAS (Aplicadas + Estoque)
5. RESULTADO (Lucro/Prejuízo + %)
6. **TCMP² em destaque** — valor hora ideal calculado

Botão **🖨️ Imprimir Resumo** — gera versão formatada para impressão/PDF.

---

## 🎯 STEP 12 — Aba DRE Avançado

**Para quem:** Oficinas sem sistema de gestão financeiro externo, que precisam lançar cada receita/despesa individualmente.

### Botões "+ Receita" e "+ Despesa"

Ao clicar, abre formulário com:
- **Categoria** + **Subcategoria** (o sistema detecta automaticamente se entra no TCMP²)
- **Descrição** (texto livre)
- **Valor** (R$)
- **Data de Vencimento** (opcional — aparece badge 🕐 na lista)
- **Data de Pagamento** (opcional — aparece badge ✅ na lista)
- **Recorrência**: Único / Mensal / Quinzenal / Semanal / Anual

> ⚠️ **Recorrência:** Criar um lançamento mensal gera N registros de uma vez (um por mês). **Editar um registro recorrente altera SOMENTE aquele item**, não os outros da série.

### Legenda de cores (barra lateral de cada lançamento)
- 🔵 **Azul** = despesa que entra no TCMP²
- 🔴 **Vermelho** = despesa fora do TCMP²
- 🟢 **Verde** = receita

### Botão "Consolidar no DRE"
Mapeia os totais do DRE Avançado para as abas Receitas/Custos/Peças. Após consolidar, é necessário **clicar em "Salvar DRE"** para persistir.

### Sincronização em tempo real com DFC e Controle Orçamentário
Todo lançamento criado/editado/excluído no DRE Avançado dispara o evento `dre-lancamento-criado`. O DFC e o Controle Orçamentário escutam esse evento e atualizam automaticamente **sem necessidade de recarregar a página** — via `subscribe` (WebSocket) + `window.addEventListener`.

### Modo Mensal vs Anual

| Modo | O que exibe |
|---|---|
| **Mensal** | Lista de lançamentos do mês, agrupados por categoria, com sub-abas: Todos / Receitas / Despesas / Análise |
| **Anual** | 4 KPIs anuais + gráfico de barras mês a mês + tabela por categoria do ano (chama backend `getDREDataAnual`) |

### Sub-aba "Análise" (Painel de Análise)
Exibe KPIs calculados com base nos lançamentos do DRE Avançado, incluindo a **segunda fórmula R70/I30**:
```
R70 (DRE Avançado) = (Receita Total − Receita de Peças Aplicadas) ÷ Receita Total
```
> Valor pode diferir do R70 da aba Peças — é esperado. Ver Correção #1.

---

## 🎯 STEP 13 — Aba DFC (Demonstrativo de Fluxo de Caixa)

### Como funciona
Os lançamentos do DRE Avançado são importados automaticamente (badge `DRE` cinza). O usuário complementa com:
- **Saldo Inicial do Mês** — clique no 👁️ para detalhar por banco/máquina/caixa
- **Lançamentos manuais** — entradas/saídas que o DRE não captura

### Clicar em um lançamento: dois comportamentos distintos

| Tipo (badge) | Ao clicar | Resultado |
|---|---|---|
| `DRE` (cinza) | Abre modal de liquidação | Registra data de vencimento e/ou pagamento → cria `ContaReceber` ou `ContaPagar` |
| `Manual` (azul) | Não abre modal | Apenas exibe botões ✏️ / 🗑️ no hover para editar/excluir |

### Grupos do DFC

| Grupo | Cor | Contém |
|---|---|---|
| **Operacional** | 🟢 Verde | Entradas e saídas do dia a dia |
| **Investimento** | 🔵 Azul | Compra de equipamentos, imóveis |
| **Financiamento** | 🟣 Roxo | Empréstimos recebidos/parcelas pagas |

**Saldo Final = Saldo Inicial + Fluxo Operacional + Fluxo Investimento + Fluxo Financiamento**

### View "Projeção"
Timeline dos lançamentos ordenados por data de vencimento, com saldo projetado dia a dia — útil para prever se o caixa vai negativar antes do final do mês.

### Aba "Contas a Receber/Pagar"
Painel de gestão de cobranças. Mostra status de cada conta vinculada a lançamentos do DRE (pendente → parcial → pago).

---

## 🎯 STEP 14 — Aba Controle Orçamentário

### Como funciona
Você define quanto quer gastar/ganhar por categoria e acompanha se está dentro do orçamento.

**Os três valores que aparecem por meta:**
| Valor | Origem | Significado |
|---|---|---|
| **Previsto** | Soma dos `DRELancamento` do mês | O que foi lançado (pago ou não) |
| **Realizado** | Soma dos `ContaPagar/ContaReceber.valor_pago` | O que foi efetivamente pago |
| **Meta** | Valor configurado manualmente | O limite/objetivo definido |

**Status automático:**
- ✅ Dentro da meta
- ⚠️ Próximo do limite (≤ 5% acima)
- ❌ Ultrapassou a meta

### Visão Mensal vs Anual

| Visão | Conteúdo |
|---|---|
| **Mensal** | Metas do mês, cards de resumo, barras de progresso, relatório de variações, matrix de responsáveis |
| **Anual** | Editor de meta anual de faturamento + Consolidado Anual com performance acumulada |

### Distribuição Sazonal
Permite definir pesos diferentes por mês (ex: dezembro = 15% da receita anual, janeiro = 7%). O sistema distribui a meta anual proporcionalmente.

### Hierarquia Orçamentária
Cria grupos e subgrupos de despesas com totais calculados automaticamente pela soma dos filhos.

---

## 🎯 STEP 15 — Fechar Mês

### O que o botão faz (comportamento confirmado no código)
1. **Exige justificativa obrigatória** (campo de texto, mínimo 1 caractere)
2. Chama o backend `fecharMes` com `action: 'fechar'` e a justificativa
3. A justificativa é **registrada em auditoria** (`BudgetMetaHistory`)
4. O backend determina o comportamento de lock — **a UI não reflete visualmente se o mês está ou não bloqueado** (isLocked está hardcoded como `false` na página DRETCMP2)

### Reabrir o mês
O mesmo modal exibe o botão "Reabrir Mês" quando `isLocked = true`. Também exige justificativa. Chama o mesmo backend com `action: 'abrir'`.

> ⚠️ **Limitação atual:** O estado de lock não é lido do backend pela página DRETCMP2 (`isLocked={false}` hardcoded). O modal sempre mostrará "Fechar Mês", nunca "Reabrir Mês", independentemente do estado real. Esse comportamento pode ser corrigido num próximo ciclo lendo o status via `fecharMes` ou `BudgetMeta`.

---

## 📊 ROADMAP DO TOUR — 15 Steps Definitivos

| # | Elemento na tela | Texto do Step | Duração sugerida |
|---|---|---|---|
| 1 | Seletor de Mês | "Filtre pelo mês que quer analisar. 🟢 = dados existem; ⚫ = mês em branco" | 15s |
| 2 | Select Modo (Mensal/Média) | "Mensal = editável. Média Geral = leitura histórica, não permite salvar" | 10s |
| 3 | 4 KPIs coloridos | "Esses 4 indicadores se calculam automaticamente — não são inseridos manualmente" | 15s |
| 4 | Gráfico TCMP² | "Clique em qualquer ponto para navegar direto ao mês daquele dado" | 10s |
| 5 | Botão Sincronizar Receitas | "Importa os valores das suas metas mensais para o DRE. Útil ao atualizar metas." | 10s |
| 6 | Badge 'Não salvo' + Salvar DRE | "Salve antes de trocar de aba ou sair da página. Dados não salvos são perdidos." | 15s |
| 7 | Aba Receitas | "Comece sempre aqui. Informe faturamento + número de técnicos + horas/mês" | 20s |
| 8 | Aba Custos TCMP² | "Estes custos definem o valor mínimo da hora técnica (TCMP²)" | 15s |
| 9 | Aba Custos NÃO TCMP² | "Financiamentos e investimentos não entram no TCMP², mas entram no Lucro" | 15s |
| 10 | Aba Peças | "Separe peças aplicadas vs compradas para estoque. Afeta o R70/I30." | 15s |
| 10.5 | DiscrepancyAlert (se aparecer) | "O sistema detectou divergência entre DRE e metas. Escolha a fonte de verdade." | 20s |
| 11 | Aba Resumo DRE | "Resultado automático do mês. Use Imprimir para exportar." | 10s |
| 12 | Aba DRE Avançado | "Para lançar nota a nota. Não precisa do DRE simples se usar este." | 20s |
| 12.1 | Botão + Receita / + Despesa | "Categorias com barra azul = entra TCMP², vermelha = fora, verde = receita" | 15s |
| 12.2 | Botão Consolidar no DRE | "Ao terminar, consolide. Depois clique Salvar DRE para persistir." | 10s |
| 13 | Aba DFC — item DRE | "Clique num item DRE para marcar data de pagamento → gera Conta a Pagar/Receber" | 20s |
| 13.1 | Aba DFC — item Manual | "Itens manuais não abrem liquidação — apenas permitem editar ou excluir no hover" | 10s |
| 14 | Aba Controle Orçamentário | "Defina metas por categoria. Previsto = lançado. Realizado = efetivamente pago." | 20s |
| 15 | Botão Fechar Mês | "Registra o fechamento em auditoria. Justificativa obrigatória." | 10s |

---

## ⚡ FLUXO IDEAL PARA USUÁRIO NOVO (12 Passos)

```
1.  Selecionar mês/ano
2.  Definir Técnicos Produtivos + Horas/Mês  (aba Receitas)
3.  Preencher Receitas (Peças, Serviços, Outras)
4.  Preencher Custos TCMP² (7 categorias)
5.  Preencher Custos NÃO TCMP² (financiamentos, investimentos)
6.  Preencher Custos Peças (aplicadas + estoque)
7.  Clicar "Salvar DRE"
    → Se DiscrepancyAlert aparecer: escolher fonte de verdade
8.  Ver Resumo DRE → interpretar TCMP², R70/I30, Lucro
9.  (Opcional) DRE Avançado → lançar individualmente → Consolidar → Salvar DRE
10. DFC → definir Saldo Inicial → marcar pagamentos nos itens DRE
11. Controle Orçamentário → criar metas → acompanhar semana a semana
12. Final do mês → Fechar Mês (com justificativa)
```

---

## 🐛 BUGS / LIMITAÇÕES CONHECIDAS (Para Equipe de Dev)

| Item | Descrição | Prioridade |
|---|---|---|
| `isLocked` hardcoded | `DRETCMP2.jsx` sempre passa `isLocked={false}` para `FecharMesModal`. O estado real do backend nunca é lido. | 🔴 Alta |
| R70 dupla fórmula sem aviso | Usuário pode ver valores diferentes de R70 na aba Peças vs aba Análise do DRE Avançado sem nenhuma explicação na UI | 🟡 Média |
| Modo Média Geral sem indicador visual de "não editável" | O botão Salvar desaparece mas nenhuma mensagem explica por quê | 🟡 Média |
| Recorrência: editar um item não atualiza a série | Usuário não recebe aviso de que está editando apenas uma parcela | 🟡 Média |