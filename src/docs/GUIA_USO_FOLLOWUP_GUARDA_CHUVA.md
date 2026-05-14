# 📚 GUIA DE USO: Follow-up Guarda-Chuva

## 🎯 **O QUE É**

Automação que cria follow-ups automáticos para clientes ativos **SEM contato recente**, cobrindo clientes que estavam "fora do radar" do sistema.

---

## ⚙️ **COMO FUNCIONA**

### **Execução Automática:**
```
📅 Quando: Toda segunda-feira às 09:00 (horário de Brasília)
⚙️ Função: criarFollowUpParaClientesSemContato
📊 Origem: FollowUpReminder com origin_type = "guarda_chuva"
```

### **Critérios de Elegibilidade:**

Um cliente recebe follow-up guarda-chuva se:

```
✅ Plano: BRONZE, PRATA, GOLD, IOM ou MILLIONS
✅ Status: ativo
✅ Contrato: ativo ou assinado
✅ SEM FollowUpReminder pendente (últimos 7 dias)
✅ SEM ConsultoriaAtendimento realizado (últimos 30 dias)
✅ SEM ConsultoriaSprint ativa (in_progress ou pending)
```

---

## 🔍 **COMO VERIFICAR SE ESTÁ FUNCIONANDO**

### **1. Verificar Automação**
```
Dashboard → Configurações → Automações
→ Procurar: "Follow-up Guarda-Chuva Semanal"
→ Status: ⚠️ INATIVA (padrão de segurança)
```

### **2. Executar Dry Run (Teste)**
```
Dashboard → Código → Funções → criarFollowUpParaClientesSemContato
→ Executar com payload:
{
  "dry_run": true,
  "lookback_days": 30
}

→ Analisar resultado:
  - workshops_processados: lista de clientes que receberiam FU
  - metrics.elegiveis: quantos são elegíveis
  - metrics.followups_criados: 0 (porque é dry_run)
```

### **3. Ativar Automação**
```
Dashboard → Automações → "Follow-up Guarda-Chuva Semanal"
→ Toggle: ATIVAR
→ Primeira execução: próxima segunda-feira 09:00
```

### **4. Verificar Follow-ups Criados**
```
Central de Follow-up → Filtro: "guarda_chuva"
→ Ver cards criados automaticamente
→ Origem: "preventivo"
```

---

## 📊 **MÉTRICAS ESPERADAS**

### **Payload de Resposta:**
```json
{
  "success": true,
  "timestamp": "2026-05-19T09:00:00-03:00",
  "metrics": {
    "total_workshops": 150,
    "elegiveis": 25,
    "com_fu_recente": 80,
    "com_atendimento_recente": 35,
    "com_sprint_ativa": 8,
    "plano_nao_elegivel": 2,
    "followups_criados": 25,
    "falhas": 0
  },
  "workshops_processados": [
    {
      "workshop_id": "abc123",
      "workshop_name": "P1 Pneus",
      "action": "created",
      "followup_id": "fu456",
      "consultor_id": "consultor789",
      "consultor_nome": "João Silva"
    }
  ]
}
```

### **Interpretação:**
```
total_workshops: 150       → Total de workshops ativos
elegiveis: 25             → Receberão follow-up
com_fu_recente: 80        → Já têm FU, pulados
com_atendimento_recente: 35 → Tiveram atendimento, pulados
com_sprint_ativa: 8       → Têm sprint ativa, pulados
plano_nao_elegivel: 2     → FREE/START, pulados
followups_criados: 25     → Criados com sucesso
falhas: 0                 → Erros de processamento
```

---

## 🎨 **COMO APARECE NA CENTRAL DE FOLLOW-UP**

### **Card de Follow-up:**
```
┌─────────────────────────────────────────┐
│ 📋 P1 Pneus                             │
│                                         │
│ 🏷️ Origem: guarda-chuva                │
│ 📅 Criado: 19/05/2026                  │
│ ⏰ Vencimento: 26/05/2026              │
│                                         │
│ 💬 Mensagem:                            │
│ "Cliente ativo sem contato há 30 dias  │
│  - follow-up preventivo"                │
│                                         │
│ 👤 Consultor: João Silva               │
│ 📍 Status: ⏳ Pendente                  │
│                                         │
│ [Iniciar Atendimento] [Ver Detalhes]   │
└─────────────────────────────────────────┘
```

### **Filtros Disponíveis:**
```
Filtro "Origem":
  ✅ guarda_chuva
  ✅ ata
  ✅ sprint
  ✅ manual
  ✅ suporte
```

---

## 🛠️ **EXECUÇÃO MANUAL (OPCIONAL)**

### **Via Dashboard:**
```
Dashboard → Código → Funções → criarFollowUpParaClientesSemContato
→ Executar
→ Payload:
{
  "dry_run": false,
  "lookback_days": 30,
  "planos_elegiveis": ["BRONZE", "PRATA", "GOLD", "IOM", "MILLIONS"]
}
```

### **Via API:**
```bash
curl -X POST https://api.base44.com/functions/criarFollowUpParaClientesSemContato \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dry_run": false,
    "lookback_days": 30
  }'
```

---

## ⚠️ **CENÁRIOS ESPECIAIS**

### **Cenário 1: Cliente com Múltiplos Consultores**
```
PROBLEMA: Qual consultor recebe o FU?
SOLUÇÃO: 
  1. Prioridade: Contrato ativo (consultor_id do contrato)
  2. Fallback: Último atendimento realizado
  3. Fallback final: Admin que executou
```

### **Cenário 2: Cliente sem Contrato**
```
PROBLEMA: Não tem contrato ativo
SOLUÇÃO: Não cria FU (não elegível)
```

### **Cenário 3: Erro de Processamento**
```
PROBLEMA: Falha ao criar FU para um cliente
SOLUÇÃO: 
  - Loga erro em metrics.erros
  - Continua processando próximos
  - Não interrompe execução
```

### **Cenário 4: Follow-up Duplicado**
```
PROBLEMA: Criar FU duplicado
SOLUÇÃO: 
  - Verifica FU pendente nos últimos 7 dias
  - Se existir, NÃO cria
  - Idempotência garantida
```

---

## 📈 **MONITORAMENTO**

### **Métricas de Sucesso:**
```
✅ Execuções/semana: 1 (segunda 09:00)
✅ Taxa de sucesso: > 95%
✅ Tempo de execução: < 2 minutos
✅ Follow-ups criados: Variável (depende da base)
✅ Falhas: < 5%
```

### **Alertas Configurados:**
```
🔴 Falha na execução → Notificar admin
🟡 Zero FUs criados (base > 50) → Possível problema
🟠 Taxa de falha > 10% → Notificar admin
```

---

## 🔄 **WORKFLOW COMPLETO**

```
Segunda 09:00
    ↓
[criarFollowUpParaClientesSemContato]
    ↓
Varre todos workshops ativos
    ↓
Aplica critérios de elegibilidade
    ↓
Para cada elegível:
  - Identifica consultor
  - Cria FollowUpReminder
  - Track analytics
    ↓
Retorna métricas
    ↓
Follow-up aparece na Central
    ↓
Consultor recebe notificação
    ↓
Consultor executa follow-up
    ↓
Marca como concluído
```

---

## 📝 **EXEMPLOS PRÁTICOS**

### **Exemplo 1: Cliente Elegível**
```
Workshop: P1 Pneus
Plano: GOLD
Último atendimento: 45 dias atrás
Sprint ativa: NÃO
FU pendente: NÃO

RESULTADO: ✅ Cria follow-up guarda-chuva
```

### **Exemplo 2: Cliente NÃO Elegível (Atendimento)**
```
Workshop: Oficina XYZ
Plano: PRATA
Último atendimento: 10 dias atrás
Sprint ativa: NÃO
FU pendente: NÃO

RESULTADO: ❌ NÃO cria (atendimento recente)
```

### **Exemplo 3: Cliente NÃO Elegível (Sprint)**
```
Workshop: Auto Center ABC
Plano: GOLD
Último atendimento: 60 dias atrás
Sprint ativa: SIM (in_progress)
FU pendente: NÃO

RESULTADO: ❌ NÃO cria (sprint ativa)
```

### **Exemplo 4: Cliente NÃO Elegível (Plano)**
```
Workshop: Mecânica Rápida
Plano: FREE
Último atendimento: 90 dias atrás
Sprint ativa: NÃO
FU pendente: NÃO

RESULTADO: ❌ NÃO cria (plano não elegível)
```

---

## 🎯 **BENEFÍCIOS**

### **Para o Negócio:**
```
✅ Cobre clientes "esquecidos"
✅ Aumenta taxa de contato
✅ Reduz churn de clientes ativos
✅ Melhora engajamento
```

### **Para o Consultor:**
```
✅ Lista de follow-ups sempre atualizada
✅ Não precisa lembrar de criar manualmente
✅ Foco em clientes que precisam de contato
✅ Métricas de desempenho claras
```

### **Para o Cliente:**
```
✅ Recebe contato mesmo sem sprint/atendimento
✅ Sente que não foi "esquecido"
✅ Melhor experiência com a consultoria
```

---

## ❓ **FAQ**

### **P: Posso alterar a frequência?**
**R:** Sim. Edite a automação e mude `repeat_interval` ou `start_time`.

### **P: Posso mudar os critérios de elegibilidade?**
**R:** Sim. Edite a função e ajuste os filtros.

### **P: E se não quiser follow-up automático?**
**R:** Desative a automação no dashboard.

### **P: Como sei quantos follow-ups foram criados?**
**R:** Verifique o log de execução da automação ou filtre por "guarda_chuva" na Central.

### **P: Follow-up guarda-chuva expira?**
**R:** NÃO. Segue mesma regra de outros follow-ups (vencimento manual ou ao finalizar).

---

## 📞 **SUPORTE**

**Dúvidas ou problemas:**
- Documentação: `/docs/IMPLEMENTACAO_FOLLOWUP_GUARDA_CHUVA.md`
- Função: `criarFollowUpParaClientesSemContato`
- Automação: "Follow-up Guarda-Chuva Semanal"

---

**ÚLTIMA ATUALIZAÇÃO:** 2026-05-14  
**VERSÃO:** 1.0  
**STATUS:** ✅ Implementado e pronto para uso