import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { checklist_responses, checklist_id } = await req.json();

    if (!checklist_responses) {
      return Response.json({ error: 'checklist_responses é obrigatório' }, { status: 400 });
    }

    // Buscar configuração do checklist
    let scoringImpact = 10; // Padrão
    let categories = [];

    if (checklist_id) {
      const checklist = await base44.entities.TechnicalChecklist.get(checklist_id);
      scoringImpact = checklist.scoring_impact || 10;
      categories = checklist.categories || [];
    }

    // Calcular score baseado nas respostas
    const totalItems = Object.keys(checklist_responses).length;
    const checkedItems = Object.values(checklist_responses).filter(Boolean).length;

    if (totalItems === 0) {
      return Response.json({ 
        score: 0,
        percentage: 0,
        total_items: 0,
        checked_items: 0
      });
    }

    const percentage = (checkedItems / totalItems) * 100;
    const score = Math.round((percentage / 100) * scoringImpact);

    // Análise por categoria (se disponível)
    const categoryScores = {};
    if (categories.length > 0) {
      categories.forEach((cat, catIdx) => {
        const catItems = cat.items || [];
        const catChecked = catItems.filter((_, itemIdx) => {
          const key = `${catIdx}_${itemIdx}`;
          return checklist_responses[key];
        }).length;
        
        categoryScores[cat.name] = {
          total: catItems.length,
          checked: catChecked,
          percentage: catItems.length > 0 ? Math.round((catChecked / catItems.length) * 100) : 0
        };
      });
    }

    return Response.json({ 
      score,
      percentage: Math.round(percentage),
      total_items: totalItems,
      checked_items: checkedItems,
      category_scores: categoryScores,
      impact: scoringImpact
    });

  } catch (error) {
    console.error("Erro ao calcular score do checklist:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});