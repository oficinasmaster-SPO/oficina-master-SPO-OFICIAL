# FASE 6: Testes Integrados + Rollout

## 📋 Resumo Executivo

Fase final de validação e deployment do **Sistema Unificado de Gestão de Diagnósticos**. Inclui testes de fluxo completo, performance, segurança, UX e documentação.

---

## 🧪 TESTES INTEGRADOS

### Cenário 1: User Comum (Usuário Final)
**Objetivo:** Validar acesso restrito ao próprio workshop

```
1. User acessa página "Selecionar Diagnóstico"
2. Completa diagnóstico Empreendedor (ex: 5 respostas)
3. Sistema valida:
   ✓ Frequência permitida (1º diagnóstico = sucesso)
   ✓ Campos preenchidos: user_name, company_name, completed_at
4. Acessa "Histórico de Diagnóstico"
5. Vê APENAS seus diagnósticos (RLS ativo)
6. Não vê filtro de empresa (showCompanyFilter = false)
```

**Teste Backend:**
```bash
POST /functions/testDiagnosticFlows
{
  "test_scenario": "user_common"
}
```

**Resultado esperado:**
```json
{
  "scenario": "user_common",
  "status": "PASS",
  "details": {
    "workshop_id": "69bc...",
    "diagnostic_count": 5,
    "user_can_see_others": false,
    "expected": true
  }
}
```

---

### Cenário 2: Consultor (Usuário Admin)
**Objetivo:** Validar acesso a todos clientes da consultoria

```
1. Consultor acessa "Histórico de Diagnóstico"
2. Vê TODOS diagnósticos (sua consultoria)
3. Filtro de empresa aparece (showCompanyFilter = true)
4. Filtra por empresa X
5. Vê apenas diagnósticos de empresa X
6. Dados rastreados: user_name, company_name (preenchidos)
```

**Teste Backend:**
```bash
POST /functions/testDiagnosticFlows
{
  "test_scenario": "consultant"
}
```

**Resultado esperado:**
```json
{
  "scenario": "consultant",
  "status": "PASS",
  "details": {
    "workshops_count": 42,
    "total_diagnostics": 156,
    "can_filter_by_company": true,
    "expected": true
  }
}
```

---

### Cenário 3: Validação de Frequência
**Objetivo:** Bloquear diagnósticos até intervalo mínimo

```
PASSO 1: 1º DIAGNÓSTICO
  User submete 1º diagnóstico
  └─ validateDiagnosticFrequency retorna: allowed: true
  └─ Diagnóstico salvo com completed_at

PASSO 2: 2º DIAGNÓSTICO IMEDIATO (mesma hora)
  User tenta submeter novamente
  └─ validateDiagnosticFrequency retorna:
     allowed: false
     daysRemaining: 30 (padrão Entrepreneur)
     message: "Próximo disponível em 30 dias"
  └─ Diagnóstico BLOQUEADO
  └─ Toast: "Você já completou este diagnóstico. Próximo em 30 dias"

PASSO 3: APÓS X DIAS
  Passam 30 dias
  └─ validateDiagnosticFrequency retorna: allowed: true
  └─ Usuário pode fazer novamente
```

**Teste Backend:**
```bash
POST /functions/testDiagnosticFlows
{
  "test_scenario": "frequency_validation"
}
```

**Resultado esperado:**
```json
{
  "scenario": "frequency_validation",
  "status": "PASS",
  "details": {
    "validation_result": {
      "allowed": false,
      "daysRemaining": 25,
      "message": "You can take this diagnostic again in 25 days"
    },
    "last_diagnostic_date": "2026-05-12T10:30:00Z",
    "blocking_active": true
  }
}
```

---

### Cenário 4: Elegibilidade de Plano IA
**Objetivo:** Mostrar/ocultar botão "Gerar Plano IA" baseado em plano

```
PLANO COM IA ENABLED (ex: GOLD):
  └─ validateIAPlanEligibility retorna:
     canUseIA: true
     ia_plan_enabled_for_this_plan: true
  └─ Botão "Gerar Plano" aparece no resultado
  └─ User clica → Chama generateActionPlanEntrepreneur

PLANO SEM IA (ex: FREE):
  └─ validateIAPlanEligibility retorna:
     canUseIA: false
     ia_plan_enabled_for_this_plan: false
  └─ Botão "Gerar Plano" NÃO aparece
  └─ User vê: "Disponível em planos superiores"

DIAGNÓSTICO SEM SUPORTE IA (ex: DISC):
  └─ has_personalized_action_plan_ia: false
  └─ Seção de IA não aparece (apenas resultados)
```

**Teste Backend:**
```bash
POST /functions/testDiagnosticFlows
{
  "test_scenario": "plan_ia_eligibility"
}
```

**Resultado esperado:**
```json
{
  "scenario": "plan_ia_eligibility",
  "status": "PASS",
  "details": {
    "plan": "GOLD",
    "can_use_ia": true,
    "ia_enabled": true,
    "diagnostic_has_ia_support": true
  }
}
```

---

## 📊 TESTES DE PERFORMANCE

### Carga de Dados
```
Teste: HistoricoDiagnosticos com 1000+ registros
```

**Setup:**
- 50 workshops
- ~20 diagnósticos por workshop
- Total: ~1000 registros

**Métricas:**
- ✓ Carregamento inicial: < 2s
- ✓ Paginação (50 itens/página): < 500ms
- ✓ Filtro de empresa: < 500ms
- ✓ Filtro de data range: < 500ms
- ✓ Múltiplos filtros: < 1s

**Teste Manual:**
```
1. Abrir DevTools (F12)
2. Network tab
3. Abrir HistoricoDiagnosticos
4. Verificar tempo de resposta (getDiagnosticHistory)
5. Aplicar filtros e medir tempo
```

---

## 🔒 TESTES DE SEGURANÇA & PERMISSÕES

### Teste 1: Isolamento de Dados (User A ≠ User B)
```
SETUP:
  User A: workshop_id = "aaa111"
  User B: workshop_id = "bbb222"

TESTE:
  1. User A acessa HistoricoDiagnosticos
  2. System calls getDiagnosticHistory com workshop_id = "aaa111"
  3. User A vê APENAS seus diagnósticos
  4. User A NÃO consegue ver diagnósticos de User B
     (mesmo tentando chamar API com workshop_id = "bbb222")
  5. RLS bloqueia no nível de banco de dados

VALIDAÇÃO:
  ✓ User A: count = 5
  ✓ User B: count = 3
  ✓ Dados isolados corretamente
```

### Teste 2: Controle de Filtros (User não-admin)
```
TESTE:
  1. User comum (role = "user") acessa HistoricoDiagnosticos
  2. showCompanyFilter = false
  3. Filtro de empresa NÃO aparece na UI
  4. Mesmo que UI tente, API recusa dados de outra empresa

VALIDAÇÃO:
  ✓ Filtro removido da UI
  ✓ Backend valida permissão
```

### Teste 3: Validação de API no Backend
```
TESTE validateDiagnosticFrequency:
  1. User faz POST sem workshop_id
     └─ Retorna 400 "Missing workshop_id"
  2. User tenta acessar workshop que não é seu
     └─ RLS bloqueia no nível de banco
  3. User com acesso válido
     └─ Retorna 200 com resultado

VALIDAÇÃO:
  ✓ Validação de entrada
  ✓ RLS aplicado
  ✓ Resposta segura
```

---

## 💅 TESTES DE UX

### Loading States
- [x] HistoricoDiagnosticos: Loader enquanto busca
- [x] Filtros: Toast "Filtros aplicados"
- [x] Exportação CSV: Toast "Relatório exportado"

### Mensagens de Erro
- [x] "Nenhum diagnóstico encontrado" (empty state)
- [x] "Erro ao carregar histórico" (error state)
- [x] "Próximo disponível em X dias" (frequency blocked)
- [x] "Você não tem acesso a este diagnóstico" (permission denied)

### Feedback Visual
- [x] Spinner durante carregamento
- [x] Toast de sucesso/erro
- [x] Indicador de filtros ativos
- [x] Contador total de registros
- [x] Paginação com números

### Tooltips
- [x] Ícone de filtro com label
- [x] Botão "Exportar CSV" com ícone Download
- [x] "Próxima" com icon ChevronRight

---

## 📝 DOCUMENTAÇÃO

### Para Usuários Finais
**Arquivo:** `docs/GUIA_HISTORICO_DIAGNOSTICOS.md`

Cobre:
- Como acessar histórico
- Como filtrar por data/tipo
- Como exportar relatório
- Limitações de frequência
- FAQs

### Para Consultores
**Arquivo:** `docs/GUIA_CONSULTOR_DIAGNOSTICOS.md`

Cobre:
- Acesso a múltiplos clientes
- Filtros avançados
- Interpretação de dados
- Próximos passos recomendados
- Relatórios para apresentação

### Para Desenvolvedores
**Arquivo:** `docs/API_DIAGNOSTIC_FLOWS.md`

Cobre:
- Endpoints disponíveis
- Payloads esperados
- Respostas de erro
- Exemplos de integração
- Performance considerations

---

## 🚀 CHECKLIST DE ROLLOUT

### Pré-Deploy (48h antes)
- [ ] Todos os testes passam
- [ ] Performance validada
- [ ] Documentação pronta
- [ ] Comunicação preparada

### Deploy (produção)
- [ ] Seed de DiagnosticFrequency rodado
- [ ] Migrations executadas
- [ ] Feature flag ativado (opcional)
- [ ] Monitoramento ligado

### Pós-Deploy (24h depois)
- [ ] Zero erros em logs
- [ ] Performance OK
- [ ] Usuários conseguem acessar
- [ ] Consultores conseguem filtrar
- [ ] Documentação acessível

---

## 📊 MÉTRICAS DE SUCESSO

| Métrica | Meta | Status |
|---------|------|--------|
| Testes Integrados | 100% PASS | ⏳ |
| Tempo Carregamento | < 2s | ⏳ |
| Taxa de Erro API | < 0.1% | ⏳ |
| Isolamento de Dados | 100% | ⏳ |
| Satisfação Consultor | > 4.5/5 | ⏳ |

---

## 🔗 Próximos Passos

1. **Hoje:** Executar testes do Cenário 1-4
2. **Amanhã:** Testes de performance e segurança
3. **Dia 3:** Feedback de consultores
4. **Dia 4:** Ajustes finais
5. **Dia 5:** Deploy em produção