# FASE 2: Sincronismo (Automações + Cron)

## Automação 1: Bucket Atualizado → Verifica Conclusão

**Type**: Entity Automation  
**Entity**: ConsultoriaSprint  
**Event**: update  
**Function**: checkBucketCompletion  
**Trigger Conditions** (opcional):
```javascript
{
  "logic": "and",
  "conditions": [
    { "field": "data.origem_tipo", "operator": "equals", "value": "bucket" },
    // Se quiser ser mais específico: verifica se há mudança em datas de reuniões
  ]
}
```

```javascript
// Payload
{
  "bucket_id": "{{event.entity_id}}"
}
```

---

## Automação 2: Sprint Atualizada → Verifica Conclusão

**Type**: Entity Automation  
**Entity**: ConsultoriaSprint  
**Event**: update  
**Function**: checkSprintCompletion  
**Trigger Conditions**:
```javascript
{
  "logic": "and",
  "conditions": [
    { "field": "data.origem_tipo", "operator": "equals", "value": "sprint" },
    { "field": "changed_fields", "operator": "contains", "value": "status" }
  ]
}
```

```javascript
// Payload
{
  "sprint_id": "{{event.entity_id}}"
}
```

---

## Agendamento 3: Cron Semanal (2ª-feira 08:00)

**Type**: Scheduled Automation  
**Schedule**: Toda segunda-feira às 08:00 (Brasília)  
**Function**: criarFollowUpContadorSemanal  

```javascript
// Sem payload necessário
{}
```

**Configuração no Base44:**
- Schedule Type: Simple
- Repeat Unit: weeks
- Repeat Interval: 1
- Repeat on Days: [1] (segunda = 1)
- Start Time: 08:00

---

## QA FASE 2

### ✅ Checklist de Implantação

- [ ] Função `checkBucketCompletion` deploy ok
- [ ] Função `checkSprintCompletion` deploy ok
- [ ] Função `criarFollowUpContadorSemanal` deploy ok
- [ ] Automação "Bucket Atualizado" ativa
- [ ] Automação "Sprint Atualizada" ativa
- [ ] Agendamento "Cron Semanal" ativo

### 🧪 Teste de Sincronismo

#### Cenário A: Bucket (5 reuniões)

1. **Criar bucket** com 5 reuniões (sem datas)
   - [ ] FU #1 criado automaticamente
   
2. **Segunda-feira 08:00** (ou trigger manual do cron)
   - [ ] FU #2 criado (semanal)
   - [ ] FU #1 fica "ativo"

3. **Agendar 3 de 5 reuniões**
   - [ ] Nada muda (bucket ainda tem pendências)

4. **Agendar as 2 últimas reuniões**
   - [ ] FU #2 é marcado como "concluido"
   - [ ] data_baixa preenchida
   - [ ] historico tem 1 item
   - [ ] motivo: "Todas 5 reuniões agendadas"

**Esperado**:
```json
{
  "fu_concluido": 2,
  "historico_total": 1,
  "dias_duracao": 7,
  "metricas": {
    "evolucao": "0% → 100% (5/5)",
    "ciclos_necessarios": 2
  }
}
```

#### Cenário B: Sprint (acompanhamento)

1. **Criar sprint** com 12 tarefas
   - [ ] FU #1 criado

2. **Próxima segunda 08:00**
   - [ ] FU #2 criado

3. **Mais uma semana**
   - [ ] FU #3 criado

4. **Marcar sprint como completed**
   - [ ] FU #3 é marcado como "concluido"
   - [ ] metricas.ciclos_necessarios = 3
   - [ ] metricas.velocidade = "X tarefas em Y dias"

**Esperado**:
```json
{
  "fu_concluido": 3,
  "dias_duracao": 14,
  "tarefas": { "concluidas": 12, "total": 12 },
  "metricas": {
    "evolucao": "0% → 100% (12/12)",
    "velocidade": "12 tarefas em 14 dias",
    "eficiencia": "100.0% concluído"
  }
}
```

### 🔍 Validações Críticas

- [ ] RLS: Apenas admins/consultores conseguem criar FUs de sua firma
- [ ] Tenant Isolation: Nenhum FU de outra consultoria aparece
- [ ] Histórico: Nunca perde dados, append-only
- [ ] Idempotência: Rodar cron 2x não cria FU duplicado (verifica data_ciclo_inicio)
- [ ] Performance: Cron com 1000+ FUs leva < 5s

---

## Próxima: FASE 3 (Frontend + UI)