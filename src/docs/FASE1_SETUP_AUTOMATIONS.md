# FASE 1: Setup Automações

## Automação 1: Bucket Criado → FU #1

**Type**: Entity Automation  
**Entity**: ConsultoriaSprint (ou bucket entity)  
**Event**: create  
**Function**: createFollowUpContador  

```javascript
// Payload a enviar para createFollowUpContador
{
  "workshop_id": "{{event.data.workshop_id}}",
  "consultor_id": "{{event.data.consultor_id}}",
  "consultor_nome": "{{event.data.consultor_nome}}",
  "origem_tipo": "bucket",
  "origem_id": "{{event.entity_id}}",
  "origem_nome": "{{event.data.title}}",
  "action": "create"
}
```

## Automação 2: Sprint Criada → FU #1

**Type**: Entity Automation  
**Entity**: ConsultoriaSprint  
**Event**: create  
**Function**: createFollowUpContador  

```javascript
// Payload
{
  "workshop_id": "{{event.data.workshop_id}}",
  "consultor_id": "{{event.data.consultor_id}}",
  "consultor_nome": "{{event.data.consultor_nome}}",
  "origem_tipo": "sprint",
  "origem_id": "{{event.entity_id}}",
  "origem_nome": "{{event.data.title}}",
  "action": "create"
}
```

---

## QA FASE 1

### ✅ Checklist

- [ ] Entity FollowUpContador criada no dashboard
- [ ] Função `createFollowUpContador` deploy ok
- [ ] Função `closeFollowUpContador` deploy ok
- [ ] Automação 1 ativa (bucket.created)
- [ ] Automação 2 ativa (sprint.created)

### 🧪 Teste Manual

1. **Criar um bucket/sprint** (via UI ou API)
2. **Verificar**: Deve aparecer 1 FollowUpContador criado
   - [ ] numero_sequencia = 1
   - [ ] status = "ativo"
   - [ ] data_criacao preenchida
   - [ ] contexto vazio (preenchido em FASE 2)

3. **Testar closeFollowUpContador**
   ```bash
   curl -X POST http://localhost:3000/api/functions/closeFollowUpContador \
     -H "Content-Type: application/json" \
     -d '{
       "fu_id": "xxx",
       "motivo_fechamento": "Teste manual",
       "snapshot": { "reunioes_agendadas": 5, "reunioes_total": 5 }
     }'
   ```
   - [ ] status muda para "concluido"
   - [ ] data_baixa preenchida
   - [ ] historico tem 1 item
   - [ ] duracao calculada corretamente

4. **Validar RLS**: Apenas consultor/admin consegue ler seu próprio FU

---

## Próxima: FASE 2 (Cron + Sincronismo)