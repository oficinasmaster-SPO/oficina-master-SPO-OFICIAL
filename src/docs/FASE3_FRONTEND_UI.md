# FASE 3: Frontend + UI

## Componentes Criados

### 1. FollowUpContadorRow.jsx
- **Propósito**: Exibir uma linha de FollowUpContador
- **Mostra**: Número (#1, #2...), origem (bucket/sprint), contexto (reuniões agendadas ou tarefas)
- **Estados**: ativo, atrasado, concluído
- **Local**: `components/aceleracao/followups/FollowUpContadorRow.jsx`

### 2. FollowUpContadorHistorico.jsx
- **Propósito**: Exibir histórico completo com snapshots
- **Expandível**: Cada item do histórico pode expandir para ver métricas
- **Local**: `components/aceleracao/followups/FollowUpContadorHistorico.jsx`

### 3. CentralFollowUp.jsx (Atualizada)
- **Nova Aba**: "Acompanhamento" inserida entre "Por Consultor" e "Concluídos"
- **Fetch**: FollowUpContador.filter()
- **Mostra**: FUs ativos + últimos 5 concluídos

---

## QA FASE 3

### ✅ Checklist de Componentes

- [ ] FollowUpContadorRow.jsx renderiza corretamente
- [ ] FollowUpContadorHistorico.jsx expande/colapsa
- [ ] CentralFollowUp.jsx carrega aba "Acompanhamento"
- [ ] Fetch de FollowUpContador funciona
- [ ] Contador visual (1/4) exibido corretamente
- [ ] Contexto dinâmico exibido (reuniões ou tarefas)

### 🧪 Teste Visual

#### Cenário: Bucket com acompanhamento

1. **Abrir CentralFollowUp**
   - [ ] Aba "Acompanhamento" existe
   
2. **Clicar em "Acompanhamento"**
   - [ ] Lista FUs ativos do consultor
   - [ ] Mostra contador (#1/?)
   - [ ] Contexto mostra: "Reuniões: 3/5 (60%)"
   
3. **Clicar em um FU**
   - [ ] Slide-over ou modal abre
   - [ ] Mostra histórico do FU
   - [ ] Se houver ciclos concluídos: exibe com métricas
   
#### Cenário: Sprint com acompanhamento

1. **Criar sprint e gerar FUs automáticos**
   - [ ] FU #1 aparece em "Acompanhamento"
   - [ ] Badge: "1/?"
   - [ ] Contexto: "Tarefas: 0/12 (0%)"
   
2. **Após 1 semana (cron 2ª-feira)**
   - [ ] FU #2 aparece
   - [ ] FU #1 não desaparece (ambos ativos)
   
3. **Sprint completa**
   - [ ] FU #2 marcado como "Concluído"
   - [ ] Histórico mostra os 2 ciclos
   - [ ] Metricas: "0% → 100% (12/12)"

### 🔍 Validações Críticas

- [ ] RLS: Só mostra FUs do consultor e sua firma
- [ ] Performance: Carrega < 1s mesmo com 100+ FUs
- [ ] Responsivo: Layout funciona em mobile
- [ ] Acessibilidade: Botões com labels claros
- [ ] Estados: Ativos em amarelo, atrasados em vermelho, concluídos em verde

---

## Próxima: FASE 4 (Integração Dashboard + Sincronismo Completo)