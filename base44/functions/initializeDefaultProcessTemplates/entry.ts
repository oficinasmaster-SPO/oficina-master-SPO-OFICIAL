import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Estrutura completa: área name → subcategorias (títulos dos MAPs)
const TEMPLATE_STRUCTURE = [
  {
    areaName: 'Comercial / Vendas',
    subcategories: [
      'Atendimento (balcão / WhatsApp / telefone)',
      'Pré-atendimento / triagem',
      'Pré-diagnóstico',
      'Orçamentação',
      'Apresentação de proposta',
      'Follow-up',
      'Fechamento',
      'Pós-venda',
      'Produção de vídeos e provas para o cliente',
      'Gestão de leads',
    ]
  },
  {
    areaName: 'Operação / Produção',
    subcategories: [
      'Diagnóstico técnico',
      'Execução do serviço',
      'Testes e validação',
      'Controle de qualidade',
      'Retrabalho / garantia',
      'Planejamento de produção',
      'Gestão de tempo produtivo',
    ]
  },
  {
    areaName: 'Suprimentos / Peças / Compras',
    subcategories: [
      'Cotação',
      'Compras',
      'Controle de estoque',
      'Recebimento',
      'Organização de peças',
      'Controle de perdas',
      'Gestão de fornecedores',
    ]
  },
  {
    areaName: 'Almoxarifado e Gestão de Equipamentos',
    subcategories: [
      'Controle de ferramentas (entrada / saída)',
      'Gestão de equipamentos',
      'Check-in de ferramentas',
      'Check-out de ferramentas',
      'Controle de responsáveis por equipamento',
      'Manutenção preventiva de equipamentos',
      'Teste e validação de equipamentos',
      'Controle de avarias e perdas',
      'Padronização de uso',
      'Organização do almoxarifado',
      'Controle de EPIs',
      'Inventário',
    ]
  },
  {
    areaName: 'Logística Interna',
    subcategories: [
      'Entrada de veículos',
      'Check-in (fotos e checklist)',
      'Movimentação interna',
      'Organização de pátio',
      'Agendamento',
      'Entrega do veículo',
    ]
  },
  {
    areaName: 'Financeiro',
    subcategories: [
      'Contas a pagar',
      'Contas a receber',
      'Fluxo de caixa',
      'Conciliação bancária',
      'Precificação',
      'Controle de inadimplência',
      'Indicadores financeiros',
    ]
  },
  {
    areaName: 'Administrativo / Legal',
    subcategories: [
      'Contratos',
      'Documentação',
      'Contabilidade',
      'Emissão de notas fiscais',
      'Regimento interno',
      'Compliance trabalhista',
    ]
  },
  {
    areaName: 'RH / Gestão de Pessoas',
    subcategories: [
      'Recrutamento e seleção',
      'Treinamento técnico',
      'Treinamento comportamental',
      'Avaliação de desempenho',
      'Plano de carreira',
      'Cultura organizacional',
      'Engajamento',
    ]
  },
  {
    areaName: 'Marketing',
    subcategories: [
      'Tráfego pago',
      'Redes sociais',
      'Produção de conteúdo',
      'Posicionamento de marca',
      'Campanhas',
      'Captação de leads',
      'Parcerias',
    ]
  },
  {
    areaName: 'Qualidade e Processos',
    subcategories: [
      'Criação de processos (SOP)',
      'Checklists',
      'Auditorias',
      'Indicadores (KPIs)',
      'Melhoria contínua',
      'Padronização',
    ]
  },
  {
    areaName: 'Tecnologia / Sistemas',
    subcategories: [
      'ERP',
      'CRM',
      'Ferramentas de diagnóstico',
      'Automações',
      'Integrações',
      'Gestão de dados',
    ]
  },
];

const PLANS = ["FREE", "START", "BRONZE", "PRATA", "GOLD", "IOM", "MILLIONS"];

// Generate next MAP code based on existing docs
async function generateNextMapCode(base44, startFrom = 0) {
  const allDocs = await base44.asServiceRole.entities.ProcessDocument.list();
  const numbers = allDocs
    .filter(d => d.code && d.code.startsWith('MAP-'))
    .map(d => {
      const match = d.code.match(/MAP-(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
  return Math.max(maxNumber, startFrom);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado: apenas admins' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch {}
    const force = body.force === true;

    // Load all existing areas to resolve names → IDs
    const existingAreas = await base44.asServiceRole.entities.ProcessArea.list();
    const areaMap = {};
    for (const area of existingAreas) {
      areaMap[area.name.trim()] = area;
    }

    // Check if templates already exist
    const existingTemplates = await base44.asServiceRole.entities.ProcessDocument.filter({ is_template: true });
    const existingTemplateTitles = new Set(existingTemplates.map(d => d.title));

    if (!force && existingTemplates.length > 0) {
      return Response.json({
        success: true,
        message: `Templates já existem (${existingTemplates.length} encontrados). Use force=true para recriar todos.`,
        count: existingTemplates.length
      });
    }

    // If force, delete all existing templates first
    if (force && existingTemplates.length > 0) {
      for (const doc of existingTemplates) {
        await base44.asServiceRole.entities.ProcessDocument.delete(doc.id);
      }
    }

    let codeCounter = await generateNextMapCode(base44);
    const created = [];
    const skipped = [];
    const errors = [];

    for (const areaConfig of TEMPLATE_STRUCTURE) {
      const area = areaMap[areaConfig.areaName];
      if (!area) {
        errors.push(`Área não encontrada: "${areaConfig.areaName}"`);
        continue;
      }

      for (const subcategory of areaConfig.subcategories) {
        const title = `MAP - ${subcategory}`;

        // Skip if already exists (when not force)
        if (!force && existingTemplateTitles.has(title)) {
          skipped.push(title);
          continue;
        }

        codeCounter++;
        const code = `MAP-${String(codeCounter).padStart(4, '0')}`;

        const doc = {
          title,
          code,
          revision: "1",
          area_id: area.id,
          category: area.name, // legacy compat
          subcategory,
          description: `Template padrão — ${subcategory} (${area.name})`,
          operational_status: "em_elaboracao",
          is_template: true,
          plan_access: PLANS,
          workshop_id: null,
          status: "ativo",
          content_json: {
            objetivo: "",
            campo_aplicacao: "",
            informacoes_complementares: "",
            fluxo_processo: "",
            fluxo_image_url: "",
            atividades: [],
            matriz_riscos: [],
            inter_relacoes: [],
            indicadores: []
          },
          version_history: [{
            revision: "1",
            date: new Date().toISOString(),
            changed_by: user.full_name || user.email,
            changes: "Template criado automaticamente via inicialização do sistema",
            origin: "outro"
          }]
        };

        const result = await base44.asServiceRole.entities.ProcessDocument.create(doc);
        created.push({ id: result.id, title, code, area: area.name });
      }
    }

    return Response.json({
      success: true,
      message: `${created.length} templates criados com sucesso.`,
      created_count: created.length,
      skipped_count: skipped.length,
      errors,
      created
    });

  } catch (error) {
    console.error('Erro ao inicializar templates:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});