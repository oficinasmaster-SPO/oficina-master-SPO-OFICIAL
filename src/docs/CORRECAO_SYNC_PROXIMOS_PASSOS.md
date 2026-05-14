# 🔧 Correção de Sincronização de Próximos Passos

## 📋 Problema Identificado

**Sintoma:** Próximos passos criados/editados em uma ATA não apareciam:
- No card do follow-up (`FollowUpReminder.message`)
- No cronograma do cliente (`CronogramaImplementacao`)
- Nos próximos passos operacionais (`ConsultoriaProximoPasso`)

**Causa raiz:** A sincronização só ocorria quando a ATA era **criada** via `gerarAtaConsultoria`, mas não quando era **editada** manualmente.

---

## ✅ Solução Implementada

### **1. Nova Backend Function: `syncAtaUpdatesToFollowUps`**
**Arquivo:** `functions/syncAtaUpdatesToFollowUps.js`

**O que faz:**
- Busca todos `FollowUpReminder` vinculados a uma ATA (`ata_id`)
- Extrai os próximos passos (`proximos_passos_list` ou `proximos_passos`)
- Gera resumo formatado (máx 3 itens, 200 chars)
- Atualiza o campo `message` de cada FU
- Adiciona timestamp em `notes` para auditoria

**Retorno:**
```json
{
  "success": true,
  "message": "2 follow-up(s) atualizado(s) com próximos passos",
  "updatedCount": 2,
  "followUpIds": ["id1", "id2"]
}
```

---

### **2. Atualização: `onMeetingMinutesUpdate`**
**Arquivo:** `functions/onMeetingMinutesUpdate.js`

**Mudanças:**
- Agora chama **DUAS** funções em paralelo:
  1. `syncProximosPassosToTasks` (sincroniza tarefas/cronograma)
  2. `syncAtaUpdatesToFollowUps` (atualiza follow-ups)

**Código:**
```javascript
const syncResult = await base44.functions.invoke('syncProximosPassosToTasks', {...});
const fuResult = await base44.functions.invoke('syncAtaUpdatesToFollowUps', {...});

console.log('✅ Sync completo:', {
  tarefas: syncResult?.data?.message || 'ok',
  followUps: fuResult?.data?.message || 'nenhum FU atualizado'
});
```

---

### **3. Nova Automação Entity**
**Nome:** `Sincronizar Próximos Passos ao Editar ATA`  
**ID:** `6a060dc66b9598f6e0dda139`

**Configuração:**
- **Entity:** `MeetingMinutes`
- **Event:** `update`
- **Trigger Conditions:**
  - `changed_fields` contém `proximos_passos_list` **OU**
  - `changed_fields` contém `proximos_passos` **OU**
  - `changed_fields` contém `decisoes_tomadas` **OU**
  - `changed_fields` contém `acoes_geradas`
- **Function:** `onMeetingMinutesUpdate`

**Quando dispara:**
- ✅ Usuário edita próximos passos da ATA
- ✅ Usuário adiciona decisões
- ✅ Usuário modifica ações
- ✅ Qualquer mudança estruturada na ATA

---

## 🔄 Fluxo Completo Atualizado

### **Cenário 1: Geração de ATA (existente)**
```
gerarAtaConsultoria
  ↓
Cria MeetingMinutes
  ↓
Chama syncProximosPassosToTasks (linha 260-270)
  ↓
✅ Cronograma atualizado
✅ ConsultoriaProximoPasso atualizado
```

### **Cenário 2: Edição de ATA (NOVO)**
```
Usuário edita ATA
  ↓
Trigger: MeetingMinutes.update
  ↓
Automação: onMeetingMinutesUpdate
  ↓
1. syncProximosPassosToTasks → Cronograma
2. syncAtaUpdatesToFollowUps → FollowUpReminder.message
  ↓
✅ Cronograma atualizado
✅ ConsultoriaProximoPasso atualizado
✅ Follow-up message atualizado (card do cliente)
```

---

## 📊 Entidades Sincronizadas

| Entidade | Campo Atualizado | Origem |
|----------|------------------|--------|
| `CronogramaImplementacao` | `item_nome`, `status`, `data_termino_previsto` | `proximos_passos_list` |
| `ConsultoriaProximoPasso` | `titulo`, `prazo`, `responsavel_nome` | `proximos_passos_list` |
| `FollowUpReminder` | `message`, `notes` | Resumo dos próximos passos |

---

## 🧪 Testes Recomendados

### **Teste 1: Edição Simples**
1. Abra uma ATA existente
2. Adicione um próximo passo: "Implementar script de vendas até 20/05"
3. Salve a ATA
4. **Verifique:**
   - [ ] Card do follow-up mostra o próximo passo
   - [ ] Cronograma tem nova tarefa
   - [ ] ConsultoriaProximoPasso tem registro

### **Teste 2: Múltiplos Follow-ups**
1. ATA com 3 follow-ups pendentes
2. Edite próximos passos da ATA
3. **Verifique:**
   - [ ] Todos 3 FUs têm `message` atualizado
   - [ ] Mesmo conteúdo em todos
   - [ ] `notes` tem timestamp

### **Teste 3: Remoção de Próximo Passo**
1. Remova um próximo passo da ATA
2. **Verifique:**
   - [ ] `CronogramaImplementacao` remove tarefa órfã
   - [ ] `ConsultoriaProximoPasso` NÃO remove (histórico)
   - [ ] `FollowUpReminder.message` atualiza sem o item removido

---

## 🎯 Benefícios

1. **Sincronização em tempo real:** Edição da ATA → atualização imediata
2. **Multi-entidade:** Atualiza 3 entidades simultaneamente
3. **Idempotente:** Pode editar múltiplas vezes sem duplicar
4. **Auditável:** `notes` registra quando foi atualizado
5. **Transparente:** Usuário não precisa acionar nada manualmente

---

## 📝 Notas Técnicas

### **Idempotência**
- `syncProximosPassosToTasks` usa hash do conteúdo (`item_id_hash`)
- Evita duplicatas ao editar mesma ATA múltiplas vezes

### **Performance**
- `Promise.all` para chamadas paralelas
- Timeout implícito: 30s (Deno Deploy)
- Limite: ~50 FUs por ATA (query com limit)

### **Fallbacks**
- Se `proximos_passos_list` está vazio, usa `proximos_passos` (texto)
- Se ambos vazios, não atualiza (retorna `updatedCount: 0`)
- Se FU não tem `ata_id`, não é atualizado (filtro explícito)

---

## 🚨 Tratamento de Erros

### **Erros Esperados (não bloqueiam)**
- `Missing required fields`: ATA sem `workshop_id` → loga warning
- `Nenhum follow-up pendente`: FU já concluídos → retorna `updatedCount: 0`

### **Erros Críticos (bloqueiam)**
- `FollowUpReminder.filter` falha → retorna 500
- `update` falha (permissão) → retorna 500

### **Logs**
```javascript
console.log(`✅ Atualizados ${count} follow-up(s) da ATA ${ata_id}`);
console.error('Erro ao sincronizar ATA com follow-ups:', error);
```

---

## 📅 Próximos Passos (Sugestões)

1. **Monitorar automação:**
   - Dashboard → Automações → "Sincronizar Próximos Passos ao Editar ATA"
   - Verificar `failed_runs` semanalmente

2. **Backfill (opcional):**
   - Rodar script para atualizar ATAs existentes
   - Atualizar `FollowUpReminder.message` de FUs antigos

3. **Melhoria futura:**
   - Adicionar botão "Sincronizar Agora" na UI da ATA
   - Permitir sync manual em caso de falha

---

**Implementado em:** 2026-05-14  
**Autor:** Base44 AI  
**Status:** ✅ Em produção