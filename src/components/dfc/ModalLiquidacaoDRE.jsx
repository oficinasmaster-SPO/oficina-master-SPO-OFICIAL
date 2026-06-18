import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, AlertCircle } from "lucide-react";
import ModalRegistrarRecebimento from "@/components/financeiro/ModalRegistrarRecebimento";
import ModalRegistrarPagamentoConta from "@/components/financeiro/ModalRegistrarPagamentoConta";

/**
 * ModalLiquidacaoDRE — "ponte" entre um DRELancamento e os modais shared de liquidação.
 * 
 * Ao clicar num item do DFC:
 * - Busca a ContaReceber ou ContaPagar vinculada pelo dre_lancamento_id
 * - Abre o modal shared correto (ModalRegistrarRecebimento ou ModalRegistrarPagamentoConta)
 * - Se não houver conta vinculada, mostra aviso simples
 */
export default function ModalLiquidacaoDRE({ item, workshopId, onFechar, onSalvo }) {
  const [loading, setLoading] = useState(false);
  const [contaVinculada, setContaVinculada] = useState(null);
  const [semConta, setSemConta] = useState(false);

  const isDespesa = item?.tipo === "saida";
  const mes = item?.mes;

  useEffect(() => {
    if (!item?.id) return;

    setLoading(true);
    setContaVinculada(null);
    setSemConta(false);

    const buscarConta = async () => {
      try {
        if (isDespesa) {
          const contas = await base44.entities.ContaPagar.filter({ dre_lancamento_id: item.id });
          if (contas?.length > 0) setContaVinculada(contas[0]);
          else setSemConta(true);
        } else {
          const contas = await base44.entities.ContaReceber.filter({ dre_lancamento_id: item.id });
          if (contas?.length > 0) setContaVinculada(contas[0]);
          else setSemConta(true);
        }
      } catch {
        setSemConta(true);
      } finally {
        setLoading(false);
      }
    };

    buscarConta();
  }, [item?.id]);

  if (!item) return null;

  const handleSuccess = () => {
    onSalvo?.();
    onFechar();
  };

  // ── Enquanto carrega ──
  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onFechar}>
        <DialogContent className="max-w-sm">
          <div className="flex items-center justify-center py-12 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="text-sm text-gray-500">Buscando conta vinculada...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Sem conta vinculada ──
  if (semConta) {
    return (
      <Dialog open={true} onOpenChange={onFechar}>
        <DialogContent className="max-w-sm">
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
        </DialogContent>
      </Dialog>
    );
  }

  // ── Com conta vinculada: delega para o modal shared correto ──
  if (contaVinculada) {
    if (isDespesa) {
      return (
        <ModalRegistrarPagamentoConta
          aberto={true}
          onFechar={onFechar}
          conta={contaVinculada}
          workshopId={workshopId}
          mes={mes}
          onSuccess={handleSuccess}
        />
      );
    } else {
      return (
        <ModalRegistrarRecebimento
          aberto={true}
          onFechar={onFechar}
          conta={contaVinculada}
          workshopId={workshopId}
          mes={mes}
          onSuccess={handleSuccess}
        />
      );
    }
  }

  return null;
}