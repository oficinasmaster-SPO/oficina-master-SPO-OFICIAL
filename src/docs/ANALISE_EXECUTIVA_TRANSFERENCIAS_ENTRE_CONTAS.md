# Análise Executiva — Transferências entre Contas no DFC
**Sistema SPO · Módulo Financeiro (DFC/DRE) · Data: 23/09/2026**
**Destinatário: Time de Finanças (BPO) · Origem: Auditoria QA SPO + Requisito de classificação (ver anexo)**

---

## 1. Contexto e problema

As oficinas movimentam dinheiro entre as próprias contas (banco → caixa, máquina de cartão → banco) **todo mês**. Hoje o sistema **não tem um registro nativo para essa operação**, obrigando o time a um de dois caminhos, ambos errados do ponto de vista contábil:

| Prática atual | Efeito no sistema | Problema |
|---|---|---|
| Lançar como **despesa** na conta de origem e **receita** na de destino | Entra no resultado do mês | **Infla receita e despesa artificialmente** — distorce DRE, TCMP², margem e comparativos de metas |
| Não registrar (planilha externa) | Saldos das contas divergem do real | **Reconciliação manual a cada fechamento**, sem rastreabilidade no sistema |

Sem o registro nativo, o saldo por conta exibido no DFC (Saldo Inicial detalhado: bancos, máquinas, caixa) **não reflete a realidade** após qualquer movimentação interna — exatamente o tipo de divergência que gerou o defeito "saldo zerado" corrigido nesta semana (QA-2.8).

**Requisito de classificação definido pelo financeiro (documento anexado):**

| Campo | Classificação |
|---|---|
| Tipo | Transferência entre contas |
| Categoria | Transferência interna / Movimentação entre contas |

## 2. Proposta (resumo)

Registrar cada transferência como **par de lançamentos no DFC** — saída na conta de origem + entrada na conta de destino — num **grupo próprio (`transferencia`)**, **fora do resultado** do mês e **sem criar entidade nova**:

- Reusa a estrutura de contas que já existe (Saldo Inicial detalhado: bancos, máquinas de cartão, caixa);
- Reusa a lógica de débito/crédito de saldo já validada pelas baixas de Contas a Pagar/Receber (`registrarLiquidacao`/`desfazerLiquidacao`);
- Cada par é amarrado por um ID único (`transferencia_id`), permitindo **estorno limpo dos dois lados**;
- O DRE **não é afetado em nenhuma hipótese** (transferência não é receita nem despesa).

## 3. Por que faz sentido — ganhos financeiros e operacionais

**a) Integridade do resultado (DRE/TCMP²).**
Hoje cada transferência registrada manualmente como despesa/receita contamina até 5 indicadores usados na gestão: faturamento, custo, margem, TCMP² e comparativo de metas. Com o grupo próprio, **zero impacto no resultado** — os lançamentos existem apenas para movimentação de saldo.

**b) Fechamento mensal mais rápido e auditável.**
Cada transferência fica com data, valor, conta de origem, conta de destino, autor e possibilidade de estorno rastreado. A reconciliação bancária (Conciliação Bancária / fechamento do mês) deixa de depender de planilha externa. O par de lançamentos se cancela no consolidado — o saldo total do mês não muda, apenas a **distribuição entre contas** passa a ser correta.

**c) Estorno previsível.**
Mesmo padrão já homologado no estorno de liquidação (reverte saldos + remove lançamentos + registra autor/motivo). Sem o ID do par, estornar uma transferência exigiria apagar duas entradas manualmente — com risco de apagar só um lado e **quebrar o saldo**.

**d) Classificação conforme o padrão do financeiro.**
Tipo "Transferência entre contas" e categoria "Transferência interna / Movimentação entre contas" ficam fixos, garantindo que relatórios e filtros reconheçam esses registros de forma consistente — nunca confundidos com despesa operacional.

## 4. Custo e esforço

| Item | Detalhe |
|---|---|
| Esforço de construção | **~1 dia** (schema + 2 funções backend + 1 modal) |
| Novas entidades/tabelas | **Nenhuma** |
| Campos novos de dados | 3 (enum `transferencia`, `transferencia_id`, `fonte_entrada`) |
| Migração de dados históricos | **Não requerida** (recurso novo; histórico em planilha permanece como está) |
| Risco de regressão | **Baixo** — alterações apenas aditivas; cálculos existentes ignoram o novo grupo |
| Treinamento do time BPO | Mínimo: 1 botão ("Transferir entre contas"), mesmo padrão visual das baixas atuais |

## 5. Riscos e mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Usuário registrar transferência entre contas de meses diferentes | Média | v1 valida que origem e destino usam o mês da data informada (mesma regra do fix QA-2.8); entre-meses fica fora do escopo inicial |
| Saldo insuficiente na conta de origem | Média | Validação bloqueia com mensagem clara ("Saldo insuficiente na conta X") — sem aceitar silenciosamente |
| Estorno parcial (só um lado do par) | Baixa | Estorno sempre localiza e reverte **o par completo** pelo `transferencia_id` |
| Grupo novo ser somado indevidamente em algum total | Baixa | Verificação única: consolidados do DFC excluem explicitamente `grupo=transferencia` |

## 6. Alternativas consideradas

1. **Não fazer nada (planilha externa)** — custo zero de desenvolvimento, mas mantém divergência de saldos, reconciliação manual e risco de erro em todo fechamento. **Descartada.**
2. **Registrar como despesa/receita com categoria "transferência"** — menos código, mas exige filtrar a categoria em TODOS os relatórios e cálculos (DRE, TCMP², metas, projeções) — risco permanente de esquecimento e distorção. **Descartada.**
3. **Proposta escolhida (grupo próprio + par de lançamentos)** — isolamento estrutural: mesmo que um relatório esqueça do tema, o grupo separado é fácil de auditar. **Recomendada.**

## 7. Recomendação

**Implementar.** Custo baixo (1 dia, sem migração, sem entidade nova), resolve um vazio que hoje obriga prática contábil incorreta (inflar receita/despesa) ou controle paralelo em planilha, e usa exclusivamente mecanismos já validados no sistema — inclusive a lógica de saldo corrigida esta semana. O impacto é imediato no fechamento do próximo mês: saldo por conta fiel à realidade e resultado (DRE) limpo de movimentações internas.

---

### Apêndice — Critérios de aceite sugeridos (QA)

1. Transferência banco → caixa: saldo do banco diminui, do caixa aumenta, **saldo total do mês e DRE inalterados**.
2. Estorno: par completo revertido, saldos voltam ao estado anterior, com autor e data registrados.
3. Origem = destino bloqueado; valor > saldo da origem bloqueado com mensagem clara.
4. Transferência não aparece em nenhum total de receita/despesa do DFC e não entra no DRE/TCMP².
5. Lançamentos exibidos em bloco próprio "Transferências entre contas" com a classificação exigida (Tipo: "Transferência entre contas"; Categoria: "Transferência interna / Movimentação entre contas").