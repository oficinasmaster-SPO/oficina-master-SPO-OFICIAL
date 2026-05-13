# 🚀 Guia de Rollout - Sistema de Diagnósticos FASE 6

**Duração Estimada:** 4-6 horas  
**Risco:** BAIXO  
**Recomendação:** Deploy em off-peak (22h-06h)

---

## 📋 PRÉ-REQUISITOS (48 horas antes)

### Verificações Técnicas
```bash
# 1. Backup do banco de dados
mysqldump -u user -p database > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Verificar espaço em disco
df -h

# 3. Verificar conectividade
ping [production_server]

# 4. Monitoramento ligado
# Check: Dashboard, Sentry, DataDog
```

### Testes em Staging
```bash
# 1. Seed de DiagnosticFrequency
POST /functions/seedDiagnosticFrequency

# 2. Testes integrados
POST /functions/testDiagnosticFlows {"test_scenario": "full_integration"}

# 3. Performance test com 1000 itens
# Medir: getDiagnosticHistory response time

# 4. Security audit
# RLS, Input validation, Error handling
```

### Comunicação
- [ ] Notificar consultores: "Deploy amanhã às 23h"
- [ ] Preparar suporte: "Estar disponível 23h-02h"
- [ ] Status page: "Anunciar manutenção"
- [ ] Slack #engineering: "Rollout em progresso"

---

## 🎯 PROCEDIMENTO DE DEPLOY

### 1. Backup + Verificações (22:30)
```
⏱ 5 min
```
```bash
# Backup
mysqldump -u user -p database > backup_prod_$(date +%Y%m%d_%H%M%S).sql
# Armazenar em S3:
aws s3 cp backup_prod_*.sql s3://backups/diagnostics/
```

### 2. Deploy de Código (22:35)
```
⏱ 10 min
```
```bash
# 1. Pull code from main
git pull origin main

# 2. Install dependencies
npm install

# 3. Build
npm run build

# 4. Deploy (zero-downtime se possível)
./deploy.sh --production
```

### 3. Seed de Dados (22:45)
```
⏱ 5 min
```
```bash
# Rodar seed de DiagnosticFrequency
POST /functions/seedDiagnosticFrequency
{
  "plans": ["FREE", "START", "BRONZE", "PRATA", "GOLD", "IOM", "MILLIONS"]
}
```

### 4. Validações Pós-Deploy (22:50)
```
⏱ 10 min
```
```bash
# 1. Health check
curl -X GET https://api.oficinaster.com/health
# Expected: 200 OK

# 2. Testar endpoint novo
curl -X POST https://api.oficinaster.com/functions/getDiagnosticHistory \
  -H "Authorization: Bearer token" \
  -d '{"workshop_id": "test"}'
# Expected: 200 + valid response

# 3. Checar logs
tail -f /var/log/app.log
# Expected: No errors

# 4. Teste da página
Navigate to /HistoricoDiagnosticos
# Expected: Loads in < 2s, data appears
```

### 5. Smoke Tests (23:00)
```
⏱ 15 min
```

#### Test 1: User Comum
```
1. Login como user comum
2. Acessa /HistoricoDiagnosticos
3. Vê seus diagnósticos
4. Filtro de empresa NÃO aparece
✓ PASS
```

#### Test 2: Consultor
```
1. Login como consultor
2. Acessa /HistoricoDiagnosticos
3. Vê todos clientes
4. Filtro de empresa APARECE
✓ PASS
```

#### Test 3: Frequência
```
1. User tenta fazer diagnóstico 2x seguidas
2. 2ª bloqueada: "Próximo em X dias"
✓ PASS
```

#### Test 4: IA
```
1. Plano com IA: Botão aparece
2. Plano sem IA: Botão não aparece
✓ PASS
```

### 6. Comunicação (23:15)
```
⏱ 5 min
```
- [ ] Slack #general: "Deploy completo ✅"
- [ ] Status page: "Sistema online"
- [ ] Email consultores: "Novo recurso disponível"

---

## ⚠️ ROLLBACK (se necessário)

### Se houver erro crítico

```
⏱ 5 min para revert
```

```bash
# 1. Identificar problema
# Check: Sentry, logs, métricas

# 2. Revert código
git revert HEAD
npm run build
./deploy.sh --production

# 3. Revert banco (se necessário)
mysql -u user -p database < backup_prod_[timestamp].sql

# 4. Validar
curl -X GET https://api.oficinaster.com/health

# 5. Comunicar
Slack: "Rollback completo. Investigando causa."
```

---

## 📊 MONITORAMENTO (24 horas pós-deploy)

### Métricas a Acompanhar
| Métrica | Alerta | Check |
|---------|--------|-------|
| Error Rate | > 1% | A cada 15 min |
| Response Time | > 3s | A cada 15 min |
| CPU Usage | > 80% | A cada 30 min |
| Memory | > 90% | A cada 30 min |
| DB Connections | > 80% pool | A cada 30 min |

### Logs a Verificar
```bash
# 1. Errors
tail -f /var/log/app.log | grep ERROR

# 2. Performance
tail -f /var/log/app.log | grep "getDiagnosticHistory"

# 3. API calls
tail -f /var/log/api.log | grep "validateDiagnosticFrequency"
```

### Alertas Automáticos
- [ ] Sentry: New issues
- [ ] DataDog: CPU > 80%
- [ ] CloudWatch: Error rate > 1%
- [ ] PagerDuty: Critical issues

---

## 📞 CONTATOS DURANTE ROLLOUT

| Horário | Responsável | Contato |
|---------|------------|---------|
| 22:30-23:00 | Eng Lead | Slack #engineering |
| 23:00-02:00 | Support Lead | Slack #support |
| 02:00+ | On-Call Dev | PagerDuty |

---

## ✅ CHECKLIST DE ROLLOUT

### Pré-Deploy
- [ ] Backup feito e testado
- [ ] Testes em staging PASS
- [ ] Comunicação enviada
- [ ] Time de suporte online
- [ ] Sentry/DataDog ligado

### Deploy
- [ ] Código deployed
- [ ] Seed executado
- [ ] Health checks PASS
- [ ] Smoke tests PASS
- [ ] Logs verificados

### Pós-Deploy
- [ ] Monitoramento OK
- [ ] Comunicação: "Online"
- [ ] Support: sem tickets críticos
- [ ] Consultores: conseguem usar
- [ ] Users: veem dados corretos

---

## 🎯 Success Criteria

**Rollout é bem-sucedido se:**

✅ Zero downtime  
✅ Error rate < 0.5%  
✅ Response time < 2s  
✅ Users conseguem acessar  
✅ Consultores conseguem filtrar  
✅ Exportação funciona  
✅ Sem tickets críticos em 24h  

---

## 📝 Documentação Pós-Deploy

### Para Consultores
- [ ] Enviar `GUIA_CONSULTOR_DIAGNOSTICOS.md`
- [ ] Agendar webinar de 30 min
- [ ] Listar cases de uso

### Para Suporte
- [ ] Atualizar knowledge base
- [ ] Preparar FAQ
- [ ] Template de resposta

### Para Devs
- [ ] Update API docs
- [ ] Post no Slack #engineering
- [ ] Known issues documentado

---

## 🚨 Problemas Comuns & Soluções

### Problema: "Filtro de empresa não aparece"
**Solução:**
```bash
# 1. Verificar role do usuário
SELECT role FROM User WHERE id = '...'

# 2. Verificar consulting_firm_id
SELECT consulting_firm_id FROM User WHERE id = '...'

# 3. Se missing, atualizar
UPDATE User SET consulting_firm_id = 'XXX' WHERE id = '...'
```

### Problema: "Diagnóstico muito lento"
**Solução:**
```bash
# 1. Checar query performance
EXPLAIN SELECT * FROM EntrepreneurDiagnostic WHERE workshop_id = '...'

# 2. Adicionar índice se faltando
CREATE INDEX idx_workshop ON EntrepreneurDiagnostic(workshop_id);

# 3. Checar cache
redis-cli FLUSHALL (rebuild cache)
```

### Problema: "RLS bloqueando usuário legítimo"
**Solução:**
```bash
# 1. Verificar RLS policy
SELECT * FROM pg_policies WHERE tablename = 'EntrepreneurDiagnostic'

# 2. Testar com usuario
SELECT * FROM EntrepreneurDiagnostic LIMIT 1 AS test_user

# 3. Se necesário, update policy
ALTER POLICY ... ON EntrepreneurDiagnostic ...
```

---

## 📋 Sign-Off

**Deploy realizado por:** ___________________  
**Data/Hora:** ___________________  
**Versão:** 1.0  
**Status:** ✅ COMPLETO

**Revisor:** ___________________  
**Data:** ___________________

---

**Documento:** ROLLOUT_GUIDE.md  
**Versão:** 1.0  
**Último update:** 13/05/2026