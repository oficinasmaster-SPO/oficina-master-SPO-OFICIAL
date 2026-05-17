import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Apenas admin pode rodar seed
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Apenas administradores podem executar seed' }, { status: 403 });
    }

    // Subcategorias padrão globais (workshop_id = null)
    const subcategoriasPadrao = [
      // RECEITAS
      { categoria: 'pecas_aplicadas', label: 'Peças Aplicadas', tipo: 'receita', ordem: 1, entra_tcmp2: true },
      { categoria: 'pecas_aplicadas', label: 'Peças de Terceiros', tipo: 'receita', ordem: 2, entra_tcmp2: true },
      { categoria: 'servicos', label: 'Mão de Obra Técnica', tipo: 'receita', ordem: 1, entra_tcmp2: true },
      { categoria: 'servicos', label: 'Serviços de Terceiros', tipo: 'receita', ordem: 2, entra_tcmp2: true },
      { categoria: 'outras', label: 'Outras Receitas Operacionais', tipo: 'receita', ordem: 1, entra_tcmp2: false },
      { categoria: 'outras', label: 'Receitas Não Operacionais', tipo: 'receita', ordem: 2, entra_tcmp2: false },

      // DESPESAS - OPERACIONAL
      { categoria: 'operacional', label: 'Mão de Obra Direta', tipo: 'despesa', ordem: 1, entra_tcmp2: true },
      { categoria: 'operacional', label: 'Terceirizados', tipo: 'despesa', ordem: 2, entra_tcmp2: true },
      { categoria: 'operacional', label: 'Material de Consumo', tipo: 'despesa', ordem: 3, entra_tcmp2: true },
      { categoria: 'operacional', label: 'EPIs', tipo: 'despesa', ordem: 4, entra_tcmp2: true },
      { categoria: 'operacional', label: 'Equipamentos', tipo: 'despesa', ordem: 5, entra_tcmp2: true },
      { categoria: 'operacional', label: 'Manutenção de Equipamentos', tipo: 'despesa', ordem: 6, entra_tcmp2: true },
      { categoria: 'operacional', label: 'Aluguel', tipo: 'despesa', ordem: 7, entra_tcmp2: true },
      { categoria: 'operacional', label: 'Condomínio', tipo: 'despesa', ordem: 8, entra_tcmp2: true },
      { categoria: 'operacional', label: 'Energia Elétrica', tipo: 'despesa', ordem: 9, entra_tcmp2: true },
      { categoria: 'operacional', label: 'Água e Esgoto', tipo: 'despesa', ordem: 10, entra_tcmp2: true },
      { categoria: 'operacional', label: 'Internet/Telefone', tipo: 'despesa', ordem: 11, entra_tcmp2: true },
      { categoria: 'operacional', label: 'Limpeza', tipo: 'despesa', ordem: 12, entra_tcmp2: true },
      { categoria: 'operacional', label: 'Segurança', tipo: 'despesa', ordem: 13, entra_tcmp2: true },

      // DESPESAS - PESSOAS
      { categoria: 'pessoas', label: 'Salários', tipo: 'despesa', ordem: 1, entra_tcmp2: true },
      { categoria: 'pessoas', label: 'Pró-labore sócios', tipo: 'despesa', ordem: 2, entra_tcmp2: false },
      { categoria: 'pessoas', label: 'Encargos Trabalhistas', tipo: 'despesa', ordem: 3, entra_tcmp2: true },
      { categoria: 'pessoas', label: 'Benefícios', tipo: 'despesa', ordem: 4, entra_tcmp2: true },
      { categoria: 'pessoas', label: 'Treinamentos', tipo: 'despesa', ordem: 5, entra_tcmp2: true },
      { categoria: 'pessoas', label: 'Recrutamento', tipo: 'despesa', ordem: 6, entra_tcmp2: true },

      // DESPESAS - MARKETING
      { categoria: 'marketing', label: 'Tráfego Pago', tipo: 'despesa', ordem: 1, entra_tcmp2: true },
      { categoria: 'marketing', label: 'Redes Sociais', tipo: 'despesa', ordem: 2, entra_tcmp2: true },
      { categoria: 'marketing', label: 'Google Ads', tipo: 'despesa', ordem: 3, entra_tcmp2: true },
      { categoria: 'marketing', label: 'Facebook Ads', tipo: 'despesa', ordem: 4, entra_tcmp2: true },
      { categoria: 'marketing', label: 'Materiais Promocionais', tipo: 'despesa', ordem: 5, entra_tcmp2: true },

      // DESPESAS - ADMINISTRATIVO
      { categoria: 'administrativo', label: 'Contabilidade', tipo: 'despesa', ordem: 1, entra_tcmp2: true },
      { categoria: 'administrativo', label: 'Advocacia', tipo: 'despesa', ordem: 2, entra_tcmp2: true },
      { categoria: 'administrativo', label: 'Software/Gestão', tipo: 'despesa', ordem: 3, entra_tcmp2: true },
      { categoria: 'administrativo', label: 'Bancos/Taxas', tipo: 'despesa', ordem: 4, entra_tcmp2: true },
      { categoria: 'administrativo', label: 'Seguros', tipo: 'despesa', ordem: 5, entra_tcmp2: true },
      { categoria: 'administrativo', label: 'Impostos/Taxas', tipo: 'despesa', ordem: 6, entra_tcmp2: true },

      // DESPESAS - FINANCEIRO
      { categoria: 'financeiro', label: 'Financiamento (veículo/imóvel)', tipo: 'despesa', ordem: 1, entra_tcmp2: false },
      { categoria: 'financeiro', label: 'Consórcio', tipo: 'despesa', ordem: 2, entra_tcmp2: false },
      { categoria: 'financeiro', label: 'Parcelamento de equipamento', tipo: 'despesa', ordem: 3, entra_tcmp2: false },
      { categoria: 'financeiro', label: 'Processos judiciais', tipo: 'despesa', ordem: 4, entra_tcmp2: false },
      { categoria: 'financeiro', label: 'Compra de imóvel/terreno', tipo: 'despesa', ordem: 5, entra_tcmp2: false },
      { categoria: 'financeiro', label: 'Investimentos', tipo: 'despesa', ordem: 6, entra_tcmp2: false },
      { categoria: 'financeiro', label: 'Juros/Multas', tipo: 'despesa', ordem: 7, entra_tcmp2: false },

      // DESPESAS - PEÇAS ESTOQUE
      { categoria: 'pecas_estoque', label: 'Compra de Peças (reposição)', tipo: 'despesa', ordem: 1, entra_tcmp2: false },
      { categoria: 'pecas_estoque', label: 'Compra de Peças (aplicação)', tipo: 'despesa', ordem: 2, entra_tcmp2: false },
      { categoria: 'pecas_estoque', label: 'Perda de Peças', tipo: 'despesa', ordem: 3, entra_tcmp2: false },

      // DESPESAS - MANUTENÇÃO
      { categoria: 'manutencao', label: 'Manutenção Predial', tipo: 'despesa', ordem: 1, entra_tcmp2: true },
      { categoria: 'manutencao', label: 'Manutenção Veículos', tipo: 'despesa', ordem: 2, entra_tcmp2: true },

      // DESPESAS - TERCEIRIZADOS
      { categoria: 'terceirizados', label: 'Serviços de Terceiros', tipo: 'despesa', ordem: 1, entra_tcmp2: true },
      { categoria: 'terceirizados', label: 'Consultorias', tipo: 'despesa', ordem: 2, entra_tcmp2: true },
    ];

    // Verificar se já existem subcategorias globais
    const existentes = await base44.entities.SubcategoriaDRE.filter({ workshop_id: null });
    const existentesMap = new Map(existentes.map(s => `${s.categoria}_${s.label}`));

    const criadas = [];
    const ignoradas = [];

    for (const sub of subcategoriasPadrao) {
      const key = `${sub.categoria}_${sub.label}`;
      if (existentesMap.has(key)) {
        ignoradas.push(key);
      } else {
        await base44.entities.SubcategoriaDRE.create({
          ...sub,
          workshop_id: null, // Global
          ativo: true
        });
        criadas.push(key);
      }
    }

    return Response.json({
      success: true,
      message: `Seed executado com sucesso`,
      criadas: criadas.length,
      ignoradas: ignoradas.length,
      detalhes: { criadas, ignoradas }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});