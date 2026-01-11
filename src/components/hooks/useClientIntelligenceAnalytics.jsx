import { useMemo } from "react";

export const useClientIntelligenceAnalytics = (allItems = []) => {
  return useMemo(() => {
    // Agrupar por tipo
    const byType = {
      dor: allItems.filter(i => i.type === "dor"),
      duvida: allItems.filter(i => i.type === "duvida"),
      desejo: allItems.filter(i => i.type === "desejo"),
      risco: allItems.filter(i => i.type === "risco"),
      evolucao: allItems.filter(i => i.type === "evolucao"),
    };

    // Agrupar por área
    const byArea = {};
    allItems.forEach(item => {
      if (!byArea[item.area]) byArea[item.area] = [];
      byArea[item.area].push(item);
    });

    // Indicadores de Dor
    const dorasPorArea = Object.entries(byArea).map(([area, items]) => ({
      area,
      count: items.filter(i => i.type === "dor").length,
    })).sort((a, b) => b.count - a.count);

    const topDorasRecorrentes = byType.dor
      .filter(d => d.is_recurring)
      .slice(0, 5);

    const dorasNuncaResolvidas = byType.dor.filter(
      d => d.status === "ativo" && d.gravity === "alta"
    ).length;

    // Indicadores de Evolução
    const evolucoesTotal = byType.evolucao.length;
    const dorasQueViramEvolucao = byType.evolucao.length; // proxy
    const areaComMaisEvolucao = Object.entries(byArea)
      .map(([area, items]) => ({
        area,
        evolutions: items.filter(i => i.type === "evolucao").length,
      }))
      .sort((a, b) => b.evolutions - a.evolutions)[0];

    // Indicadores de Risco
    const riscosPorSeveridade = {
      critica: byType.risco.filter(r => r.gravity === "critica").length,
      alta: byType.risco.filter(r => r.gravity === "alta").length,
      media: byType.risco.filter(r => r.gravity === "media").length,
    };

    // Indicadores Estratégicos
    const maturidadeScore = {
      doresResolvidas: byType.evolucao.length,
      duvidassResolvidas: byType.duvida.filter(d => d.status === "resolvido").length,
      acoesDef: allItems.filter(i => i.action_defined).length,
      totalItems: allItems.length,
    };

    const percentualAcoesDef = maturidadeScore.totalItems > 0 
      ? (maturidadeScore.acoesDef / maturidadeScore.totalItems * 100).toFixed(1)
      : 0;

    return {
      byType,
      byArea,
      dorasPorArea,
      topDorasRecorrentes,
      dorasNuncaResolvidas,
      evolucoesTotal,
      dorasQueViramEvolucao,
      areaComMaisEvolucao,
      riscosPorSeveridade,
      maturidadeScore,
      percentualAcoesDef,
    };
  }, [allItems]);
};