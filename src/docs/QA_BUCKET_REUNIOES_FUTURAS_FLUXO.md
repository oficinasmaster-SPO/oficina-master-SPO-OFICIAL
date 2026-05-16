# 🔄 Fluxo Completo: Bucket → Reuniões Futuras

## Estados de um Atendimento

```
┌─────────────────────────────────────────────────────────────────┐
│ ContractAttendance (item gerado automaticamente por contrato)   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Status: "pendente"                                              │
│  ├─ SEM data/horário         → Fica em BUCKET                    │
│  └─ COM data/horário agendado → Sai de BUCKET, entra em         │
│                                 REUNIÕES FUTURAS                 │
│                                                                   │
│  (Linked via: consultoria_atendimento_id quando agendado)       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Visual Completo: 3 Cenários

### 📍 CENÁRIO 1: Atendimento PENDENTE (Sem Data)

```
┌─────────────────────────────────────────┐
│         BUCKET ATENDIMENTOS              │
├─────────────────────────────────────────┤
│                                           │
│ 📌 Oficina ABC Eireli                    │
│    Acompanhamento Mensal                 │
│    ⏱️  Sem data definida                  │
│    📍 Sequência: #1                       │
│                                           │
│    [Agendar] ← Aguardando agendamento    │
│                                           │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      REUNIÕES FUTURAS (Vazio)           │
├─────────────────────────────────────────┤
│                                           │
│ Nenhuma reunião agendada                │
│                                           │
└─────────────────────────────────────────┘
```

**Status na DB:**
- `ContractAttendance.status` = "pendente"
- `ContractAttendance.consultoria_atendimento_id` = NULL
- Visível em: **BUCKET apenas**

---

### 📍 CENÁRIO 2: Clicando "Agendar"

```
┌─────────────────────────────────────────┐
│         BUCKET ATENDIMENTOS              │
├─────────────────────────────────────────┤
│                                           │
│ 📌 Oficina ABC Eireli                    │
│    Acompanhamento Mensal                 │
│    ⏱️  Sem data definida                  │
│    📍 Sequência: #1                       │
│                                           │
│    [Agendar] ← CLICADO                   │
│       ↓                                   │
│    Dialog abre com form:                 │
│    - Data: [    ]                        │
│    - Horário: [    ]                     │
│    - Consultor: [Select]                 │
│                                           │
│    [Cancelar] [Confirmar]                │
│                                           │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      REUNIÕES FUTURAS (Vazio)           │
├─────────────────────────────────────────┤
│                                           │
│ Aguardando confirmação...                │
│                                           │
└─────────────────────────────────────────┘
```

**Status na DB:**
- Nada muda ainda na DB
- Estamos no **dialog local** (state do componente)

---

### 📍 CENÁRIO 3: APÓS Confirmar Agendamento ✅

```
┌─────────────────────────────────────────┐
│         BUCKET ATENDIMENTOS              │
├─────────────────────────────────────────┤
│                                           │
│ 📌 Oficina XYZ Ltda                      │
│    Diagnóstico Inicial                   │
│    ⏱️  Sem data definida                  │
│    📍 Sequência: #1                       │
│                                           │
│    [Agendar]                             │
│                                           │
│ ✅ AGENDADO (saiu da lista abaixo):     │
│    ├─ Oficina ABC Eireli                 │
│    └─ Acompanhamento Mensal              │
│       🟢 16/05/2026 às 14:00             │
│       (agora em REUNIÕES FUTURAS)        │
│                                           │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      REUNIÕES FUTURAS                   │
├─────────────────────────────────────────┤
│                                           │
│ 🟢 16/05 às 14:00                       │
│    Oficina ABC Eireli                    │
│    Acompanhamento Mensal                 │
│    João Silva (Consultor)                │
│    Status: agendado                      │
│                                           │
│ 🟢 17/05 às 10:00                       │
│    Oficina DEF Comércio                  │
│    Reunião Inicial                       │
│    Maria Costa (Consultor)               │
│    Status: confirmado                    │
│                                           │
└─────────────────────────────────────────┘
```

**Status na DB:**

```javascript
// ContractAttendance (item original no Bucket)
{
  id: "ca_123",
  status: "agendado",  // ← Mudou de "pendente"
  consultoria_atendimento_id: "at_456",  // ← Linked
  workshop_id: "w_abc",
  scheduled_date: "2026-05-16"
}

// ConsultoriaAtendimento (nova reunião criada)
{
  id: "at_456",
  workshop_id: "w_abc",
  consultor_id: "u_joao",
  consultor_nome: "João Silva",
  tipo_atendimento: "Acompanhamento Mensal",
  data_agendada: "2026-05-16T14:00:00",
  status: "agendado"
}
```

**Visível em:**
- ❌ BUCKET (item removido da lista)
- ✅ REUNIÕES FUTURAS (aparece aqui)

---

## 📊 Tabela Comparativa: Estados

| Estado | Bucket | Reuniões Futuras | DB Status | UI Ação |
|---|---|---|---|---|
| **Pendente (sem data)** | ✅ Visível | ❌ Oculto | `ContractAttendance.status="pendente"` | Botão "Agendar" |
| **Dialog aberto** | ✅ Visível fundo | ✅ Dialog sobreposto | Nenhuma mudança | Form preenchimento |
| **Agendado** | ❌ Removido | ✅ Visível | `consultoria_atendimento_id` ≠ NULL | Confirmação toast |
| **Confirmado** | ❌ N/A | ✅ Visível | Status = "confirmado" | Badge verde |
| **Realizado** | ❌ N/A | ❌ Filtrado (isFuture=false) | Status = "realizado" | Arquivo histórico |

---

## 🎯 Resposta à Pergunta

### "E as reuniões sem datas e horários no Bucket? Como fica?"

**Resposta Curta:**
- ✅ **Permanecem no Bucket** enquanto estão com status `"pendente"`
- 🔴 **Não aparecem em Reuniões Futuras** (sem data agendada)
- ➡️ **Ao agendar** → Saem do Bucket, entram em Reuniões Futuras

**Fluxo Visual:**
```
Bucket (sem data) 
    ↓ [Click Agendar] 
Dialog (preenchimento) 
    ↓ [Click Confirmar] 
    ├─ ContractAttendance.status = "agendado"
    ├─ ConsultoriaAtendimento criado
    ├─ Bucket: remove item
    └─ Reuniões Futuras: adiciona item
```

---

## ⚙️ Implementação Técnica

### Bucket: Filtra Apenas PENDENTES
```javascript
// BucketAtendimentosTab.jsx linha 34-40
const { data: bucketItems = [] } = useQuery({
  queryKey: ['bucket-atendimentos'],
  queryFn: async () => {
    const items = await base44.entities.ContractAttendance.filter(
      { status: 'pendente' },  // ← Sem data = status pendente
      'scheduled_date',
      500
    );
    return items.filter(i => !i.consultoria_atendimento_id);  // ← Sem link
  }
});
```

**Resultado:**
- Mostra: Atendimentos SEM `consultoria_atendimento_id`
- Oculta: Atendimentos JÁ agendados

### Reuniões Futuras: Filtra Apenas AGENDADAS
```javascript
// ReunioesFuturas.jsx linha 15-30
const { data: atendimentos = [] } = useQuery({
  queryKey: ['atendimentos-acelerador', 'reunioes-futuras', workshopId, consultorId],
  queryFn: async () => {
    const filter = { status: { $in: ['agendado', 'confirmado'] } };
    const list = await base44.entities.ConsultoriaAtendimento.filter(
      filter,
      'data_agendada',
      50
    );
    return list
      .filter(a => isFuture(new Date(a.data_agendada)))  // ← Apenas futuras
      .sort((a, b) => new Date(a.data_agendada) - new Date(b.data_agendada));
  }
});
```

**Resultado:**
- Mostra: ConsultoriaAtendimento COM data no futuro
- Oculta: Atendimentos passados (histórico)

---

## 🔄 Diagrama Fluxo Completo

```
┌─────────────────────────────────────────────────────────────┐
│ ContractAttendance (Gerado automaticamente por contrato)   │
│ status="pendente", consultoria_atendimento_id=NULL         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    [User Click "Agendar"]
                           │
           ┌───────────────┴───────────────┐
           │                               │
      [Dialog]                       [Server]
  Fill: Data, Hora,            Create:
  Consultor              ConsultoriaAtendimento
           │                               │
           └───────────────┬───────────────┘
                           │
                    [Click Confirmar]
                           │
           ┌───────────────┴───────────────┐
           │                               │
    Update ContractAttendance:      Update Query Cache:
    - status = "agendado"        - invalidate bucket
    - consultoria_atendimento_id - invalidate reunioes-futuras
                           │
           ┌───────────────┴───────────────┐
           │                               │
    BUCKET                      REUNIÕES FUTURAS
    (Item removido)             (Nova reunião aparece)
           │                               │
      ❌ Oculto                        ✅ Visível
           │                               │
      Status: agendado              Status: agendado
      Link: at_456 ─────────────────> ID: at_456
```

---

## 💡 Resumo Visual

| Lugar | O que mostra | Quando desaparece |
|---|---|---|
| **Bucket** | Atendimentos SEM data agendada | Ao clicar [Agendar] + confirmar |
| **Reuniões Futuras** | Atendimentos COM data agendada | Data passa (histórico) |

**Resultado final:**
- Bucket sempre mostra itens **pendentes** (aguardando agendamento)
- Reuniões Futuras sempre mostra itens **agendados** com data futura
- **Sem sobreposição** — dados nunca aparecem em ambos