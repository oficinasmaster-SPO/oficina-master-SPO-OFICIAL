# QA: Teste de Impersonação - Checklist Definitivo

## 🎯 Objetivo
Verificar que ao impersonar um usuário, o admin vê **EXATAMENTE** os dados do usuário alvo, não do admin.

---

## ✅ Teste 1: Dados do Usuário Impersonado
**Pré-requisito**: Estar logado como admin

1. **Ir para UsuariosAdmin**
   - [ ] Navegar para `/UsuariosAdmin` 
   - [ ] Verificar que é página admin (só admins veem)

2. **Abrir UserDetailsDrawer de um usuário normal**
   - [ ] Clicar no usuário para abrir drawer
   - [ ] Clicar em "Impersonar" (botão laranja)
   - [ ] Verificar que a URL tem `?impersonate=USER_ID`
   - [ ] Verificar banner **IMPERSONAÇÃO** apareça no topo em vermelho

3. **Verificar dados pessoais**
   - [ ] Nome exibido é do usuário **alvo**, não do admin
   - [ ] Email exibido é do usuário **alvo**, não do admin
   - [ ] CPF exibido é do usuário **alvo** (se houver)
   - [ ] Telefone exibido é do usuário **alvo**
   - [ ] Cargo exibido é do usuário **alvo**

---

## ✅ Teste 2: Dados da Oficina Impersonada
**Contínuo do Teste 1**

1. **Verificar workshop exibido**
   - [ ] No header, sidebar ou page, o workshop é do usuário **alvo**
   - [ ] NÃO mostra workshop do admin
   - [ ] Se usuário alvo tem `workshop_id`, mostrar esse workshop

2. **Navegar para uma página com dados**
   - [ ] Ir para `/DashboardFinanceiro`
   - [ ] Verificar dados DRE/DFC mostrados são do **workshop do usuário alvo**
   - [ ] NÃO mostrar dados do workshop do admin

3. **Ir para página de Colaboradores**
   - [ ] Navegar para `/Colaboradores`
   - [ ] Verificar colaboradores listados pertencem ao **workshop do usuário alvo**
   - [ ] NÃO mostrar colaboradores do workshop do admin

---

## ✅ Teste 3: Permissões Respeitadas (Sem Bypass)
**Contínuo - ainda impersonando**

1. **Verificar que admin NÃO tem acesso full durante impersonação**
   - [ ] Se usuário alvo é gerente (não admin), NÃO deve ver aba "UsuariosAdmin"
   - [ ] Se usuário alvo não tem permissão para página X, NÃO pode acessar
   - [ ] Tentar acessar manualmente `/UsuariosAdmin` → redireciona ou nega

2. **Verificar RLS funcionando**
   - [ ] Entity queries retornam apenas dados visíveis pelo usuário alvo
   - [ ] Sidebar mostra apenas itens permitidos ao usuário alvo
   - [ ] Botões/ações desabilitadas se usuário alvo não tem permissão

---

## ✅ Teste 4: Cache Limpo ao Sair da Impersonação
**Finalizar impersonação**

1. **Clicar botão "Sair da Impersonação"**
   - [ ] Verificar em `ImpersonationBanner`
   - [ ] Clicar em "Sair"
   - [ ] URL limpa (remove `?impersonate=`)
   - [ ] Banner **IMPERSONAÇÃO** desaparece

2. **Verificar dados retornam ao admin**
   - [ ] Nome/Email volta ao do admin
   - [ ] Workshop volta ao do admin
   - [ ] Dados financeiros voltam ao workshop do admin
   - [ ] Todos os dados recarregam (cache invalidado)

---

## ✅ Teste 5: Impersonar Múltiplos Usuários Sequencialmente
**Ainda como admin**

1. **Impersonar usuário A**
   - [ ] Ver dados de A
   - [ ] Verificar workshop de A

2. **Sair e voltar a UsuariosAdmin**
   - [ ] Dados retornam ao admin

3. **Impersonar usuário B (diferente de A)**
   - [ ] Ver dados de B
   - [ ] Verificar workshop de B
   - [ ] **Confirmar que dados de A não aparecem**

4. **Sair**
   - [ ] Dados voltam ao admin

---

## ✅ Teste 6: Comportamento em Modo Admin
**Verificar que modo admin normal ainda funciona**

1. **Sair da impersonação se ainda ativo**
   - [ ] Banner desaparece

2. **Entrar em modo admin (query string `?admin_workshop_id=XXX`)**
   - [ ] Banner **MODO ADMIN** aparece (amarelo)
   - [ ] Não confunde com impersonação

3. **Verificar dados do admin (workshop selecionado)**
   - [ ] Dados normais de admin
   - [ ] RLS do admin aplicado

---

## 🔴 Problemas a Evitar

| Problema | Como Detectar | Status |
|----------|---------------|--------|
| Admin vê seus próprios dados em vez do alvo | Nome/Email diferentes | ❌ ERRADO se não match |
| Cache não limpo | Dados antigos aparecem após trocar usuario | ❌ ERRADO se persiste |
| Permissões bypassadas | Usuário alvo acessa página não permitida | ❌ ERRADO se acesso |
| Workshop errado | Dados de workshop do admin em vez do alvo | ❌ ERRADO se não match |
| Flag `_isImpersonated` ignorada | `hasPermission` retorna true para admin | ❌ ERRADO se ignora flag |

---

## 📋 Checklist Final

- [ ] Teste 1: Dados pessoais corretos ✓
- [ ] Teste 2: Dados da oficina corretos ✓
- [ ] Teste 3: Permissões respeitadas (sem bypass) ✓
- [ ] Teste 4: Cache limpo ao sair ✓
- [ ] Teste 5: Múltiplos usuários funcionam ✓
- [ ] Teste 6: Modo admin normal ainda funciona ✓
- [ ] Nenhum problema detectado ✓

**Status Final**: ✅ PRONTO PARA PRODUÇÃO (quando todos os checkboxes estiverem marcados)

---

## 🔧 Debug: Verificar Logs do Console

```javascript
// No console, verificar:
console.log('Impersonação ativa:', getImpersonationData());
console.log('Usuário efetivo:', effectiveUser);
console.log('Workshop selecionado:', workshop?.id);
console.log('Flag _isImpersonated:', user._isImpersonated);
```

Se aparecer nos logs:
- ✅ `[ImpersonationCacheInvalidator] Estado de impersonação mudou.` → Cache foi invalidado
- ❌ Faltando → Cache pode não estar sendo limpado