# 📋 PLANO DE IMPLEMENTAÇÃO: Follow-up Guarda-Chuva

## 🎯 **OBJETIVO**
Criar automação que gera follow-ups automáticos para clientes ativos SEM contato recente, independentemente de terem atendimentos ou sprints registradas.

---

## 🏗️ **ARQUITETURA DA SOLUÇÃO**

### **Componentes:**
```
1. Backend Function: criarFollowUpParaClientesSemContato
2. Scheduled Automation: Toda segunda-feira 09:00
3. Entity: FollowUpReminder (origem_type = "guarda_chuva")
4. Frontend: Central de Follow-up (já suporta)
```

---

## 📝 **ESPECIFICAÇÃO TÉCNICA**

### **1. BACKEND FUNCTION**

**Nome:** `criarFollowUpParaClientesSemContato`

**Gatilho:** Scheduled (Segunda-feira 09:00)

**Responsabilidade:**
- Varre TODOS workshops com plano ativo
- Verifica se tem follow-up pendente nos últimos 7 dias
- Verifica se teve atendimento nos últimos 30 dias
- Cria FollowUpReminder se elegível

**CRITÉRIOS DE ELEGIBILIDADE:**

```javascript
✅ workshop.planoAtual IN ['BRONZE', 'PRATA', 'GOLD', 'IOM', 'MILLIONS']
✅ workshop.status === 'ativo'
✅ Contract.status === 'ativo'
✅ NÃO tem FollowUpReminder pendente criado nos últimos 7 dias
✅ NÃO tem ConsultoriaAtendimento realizado nos últimos 30 dias
✅ NÃO tem ConsultoriaSprint ativa (in_progress/pending)
```

**LÓGICA DE CRIAÇÃO:**

```javascript
Para cada workshop elegível:
  1. Identificar consultor responsável (do último contrato ou admin)
  2. Criar FollowUpReminder com:
     - origin_type: "guarda_chuva"
     - message: "Cliente ativo sem contato recente - follow-up preventivo"
     - reminder_date: hoje + 7 dias
     - sequence_number: 1
     - canal_origem: "preventivo"
  3. Logar analytics para auditoria
```

**PAYLOAD DE ENTRADA:**
```json
{
  "dry_run": false,  // true = só simula, false = cria de verdade
  "lookback_days": 30,
  "planos_elegiveis": ["BRONZE", "PRATA", "GOLD", "IOM", "MILLIONS"]
}
```

**PAYLOAD DE SAÍDA:**
```json
{
  "success": true,
  "timestamp": "2026-05-19T09:00:00-03:00",
  "metrics": {
    "total_workshops": 150,
    "elegiveis": 85,
    "com_fu_recente": 45,
    "com_atendimento_recente": 25,
    "com_sprint_ativa": 10,
    "followups_criados": 5,
    "falhas": 0
  },
  "workshops_processados": [
    {
      "workshop_id": "abc123",
      "workshop_name": "P1 Pneus",
      "action": "created",
      "followup_id": "fu456",
      "consultor_id": "consultor789"
    }
  ],
  "erros": []
}
```

---

### **2. SCHEDULED AUTOMATION**

**Configuração:**
```javascript
automation_type: "scheduled"
name: "Follow-up Guarda-Chuva Semanal"
function_name: "criarFollowUpParaClientesSemContato"
schedule_type: "simple"
repeat_interval: 1
repeat_unit: "weeks"
repeat_on_days: [1]  // Segunda-feira
start_time: "09:00"
is_active: true
```

**Payload Fixo:**
```json
{
  "dry_run": false,
  "lookback_days": 30,
  "planos_elegiveis": ["BRONZE", "PRATA", "GOLD", "IOM", "MILLIONS"]
}
```

---

### **3. ENTITIES ENVOLVIDAS**

**FollowUpReminder (NOVO CAMPO):**
```json
{
  "origin_type": {
    "type": "string",
    "enum": ["ata", "sprint", "manual", "suporte", "suporte_checkin", "guarda_chuva"]
    // ✅ ADICIONAR "guarda_chuva"
  }
}
```

**Query de Verificação:**
```javascript
// Verificar se já tem FU recente
const fuRecente = await base44.entities.FollowUpReminder.filter({
  workshop_id: workshop.id,
  origin_type: "guarda_chuva",
  is_completed: false
});

// Verificar atendimento recente
const atendimentoRecente = await base44.entities.ConsultoriaAtendimento.filter({
  workshop_id: workshop.id,
  status: ["realizado", "concluido"],
  data_realizada: { $gte: dataHoje - 30 dias }
});

// Verificar sprint ativa
const sprintAtiva = await base44.entities.ConsultoriaSprint.filter({
  workshop_id: workshop.id,
  status: ["in_progress", "pending"]
});
```

---

## ✅ **CRITÉRIOS DE ACEITE (QA)**

### **CENÁRIO 1: Cliente Elegível**
```
DADO: Workshop "P1 Pneus" com plano GOLD ativo
E: NÃO tem follow-up pendente nos últimos 7 dias
E: NÃO tem atendimento nos últimos 30 dias
E: NÃO tem sprint ativa
QUANDO: Segunda-feira 09:00
ENTÃO: Deve criar 1 FollowUpReminder "guarda_chuva"
E: Atribuir ao consultor responsável
E: reminder_date = hoje + 7 dias
```

### **CENÁRIO 2: Cliente NÃO Elegível (Plano FREE)**
```
DADO: Workshop com plano FREE
QUANDO: Segunda-feira 09:00
ENTÃO: NÃO deve criar follow-up
```

### **CENÁRIO 3: Cliente NÃO Elegível (Atendimento Recente)**
```
DADO: Workshop com atendimento realizado há 10 dias
QUANDO: Segunda-feira 09:00
ENTÃO: NÃO deve criar follow-up
```

### **CENÁRIO 4: Cliente NÃO Elegível (FU Pendente)**
```
DADO: Workshop com follow-up pendente criado há 5 dias
QUANDO: Segunda-feira 09:00
ENTÃO: NÃO deve criar follow-up
```

### **CENÁRIO 5: Cliente NÃO Elegível (Sprint Ativa)**
```
DADO: Workshop com sprint status "in_progress"
QUANDO: Segunda-feira 09:00
ENTÃO: NÃO deve criar follow-up
```

### **CENÁRIO 6: Dry Run**
```
DADO: dry_run = true
QUANDO: Executar função
ENTÃO: NÃO deve criar follow-ups
E: Deve retornar métricas de simulação
```

### **CENÁRIO 7: Múltiplos Clientes Elegíveis**
```
DADO: 5 workshops elegíveis
QUANDO: Segunda-feira 09:00
ENTÃO: Deve criar 5 FollowUpReminder
E: Um para cada consultor responsável
```

### **CENÁRIO 8: Erro de Processamento**
```
DADO: Workshop sem consultor responsável definido
QUANDO: Segunda-feira 09:00
ENTÃO: Deve logar erro
E: Não criar follow-up
E: Continuar processando próximos
```

---

## 🧪 **PLANO DE TESTES**

### **TESTES UNITÁRIOS (Backend)**

```javascript
// Test 1: Verifica critérios de elegibilidade
test('deve considerar cliente elegível quando sem contato recente', async () => {
  const workshop = createWorkshop({ plano: 'GOLD', status: 'ativo' });
  const result = await verificarElegibilidade(workshop.id);
  expect(result.elegivel).toBe(true);
});

// Test 2: Verifica plano não elegível
test('deve rejeitar cliente com plano FREE', async () => {
  const workshop = createWorkshop({ plano: 'FREE' });
  const result = await verificarElegibilidade(workshop.id);
  expect(result.elegivel).toBe(false);
  expect(result.motivo).toBe('plano_nao_elegivel');
});

// Test 3: Verifica atendimento recente
test('deve rejeitar cliente com atendimento recente', async () => {
  const workshop = createWorkshop({ plano: 'GOLD' });
  createAtendimento({ workshop_id: workshop.id, data: 10 dias atras });
  const result = await verificarElegibilidade(workshop.id);
  expect(result.elegivel).toBe(false);
  expect(result.motivo).toBe('atendimento_recente');
});

// Test 4: Verifica FU pendente
test('deve rejeitar cliente com FU pendente', async () => {
  const workshop = createWorkshop({ plano: 'GOLD' });
  createFollowUp({ workshop_id: workshop.id, is_completed: false, created: 5 dias atras });
  const result = await verificarElegibilidade(workshop.id);
  expect(result.elegivel).toBe(false);
  expect(result.motivo).toBe('fu_pendente');
});

// Test 5: Dry run não cria registros
test('dry_run não deve criar follow-ups', async () => {
  const result = await criarFollowUpParaClientesSemContato({ dry_run: true });
  expect(result.metrics.followups_criados).toBe(0);
  expect(result.success).toBe(true);
});
```

### **TESTES DE INTEGRAÇÃO**

```javascript
// Test 1: Fluxo completo com 1 cliente elegível
test('deve criar follow-up para cliente elegível', async () => {
  setupWorkshop('P1 Pneus', 'GOLD');
  await executarSegundaFeira0900();
  const fus = await getFollowUps('P1 Pneus');
  expect(fus.length).toBe(1);
  expect(fus[0].origin_type).toBe('guarda_chuva');
});

// Test 2: Múltiplos clientes
test('deve processar múltiplos clientes', async () => {
  setupWorkshops([
    { name: 'P1', plan: 'GOLD', elegivel: true },
    { name: 'P2', plan: 'FREE', elegivel: false },
    { name: 'P3', plan: 'PRATA', elegivel: true }
  ]);
  const result = await executarSegundaFeira0900();
  expect(result.metrics.followups_criados).toBe(2);
});

// Test 3: Idempotência (não duplicar)
test('não deve duplicar follow-up se já existe', async () => {
  setupWorkshop('P1', 'GOLD');
  await executarSegundaFeira0900(); // Cria FU #1
  await executarSegundaFeira0900(); // Não deve criar FU #2
  const fus = await getFollowUps('P1');
  expect(fus.length).toBe(1);
});
```

### **TESTES E2E (Frontend + Backend)**

```javascript
// Test 1: Follow-up aparece na Central
test('follow-up guarda-chuva deve aparecer na Central de Follow-up', async () => {
  // Setup
  const workshop = createWorkshop('P1 Pneus', 'GOLD');
  await criarFollowUpParaClientesSemContato({ dry_run: false });
  
  // Frontend
  navigateTo('/CentralFollowUp');
  const card = await findByText('P1 Pneus');
  expect(card).toBeInTheDocument();
  expect(card).toHaveTextContent('guarda-chuva');
});

// Test 2: Filtro por origem
test('deve filtrar follow-ups por origem guarda-chuva', async () => {
  navigateTo('/CentralFollowUp');
  await clickFilter('guarda_chuva');
  const cards = await findAllByTestId('followup-card');
  cards.forEach(card => {
    expect(card).toHaveTextContent('guarda-chuva');
  });
});
```

---

## 📊 **MÉTRICAS DE SUCESSO**

### **Métricas de Execução:**
```
✅ Taxa de sucesso: > 95% (falhas < 5%)
✅ Tempo de execução: < 2 minutos
✅ Idempotência: 0 duplicatas
✅ Cobertura de testes: > 80%
```

### **Métricas de Negócio:**
```
✅ Clientes cobertos: 100% dos elegíveis
✅ Follow-ups criados/semana: Variável (depende da base)
✅ Redução de clientes "esquecidos": > 50%
```

---

## 🚀 **PLANO DE ROLLOUT**

### **FASE 1: Desenvolvimento (3 dias)**
```
Dia 1:
  ✅ Criar função backend
  ✅ Implementar lógica de elegibilidade
  ✅ Implementar criação de FollowUpReminder

Dia 2:
  ✅ Criar testes unitários
  ✅ Criar testes de integração
  ✅ Documentar função

Dia 3:
  ✅ Code review
  ✅ Ajustes pós-review
  ✅ Deploy em staging
```

### **FASE 2: Testes QA (2 dias)**
```
Dia 1:
  ✅ Executar testes unitários
  ✅ Executar testes de integração
  ✅ Validar critérios de aceite

Dia 2:
  ✅ Testes E2E
  ✅ Testes de carga (1000 workshops)
  ✅ Aprovação QA
```

### **FASE 3: Produção (1 dia)**
```
Dia 1:
  ✅ Deploy em produção
  ✅ Criar automação scheduled (INATIVA)
  ✅ Executar dry_run para validar
  ✅ Ativar automação
  ✅ Monitorar primeira execução
```

### **FASE 4: Monitoramento (1 semana)**
```
Dia 1-7:
  ✅ Monitorar execuções automáticas
  ✅ Verificar métricas de sucesso
  ✅ Coletar feedback dos consultores
  ✅ Ajustar se necessário
```

---

## 🔍 **MONITORAMENTO PÓS-IMPLANTAÇÃO**

### **Alertas Configurados:**
```javascript
// Alerta 1: Falha na execução
IF execucao.status === 'error'
THEN enviar_notificacao(admin)

// Alerta 2: Zero follow-ups criados (suspeito)
IF execucao.metrics.followups_criados === 0
  AND execucao.metrics.total_workshops > 50
THEN enviar_notificacao(admin, 'Possível problema - 0 FUs criados')

// Alerta 3: Muitas falhas
IF execucao.metrics.falhas / execucao.metrics.total_workshops > 0.1
THEN enviar_notificacao(admin, 'Taxa de falha > 10%')
```

### **Dashboard de Acompanhamento:**
```
Métricas Semanais:
- Follow-ups criados
- Workshops processados
- Taxa de sucesso
- Consultores impactados
- Clientes cobertos
```

---

## 📋 **CHECKLIST DE IMPLANTAÇÃO**

### **Pré-implantação:**
- [ ] Função backend criada e testada
- [ ] Testes unitários passando (100%)
- [ ] Testes de integração passando
- [ ] Code review aprovado
- [ ] Documentação atualizada
- [ ] Entity FollowUpReminder atualizada (enum "guarda_chuva")

### **Implantação:**
- [ ] Deploy em produção
- [ ] Criar automação scheduled
- [ ] Executar dry_run
- [ ] Validar métricas do dry_run
- [ ] Ativar automação
- [ ] Aguardar primeira execução automática

### **Pós-implantação:**
- [ ] Verificar primeira execução
- [ ] Validar follow-ups criados
- [ ] Testar na Central de Follow-up
- [ ] Coletar feedback
- [ ] Ajustar se necessário
- [ ] Documentar lições aprendidas

---

## 🎯 **RISCOS E MITIGAÇÕES**

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Criar FUs duplicados | Baixa | Alto | Idempotência + unique constraint |
| Performance ruim (>5min) | Média | Médio | Paginação + batch processing |
| Consultor não definido | Média | Baixo | Fallback para admin + log erro |
| Muitos FUs criados | Alta | Baixo | Limitar a 1 FU por workshop/semana |
| Dry_run não funciona | Baixa | Médio | Testar exaustivamente antes |

---

## 📞 **STAKEHOLDERS**

- **Product Owner:** [Nome]
- **Tech Lead:** [Nome]
- **QA Lead:** [Nome]
- **Dev Team:** [Nomes]
- **Consultores:** [Equipe de CS]

---

## 📅 **CRONOGRAMA**

```
Semana 1:
  Seg-Ter: Desenvolvimento
  Qua-Qui: Testes QA
  Sex: Code review + ajustes

Semana 2:
  Seg: Deploy + ativação
  Ter-Sex: Monitoramento
```

---

## ✅ **DEFINIÇÃO DE PRONTO (DoD)**

```
✅ Código implementado e testado
✅ Testes unitários passando (cobertura > 80%)
✅ Testes de integração passando
✅ Testes E2E passando
✅ Code review aprovado
✅ Documentação atualizada
✅ Deploy em produção
✅ Automação ativa e monitorada
✅ Métricas de sucesso atingidas
```

---

**ÚLTIMA ATUALIZAÇÃO:** 2026-05-14  
**VERSÃO:** 1.0  
**STATUS:** ✅ Aprovado para implementação