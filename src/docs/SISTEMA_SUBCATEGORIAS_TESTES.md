# 📊 Sistema de Subcategorias Dinâmicas DRE - Checklist de Testes

## Visão Geral
Este documento contém o checklist completo para validar o sistema de subcategorias dinâmicas implementado nas Fases 1-8.

---

## ✅ Fase 1: Entidade SubcategoriaDRE

### Testes de Entidade
- [ ] **Entidade criada** - `entities/SubcategoriaDRE.json` existe
- [ ] **Campos obrigatórios** - categoria, label, tipo estão como required
- [ ] **RLS configurada** - Admin pode tudo, workshop cria/lê/atualiza suas subcategorias
- [ ] **Subcategorias globais** - workshop_id = null permite globais
- [ ] **Tipos válidos** - receita/despesa no enum

**Como testar:**
```bash
# Via dashboard Base44
1. Ir em Entities → SubcategoriaDRE
2. Verificar schema JSON
3. Verificar RLS policies
```

---

## ✅ Fase 2: Seed de Subcategorias Padrão

### Testes de Seed
- [ ] **Função existe** - `functions/seedSubcategoriasPadrao.js` criada
- [ ] **Admin-only** - Função verifica `user.role === 'admin'`
- [ ] **52 subcategorias** - Todas as categorias padrão criadas
- [ ] **Execução bem-sucedida** - Rodar função não gera erros
- [ ] **Idempotente** - Rodar 2x não cria duplicatas

**Como testar:**
```javascript
// Via dashboard Base44 → Functions
POST /functions/seedSubcategoriasPadrao
{}

// Esperado: { success: true, created: 52, ignored: 0 }
```

**Verificar no banco:**
```javascript
base44.entities.SubcategoriaDRE.filter({ workshop_id: null })
// Deve retornar ~52 subcategorias globais
```

---

## ✅ Fase 3: Frontend - SubcategoriaSelector

### Testes do Componente
- [ ] **Carrega globais** - Subcategorias globais aparecem no select
- [ ] **Carrega customizadas** - Subcategorias do workshop aparecem
- [ ] **Merge inteligente** - Não duplica subcategorias com mesmo nome
- [ ] **Botão "+"** - Abre modal de criação
- [ ] **Criação funciona** - Nova subcategoria é salva no banco
- [ ] **Labels corretos** - "(global)" e "(custom)" aparecem

**Como testar:**
```
1. Ir em DRE → DRE Avançado
2. Clicar em "+ Receita" ou "+ Despesa"
3. Selecionar categoria
4. Verificar se subcategorias aparecem
5. Clicar em "+" para criar nova
6. Preencher e salvar
7. Verificar se aparece no select
```

---

## ✅ Fase 4: Integração DFC

### Testes de Mapeamento
- [ ] **mapDREtoDFC funciona** - Arquivo `components/dre/mapDREtoDFC.js` existe
- [ ] **Usa categoria pai** - Mapeamento ignora subcategoria
- [ ] **Grupos corretos** - Operacional, Investimento, Financiamento
- [ ] **Documentação** - Comentário explica comportamento

**Como testar:**
```
1. Criar lançamento no DRE com subcategoria
2. Ir em DFC
3. Verificar se lançamento aparece
4. Verificar grupo (operacional/investimento/financiamento)
```

**Exemplo:**
- DRE: categoria="financeiro", subcategoria="Financiamento veículo"
- DFC: grupo="financiamento" ✅

---

## ✅ Fase 5: Integração Budget Control

### Testes de Budget
- [ ] **Totais por categoria** - BudgetMetaTab agrupa por categoria (ignora subcategoria)
- [ ] **Detalhamento** - Subcategorias aparecem como linhas secundárias
- [ ] **Meta vs Real** - Comparação funciona corretamente
- [ ] **Sem quebra** - Budget continua funcional

**Como testar:**
```
1. Ir em Budget Control
2. Criar meta para categoria "operacional"
3. Preencher DRE com subcategorias em "operacional"
4. Verificar se:
   - Total da categoria bate com soma das subcategorias
   - Tabela mostra detalhamento por subcategoria
```

**Exemplo de saída:**
| Item | Meta | Realizado |
|------|------|-----------|
| **Operacional** | R$ 10.000 | R$ 9.500 |
| ↳ Energia Elétrica | | R$ 3.500 |
| ↳ Água | | R$ 1.300 |
| ↳ Aluguel | | R$ 4.700 |

---

## ✅ Fase 6: UI de Gestão de Subcategorias

### Testes da Página de Gestão
- [ ] **Página acessível** - `/GerenciarSubcategorias` existe
- [ ] **Admin-only** - Apenas admin/owner acessam
- [ ] **Lista categorias** - Todas categorias aparecem
- [ ] **Globais read-only** - Subcategorias globais não podem editar
- [ ] **Customizadas editáveis** - Pode editar/deletar/ativar
- [ ] **Criação funciona** - Botão "Nova" cria subcategoria
- [ ] **Toggle ativo** - Switch ativa/desativa subcategoria
- [ ] **Ordenação** - Campo "ordem" funciona

**Como testar:**
```
1. Ir em /GerenciarSubcategorias (admin)
2. Selecionar categoria "operacional"
3. Verificar subcategorias globais (read-only)
4. Clicar em "Nova" para criar customizada
5. Editar subcategoria customizada
6. Alternar switch "Ativo"
7. Deletar subcategoria customizada
```

**Teste de permissão:**
```
1. Login como user comum (não admin, não owner)
2. Tentar acessar /GerenciarSubcategorias
3. Deve mostrar "Acesso Restrito"
```

---

## ✅ Fase 7: Migração de Dados (Backfill)

### Testes de Backfill
- [ ] **Função existe** - `functions/backfillSubcategoriasDRE.js` criada
- [ ] **Admin-only** - Verifica `user.role === 'admin'`
- [ ] **Dry-run** - Modo simulação funciona
- [ ] **Inferência** - Tenta inferir subcategoria da descrição
- [ ] **Cria subcategorias** - Cria novas quando necessário
- [ ] **Atualiza lançamentos** - Preenche campo subcategoria
- [ ] **Sem duplicatas** - Não cria subcategorias repetidas

**Como testar:**
```javascript
// 1. Dry-run (simulação)
POST /functions/backfillSubcategoriasDRE
{
  "workshop_id": "xxx",
  "mes": "2026-05",
  "dry_run": true
}

// Esperado: { success: true, stats: {...}, dry_run: true }

// 2. Execução real
POST /functions/backfillSubcategoriasDRE
{
  "workshop_id": "xxx",
  "mes": "2026-05",
  "dry_run": false
}

// Esperado: { success: true, stats: {...}, message: "Migração concluída" }
```

**Verificar após migração:**
```javascript
// Lançamentos antigos devem ter subcategoria preenchida
base44.entities.DRELancamento.filter({ workshop_id: "xxx", mes: "2026-05" })
// Todos devem ter campo subcategoria preenchido
```

---

## ✅ Fase 8: Testes de Validação Completa

### Testes End-to-End

#### Cenário 1: Criar Lançamento com Subcategoria
```
1. DRE Avançado → "+ Despesa"
2. Categoria: "operacional"
3. Subcategoria: "Energia Elétrica" (global)
4. Preencher valor, descrição
5. Salvar
6. ✅ Lançamento aparece na lista
7. ✅ Subcategoria exibida corretamente
```

#### Cenário 2: Criar Subcategoria Customizada
```
1. DRE Avançado → "+ Despesa"
2. Categoria: "administrativo"
3. Clicar "+" → Criar "Assinatura de software"
4. Salvar
5. ✅ Nova subcategoria aparece no select
6. ✅ Label "(custom)" exibido
```

#### Cenário 3: DFC Integra
```
1. Criar lançamento DRE com subcategoria
2. Ir em DFC
3. ✅ Lançamento aparece no grupo correto
4. ✅ Badge "DRE" exibido
5. ✅ Data vencimento/pagamento propagada
```

#### Cenário 4: Budget Control Integra
```
1. Budget Control → Criar meta para "operacional"
2. Preencher vários lançamentos com subcategorias em "operacional"
3. ✅ Total da categoria = soma das subcategorias
4. ✅ Tabela mostra detalhamento por subcategoria
```

#### Cenário 5: Permissões
```
User Comum:
1. Tentar acessar /GerenciarSubcategorias
2. ✅ "Acesso Restrito"
3. Tentar criar subcategoria via DRE
4. ✅ Consegue (qualquer user pode criar no seu workshop)

Admin:
1. Acessar /GerenciarSubcategorias
2. ✅ Página carrega
3. Criar/editar/deletar subcategorias
4. ✅ Todas operações funcionam
```

#### Cenário 6: Relatórios e Agrupamentos
```
1. DRE Avançado → Preencher mês com várias subcategorias
2. Ver análise consolidada
3. ✅ Totais por categoria estão corretos
4. ✅ TCMP² calcula corretamente
5. ✅ R70/I30 calcula corretamente
```

---

## 📋 Resumo de Status

| Funcionalidade | Teste | Status | Observações |
|---------------|-------|--------|-------------|
| Criar subcategoria global | Admin cria via seed | ⬜ | Fase 2 |
| Criar subcategoria customizada | Workshop cria via UI | ⬜ | Fase 3/6 |
| Lançamento com subcategoria | DRE Avançado → novo | ⬜ | Fase 3 |
| DFC integra | Lançamento aparece no DFC | ⬜ | Fase 4 |
| Budget integra | Totais batem com DRE | ⬜ | Fase 5 |
| Relatórios | Agrupamento por categoria | ⬜ | Fase 8 |
| Permissões | User comum não cria global | ⬜ | Fase 6 |
| Backfill | Migração de dados antigos | ⬜ | Fase 7 |

---

## 🚀 Critérios de Aceite

O sistema é considerado **pronto para produção** quando:

- ✅ **100% dos testes** acima passam
- ✅ **Zero erros** no console do navegador
- ✅ **Zero erros** nos logs das backend functions
- ✅ **Performance aceitável** (< 2s para carregar subcategorias)
- ✅ **RLS funcionando** - users não veem dados de outros workshops
- ✅ **Backfill executado** em dados históricos (opcional)

---

## 📝 Notas de Deploy

### Pré-Deploy
1. Executar `seedSubcategoriasPadrao` em produção
2. Executar `backfillSubcategoriasDRE` (dry-run primeiro)
3. Validar permissões de RLS

### Pós-Deploy
1. Monitorar logs de erro por 24h
2. Verificar performance das queries
3. Coletar feedback dos usuários

### Rollback (se necessário)
1. Desabilitar componente SubcategoriaSelector
2. Reverter para selects estáticos
3. Manter entidade SubcategoriaDRE (não quebra nada)

---

**Documentação criada em:** 2026-05-17  
**Versão:** 1.0  
**Responsável:** Equipe de Desenvolvimento