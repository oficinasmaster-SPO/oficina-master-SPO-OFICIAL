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
    // Total: 52 subcategorias (6 receitas + 46 despesas)
    const subcategoriasPadrao = [
      // 📈 RECEITAS (6 subcategorias)
      { categoria: 'pecas_aplicadas', label: 'Peças Aplicadas', tipo: 'receita', ordem: 1, entra_tcmp2: true },
      { categoria: 'pecas_aplicadas', label: 'Peças de Terceiros', tipo: 'receita', ordem: 2, entra_tcmp2: true },
      { categoria: 'servicos', label: 'Mão de Obra Técnica', tipo: 'receita', ordem: 1, entra_tcmp2: true },
      { categoria: 'servicos', label: 'Serviços de Terceiros', tipo: 'receita', ordem: 2, entra_tcmp2: true },
      { categoria: 'outras', label: 'Outras Receitas Operacionais', tipo: 'receita', ordem: 1, entra_tcmp2: false },
      { categoria: 'outras', label: 'Receitas Não Operacionais', tipo: 'receita', ordem: 2, entra_tcmp2: false },

      // 📉 DESPESAS - OPERACIONAL (13 subcategorias)
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

      // 📉 DESPESAS - PESSOAS (6 subcategorias)
      { categoria: 'pessoas', label: 'Salários', tipo: 'despesa', ordem: 1, entra_tcmp2: true },
      { categoria: 'pessoas', label: 'Pró-labore sócios', tipo: 'despesa', ordem: 2, entra_tcmp2: false },
      { categoria: 'pessoas', label: 'Encargos Trabalhistas', tipo: 'despesa', ordem: 3, entra_tcmp2: true },
      { categoria: 'pessoas', label: 'Benefícios', tipo: 'despesa', ordem: 4, entra_tcmp2: true },
      { categoria: 'pessoas', label: 'Treinamentos', tipo: 'despesa', ordem: 5, entra_tcmp2: true },
      { categoria: 'pessoas', label: 'Recrutamento', tipo: 'despesa', ordem: 6, entra_tcmp2: true },

      // 📉 DESPESAS - MARKETING (5 subcategorias)
      { categoria: 'marketing', label: 'Tráfego Pago', tipo: 'despesa', ordem: 1, entra_tcmp2: true },
      { categoria: 'marketing', label: 'Redes Sociais', tipo: 'despesa', ordem: 2, entra_tcmp2: true },
      { categoria: 'marketing', label: 'Google Ads', tipo: 'despesa', ordem: 3, entra_tcmp2: true },
      { categoria: 'marketing', label: 'Facebook Ads', tipo: 'despesa', ordem: 4, entra_tcmp2: true },
      { categoria: 'marketing', label: 'Materiais Promocionais', tipo: 'despesa', ordem: 5, entra_tcmp2: true },

      // 📉 DESPESAS - ADMINISTRATIVO (6 subcategorias)
      { categoria: 'administrativo', label: 'Contabilidade', tipo: 'despesa', ordem: 1, entra_tcmp2: true },
      { categoria: 'administrativo', label: 'Advocacia', tipo: 'despesa', ordem: 2, entra_tcmp2: true },
      { categoria: 'administrativo', label: 'Software/Gestão', tipo: 'despesa', ordem: 3, entra_tcmp2: true },
      { categoria: 'administrativo', label: 'Bancos/Taxas', tipo: 'despesa', ordem: 4, entra_tcmp2: true },
      { categoria: 'administrativo', label: 'Seguros', tipo: 'despesa', ordem: 5, entra_tcmp2: true },
      { categoria: 'administrativo', label: 'Impostos/Taxas', tipo: 'despesa', ordem: 6, entra_tcmp2: true },

      // 📉 DESPESAS - FINANCEIRO (7 subcategorias)
      { categoria: 'financeiro', label: 'Financiamento (veículo/imóvel)', tipo: 'despesa', ordem: 1, entra_tcmp2: false },
      { categoria: 'financeiro', label: 'Consórcio', tipo: 'despesa', ordem: 2, entra_tcmp2: false },
      { categoria: 'financeiro', label: 'Parcelamento de equipamento', tipo: 'despesa', ordem: 3, entra_tcmp2: false },
      { categoria: 'financeiro', label: 'Processos judiciais', tipo: 'despesa', ordem: 4, entra_tcmp2: false },
      { categoria: 'financeiro', label: 'Compra de imóvel/terreno', tipo: 'despesa', ordem: 5, entra_tcmp2: false },
      { categoria: 'financeiro', label: 'Investimentos', tipo: 'despesa', ordem: 6, entra_tcmp2: false },
      { categoria: 'financeiro', label: 'Juros/Multas', tipo: 'despesa', ordem: 7, entra_tcmp2: false },

      // 📉 DESPESAS - PEÇAS EM ESTOQUE (3 subcategorias)
      { categoria: 'pecas_estoque', label: 'Compra de Peças (reposição)', tipo: 'despesa', ordem: 1, entra_tcmp2: false },
      { categoria: 'pecas_estoque', label: 'Compra de Peças (aplicação)', tipo: 'despesa', ordem: 2, entra_tcmp2: false },
      { categoria: 'pecas_estoque', label: 'Perda de Peças', tipo: 'despesa', ordem: 3, entra_tcmp2: false },

      // 📉 DESPESAS - MANUTENÇÃO (2 subcategorias)
      { categoria: 'manutencao', label: 'Manutenção Predial', tipo: 'despesa', ordem: 1, entra_tcmp2: true },
      { categoria: 'manutencao', label: 'Manutenção Veículos', tipo: 'despesa', ordem: 2, entra_tcmp2: true },

      // 📉 DESPESAS - TERCEIRIZADOS (2 subcategorias)
      { categoria: 'terceirizados', label: 'Serviços de Terceiros', tipo: 'despesa', ordem: 1, entra_tcmp2: true },
      { categoria: 'terceirizados', label: 'Consultorias', tipo: 'despesa', ordem: 2, entra_tcmp2: true },
    ];

    // Verificar se já existem subcategorias globais
    const existentes = await base44.entities.SubcategoriaDRE.filter({ workshop_id: null });
    const existentesSet = new Set(existentes.map(s => `${s.categoria}_${s.label}`));

    const criadas = [];
    const ignoradas = [];
    const atualizadas = [];

    // Validação de sincronismo
    const validacao = {
      total_esperado: subcategoriasPadrao.length,
      categorias_esperadas: new Set(subcategoriasPadrao.map(s => s.categoria)),
      erros_sincronia: []
    };

    for (const sub of subcategoriasPadrao) {
      const key = `${sub.categoria}_${sub.label}`;
      
      // Validação: categoria deve existir
      if (!sub.categoria || sub.categoria.trim() === '') {
        validacao.erros_sincronia.push(`Subcategoria sem categoria: ${sub.label}`);
        continue;
      }

      // Validação: label único dentro da categoria
      const duplicados = subcategoriasPadrao.filter(
        s => s.categoria === sub.categoria && s.label === sub.label && s !== sub
      );
      if (duplicados.length > 0) {
        validacao.erros_sincronia.push(`Label duplicado na categoria ${sub.categoria}: ${sub.label}`);
        continue;
      }

      if (existentesSet.has(key)) {
        ignoradas.push(key);
        
        // Verificar se precisa atualizar (sincronizar)
        const existente = existentes.find(e => e.categoria === sub.categoria && e.label === sub.label);
        if (existente) {
          const precisaAtualizar = 
            existente.ordem !== sub.ordem || 
            existente.entra_tcmp2 !== sub.entra_tcmp2;
          
          if (precisaAtualizar) {
            await base44.entities.SubcategoriaDRE.update(existente.id, {
              ordem: sub.ordem,
              entra_tcmp2: sub.entra_tcmp2
            });
            atualizadas.push(key);
          }
        }
      } else {
        await base44.entities.SubcategoriaDRE.create({
          ...sub,
          workshop_id: null, // Global
          ativo: true
        });
        criadas.push(key);
      }
    }

    // Relatório de sincronismo
    const categoriasUnicas = [...new Set(subcategoriasPadrao.map(s => s.categoria))];
    const resumoPorCategoria = {};
    
    categoriasUnicas.forEach(categoria => {
      const subcats = subcategoriasPadrao.filter(s => s.categoria === categoria);
      resumoPorCategoria[categoria] = {
        total: subcats.length,
        tipo: subcats[0].tipo,
        subcategorias: subcats.map(s => s.label)
      };
    });

    return Response.json({
      success: true,
      message: `Seed executado com sucesso - ${criadas.length} criadas, ${atualizadas.length} atualizadas`,
      total_esperado: validacao.total_esperado,
      criadas: criadas.length,
      atualizadas: atualizadas.length,
      ignoradas: ignoradas.length,
      validacao: {
        categorias_registradas: categoriasUnicas,
        erros_sincronia: validacao.erros_sincronia,
        sincronismo_ok: validacao.erros_sincronia.length === 0
      },
      resumo: {
        receitas: resumoPorCategoria['pecas_aplicadas']?.total + resumoPorCategoria['servicos']?.total + resumoPorCategoria['outras']?.total || 0,
        despesas: validacao.total_esperado - (resumoPorCategoria['pecas_aplicadas']?.total + resumoPorCategoria['servicos']?.total + resumoPorCategoria['outras']?.total || 0),
        por_categoria: resumoPorCategoria
      },
      detalhes: { criadas, atualizadas, ignoradas }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});