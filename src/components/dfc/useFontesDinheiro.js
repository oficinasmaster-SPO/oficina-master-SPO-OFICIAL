import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Carrega as fontes de dinheiro (bancos, máquinas de cartão e caixa) do
 * Saldo Inicial detalhado de um mês. Se o mês não tiver cadastro, faz
 * fallback para o mês mais recente com contas cadastradas — nesse caso os
 * saldos vêm zerados e a flag _de_outro_mes avisa a interface.
 */
export default function useFontesDinheiro(workshopId, mes) {
  return useQuery({
    queryKey: ["saldo-inicial-fontes", workshopId, mes],
    queryFn: async () => {
      if (!workshopId) return { bancos: [], maquinas_cartao: [], caixa: 0 };

      // 1. Tenta primeiro o mês corrente
      if (mes) {
        const records = await base44.entities.DFCLancamento.filter(
          { workshop_id: workshopId, mes, grupo: "saldo_inicial" }, "-updated_date", 3
        );
        for (const rec of (records || [])) {
          const d = rec.detalhes;
          if (d && ((d.bancos?.length > 0) || (d.maquinas_cartao?.length > 0))) {
            return { bancos: d.bancos || [], maquinas_cartao: d.maquinas_cartao || [], caixa: d.caixa || 0 };
          }
        }
      }

      // 2. Fallback: busca qualquer mês recente que tenha contas cadastradas
      const allRecords = await base44.entities.DFCLancamento.filter(
        { workshop_id: workshopId, grupo: "saldo_inicial" }, "-updated_date", 12
      );

      for (const rec of (allRecords || [])) {
        const d = rec.detalhes;
        if (d && ((d.bancos?.length > 0) || (d.maquinas_cartao?.length > 0))) {
          const ehMesmoMes = rec.mes === mes;
          return {
            bancos: (d.bancos || []).map(b => ehMesmoMes ? b : { ...b, saldo: 0 }),
            maquinas_cartao: (d.maquinas_cartao || []).map(m => ehMesmoMes ? m : { ...m, saldo: 0 }),
            caixa: ehMesmoMes ? (d.caixa || 0) : 0,
            _de_outro_mes: !ehMesmoMes,
            _mes_origem: rec.mes,
          };
        }
      }

      return { bancos: [], maquinas_cartao: [], caixa: 0 };
    },
    enabled: !!workshopId,
    staleTime: 0,
  });
}