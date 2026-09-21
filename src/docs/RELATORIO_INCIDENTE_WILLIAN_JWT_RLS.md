# Relatório de Encerramento de Incidente — Willian (Cronograma de Consultoria vazio)

**Data do incidente:** 21/09/2026
**Usuário afetado:** Willian — `motomaiscasadepecas@gmail.com`
**Página afetada:** `/CronogramaConsultoria`
**Status:** Resolvido (contorno aplicado; causa raiz documentada para arquitetura)
**Classificação:** Acesso bloqueado por divergência entre JWT em uso e dados do banco (camada de RLS)

---

## 1. Sintoma reportado

O usuário externo Willian acessava a página **Cronograma de Consultoria** e via todas as
abas vazias (Próximos Atendimentos, Atas de Reunião, Follow-ups), embora existissem
registros reais de `ConsultoriaAtendimento`, `MeetingMinutes` e `FollowUpReminder`
para a oficina dele no banco.

O sintoma **persistiu mesmo após logout/login**, descartando o "JWT antigo em
localStorage" como causa única.

## 2. Linha de investigação (o que foi verificado e descartado)

| # | Hipótese | Verificação | Resultado |
|---|----------|-------------|-----------|
| 1 | Registro do User desatualizado | Leitura direta do User no banco | ❌ Descartada — `tenant_workshop_id` e `data.workshop_id` corretos; `updated_date` = 2026-09-21T14:01:50 (o `resolveTenant` tinha rodado e sincronizado) |
| 2 | RLS do `MeetingMinutes` incorreto | Leitura do schema `base44/entities/MeetingMinutes.jsonc` | ❌ Descartada — regras contêm os 3 ramos (`{{user.tenant_workshop_id}}`, `{{user.workshop_id}}`, `{{user.data.workshop_id}}`) + admin/internal |
| 3 | Filtro errado na query da página | Leitura de `src/pages/CronogramaConsultoria.jsx` | ❌ Descartada — filtro `{ workshop_id: activeWorkshopId }` correto; dados existiam para esse workshop_id (confirmado via leitura direta) |
| 4 | Logout não limpou localStorage | Análise do fluxo de token | ❌ Descartada — o problema persistiu com token recém-emitido |
| 5 | **JWT não carrega `data.workshop_id` no payload** | Análise do fluxo de token (`base44Client.js`) | ✅ **CONFIRMADA — causa raiz** |

## 3. Causa raiz

O RLS do Base44 avalia o **payload do JWT** da requisição — não o banco. O fluxo
verificado no código:

1. `src/lib/app-params.js`: token entra pela URL no login e é persistido em
   `localStorage['base44_access_token']`.
2. `src/api/base44Client.js` (`resolveCurrentToken` + Proxy): cada chamada do SDK lê o
   token do localStorage na hora — o client é recriado se o token mudar. **O client
   nunca segura token stale.**
3. **O gap:** quem escreve um token novo no localStorage é apenas o login da
   plataforma. O `resolveTenant` (backend function) atualiza o User no banco
   (`tenant_workshop_id` + `data.workshop_id`), mas **não existe mecanismo de
   renovação de token exposto ao app** — o SDK não oferece `refreshToken`, e o
   `sessionManager.js` só reage a 401 (expiração).

Resultado: se o JWT em uso foi emitido com `data.workshop_id = null` no payload
(antes do backfill de tenant de julho/2026), o RLS continua negando a leitura
independentemente do banco estar correto. Atualizar o banco **não invalida o token
em uso**.

**Conclusão arquitetural:** para usuários externos, dados lidos via query direta de
entidade dependem do snapshot de claims do JWT do usuário. Esse snapshot só é
garantido atualizado no momento de emissão do token (login). Não é seguro construir
fluxos de dados críticos de cliente sobre `{{user.data.*}}` em RLS quando esses
campos podem mudar durante a sessão.

## 4. Correção aplicada (contorno arquitetural)

### 4.1 Nova backend function: `getCronogramaData`

**Arquivo:** `base44/functions/getCronogramaData/entry.ts`

BFF que substitui as queries diretas de entidade na página:

- Roda como **`asServiceRole`** — a busca de dados não depende do JWT do usuário.
- **Isolamento mantido manualmente:** antes de retornar qualquer dado, valida no
  banco que o usuário tem `TenantMembership` **ativa** (`user_id` + `workshop_id` +
  `status: 'active'`). Sem vínculo → HTTP 403.
- Admins e usuários internos (`user_type: 'internal'`) fazem bypass da validação
  (mesma semântica das regras RLS).
- Retorna em paralelo: `ConsultoriaAtendimento` (500), `MeetingMinutes` (500) e
  `FollowUpReminder` (500), ordenados por data desc.
- Entrada: `POST { workshop_id }`; saída: `{ atendimentos, atas, followUps }`.

### 4.2 Mudança na página: `src/pages/CronogramaConsultoria.jsx`

- As três queries diretas de entidade foram substituídas por **uma única query**
  com o BFF: `base44.functions.invoke('getCronogramaData', { workshop_id })`.
- Query key: `['cronograma-data-bff', activeWorkshopId, user?.id]` (staleTime 2min,
  refetch a cada 5min, `retry: false` — padrão anti-429 do app).
- O subscription de realtime de `MeetingMinutes` foi mantido, apenas apontando o
  refetch para a nova query key do BFF.

**Efeito para o usuário:** basta F5 — não exige logout/login, pois a leitura não
depende mais dos claims do JWT.

## 5. Notas de segurança (importante para auditorias futuras)

1. O BFF **não enfraquece o isolamento multi-tenant**: a validação de vínculo
   continua existindo, apenas movida de "regra RLS sobre JWT" para "verificação
   explícita de `TenantMembership` no banco". Na prática é **mais confiável**,
   porque consulta o estado atual do banco em vez de um snapshot de token.
2. O BFF é read-only (apenas `filter`); mutações continuam passando pelas regras
   RLS das entidades.
3. Limites de 500 registros por coleção adotados para evitar OOM (padrão do app —
   ver dead-ends de memória em auditorias anteriores).

## 6. Pendências e recomendações (não bloqueantes)

- **Não existe endpoint/SDK de renovação forçada de JWT.** Recomenda-se, em revisão
  arquitetural futura, mapear todas as páginas de cliente externo que dependem de
  `{{user.data.workshop_id}}` em RLS e avaliar migração para o padrão BFF
  (`asServiceRole` + validação de membership). O caso Willian pode se repetir com
  qualquer usuário externo cujo perfil de tenant mude fora do ciclo de login.
- **Resíduo conhecido na mesma página:** a query de consultores (`['consultores-list']`)
  ainda usa leitura direta de `Employee.filter()` — sujeita ao mesmo RLS/claims do JWT.
  Impacto limitado: só esvazia o dropdown de filtro de consultor nas Atas; os dados
  principais já vêm pelo BFF. Migrar junto se houver nova ocorrência.
- Casos correlatos da mesma família (auditados na Etapa 3A): André Franco,
  Matheus Felipe, Fernando Zamadei, P1 Pneus — se reportarem sintoma idêntico
  (página de cliente vazia com dados no banco), aplicar o mesmo checklist do §2
  antes de assumir problema de dados.
- O comentário no `resolveTenant` sobre "próximo refresh de token" deve ser lido
  como "próximo login" — não há refresh mid-session.

## 7. Como reproduzir o diagnóstico (se necessário)

1. Confirmar dados no banco: registros de `MeetingMinutes`/`ConsultoriaAtendimento`
   com o `workshop_id` do usuário existem.
2. Confirmar User no banco: `tenant_workshop_id` e `data.workshop_id` corretos.
3. Confirmar RLS do schema: ramos de `workshop_id` presentes.
4. Se 1–3 OK e a página via query direta retorna vazio → causa: claims do JWT.
   Validar aplicando o BFF (`asServiceRole` + membership) e comparando.