# Regras de Negócio - Follow-up Central

## 📋 Visão Geral

Este documento descreve as regras de negócio implementadas para controle de finalização de follow-ups na Central de Follow-up.

---

## 🎯 Regra Implementada

### **Follow-ups só podem ser finalizados quando:**

✅ **PERMITIDO FINALIZAR:**
- Follow-ups **vencidos** (data agendada < hoje)
- Follow-ups **atrasados** (data agendada < hoje)
- Follow-ups **do dia** (data agendada = hoje)

❌ **NÃO PERMITIDO FINALIZAR:**
- Follow-ups **futuros** (data agendada > hoje)
  - Podem ser visualizados
  - Podem acessar detalhes
  - **NÃO** podem ser finalizados ou receber baixa

---

## 🔧 Implementação Técnica

### Arquivo: `components/aceleracao/followups/FollowUpDetail`

#### 1. **Variáveis de Controle**

```javascript
// Verifica se follow-up pode ser finalizado
const canBeFinalized = reminder.is_completed === false && (
  reminder.reminder_date < today ||  // vencido/atrasado
  reminder.reminder_date === today    // ou é do dia
);

// Verifica se é follow-up futuro
const isFuture = reminder.reminder_date > today;
```

#### 2. **Validação no Botão "Iniciar Atendimento"**

```javascript
<Button
  onClick={() => {
    if (!canBeFinalized) {
      toast.error("Este follow-up só pode ser finalizado quando estiver vencido ou na data agendada.");
      return;
    }
    setView("register");
    setRegisterStep("history");
  }}
  disabled={!canBeFinalized}
  className={
    !canBeFinalized
      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
      : temRascunho
        ? "bg-cyan-600 hover:bg-cyan-700 text-white"
        : "bg-green-600 hover:bg-green-700 text-white"
  }
>
  {!canBeFinalized 
    ? "Aguardando data para finalizar" 
    : temRascunho 
      ? "Retomar Atendimento" 
      : "Iniciar Atendimento"}
</Button>
```

#### 3. **Alerta Visual para Follow-ups Futuros**

```javascript
{isFuture && (
  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
    <AlertCircle className="w-5 h-5 text-amber-600" />
    <p className="text-sm font-semibold text-amber-800">
      Follow-up agendado para {format(new Date(reminder.reminder_date), "dd/MM/yyyy")}
    </p>
    <p className="text-xs text-amber-700">
      Este follow-up ainda não está na data de realização. 
      Você pode visualizar os detalhes, mas só poderá finalizar 
      ou dar baixa a partir da data agendada.
    </p>
  </div>
)}
```

#### 4. **Validação nas Funções de Finalização**

**Função `handleSave`:**
```javascript
const handleSave = async () => {
  // REGRA DE NEGÓCIO: Impedir finalização de follow-up futuro
  if (!canBeFinalized) {
    toast.error("Este follow-up só pode ser finalizado quando estiver vencido ou na data agendada.");
    return;
  }
  // ... resto da lógica de salvamento
};
```

**Função `handleLoss`:**
```javascript
const handleLoss = async () => {
  // REGRA DE NEGÓCIO: Impedir finalização de follow-up futuro
  if (!canBeFinalized) {
    toast.error("Este follow-up só pode ser finalizado quando estiver vencido ou na data agendada.");
    return;
  }
  // ... resto da lógica de perda
};
```

---

## 🎨 Comportamento da UI

### **Follow-up Futuro (NÃO pode finalizar):**
- ✅ Botão "Iniciar Atendimento" **DESABILITADO** (cinza, cursor not-allowed)
- ✅ Texto do botão: "Aguardando data para finalizar"
- ✅ Alerta âmbar no topo informando a data e restrição
- ✅ Toast de erro se tentar clicar no botão
- ✅ Pode visualizar todos os detalhes
- ✅ Pode acessar ATAs e histórico

### **Follow-up Vencido/Atrasado/Hoje (PODE finalizar):**
- ✅ Botão "Iniciar Atendimento" **HABILITADO** (verde/ciano)
- ✅ Texto do botão: "Iniciar Atendimento" ou "Retomar Atendimento"
- ✅ Sem alerta de restrição
- ✅ Pode finalizar normalmente
- ✅ Vai para tela de concluídos após finalização

---

## 🧪 Casos de Teste

### **Cenário 1: Follow-up Futuro**
```
Data Hoje: 2026-05-14
Data Follow-up: 2026-05-20

Resultado Esperado:
- [ ] Botão desabilitado
- [ ] Alerta âmbar visível
- [ ] Mensagem: "Aguardando data para finalizar"
- [ ] Ao clicar: toast de erro
```

### **Cenário 2: Follow-up Vencido**
```
Data Hoje: 2026-05-14
Data Follow-up: 2026-05-10

Resultado Esperado:
- [ ] Botão habilitado (verde)
- [ ] Sem alerta de restrição
- [ ] Pode finalizar normalmente
```

### **Cenário 3: Follow-up do Dia**
```
Data Hoje: 2026-05-14
Data Follow-up: 2026-05-14

Resultado Esperado:
- [ ] Botão habilitado (verde ou ciano se tem rascunho)
- [ ] Sem alerta de restrição
- [ ] Pode finalizar normalmente
```

---

## 📊 Impacto no Fluxo do Usuário

### **Antes da Implementação:**
- ❌ Consultores podiam finalizar follow-ups futuros
- ❌ Não havia validação de data
- ❌ Follow-ups podiam ser concluídos antes da data agendada

### **Depois da Implementação:**
- ✅ Follow-ups futuros são apenas visualizáveis
- ✅ Validação automática de data
- ✅ Alertas visuais claros
- ✅ Mensagens de erro informativas
- ✅ Fluxo de trabalho mais organizado

---

## 🔒 Segurança da Regra

A validação ocorre em **3 camadas**:

1. **UI Layer:** Botão desabilitado visualmente
2. **Event Handler:** Validação no `onClick` antes de abrir modal
3. **Business Logic:** Validação nas funções `handleSave` e `handleLoss`

Isso garante que mesmo se um usuário tentar burlar a UI, a regra ainda será aplicada na lógica de negócio.

---

## 📝 Notas Adicionais

### **Termos Utilizados:**
- **Vencido/Atrasado:** Data do follow-up < hoje
- **Do Dia:** Data do follow-up = hoje
- **Futuro:** Data do follow-up > hoje
- **Finalizar:** Dar baixa, concluir, marcar como realizado
- **Visualizar:** Acessar detalhes, ver informações, mas não editar

### **Exceções:**
- Follow-ups já concluídos (`is_completed = true`) não são afetados por esta regra
- A regra só se aplica ao ato de finalizar/concluir o follow-up

---

**Data de Implementação:** 2026-05-14  
**Responsável:** AI Development Agent  
**Status:** ✅ IMPLEMENTADO