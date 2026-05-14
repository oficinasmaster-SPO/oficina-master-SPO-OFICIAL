# 🧪 Checklist de Testes - Regras de Negócio Follow-up

**Data de Execução:** ___/___/___  
**Executor:** ___________________  
**Ambiente:** [ ] Homologação [ ] Produção  
**Versão:** ___

---

## 📋 Cenário 1: Follow-up Futuro (NÃO PODE FINALIZAR)

**Setup:**
- Data de hoje: 2026-05-14
- Follow-up testado: Agendado para 2026-05-20 (6 dias no futuro)

| # | Passo | Resultado Esperado | ✅/❌ | Observações |
|---|-------|-------------------|------|-------------|
| 1.1 | Acessar CentralFollowUp | Página carrega sem erros | [ ] | |
| 1.2 | Localizar follow-up futuro na lista | Follow-up aparece na lista | [ ] | |
| 1.3 | Clicar para visualizar detalhes | Modal/drawer abre normalmente | [ ] | |
| 1.4 | Verificar botão "Iniciar Atendimento" | Botão está CINZA e DESABILITADO | [ ] | |
| 1.5 | Ler texto do botão | Texto: "Aguardando data para finalizar" | [ ] | |
| 1.6 | Verificar alerta âmbar | Alerta visível no topo | [ ] | |
| 1.7 | Ler alerta âmbar | Mensagem informa data e restrição | [ ] | |
| 1.8 | Tentar clicar no botão desabilitado | Botão não responde ao clique | [ ] | |
| 1.9 | Verificar console do navegador | Nenhum erro de JavaScript | [ ] | |
| 1.10 | Verificar se pode ver ATAs | ATAs históricas visíveis | [ ] | |
| 1.11 | Verificar se pode ver histórico | Histórico completo visível | [ ] | |

**Resultado do Cenário 1:** [ ] APROVADO [ ] REPROVADO

---

## 📋 Cenário 2: Follow-up Vencido (PODE FINALIZAR)

**Setup:**
- Data de hoje: 2026-05-14
- Follow-up testado: Agendado para 2026-05-10 (4 dias atrás)

| # | Passo | Resultado Esperado | ✅/❌ | Observações |
|---|-------|-------------------|------|-------------|
| 2.1 | Acessar CentralFollowUp | Página carrega sem erros | [ ] | |
| 2.2 | Localizar follow-up vencido na lista | Follow-up aparece na lista | [ ] | |
| 2.3 | Clicar para visualizar detalhes | Modal/drawer abre normalmente | [ ] | |
| 2.4 | Verificar botão "Iniciar Atendimento" | Botão está VERDE e HABILITADO | [ ] | |
| 2.5 | Ler texto do botão | Texto: "Iniciar Atendimento" | [ ] | |
| 2.6 | Verificar alerta âmbar | Alerta NÃO está visível | [ ] | |
| 2.7 | Clicar em "Iniciar Atendimento" | Modal de atendimento abre | [ ] | |
| 2.8 | Preencher dados do atendimento | Campos aceitam input | [ ] | |
| 2.9 | Clicar em salvar/concluir | Follow-up é finalizado com sucesso | [ ] | |
| 2.10 | Verificar toast de sucesso | Mensagem: "Follow-up registrado com sucesso!" | [ ] | |
| 2.11 | Verificar se foi para "Concluídos" | Follow-up aparece na aba Concluídos | [ ] | |

**Resultado do Cenário 2:** [ ] APROVADO [ ] REPROVADO

---

## 📋 Cenário 3: Follow-up do Dia (PODE FINALIZAR)

**Setup:**
- Data de hoje: 2026-05-14
- Follow-up testado: Agendado para 2026-05-14 (hoje)

| # | Passo | Resultado Esperado | ✅/❌ | Observações |
|---|-------|-------------------|------|-------------|
| 3.1 | Acessar CentralFollowUp | Página carrega sem erros | [ ] | |
| 3.2 | Localizar follow-up do dia na lista | Follow-up aparece na lista | [ ] | |
| 3.3 | Clicar para visualizar detalhes | Modal/drawer abre normalmente | [ ] | |
| 3.4 | Verificar botão "Iniciar Atendimento" | Botão está VERDE e HABILITADO | [ ] | |
| 3.5 | Ler texto do botão | Texto: "Iniciar Atendimento" | [ ] | |
| 3.6 | Verificar alerta âmbar | Alerta NÃO está visível | [ ] | |
| 3.7 | Clicar em "Iniciar Atendimento" | Modal de atendimento abre | [ ] | |
| 3.8 | Preencher dados do atendimento | Campos aceitam input | [ ] | |
| 3.9 | Clicar em salvar/concluir | Follow-up é finalizado com sucesso | [ ] | |
| 3.10 | Verificar toast de sucesso | Mensagem: "Follow-up registrado com sucesso!" | [ ] | |
| 3.11 | Verificar se foi para "Concluídos" | Follow-up aparece na aba Concluídos | [ ] | |

**Resultado do Cenário 3:** [ ] APROVADO [ ] REPROVADO

---

## 📋 Cenário 4: Tentativa de Burlar Validação (handleSave)

**Setup:**
- Follow-up futuro (2026-05-20)
- Console do navegador aberto (F12)

| # | Passo | Resultado Esperado | ✅/❌ | Observações |
|---|-------|-------------------|------|-------------|
| 4.1 | Acessar detalhes do follow-up futuro | Modal aberto | [ ] | |
| 4.2 | Abrir console do navegador | Console visível | [ ] | |
| 4.3 | Identificar função handleSave | Função encontrada no código | [ ] | |
| 4.4 | Chamar handleSave() manualmente via console | Função é executada | [ ] | |
| 4.5 | Verificar toast de erro | Toast aparece: "Este follow-up só pode ser finalizado..." | [ ] | |
| 4.6 | Verificar se follow-up foi finalizado | Follow-up PERMANECE pendente | [ ] | |
| 4.7 | Verificar banco de dados (se possível) | is_completed = false | [ ] | |
| 4.8 | Verificar se não há erro de JavaScript | Console limpo (sem erros vermelhos) | [ ] | |

**Resultado do Cenário 4:** [ ] APROVADO [ ] REPROVADO

---

## 📋 Cenário 5: Tentativa de Burlar Validação (handleLoss)

**Setup:**
- Follow-up futuro (2026-05-20)
- Console do navegador aberto (F12)

| # | Passo | Resultado Esperado | ✅/❌ | Observações |
|---|-------|-------------------|------|-------------|
| 5.1 | Acessar detalhes do follow-up futuro | Modal aberto | [ ] | |
| 5.2 | Abrir console do navegador | Console visível | [ ] | |
| 5.3 | Identificar função handleLoss | Função encontrada no código | [ ] | |
| 5.4 | Chamar handleLoss() manualmente via console | Função é executada | [ ] | |
| 5.5 | Verificar toast de erro | Toast aparece: "Este follow-up só pode ser finalizado..." | [ ] | |
| 5.6 | Verificar se follow-up foi marcado como perda | Follow-up PERMANECE pendente | [ ] | |
| 5.7 | Verificar banco de dados (se possível) | is_completed = false | [ ] | |
| 5.8 | Verificar se não há erro de JavaScript | Console limpo (sem erros vermelhos) | [ ] | |

**Resultado do Cenário 5:** [ ] APROVADO [ ] REPROVADO

---

## 📋 Cenário 6: Follow-up com Rascunho (Borda)

**Setup:**
- Follow-up vencido (2026-05-10)
- Rascunho de atendimento salvo no localStorage

| # | Passo | Resultado Esperado | ✅/❌ | Observações |
|---|-------|-------------------|------|-------------|
| 6.1 | Acessar detalhes do follow-up vencido | Modal aberto | [ ] | |
| 6.2 | Verificar botão "Iniciar Atendimento" | Botão está CIANO e HABILITADO | [ ] | |
| 6.3 | Ler texto do botão | Texto: "Retomar Atendimento" | [ ] | |
| 6.4 | Clicar em "Retomar Atendimento" | Modal de atendimento abre com rascunho | [ ] | |
| 6.5 | Verificar se rascunho foi carregado | Dados do rascunho visíveis | [ ] | |
| 6.6 | Finalizar atendimento | Follow-up é finalizado | [ ] | |

**Resultado do Cenário 6:** [ ] APROVADO [ ] REPROVADO

---

## 📋 Cenário 7: Regressão - Follow-ups Já Concluídos

**Setup:**
- Follow-up já concluído anteriormente

| # | Passo | Resultado Esperado | ✅/❌ | Observações |
|---|-------|-------------------|------|-------------|
| 7.1 | Acessar aba "Concluídos" | Lista carrega | [ ] | |
| 7.2 | Localizar follow-up concluído | Follow-up aparece na lista | [ ] | |
| 7.3 | Clicar para visualizar | Detalhes abrem | [ ] | |
| 7.4 | Verificar status | Status: "Concluído" | [ ] | |
| 7.5 | Verificar se não há botão de finalizar | Botão NÃO aparece | [ ] | |
| 7.6 | Verificar dados do atendimento | Dados completos e legíveis | [ ] | |

**Resultado do Cenário 7:** [ ] APROVADO [ ] REPROVADO

---

## 📋 Cenário 8: Regressão - Filtros e Busca

| # | Passo | Resultado Esperado | ✅/❌ | Observações |
|---|-------|-------------------|------|-------------|
| 8.1 | Testar filtro "Todos" | Mostra todos follow-ups pendentes | [ ] | |
| 8.2 | Testar filtro "Vencidos" | Mostra apenas vencidos | [ ] | |
| 8.3 | Testar filtro "Hoje" | Mostra apenas do dia | [ ] | |
| 8.4 | Testar filtro "Urgentes" | Mostra urgentes (3+ dias vencidos) | [ ] | |
| 8.5 | Testar filtro "Concluídos" | Mostra apenas concluídos | [ ] | |
| 8.6 | Testar busca por cliente | Busca filtra corretamente | [ ] | |
| 8.7 | Verificar contadores | Números corretos em cada filtro | [ ] | |

**Resultado do Cenário 8:** [ ] APROVADO [ ] REPROVADO

---

## 📋 Cenário 9: Performance

| # | Passo | Resultado Esperado | ✅/❌ | Observações |
|---|-------|-------------------|------|-------------|
| 9.1 | Medir tempo de carregamento da página | < 2 segundos | [ ] | ms |
| 9.2 | Medir tempo para abrir detalhes | < 500ms | [ ] | ms |
| 9.3 | Verificar re-renders desnecessários | Sem re-renders excessivos | [ ] | |
| 9.4 | Verificar memória do navegador | Sem vazamento de memória | [ ] | |
| 9.5 | Testar com 50+ follow-ups | Performance permanece boa | [ ] | |

**Resultado do Cenário 9:** [ ] APROVADO [ ] REPROVADO

---

## 📋 Cenário 10: Acessibilidade

| # | Passo | Resultado Esperado | ✅/❌ | Observações |
|---|-------|-------------------|------|-------------|
| 10.1 | Navegar apenas com teclado (Tab) | Navegação funciona | [ ] | |
| 10.2 | Verificar foco no botão desabilitado | Foco visível (ou botão ignora) | [ ] | |
| 10.3 | Testar com leitor de tela | Alerta é lido em voz alta | [ ] | |
| 10.4 | Verificar contraste de cores | Cores atendem WCAG AA | [ ] | |
| 10.5 | Verificar aria-labels | Ícones têm labels | [ ] | |

**Resultado do Cenário 10:** [ ] APROVADO [ ] REPROVADO

---

## 📊 Resumo da Execução

| Cenário | Status |
|---------|--------|
| 1. Follow-up Futuro | [ ] |
| 2. Follow-up Vencido | [ ] |
| 3. Follow-up do Dia | [ ] |
| 4. Burlar handleSave | [ ] |
| 5. Burlar handleLoss | [ ] |
| 6. Follow-up com Rascunho | [ ] |
| 7. Regressão - Concluídos | [ ] |
| 8. Regressão - Filtros | [ ] |
| 9. Performance | [ ] |
| 10. Acessibilidade | [ ] |

**Total Aprovados:** ___ / 10  
**Total Reprovados:** ___ / 10

---

## 🐛 Bugs Encontrados

| ID | Descrição | Severidade | Status |
|----|-----------|------------|--------|
| BUG-001 | | [ ] Baixa [ ] Média [ ] Alta [ ] Crítica | [ ] Aberto [ ] Em Correção [ ] Fechado |
| BUG-002 | | [ ] Baixa [ ] Média [ ] Alta [ ] Crítica | [ ] Aberto [ ] Em Correção [ ] Fechado |
| BUG-003 | | [ ] Baixa [ ] Média [ ] Alta [ ] Crítica | [ ] Aberto [ ] Em Correção [ ] Fechado |

---

## ✅ Aprovação Final

**Parecer do QA:**
- [ ] APROVADO - Pode ir para produção
- [ ] APROVADO COM RESSALVAS - Ir para produção com monitoramento
- [ ] REPROVADO - Voltar para desenvolvimento

**Observações:**
```
_____________________________________________________________________
_____________________________________________________________________
_____________________________________________________________________
```

**Assinaturas:**

| Papel | Nome | Data | Assinatura |
|-------|------|------|------------|
| **QA Executor** | | ___/___/___ | _____________ |
| **QA Lead** | | ___/___/___ | _____________ |
| **Tech Lead** | | ___/___/___ | _____________ |
| **Product Owner** | | ___/___/___ | _____________ |

---

**Status Final:** [ ] APROVADO [ ] REPROVADO