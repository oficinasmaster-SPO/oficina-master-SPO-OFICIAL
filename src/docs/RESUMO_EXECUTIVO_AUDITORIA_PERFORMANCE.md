# Resumo Executivo — Auditoria de Arquitetura e Performance

## Objetivo

Foi realizada uma auditoria técnica completa do sistema, composta por:

* análise estática da arquitetura React;
* análise de infraestrutura e consumo de leitura;
* auditoria de Providers, React Query e Context API;
* instrumentação em runtime (`QUERY_DIAG`);
* análise de Performance Profiler do Chrome;
* validação em ambiente real.

O objetivo foi identificar as causas da instabilidade, erros 429, degradação de performance e aumento do consumo de memória.

---

# Conclusão Executiva

O sistema **não apresenta um único problema crítico**, mas sim o efeito combinado de decisões arquiteturais que, ao longo do crescimento do produto, passaram a gerar alto acoplamento, duplicação de leituras e excesso de renderizações.

As evidências mostram que a arquitetura original funcionava adequadamente para um sistema menor, porém o aumento do número de módulos, Providers e consultas fez com que o boot da aplicação e algumas funcionalidades passassem a competir pelos mesmos recursos do backend.

O resultado é:

* excesso de leituras concorrentes;
* saturação do limite de leitura da plataforma (429);
* falhas em funções críticas (500);
* aumento progressivo do consumo de memória;
* degradação da experiência do usuário.

---

# Principais achados confirmados

## 1. Boot da aplicação executa leituras redundantes

A instrumentação identificou quatro componentes responsáveis por leituras desnecessárias logo na inicialização:

* **TemplateLibraryProvider** carrega missões em todas as páginas, mesmo quando não utilizadas.
* **Sidebar** executa três consultas independentes ao mesmo `Employee`.
* **NotificationListener** duplica a leitura de notificações já realizada pelo Layout.
* **TenantSelector** consulta todas as `ConsultingFirm` mesmo em ambientes com apenas uma empresa.

Essas consultas representam oportunidades imediatas de redução de carga.

---

## 2. Duplicação de consultas

Foi confirmado que diferentes componentes consultam exatamente os mesmos dados utilizando estratégias distintas.

Exemplos:

* Employee
* Notification
* FollowUps
* ATAs
* ConsultingFirm

Essa duplicação reduz a eficiência do cache do React Query e aumenta significativamente o consumo de leitura.

---

## 3. Arquitetura React excessivamente centralizada

Alguns componentes concentram responsabilidades demais.

Principalmente:

* SharedDataProvider
* Layout
* IniciarAtendimentoModal
* useOperationalSync

Esses componentes tornaram-se pontos centrais da aplicação e impactam diretamente renderização, carregamento e manutenção.

---

## 4. React Query sem padronização completa

Foi identificada fragmentação das Query Keys.

Consequências:

* múltiplos caches para a mesma entidade;
* invalidações excessivas;
* consultas duplicadas;
* perda de reaproveitamento de dados.

---

## 5. Crescimento significativo de memória durante uso

O Performance Profiler demonstrou:

* Heap: aproximadamente **10 MB → 321 MB**
* DOM Nodes: **565 → 9.438**
* Event Listeners: **239 → 4.405**

Esses números mostram aumento significativo de objetos durante a sessão.

Embora exista atuação do Garbage Collector, o crescimento observado indica necessidade de investigação adicional sobre montagem de componentes, inscrições e gerenciamento de estado.

---

## 6. Saturação do backend

Os erros observados em produção confirmam:

* **429 Too Many Requests** em diversas entidades;
* **500 Internal Server Error** em funções críticas como `resolveTenant`;
* **403 Forbidden** em consultas ao `User`.

Os erros não estão concentrados em um único módulo, indicando que o problema é sistêmico.

---

# Causa Raiz

As evidências apontam para cinco causas principais:

1. Leituras redundantes durante o boot da aplicação.
2. Duplicação de consultas para as mesmas entidades.
3. Providers carregando dados globais além do necessário.
4. Ausência de padronização das Query Keys.
5. Componentes com responsabilidades excessivas e alto acoplamento.

---

# Prioridade de Correção

## Sprint 1 — Estabilização

Objetivo:

Reduzir imediatamente o consumo de leitura.

Principais ações:

* Lazy loading do TemplateLibraryProvider.
* Consolidação das consultas do Sidebar.
* Unificação da leitura de Notification.
* Gate para ConsultingFirm em ambientes mono-firm.
* Padronização inicial das Query Keys.

Impacto esperado:

* redução das leituras no boot;
* diminuição dos erros 429;
* menor tempo de carregamento.

> **Status:** 3 de 4 ações da Sprint 1 já aplicadas (Sidebar, TemplateLibraryProvider, TenantSelector). Pendente: unificação da leitura de Notification (NotificationListener).

---

## Sprint 2 — Arquitetura

Objetivo:

Eliminar duplicações estruturais.

Principais ações:

* Refatoração do SharedDataProvider.
* Consolidação do fluxo de notificações.
* Reorganização do Tenant.
* Revisão do boot da aplicação.

---

## Sprint 3 — Performance

Objetivo:

Reduzir renderizações e consumo de memória.

Principais ações:

* Refatoração do `IniciarAtendimentoModal`.
* Revisão do `useOperationalSync`.
* Compartilhamento efetivo do cache do React Query.
* Redução de re-renderizações.

---

## Sprint 4 — Evolução da Arquitetura

Objetivo:

Preparar o sistema para crescimento.

Principais ações:

* Arquitetura Feature-first.
* Registry oficial de Query Keys.
* Bootstrap unificado da sessão.
* Padronização definitiva dos Providers.

---

# Nível de confiança das conclusões

| Categoria                                                        | Confiança                                                |
| ---------------------------------------------------------------- | -------------------------------------------------------- |
| Leituras redundantes                                             | Muito alta                                               |
| Duplicação de consultas                                          | Muito alta                                               |
| Saturação do backend (429)                                       | Muito alta                                               |
| Problemas em `resolveTenant`                                     | Muito alta                                               |
| Fragmentação das Query Keys                                      | Muito alta                                               |
| Acoplamento entre Providers                                      | Alta                                                     |
| Crescimento de memória                                           | Alta                                                     |
| Hipóteses sobre componentes específicos gerando todos os nós DOM | Moderada (requer validação adicional com React Profiler) |

---

# Conclusão Final

As investigações evoluíram de hipóteses arquiteturais para evidências concretas de execução. A instrumentação em runtime confirmou os principais pontos levantados pelas auditorias e permitiu identificar os componentes responsáveis pelas leituras redundantes durante o boot da aplicação.

O diagnóstico indica que **o sistema não precisa ser reescrito**. A arquitetura base continua válida, mas acumulou dívida técnica típica de um produto que cresceu rapidamente. A maior parte dos problemas está concentrada em poucos componentes e padrões de acesso a dados, o que torna viável uma estratégia de refatoração incremental.

Com a execução das ações priorizadas na Sprint 1 e a medição contínua por meio do `QUERY_DIAG` e do Performance Profiler, é esperado reduzir significativamente o volume de leituras, diminuir a incidência de erros 429 e criar uma base mais estável para as refatorações arquiteturais das sprints seguintes. Isso transforma o esforço de estabilização em um processo orientado por métricas, com baixo risco e impacto direto na confiabilidade e escalabilidade do sistema.