import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DEFAULT_AREAS = [
  {
    name: 'Comercial / Vendas',
    category: 'geral',
    icon: 'ShoppingCart',
    color: '#3B82F6',
    order: 1,
    description: 'Processos de atendimento, vendas e relacionamento com o cliente',
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
      'Gestão de leads'
    ]
  },
  {
    name: 'Operação / Produção',
    category: 'tecnica',
    icon: 'Wrench',
    color: '#64748B',
    order: 2,
    description: 'Processos técnicos de execução e controle de serviços',
    subcategories: [
      'Diagnóstico técnico',
      'Execução do serviço',
      'Testes e validação',
      'Controle de qualidade',
      'Retrabalho / garantia',
      'Planejamento de produção',
      'Gestão de tempo produtivo'
    ]
  },
  {
    name: 'Suprimentos / Peças / Compras',
    category: 'geral',
    icon: 'Package',
    color: '#14B8A6',
    order: 3,
    description: 'Processos de compras, estoque e gestão de fornecedores',
    subcategories: [
      'Cotação',
      'Compras',
      'Controle de estoque',
      'Recebimento',
      'Organização de peças',
      'Controle de perdas',
      'Gestão de fornecedores'
    ]
  },
  {
    name: 'Almoxarifado e Gestão de Equipamentos',
    category: 'geral',
    icon: 'Archive',
    color: '#F97316',
    order: 4,
    description: 'Controle de ferramentas, equipamentos e materiais',
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
      'Inventário'
    ]
  },
  {
    name: 'Logística Interna',
    category: 'geral',
    icon: 'Truck',
    color: '#06B6D4',
    order: 5,
    description: 'Entrada, movimentação e entrega de veículos',
    subcategories: [
      'Entrada de veículos',
      'Check-in (fotos e checklist)',
      'Movimentação interna',
      'Organização de pátio',
      'Agendamento',
      'Entrega do veículo'
    ]
  },
  {
    name: 'Financeiro',
    category: 'geral',
    icon: 'DollarSign',
    color: '#10B981',
    order: 6,
    description: 'Processos financeiros, fluxo de caixa e precificação',
    subcategories: [
      'Contas a pagar',
      'Contas a receber',
      'Fluxo de caixa',
      'Conciliação bancária',
      'Precificação',
      'Controle de inadimplência',
      'Indicadores financeiros'
    ]
  },
  {
    name: 'Administrativo / Legal',
    category: 'geral',
    icon: 'FileText',
    color: '#6B7280',
    order: 7,
    description: 'Contratos, documentação, contabilidade e compliance',
    subcategories: [
      'Contratos',
      'Documentação',
      'Contabilidade',
      'Emissão de notas fiscais',
      'Regimento interno',
      'Compliance trabalhista'
    ]
  },
  {
    name: 'RH / Gestão de Pessoas',
    category: 'geral',
    icon: 'Users',
    color: '#F59E0B',
    order: 8,
    description: 'Recrutamento, treinamento, avaliação e cultura organizacional',
    subcategories: [
      'Recrutamento e seleção',
      'Treinamento técnico',
      'Treinamento comportamental',
      'Avaliação de desempenho',
      'Plano de carreira',
      'Cultura organizacional',
      'Engajamento'
    ]
  },
  {
    name: 'Marketing',
    category: 'geral',
    icon: 'Megaphone',
    color: '#8B5CF6',
    order: 9,
    description: 'Tráfego pago, redes sociais, campanhas e captação de leads',
    subcategories: [
      'Tráfego pago',
      'Redes sociais',
      'Produção de conteúdo',
      'Posicionamento de marca',
      'Campanhas',
      'Captação de leads',
      'Parcerias'
    ]
  },
  {
    name: 'Qualidade e Processos',
    category: 'geral',
    icon: 'Shield',
    color: '#EC4899',
    order: 10,
    description: 'SOPs, checklists, auditorias, KPIs e melhoria contínua',
    subcategories: [
      'Criação de processos (SOP)',
      'Checklists',
      'Auditorias',
      'Indicadores (KPIs)',
      'Melhoria contínua',
      'Padronização'
    ]
  },
  {
    name: 'Tecnologia / Sistemas',
    category: 'geral',
    icon: 'Monitor',
    color: '#0EA5E9',
    order: 11,
    description: 'ERP, CRM, automações e gestão de dados',
    subcategories: [
      'ERP',
      'CRM',
      'Ferramentas de diagnóstico',
      'Automações',
      'Integrações',
      'Gestão de dados'
    ]
  }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado: apenas admins' }, { status: 403 });
    }

    // Forçar re-inicialização via body ou query param
    let body = {};
    try { body = await req.json(); } catch {}
    const url = new URL(req.url);
    const force = body.force === true || url.searchParams.get('force') === 'true';

    const existingAreas = await base44.asServiceRole.entities.ProcessArea.filter({ is_default: true });

    if (existingAreas && existingAreas.length > 0 && !force) {
      return Response.json({
        success: true,
        message: 'Áreas padrão já foram inicializadas. Use ?force=true para reinicializar.',
        count: existingAreas.length
      });
    }

    // Se force=true, deletar existentes para recriar
    if (force && existingAreas.length > 0) {
      for (const area of existingAreas) {
        await base44.asServiceRole.entities.ProcessArea.delete(area.id);
      }
    }

    const createdAreas = [];
    for (const area of DEFAULT_AREAS) {
      const created = await base44.asServiceRole.entities.ProcessArea.create({
        ...area,
        is_default: true,
        workshop_id: null
      });
      createdAreas.push(created);
    }

    return Response.json({
      success: true,
      message: `${createdAreas.length} áreas padrão criadas com sucesso`,
      areas: createdAreas
    });

  } catch (error) {
    console.error('Erro ao inicializar áreas:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});