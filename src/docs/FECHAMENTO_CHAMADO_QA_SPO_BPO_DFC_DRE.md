# FECHAMENTO DE CHAMADO — QA Sênior: Configuração DFC/DRE (SPO → BPO)

**Chamado:** Auditoria e QA dos 9 itens do documento "Prioridades Configuração SPO BPO" (PDF anexado).
**Data de execução:** 23/09/2026 — 10:44 às 11:05 (BRT)
**Analista:** QA Sênior (agente Base44)
**Escopo:** Módulos DFC (Saldo Inicial, Contas a Pagar/Receber, Liquidações/Estornos) e DRE Avançado (lançamentos, anexos, documentos, clientes/fornecedores).
**Artefatos auditados:**
- `src/components/dre/DREAvancadoTab.jsx` (FormLancamento, LancamentoRow, PainelAnalise)
- `src/components/dfc/SeletorFonte.jsx`
- `src/components/dfc/ModalSaldoInicialDetalhado.jsx`
- `src/components/dre/ModalCadastroFornecedor.jsx`
- `src/components/financeiro/ModalRegistrarPagamentoConta.jsx`
- `src/pages/ContasPagar.jsx` / `src/pages/ContasReceber.jsx` (modais de estorno)
- `base44/functions/registrarLiquidacao/entry.ts`
- `base44/functions/desfazerLiquidacao/entry.ts`
- `base44/entities/WorkshopFornecedor.jsonc`, `base44/entities/User.jsonc`

**Metodologia:** leitura estática de código com rastreio ponta-a-ponta de cada fluxo (UI → SDK → function → entidade → retorno), verificação cruzada de contratos entre camadas (formatos de `fonte_selecionada`, valores canônicos de `user_type`, vínculo `liquidacao_financeira_id`) e checagem de caminhos de exceção/estorno. Sem execução de testes dinâmicos nesta passada (recomendado em plano de teste final).

---

## 1. RESULTADO POR ITEM DO DOCUMENTO

| # | Item (PDF) | Status | Observação QA |
|---|------------|--------|---------------|
| P1-1 | Cadastro de novas contas no DFC | ✅ APROVADO | Botões "Adicionar Banco/Máquina" sem limite de contas. Bloqueio de edição aplica-se apenas a contas com liquidação no mês (regra correta de integridade). Adição de novas contas permanece liberada mesmo com mês bloqueado. |
| P1-2 | Estorno de baixa financeira | ⚠️ APROVADO COM RESSALVAS | Fluxo completo existe (motivo obrigatório, reverte conta, deleta DFC, devolve saldo da fonte, auditoria). **Porém: 2 defeitos críticos encontrados — ver seções 2.1 e 2.2.** |
| P1-3 | Anexo na despesa (vinculado ao lançamento) | ✅ APROVADO | Upload direto no lançamento (`anexo_url`/`anexo_nome`), limite 10 MB, preview e remoção. Defeito menor: **anexo não se aplica a lançamentos recorrentes** (ver 2.4). |
| P2-4 | NF/Pedido/Fatura na despesa, não no cadastro | ⚠️ PENDENTE | Campos corretos existem no lançamento (tipo_documento + numero_documento). **Campos fixos `numero_nfe`/`numero_pedido` AINDA presentes no cadastro de fornecedor** — duplicidade; migração do PDF não executada. |
| P2-5 | Data da Venda (receita) | ✅ APROVADO | Campo `data_competencia`, rótulo "🛒 Data da Venda", badge na listagem, avança corretamente em recorrências (backend). |
| P2-6 | Data da Compra (despesa) | ⚠️ PENDENTE | Campo existe (`data_competencia`) mas com rótulo "Data de Competência", **escondido dentro do accordion "Documento" (fechado por padrão)**. Rótulo/exposição não atendem à expectativa do BPO. |
| P2-7 | Data NF / Data do Pedido | ✅ APROVADO | `data_documento` + seletor de tipo (NF/Pedido/Fatura/Outro) + badge "📄" na listagem. |
| P3-8 | Nome do cliente visível na receita | ✅ APROVADO | `cliente_nome` desnormalizado no lançamento + badge "👤" na listagem. |
| P3-9 | Autocomplete de clientes (já cadastrados) | ✅ APROVADO | Combobox com busca sobre `WorkshopCliente` (limite 200, suficiente), empty-state direcionando para cadastro, integração com modal de cadastro rápido. |

**Resumo:** 6 aprovados, 1 aprovado com ressalvas críticas, 2 pendentes de ajuste (rotulagem/remoção de campos).

---

## 2. DEFeitos ENCONTRADOS (ANÁLISE SENIOR)

### 2.1 🔴 CRÍTICO — Autorização do estorno compara valor canônico errado (`'interno'` vs `'internal'`)
**Arquivo:** `base44/functions/desfazerLiquidacao/entry.ts` (linha ~18)
```ts
const autorizado = userRole === 'admin' || userType === 'interno';
```
**Evidência:** O valor canônico de `User.user_type` é `internal`/`external` (enum em `base44/entities/User.jsonc`, marcado como "FONTE ÚNICA DE VERDADE"). A comparação com a string `'interno'` **nunca casa**, logo **qualquer usuário interno do BPO recebe 403 ao estornar** — só admins conseguem. Como o requisito do chamado é exatamente habilitar o BPO a operar estornos, o item P1-2 está funcionalmente comprometido para o público-alvo.
**Correção:** `userType === 'internal'`. Testar com usuário interno não-admin (esperado: estorno permitido) e com usuário externo (esperado: 403).

### 2.2 🔴 CRÍTICO — Estorno não reverte `data_pagamento` do DRELancamento vinculado
**Arquivos:** `registrarLiquidacao` (passo 5 escreve `data_pagamento` no DRE vinculado) × `desfazerLiquidacao` (não reverte).
**Impacto:** Após estornar uma baixa, o lançamento do DRE continua exibindo "✅ pago dd/mm" — o DRE fica inconsistente com o Contas a Pagar/Receber (que volta a "aberto/parcial"). O usuário verá a conta em aberto no DFC e, ao mesmo tempo, paga no DRE.
**Correção:** No `desfazerLiquidacao`, se `conta.dre_lancamento_id` e `novoValorPago <= 0.01`, limpar `data_pagamento` (null) no DRELancamento; se parcial, recalcular (idealmente a partir da liquidação restante mais recente).

### 2.3 🟠 ALTO — ContasReceber resolve oficina por campo legado (`user.data.workshop_id`)
**Arquivo:** `src/pages/ContasReceber.jsx` (linha ~165)
```js
const workshopId = user?.data?.workshop_id;
```
**Impacto:** Pós-migração de tenant (TenantMembership como fonte de verdade), usuários cujo vínculo nunca populou o campo legado **veem a lista de Contas a Receber vazia** — mesmo padrão de resíduo já catalogado na página CronogramaConsultoria. A página ContasPagar já usa `useWorkshopContext()` (correto).
**Correção:** Substituir por `useWorkshopContext()`, alinhando com ContasPagar. Reprodução: logar com usuário criado via convite pós-migração (ex.: rafaelbertuolla) e abrir Contas a Receber.

### 2.4 🟡 MÉDIO — Anexo não é propagado para lançamentos recorrentes
**Arquivo:** `DREAvancadoTab.jsx` — branch recorrente do `handleSave` envia `criarLancamentoRecorrente` **sem** `anexo_url`/`anexo_nome` (e sem os vínculos de cliente/fornecedor). Usuário anexa a NF, escolhe "Mensal" e o anexo se perde silenciosamente.
**Correção:** Incluir anexo/vínculos no payload da recorrência (a function já aceita propagação de campos opcionais) ou desabilitar/avisar o campo anexo quando frequência ≠ único.

### 2.5 🟡 MÉDIO — Estorno não é atômico (sem compensação entre passos)
`desfazerLiquidacao` executa em sequência: reverte conta → deleta DFCs → deleta liquidação → reverte saldo da fonte → auditoria. Falha no meio (timeout, RLS, rede) deixa estado parcial (ex.: conta revertida mas liquidação ainda existindo → a mesma baixa pode ser estornada de novo, e o clamp `Math.max(0, ...)` mascara o saldo negativo resultante).
**Mitigação recomendada:** reordenar para "deletar liquidação por último" já é o padrão atual; adicionar verificação de idempotência (re-checar `liquidacao.valor_liquidacao` antes de aplicar delta) e registrar falhas parciais no `auditLog` com passo em que falhou.

### 2.6 🟡 MÉDIO — Clamp `Math.max(0, saldo + delta)` mascara inconsistência nas fontes
Presente em `registrarLiquidacao`, `desfazerLiquidacao` e `atualizarSaldoFonte`. Um estorno duplo ou concorrente reduziria o saldo abaixo de zero e o clamp **silencia** a perda. Recomendado: quando o resultado do clamp for diferente do valor real, logar evento de auditoria (`SaldoInicialHistorico` ou `auditLog`).

### 2.7 🟢 BAIXO — Divergências menores
- `desfazerLiquidacao` importa `@base44/sdk@0.8.25` enquanto `registrarLiquidacao` usa `0.8.31` (classe de issue já conhecida de drift de SDK).
- `ModalSaldoInicialDetalhado.zerarTudo()` não passa `detalhes_anteriores` → zerar saldo **não gera registro** no histórico de auditoria (as demais operações geram).
- Estorno restaura status `aberto`/`parcial` mas não recalcula `vencido` (o badge de ContasPagar depende do status armazenado; ContasReceber calcula por data — comportamento inconsistente entre as duas telas).
- `handleRemoverAnexo` usa `document.querySelector` global para resetar o input de arquivo — frágil se houver múltiplos inputs; preferir ref.
- Parsing de valor no formulário do DRE (`replace(/\./g,"")`) trata ponto como milhar — padrão BR aceitável, mas o app já possui `InputMoeda` (usado no DFC) — padronizar reduz risco de "1.500" virar 150.
- Item 2.4 do PDF (remoção de NF/Pedido fixos do fornecedor): campos continuam no modal e na entidade `WorkshopFornecedor` — decidir entre remover do modal (schema pode manter por retrocompatibilidade).

---

## 3. PONTOS POSITIVOS VALIDADOS

- Vínculo `DFCLancamento.liquidacao_financeira_id` garantido no registro → estorno localiza e remove o DFC corretamente (não gera órfãos — requisito de integridade do estorno atendido).
- Motivo de estorno obrigatório + trilha em `historico_alteracoes` da conta + `auditLog` — rastreabilidade completa.
- Bloqueio de edição de saldo inicial corretamente escopado ao mês com liquidações (fix S1-T1.1 validado — não trava永久 o cadastro).
- Formato de `fonte_selecionada` (`banco:id:nome`) consistente entre `SeletorFonte`, `ModalRegistrarPagamentoConta` e o backend.
- Verificação de saldo insuficiente no frontend com aviso claro; fallback de fontes de outro mês com saldo zerado e banner informativo.
- Idempotência no `registrarLiquidacao` (conta já paga → sucesso sem duplicar).
- Clamp anti-negativo na reversão da conta (`novoValorPago`/`novoValorAberto`) protege contra duplo estorno.

---

## 4. PLANO DE TESTES RECOMENDADO (regressão pós-fix)

| Cenário | Passos | Resultado esperado |
|---|---|---|
| Estorno por usuário interno (não-admin) | Pagar conta → estornar | Sucesso (após fix 2.1) |
| Estorno por usuário externo | Tentar estornar | 403 |
| Estorno com DRE vinculado | Pagar conta com DRE → estornar | DRE volta a "sem pagamento" (após fix 2.2) |
| Duplo estorno da mesma baixa | Estornar 2x | 2ª tentativa: liquidação não encontrada (404) e nenhum efeito colateral |
| Contas a Receber pós-migração | Usuário só-TenantMembership abre a tela | Lista carrega (após fix 2.3) |
| Despesa recorrente com anexo | Criar mensal com NF anexa | Anexo presente em todas as parcelas (após fix 2.4) |
| Saldo inicial bloqueado | Mês com liquidação: editar saldo existente / adicionar novo banco | Editar bloqueado, adicionar liberado |
| Fornecedor sem NF fixa | Cadastrar fornecedor | Sem campos NFe/Pedido (após item 2.4 do PDF) |

---

## 5. VEREDITO E ENCERRAMENTO

**Status do chamado: ENCERRADO COM REPROVAÇÃO PARCIAL.**

Dos 9 itens solicitados, **7 já estão implementados e aprovados no QA**; **2 itens de padronização permanecem pendentes** (remoção de NF/Pedido fixos do fornecedor; rótulo/exposição de "Data da Compra") e a análise sênior **elevou 2 defeitos críticos e 1 alto** que bloqueiam a operação plena pelo time BPO (autorização de estorno com valor canônico errado; reversão do DRE no estorno; resolução legada de oficina em Contas a Receber).

**Próximos passos sugeridos (ordem de prioridade):**
1. Corrigir 2.1 (autorização `internal`) — 1 linha, desbloqueia o BPO.
2. Corrigir 2.2 (reverter `data_pagamento` no DRE no estorno).
3. Corrigir 2.3 (ContasReceber via `useWorkshopContext`).
4. Ajustes P2 do PDF: remover NF/Pedido fixos do fornecedor + renomear/expor "Data da Compra".
5. Corrigir 2.4 (anexo em recorrências) e executar plano de testes da seção 4.

*Aprovado para arquivamento após tratamento dos itens 1–4 acima. Nenhum dado em produção foi alterado durante esta auditoria.*