import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Apenas admin pode rodar validação
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Apenas administradores podem executar validação' }, { status: 403 });
    }

    // Buscar todas as subcategorias globais
    const subcategorias = await base44.entities.SubcategoriaDRE.filter({ workshop_id: null });
    
    // Estrutura esperada
    const estruturaEsperada = {
      receitas: {
        categorias: ['pecas_aplicadas', 'servicos', 'outras'],
        total_esperado: 6
      },
      despesas: {
        categorias: ['operacional', 'pessoas', 'marketing', 'administrativo', 'financeiro', 'pecas_estoque', 'manutencao', 'terceirizados'],
        total_esperado: 46
      }
    };

    // Validações
    const validacoes = {
      total_subcategorias: subcategorias.length,
      total_esperado: 52,
      por_tipo: {
        receita: subcategorias.filter(s => s.tipo === 'receita').length,
        despesa: subcategorias.filter(s => s.tipo === 'despesa').length
      },
      por_categoria: {},
      erros_sincronia: [],
      avisos: []
    };

    // Agrupar por categoria
    const categoriasMap = new Map();
    subcategorias.forEach(sub => {
      if (!categoriasMap.has(sub.categoria)) {
        categoriasMap.set(sub.categoria, []);
      }
      categoriasMap.get(sub.categoria).push(sub);
    });

    // Validar cada categoria
    categoriasMap.forEach((subs, categoria) => {
      // Validar ordenação sequencial
      const ordens = subs.map(s => s.ordem).sort((a, b) => a - b);
      const esperado = Array.from({ length: subs.length }, (_, i) => i + 1);
      
      if (JSON.stringify(ordens) !== JSON.stringify(esperado)) {
        validacoes.erros_sincronia.push(
          `Categoria "${categoria}": ordenação incorreta. Esperado: ${esperado}, Encontrado: ${ordens}`
        );
      }

      // Validar labels únicos
      const labels = subs.map(s => s.label);
      const labelsUnicos = new Set(labels);
      if (labels.length !== labelsUnicos.size) {
        validacoes.erros_sincronia.push(
          `Categoria "${categoria}": labels duplicados encontrados`
        );
      }

      // Validar TCMP² consistente
      const tcmp2Values = subs.map(s => s.entra_tcmp2);
      const tcmp2Unicos = [...new Set(tcmp2Values)];
      if (tcmp2Unicos.length > 1) {
        validacoes.avisos.push(
          `Categoria "${categoria}": TCMP² misto (algumas entram, outras não)`
        );
      }

      validacoes.por_categoria[categoria] = {
        total: subs.length,
        tipo: subs[0].tipo,
        ordens: ordens,
        labels: labels,
        tcmp2_misto: tcmp2Unicos.length > 1
      };
    });

    // Validar totais
    if (validacoes.por_tipo.receita !== estruturaEsperada.receitas.total_esperado) {
      validacoes.erros_sincronia.push(
        `Receitas: esperado ${estruturaEsperada.receitas.total_esperado}, encontrado ${validacoes.por_tipo.receita}`
      );
    }

    if (validacoes.por_tipo.despesa !== estruturaEsperada.despesas.total_esperado) {
      validacoes.erros_sincronia.push(
        `Despesas: esperado ${estruturaEsperada.despesas.total_esperado}, encontrado ${validacoes.por_tipo.despesa}`
      );
    }

    // Validar todas as categorias esperadas existem
    const categoriasExistentes = Array.from(categoriasMap.keys());
    const todasCategoriasReceita = estruturaEsperada.receitas.categorias.every(c => categoriasExistentes.includes(c));
    const todasCategoriasDespesa = estruturaEsperada.despesas.categorias.every(c => categoriasExistentes.includes(c));

    if (!todasCategoriasReceita) {
      const faltantes = estruturaEsperada.receitas.categorias.filter(c => !categoriasExistentes.includes(c));
      validacoes.erros_sincronia.push(`Categorias de receita faltantes: ${faltantes.join(', ')}`);
    }

    if (!todasCategoriasDespesa) {
      const faltantes = estruturaEsperada.despesas.categorias.filter(c => !categoriasExistentes.includes(c));
      validacoes.erros_sincronia.push(`Categorias de despesa faltantes: ${faltantes.join(', ')}`);
    }

    // Resumo
    const resumo = {
      status: validacoes.erros_sincronia.length === 0 ? '✅ SINCRONIZADO' : '❌ FORA DE SINCRONIA',
      total_subcategorias: validacoes.total_subcategorias,
      receitas: validacoes.por_tipo.receita,
      despesas: validacoes.por_tipo.despesa,
      categorias_encontradas: categoriasExistentes.length,
      erros_count: validacoes.erros_sincronia.length,
      avisos_count: validacoes.avisos.length
    };

    return Response.json({
      success: true,
      validacao: validacoes,
      resumo,
      estrutura_esperada: estruturaEsperada
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});