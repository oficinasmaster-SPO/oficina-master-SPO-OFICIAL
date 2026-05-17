import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, Building2, CreditCard, Banknote } from "lucide-react";
import { toast } from "sonner";

const fmt = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function ModalSaldoInicialDetalhado({ aberto, onFechar, workshopId, mes, saldoInicialRecord }) {
  const queryClient = useQueryClient();
  const [detalhes, setDetalhes] = useState({
    banco: "",
    maquina_cartao: "",
    caixa: ""
  });
  const [saving, setSaving] = useState(false);

  // Carregar dados existentes
  useEffect(() => {
    if (aberto && saldoInicialRecord?.detalhes) {
      setDetalhes({
        banco: String(saldoInicialRecord.detalhes.banco || ""),
        maquina_cartao: String(saldoInicialRecord.detalhes.maquina_cartao || ""),
        caixa: String(saldoInicialRecord.detalhes.caixa || "")
      });
    } else if (aberto) {
      setDetalhes({ banco: "", maquina_cartao: "", caixa: "" });
    }
  }, [aberto, saldoInicialRecord]);

  const handleSalvar = async () => {
    setSaving(true);
    try {
      const detalhesNumeros = {
        banco: parseFloat(detalhes.banco) || 0,
        maquina_cartao: parseFloat(detalhes.maquina_cartao) || 0,
        caixa: parseFloat(detalhes.caixa) || 0
      };

      const total = detalhesNumeros.banco + detalhesNumeros.maquina_cartao + detalhesNumeros.caixa;

      if (saldoInicialRecord) {
        await base44.entities.DFCLancamento.update(saldoInicialRecord.id, {
          saldo_inicial: total,
          detalhes: detalhesNumeros
        });
      } else {
        await base44.entities.DFCLancamento.create({
          workshop_id: workshopId,
          mes,
          grupo: "saldo_inicial",
          tipo: "entrada",
          descricao: "Saldo inicial do mês",
          valor: 0,
          origem: "manual",
          saldo_inicial: total,
          detalhes: detalhesNumeros
        });
      }

      queryClient.invalidateQueries({ queryKey: ["dfc-saldo", workshopId, mes] });
      toast.success("Saldo inicial detalhado salvo!");
      onFechar();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar saldo inicial");
    } finally {
      setSaving(false);
    }
  };

  const total = (parseFloat(detalhes.banco) || 0) + 
                (parseFloat(detalhes.maquina_cartao) || 0) + 
                (parseFloat(detalhes.caixa) || 0);

  return (
    <Dialog open={aberto} onOpenChange={onFechar}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-500" />
            Detalhar Saldo Inicial
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            <p className="font-semibold mb-1">💡 Como funciona:</p>
            <p>Informe quanto você tem em cada "gaveta" do dinheiro. O total será usado como saldo inicial do mês.</p>
          </div>

          {/* Banco */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <Label className="font-semibold text-blue-900">💳 Banco</Label>
              </div>
              <p className="text-xs text-blue-700 mb-2">Saldo em conta corrente, poupança, aplicações</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={detalhes.banco}
                  onChange={e => setDetalhes(d => ({ ...d, banco: e.target.value }))}
                  className="flex-1 font-semibold"
                />
              </div>
            </CardContent>
          </Card>

          {/* Máquina Cartão */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-green-600" />
                <Label className="font-semibold text-green-900">💳 Máquina Cartão</Label>
              </div>
              <p className="text-xs text-green-700 mb-2">Recebíveis de cartão de crédito/débito</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={detalhes.maquina_cartao}
                  onChange={e => setDetalhes(d => ({ ...d, maquina_cartao: e.target.value }))}
                  className="flex-1 font-semibold"
                />
              </div>
            </CardContent>
          </Card>

          {/* Caixa */}
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Banknote className="w-4 h-4 text-amber-600" />
                <Label className="font-semibold text-amber-900">💵 Dinheiro em Caixa</Label>
              </div>
              <p className="text-xs text-amber-700 mb-2">Dinheiro físico na gaveta do caixa</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={detalhes.caixa}
                  onChange={e => setDetalhes(d => ({ ...d, caixa: e.target.value }))}
                  className="flex-1 font-semibold"
                />
              </div>
            </CardContent>
          </Card>

          {/* Total */}
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Total Geral</span>
              <span className="text-xl font-bold text-gray-900">{fmt(total)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Salvar Saldo Detalhado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}