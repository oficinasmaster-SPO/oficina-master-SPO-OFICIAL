# 🎯 LÓGICA DO BUCKET DE ATENDIMENTOS - FLUXO COMPLETO

## ✅ **SIM, EXISTE A ABA "BUCKET DE ATENDIMENTO"**

**Local:** Página `ControleAceleracao` → Tab `BucketAtendimentosTab`

---

## 📊 **VISÃO GERAL DO FLUXO**

```
┌─────────────────────────────────────────────────────────────────┐
│  1. CONTRATO ATIVADO (Contract.status = "ativo")                 │
│     └─ Dispara: generateContractAttendances()                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. BUSCA REGRAS DO PLANO (PlanAttendanceRule)                   │
│     └─ Pega contract.plan_type (PRATA, GOLD, MILLIONS, etc)     │
│     └─ Filtra: plan_id = PRATA, is_active = true               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. PARA CADA REGRA, CALCULA DATAS DE ATENDIMENTO               │
│     ┌──────────────────┴──────────────────┐                     │
│     │                                      │                     │
│     ↓                                      ↓                     │
│  POR FREQUÊNCIA              POR CALENDÁRIO/EVENTOS              │
│  (frequency)                 (event_based)                       │
│     │                                      │                     │
│     ├─ Frequência: 7 dias   ├─ Busca EventCalendar              │
│     ├─ Sequência 1→N        ├─ Filtra datas futuras             │
│     ├─ Início: contrato     ├─ Pega os N próximos eventos       │
│     └─ Cria N atendimentos  └─ Cria 1 por evento                │
│                                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. CRIA ContractAttendance (BUCKET)                             │
│     └─ status = "pendente"                                       │
│     └─ consultoria_atendimento_id = NULL (ainda não agendado)   │
│     └─ scheduled_date = DATA CALCULADA                           │
│     └─ sequence_number = 1, 2, 3... (ordem)                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  5. BUCKET DE ATENDIMENTOS RENDERIZA                             │
│     └─ Mostra: ContractAttendance com status='pendente'         │
│     └─ Filtra: consultoria_atendimento_id = NULL (sem link)    │
│     └─ Ordena: scheduled_date (data prevista)                   │
│     └─ Cada item tem: Workshop, Tipo, Data, Botão "Agendar"   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  6. CONSULTOR CLICA "AGENDAR"                                    │
│     └─ Dialog abre com: Data, Hora, Consultor                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  7. CRIA ConsultoriaAtendimento (REUNIÃO REAL)                  │
│     └─ status = "agendado"                                       │
│     └─ data_agendada = DATA + HORA escolhida                    │
│     └─ consultor_id = Consultor selecionado                     │
│     └─ workshop_id = Workshop do cliente                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  8. ATUALIZA ContractAttendance (LINK)                           │
│     └─ status = "agendado"                                       │
│     └─ consultoria_atendimento_id = <ID da reunião> (LINK)     │
│     └─ Sai do BUCKET (não aparece mais como pendente)           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 **SINCRONIZAÇÕES COM OUTRAS TELAS**

### **1. → CronogramaImplementacao**
**Função:** `syncPlanAttendancesToCronograma()`

**O que sincroniza:**
- Para cada regra de atendimento do plano
- Cria/atualiza item no `CronogramaImplementacao`
- Campo: `item_tipo: "atendimento"`
- Campo: `item_nome: "{TipoAtendimento} (Nx)"` (Ex: "Reunião Mensal (12x)")

**Sincronizado com:**
- Página `CronogramaImplementacao`
- Página `Cronograma Geral`
- Mostra no cronograma do cliente quais atendimentos estão previstos

---

### **2. → ConsultoriaAtendimento**
**Ocorre quando:** Consultor clica "Agendar" no bucket

**O que cria:**
```javascript
{
  workshop_id: "...",
  tipo_atendimento: "acompanhamento_mensal",
  status: "agendado",
  consultor_id: "...",
  data_agendada: "2026-05-15T14:00:00",
  participantes: [],
  pauta: [],
  objetivos: []
}
```

**Sincronizado com:**
- Página `RegistrarAtendimento` (onde preenche pauta, atas, etc)
- `Dashboard` (mostra atendimentos agendados)
- `CentralFollowUp` (para follow-ups gerados da ata)

---

### **3. → ContractAttendance (DOUBLE LINK)**
**Depois que agendado:**
```javascript
{
  consultoria_atendimento_id: "<ID da reunião criada>", // ← LINK
  status: "agendado"
}
```

**Sincronizado com:**
- Página `Controle de Aceleração` (sai do bucket, entra no histórico)
- Relatórios (para contar quantos foram realizados)
- `PainelClienteAceleração` (dashboard do cliente)

---

### **4. → OperationalSync**
**Função:** `useOperationalSync()` em `BucketAtendimentosTab`

**O que faz:**
- Depois que agendamento é salvo
- Invalida cache de:
  - `bucket-atendimentos` (recarrega o bucket)
  - `atendimentos-acelerador` (atualiza lista de agendados)
- Dispara sincronização geral (`invalidateAll()`)

---

## 📋 **EXEMPLO PRÁTICO: PLANO PRATA**

### **Cenário:**
- Contrato PRATA ativado em: 2026-05-13
- Regra 1: Frequência = 7 dias, Total = 1 (semanal, 1 por semana)
- Regra 2: Frequência = 30 dias, Total = 12 (mensal, 12 ao ano)

### **Resultado no Bucket:**
```
BUCKET (ContractAttendance com status='pendente'):

Item 1: Reunião Semanal #1
  → scheduled_date: 2026-05-13
  → attendance_type_id: <ID regra semanal>
  
Item 2: Reunião Mensal #1
  → scheduled_date: 2026-05-13
  → attendance_type_id: <ID regra mensal>

Item 3: Reunião Mensal #2
  → scheduled_date: 2026-06-12
  → attendance_type_id: <ID regra mensal>

Item 4: Reunião Mensal #3
  → scheduled_date: 2026-07-12
  → attendance_type_id: <ID regra mensal>

... (até Item 13)
```

### **Consultor Agendando:**
1. Clica em "Agendar" no Item 1 (Reunião Semanal)
2. Dialog abre:
   - Data: 2026-05-13 (pré-preenchida)
   - Hora: 09:00 (padrão)
   - Consultor: Seleciona (ex: João)
3. Clica "Confirmar"
4. Sistema cria:
   - `ConsultoriaAtendimento` novo (ID: abc123)
   - Atualiza `ContractAttendance`:
     - `consultoria_atendimento_id: "abc123"`
     - `status: "agendado"`
5. Item some do bucket
6. Aparece na aba "Atendimentos Agendados"

---

## 🔌 **SINCRONIZAÇÕES DETALHADAS**

### **Telas/Páginas Que Consomem Bucket:**

| Tela | Como usa | Campo | Status |
|------|----------|-------|--------|
| **ControleAceleração** | Mostra bucket com filtros | ContractAttendance.status='pendente' | ✅ Ativa |
| **PainelClienteAceleração** | Widgets de atendimentos | Busca ContractAttendance + ConsultoriaAtendimento | ✅ Ativa |
| **DashboardTempoAtencao** | Calcula tempo médio | ConsultoriaAtendimento.data_agendada | ✅ Ativa |
| **RelatoriosAceleração** | Relatório de realização | ContractAttendance.status ∈ ['agendado', 'realizado'] | ✅ Ativa |
| **CronogramaImplementacao** | Mostra progress | CronogramaImplementacao.item_tipo='atendimento' | ✅ Via Sync |

---

## 🔧 **COMO A REGRA FUNCIONA INTERNAMENTE**

### **PlanAttendanceRule Structure:**
```json
{
  "plan_id": "PRATA",
  "attendance_type_id": "69cd95705ae3749bbbaf1ba2",
  "attendance_type_name": "Reunião Semanal",
  "total_allowed": 1,
  "scheduling_type": "frequency",  // ← TEM OU "event_based"
  "frequency_days": 7,             // ← Dias entre cada atendimento
  "start_from_contract_date": true,
  "allow_anticipation": true,
  "is_active": true
}
```

### **Lógica de Cálculo (Frequência):**
```javascript
// Para cada sequência (0, 1, 2, ... até total_allowed-1)
for (let i = 0; i < rule.total_allowed; i++) {
  scheduledDate = contractStartDate.clone()
  scheduledDate.addDays(frequency_days * i)  // Adiciona frequência * índice
  
  // Resultado:
  // i=0: contractStart + (7 * 0) = 2026-05-13
  // i=1: contractStart + (7 * 1) = 2026-05-20
  // i=2: contractStart + (7 * 2) = 2026-05-27
  // ...
}
```

---

## ⚡ **RESUMO: O QUE DISPARA O BUCKET**

1. **Admin ativa contrato** → Dispara `generateContractAttendances()`
2. **Sistema busca PlanAttendanceRule** para o plan_type do contrato
3. **Para cada regra:**
   - Se `frequency` → Cria N ContractAttendance com datas espaçadas
   - Se `event_based` → Cria 1 por evento futuro do calendário
4. **Bucket renderiza** todos com `status='pendente'` e sem `consultoria_atendimento_id`
5. **Consultor agenda** → Cria ConsultoriaAtendimento + Link
6. **Item sai do bucket** → Status muda para 'agendado'

---

## 🎯 **RESPOSTA CURTA PARA A PERGUNTA**

**SIM**, o bucket EXISTE e a lógica funciona assim:

1. **Regras** estão em `PlanAttendanceRule` (configuradas por plano)
2. **Geração automática** acontece em `generateContractAttendances()` (disparada ao ativar contrato)
3. **Sincronizações** com:
   - `CronogramaImplementacao` (mostra no cronograma)
   - `ConsultoriaAtendimento` (quando agendado)
   - `ContractAttendance` (double link)
   - `OperationalSync` (cache/invalidação)
4. **Bucket renderiza** em `BucketAtendimentosTab` dentro de `ControleAceleracao`

**Tudo está integrado e sincronizado.** ✅