# 📅 Plano de Implementação - Regras de Negócio Follow-up Central

**Data de Criação:** 2026-05-14  
**Responsável:** QA Senior & Software Engineering Lead  
**Status:** 🟡 EM PLANEJAMENTO  
**Prioridade:** ALTA

---

## 🎯 Objetivo

Implementar regras de negócio para controle de finalização de follow-ups na Central de FollowUp, garantindo que apenas follow-ups vencidos, atrasados ou do dia possam ser finalizados.

---

## 📊 Visão Geral do Projeto

| Item | Descrição |
|------|-----------|
| **Complexidade** | Média |
| **Esforço Estimado** | 8-12 horas |
| **Risco Técnico** | Baixo |
| **Impacto no Usuário** | Alto (melhora UX e previne erros operacionais) |
| **Dependências** | Nenhuma |

---

## 🗓️ Cronograma de Implementação

### **FASE 1: PREPARAÇÃO (1 hora)**

#### Tarefa 1.1: Análise de Impacto
- [ ] Revisar código atual do `FollowUpDetail`
- [ ] Identificar todos os pontos de finalização
- [ ] Mapear dependências com outros componentes
- **Responsável:** Tech Lead
- **Duração:** 30 min

#### Tarefa 1.2: Setup de Ambiente de Testes
- [ ] Criar dados de teste (follow-ups futuros, vencidos, hoje)
- [ ] Preparar ambiente de homologação
- [ ] Validar acesso aos componentes
- **Responsável:** QA Engineer
- **Duração:** 30 min

---

### **FASE 2: IMPLEMENTAÇÃO CORE (4-6 horas)**

#### Tarefa 2.1: Implementar Variáveis de Controle
**Arquivo:** `components/aceleracao/followups/FollowUpDetail`

```javascript
// Variáveis a serem adicionadas
const canBeFinalized = reminder.is_completed === false && (
  reminder.reminder_date < today ||  // vencido/atrasado
  reminder.reminder_date === today    // ou é do dia
);
const isFuture = reminder.reminder_date > today;
```

- [ ] Adicionar lógica de cálculo de `canBeFinalized`
- [ ] Adicionar lógica de cálculo de `isFuture`
- [ ] Validar timezone (America/Sao_Paulo)
- **Responsável:** Software Engineer
- **Duração:** 45 min
- **Critério de Aceite:** Variáveis calculam corretamente baseadas na data

#### Tarefa 2.2: Implementar Alerta Visual para Follow-ups Futuros
**Arquivo:** `components/aceleracao/followups/FollowUpDetail`

```jsx
{isFuture && (
  <div className="bg-amber-50 border border-amber-200 ...">
    <AlertCircle className="w-5 h-5 text-amber-600" />
    <p>Follow-up agendado para {format(...)} </p>
    <p>Este follow-up ainda não está na data...</p>
  </div>
)}
```

- [ ] Criar componente de alerta
- [ ] Estilizar com cores âmbar (warning)
- [ ] Adicionar ícone AlertCircle
- [ ] Formatarr data de forma legível (dd/MM/yyyy)
- **Responsável:** Frontend Developer
- **Duração:** 45 min
- **Critério de Aceite:** Alerta aparece apenas para follow-ups futuros

#### Tarefa 2.3: Implementar Botão com Validação
**Arquivo:** `components/aceleracao/followups/FollowUpDetail`

```jsx
<Button
  onClick={() => {
    if (!canBeFinalized) {
      toast.error("Este follow-up só pode ser finalizado...");
      return;
    }
    setView("register");
  }}
  disabled={!canBeFinalized}
  className={
    !canBeFinalized
      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
      : temRascunho
        ? "bg-cyan-600 hover:bg-cyan-700 text-white"
        : "bg-green-600 hover:bg-green-700 text-white"
  }
>
  {!canBeFinalized 
    ? "Aguardando data para finalizar" 
    : temRascunho 
      ? "Retomar Atendimento" 
      : "Iniciar Atendimento"}
</Button>
```

- [ ] Adicionar validação no onClick
- [ ] Implementar estado disabled
- [ ] Aplicar estilos condicionais
- [ ] Alterar texto dinamicamente
- **Responsável:** Frontend Developer
- **Duração:** 1h 30min
- **Critério de Aceite:** Botão responde corretamente aos estados

#### Tarefa 2.4: Implementar Validação no handleSave
**Arquivo:** `components/aceleracao/followups/FollowUpDetail`

```javascript
const handleSave = async () => {
  // REGRA DE NEGÓCIO: Impedir finalização de follow-up futuro
  if (!canBeFinalized) {
    toast.error("Este follow-up só pode ser finalizado...");
    return;
  }
  // ... lógica existente
};
```

- [ ] Adicionar validação no início da função
- [ ] Retornar early se não puder finalizar
- [ ] Manter lógica existente intacta
- **Responsável:** Backend/Frontend Developer
- **Duração:** 30 min
- **Critério de Aceite:** Salvamento bloqueado para follow-ups futuros

#### Tarefa 2.5: Implementar Validação no handleLoss
**Arquivo:** `components/aceleracao/followups/FollowUpDetail`

```javascript
const handleLoss = async () => {
  // REGRA DE NEGÓCIO: Impedir finalização de follow-up futuro
  if (!canBeFinalized) {
    toast.error("Este follow-up só pode ser finalizado...");
    return;
  }
  // ... lógica existente
};
```

- [ ] Adicionar validação no início da função
- [ ] Retornar early se não puder finalizar
- [ ] Manter lógica existente intacta
- **Responsável:** Backend/Frontend Developer
- **Duração:** 30 min
- **Critério de Aceite:** Perda bloqueada para follow-ups futuros

#### Tarefa 2.6: Adicionar Import do AlertCircle
**Arquivo:** `components/aceleracao/followups/FollowUpDetail`

```javascript
import {
  ArrowLeft, Phone, Mail, MessageCircle, Calendar, AlertCircle,
  // ... outros imports
} from "lucide-react";
```

- [ ] Verificar se AlertCircle já está importado
- [ ] Adicionar import se necessário
- **Responsável:** Frontend Developer
- **Duração:** 10 min
- **Critério de Aceite:** Ícone renderiza sem erros

---

### **FASE 3: TESTES (3-4 horas)**

#### Tarefa 3.1: Testes Unitários
**Arquivo:** `components/aceleracao/followups/__tests__/FollowUpDetail.test.js`

```javascript
describe('Regra de Negócio - Follow-up Finalização', () => {
  test('deve permitir finalização quando follow-up for vencido', () => {
    // Data hoje: 2026-05-14
    // Data follow-up: 2026-05-10
    expect(canBeFinalized).toBe(true);
  });

  test('deve permitir finalização quando follow-up for do dia', () => {
    // Data hoje: 2026-05-14
    // Data follow-up: 2026-05-14
    expect(canBeFinalized).toBe(true);
  });

  test('deve bloquear finalização quando follow-up for futuro', () => {
    // Data hoje: 2026-05-14
    // Data follow-up: 2026-05-20
    expect(canBeFinalized).toBe(false);
    expect(isFuture).toBe(true);
  });
});
```

- [ ] Criar arquivo de testes
- [ ] Implementar 3 cenários principais
- [ ] Testar variáveis canBeFinalized e isFuture
- [ ] Validar timezone America/Sao_Paulo
- **Responsável:** QA Engineer
- **Duração:** 1h 30min
- **Critério de Aceite:** Todos testes passam ✅

#### Tarefa 3.2: Testes de Integração
**Cenários a testar:**

**Cenário 1: Follow-up Futuro**
```
Setup:
- Data atual: 2026-05-14
- Follow-up: 2026-05-20

Passos:
1. Abrir CentralFollowUp
2. Navegar até follow-up futuro
3. Clicar para visualizar detalhes
4. Tentar clicar em "Iniciar Atendimento"

Resultado Esperado:
- [ ] Botão está desabilitado (cinza)
- [ ] Texto: "Aguardando data para finalizar"
- [ ] Alerta âmbar visível
- [ ] Ao clicar: toast de erro
- [ ] Não abre modal de atendimento
```

**Cenário 2: Follow-up Vencido**
```
Setup:
- Data atual: 2026-05-14
- Follow-up: 2026-05-10

Passos:
1. Abrir CentralFollowUp
2. Navegar até follow-up vencido
3. Clicar para visualizar detalhes
4. Clicar em "Iniciar Atendimento"

Resultado Esperado:
- [ ] Botão está habilitado (verde)
- [ ] Texto: "Iniciar Atendimento"
- [ ] Sem alerta âmbar
- [ ] Abre modal de atendimento
- [ ] Pode finalizar normalmente
```

**Cenário 3: Follow-up do Dia**
```
Setup:
- Data atual: 2026-05-14
- Follow-up: 2026-05-14

Passos:
1. Abrir CentralFollowUp
2. Navegar até follow-up do dia
3. Clicar para visualizar detalhes
4. Clicar em "Iniciar Atendimento"

Resultado Esperado:
- [ ] Botão está habilitado (verde ou ciano)
- [ ] Texto apropriado
- [ ] Sem alerta âmbar
- [ ] Abre modal de atendimento
- [ ] Pode finalizar normalmente
```

**Cenário 4: Tentativa de Burlar via handleSave**
```
Setup:
- Follow-up futuro
- Usuário tenta chamar handleSave manualmente

Passos:
1. Abrir console do navegador
2. Chamar handleSave() manualmente
3. Verificar se validação ocorre

Resultado Esperado:
- [ ] Toast de erro aparece
- [ ] Follow-up NÃO é finalizado
- [ ] Dados permanecem inalterados
```

- [ ] Executar todos cenários
- [ ] Documentar resultados
- [ ] Reportar bugs se encontrados
- **Responsável:** QA Engineer
- **Duração:** 2h
- **Critério de Aceite:** Todos cenários passam ✅

#### Tarefa 3.3: Testes de Regressão
**Verificar se NÃO houve impacto em:**
- [ ] Follow-ups já concluídos
- [ ] Visualização de ATAs
- [ ] Histórico de follow-ups
- [ ] Filtros da lista (todos, vencidos, hoje, etc)
- [ ] Ordenação por data
- [ ] Busca por cliente
- [ ] Outros botões da tela
- [ ] Performance da página
- **Responsável:** QA Engineer
- **Duração:** 1h
- **Critério de Aceite:** Nenhuma regressão detectada

---

### **FASE 4: CODE REVIEW (1 hora)**

#### Tarefa 4.1: Revisão de Código
**Checklist de Review:**

**Qualidade de Código:**
- [ ] Código segue padrões do projeto
- [ ] Variáveis com nomes claros
- [ ] Funções com responsabilidade única
- [ ] Sem código duplicado
- [ ] Imports organizados

**Validações:**
- [ ] Regra aplicada em 3 camadas (UI, Handler, Logic)
- [ ] Mensagens de erro claras
- [ ] Tratamento de timezone correto
- [ ] Edge cases considerados

**Performance:**
- [ ] Sem cálculos desnecessários
- [ ] Sem re-renders excessivos
- [ ] Uso adequado de useMemo/useRef

**Acessibilidade:**
- [ ] Botão desabilitado usa atributo disabled
- [ ] Alerta tem contraste adequado
- [ ] Ícones têm aria-label se necessário

- **Responsável:** Tech Lead / Senior Developer
- **Duração:** 1h
- **Critério de Aceite:** PR aprovado com 2+ aprovações

---

### **FASE 5: DEPLOY (30 min)**

#### Tarefa 5.1: Preparação para Deploy
- [ ] Merge para branch main
- [ ] Validar build sem erros
- [ ] Gerar changelog
- [ ] Atualizar documentação
- **Responsável:** DevOps / Tech Lead
- **Duração:** 15 min

#### Tarefa 5.2: Deploy em Produção
- [ ] Deploy em produção
- [ ] Validar deploy bem-sucedido
- [ ] Monitorar logs de erro
- [ ] Verificar métricas de performance
- **Responsável:** DevOps
- **Duração:** 15 min

---

### **FASE 6: SMOKE TEST EM PRODUÇÃO (30 min)**

#### Tarefa 6.1: Validação Pós-Deploy
**Testes Rápidos:**
- [ ] Acessar CentralFollowUp em produção
- [ ] Testar 1 follow-up futuro
- [ ] Testar 1 follow-up vencido
- [ ] Testar 1 follow-up do dia
- [ ] Verificar se não há erros no console
- **Responsável:** QA Engineer
- **Duração:** 30 min
- **Critério de Aceite:** Funcionalidade operando em produção ✅

---

## 📋 Matriz de Responsabilidades

| Tarefa | Responsável | Aprovador |
|--------|-------------|-----------|
| 1.1 Análise de Impacto | Tech Lead | Engineering Manager |
| 1.2 Setup Testes | QA Engineer | QA Lead |
| 2.1 Variáveis de Controle | Software Engineer | Tech Lead |
| 2.2 Alerta Visual | Frontend Developer | Tech Lead |
| 2.3 Botão Validação | Frontend Developer | Tech Lead |
| 2.4 handleSave | Fullstack Developer | Tech Lead |
| 2.5 handleLoss | Fullstack Developer | Tech Lead |
| 2.6 Imports | Frontend Developer | Tech Lead |
| 3.1 Testes Unitários | QA Engineer | QA Lead |
| 3.2 Testes Integração | QA Engineer | QA Lead |
| 3.3 Testes Regressão | QA Engineer | QA Lead |
| 4.1 Code Review | Tech Lead | Engineering Manager |
| 5.1 Preparação Deploy | DevOps | Tech Lead |
| 5.2 Deploy Produção | DevOps | Engineering Manager |
| 6.1 Smoke Test | QA Engineer | QA Lead |

---

## 🚧 Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Timezone incorreta | Baixa | Alto | Usar date-fns com timezone America/Sao_Paulo |
| Performance degradada | Baixa | Médio | Usar useMemo para cálculos de data |
| Regressão em outras telas | Baixa | Alto | Testes de regressão abrangentes |
| Usuários confusos com nova UI | Média | Baixo | Alertas claros e mensagens informativas |
| Bug em produção | Baixa | Alto | Smoke test antes de liberar para todos |

---

## 📊 Critérios de Aceite Gerais

### **Funcionais:**
- ✅ Follow-ups futuros NÃO podem ser finalizados
- ✅ Follow-ups vencidos podem ser finalizados
- ✅ Follow-ups do dia podem ser finalizados
- ✅ Alerta visual aparece para follow-ups futuros
- ✅ Botão muda de estado corretamente
- ✅ Mensagens de erro são claras

### **Não-Funcionais:**
- ✅ Performance não degradada (< 100ms de impacto)
- ✅ Acessibilidade mantida (WCAG AA)
- ✅ Responsivo (mobile e desktop)
- ✅ Sem erros no console
- ✅ Compatível com browsers suportados

### **Qualidade:**
- ✅ Code review aprovado
- ✅ Testes unitários passando (100%)
- ✅ Testes de integração passando (100%)
- ✅ Sem regressões detectadas
- ✅ Documentação atualizada

---

## 📝 Checklist de Definição de Pronto (DoD)

- [ ] Código implementado
- [ ] Testes unitários criados e passando
- [ ] Testes de integração executados
- [ ] Testes de regressão executados
- [ ] Code review aprovado (2+ aprovações)
- [ ] Deploy em homologação validado
- [ ] Smoke test em produção passado
- [ ] Documentação atualizada
- [ ] Changelog gerado
- [ ] Stakeholders notificados

---

## 🔗 Links e Referências

- **Documentação da Regra:** `docs/REGRAS_NEGOCIO_FOLLOWUP.md`
- **Componente Principal:** `components/aceleracao/followups/FollowUpDetail`
- **Página:** `pages/CentralFollowUp`
- **Testes:** `components/aceleracao/followups/__tests__/FollowUpDetail.test.js` (criar)

---

## 📞 Comunicação

**Updates de Status:**
- Daily: 15 min (time de desenvolvimento)
- Status Report: Ao final de cada fase
- blockers: Imediato via Slack/Teams

**Stakeholders:**
- Product Owner: Acompanha entrega de valor
- Tech Lead: Acompanha qualidade técnica
- QA Lead: Acompanha qualidade dos testes
- Engineering Manager: Acompanha timeline

---

**Assinaturas:**

| Papel | Nome | Data |
|-------|------|------|
| **QA Senior** | [Nome] | 2026-05-14 |
| **Tech Lead** | [Nome] | 2026-05-14 |
| **Engineering Manager** | [Nome] | 2026-05-14 |

---

**Status do Plano:** ✅ APROVADO PARA IMPLEMENTAÇÃO