# Documentação de Arquitetura e Contingências — Oficinas Master
**Versão:** 1.0 | **Data:** 2026-04-24 | **Status:** Referência Principal

---

## Índice

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Arquitetura de Frontend](#3-arquitetura-de-frontend)
4. [Arquitetura de Backend](#4-arquitetura-de-backend)
5. [Modelo de Dados e Entidades](#5-modelo-de-dados-e-entidades)
6. [Sistema de Autenticação e Autorização (RBAC)](#6-sistema-de-autenticação-e-autorização-rbac)
7. [Sistema de Planos e Billing](#7-sistema-de-planos-e-billing)
8. [Módulos de Negócio Principais](#8-módulos-de-negócio-principais)
9. [Infraestrutura de Comunicação Real-Time](#9-infraestrutura-de-comunicação-real-time)
10. [Infraestrutura de PDF e Exportação](#10-infraestrutura-de-pdf-e-exportação)
11. [Integrações Externas](#11-integrações-externas)
12. [Otimizações de Performance](#12-otimizações-de-performance)
13. [Segurança](#13-segurança)
14. [Monitoramento e Observabilidade](#14-monitoramento-e-observabilidade)
15. [Plano de Contingências](#15-plano-de-contingências)
16. [Decisões Arquiteturais Relevantes](#16-decisões-arquiteturais-relevantes)
17. [Mapa de Arquivos Críticos](#17-mapa-de-arquivos-críticos)

---

## 1. Visão Geral do Sistema

**Oficinas Master** é uma plataforma SaaS de gestão e aceleração para oficinas mecânicas automotivas. O sistema conecta:

- **Oficinas/Clientes**: gerenciam seu negócio, executam diagnósticos, acompanham sprints de melhoria.
- **Consultores/Aceleradores**: acompanham múltiplas oficinas, registram atendimentos, revisam progresso.
- **Admins da Plataforma**: gerenciam tenants, planos, usuários e integrações globais.
- **Escritórios de Consultoria**: agrupam consultores e suas carteiras de clientes.

### Modelo de Relacionamento Macro
```
ConsultingFirm
  └─ Consultores (Employees com job_role consultor/mentor/acelerador)
       └─ Atendem → Workshops (oficinas)
                        ├─ Company (matriz opcional)
                        │    └─ Workshops (filiais)
                        ├─ Employees (colaboradores da oficina)
                        ├─ ConsultoriaSprints (trilha de evolução)
                        ├─ DREMonthly (financeiro)
                        ├─ ProcessDocuments (MAPs e ITs)
                        └─ Diagnostics (avaliações)
```

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Observações |
|--------|-----------|-------------|
| **Frontend** | React 18 + Vite | SPA com lazy loading por rota |
| **Estilo** | Tailwind CSS + shadcn/ui | Design system centralizado em `index.css` + `tailwind.config.js` |
| **Roteamento** | React Router v6 | `App.jsx` é o roteador principal + `pages.config.js` para rotas do pagesConfig loop |
| **Estado/Cache** | TanStack Query v5 | Cache primário, stale-while-revalidate |
| **Backend/BaaS** | Base44 SDK | Auth, entidades, funções, integrações, agentes |
| **Funções Backend** | Deno Deploy (via Base44) | Cada arquivo em `functions/` é um handler HTTP independente |
| **Banco de Dados** | Base44 (managed) | Entidades definidas em `entities/*.json` com RLS declarativo |
| **Pagamentos** | Kiwify (webhook) | Webhook em `functions/webhookKiwify.js` |
| **E-mail** | Resend API | Via `functions/sendEmailResend.js` |
| **IA/LLM** | OpenAI (GPT) | Via `OPENAI_API_KEY` e `OPENAI_API_KEY_SECONDARY` |
| **Calendário** | Google Calendar API | OAuth connector autorizado |
| **Marketing** | ActiveCampaign | Via `ACTIVECAMPAIGN_API_URL` + `ACTIVECAMPAIGN_API_KEY` |
| **Assinatura Digital** | ClickSign | Via configuração no painel de Integrações |
| **Consulta CNPJ/CPF** | Serasa | Via `functions/consultarSerasaCNPJ.js` |

---

## 3. Arquitetura de Frontend

### Estrutura de Roteamento
O roteamento tem **duas camadas**:

**Camada 1 — `pages.config.js` (loop automático)**
- Contém ~140 páginas carregadas via `React.lazy()`.
- Cada página recebe o `Layout` wrapper automaticamente.
- Novas páginas adicionadas aqui aparecem automaticamente.

**Camada 2 — `App.jsx` (rotas explícitas)**
- Rotas que precisam de comportamento especial (públicas, admin-only, sem layout padrão).
- Páginas adicionadas aqui: `Home`, `CompletarPerfil`, `DescricaoCargos`, `CentralAvaliacoes`, `MatrizDesempenho`, `ControleAceleracao`, `ConsultoriaGlobal`, `PublicNPS`, `PublicDISC`, `BemVindoPlanos`, `AdminQADashboard`.
- **REGRA CRÍTICA:** Ao criar página nova fora do `pagesConfig`, sempre adicionar rota explícita em `App.jsx` e aplicar `LayoutWrapper` manualmente.

### Layout Principal (`Layout.jsx`)
O layout é um componente complexo que gerencia:
- **Sidebar** (`components/navigation/Sidebar`) com colapso e CSS variable `--sidebar-width`
- **Header** com notificações, busca global, seletor de oficina multi-tenant
- **Guards de acesso**: verifica plano ativo (`planStatus`), oficina vinculada, workshop inativo
- **OnboardingGate**: bloqueia acesso até completar cadastro inicial
- **Provedores de contexto**: `SharedDataProvider`, `NotificationListener`
- **CSS customizado por oficina**: injeta `workshop.custom_css_url` dinamicamente

### Provedores de Contexto (Context Hierarchy)
```
AuthProvider (lib/AuthContext)
  └─ QueryClientProvider (TanStack Query)
       └─ TenantProvider (components/contexts/TenantContext)
            └─ AttendanceTypeProvider
                 └─ Router (BrowserRouter)
                      └─ PermissionsProvider
                           └─ Layout
                                └─ SharedDataProvider
                                     └─ [Page Component]
```

### Hook de Contexto Principal: `useWorkshopContext`
- Busca a oficina ativa via `getUserWorkshops` (backend function)
- Suporte a multi-tenant: usuário pode ter acesso a múltiplas oficinas
- Fallback: se BFF falhar, faz lookup direto na entidade
- Expõe: `workshop`, `workshopId`, `workshopsDisponiveis`, `setCurrentWorkshop`, `isLoading`

### Gerenciamento de Permissões
- **RLS de entidade**: definido em `entities/*.json` → executado no banco
- **Permissões de página**: `components/lib/pagePermissions.js` → usado no `PageAccessControl`
- **Permissões granulares**: entidade `UserPermission` + `PermissionsContext` → verificado em `usePermissions`
- **Perfis RBAC**: entidade `UserProfile` com mapeamento de permissões por módulo

---

## 4. Arquitetura de Backend

### Funções Backend (Deno)
Cada arquivo em `functions/` é um handler HTTP independente. **Regras críticas:**
- Sem imports locais entre funções (cada função é deployada isolada)
- Sempre inicializar com `createClientFromRequest(req)` para auth contextual
- Usar `base44.asServiceRole` apenas após verificar autenticação
- Webhooks externos: validar assinatura HMAC antes de qualquer operação

### Padrão de Autenticação em Funções
```javascript
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  
  // Admin-only:
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  
  // Operações com privilégio elevado:
  const data = await base44.asServiceRole.entities.Workshop.list();
});
```

### Funções Críticas de Negócio

| Função | Propósito |
|--------|-----------|
| `getUserWorkshops` | BFF que retorna oficinas do usuário autenticado |
| `webhookKiwify` | Recebe eventos de pagamento da Kiwify (HMAC validation) |
| `adminUpdatePlan` | Atualização manual de plano por admins |
| `adminUpdateWorkshopPlan` | Atualização de plano com hash de integridade |
| `gerarAtaConsultoria` | Gera ATA via IA com contexto completo |
| `generateAtaPDFExterno` | Gera PDF da ATA via serviço externo |
| `gerarPDFExterno` | PDF genérico via Railroad/serviço externo |
| `syncClientSprintTasksWithTemplate` | Sincroniza tarefas de sprint com template |
| `propagateSprintTemplateUpdates` | Propaga mudanças de template para sprints ativos |
| `checkPlanAccess` | Verifica se funcionalidade está no plano da oficina |
| `createEmployeeOnUserCreation` | Automation: cria Employee quando User é criado |

### Automações (Automations)
Automações ativas do sistema:
- **Entity automations**: `onUserCreated`, `createEmployeeOnUserCreation`, `onMeetingMinutesUpdate`, `onSprintCreated`
- **Scheduled automations**: `checkOverdueTasks`, `checkCoexExpirations`, `checkDocumentDeadlines`, `calculateRankings`, `sendWeeklySummary`, `consolidateMonthData`

---

## 5. Modelo de Dados e Entidades

### Entidades Núcleo (Core)
```
Workshop       — Oficina (tenant principal)
Company        — Empresa matriz (multi-filiais)
ConsultingFirm — Escritório de consultoria
Employee       — Colaborador (vinculado a User via user_id)
User           — Usuário autenticado (built-in Base44)
```

### Entidades de Aceleração/Consultoria
```
ConsultoriaAtendimento  — Registro de atendimento (ATA)
ConsultoriaSprint       — Sprint de implementação (fases + tarefas)
CronogramaTemplate      — Template de trilha de missões
CronogramaImplementacao — Cronograma de implementação ativo
MonthlyAccelerationPlan — Plano mensal gerado por IA
MeetingMinutes          — Atas de reunião
```

### Entidades de Diagnóstico
```
Diagnostic                   — Diagnóstico principal (fases ABCD)
EntrepreneurDiagnostic       — Diagnóstico empresário
CollaboratorMaturityDiagnostic — Maturidade de colaborador
DISCDiagnostic               — Perfil DISC
PerformanceMatrixDiagnostic  — Matriz de desempenho
ProductivityDiagnostic       — Diagnóstico de produtividade
ServiceOrderDiagnostic       — Diagnóstico de OS
ProcessAssessment            — Avaliação de processos (comercial, RH, etc.)
```

### Entidades de Processos
```
ProcessArea     — Área de processo (Comercial, RH, Técnico, etc.)
ProcessDocument — MAP (Mapa de Auto Gestão do Processo)
InstructionDocument — IT/FR (Instrução de Trabalho / Formulário)
ProcessImplementation — Progresso de implementação por oficina
ProcessAudit    — Auditoria de processo
```

### Entidades de Billing
```
Plan            — Definição de plano (FREE, START, BRONZE, etc.)
PlanFeature     — Funcionalidades por plano
PaymentHistory  — Histórico de pagamentos
KiwifySettings  — Configuração de produtos Kiwify
KiwifyWebhookLog — Log de webhooks recebidos
Voucher / VoucherUse — Sistema de vouchers/descontos
Billing         — Registro de cobrança (Asas integration)
```

### RLS (Row Level Security) — Padrão
Todas as entidades sensíveis usam RLS declarativo em `entities/*.json`. Padrão típico:
```json
{
  "read": {
    "$or": [
      { "user_condition": { "role": "admin" } },
      { "consulting_firm_id": "{{user.data.consulting_firm_id}}" },
      { "workshop_id": "{{user.data.workshop_id}}" }
    ]
  }
}
```

---

## 6. Sistema de Autenticação e Autorização (RBAC)

### Roles Base44 (Built-in)
- `admin` — Acesso total à plataforma (equipe Oficinas Master)
- `user` — Usuário padrão (todos os demais)

### Roles de Negócio (via Employee.job_role)
Mapeados em `components/lib/jobRoles.js`:
- `socio`, `socio_interno`, `diretor`, `supervisor_loja`, `gerente`
- `lider_tecnico`, `financeiro`, `rh`, `tecnico`, `funilaria_pintura`
- `comercial`, `consultor_vendas`, `marketing`, `estoque`, `administrativo`
- `motoboy`, `lavador`, `acelerador`, `consultor`, `mentor`, `outros`

### Perfis RBAC (UserProfile)
- Perfil define conjunto de permissões por módulo
- Atribuído ao Employee via `profile_id`
- Templates em `ProfileTemplate` e `RoleTemplate`
- Permissões granulares adicionais em `UserPermission`

### Fluxo de Verificação de Acesso
```
Request → PageAccessControl → usePermissions hook
                                   ├─ Verifica user.role (admin bypass)
                                   ├─ Verifica pagePermissions[pageName]
                                   ├─ Verifica UserPermission (granular)
                                   └─ Verifica UserProfile.permissions
```

### Modo Admin (Impersonation)
- `useAdminMode` detecta `?admin_workshop_id=xxx` na URL ou `sessionStorage`
- Permite que admins acessem qualquer oficina no contexto dela
- `AdminModeBanner` exibe banner de aviso quando ativo

---

## 7. Sistema de Planos e Billing

### Planos Disponíveis
`FREE → START → BRONZE → PRATA → GOLD → IOM → MILLIONS`

### Armazenamento do Plano
O plano é armazenado diretamente no `Workshop`:
```
workshop.planoAtual    — enum do plano
workshop.planId        — ID do produto Kiwify
workshop.planStatus    — "active" | "trial" | "canceled"
workshop.plan_source   — "kiwify" | "admin"
workshop.billing_secure_hash — HMAC de integridade (verificado no backend)
workshop.trialEndsAt   — fim do trial
```

### Segurança do Billing
- `billing_secure_hash`: HMAC SHA-256 assinado com `KIWIFY_CLIENT_SECRET`
- Verificado em `adminUpdatePlan` e `adminUpdateWorkshopPlan` antes de qualquer mudança
- **NÃO** armazenado como `billing_update_token` (removido por auditoria de segurança — veja `docs/MemoryLeak_Audit_Report.md`)
- Plano nunca é alterado pelo frontend diretamente; sempre via backend function com validação

### Fluxo de Pagamento (Kiwify)
```
Kiwify → POST /webhookKiwify
           ├─ Valida HMAC (KIWIFY_CLIENT_SECRET)
           ├─ Identifica oficina por email/external_id
           ├─ Atualiza workshop.planoAtual + planStatus
           ├─ Recalcula billing_secure_hash
           └─ Registra em KiwifyWebhookLog + PaymentHistory
```

### Guard de Plano no Layout
Layout bloqueia acesso se `workshop.planStatus !== 'active' && planStatus !== 'trial'` para usuários não-admin, redirecionando para `/Planos`.

### Limites de Plano
- `functions/checkPlanAccess` — verifica acesso a features por plano
- `components/limits/PlanLimitModal` — modal exibido quando limite é atingido
- `components/limits/usePlanLimits` — hook para verificar limites no frontend
- `PLAN_LIMIT_EXCEEDED` CustomEvent — disparado pelo `RequestQueue` em `api/base44Client.js` ao receber 403/429 com `limite_excedido`

---

## 8. Módulos de Negócio Principais

### 8.1 Aceleração / Consultoria
**Núcleo do produto.** Consultores registram atendimentos, geram ATAs com IA, acompanham sprints.

```
ControleAceleracao (página central do consultor)
  ├─ PainelAtendimentosTab — lista de atendimentos
  ├─ CronogramaAceleracaoTab — cronograma por cliente
  ├─ DashboardOperacionalTabRedesigned — métricas operacionais
  ├─ VisaoGeralTab — visão consolidada
  └─ ConsultoriaGlobalTab — visão global (multi-cliente)

RegistrarAtendimento — formulário de atendimento
  ├─ BasicInfoSection, ParticipantsSection, AgendaSection
  ├─ ContentSection (pauta, objetivos, próximos passos)
  ├─ ClientIntelligenceCapturePanel — captura de inteligência
  └─ GerarAtaModal → gerarAtaConsultoria (IA)

PainelClienteAceleracao — visão do cliente (oficina)
  ├─ SprintClientSection — sprints ativos
  ├─ PlanoAceleracaoMensal — plano mensal IA
  └─ EAPViewer — estrutura analítica do projeto
```

### 8.2 Sprints
Sistema de missões com fases estruturadas:
```
ConsultoriaSprint
  └─ phases[]: Planning → Execution → Monitoring → Review → Retrospective
       ├─ status: not_started | in_progress | pending_review | completed
       ├─ tasks[]: { description, status, evidence_url, evidence_note }
       └─ review_history[]: { action, date, actor, feedback }
```

**Fluxo de revisão:**
1. Oficina marca tarefas como concluídas e submete fase (`pending_review`)
2. Consultor revisa e aprova (`completed`) ou devolve (`in_progress`)
3. Histórico completo preservado em `review_history[]`

### 8.3 Diagnósticos
9 tipos de diagnóstico, todos com resultado + plano de ação gerado por IA:
- Diagnóstico Principal (ABCD → fase 1-4)
- Empresário, Maturidade, DISC, Desempenho, Produtividade
- OS (Ordem de Serviço), Carga de Trabalho, Gerencial

### 8.4 Processos (MAPs e ITs)
- **ProcessDocument (MAP)**: Mapa de Auto Gestão do Processo por área
- **InstructionDocument (IT/FR)**: instruções de trabalho e formulários
- Compartilhamento entre oficinas, PDF export, histórico de versões
- Acesso controlado por `plan_access[]`

### 8.5 RH / Colaboradores
- CESPE: processo seletivo completo (canal → entrevista → proposta → integração)
- Avaliações: DISC, Maturidade, Desempenho, Matriz de Performance
- Treinamentos: cursos com módulos, aulas, avaliações e progresso
- Regimento interno: criação, assinatura digital, ciência dos colaboradores
- Cultura organizacional: missão, visão, valores, pilares culturais

### 8.6 Financeiro (DRE/TCMP²)
- `DREMonthly`: DRE mensal com cálculo TCMP² (Tabela de Custo Mínimo de Produção)
- Metas mensais com desdobramento por área e colaborador
- Análise de endividamento
- Diagnóstico de OS com validação R70/I30

### 8.7 Gamificação
- Sistema de XP, níveis e badges (`UserGameProfile`, `WorkshopGameProfile`)
- Desafios (`Challenge`) com evidências e premiação (`Reward`)
- Ranking nacional (`ProductivityRanking`)

---

## 9. Infraestrutura de Comunicação Real-Time

### WebSocket Manager (`lib/websocketManager.js`)
- Singleton com reconexão automática (backoff exponencial: 1s → 30s)
- Suporte a canais (subscriptions)
- Heartbeat a cada 30s
- Fila de mensagens offline

### Polling Manager (`lib/pollingManager.js`)
- Fallback automático quando WebSocket cai
- Intervalos configuráveis (5s–60s)
- Backoff exponencial em erros
- Múltiplos pollers concorrentes

### Real-time de Entidades (Base44 SDK)
```javascript
// Usado extensivamente em componentes críticos
const unsubscribe = base44.entities.ConsultoriaSprint.subscribe((event) => {
  if (event.type === 'update') { /* atualizar estado */ }
});
return unsubscribe; // cleanup no useEffect
```

### Request Queue (`api/base44Client.js`)
- Concorrência máxima: 5 requests simultâneos
- Deduplicação de GET idênticos em voo
- Intercepta 403/429 com `limite_excedido` → dispara `PLAN_LIMIT_EXCEEDED` event

---

## 10. Infraestrutura de PDF e Exportação

### Duas estratégias coexistem:

**Estratégia A — PDF via biblioteca jsPDF (frontend)**
- Usado em: `AtasPDFGenerator`, `StructuredReportPDF`, `CronogramaPDFGenerator`
- Renderiza texto via `jsPDF.text()` — sem risco de XSS
- `utils/markdownPdfParser.js` sanitiza markdown → texto plano para jsPDF

**Estratégia B — PDF via serviço externo (backend → Railroad)**
- Usado em: ATAs, MAPs, cronogramas grandes
- Fluxo: `frontend → functions/generateAtaPDFExterno → Railroad (HTML→PDF) → base64 → frontend`
- HTML gerado em `lib/processHTMLGenerator.js` e `lib/cronogramaHTMLGenerator.js`
- **Segurança**: toda interpolação de dados passa pela função `sanitize()` que faz HTML encoding

### Impressão via `window.print()`
- `AtaPrintLayout` — layout React renderizado para impressão direta
- `PrintPlanoModal` — usa DOM API (sem innerHTML) após correção de segurança

---

## 11. Integrações Externas

| Integração | Tipo | Autenticação | Função Principal |
|-----------|------|-------------|-----------------|
| **Kiwify** | Webhook (inbound) | HMAC `KIWIFY_CLIENT_SECRET` | Pagamentos e planos |
| **OpenAI** | API REST | `OPENAI_API_KEY` | Geração de ATAs, planos, diagnósticos |
| **OpenAI (Secondary)** | API REST | `OPENAI_API_KEY_SECONDARY` | Fallback / requests paralelos |
| **Resend** | API REST | `RESEND_API_KEY` | Envio de e-mails transacionais |
| **ActiveCampaign** | API REST | `ACTIVECAMPAIGN_API_KEY` | CRM / automações de marketing |
| **Google Calendar** | OAuth (app connector) | Token OAuth autorizado | Eventos de reuniões |
| **ClickSign** | API REST | Configurado via `Integracoes` | Assinatura digital de documentos |
| **Serasa** | API REST | Configurado via `Integracoes` | Consulta CNPJ/CPF |
| **Asas** | Webhook | Configurado | Pagamentos alternativos |
| **Evolution API** | API REST | Configurado | WhatsApp (agentes) |
| **Railroad** | API REST | URL interna | Conversão HTML→PDF |

---

## 12. Otimizações de Performance

### Request Deduplication
- `api/base44Client.js`: `RequestQueue` deduplica GETs idênticos em voo
- `api/deduplicationInterceptor.js`: camada adicional via Axios
- `lib/queryOptimizer.js`: batch + cache + dedup no nível de query

### Lazy Loading
- Todas as ~140 páginas via `React.lazy()` em `pages.config.js`
- Code splitting automático pelo Vite → chunk por rota

### Caching (TanStack Query)
- `staleTime` padrão: 5 minutos para dados de oficina
- `queryClientInstance` configurado em `lib/query-client.js`
- `lib/cacheConfig.js`: configurações por tipo de dado

### Rendering
- `VirtualList` para listas com >100 itens
- `OptimizedImage` com lazy loading
- Debounce em inputs de busca (`useDebounce`)

### Monitoramento de Performance
- `lib/performanceMonitor.js`: Web Vitals (LCP, FID, CLS)
- `lib/analyticsTracker.js`: comportamento do usuário
- Dashboard em `/AdminQADashboard`

---

## 13. Segurança

### Autenticação
- Gerenciada pelo Base44 (token-based, session via SDK)
- `lib/AuthContext.jsx`: estado global de autenticação com tratamento de erros tipados:
  - `user_not_registered`: exibe `UserNotRegisteredError`
  - `auth_required`: redireciona para login
  - `account_inactive`: exibe tela de bloqueio com logout

### Autorização
- RLS declarativo em todas as entidades sensíveis
- `PageAccessControl` bloqueia rotas sem permissão
- Funções admin verificam `user.role === 'admin'` no backend

### Segurança de Billing
- `billing_secure_hash`: HMAC no plano, verificado no backend
- Secrets nunca expostos no frontend ou no banco de dados
- Token de webhook Kiwify validado por HMAC em `functions/webhookKiwify.js`

### XSS Prevention
- React JSX escapa automaticamente interpolações `{variavel}`
- Geradores de HTML puro (`processHTMLGenerator`, `cronogramaHTMLGenerator`) usam `sanitize()` em toda interpolação
- `PrintPlanoModal` usa DOM API (`createElement`/`createTextNode`) em vez de `innerHTML`
- `utils/markdownPdfParser.js` remove HTML tags antes de renderizar

### Auditoria de Segurança Documentada
- `docs/SecurityLint_XSS_Report.md` — XSS scan completo
- `docs/MemoryLeak_Audit_Report.md` — memory leaks e secrets

---

## 14. Monitoramento e Observabilidade

### Frontend
| Componente | Localização | Acesso |
|-----------|------------|--------|
| Performance Monitor | `lib/performanceMonitor.js` | Automático |
| Error Logger | `lib/errorLogger.js` (global exceptions) | Automático |
| Analytics Tracker | `lib/analyticsTracker.js` | Automático |
| Monitoring Dashboard | `components/monitoring/MonitoringDashboard` | `/AdminQADashboard` |
| QA Dashboard | `components/monitoring/QADashboard` | `/AdminQADashboard` |

### Backend
- Logs via `console.log/error` em funções Deno (visíveis no painel Base44)
- `functions/logSecurityEvent.js` — log de eventos de segurança
- `functions/logRBACAction.js` — auditoria de permissões
- `functions/auditLog.js` — log geral de ações
- Entidades: `SecurityLog`, `UserActivityLog`, `RBACLog`

### Notificações
- `Notification` entity: notificações in-app
- `NotificationListener` component: polling de novas notificações (TanStack Query)
- `useNotificationPush`: notificações push do browser (sem polling high-frequency após correção de memory leak)
- `NotificationPermissionBanner`: solicita permissão de notificação push

---

## 15. Plano de Contingências

### C1 — Falha de Autenticação Base44
**Sintoma:** Usuários não conseguem logar ou recebem erros 401.
**Causa provável:** Token expirado, sessão inválida, configuração do SDK.
**Ação:**
1. Verificar status do serviço Base44 em status.base44.com
2. Verificar `lib/app-params.js` → `appId`, `serverUrl`, `token` corretos
3. Limpar localStorage/cookies do usuário afetado
4. Se global: aguardar resolução do Base44 ou ativar página de manutenção
**Fallback:** Nenhum (dependência core). Comunicar usuários via e-mail.

---

### C2 — Falha no Webhook Kiwify (Planos não ativam)
**Sintoma:** Cliente pagou mas plano não ativou.
**Causa provável:** Webhook Kiwify não chegou, HMAC inválido, e-mail divergente.
**Ação:**
1. Verificar `KiwifyWebhookLog` no banco — se o evento chegou
2. Se não chegou: acessar painel Kiwify → reenviar webhook manualmente
3. Se chegou com erro: checar log da função `webhookKiwify` no painel Base44
4. **Ativação manual emergencial:** usar `functions/adminUpdateWorkshopPlan` via admin (requer role `admin`)
5. Verificar `KIWIFY_CLIENT_SECRET` nas secrets — se mudou, atualizar
**Prevenção:** `KiwifyWebhookLog` registra todos os eventos para auditoria.

---

### C3 — OpenAI Indisponível (IA não gera ATAs/Planos)
**Sintoma:** Funções de geração de IA retornam erro 503/timeout.
**Causa provável:** OpenAI fora do ar ou rate limit.
**Ação:**
1. Verificar status em status.openai.com
2. Se rate limit: aguardar alguns minutos
3. Se downtime: notificar usuários que geração de IA está temporariamente indisponível
4. **Fallback**: `OPENAI_API_KEY_SECONDARY` já configurado — alterar funções para usar key secundária se a primária falhar
**Workaround temporário:** Usuários podem salvar atendimentos sem ATA e gerar depois.

---

### C4 — Falha no Serviço de PDF Externo (Railroad)
**Sintoma:** Download de PDF falha com erro 502/503/timeout.
**Causa provável:** Serviço Railroad indisponível.
**Ação:**
1. Verificar `functions/generateAtaPDFExterno` logs
2. **Fallback automático já implementado** em `StructuredReportPDF`: se upload falhar com 402, faz download local via `URL.createObjectURL`
3. Para ATAs: `AtasPDFGenerator` (jsPDF client-side) pode ser ativado como fallback
4. Comunicar usuários para usar "Imprimir" (Ctrl+P) como alternativa imediata
**Nota:** `lib/pdfDownloadManager.js` trata erros 502/503 com mensagem amigável.

---

### C5 — Memory Leak / Performance Degradada
**Sintoma:** Página trava, consumo de memória cresce, navegador lento.
**Causa provável:** Subscription não cancelada, polling em loop, estado acumulado.
**Ação:**
1. Abrir DevTools → Memory → tirar snapshot
2. Verificar subscriptions do Base44 SDK não estão se acumulando
3. Verificar `useEffect` com subscriptions retornam a função `unsubscribe`
4. Reload de página como medida imediata ao usuário
**Prevenção:** Auditoria documentada em `docs/MemoryLeak_Audit_Report.md`. Todos os `setInterval` de notificações foram removidos.

---

### C6 — Concorrência de Updates em Sprint (Race Condition)
**Sintoma:** Duas pessoas editando o mesmo sprint simultaneamente → dados sobrescritos.
**Causa provável:** Sem lock otimista; dois saves chegam ao banco quase ao mesmo tempo.
**Ação:**
1. Identificar qual save "ganhou" via `updated_date` na entidade
2. Recuperar versão anterior via `ConsultoriaSprint` backup se necessário
3. Re-aplicar manualmente as mudanças perdidas
**Mitigação atual:** `review_history[]` preserva histórico completo de revisões como auditoria. Documentado em `docs/RaceCondition_Audit_Report.md`.

---

### C7 — Usuário sem Oficina Vinculada (Loop de Onboarding)
**Sintoma:** Usuário logado mas preso em tela de "sem oficina vinculada".
**Causa provável:** `user.workshop_id` ou `user.data.workshop_id` ausente após cadastro.
**Ação:**
1. Admin acessa `GestaoUsuariosEmpresas` → edita o usuário → vincula à oficina
2. Ou executar `functions/linkUserToEmployee` / `functions/assignEmployeeToUser`
3. Ou executar `functions/fixUserPermissions` para recriar vínculo
**Causa raiz comum:** Automação `createEmployeeOnUserCreation` falhou silenciosamente.

---

### C8 — Plano Expirado / Trial Vencido
**Sintoma:** Todos os usuários de uma oficina veem tela "Acesso Suspenso".
**Causa provável:** `planStatus` = `canceled` e trial expirou.
**Ação imediata:**
1. Admin via painel: `adminUpdateWorkshopPlan` → setar `planStatus: "trial"` temporariamente
2. Orientar cliente a assinar/renovar via Kiwify
3. Após renovação: webhook ativa automaticamente
**Nota:** Layout bloqueia acesso para `planStatus !== 'active' && !== 'trial'`, exceto para `role: admin`.

---

### C9 — Dados de Oficina Corrompidos / Inacessíveis
**Sintoma:** Página carrega mas sem dados, ou erros inesperados.
**Causa provável:** `workshop_id` do usuário aponta para oficina inexistente ou sem RLS.
**Ação:**
1. Admin verifica se `Workshop` existe via GestaoTenants
2. Verifica RLS: `owner_id`, `partner_ids`, `consulting_firm_id` do usuário
3. Se RLS incorreta: `functions/fixOrphanedWorkshopAdmins`
4. Se Workshop deletado: recriar ou relinkar usuário

---

### C10 — Sprint Templates Desincronizados
**Sintoma:** Novas tarefas adicionadas ao template não aparecem nos sprints dos clientes.
**Causa provável:** `propagateSprintTemplateUpdates` não executou ou falhou.
**Ação:**
1. Executar manualmente `functions/propagateSprintTemplateUpdates` via admin
2. Ou `functions/syncClientSprintTasksWithTemplate` para oficina específica
3. Verificar logs em `functions/` no painel Base44

---

## 16. Decisões Arquiteturais Relevantes

### Por que `review_history[]` em vez de campos únicos?
(2026-04-16) Campos como `reviewed_at` eram sobrescritos a cada revisão, perdendo histórico. `review_history[]` acumula todos os eventos de submit/approve/return com timestamp e ator. Mantém fallback legado para sprints antigos.

### Por que `RequestQueue` customizado em `base44Client.js`?
Limitar concorrência a 5 requests simultâneos previne throttling do backend Base44. A deduplicação de GETs idênticos em voo evita fetches duplicados em componentes que montam simultaneamente (ex.: layout + página ambos pedindo dados da oficina).

### Por que duas estratégias de PDF?
- **jsPDF (frontend)**: mais rápido para PDFs simples; sem dependência de serviço externo.
- **Serviço externo (Railroad)**: necessário para PDFs com layout complexo (HTML/CSS); escalável para PDFs grandes sem travar o browser.

### Por que `billing_secure_hash` em vez de trust no `planoAtual`?
Previne que um usuário com acesso admin ao banco altere diretamente `planoAtual` sem passar pela validação do backend. O hash HMAC garante que apenas o backend (com acesso ao `KIWIFY_CLIENT_SECRET`) pode emitir um plano válido.

### Por que `consulting_firm_id` duplicado em Workshop e Employee?
Otimização de query. Sem a duplicação, consultas de "todos os clientes de uma consultoria" exigiriam joins N+1. Com o campo duplicado, um único filtro `consulting_firm_id = X` retorna tudo.

### Por que OnboardingGate no Layout em vez de rota protegida?
Permite que o guard veja o estado completo do usuário (workshop carregado, perfil, etc.) antes de decidir o redirecionamento. Uma rota protegida simples não tem esse contexto no momento do render.

---

## 17. Mapa de Arquivos Críticos

### Frontend — Arquivos que não devem ser modificados sem revisão cuidadosa

| Arquivo | Criticidade | Motivo |
|---------|------------|--------|
| `App.jsx` | 🔴 Alta | Roteador raiz; erro aqui quebra toda a aplicação |
| `Layout.jsx` | 🔴 Alta | Wraps toda UI autenticada; gerencia auth, workshop, guards |
| `api/base44Client.js` | 🔴 Alta | Client SDK + RequestQueue; afeta todos os requests |
| `lib/AuthContext.jsx` | 🔴 Alta | Estado de auth global; bug causa logout/loop |
| `components/contexts/TenantContext` | 🟠 Média | Multi-tenant; bug afeta seleção de oficina |
| `components/contexts/PermissionsContext` | 🟠 Média | Permissões globais; bug abre/fecha acesso incorretamente |
| `pages.config.js` | 🟠 Média | Registro de rotas; erros de import quebram chunk |
| `components/lib/pagePermissions.js` | 🟠 Média | Mapeamento de permissões por página |

### Backend — Funções críticas de negócio

| Função | Criticidade | Motivo |
|--------|------------|--------|
| `webhookKiwify` | 🔴 Alta | Ativa planos; erro = clientes sem acesso |
| `adminUpdatePlan` | 🔴 Alta | Alteração manual de plano |
| `getUserWorkshops` | 🔴 Alta | BFF principal do layout; erro = tela em branco |
| `createEmployeeOnUserCreation` | 🟠 Média | Automation de onboarding; erro = usuário preso |
| `gerarAtaConsultoria` | 🟠 Média | Feature central do produto |
| `checkPlanAccess` | 🟠 Média | Gate de features por plano |
| `propagateSprintTemplateUpdates` | 🟡 Baixa | Sincronização; afeta apenas sprints futuros |

### Entities — Entidades críticas

| Entidade | Criticidade | Campos sensíveis |
|---------|------------|-----------------|
| `Workshop` | 🔴 Alta | `planoAtual`, `planStatus`, `billing_secure_hash` |
| `User` | 🔴 Alta | `role`, `workshop_id`, `consulting_firm_id` |
| `Employee` | 🟠 Média | `profile_id`, `job_role`, `is_partner` |
| `ConsultoriaSprint` | 🟠 Média | `phases[].status`, `phases[].tasks[]` |

---

*Documentação gerada em 2026-04-24. Manter atualizada a cada sprint.*
*Para histórico de decisões de arquitetura específicas, consultar também `docs/developer-notes.md`.*