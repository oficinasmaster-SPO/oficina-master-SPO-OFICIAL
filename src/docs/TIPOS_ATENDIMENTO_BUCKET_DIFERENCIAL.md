# 🎯 TIPOS DE ATENDIMENTO NO BUCKET - O DIFERENCIAL

## ❌ **NÃO, NEM TODOS OS ATENDIMENTOS CRIAM BUCKET**

Monitorias, workshops, e outros tipos de **eventos avulsos** **NÃO** geram bucket.

---

## 🔍 **O DIFERENCIAL: SCHEDULING_TYPE**

A regra que decide se vai pro bucket ou não é:

```javascript
PlanAttendanceRule.scheduling_type
```

### **Dois Tipos Distintos:**

| Type | Nome | Cria Bucket? | Exemplo |
|------|------|-------------|---------|
| **`frequency`** | Frequência fixa | ✅ **SIM** | Semanal (7 dias), Mensal (30 dias) |
| **`event_based`** | Baseado em eventos | ❌ **NÃO** | Workshops, Monitorias, Palestras |

---

## 📊 **EXEMPLO REAL: PLANO PRATA**

### **Frequência (6 regras) — CRIAM BUCKET:**

```
1️⃣ Reunião Semanal
   └─ scheduling_type: "frequency"
   └─ frequency_days: 7
   └─ total_allowed: 1
   └─ ✅ CRIA: 1 ContractAttendance por semana
   └─ LOCALIZAÇÃO: Bucket do Controle de Aceleração

2️⃣ Follow-up quinzenal
   └─ scheduling_type: "frequency"
   └─ frequency_days: 14
   └─ total_allowed: 1
   └─ ✅ CRIA: 1 ContractAttendance a cada 2 semanas
   └─ LOCALIZAÇÃO: Bucket do Controle de Aceleração

... (4 outros tipos semanais)
```

### **Baseado em Calendário (8 regras) — NÃO CRIAM BUCKET:**

```
1️⃣ Workshop Inicial
   └─ scheduling_type: "event_based"
   └─ Busca: EventCalendar (palestras, workshops, etc)
   └─ ❌ NÃO cria bucket automático
   └─ Apenas LISTA eventos que existem no calendário
   └─ Consultor escolhe manualmente qual evento

2️⃣ Mentoria Inicial
   └─ scheduling_type: "event_based"
   └─ Busca: EventCalendar (mentorias)
   └─ ❌ NÃO cria bucket
   └─ Dispara somente quando há um evento agendado

3️⃣ Monitorias Mensais
   └─ scheduling_type: "event_based"
   └─ ❌ NÃO cria bucket (nem gera automaticamente)
   └─ Usa eventos do calendário existentes

... (5 outros tipos baseados em calendário)
```

---

## 🎪 **POR QUÊ ESSA DIFERENÇA?**

### **FREQUENCY — Por quê CRIA bucket?**

✅ **Previsível e contínuo**
- É sempre a mesma coisa
- Acontece regularmente (cada 7 dias, cada 30 dias)
- Precisa ser agendado sempre, sem exceção

```
Contrato começa: 2026-05-13
Frequência: 7 dias, Total: 1 por semana

Bucket gera automaticamente:
├─ 2026-05-13 (semana 1)
├─ 2026-05-20 (semana 2)
├─ 2026-05-27 (semana 3)
├─ 2026-06-03 (semana 4)
...indefinidamente
```

**Não precisa estar no calendário** porque é automático.

---

### **EVENT_BASED — Por quê NÃO cria bucket?**

❌ **Irregular e específico**
- Só acontece em datas especiais (workshops anuais, mentorias pontuais)
- Não é recorrente
- Já está definido no calendário corporativo

```
EventCalendar existem:
├─ 2026-06-15: Workshop Vendas (anual)
├─ 2026-08-20: Mentoria Inicial (sob demanda)
├─ 2026-10-10: Monitorias de Qualidade (trimensal)

Sistema não cria bucket porque:
❌ Já existe data definida no calendário
❌ Não é frequência automática
❌ Consultor conhece quando é
```

**Busca eventos existentes**, em vez de gerar datas automaticamente.

---

## 🔗 **FLUXO TÉCNICO**

### **FREQUENCY (generateContractAttendances)**

```javascript
// PlanAttendanceRule com scheduling_type="frequency"
if (rule.scheduling_type === 'frequency') {
  // Calcula datas automaticamente
  for (let i = 0; i < rule.total_allowed; i++) {
    scheduledDate = contractStartDate + (frequency_days * i)
    
    // CRIA ContractAttendance
    await ContractAttendance.create({
      status: 'pendente',
      scheduled_date: scheduledDate,  // ← data calculada
      consultoria_atendimento_id: null
    })
  }
}
// Resultado: Item aparece no BUCKET aguardando agendamento
```

### **EVENT_BASED (generateContractAttendances)**

```javascript
// PlanAttendanceRule com scheduling_type="event_based"
if (rule.scheduling_type === 'event_based') {
  // Busca eventos já cadastrados no calendário
  const events = await EventCalendar.filter({
    attendance_type_id: rule.attendance_type_id,
    is_active: true
  })
  
  // Para cada evento futuro
  for (const event of events) {
    // Cria ContractAttendance vinculado ao evento
    await ContractAttendance.create({
      status: 'pendente',
      event_calendar_id: event.id,  // ← vinculado a evento existente
      scheduled_date: event.event_date,  // ← data do evento
      consultoria_atendimento_id: null
    })
  }
}
// Resultado: Não aparece "bucket" — aparece na aba de "Eventos do Calendário"
```

---

## 📈 **COMPARAÇÃO NA PRÁTICA**

### **Atendimento de FREQUÊNCIA:**

```
PRATA - "Reunião Semanal"
├─ scheduling_type: "frequency"
├─ frequency_days: 7
├─ total_allowed: 1
└─ RESULTADO: 
   ✅ 52 items no bucket (1 por semana × 52 semanas/ano)
   ✅ Distribuídos automaticamente
   ✅ Consultor agenda TODA semana
   ✅ Aparecem SEMPRE no bucket
```

### **Atendimento de CALENDÁRIO:**

```
PRATA - "Workshop Anual de Vendas"
├─ scheduling_type: "event_based"
├─ total_allowed: 12 (max 12 clientes)
└─ RESULTADO:
   ❌ 0 items no bucket (depende de evento agendado)
   ❌ Só aparece quando há evento no EventCalendar
   ❌ Consultor escolhe qual workshop o cliente vai
   ❌ NÃO aparece no bucket (está em outra aba)
```

---

## 🎪 **ONDE APARECEM?**

### **FREQUENCY — Aparece no:**
```
✅ Controle de Aceleração → ABA "BUCKET DE ATENDIMENTOS"
✅ Relatório de Realização (conta como "pendente/agendado/realizado")
✅ CronogramaImplementacao (mostra como "meta de atendimento")
✅ Dashboard do Cliente (mostra quantos faltam)
```

### **EVENT_BASED — Aparece em:**
```
❌ NÃO aparece no bucket (lista vazia)
✅ Aba "Eventos do Calendário" (se houver evento cadastrado)
✅ RelatoriosAceleração (conta conforme cliente participa)
✅ EventCalendar (calendário de eventos corporativos)
❌ NÃO sincroniza para o bucket
```

---

## 🎯 **RESPOSTA DIRETA PARA SUA PERGUNTA**

### **"Monitorias não criam bucket, correto?"**

✅ **CORRETO!**

**Monitorias** em PRATA têm:
```json
{
  "attendance_type_id": "xxx_monitorias",
  "scheduling_type": "event_based",  // ← NÃO é "frequency"
  "total_allowed": 12  // ← até 12 eventos no ano
}
```

**Por quê NÃO cria bucket?**
- Monitorias são **pontuais** (não recorrentes)
- Estão no **EventCalendar** corporativo
- Sistema **busca eventos existentes**, não **gera datas**
- Consultor **escolhe manualmente** qual monitoria o cliente vai

---

## 📊 **RESUMO: PRATA TEM 14 REGRAS**

```
✅ FREQUENCY (6 tipos) = BUCKET
├─ Reunião Semanal
├─ Follow-up quinzenal
├─ Acompanhamento
├─ Check-in tático
├─ Diagnóstico Trimestral
└─ Revisão de Metas

❌ EVENT_BASED (8 tipos) = NÃO BUCKET
├─ Workshop Inicial
├─ Mentoria Inicial
├─ Monitorias Mensais
├─ Palestras
├─ Treinamentos
├─ Encontros Regionais
├─ Conferências
└─ Eventos Especiais
```

---

## 🔑 **A REGRA-OURO**

```
┌─────────────────────────────────────────────────┐
│  scheduling_type = "frequency"                  │
│           ↓                                      │
│  ✅ GERA ContractAttendance automaticamente     │
│  ✅ APARECE no BUCKET                           │
│  ✅ CONSULTOR agenda toda vez                   │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  scheduling_type = "event_based"               │
│           ↓                                      │
│  ❌ NÃO GERA (busca eventos do calendário)     │
│  ❌ NÃO aparece no BUCKET                       │
│  ❌ APARECE em "Eventos do Calendário"         │
│  ❌ CONSULTOR escolhe qual evento               │
└─────────────────────────────────────────────────┘
```

**Simples assim!** 🎯