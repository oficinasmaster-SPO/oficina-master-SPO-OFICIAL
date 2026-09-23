import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputMoeda } from "@/components/ui/InputMoeda";
import SeletorFonte from "@/components/dfc/SeletorFonte";
import useFontesDinheiro from "@/components/dfc/useFontesDinheiro";
import { Loader2, ArrowLeftRight, Calendar, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const hoje = () => new Date().toISOString().split("T")[0];

/**
 * Modal de Transferência entre Contas (DFC).
 * Registra movimentação interna (banco → caixa, máquina → banco etc.)
 * sem impacto no resultado do mês — apenas redistribui saldo entre contas.
 */
export default function ModalTransferenciaContas({ aberto, onFechar, workshopId, onSucesso }) {
  const queryClient = useQueryClient();
  const [data, setData] = useState(hoje());
  const [valor, setValor] = useState(0);
  const [fonteOrigem, setFonteOrigem] = useState("");
  const [fonteDestino, setFonteDestino] = useState("");
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);

  // A transferência se move no mês da DATA informada — mesma regra das baixas
  const mesTransferencia = (data || hoje()).slice(0, 7);
  const { data: fontes } = useFontesDinheiro(workshopId, mesTransferencia);

  useEffect(() => {
    if (aberto) {
      setData(hoje());
      setValor(0);
      setFonteOrigem("");
      setFonteDestino("");
      setDescricao("");
    }
  }, [aberto]);

  const saldoDe = (key) => {
    if (!key || !fontes) return null;
    const [tipo, id] = key.split(":");
    if (tipo === "banco") return fontes.bancos?.find((b) => b.id === id)?.saldo ?? null;
    if (tipo === "maquina") return fontes.maquinas_cartao?.find((m) => m.id === id)?.saldo ?? null;
    if (tipo === "caixa") return fontes.caixa ?? null;
    return null;
  };

  const saldoOrigem = saldoDe(fonteOrigem);
  const mesmoPar = fonteOrigem && fonteDestino && fonteOrigem === fonteDestino;
  const insuficiente = saldoOrigem !== null && valor > saldoOrigem;

  const podeSalvar = valor > 0 && fonteOrigem && fonteDestino && !mesmoPar && !insuficiente && !saving;

  const handleSalvar = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke("registrarTransferencia", {
        workshop_id: workshopId,
        fonte_origem: fonteOrigem,
        fonte_destino: fonteDestino,
        valor,
        data,
        descricao: descricao || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["dfc-transferencias", workshopId, mesTransferencia] });
      queryClient.invalidateQueries({ queryKey: ["dfc-saldo", workshopId, mesTransferencia] });
      queryClient.invalidateQueries({ queryKey: ["saldo-inicial-fontes", workshopId, mesTransferencia] });
      window.dispatchEvent(new CustomEvent("transferencia-registrada", { detail: { workshopId, mes: mesTransferencia } }));
      toast.success("Transferência registrada!");
      onSucesso?.();
      onFechar();
    } catch (error) {
      toast.error(String(error?.message || "Erro ao registrar transferência"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={onFechar}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <ArrowLeftRight className="w-5 h-5 text-blue-600" />
            Transferência entre Contas
          </DialogTitle>
          <p className="text-xs text-gray-500 -mt-1">
            Movimentação interna — não altera o resultado do mês (DRE) nem o saldo total,
            apenas a distribuição entre as contas.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <Label className="text-xs flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gray-500" /> Data da transferência *
            </Label>
            <Input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="mt-1 h-10 text-sm"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Os saldos são movimentados no mês da data informada ({mesTransferencia}).
            </p>
          </div>

          <SeletorFonte
            fontes={fontes}
            fonteSelecionada={fonteOrigem}
            onChange={setFonteOrigem}
            label="Conta de origem (sai o dinheiro) *"
          />

          <SeletorFonte
            fontes={fontes}
            fonteSelecionada={fonteDestino}
            onChange={setFonteDestino}
            label="Conta de destino (entra o dinheiro) *"
          />

          {mesmoPar && (
            <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              A conta de origem e destino devem ser diferentes.
            </div>
          )}
          {insuficiente && (
            <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              Saldo insuficiente na conta de origem. Disponível: <strong>{fmt(saldoOrigem)}</strong>
            </div>
          )}

          <div>
            <Label className="text-xs">Valor (R$) *</Label>
            <InputMoeda
              value={valor}
              onChange={(v) => setValor(v)}
              className="mt-1 text-right h-10 font-semibold"
            />
          </div>

          <div>
            <Label className="text-xs">Descrição <span className="text-gray-400">(opcional)</span></Label>
            <Input
              placeholder="Ex: Depósito do caixa no banco, Transferência p/ pagar boletos..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="mt-1 h-10 text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={!podeSalvar}>
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Registrando...</>
            ) : (
              <><ArrowLeftRight className="w-4 h-4 mr-1" /> Transferir</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}