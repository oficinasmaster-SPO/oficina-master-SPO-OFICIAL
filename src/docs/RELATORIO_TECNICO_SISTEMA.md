# Relatório Técnico do Sistema — Oficinas Master

> **Data:** 23 de Julho de 2026  
> **Versão do Documento:** 1.0  
> **Plataforma:** Base44 (BaaS)  
> **Domínio:** Gestão de Oficinas Automotivas, Consultorias e Aceleração Empresarial

---

## 1. Visão Geral

O **Oficinas Master** é uma plataforma SaaS multi-tenant para gestão completa de oficinas automotivas, construída sobre a plataforma **Base44**. O sistema cobre desde a operação do pátio (QGP), passando por finanças enterprise (DRE/DFC), recursos humanos, cultura organizacional, treinamentos, até um módulo completo de consultoria/aceleração com IA.

### 1.1 Escala do Sistema

| Métrica | Valor |
|---------|-------|
| Entidades (modelos de dados) | **~160+** |
| Backend Functions | **~400+** |
| Automações ativas | **50+** |
| Páginas (rotas React) | **200+** |
| Componentes React | **600+** |
| Conectores OAuth integrados | 1 (Google Calendar) |
| Secrets configurados | 8 |

---

## 2. Stack Tecnológica

### 2.1 Frontend

| Tecnologia | Versão | Função |
|------------|--------|--------|
| **React** | 18.2.0 | Framework de UI |
| **Vite** | 6.1.0 | Bundler e dev server |
| **Tailwind CSS** | 3.4.17 | Styling (design tokens em `src/index.css`) |
| **React Router DOM** | 6.26.0 | Roteamento SPA |
| **TanStack React Query** | 5.84.1 | Cache, data fetching e sync |
| **Radix UI** | ~1.x | Primitives acessíveis (Dialog, Select, Popover, etc.) |
| **shadcn/ui** | — | Sistema de componentes (em `@/components/ui/`) |
| **Lucide React** | 0.475.0 | Biblioteca de ícones |
| **Recharts** | 2.15.4 | Gráficos e visualizações |
| **Framer Motion** | 11.16.4 | Animações |
| **React Hook Form** + **Zod** | 7.54 / 3.24 | Formulários e validação |
| **React Quill** | 2.0.0 | Editor de texto rico (ATAs) |
| **React Markdown** | 9.0.1 | Renderização de Markdown |
| **jsPDF** + **jspdf-autotable** | 2.5 / 3.8 | Geração de PDFs no cliente |
| **html2canvas** | 1.4.1 | Captura de DOM para PDF |
| **React Leaflet** | 4.2.1 | Mapas |
| **Three.js** | 0.171.0 | 3D (modelos/jogos) |
| **@hello-pangea/dnd** | 17.0.0 | Drag and drop (Kanban) |
| **cmdk** | 1.0.0 | Command palette (Combobox/GlobalSearch) |
| **date-fns** | 3.6.0 | Manipulação de datas |
| **canvas-confetti** | 1.9.4 | Efeitos de gamificação |
| **react-signature-canvas** | 1.0.6 | Assinaturas digitais |
| **react-resizable-panels** | 2.1.7 | Painéis redimensionáveis |
| **marked** | 12.0.0 | Parse de Markdown |

### 2.2 Backend / Plataforma

| Componente | Descrição |
|------------|-----------|
| **Base44 SDK** (`@base44/sdk` ^0.8.40) | Cliente pré-inicializado para entidades, auth, integrações e functions |
| **Base44 Vite Plugin** (^1.0.30) | Plugin de build da plataforma |
| **Backend Functions** | Handlers Deno Deploy em TypeScript (`base44/functions/{nome}/entry.ts`) |
| **Entity Store** | Banco de dados gerenciado pela plataforma (JSON schemas → persistência) |
| **Auth Backend** | Tokens, sessões, verificação de e-mail — gerenciado pela plataforma |
| **Automations** | Agendador gerenciado (AWS EventBridge na região us-west-2) |

### 2.3 Infraestrutura Cloud

- **Hosting & CDN:** Base44 (deploy automático a cada build)
- **Agendador de tarefas:** AWS EventBridge Scheduler (`us-west-2`)
- **OAuth Google:** Calendar + Meet (escopos: `calendar.events`, `calendar`, `email`)
- **Integrações de IA:** OpenAI (chaves primária e secundária), LLM nativo da plataforma
- **E-mail transacional:** Resend (`RESEND_API_KEY`)
- **Marketing automation:** ActiveCampaign (`ACTIVECAMPAIGN_API_URL` / `_KEY`)
- **Pagamentos:** Kiwify (`KIWIFY_CLIENT_SECRET`) — webhooks de pagamento e planos

### 2.4 Design System

O sistema usa um design system baseado em **tokens CSS** definidos em `src/index.css` (HSL custom properties) com mapeamento em `tailwind.config.js`. Suporta modo claro/escuro via classe `.dark`. Componentes seguem o padrão **shadcn/ui** com Radix primitives.

---

## 3. Arquitetura de Software

### 3.1 Padrão Geral

```
┌──────────────────────────────────────────────┐
│                  Frontend (SPA)               │
│  React + React Router + TanStack Query       │
│                                               │
│  ┌─────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Layout  │→ │  Pages   │→ │ Components │  │
│  │ (Shell) │  │ (Routes) │  │  (Atoms)   │  │
│  └────┬────┘  └────┬─────┘  └─────┬──────┘  │
│       │            │              │          │
│       └────────────┴──────────────┘          │
│                    │                          │
│         base44 SDK (pré-inicializado)         │
│                    │                          │
└────────────────────┼──────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   ┌─────────┐ ┌──────────┐ ┌──────────┐
   │Entities │ │ Functions│ │   Auth   │
   │ (CRUD)  │ │ (Deno)   │ │ (Tokens) │
   └────┬────┘ └────┬─────┘ └──────────┘
        │            │
        ▼            ▼
   ┌──────────────────────────┐
   │   Base44 Platform (BaaS)  │
   │  DB · Auth · Scheduler    │
   └──────────────────────────┘
```

### 3.2 Camadas de Contexto (Providers)

O `App.jsx` envolve a aplicação em uma cadeia de providers:

```
ErrorBoundary
  └─ AuthProvider
     └─ QueryClientProvider (TanStack Query)
        └─ TenantProvider
           └─ AttendanceTypeProvider
              └─ TemplateLibraryProvider
                 └─ DraftPersistenceProvider
                    └─ ToastProvider
                       └─ Router (BrowserRouter)
                          └─ ImpersonationCacheInvalidator
                             └─ TenantSessionProvider
                                └─ PermissionsProvider
                                   └─ NavigationTracker
                                      └─ AuthenticatedApp (Routes)
```

### 3.3 Resolução de Tenant (Multi-Tenant)

O sistema é **multi-tenant** com isolamento por oficina (`workshop_id`). A resolução segue uma cadeia canônica:

```
TenantMembership (autoridade)
  → resolveTenant (backend function)
    → useWorkshopContext (hook central)
      → workshopId (frontend)
        → RLS (banco de dados)
```

**Regras arquiteturais vigentes (5 regras de congelamento):**

1. **Proibido** novo código lendo `user.data.workshop_id` diretamente — usar `useWorkshopContext()`
2. **Proibida** function que aceite `workshop_id` sem validar vínculo do usuário (guard de 403 antes de `asServiceRole`)
3. **Proibido** `create: true` em RLS de entidades com `workshop_id` — sempre restringir
4. **Proibido** componente resolvendo oficina por conta própria — somente via `useWorkshopContext`
5. **Proibido** misturar `workshop_id` / `company_id` / `cliente_id` (semânticas distintas)

### 3.4 SPO (Single Path of Ownership) — Governança de Acesso

Cadeia inviolável de acesso:

```
pagePermissions
    ↓
PermissionsContext (carrega roles)
    ↓
canAccessPage()
    ↓
RouteGuard (bloqueia rota)
    ↓
Sidebar (filtra menu)
    ↓
Página (renderiza)
    ↓
resolveCurrentWorkshop()
    ↓
RLS (última linha de defesa)
```

**Princípio Fail Close:** Sem Employee → sem profile → sem roles → `permissions = []` → `canAccessPage() = false` → sidebar vazia → RouteGuard bloqueia → usuário vê "Acesso Negado". **Nunca há fallback.**

---

## 4. Modelo de Segurança: RBAC + RLS

### 4.1 RBAC (Role-Based Access Control)

O sistema implementa RBAC com as seguintes entidades canônicas:

| Entidade | Papel |
|----------|-------|
| **User** | Usuário autenticado (built-in da plataforma) — `role` (admin/user) |
| **Employee** | Vínculo do usuário com uma oficina — `profile_id` é a fonte canônica de perfil |
| **UserProfile** | Perfil de acesso — `roles[]` é a única fonte de permissões |
| **CustomRole** | Roles customizadas por workspace |
| **UserPermission** | Permissões granulares por módulo (legado/complementar) |
| **UserPermissionException** | Exceções pontuais de permissão |
| **TenantMembership** | Vínculo usuário↔oficina (autoridade multi-tenant) |

**Fluxo de resolução de permissões:**
```
User.id
  → Employee.filter({ user_id })     ← única query
    → Employee.profile_id            ← fonte canônica
      → UserProfile.roles[]          ← fonte de permissões
        → permissions[] (deduplicated)
```

**Bypass:** Admins e `user_type=internal` recebem bypass total — exceto durante impersonação.

### 4.2 RLS (Row-Level Security)

Todas as entidades operacionais possuem policies RLS definidas no schema JSON (`rls` key). O padrão típico isola dados por `workshop_id`:

```jsonc
"rls": {
  "create": {
    "$or": [
      { "data.workshop_id": "{{user.tenant_workshop_id}}" },
      { "data.workshop_id": "{{user.workshop_id}}" },
      { "data.workshop_id": "{{user.data.workshop_id}}" },
      { "user_condition": { "role": "admin" } },
      { "user_condition": { "user_type": "internal" } },
      { "user_condition": { "data.user_type": "internal" } }
    ]
  },
  "read": { "$or": [ /* workshop_id matches + admin/internal */ ] },
  "update": { "$or": [ /* same pattern */ ] },
  "delete": { "$or": [ /* admin/internal only */ ] }
}
```

**Template variables suportadas:** `{{user.id}}`, `{{user.email}}`, `{{user.role}}`, `{{user.workshop_id}}`, `{{user.data.workshop_id}}`, `{{user.tenant_workshop_id}}`, `{{user.consulting_firm_id}}`, `{{user.data.consulting_firm_id}}`

**Entidades com create público aprovado** (formulários públicos, sem login): NPSResponse, ConsultoriaAvaliacao, DISCDiagnostic, EntrepreneurDiagnostic, CustomerFeedback, AgendamentoSolicitacao.

### 4.3 Impersonação (Super Admin)

Administradores podem operar como outros usuários via impersonação. Durante impersonação:
- O bypass de admin é **desativado**
- Os dados do usuário alvo são exibidos
- Chaves de localStorage são isoladas por e-mail (`om_impersonation_{email}`)
- O `ImpersonationCacheInvalidator` limpa caches ao trocar de contexto

---

## 5. Módulos e Funcionalidades

### 5.1 Dashboard & Rankings
- Visão Geral da oficina
- Dashboard Nacional (métricas e rankings)
- Gamificação: Desafios & Conquistas (nível Brasil)

### 5.2 Empresa / Cadastros
- **Gestão da Oficina:** dados gerais, endereço, segmento, equipamentos, serviços terceirizados
- **Organograma Estrutural:** áreas e funções
- **Organograma Funcional:** pessoas e equipes (editor visual + PDF)
- **Metas e Objetivos:** melhor mês histórico, projeção de crescimento, R70/I30, TCMP²

### 5.3 Pátio / Operação (QGP)
- Tarefas Operacionais (gestão de tarefas)
- Notificações e alertas de prazo
- Diário de Produção
- Quadro Geral (visão TV / aeroporto)
- Minha Fila (painel do técnico/executor)

### 5.4 Resultados (Financeiro)
- **DRE & TCMP²:** Demonstração de Resultado do Exercício mensal com cálculo de margem
- **DFC:** Demonstração de Fluxo de Caixa com conciliação bancária
- **Controle Orçamentário:** metas anuais, sazonalidade, grupos orçamentários
- **Contas a Receber / Contas a Pagar:** gestão de títulos, parcelas, liquidações
- **Conciliação Bancária:** importação de extrato, detecção de divergências
- **OS - R70/I30:** rentabilidade de ordens de serviço
- Produção vs Salário, Curva de Endividamento, Diagnóstico Gerencial

### 5.5 Pessoas & RH
- Mapas de Autoavaliação (múltiplas áreas)
- Gestão de Colaboradores
- Descrições de Cargo (com IA)
- **CESPE:** Canal → Entrevista → Sonho → Proposta → Integração (recrutamento completo)
- CDC (Conexão do Colaborador)
- COEX (Contrato de Expectativa)
- Teste DISC, Perfil do Empresário, Maturidade, Matriz de Desempenho, Carga de Trabalho

### 5.6 Diagnósticos & IA
- IA Analytics (previsões e recomendações)
- Treinamento de Vendas (cenários com IA)
- Diagnósticos: Comercial, Gerencial, Produção, OS, Endividamento, Empresário, Carga

### 5.7 Processos & Manual
- Meus Processos (MAPs — Manuais de Procedimentos)
- Manual de Processos completo (geração de PDF)
- Instrução Técnica (IT) com fluxogramas, indicadores, riscos

### 5.8 Documentos
- Repositório central com versionamento, categorias, compliance
- OCR Extractor, AIDocumentAnalyzer, Digital Signature
- Análise de conformidade legal, relatórios de acesso

### 5.9 Cultura Organizacional
- Manual da Cultura (pilares e rituais)
- Regimento Interno (jurídico, com ciência dos colaboradores)
- Missão, Visão e Valores
- 34 Rituais + Cronograma de Aculturação
- Pesquisa de Clima

### 5.10 Treinamentos (Academia)
- Gestão de Treinamentos (módulos e aulas)
- Acompanhamento de progresso
- Área do aluno (Meus Treinamentos)
- Avaliações por lição, certificados

### 5.11 Inteligência do Cliente
- Dores, Dúvidas, Desejos, Riscos e Evoluções
- Mapa de Checklists (checklists por tipo)
- Relatórios de Inteligência (análises e indicadores)
- Checklists de diagnóstico vinculados a atendimentos

### 5.12 Aceleração / Consultoria
Módulo central de gestão de consultoria:

- **Plano de Aceleração Mensal:** plano gerado por IA por cliente
- **Controle de Aceleração:** painel operacional com múltiplas abas:
  - Visão Geral, Atendimentos, Cronograma, Pedidos Internos
  - Agenda Visual, Dashboard Operacional, Follow-ups
  - Trilhas, Sprints, Próximos Passos
- **Atendimentos (ConsultoriaAtendimento):** agendamento, realização, timer, ATAs
- **ATAs (MeetingMinutes):** atas geradas por IA com contexto histórico
- **Sprints & Trilhas:** trilhas de missões, fases, templates
- **Cronograma de Implementação:** EAP, Gantt, dependências
- **Follow-up System:** guarda-chuva, contadores, follow-ups pós-atendimento
- **Backlog de Tarefas (TarefaBacklog):** Kanban com checklist, SLA, saturações
- **Pedidos Internos (PedidoInterno):** solicitações internas com workflow e SLA
- **Sugestões de Agendamento:** IA prioriza clientes e gera slots
- **Contratos:** gestão de contratos com ClickSign, Kiwify, ASAS
- **Relatórios:** semanal de consultores, follow-ups atrasados, clientes em risco

### 5.13 Administração
- Dashboard Financeiro (métricas e pagamentos)
- Gestão de Usuários e Empresas
- Gestão de Tenants, Perfis (RBAC), Roles
- Monitoramento de Usuários (atividade, sessões)
- Gestão de Planos e Cobranças
- Produtividade (KPIs customizados)
- Calendário de Eventos (imersões, treinamentos)
- Integrações (Google Calendar & Meet)
- Saúde do Sistema, Auditoria RBAC, Logs
- QA Dashboard (monitoramento de qualidade)

---

## 6. Arquitetura Financeira Enterprise

### 6.1 Visão Geral

O módulo financeiro implementa uma arquitetura enterprise que separa competência (DRE) de caixa real (DFC):

```
VENDA / NOTA FISCAL
    ↓
DRE (Competência) — reconhece receita/despesa, KPIs
    ↓ gera título
CONTAS A RECEBER/PAGAR — controle de crédito, parcelas, vencimentos
    ↓ aguarda liquidação
LIQUIDAÇÃO FINANCEIRA — baixa parcial/total, método de pagamento
    ↓ confirma
DFC / CAIXA REAL — somente liquidações confirmadas, conciliação automática
```

### 6.2 Entidades Financeiras Principais

| Entidade | Função |
|----------|--------|
| **DRELancamento** | Lançamentos por competência (DRE) |
| **DREMonthly** | Fechamento mensal do DRE |
| **SubcategoriaDRE** | Subcategorias de DRE configuráveis |
| **ContaReceber** | Títulos a receber (parcelas, vencimentos) |
| **ContaPagar** | Títulos a pagar |
| **LiquidacaoFinanceira** | Liquidações (baixas) de contas |
| **DFCLancamento** | Lançamentos de caixa (DFC) |
| **SaldoInicialHistorico** | Saldos iniciais por período |
| **BudgetMeta** | Metas orçamentárias |
| **BudgetMetaHistory** | Histórico de metas |
| **BudgetGroup** | Grupos orçamentários hierárquicos |
| **MonthlyGoalHistory** | Histórico de metas mensais |
| **VendasServicos** | Registro de vendas/serviços |
| **LiquidacaoFinanceira** | Liquidações financeiras |

### 6.3 Automações Financeiras (Sincronismo)

O sistema mantém sincronismo bidirecional entre DRE, Contas e DFC:

- `syncDREToContas` — DRE criado → cria Conta a Receber/Pagar
- `syncDREDeleteToContas` — DRE deletado → remove Contas e Liquidações
- `syncContasDeleteToDRE` — Conta deletada → remove DRE vinculado
- `syncDREToBudgetMeta` — DRE atualizado → sincroniza BudgetMeta
- `gerarParcelamentoAutomatico` — gera parcelas recorrentes
- `renovarRecorrenciasAutomatico` — renova recorrências no dia 25/mês
- `conciliarTransacoesAutomatico` — conciliação automática de extrato
- `detectarDivergencias` — detecta diferenças DRE ≠ DFC ≠ Caixa
- `fecharMes` / `reabrirMes` — fechamento mensal
- `alertaDesvioOrcamentario` — alerta quando realizado < 80% da meta
- `alertaRecorrenciaVencendo` — alerta de recorrências terminando
- `checkMetasAcumulado` — compara realizado acumulado vs meta (dia 1)

---

## 7. Módulo de Consultoria / Aceleração — Detalhamento

### 7.1 Atendimentos (ConsultoriaAtendimento)

Entidade central com 11 status possíveis:
`agendado → confirmado → participando → realizado → concluido`
`remarcado → reagendado → cancelado → faltou → atrasado → desparcou`

**Campos principais:**
- Vínculos: `workshop_id`, `consultor_id`, `diagnostic_id`, `ata_id`
- Agenda: `data_agendada`, `data_realizada`, `duracao_minutos`, timer real
- Google Meet: `google_meet_link`, `google_event_id`, `google_calendar_link`
- Pós-venda: `status_posta_venda`, `responsabilidade`, `motivo_cancelamento_*`
- Conteúdo: participantes, pauta, objetivos, tópicos, decisões, ações geradas
- Anexos: `midias_anexas`, `processos_vinculados`, `videoaulas_vinculadas`, `documentos_vinculados`
- Checklists: `checklist_respostas` (diagnósticos vinculados)
- ATA: `ata_ia`, `ata_gerada`, `ata_gerada_em`, `indicadores_selecionados`
- Rastreabilidade: `registro_meta` (quem criou, para quem, origem, timestamp)

### 7.2 ATAs (MeetingMinutes)

Atas de reunião geradas por IA com:
- Participantes, pauta estruturada, objetivos
- Processos/vídeoaulas/documentos vinculados
- Decisões tomadas e ações geradas
- Inteligência do cliente (dores/oportunidades)
- Respostas de checklists de diagnóstico
- `ai_summary` (resumo executivo, problemas recorrentes, evolução, recomendações)
- `ata_ia` (texto completo em Markdown)

### 7.3 Sprints & Trilhas

- **ConsultoriaSprint:** buckets/sprints de atendimento por cliente
- **SprintTemplate / Mission:** templates reutilizáveis de trilhas e missões
- **MonthlyAccelerationPlan:** plano mensal de aceleração gerado por IA
- **CronogramaImplementacao / CronogramaProgresso:** cronograma de implementação com EAP, Gantt e dependências (read model projetado unidirecionalmente)

### 7.4 Follow-up System

Sistema multi-camada de acompanhamento:

| Entidade | Função |
|----------|--------|
| **FollowUpReminder** | Lembretes de follow-up (sequência 7/14/21/28 dias) |
| **FollowUpContador** | Contadores semanais por sprint/bucket |
| **FollowUpConcluido** | Arquivo de follow-ups concluídos |

**Origens de follow-up:** `ata`, `sprint`, `manual`, `suporte`, `suporte_checkin`, `guarda_chuva`, `tarefa_backlog`, `pedido_interno`

### 7.5 Backlog & Pedidos Internos

- **TarefaBacklog:** Kanban com 5 status (aberta → em_execucao → aguardando_cliente → bloqueada → concluida), checklist, SLA, prioridade, impacto, tempo estimado/real
- **PedidoInterno:** Pedidos internos (apoio técnico, decisão estratégica, liberação material, exceção de escopo) com workflow de aprovação
- **BacklogChecklistItem:** Itens de checklist por tarefa
- **TaskComment:** Comentários com anexos e threading (respostas encadeadas)
- **ActivityLog:** Timeline automática de eventos (created, status_changed, assigned, etc.)
- **TarefaBacklogHistorico:** Histórico de alterações

### 7.6 Contratos

- **Contract:** gestão completa com ClickSign (assinatura digital), Kiwify/ASAS (pagamentos), versionamento, timeline de eventos
- **ContractAttendance:** atendimentos previstos por contrato/plano
- **PlanAttendanceRule / DiagnosticFrequency:** regras de frequência por plano

---

## 8. Automações

O sistema possui **50+ automações ativas** em 4 categorias:

### 8.1 Automações Agendadas (Scheduled)

| Nome | Frequência | Função |
|------|-----------|--------|
| Sincronizar Atendimentos Atrasados | A cada 6h | Marca atendimentos vencidos como 'atrasado' |
| Disparar Notificações de Atendimento | A cada 1h | Envia notificações programadas de atendimentos |
| Limpeza Diária — Notificações Antigas | Diário 03h | Remove notificações lidas > 30 dias |
| Verificar Prazos — Tarefa Backlog | Diário 08h | Lembretes D-1, D0, D+1, D+3 |
| Verificar Prazos — Pedido Interno | Diário 08h | Lembretes e escalonamento de pedidos |
| Auditoria RBAC Diária | Diário 06h | Saúde do RBAC |
| Limpeza Workshops Abandonados | Diário 06h | Detecta rascunhos > 48h |
| Sincronizar Taxa de Realização | Diário 01h/03:30h | Sincroniza taxa de realização |
| Follow-up Guarda-Chuva Semanal | Segunda 09h | Cria follow-ups preventivos |
| Criar FollowUpContadores Semanais | Segunda 08h | Contadores por sprint/bucket |
| Gerar Sugestões de Agendamento Semanal | Segunda 08h | Sugestões de IA para clientes críticos |
| Renovação de Recorrências DRE | Dia 25/mês | Gera próximas parcelas recorrentes |
| Check Metas Acumulado | Dia 1/mês | Compara realizado vs meta |
| Guard Semanal — RLS Legacy | Sexta 09h | Verifica RLS bypass |
| Auditoria Legacy workshop_id | Segunda 09h | Escaneia referências legadas |
| Enviar Relatório Follow-up Diário | Diário 07h | PDF por e-mail |

### 8.2 Automações de Entidade (Entity-triggered)

Gatilhos em create/update/delete de entidades:

| Entidade | Evento | Ação |
|----------|--------|------|
| ConsultoriaAtendimento | update | Follow-up pós-atendimento, sync cronograma, taxa de realização |
| MeetingMinutes | update/delete | Sync próximos passos, cascade delete follow-ups |
| PedidoInterno | create/update | Follow-up automático, ActivityLog, sync status→FollowUp, notificar responsável |
| TarefaBacklog | create/update | Follow-up automático, ActivityLog, sync status→FollowUp, notificar consultor |
| DRELancamento | create/update/delete | Sync → BudgetMeta, sync → Contas, cascade delete |
| ContaPagar / ContaReceber | delete | Sync delete → DRE |
| BudgetMeta | update | Alerta de desvio orçamentário |
| ConsultoriaSprint | create/update | Criar/fechar FollowUpContador |
| Workshop | update/delete | Encerramento ao inativar, cascade delete employees |
| EmployeeInviteAcceptance | create | Processar novo usuário, vincular Employee |
| CronogramaImplementacao | update | Sync → CronogramaProgresso (read model) |

### 8.3 Automações de Conector (Webhook)

- **Google Calendar:** eventos de calendário (webhook ativo)

### 8.4 In-App Agents

Agentes de IA configurados no app:
- **gestor_oficina** — assistente do gestor
- **sales_coach** — coach de vendas
- **it_assistant** — assistente de TI
- **followup_consultor** — assistente de follow-up do consultor
- **qgp_tecnico** — assistente do técnico QGP

---

## 9. Integrações

### 9.1 Nativas da Plataforma (Core)

| Integração | Uso |
|------------|-----|
| **InvokeLLM** | Geração de ATAs, planos de ação, resumos, análises |
| **GenerateImage** | Imagens para cultura, treinamentos |
| **GenerateVideo** | Vídeos de treinamento |
| **GenerateSpeech** | TTS para conteúdos |
| **TranscribeAudio** | Transcrição de áudios de reuniões |
| **UploadFile / UploadPrivateFile** | Upload de documentos e mídias |
| **ExtractDataFromUploadedFile** | Extração de dados de CSV/Excel/PDF |
| **SendEmail** | E-mail para usuários registrados |
| **CreateFileSignedUrl** | URLs assinadas para arquivos privados |

### 9.2 Conectores OAuth

| Conector | Status | Escopos |
|----------|--------|---------|
| **Google Calendar** | ✅ Autorizado | `calendar.events`, `calendar`, `email` |

### 9.3 Integrações via Backend Functions + Secrets

| Serviço | Secret | Função |
|---------|--------|--------|
| **OpenAI** (primária) | `OPENAI_API_KEY` | LLM para análises e geração de conteúdo |
| **OpenAI** (secundária) | `OPENAI_API_KEY_SECONDARY` | LLM de backup / testes |
| **Resend** | `RESEND_API_KEY` | E-mail transacional |
| **ActiveCampaign** | `ACTIVECAMPAIGN_API_URL` + `_KEY` | Marketing automation |
| **Kiwify** | `KIWIFY_CLIENT_SECRET` | Pagamentos e planos |
| **Google OAuth** | `google_oauth_client_secret` | Google Calendar/Meet |

### 9.4 Webhooks Externos

| Webhook | Origem | Função |
|---------|--------|--------|
| `webhookKiwify` | Kiwify | Pagamentos e ativação de planos |
| `webhookClickSign` | ClickSign | Status de assinatura de contratos |
| `webhookMetaLeads` | Meta/Facebook | Captura de leads |
| `webhookEvolutionAPI` | Evolution API (WhatsApp) | Mensagens WhatsApp |
| `processAsasPaymentWebhook` | ASAS | Pagamentos |
| `processPaymentWebhook` | Genérico | Pagamentos |

---

## 10. IA e Geração de Conteúdo

### 10.1 ATAs com IA

O sistema gera ATAs completas por IA com:
- **`gerarAtaConsultoria`** — ATA de atendimento de consultoria
- **`gerarAtaImplementacao`** — ATA de implementação
- **`generateAtaSummaryWithContext`** — Resumo com contexto histórico do cliente
- **`generateAtaPDFExterno`** — PDF da ATA

### 10.2 Planos de Ação por Diagnóstico

Functions que geram planos de ação personalizados:
- `generateActionPlanDISC`, `generateActionPlanDebt`, `generateActionPlanDiagnostic`
- `generateActionPlanEntrepreneur`, `generateActionPlanManagement`, `generateActionPlanMaturity`
- `generateActionPlanPerformance`, `generateActionPlanProcess`, `generateActionPlanProductivity`
- `generateActionPlanServiceOrder`, `generateActionPlanWorkload`

### 10.3 Outros Recursos de IA

- **`chatWithAI`** — Chat de assistência
- **`enhanceTaskAI`** — Aprimoramento de tarefas com IA
- **`monitorGoalsAI`** — Monitoramento de metas
- **`generateChallengeAI`** — Geração de desafios de gamificação
- **`generateTrainingAIFeedback`** — Feedback de treinamentos
- **`suggestEmployeeProfile`** — Sugestão de perfil de colaborador
- **`generateCulturePresentation`** — Apresentação de cultura
- **`analyzeClientIntelligence`** — Análise de inteligência do cliente
- **`generateOnboardingPlan`** — Plano de onboarding
- **`gerarSugestoesAgendamento`** — Sugestões de agendamento priorizadas

---

## 11. Observabilidade e Auditoria

### 11.1 Entidades de Monitoramento

| Entidade | Função |
|----------|--------|
| **SystemEventLog** | Log de eventos do sistema |
| **SystemFunctionExecution** | Log de execução de functions |
| **SystemHealthSnapshot** | Snapshots de saúde do sistema |
| **AuditLog** | Log de auditoria geral |
| **RBACLog** | Log de ações RBAC |
| **SecurityLog** | Log de segurança |
| **UserActivityLog** | Log de atividade do usuário |
| **UserSession** | Sessões de usuário |
| **ActivityLog** | Timeline de tarefas e pedidos |
| **DownloadLog** | Log de downloads |
| **IntegrationUsageLog** | Uso de integrações |
| **ProfileSuggestionTelemetry** | Telemetria de sugestões de perfil |
| **IntegrationCreditAlert** | Alertas de crédito de integração |

### 11.2 Backend Functions de Auditoria

Mais de 30 functions de auditoria, incluindo:
- `auditRBACHealth`, `auditTenantIntegrity`, `auditUserProfiles`, `auditOwnerRoles`
- `auditOrphanEmployees`, `auditOrphanUsers`, `auditDataSegregation`
- `auditLegacyWorkshopId`, `auditPostRestoreSprint75`
- `systemHealthDashboard`, `runSystemMaintenance`
- `rlsRegressionLote1`, `rlsRegressionLote2`, `rlsRealPerspectiveTest`
- `auditPostRestoreSprint75`

### 11.3 QA e Testes

- **QADashboard** — Dashboard de qualidade (rota `/AdminQADashboard`, admin only)
- Suite de testes Vitest em `src/tests/` cobrindo:
  - RLS e isolamento de tenant
  - Floating panel (histórico de cliente)
  - Follow-up origem
  - Deduplicação de ATAs
  - RBAC runtime
  - Bucket de atendimentos
  - Suporte

---

## 12. Performance e Otimizações

### 12.1 Frontend

- **TanStack Query** com `staleTime` configurado (3-10 min por query), `refetchOnWindowFocus: false`, `refetchOnMount: 'stale'`
- **Cache local** de nomes de oficina em `localStorage` (placeholder instantâneo)
- **Lazy loading** de páginas via `React.lazy()` + `Suspense`
- **Lookup maps O(1)** em `useMemo` (workshopMap, atasMap)
- **Batch operations** (`bulkCreate`, `bulkUpdate`, `updateMany`) para evitar N chamadas
- **Hooks de performance:** `useDebounce`, `useRequestDeduplication`, `useRequestThrottle`, `useQueryOptimizer`, `useVirtualScroll`, `useLazyLoad`, `useFullTextSearch`, `useCompressionMonitor`
- **Cache de respostas:** `backendCache`, `useIndexedDBCache`
- **Rate limiting e deduplicação:** interceptors na camada de API (`rateLimitingInterceptor`, `deduplicationInterceptor`, `compressionInterceptor`)

### 12.2 Backend

- **BFF (Backend-for-Frontend):** `bffDashboard`, `bffAutoavaliacoes` — agregam múltiplas queries em uma chamada
- **Read Models:** `CronogramaProgresso` projetado de `CronogramaImplementacao`
- **Service Role:** `asServiceRole` para queries privilegiadas (com guard de vínculo)
- **Sincronismo via automações** em vez de polling frontend

---

## 13. Planos e Billing

### 13.1 Planos

O sistema opera com 7 níveis de plano:

| Plano | Descrição |
|-------|-----------|
| **FREE** | Gratuito |
| **START** | Inicial |
| **BRONZE** | Intermediário |
| **PRATA** | Intermediário+ |
| **GOLD** | Avançado |
| **IOM** | Imersão Oficinas Master |
| **MILLIONS** | Topo |

### 13.2 Cobrança

- **Kiwify:** processador de pagamento principal (webhook → ativação de plano)
- **ASAS:** processador alternativo
- **ClickSign:** assinatura digital de contratos
- **PlanLimitModal:** limites por plano (diagnósticos/mês, colaboradores, filiais)
- **`billing_secure_hash`:** HMAC para validar integridade do plano
- **Voucher system:** vouchers com regras de vendedor, aprovação, prazos

---

## 14. Gestão de Usuários e Onboarding

### 14.1 Fluxo de Onboarding

```
Convite (EmployeeInvite)
  → Aceitação (EmployeeInviteAcceptance) [trigger: createEmployeeOnUserCreation]
    → User criado
      → Employee vinculado
        → Profile atribuído (autoAssignProfile)
          → Permissões (createDefaultPermissions)
            → Workshop resolvido (TenantMembership)
              → Onboarding gate liberado
```

### 14.2 Componentes de Onboarding

- `OnboardingGate` — bloqueia até completar cadastro
- `OnboardingChecklist` — checklist de boas-vindas
- `OnboardingTour` / `GuidedTour` — tour guiado
- `CompletarPerfil` — página de complementação de perfil

### 14.3 Convites

- `sendEmployeeInvite` — envia convite por e-mail/WhatsApp
- `validateInviteToken` — valida token
- `completeInviteOnFirstAccess` — completa no primeiro acesso
- `resendEmployeeInvite` — reenvio
- `cleanupExpiredInvites` — expira convites vencidos (diário)

---

## 15. Conclusão

O **Oficinas Master** é uma plataforma SaaS enterprise de grande porte construída sobre a Base44, com:

- **~160 entidades** modeladas com RLS multi-tenant
- **~400 backend functions** em TypeScript/Deno
- **50+ automações** (agendadas, de entidade, de webhook e in-app agents)
- **Arquitetura RBAC + RLS** com Fail Close e SPO (Single Path of Ownership)
- **Módulo financeiro enterprise** (DRE/DFC/Conciliação/Orçamento) com sincronismo automatizado
- **Módulo de consultoria/aceleração** completo com ATAs por IA, sprints, trilhas, follow-ups e backlog
- **Integrações** com Google Calendar/Meet, OpenAI, Resend, ActiveCampaign, Kiwify, ClickSign
- **Observabilidade** robusta com 13+ entidades de log/auditoria
- **Gamificação** com desafios, rankings nacional e sistema de vouchers

A arquitetura prioriza **isolamento de dados** (RLS em toda entidade operacional), **fail close** (sem fallback de permissões), **single source of truth** para tenant e permissões, e **automação** de processos repetitivos via scheduler e entity triggers.

---

*Documento gerado em 23/07/2026 a partir da análise do código-fonte, schemas de entidades, automações e documentação arquitetural do sistema.*