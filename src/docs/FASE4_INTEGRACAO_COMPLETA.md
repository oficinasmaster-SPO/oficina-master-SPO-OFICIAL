# FASE 4: Integração Completa + Dashboard

## 1. Widget na Home

### FollowUpContadorWidget.jsx
- **Local**: Adicionar à Home/Dashboard
- **Mostra**: FUs ativos desta semana
- **Alerta**: Se houver atrasados (vermelho)
- **Ação**: Link para /CentralFollowUp?tab=acompanhamento

**Integração no Home.jsx:**
```jsx
<div className="grid grid-cols-3 gap-4">
  {/* ... outros widgets ... */}
  <FollowUpContadorWidget />
</div>
```

---

## 2. BucketPanel: Mostrar FU Ativo

### Atualizar BucketPanel.jsx

Adicionar seção no header:
```jsx
// Busca FU ativo deste bucket
const fuAtivo = followUpContadores?.find(f =>
  f.origem_id === bucket.id &&
  f.origem_tipo === 'bucket' &&
  f.status === 'ativo'
);

// Renderizar no header
{fuAtivo && (
  <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
    <Badge>Follow-up {fuAtivo.numero_sequencia}/{fuAtivo.total_esperado}</Badge>
    <div className="text-xs text-gray-600">
      {fuAtivo.contexto.reunioes_agendadas}/{fuAtivo.contexto.reunioes_total} reuniões agendadas
    </div>
  </div>
)}
```

---

## 3. SprintClientSection: Mostrar FU Ativo

### Atualizar SprintClientSection.jsx

Adicionar widget com progresso:
```jsx
// Busca FU ativo da sprint
const fuAtivo = followUpContadores?.find(f =>
  f.origem_id === sprint.id &&
  f.origem_tipo === 'sprint' &&
  f.status === 'ativo'
);

// Renderizar com barra de progresso
{fuAtivo && (
  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium">Acompanhamento</span>
      <Badge>#{fuAtivo.numero_sequencia}</Badge>
    </div>
    <ProgressBar
      value={fuAtivo.contexto.tarefas_concluidas}
      max={fuAtivo.contexto.tarefas_total}
      className="mb-2"
    />
    <p className="text-xs text-gray-600">
      {fuAtivo.contexto.tarefas_concluidas}/{fuAtivo.contexto.tarefas_total} tarefas
    </p>
  </div>
)}
```

---

## 4. Atualizar Automações (Deploy Final)

### Automação: Bucket.updated → checkBucketCompletion
```
Function: checkBucketCompletion
Event: ConsultoriaSprint.update
Payload: { "bucket_id": "{{event.entity_id}}" }
```

### Automação: Sprint.updated → checkSprintCompletion
```
Function: checkSprintCompletion
Event: ConsultoriaSprint.update
Payload: { "sprint_id": "{{event.entity_id}}" }
```

### Cron: Segunda-feira 08:00
```
Function: criarFollowUpContadorSemanal
Schedule: Weekly, every Monday at 08:00
```

---

## QA FASE 4: END-TO-END

### ✅ Checklist Completo

**Setup**
- [ ] Todas as 6 funções deployadas
- [ ] Todas as 3 automações ativas
- [ ] Entity FollowUpContador criada
- [ ] Widget FollowUpContadorWidget no Home

**Fluxo Bucket (Reuniões)**
- [ ] 1. Criar bucket com 5 reuniões
  - [ ] FU #1 criado automaticamente
  - [ ] status = "ativo"
  - [ ] numero_sequencia = 1
  - [ ] contexto.reunioes_agendadas = 0
  - [ ] contexto.reunioes_total = 5

- [ ] 2. Próxima segunda 08:00 (ou trigger manual cron)
  - [ ] FU #2 criado
  - [ ] numero_sequencia = 2
  - [ ] historico do FU #1 vazio (ainda ativo)

- [ ] 3. Agendar 3/5 reuniões
  - [ ] Nada muda nos FUs
  - [ ] contexto não atualizado (não é automático em FASE 4)

- [ ] 4. Agendar últimas 2 reuniões (5/5)
  - [ ] Sistema detecta: todas reuniões têm data
  - [ ] FU #2 marcado como "concluido"
  - [ ] data_baixa preenchida
  - [ ] historico[0].numero = 2
  - [ ] historico[0].motivo_fechamento = "Todas 5 reuniões agendadas"

- [ ] 5. CentralFollowUp → Acompanhamento
  - [ ] FU #2 não aparece em "Ativos"
  - [ ] FU #2 aparece em "Histórico (últimos 5)"
  - [ ] Histórico mostra:
    - [ ] "#2 - Todas 5 reuniões agendadas"
    - [ ] "7 dias de duração" (ou quanto passou)
    - [ ] Expandir mostra métricas e snapshot

**Fluxo Sprint (Acompanhamento Semanal)**
- [ ] 1. Criar sprint com 12 tarefas
  - [ ] FU #1 criado
  - [ ] contexto.tarefas_concluidas = 0
  - [ ] contexto.tarefas_total = 12

- [ ] 2. Próxima segunda
  - [ ] FU #2 criado
  - [ ] Sprint ainda "in progress"

- [ ] 3. Mais uma semana
  - [ ] FU #3 criado

- [ ] 4. Marcar sprint como "completed"
  - [ ] FU #3 marcado como "concluido"
  - [ ] historico[0].numero = 3
  - [ ] metricas.ciclos_necessarios = 3

- [ ] 5. Dashboard mostra:
  - [ ] Home Widget: "3 acompanhamentos ativos" (ou menos se concluídos)
  - [ ] SprintClientSection: Barra de progresso 100%
  - [ ] BucketPanel: Badge com "Follow-up concluído"

**Validações Críticas**

- [ ] **Tenant Safety**: FUs de outra consultoria NUNCA aparecem
- [ ] **Idempotência**: Rodar cron 2x não duplica FU (verifica data_ciclo_inicio)
- [ ] **Histórico**: Nunca perde dados, append-only
- [ ] **Performance**: Cron 2ª-feira com 1000+ FUs < 5s
- [ ] **RLS**: Apenas consultor/admin da firma consegue ver
- [ ] **Contexto**: Dinâmico, reflete estado atual (reuniões/tarefas)
- [ ] **UI Responsivo**: Funciona em mobile/tablet/desktop
- [ ] **Sincronismo**: Automações acionadas < 2s após evento

---

## Próximas Melhorias (Não Fase 4)

- [ ] Atualizar contexto automaticamente (cada 2h check)
- [ ] Notificações: alerta quando FU ficar atrasado
- [ ] Analytics: gráfico de "quantas semanas leva em média"
- [ ] Revisão de Sprint: criar novo FU automaticamente
- [ ] Integração Google Calendar: acompanhamento de reuniões
- [ ] Export: relatório PDF com histórico completo

---

## Documento de Deploy

### Ordem de Deploy

1. **Backend (4 funções)**
   ```
   - createFollowUpContador
   - closeFollowUpContador
   - checkBucketCompletion
   - checkSprintCompletion
   - criarFollowUpContadorSemanal
   ```

2. **Entity**
   ```
   - FollowUpContador
   ```

3. **Frontend (3 componentes)**
   ```
   - FollowUpContadorRow
   - FollowUpContadorHistorico
   - FollowUpContadorWidget
   ```

4. **UI Updates**
   ```
   - FollowUpsTab.jsx (adicionar aba)
   - Home.jsx (adicionar widget)
   - BucketPanel.jsx (opcional - FASE 5)
   - SprintClientSection.jsx (opcional - FASE 5)
   ```

5. **Automações (3)**
   ```
   - Bucket.updated → checkBucketCompletion
   - Sprint.updated → checkSprintCompletion
   - Cron: Segunda 08:00 → criarFollowUpContadorSemanal
   ```

---

## Rollback Plan

Se algo der errado:

1. **Desativar automações** (via dashboard)
2. **Keep entity** (dados são valiosos)
3. **Remove widget** (comentar ou remover do Home)
4. **Keep functions** (podem ser reutilizadas)
5. **Contate o time** para debug

---

END OF PHASE 4