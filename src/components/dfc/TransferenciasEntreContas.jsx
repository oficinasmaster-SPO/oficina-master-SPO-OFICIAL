import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { ArrowLeftRight, Undo2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import ModalTransferenciaContas from "./ModalTransferenciaContas";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

function rotuloFonte(key) {
  if (!key) return "—";
  const [tipo, , ...nome] = String(key).split(":");
  const n = nome.join(":");
  if (tipo === "banco") return `🏦 ${n}`;
  if (tipo === "maquina") return `💳 ${n}`;
  return "💵 Caixa";
}

/**
 * Seção "Transferências entre Contas" da aba DFC.
 * Exibe os pares de lançamentos (saída + entrada) do mês com o total
 * movimentado e permite estornar um par completo (com motivo).
 */
export default function TransferenciasEntreContas({ workshopId, mes }) {
  const queryClient = useQueryClient();
  const [modalAberto, setModalAberto] = useState(false);
  const [estornoAlvo, setEstornoAlvo] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [estornando, setEstornando] = useState(false);

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ["dfc-transferencias", workshopId, mes],
    queryFn: () => base44.entities.DFCLancamento.filter({ workshop_id: workshopId, mes, grupo: "transferencia" }),
    enabled: !!workshopId && !!mes,
    staleTime: 0,
  });

  // Agrupa os lançamentos em pares pelo transferencia_id
  const pares = useMemo(() => {
    const mapa = new Map();
    for (const r of registros || []) {
      const id = r.transferencia_id;
      if (!id) continue;
      if (!mapa.has(id)) mapa.set(id, { id, saida: null, entrada: null });
      if (r.tipo === "saida") mapa.get(id).saida = r;
      else if (r.tipo === "entrada") mapa.get(id).entrada = r;
    }
    return [...mapa.values()].filter((p) => p.saida);
  }, [registros]);

  const totalTransferido = pares.reduce((s, p) => s + (p.saida?.valor || 0), 0);

  const atualizarQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["dfc-transferencias", workshopId, mes] });
    queryClient.invalidateQueries({ queryKey: ["dfc-saldo", workshopId, mes] });
    queryClient.invalidateQueries({ queryKey: ["saldo-inicial-fontes", workshopId, mes] });
  };

  const handleEstornar = async () => {
    if (!motivo.trim()) {
      toast.error("Informe o motivo do estorno");
      return;
    }
    setEstornando(true);
    try {
      const res = await base44.functions.invoke("desfazerTransferencia", {
        transferencia_id: estornoAlvo.id,
        motivo,
      });
      if (res?.data?.avisos?.length) {
        res.data.avisos.forEach((a) => toast.warning(a));
      }
      toast.success("Transferência estornada!");
      setEstornoAlvo(null);
      setMotivo("");
      atualizarQueries();
    } catch (error) {
      toast.error(String(error?.message || "Erro ao estornar transferência"));
    } finally {
      setEstornando(false);
    }
  };

  return (
    <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
        <div className="flex items-center gap-2 font-semibold text-sm text-slate-700">
          <ArrowLeftRight className="w-4 h-4" />
          Transferências entre Contas
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
            {fmt(totalTransferido)}
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={() => setModalAberto(true)} className="h-7 text-xs">
          <Plus className="w-3 h-3 mr-1" /> Nova transferência
        </Button>
      </div>

      {/* Corpo */}
      <div className="p-3 bg-white space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-3 text-xs text-gray-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> Carregando transferências...
          </div>
        ) : pares.length === 0 ? (
          <p className="text-sm text-gray-400 italic text-center py-2">
            Nenhuma transferência entre contas neste mês.
          </p>
        ) : (
          pares.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 group"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-[10px] font-medium bg-slate-100 border border-slate-300 text-slate-600 rounded px-1.5 py-0.5 shrink-0">
                  ⇄ Transferência interna
                </span>
                <span className="text-sm text-gray-700 truncate">
                  {rotuloFonte(p.saida?.fonte_saida)} → {rotuloFonte(p.entrada?.fonte_entrada)}
                </span>
                <span className="text-[11px] text-gray-400 truncate hidden sm:inline">
                  {p.saida?.descricao}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-sm font-semibold text-slate-600 mr-2">{fmt(p.saida?.valor)}</span>
                <button
                  onClick={() => setEstornoAlvo(p)}
                  title="Estornar transferência"
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-0.5"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
        <p className="text-[11px] text-gray-400 text-center pt-1">
          Movimentação interna: não altera o resultado do mês nem o saldo total — apenas a distribuição entre as contas.
        </p>
      </div>

      {/* Modal de nova transferência */}
      <ModalTransferenciaContas
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        workshopId={workshopId}
        onSucesso={atualizarQueries}
      />

      {/* Diálogo de estorno */}
      <AlertDialog open={!!estornoAlvo} onOpenChange={(o) => { if (!o) { setEstornoAlvo(null); setMotivo(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estornar transferência?</AlertDialogTitle>
            <AlertDialogDescription>
              {estornoAlvo && (
                <>
                  {rotuloFonte(estornoAlvo.saida?.fonte_saida)} → {rotuloFonte(estornoAlvo.entrada?.fonte_entrada)} ·{" "}
                  <strong>{fmt(estornoAlvo.saida?.valor)}</strong>
                  <br />
                  O valor volta para a conta de origem e sai da conta de destino. Os dois lançamentos são removidos.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-1">
            <label className="text-xs font-medium text-gray-600">Motivo do estorno *</label>
            <Input
              placeholder="Ex: Transferência lançada errada, valor incorreto..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="mt-1 text-sm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={estornando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleEstornar(); }}
              disabled={estornando || !motivo.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {estornando ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Estornando...</>
              ) : (
                "Confirmar estorno"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}