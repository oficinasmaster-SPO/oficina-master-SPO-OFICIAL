# 🔄 Pull Request Template - Regras de Negócio Follow-up

## 📋 Informações Gerais

**Título:** feat(followup): Implementa regras de negócio para finalização de follow-ups

**Descrição:**
Implementa validação que impede a finalização de follow-ups futuros, permitindo apenas follow-ups vencidos, atrasados ou do dia.

**Tipo de Mudança:**
- [ ] 🐛 Bug fix
- [x] ✨ Nova funcionalidade
- [ ] ♻️ Refatoração
- [ ] 🧹 Cleanup
- [ ] 📝 Documentação
- [ ] 🧪 Testes
- [ ] ⚡ Performance

**Issue Relacionada:** #____

---

## 🎯 O que foi implementado

### Mudanças Principais:

1. **Variáveis de Controle** (`FollowUpDetail.jsx`)
   - `canBeFinalized`: Verifica se follow-up pode ser finalizado
   - `isFuture`: Verifica se follow-up está no futuro

2. **Validação em 3 Camadas:**
   - UI: Botão desabilitado visualmente
   - Event Handler: Validação no onClick
   - Business Logic: Validação no handleSave e handleLoss

3. **Feedback Visual:**
   - Alerta âmbar para follow-ups futuros
   - Botão muda de estado (habilitado/desabilitado)
   - Texto dinâmico no botão
   - Toast de erro ao tentar burlar

4. **Documentação:**
   - `docs/REGRAS_NEGOCIO_FOLLOWUP.md`
   - `docs/PLANO_IMPLEMENTACAO_FOLLOWUP.md`
   - `docs/CHECKLIST_TESTES_FOLLOWUP.md`

---

## 🧪 Como Testar

### Setup:
```bash
# 1. Rodar desenvolvimento
npm run dev

# 2. Acessar CentralFollowUp
http://localhost:5173/CentralFollowUp
```

### Cenários de Teste:

#### ✅ Cenário 1: Follow-up Futuro (NÃO PODE FINALIZAR)
```
1. Criar follow-up com data: 2026-05-20 (futuro)
2. Acessar CentralFollowUp
3. Clicar no follow-up futuro
4. Verificar botão "Iniciar Atendimento"

Resultado Esperado:
- Botão CINZA e DESABILITADO
- Texto: "Aguardando data para finalizar"
- Alerta âmbar visível
- Ao clicar: toast de erro
```

#### ✅ Cenário 2: Follow-up Vencido (PODE FINALIZAR)
```
1. Criar follow-up com data: 2026-05-10 (passado)
2. Acessar CentralFollowUp
3. Clicar no follow-up vencido
4. Clicar em "Iniciar Atendimento"
5. Preencher e finalizar

Resultado Esperado:
- Botão VERDE e HABILITADO
- Texto: "Iniciar Atendimento"
- Sem alerta âmbar
- Follow-up finalizado com sucesso
```

#### ✅ Cenário 3: Follow-up do Dia (PODE FINALIZAR)
```
1. Criar follow-up com data: 2026-05-14 (hoje)
2. Acessar CentralFollowUp
3. Clicar no follow-up do dia
4. Clicar em "Iniciar Atendimento"
5. Preencher e finalizar

Resultado Esperado:
- Botão VERDE e HABILITADO
- Texto: "Iniciar Atendimento"
- Sem alerta âmbar
- Follow-up finalizado com sucesso
```

---

## 📸 Screenshots

### Antes:
<!-- Adicionar screenshot do botão antes -->

### Depois - Follow-up Futuro:
<!-- Adicionar screenshot do botão desabilitado com alerta âmbar -->

### Depois - Follow-up Vencido:
<!-- Adicionar screenshot do botão habilitado -->

---

## ✅ Checklist de Qualidade

### Código:
- [x] Código segue padrões do projeto (ESLint, Prettier)
- [x] Variáveis com nomes claros e descritivos
- [x] Funções com responsabilidade única
- [x] Sem código duplicado (DRY)
- [x] Imports organizados
- [x] Comentários apenas onde necessário

### Validações:
- [x] Regra aplicada em 3 camadas
- [x] Mensagens de erro claras e úteis
- [x] Timezone tratada corretamente (America/Sao_Paulo)
- [x] Edge cases considerados

### Performance:
- [x] Sem cálculos desnecessários
- [x] Sem re-renders excessivos
- [x] Uso adequado de useMemo/useRef

### Acessibilidade:
- [x] Botão desabilitado usa atributo `disabled`
- [x] Alerta tem contraste adequado (WCAG AA)
- [x] Ícones têm aria-label

### Testes:
- [ ] Testes unitários criados
- [ ] Testes de integração executados
- [ ] Testes de regressão executados
- [ ] Checklist de testes preenchido

---

## 🔍 Code Review

### Reviewers:
- [ ] @tech-lead
- [ ] @qa-lead
- [ ] @senior-dev

### Áreas de Atenção:
1. Lógica de cálculo de datas (timezone)
2. Validação em camadas
3. Estilização do botão
4. Mensagens de erro

---

## 📊 Impacto

### Impacto no Usuário:
- ✅ Melhora UX ao prevenir erros operacionais
- ✅ Feedback visual claro
- ✅ Mensagens educativas

### Impacto Técnico:
- ⚠️ Baixo impacto (apenas FollowUpDetail)
- ⚠️ Sem breaking changes
- ⚠️ Compatível com versões anteriores

### Performance:
- ➡️ Impacto negligenciável (< 50ms)
- ➡️ Sem impacto em outras telas

---

## 🚀 Deploy

### Pré-Deploy:
- [ ] Changelog atualizado
- [ ] Documentação revisada
- [ ] Stakeholders notificados

### Deploy:
- [ ] Deploy em homologação
- [ ] Smoke test em homologação
- [ ] Aprovação do PO
- [ ] Deploy em produção
- [ ] Smoke test em produção

### Pós-Deploy:
- [ ] Monitorar logs de erro
- [ ] Verificar métricas de performance
- [ ] Coletar feedback dos usuários

---

## 📝 Notas Adicionais

### Decisões Técnicas:
- Usar date-fns para manipulação de datas (já instalado)
- Validação em 3 camadas para segurança
- Alerta âmbar (warning) em vez de vermelho (error)

### Trade-offs:
- Poderia usar modal de confirmação, mas toast é menos intrusivo
- Poderia bloquear navegação, mas usuário deve poder visualizar

### Próximos Passos (Futuro):
- [ ] Adicionar permissão para admin burlar regra
- [ ] Log de tentativas de burlar validação
- [ ] Analytics de quantos follow-ups futuros foram visualizados

---

## 🔗 Referências

- **Documentação da Regra:** `docs/REGRAS_NEGOCIO_FOLLOWUP.md`
- **Plano de Implementação:** `docs/PLANO_IMPLEMENTACAO_FOLLOWUP.md`
- **Checklist de Testes:** `docs/CHECKLISTES_TESTES_FOLLOWUP.md`
- **Componente:** `components/aceleracao/followups/FollowUpDetail`

---

**Status do PR:** [ ] Em Desenvolvimento [ ] Pronto para Review [ ] Aprovado [ ] Mergeado