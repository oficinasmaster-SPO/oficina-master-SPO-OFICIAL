# 📋 DOCUMENTAÇÃO COMPLETA - MÓDULO DE CONSULTORIA

## 🎯 ESTRUTURA GERAL
O módulo de Consultoria tem **4 Camadas** principais acessadas via abas:
1. **Estratégico** (Camada 1)
2. **Trilha** (Camada 2)
3. **Sprints** (Camada 3)
4. **Guia do Consultor** (Camada 4)

---

## 📍 CAMADA 1: ESTRATÉGICO
**Componente:** `CamadaEstrategica` (no arquivo ConsultoriaClienteTab.jsx)

### O que tem:
- Análise estratégica do cliente
- Diagnóstico de força e fraqueza
- Mapeamento visual de dores/oportunidades
- Integração com avaliações existentes

---

## 🗺️ CAMADA 2: TRILHA DO CLIENTE
**Componente:** `CamadaTrilhaCliente`

### SEÇÕES PRINCIPAIS:

### ✅ 1. LINK AO CRONOGRAMA
- Botão que abre "Cronograma de Consultoria"
- O cliente acompanha a trilha naquela página

### 📅 2. TRILHA DE IMPLEMENTAÇÃO
Composta por:

#### **SPRINT 0 — DIAGNÓSTICO & ALINHAMENTO (FIXO - Semana 1)**
```
- Objetivo: Diagnóstico Inicial e Alinhamento
- Status: Padrão (fixo para todos)
- O que tem dentro:
  🔍 Levantamento de informações
  🗂️ Organização e priorização de dores
```

#### **MISSÕES DE IMPLEMENTAÇÃO (SELECIONÁVEIS)**
Existem **7 Missões** disponíveis para adicionar à trilha:

1. **📅 AGENDA CHEIA**
   - Objetivo: Preencher a agenda semanal com 100% de ocupação de vendas
   - Duração: 3-4 semanas (4 fases)
   - Fases:
     - S1: 🎓 Implementação (Ensinar, configurar e primeira execução)
     - S2: ⚙️ Execução (Rodar forte, corrigir erros e ajustar)
     - S3: ✅ Padronização (Melhorar resultado, padronizar e validar)
     - S4: 🚀 Continuação (Opcional - pode continuar ou partir para próxima)

2. **🎯 FECHAMENTO IMBATÍVEL**
   - Objetivo: Aumentar taxa de conversão de propostas para vendas
   - Duração: 3-4 semanas (mesma estrutura de fases)
   - Fases: Implementação → Execução → Padronização → Continuação

3. **💰 CAIXA FORTE**
   - Objetivo: Fortalecer fluxo de caixa e gestão financeira
   - Duração: 3-4 semanas
   - Fases: Implementação → Execução → Padronização → Continuação

4. **📊 EMPRESA ORGANIZADA**
   - Objetivo: Estruturar processos e operações da empresa
   - Duração: 3-4 semanas
   - Fases: Implementação → Execução → Padronização → Continuação

5. **👥 FUNÇÕES CLARAS**
   - Objetivo: Definir papéis, responsabilidades e organograma
   - Duração: 3-4 semanas
   - Fases: Implementação → Execução → Padronização → Continuação

6. **🎓 CONTRATAÇÃO CERTA**
   - Objetivo: Otimizar processo de seleção e onboarding
   - Duração: 3-4 semanas
   - Fases: Implementação → Execução → Padronização → Continuação

7. **🌟 CULTURA FORTE**
   - Objetivo: Desenvolver cultura organizacional e engajamento
   - Duração: 3-4 semanas
   - Fases: Implementação → Execução → Padronização → Continuação

### 🔧 FUNCIONALIDADES DA TRILHA:
- **Botão "Adicionar Missão à Trilha"**: Abre seletor com as 7 missões
- **Botão "Sincronizar Trilhas"**: Sincroniza com dados do servidor
- **Botão "Salvar Trilha"**: Persiste as missões selecionadas no banco de dados
- **Remoção**: Cada missão tem "X" para remover da trilha
- **Estado persistido**: Mudanças são salvas no `CronogramaTemplate`

---

## ⚡ CAMADA 3: SPRINTS
**Componente:** `CamadaSprints`

### ESTRUTURA:
Cada missão selecionada gera um **Sprint** com 5 fases padronizadas.

### 📌 CICLO DE SPRINT:
```
📋 Planejamento → ⚙️ Execução → 📊 Acompanhamento → 🔄 Revisão → 💬 Retrospectiva
```

### SPRINT 0 — DIAGNÓSTICO & ALINHAMENTO (PADRÃO)
```
Status: Pendente/Em andamento/Concluído/Atrasado
Progresso: 0-100%

5 FASES DENTRO DE SPRINT 0:

1️⃣ PLANNING (Planejamento)
   Icone: 📋 ListChecks
   Cor: Azul
   Objetivo: Definir o que será feito nas próximas semanas
   Tarefas:
   ✓ Revisar diagnóstico e prioridades
   ✓ Definir objetivo claro do sprint
   ✓ Listar entregáveis mensuráveis
   ✓ Distribuir tarefas e prazos

2️⃣ EXECUTION (Execução)
   Icone: ⚙️ PlaySquare
   Cor: Verde
   Objetivo: Assistir treinamentos, implementar ferramentas, executar tarefas
   Tarefas:
   ✓ Assistir treinamentos da missão
   ✓ Implementar ferramentas e processos
   ✓ Executar tarefas priorizadas
   ✓ Registrar progresso na plataforma

3️⃣ MONITORING (Acompanhamento)
   Icone: 📊 BarChart2
   Cor: Roxo
   Objetivo: Reunião de alinhamento e verificação do progresso
   Tarefas:
   ✓ Check-in: o que foi feito
   ✓ Medir resultados parciais
   ✓ Identificar bloqueios
   ✓ Ajustar tarefas se necessário

4️⃣ REVIEW (Revisão)
   Icone: 🔄 TrendingUp
   Cor: Laranja
   Objetivo: Apresentação dos resultados alcançados no sprint
   Tarefas:
   ✓ Apresentar entregáveis concluídos
   ✓ Medir KPIs vs meta do sprint
   ✓ Validar com o cliente os resultados
   ✓ Documentar conquistas

5️⃣ RETROSPECTIVE (Retrospectiva)
   Icone: 💬 MessageSquare
   Cor: Vermelho
   Objetivo: Reflexão sobre o processo para melhorar o próximo sprint
   Tarefas:
   ✓ O que funcionou bem?
   ✓ O que precisa melhorar?
   ✓ Quais ajustes fazer no processo?
   ✓ Planejar próximo sprint
```

### SPRINTS DE MISSÕES (1, 2, 3... até 7)
Cada missão selecionada gera um Sprint com a MESMA estrutura de 5 fases:

**SPRINT 1 — AGENDA CHEIA**
- Semanas 2-5 (3-4 semanas)
- 5 Fases: Planning → Execution → Monitoring → Review → Retrospective
- Status, Progresso, Tarefas internas

**SPRINT 2 — FECHAMENTO IMBATÍVEL**
- Semanas 6-9 (3-4 semanas)
- 5 Fases idênticas
- Status, Progresso, Tarefas internas

**... E assim por diante para cada missão**

### 🎯 O QUE TEM DENTRO DE CADA FASE:
Ao clicar na fase, abre modal com:
- **Nome da Fase**
- **Descrição**
- **Status atual** (não iniciada, em progresso, concluído)
- **Data de conclusão**
- **Submissões para revisão**
- **Feedback do consultor**
- **Histórico de revisões** (ações: submetido, aprovado, devolvido)
- **Notas** livres
- **Métricas** (name, value, unit)
- **Tarefas** com status (a fazer, feito):
  - Descrição
  - Status
  - Instruções
  - Link de material
  - Evidência (arquivo/foto)
  - Data de conclusão
  - Quem completou (cliente/consultor)
  - Observações

### 🚀 FUNCIONALIDADES DE SPRINT:
- **Iniciar Sprint**: Botão "▶ Iniciar Sprint X"
- **Expandir**: Ver todas as 5 fases
- **Clicar em Fase**: Abre modal detalhado para registrar progresso
- **Navegação entre Fases**: Botões de próxima/anterior fase
- **Regras**:
  - Só pode ter 2 sprints da mesma missão se o primeiro foi CONCLUÍDO
  - Máximo 2 sprints por missão

---

## 📚 CAMADA 4: GUIA DO CONSULTOR
**Componente:** `CamadaConsultor`

### GUIAS DISPONÍVEIS:

#### 1️⃣ COMO CONDUZIR O DIAGNÓSTICO INICIAL
**Badge:** Onboarding
**Descrição:** Passo a passo para levantar informações, identificar dores e priorizar ações.
**Passos:**
1. Apresente-se e contextualize o programa
2. Aplique o checklist de diagnóstico
3. Escute ativamente as dores do proprietário
4. Priorize os 3 maiores gargalos

#### 2️⃣ COMO CONDUZIR ATENDIMENTOS SEMANAIS
**Badge:** Reunião Semanal
**Descrição:** Estrutura padrão para reuniões de acompanhamento de 60-90 minutos.
**Passos:**
1. Check-in: resultado da semana anterior
2. Revisão das metas e KPIs
3. Resolução de bloqueios
4. Definição de tarefas para próxima semana
5. Registro na plataforma

#### 3️⃣ COMO FECHAR UM CICLO DE SPRINT
**Badge:** Fechamento
**Descrição:** Consolidar aprendizados e planejar o próximo ciclo com o cliente.
**Passos:**
1. Revise todas as tarefas do sprint
2. Calcule os resultados alcançados
3. Celebre as conquistas com o cliente
4. Apresente o plano do próximo ciclo

#### 4️⃣ COMO ESCALAR O PROJETO
**Badge:** Escala
**Descrição:** Quando e como avançar para etapas de crescimento e autonomia.
**Passos:**
1. Verifique consolidação dos processos base
2. Avalie prontidão da equipe
3. Introduza ferramentas de escala
4. Reduza dependência gradualmente

---

## 🔄 FLUXO COMPLETO DE USO

### 1. SELECIONAR TRILHA (Aba "Trilha")
```
→ Clicar "Adicionar Missão à Trilha"
→ Selecionar as 7 missões desejadas (checkbox)
→ Clicar "Salvar Trilha"
→ Sistema persiste no CronogramaTemplate
```

### 2. INICIAR SPRINTS (Aba "Sprints")
```
→ Cada missão selecionada aparece como Sprint
→ Clicar "▶ Iniciar Sprint X"
→ Sistema cria registro com 5 fases padrão
→ Data início: hoje
→ Data fim: +21 dias (3 semanas)
→ Status: in_progress
```

### 3. REGISTRAR PROGRESSO
```
→ Abrir o Sprint específico (expandir)
→ Clicar em uma das 5 fases (Planning, Execution, Monitoring, Review, Retrospective)
→ Abre modal com formulário completo
→ Registrar:
  - Status da fase
  - Tarefas e progresso
  - Métricas
  - Evidências (arquivos)
  - Feedback
```

### 4. CONSULTAR GUIA
```
→ Aba "Guia do Consultor"
→ 4 guias com passo a passo
→ Ler orientações antes de cada reunião
```

---

## 💾 DADOS PERSISTIDOS

### Tabela: CronogramaTemplate
```json
{
  "workshop_id": "...",
  "fase_oficina": 1,
  "nome_fase": "Trilhas Selecionadas",
  "missoes_selecionadas": ["agenda_cheia", "fechamento_imbativel", ...],
  "id": "cronograma_id"
}
```

### Tabela: ConsultoriaSprint
```json
{
  "workshop_id": "...",
  "mission_id": "agenda_cheia",
  "sprint_number": 1,
  "title": "Sprint 1 — Agenda Cheia",
  "objective": "...",
  "start_date": "2025-04-19",
  "end_date": "2025-05-10",
  "status": "in_progress",
  "progress_percentage": 45,
  "phases": [
    {
      "name": "Planning",
      "status": "completed",
      "due_date": "2025-04-21",
      "completion_date": "2025-04-21T14:30:00Z",
      "notes": "...",
      "tasks": [
        {
          "description": "Revisar diagnóstico",
          "status": "done",
          "completed_at": "2025-04-21T14:00:00Z",
          "evidence_url": "...",
          "completed_by": "consultor_id"
        }
      ],
      "metrics": [
        {
          "name": "Tarefas concluídas",
          "value": 4,
          "unit": "un"
        }
      ]
    },
    // ... mais 4 fases
  ]
}
```

---

## 🎨 CORES E VISUAIS

| Elemento | Cor | Significado |
|----------|-----|-------------|
| Sprint 0 | Cinza | Padrão/Fixo |
| Agenda Cheia | Azul | Primeira missão |
| Fechamento | Verde | Segunda missão |
| Caixa Forte | Amarelo | Terceira missão |
| Empresa Org. | Roxo | Quarta missão |
| Funções Claras | Rosa | Quinta missão |
| Contratação | Índigo | Sexta missão |
| Cultura Forte | Vermelho | Sétima missão |

---

## 📱 MODO GLOBAL vs. CONTEXTUAL

### Modo CONTEXTUAL (padrão na aba do Controle)
```
→ Mostra apenas dados de UMA oficina específica
→ Carrega trilha + sprints daquela oficina
→ Permite editar/salvar trilha daquela oficina
```

### Modo GLOBAL (página /ConsultoriaGlobal)
```
→ Mostra AGREGADO de TODAS as oficinas
→ Sprints de TODOS os clientes
→ Visão gerencial consolidada
→ NÃO permite editar trilha (modo leitura)
```

---

## 🔗 INTEGRAÇÕES

### Links Internos:
- **Cronograma de Consultoria**: O cliente acompanha a trilha
- **Guia do Consultor**: Orientações internas

### Dados Relacionados:
- **CronogramaTemplate**: Armazena missões selecionadas
- **ConsultoriaSprint**: Armazena sprints e progresso
- **Tarefas/Evidências**: Vinculadas a cada fase

---

## ⚙️ REGRAS DE NEGÓCIO

1. ✅ **Sprint 0 é obrigatório e fixo** - Sempre "Diagnóstico & Alinhamento"
2. ✅ **Cada missão = 1 sprint com 3-4 semanas**
3. ✅ **Máximo 2 sprints por missão** (só cria o 2º se o 1º foi CONCLUÍDO)
4. ✅ **5 fases padrão em cada sprint** (Planning, Execution, Monitoring, Review, Retrospective)
5. ✅ **Tarefas dentro de fases** (pode ter múltiplas por fase)
6. ✅ **Evidências obrigatórias** (para validar conclusão)
7. ✅ **Histórico de revisões** (registra cada submissão/aprovação/devolução)

---

## 🎯 RESUMO EXECUTIVO

**Consultoria tem 4 camadas estruturadas:**

| Camada | Nome | Função | Foco |
|--------|------|--------|------|
| 1 | Estratégico | Análise geral | Diagnóstico |
| 2 | Trilha | Seleção de missões | Planejamento |
| 3 | Sprints | Execução por sprint | Implementação |
| 4 | Guia | Orientação do consultor | Metodologia |

**7 Missões disponíveis** para agregar à trilha, cada uma com 3-4 semanas de sprint divididas em 5 fases padronizadas.

**Acesso**: `/ControleAceleracao` → Aba "Consultoria" ou diretamente `/ConsultoriaGlobal