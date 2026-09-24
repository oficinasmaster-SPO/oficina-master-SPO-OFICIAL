import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, AlertCircle } from "lucide-react";
import ModalRegistrarRecebimento from "@/components/financeiro/ModalRegistrarRecebimento";
import ModalRegistrarPagamentoConta from "@/components/financeiro/ModalRegistrarPagamentoConta";

/**
 * ModalLiquidacaoDRE — ponte entre um DRELancamento do DFC e os modais shared.
 *
 * FLICKER FIX (Etapa 1): a query do DFC já cruza ContaReceber/ContaPagar e entrega
 * a conta vinculada em `item._conta`. Quando presente, o modal shared correto abre
 * DIRETO — sem o Dialog "Buscando conta vinculada..." intermediário (causa do duplo
 * flash de overlay no clique).
 *
 * Fallback (item sem `_conta` — dados antigos): busca a conta mantendo UM único
 * Dialog aberto; o conteúdo troca dentro dele (spinner → aviso), sem remontagem.
 *
 * Fechamento: `handleFechar` baixa `aberto` (Radix toca a animação de saída) e só
 * depois desmonta via onFechar do pai — uma única transição ao fechar.
 */
const EXIT_ANIM_MS = 200;

export default function ModalLiquidacaoDRE({ item, workshopId, onFechar, onSalvo }) {
  const [fallback, setFallback] = useState(null); // null | "buscando" | "sem_conta" | { conta }
  const [fechando, setFechando] = useState(false);

  const isDespesa = item?.tipo === "saida";
  const mes = item?.mes;
  const aberto = !!item && !fechando;

  // Caminho rápido: `_conta` presente → nada a buscar.
  // Fallback: busca única por item, com cancelamento ao trocar de item.
  useEffect(() => {
    if (!item?.id || item._conta) return;
    let cancelado = false;
    const buscar = async () => {
      try {
        const entity = item.tipo === "saida" ? base44.entities.ContaPagar : base44.entities.ContaReceber;
        const contas = await entity.filter({ dre_lancamento_id: item.id });
        if (cancelado) return;
        setFallback(contas?.length > 0 ? { conta: contas[0] } : "sem_conta");
      } catch {
        if (!cancelado) setFallback("sem_conta");
      }
    };
    setFallback("buscando");
    buscar();
    return () => { cancelado = true; };
  }, [item?.id, item?._conta]);

  // Fecha com a animação de saída do Dialog e só depois desmonta no pai.
  const handleFechar = useCallback(() => {
    setFechando(true);
    setTimeout(() => {
      setFechando(false);
      onFechar?.();
    }, EXIT_ANIM_MS);
  }, [onFechar]);

  const handleSuccess = useCallback(() => {
    onSalvo?.();
  }, [onSalvo]);

  if (!item) return null;

  const conta = item._conta || (typeof fallback === "object" ? fallback.conta : null);

  // ── Com conta (caminho comum): abre o modal shared direto ──
  if (conta) {
    const propsShared = { aberto, onFechar: handleFechar, conta, workshopId, mes, onSuccess: handleSuccess };
    return isDespesa ?
    <ModalRegistrarPagamentoConta {...propsShared} /> :

    <ModalRegistrarRecebimento {...propsShared} />;
  }

  // ── Sem conta / fallback: UM único Dialog — o conteúdo troca dentro dele ──
  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) handleFechar(); }}>
      <DialogContent className="max-w-sm">
        {fallback === "sem_conta" ?
        <div className="p-6 space-y-3">
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Conta não encontrada</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Este lançamento do DRE não possui uma {isDespesa ? "Conta a Pagar" : "Conta a Receber"} vinculada.
                  Acesse a aba <strong>Contas a {isDespesa ? "Pagar" : "Receber"}</strong> para registrar o pagamento manualmente.
                </p>
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-900">{item.descricao || "—"}</p>
              <p className={`text-lg font-bold ${isDespesa ? "text-red-600" : "text-green-600"}`}>
                {isDespesa ? "-" : "+"}{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.valor || 0)}
              </p>
            </div>
          </div>
        :

        <div className="flex items-center justify-center py-12 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="text-sm text-gray-500">Buscando conta vinculada...</span>
          </div>
        }
      </DialogContent>
    </Dialog>
  );
}