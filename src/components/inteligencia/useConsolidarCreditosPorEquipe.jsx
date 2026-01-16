import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useConsolidarCreditosPorEquipe(workshopId) {
  return useQuery({
    queryKey: ["creditos-consolidados-equipe", workshopId],
    queryFn: async () => {
      if (!workshopId) return null;

      const currentDate = new Date();
      const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

      try {
        // Buscar vendas do mês
        const vendas = await base44.entities.VendasServicos.filter({
          workshop_id: workshopId,
          month: monthStr
        });

        if (!vendas || vendas.length === 0) return null;

        // Buscar atribuições
        const atribuicoes = await base44.entities.AtribuicoesVenda.filter({
          workshop_id: workshopId
        });

        if (!atribuicoes || atribuicoes.length === 0) return null;

        // Filtrar por mês
        const vendasIds = vendas.map(v => v.id);
        const atribuicoesMes = atribuicoes.filter(a => vendasIds.includes(a.venda_id));

        if (atribuicoesMes.length === 0) return null;

        // Calcular faturamento total
        const faturamentoTotal = vendas.reduce((sum, v) => sum + (v.valor_total || 0), 0);

        // Consolidar por EQUIPE
        const equipesMap = {
          marketing: { credito: 0, pessoas: new Set(), percentual: 0 },
          sdr_telemarketing: { credito: 0, pessoas: new Set(), percentual: 0 },
          comercial_vendas: { credito: 0, pessoas: new Set(), percentual: 0 },
          vendas: { credito: 0, pessoas: new Set(), percentual: 0 },
          tecnico: { credito: 0, pessoas: new Set(), percentual: 0 },
          atendimento: { credito: 0, pessoas: new Set(), percentual: 0 }
        };

        // Agrupar atribuições por equipe
        atribuicoesMes.forEach(attr => {
          if (equipesMap[attr.equipe]) {
            equipesMap[attr.equipe].credito += (attr.valor_credito_atribuido || 0);
            equipesMap[attr.equipe].pessoas.add(attr.pessoa_id);
          }
        });

        // Consolidar dados para exibição
        const consolidado = {
          marketing: {
            credito: equipesMap.marketing.credito,
            pessoas: equipesMap.marketing.pessoas.size,
            percentual: faturamentoTotal > 0 ? (equipesMap.marketing.credito / faturamentoTotal) * 100 : 0
          },
          comercial: {
            credito: equipesMap.sdr_telemarketing.credito + equipesMap.comercial_vendas.credito,
            pessoas: new Set([...equipesMap.sdr_telemarketing.pessoas, ...equipesMap.comercial_vendas.pessoas]).size,
            percentual: faturamentoTotal > 0 
              ? ((equipesMap.sdr_telemarketing.credito + equipesMap.comercial_vendas.credito) / faturamentoTotal) * 100 
              : 0
          },
          vendas: {
            credito: equipesMap.vendas.credito,
            pessoas: equipesMap.vendas.pessoas.size,
            percentual: faturamentoTotal > 0 ? (equipesMap.vendas.credito / faturamentoTotal) * 100 : 0
          },
          tecnico: {
            credito: equipesMap.tecnico.credito,
            pessoas: equipesMap.tecnico.pessoas.size,
            percentual: faturamentoTotal > 0 ? (equipesMap.tecnico.credito / faturamentoTotal) * 100 : 0
          }
        };

        return consolidado;
      } catch (error) {
        console.error("Erro ao consolidar créditos por equipe:", error);
        return null;
      }
    },
    enabled: !!workshopId,
    staleTime: 60000
  });
}