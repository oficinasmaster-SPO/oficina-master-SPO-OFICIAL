/**
 * backfillSubcategoriasDRE — Migra DRELancamentos existentes para o novo sistema de subcategorias
 * 
 * Regras:
 * 1. Se já tem subcategoria: mantém
 * 2. Se não tem: tenta inferir baseada na descrição ou deixa null
 * 3. Cria subcategorias customizadas automaticamente quando encontra descrições únicas
 * 
 * Execução: Apenas admin
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Apenas admin
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { workshop_id, mes, dry_run = true } = await req.json().catch(() => ({}));

    // Query: DRELancamentos sem subcategoria
    const query = {
      workshop_id: workshop_id || undefined,
      mes: mes || undefined,
    };

    const lancamentos = await base44.entities.DRELancamento.filter(query, "-created_date", 1000);
    
    const stats = {
      total: lancamentos.length,
      com_subcategoria: 0,
      sem_subcategoria: 0,
      subcategorias_criadas: 0,
      erros: 0,
    };

    const subcategoriasCriadas = new Map(); // label -> id

    for (const lancamento of lancamentos) {
      try {
        // Se já tem subcategoria, pula
        if (lancamento.subcategoria) {
          stats.com_subcategoria++;
          continue;
        }

        stats.sem_subcategoria++;

        // Tenta inferir subcategoria da descrição
        const descricao = lancamento.descricao || "";
        const categoria = lancamento.categoria || "";

        // Padrões comuns para extrair subcategoria
        let subcategoriaInferida = null;

        // Padrão: "Energia Elétrica" → subcategoria = "Energia Elétrica"
        if (descricao && descricao.length < 50) {
          subcategoriaInferida = descricao;
        }

        // Se não conseguiu inferir, usa a própria categoria
        if (!subcategoriaInferida) {
          subcategoriaInferida = categoria;
        }

        // Verifica se subcategoria já existe no banco
        const subcategoriaExistente = await base44.entities.SubcategoriaDRE.filter({
          categoria,
          label: subcategoriaInferida,
          workshop_id: workshop_id || null, // null para globais
        }, null, 1);

        let subcategoriaId = null;

        if (subcategoriaExistente.length > 0) {
          // Já existe
          subcategoriaId = subcategoriaExistente[0].id;
        } else if (!dry_run) {
          // Cria nova subcategoria
          const novaSubcategoria = await base44.entities.SubcategoriaDRE.create({
            categoria,
            label: subcategoriaInferida,
            workshop_id: workshop_id || null,
            tipo: categoria.startsWith("receita") || ["pecas_aplicadas", "servicos", "outras"].includes(categoria) ? "receita" : "despesa",
            ordem: 999,
            ativo: true,
            entra_tcmp2: lancamento.entra_tcmp2 ?? true,
          });

          subcategoriaId = novaSubcategoria.id;
          stats.subcategorias_criadas++;
          subcategoriasCriadas.set(subcategoriaInferida, subcategoriaId);
        }

        // Atualiza o lançamento com a subcategoria
        if (!dry_run && subcategoriaId) {
          await base44.entities.DRELancamento.update(lancamento.id, {
            subcategoria: subcategoriaInferida,
          });
        }
      } catch (error) {
        stats.erros++;
        console.error(`Erro ao processar lançamento ${lancamento.id}:`, error.message);
      }
    }

    return Response.json({
      success: true,
      stats,
      subcategorias_criadas_detalhe: Object.fromEntries(subcategoriasCriadas),
      dry_run,
      message: dry_run 
        ? `Simulação concluída. ${stats.sem_subcategoria} lançamentos precisam de subcategoria.`
        : `Migração concluída. ${stats.subcategorias_criadas} subcategorias criadas.`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});