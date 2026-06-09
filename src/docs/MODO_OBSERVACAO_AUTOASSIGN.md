# AutoAssignProfile - Modo Observação

## Visão Geral

O `autoAssignProfile` agora opera em **modo observação**, onde o sistema **sugere** o perfil baseado no job_role, mas **NÃO aplica automaticamente**.

## Por que Modo Observação?

### Problema Anterior
```
job_role selecionado
↓
GRAVA profile_id automaticamente
↓
Usuário sem controle
```

### Solução Atual
```
job_role selecionado
↓
SUGERE profile_id
↓
Usuário pode trocar
↓
Validação com dados reais
```

## Funcionamento

### 1. Backend (`functions/autoAssignProfile.js`)

**Entrada:**
```json
{
  "job_role": "tecnico",
  "workshop_id": "xyz",
  "current_profile_id": "abc123" // opcional
}
```

**Saída (com sugestão):**
```json
{
  "success": true,
  "has_suggestion": true,
  "suggested_profile_id": "profile123",
  "suggested_profile_name": "Técnico - Execução e Produção",
  "message": "Sugestão disponível"
}
```

**Saída (sem sugestão):**
```json
{
  "success": true,
  "has_suggestion": false,
  "message": "Sem sugestão para este job_role"
}
```

### 2. Frontend (`ModalCadastroColaborador.jsx`)

**Fluxo:**
1. Usuário seleciona `job_role`
2. Sistema chama `autoAssignProfile` em background
3. Se houver sugestão, exibe banner
4. Usuário decide: **Usar** ou **Escolher outro**

**Componente de Sugestão:**
```jsx
<ProfileSuggestionBanner
  profileSuggestion={profileSuggestion}
  checkingSuggestion={checkingSuggestion}
  job_role={formData.job_role}
  onApplySuggestion={(profileId) => {...}}
  onDismiss={() => {...}}
/>
```

## Tabela Canônica (Fase 1)

| Job Role | Perfil Sugerido |
|----------|----------------|
| `socio` | Sócio - Acesso Total |
| `diretor` | Diretor - Gestão Estratégica |
| `gerente` | Gerente - Gestão Operacional |
| `supervisor_loja` | Supervisor - Operação e Equipe |
| `lider_tecnico` | Líder Técnico - Coordenação Técnica |
| `financeiro` | Financeiro - Controle Financeiro |
| `rh` | RH - Gestão de Pessoas |
| `tecnico` | Técnico - Execução e Produção |
| `funilaria_pintura` | Técnico - Funilaria e Pintura |
| `comercial` | Comercial - Vendas e Atendimento |
| `consultor_vendas` | Vendedor - Atendimento ao Cliente |
| `marketing` | Marketing - Comunicação e Marketing |
| `administrativo` | Administrativo - Suporte Interno |
| `estoque` | Estoque - Controle de Peças |
| `acelerador` | Acelerador - O.S. e Fluxo |
| `consultor` | Consultor - Consultoria Técnica |
| `mentor` | Mentor - Mentoria e Treinamento |
| `outros` | Outros - Acesso Básico |

## Vantagens do Modo Observação

### ✅ **Validação com Dados Reais**
- Permite testar dezenas de cadastros reais antes de tornar obrigatório
- Coleta feedback dos usuários
- Identifica exceções e casos especiais

### ✅ **Controle do Usuário**
- RH mantém autonomia para escolher perfis diferentes
- Útil para cargos híbridos ou multifuncionais
- Evita frustração com automação rígida

### ✅ **Iteração Rápida**
- Ajustes na tabela canônica são fáceis
- Pode adicionar novos job_roles gradualmente
- Sem rollback complexo

### ✅ **Auditabilidade**
- Log de sugestões aceitas vs. rejeitadas
- Métricas de adoção
- Identificação de perfis não mapeados

## Próximos Passos (Fase 3)

Após validar com dados reais:

1. **Coletar métricas:**
   - % de sugestões aceitas
   - Job_roles mais comuns
   - Perfis mais utilizados

2. **Ajustar tabela canônica:**
   - Adicionar job_roles faltantes
   - Corrigir mapeamentos incorretos
   - Criar perfis ausentes

3. **Tornar obrigatório (opcional):**
   ```
   job_role selecionado
   ↓
   APLICA profile_id automaticamente
   ↓
   Usuário pode editar (com warning)
   ```

## Exemplo de Uso

### Cenário 1: Cadastro Novo
```
1. RH seleciona job_role = "financeiro"
2. Sistema sugere: "Financeiro - Controle Financeiro"
3. RH clica em "Usar este perfil"
4. Perfil é aplicado automaticamente
```

### Cenário 2: Cargo Híbrido
```
1. RH seleciona job_role = "tecnico"
2. Sistema sugere: "Técnico - Execução e Produção"
3. RH clica em "Escolher outro"
4. RH seleciona: "Líder Técnico - Coordenação Técnica"
5. Perfil customizado é aplicado
```

### Cenário 3: Sem Sugestão
```
1. RH seleciona job_role = "eletricista"
2. Sistema: "Sem sugestão para este job_role"
3. RH escolhe perfil manualmente
```

## Implementação Técnica

### Backend
- **Arquivo:** `functions/autoAssignProfile.js`
- **Modo:** Observação (não grava automaticamente)
- **Retorno:** Sugestão + metadados

### Frontend
- **Componente Principal:** `ModalCadastroColaborador.jsx`
- **Componente de UI:** `ProfileSuggestionBanner.jsx`
- **Trigger:** Mudança no job_role
- **UX:** Banner informativo com ações claras

### Auditoria
- **Log:** `logRBACAction` para perfil aplicado
- **Métrica:** Sugestões aceitas vs. rejeitadas
- **Debug:** Console logs para desenvolvimento

## Status

- [x] Tabela canônica documentada (Fase 1)
- [x] Auditoria de cargos operacionais (Fase 2)
- [x] Modo observação implementado (Fase 2.5)
- [ ] Coleta de métricas (Em andamento)
- [ ] Validação com usuários (Pendente)
- [ ] Tornar obrigatório (Fase 3 - Futuro)