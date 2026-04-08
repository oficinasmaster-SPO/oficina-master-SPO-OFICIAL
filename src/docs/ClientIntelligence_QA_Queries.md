# QUERIES E PROMPTS PARA BASE44
# Relacionado ao Relatório de QA - ClientIntelligenceViewer
# Use estas queries no console/API do base44 para validar e corrigir dados

## ============================================================================
## 1. QUERIES DE VALIDAÇÃO RÁPIDA
## ============================================================================

# 1.1 - Listar todos os ClientIntelligence de uma oficina
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID

# 1.2 - Buscar registros sem área definida (problemático)
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[area]=null

# 1.3 - Buscar registros sem tipo definido (problemático)
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[type]=null

# 1.4 - Buscar registros sem gravidade (usará fallback 'media')
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[gravity]=null

# 1.5 - Buscar checklists ativos de uma área específica
GET /entities/ClientIntelligenceChecklist?filter[workshop_id]=WORKSHOP_ID&filter[area]=vendas_conversao&filter[status]=ativo

# 1.6 - Buscar progresso de checklist de uma inteligência específica
GET /entities/ClientIntelligenceChecklistProgress?filter[intelligence_id]=INTELLIGENCE_ID

## ============================================================================
## 2. QUERIES DE ANÁLISE POR TIPO
## ============================================================================

# 2.1 - Buscar todas as "Dores" (problemas ativos)
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[type]=dor

# 2.2 - Buscar todas as "Dúvidas"
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[type]=duvida

# 2.3 - Buscar todos os "Desejos"
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[type]=desejo

# 2.4 - Buscar todos os "Riscos"
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[type]=risco

# 2.5 - Buscar todas as "Evoluções" (problemas resolvidos)
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[type]=evolucao

## ============================================================================
## 3. QUERIES DE ANÁLISE POR GRAVIDADE
## ============================================================================

# 3.1 - Problemas CRÍTICOS
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[gravity]=critica

# 3.2 - Problemas de gravidade ALTA
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[gravity]=alta

# 3.3 - Problemas de gravidade MÉDIA
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[gravity]=media

# 3.4 - Problemas de gravidade BAIXA
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[gravity]=baixa

## ============================================================================
## 4. QUERIES DE ANÁLISE POR ÁREA
## ============================================================================

# 4.1 - Problemas de Vendas & Conversão
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[area]=vendas_conversao

# 4.2 - Problemas de Marketing & Demanda
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[area]=marketing_demanda

# 4.3 - Problemas de Operação Técnica
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[area]=operacao_tecnica

# 4.4 - Problemas de Gestão & Processos
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[area]=gestao_processos

# 4.5 - Problemas Financeiros
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[area]=financeiro

# 4.6 - Problemas de Pessoas & Contratação
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[area]=pessoas_contratacao

# 4.7 - Problemas de Estoque & Compras
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[area]=estoque_compras

# 4.8 - Problemas de Precificação & Margem
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[area]=precificacao_margem

# 4.9 - Problemas de Atendimento & Experiência
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[area]=atendimento_experiencia

# 4.10 - Problemas de Liderança & Dono
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[area]=lideranca_dono

## ============================================================================
## 5. QUERIES DE ANÁLISE POR STATUS
## ============================================================================

# 5.1 - Problemas ATIVOS (ainda não resolvidos)
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[status]=ativo

# 5.2 - Problemas EM PROGRESSO
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[status]=em_progresso

# 5.3 - Problemas RESOLVIDOS
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[status]=resolvido

# 5.4 - Problemas ARQUIVADOS
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[status]=arquivado

## ============================================================================
## 6. QUERIES COMBINADAS (ANÁLISE AVANÇADA)
## ============================================================================

# 6.1 - Dores críticas ainda ativas (ALTA PRIORIDADE!)
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[type]=dor&filter[gravity]=critica&filter[status]=ativo

# 6.2 - Riscos de alta gravidade
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[type]=risco&filter[gravity]=alta

# 6.3 - Problemas de vendas com gravidade alta ou crítica
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[area]=vendas_conversao&filter[gravity][in]=alta,critica

# 6.4 - Evoluções registradas (problemas que foram resolvidos)
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[type]=evolucao&filter[status]=resolvido

# 6.5 - Histórico de problemas similares (mesma área e subcategoria)
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[area]=AREA&filter[subcategory]=SUBCATEGORY

## ============================================================================
## 7. SCRIPTS DE CORREÇÃO (UPDATES)
## ============================================================================

# 7.1 - Adicionar gravidade padrão a um registro sem gravidade
PATCH /entities/ClientIntelligence/INTELLIGENCE_ID
{
  "gravity": "media"
}

# 7.2 - Corrigir status de um problema
PATCH /entities/ClientIntelligence/INTELLIGENCE_ID
{
  "status": "resolvido"
}

# 7.3 - Registrar evolução em um problema (MERGE, não sobrescrever!)
PATCH /entities/ClientIntelligence/INTELLIGENCE_ID
{
  "status": "resolvido",
  "action_description": "Solução implementada com sucesso",
  "metadata": {
    "evolution": {
      "impactBefore": "10% de perda mensal",
      "impactAfter": "0% de perda",
      "learnings": "Implementação de checklist diário resolveu o problema",
      "evolutionDate": "2026-04-08"
    }
  }
}

# 7.4 - Atualizar percentual de progresso de checklist
PATCH /entities/ClientIntelligenceChecklistProgress/PROGRESS_ID
{
  "completion_percentage": 75,
  "checked_items": [
    { "item_id": "item_1", "checked": true, "notes": "", "updated_at": "2026-04-08T10:00:00Z" },
    { "item_id": "item_2", "checked": true, "notes": "", "updated_at": "2026-04-08T10:00:00Z" },
    { "item_id": "item_3", "checked": true, "notes": "", "updated_at": "2026-04-08T10:00:00Z" },
    { "item_id": "item_4", "checked": false, "notes": "", "updated_at": "2026-04-08T10:00:00Z" }
  ]
}

# 7.5 - Corrigir data inválida
PATCH /entities/ClientIntelligence/INTELLIGENCE_ID
{
  "resolution_date": "2026-12-31"
}

# 7.6 - Limpar data inválida (setar como null)
PATCH /entities/ClientIntelligence/INTELLIGENCE_ID
{
  "resolution_date": null
}

## ============================================================================
## 8. QUERIES DE CRIAÇÃO
## ============================================================================

# 8.1 - Criar novo registro de ClientIntelligence
POST /entities/ClientIntelligence
{
  "workshop_id": "WORKSHOP_ID",
  "type": "dor",
  "area": "vendas_conversao",
  "subcategory": "Falta de fechamento",
  "title": "Baixa taxa de conversão de orçamentos",
  "description": "Cliente pede orçamento mas não fecha. Taxa de conversão está em 20%.",
  "gravity": "alta",
  "frequency": "recorrente",
  "status": "ativo",
  "impact": "Perda de 80% dos leads qualificados",
  "tags": ["processo de vendas", "follow-up"],
  "metadata": {
    "responsibles": "João (vendedor)",
    "created_by": "system"
  }
}

# 8.2 - Criar checklist para uma área/tipo
POST /entities/ClientIntelligenceChecklist
{
  "workshop_id": "WORKSHOP_ID",
  "area": "vendas_conversao",
  "type": "dor",
  "title": "Checklist para melhorar conversão de vendas",
  "description": "Passos para aumentar taxa de fechamento",
  "status": "ativo",
  "items": [
    { "id": "item_1", "label": "Fazer follow-up em 24h após orçamento", "order": 1 },
    { "id": "item_2", "label": "Explicar valor agregado, não só preço", "order": 2 },
    { "id": "item_3", "label": "Oferecer garantia estendida", "order": 3 },
    { "id": "item_4", "label": "Enviar depoimentos de clientes satisfeitos", "order": 4 }
  ]
}

# 8.3 - Criar progresso inicial de checklist
POST /entities/ClientIntelligenceChecklistProgress
{
  "workshop_id": "WORKSHOP_ID",
  "intelligence_id": "INTELLIGENCE_ID",
  "checklist_id": "CHECKLIST_ID",
  "checked_items": [
    { "item_id": "item_1", "checked": false, "notes": "" },
    { "item_id": "item_2", "checked": false, "notes": "" },
    { "item_id": "item_3", "checked": false, "notes": "" },
    { "item_id": "item_4", "checked": false, "notes": "" }
  ],
  "completion_percentage": 0
}

## ============================================================================
## 9. QUERIES DE DELEÇÃO (USE COM CUIDADO!)
## ============================================================================

# 9.1 - Deletar um registro de ClientIntelligence
DELETE /entities/ClientIntelligence/INTELLIGENCE_ID

# 9.2 - Deletar um checklist
DELETE /entities/ClientIntelligenceChecklist/CHECKLIST_ID

# 9.3 - Deletar progresso de checklist
DELETE /entities/ClientIntelligenceChecklistProgress/PROGRESS_ID

## ============================================================================
## 10. QUERIES DE ANÁLISE DE IA (InvokeLLM)
## ============================================================================

# 10.1 - Gerar sugestões de inteligência baseadas em contexto
POST /integrations/Core/InvokeLLM
{
  "prompt": "Você é um consultor de negócios. Analise o contexto da oficina e sugira 3-4 problemas/oportunidades em formato JSON.",
  "response_json_schema": {
    "type": "object",
    "properties": {
      "suggestions": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "type": { "type": "string" },
            "title": { "type": "string" },
            "description": { "type": "string" },
            "area": { "type": "string" },
            "subcategory": { "type": "string" },
            "gravity": { "type": "string" }
          }
        }
      }
    }
  }
}

## ============================================================================
## 11. VERIFICAÇÃO DE INTEGRIDADE REFERENCIAL
## ============================================================================

# 11.1 - Verificar se todos os progress têm intelligence_id válido
# (executar como script, não query direta)
# Para cada ClientIntelligenceChecklistProgress:
#   1. GET /entities/ClientIntelligenceChecklistProgress
#   2. Para cada item, verificar se intelligence_id existe:
#      GET /entities/ClientIntelligence/INTELLIGENCE_ID
#   3. Se não existir, deletar o progress órfão

# 11.2 - Verificar se todos os progress têm checklist_id válido
# Similar ao anterior, mas verificando checklist_id

## ============================================================================
## 12. EXEMPLOS DE FILTROS AVANÇADOS
## ============================================================================

# 12.1 - Problemas criados nos últimos 7 dias
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[created_date][gte]=2026-04-01

# 12.2 - Problemas com prazo de resolução vencido
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[resolution_date][lte]=2026-04-08&filter[status]=ativo

# 12.3 - Problemas sem tags
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[tags]=null

# 12.4 - Problemas com action_description preenchida
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[action_description][not]=null

## ============================================================================
## 13. QUERIES PARA RELATÓRIOS E DASHBOARDS
## ============================================================================

# 13.1 - Contar problemas por tipo
# (Executar query para cada tipo e consolidar)
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[type]=dor&count=true
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[type]=duvida&count=true
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[type]=desejo&count=true
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[type]=risco&count=true
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[type]=evolucao&count=true

# 13.2 - Taxa de resolução (resolvidos / total)
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&count=true
GET /entities/ClientIntelligence?filter[workshop_id]=WORKSHOP_ID&filter[status]=resolvido&count=true

# 13.3 - Problemas por área (para gráfico)
# Executar para cada área e consolidar os counts

# 13.4 - Média de completion_percentage dos checklists
GET /entities/ClientIntelligenceChecklistProgress?filter[workshop_id]=WORKSHOP_ID
# Calcular média localmente dos completion_percentage

## ============================================================================
## NOTAS IMPORTANTES
## ============================================================================

# • Sempre substitua WORKSHOP_ID, INTELLIGENCE_ID, etc. pelos IDs reais
# • Use filtros combinados para queries mais precisas
# • Para PATCH, sempre faça merge de metadata, não sobrescreva
# • Validar datas antes de fazer update (formato ISO 8601: YYYY-MM-DD)
# • Testar queries em ambiente de desenvolvimento antes de produção
# • Fazer backup antes de executar scripts de correção em massa
# • Usar transações quando disponível para operações críticas