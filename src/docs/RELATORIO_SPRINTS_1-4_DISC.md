# Relatório — Sprints 1 a 4 (Módulo DISC e Pedidos Internos)

> Data: 18/09/2026 · Escopo: evolução do teste DISC comportamental e do módulo de Pedidos Internos do SPO.

---

## Sprint 1 e 2 — Pedidos Internos (fundação do módulo)

**Objetivo:** transformar o módulo de Pedidos Internos em um service desk interno completo, com rastreabilidade, automações e UX de lista densa.

**Entregas principais:**
- Listagem densa com colunas fixas, agrupamento por status e seções colapsáveis (Recusado/Concluído).
- Stepper visual de status com coreografia animada (shimmer, check-pop, pulso).
- Portal overlay para o drawer de detalhes (substituindo o painel dividido que comprimia a lista).
- Relógio de 60s para atualização reativa do SLA na listagem.
- Workflows de automação: notificação ao responsável na criação, ActivityLog em update, sync de status PedidoInterno → FollowUp, auto-conversão de pedido em tarefas na aprovação e follow-up automático ao criar pedido.
- Funções de backend: `notificarPedidoInterno`, `atualizarPedidoInterno`, `transicionarStatusPedido`, `converterPedidoEmTarefas`, `verificarPrazosPedidoInterno`, `backfillCodigoPedidos`.
- Padronização de campos estruturais (Cliente Relacionado como input fixo em edição por regra de integridade server-side).

**Problemas resolvidos na sprint:** OOM em leituras de entidades pesadas (projeção + limite de 200), loops de renderização no agente de edição visual, retries que amplificavam rate-limit 429.

---

## Sprint 3 — Unificação do fluxo DISC público

**Objetivo:** um único caminho de cálculo e submissão para o teste DISC público (candidato externo/colaborador via link).

**Entregas principais:**
- Motor único de cálculo DISC em `shared/discEngine` — converte ranking coletado na escala **"1 = mais parecido"** e centraliza percentuais/dominância.
- Endpoint `publicEndpoints` migrado para o motor compartilhado, com **validação server-side** das submissões (o cliente não calcula mais percentuais).
- Instrução do teste público (`PublicDISC.jsx`) padronizada para "1 = mais parecido".
- Documentação da lógica de geração de links DISC (token UUID em `DISCPublicSession` → `/PublicDISC?token=...`).

---

## Sprint 4 — Perfil DISC recente e modal de perguntas individuais

**Objetivo:** UX uniforme entre diagnóstico do gestor e autoavaliação, com o resultado mais recente visível ao colaborador.

**Entregas principais:**
- `PerfilDISCRecente` — exibe o diagnóstico DISC mais recente do colaborador na tela de autoavaliação.
- `DISCAvaliacaoModal` — modal de perguntas individuais (uma por vez, ranking 1–4, progresso) substituindo o formulário inline de 24 conjuntos na tela de diagnóstico.
- Submissão unificada via `submeterDiagnosticoDISC` (validação e cálculo server-side) e exibição do resultado em modal ao concluir.

**Correções de QA (18/09):**
1. **"Eu mesmo" sem efeito corrigido** — a opção de autoavaliação só é oferecida quando existe perfil de colaborador vinculado à conta (antes, para admins/internos, `currentUserEmployee` era nulo e a seleção não preenchia o avaliado). O tipo de avaliação virou estado explícito controlado pela página, eliminando a inferência por comparação de IDs.
2. **"Tipo de Avaliação" no Combobox da plataforma** — substituído o select nativo/Radix pelo `Combobox`, igual ao seletor de colaboradores.
3. **Layout shift ao abrir o modal eliminado** — `useModalScrollLock` aplicado no modal de avaliação (trava o scroll de fundo sem deslocamento, mesmo padrão dos demais modais).

**Pendências:** verificação de domínio próprio no Resend (envios reais de e-mail), logs de auditoria de disparos e QA final do fluxo de diagnóstico.

---

# As 24 perguntas do Teste DISC

**Mecânica:** em cada pergunta, o avaliador ordena as quatro alternativas de **1 (mais parecido com o avaliado) a 4 (menos parecido)**, sem repetir números. Cada pergunta cruza os quatro perfis:

| # | D — Executor | I — Comunicador | S — Planejador | C — Analista |
|---|---|---|---|---|
| 1 | Autoconfiante, Independente, Dominante | Comunicativo, Alegre, Extrovertido | Acolhedor, Amigável, Paciente | Autodisciplinado, Atento a detalhes, Diligente |
| 2 | Pró-ativo, Empreendedor, Corajoso | Participativo, Relacional, Flexível | Agradável, Tranquilo, Organizado | Criterioso, Cuidadoso, Especialista |
| 3 | Prático, Rápido, Eficiente | Persuasivo, Contagiante, Estimulante | Calmo, Rotineiro, Constante | Idealizador, Perfeccionista, Uniforme |
| 4 | Objetivo, Assertivo, Focado em Resultados | Preza pelo prazer, Emotivo, Divertido | Conciliador, Conselheiro, Bom ouvinte | Conforme, Sistemático, Sensato |
| 5 | Determinado, Firme, Enérgico | Criativo, Falante, Distraído | Comedido, Amável, Mediador | Preciso, Lógico, Racional |
| 6 | Lutador, Combativo, Agressivo | Participativo, Facilitador, Influenciador | Auto-controlado, Conservador, Responsável | Profundo, Perceptivo, Estratégico |
| 7 | Automotivado, Pioneiro, Impulsionador | Articulador, Empolgante, Motivador | Persistente, Prevenido, Tolerante | Exato, Exigente, Estruturado |
| 8 | Resolvedor, Destemido, Desafiador | Vaidoso, Simpático, Gosta de ser reconhecido | Aconselhador, Harmônico, Apoiador | Ponderado, Ordenador, Analisador |
| 9 | Competitivo, Assume riscos, Desbravador | Entusiasmado, Impulsivo, Otimista | Moderado, Equilibrado, Estável | Teórico, Conservador, Aprofunda Conhecimentos |
| 10 | Direcionador, Solucionador, Empreendedor | Agregador, Sociável, Móvel | Conciliador, Observador, Diplomata | Regulador, Especialista, Orientador |
| 11 | Aventureiro, Firme, Ousado | Sociável, Expressivo, Entusiástico | Paciente, Previsível, Estável | Metódico, Analítico, Preciso |
| 12 | Competitivo, Decidido, Direto | Alegre, Comunicativo, Animado | Leal, Apoiador, Confiável | Perfeccionista, Detalhista, Cuidadoso |
| 13 | Inovador, Autossuficiente, Vigoroso | Brincalhão, Cativante, Espontâneo | Compreensivo, Tranquilo, Metódico | Crítico, Exigente, Sistemático |
| 14 | Proativo, Intrépido, Resolve | Popular, Otimista, Estimulante | Previsível, Constante, Sereno | Rigoroso, Estruturado, Cumpridor |
| 15 | Desafiador, Líder, Enfático | Inspirador, Conversador, Amável | Moderado, Satisfeito, Protetor | Convencional, Reflexivo, Lógico |
| 16 | Agressivo, Determinado, Pioneiro | Impulsivo, Cativante, Charmoso | Harmonioso, Submisso, Adaptável | Investigador, Cuidadoso, Correto |
| 17 | Ativo, Controlador, Confrontador | Extrovertido, Franco, Jovial | Sistemático, Conciliador, Seguro | Exato, Organizado, Reservado |
| 18 | Resultados, Direcionador, Exigente | Persuasivo, Animado, Sociável | Pacífico, Rotineiro, Amigável | Analítico, Racional, Cauteloso |
| 19 | Firme, Corajoso, Independente | Participativo, Alegre, Divertido | Consistente, Calmo, Acolhedor | Regrado, Minucioso, Prudente |
| 20 | Obstinado, Audacioso, Produtivo | Carismático, Descontraído, Entusiasmado | Paciente, Tolerante, Cooperativo | Disciplinado, Sensato, Formal |
| 21 | Autoritário, Assertivo, Realizador | Influenciador, Comunicador, Otimista | Estável, Cuidadoso, Constante | Sistemático, Lógico, Pensador |
| 22 | Intenso, Resoluto, Líder | Expressivo, Extrovertido, Popular | Comedido, Leal, Ponderado | Observador, Avaliador, Criterioso |
| 23 | Focado, Energético, Pragmático | Simpático, Entusiasta, Relacional | Rotineiro, Agradável, Companheiro | Detalhista, Ordenado, Exato |
| 24 | Ousado, Independente, Direto | Articulado, Festivo, Encantador | Fiel, Conselheiro, Tradicional | Perfeccionista, Questionador, Preparado |

**Fonte:** `src/components/disc/DISCQuestions.jsx` (fonte única de verdade, consumida pelos três fluxos: diagnóstico do gestor, autoavaliação e teste público via link).

## Perfis resultantes

| Perfil | Cor | Resumo |
|---|---|---|
| **Executor (D)** | `#ef4444` | Orientado a resultados e desafios; liderança e decisões rápidas. |
| **Comunicador (I)** | `#f59e0b` | Extrovertido; relacionamento com clientes e motivação de equipes. |
| **Planejador (S)** | `#22c55e` | Estabilidade, processos e organização operacional. |
| **Analista (C)** | `#3b82f6` | Precisão, análise e controle de qualidade. |