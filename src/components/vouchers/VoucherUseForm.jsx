import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, ShoppingCart, Check, Tag, Clock, User, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function VoucherUseForm({ user, workshop }) {
  const queryClient = useQueryClient();
  const [showSuccess, setShowSuccess] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({
    voucher_code: "",
    client_name: "",
    client_document: "",
    client_phone: "",
    sale_value: "",
    negotiation_notes: ""
  });

  const useMutation_ = useMutation({
    mutationFn: async () => {
      const payload = {
        voucher_code: form.voucher_code.trim().toUpperCase(),
        client_name: form.client_name.trim(),
        client_document: form.client_document.trim() || null,
        client_phone: form.client_phone.trim() || null,
        sale_value: parseFloat(form.sale_value),
        negotiation_notes: form.negotiation_notes.trim() || null
      };
      const response = await base44.functions.invoke("useVoucher", payload);
      return response.data;
    },
    onSuccess: (data) => {
      setResult(data.use);
      setShowSuccess(true);
      setForm({
        voucher_code: "",
        client_name: "",
        client_document: "",
        client_phone: "",
        sale_value: "",
        negotiation_notes: ""
      });
      queryClient.invalidateQueries(["myVouchers"]);
      queryClient.invalidateQueries(["vouchers"]);
      queryClient.invalidateQueries(["voucherUses"]);
      toast.success("Uso do voucher registrado com sucesso!");
    },
    onError: (error) => {
      const msg = error?.response?.data?.error || error.message || "Erro ao registrar uso";
      toast.error(msg);
    }
  });

  const handleSubmit = () => {
    if (!form.voucher_code.trim()) {
      toast.error("Informe o código do voucher");
      return;
    }
    if (!form.client_name.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    const val = parseFloat(form.sale_value);
    if (!val || val <= 0) {
      toast.error("Informe um valor de venda válido");
      return;
    }
    useMutation_.mutate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Registrar Uso de Voucher
          </CardTitle>
          <CardDescription>
            Informe o código do voucher e os dados da venda. Após o registro, o uso será enviado para aprovação do administrador (prazo de 48h).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Código do voucher */}
          <div>
            <Label className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Código do Voucher *
            </Label>
            <Input
              value={form.voucher_code}
              onChange={(e) => setForm({ ...form, voucher_code: e.target.value.toUpperCase() })}
              placeholder="Ex: OM-ABC12345"
              className="font-mono text-lg tracking-wider"
              maxLength={20}
            />
          </div>

          {/* Dados do cliente */}
          <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
            <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <User className="w-4 h-4" />
              Dados do Cliente
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Nome do Cliente *</Label>
                <Input
                  value={form.client_name}
                  onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <Label>CPF/CNPJ</Label>
                <Input
                  value={form.client_document}
                  onChange={(e) => setForm({ ...form, client_document: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={form.client_phone}
                onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          {/* Valor da venda */}
          <div>
            <Label>Valor Total da Venda (R$) *</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={form.sale_value}
              onChange={(e) => setForm({ ...form, sale_value: e.target.value })}
              placeholder="0.00"
              className="text-lg"
            />
          </div>

          {/* Notas de negociação */}
          <div>
            <Label className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Registro da Negociação (opcional)
            </Label>
            <Textarea
              value={form.negotiation_notes}
              onChange={(e) => setForm({ ...form, negotiation_notes: e.target.value })}
              placeholder="Descreva como foi a negociação, motivo do desconto, observações relevantes..."
              rows={3}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={useMutation_.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            {useMutation_.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Registrar Uso do Voucher
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Modal de sucesso */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-700">
              <Check className="w-6 h-6" />
              Uso Registrado!
            </DialogTitle>
            <DialogDescription>
              O uso foi registrado e enviado para aprovação
            </DialogDescription>
          </DialogHeader>
          {result && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-600">Voucher</span>
                  <span className="font-mono font-bold">{result.voucher_code}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-600">Cliente</span>
                  <span className="font-medium">{result.client_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-600">Valor da Venda</span>
                  <span className="font-medium">R$ {result.sale_value?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-600">Desconto Aplicado</span>
                  <span className="font-medium text-green-700">- R$ {result.discount_applied?.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between items-center">
                  <span className="text-sm font-semibold text-blue-800">Valor Final</span>
                  <span className="text-lg font-bold text-blue-800">R$ {result.final_value?.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Aguardando Aprovação</p>
                  <p className="text-yellow-700">
                    Prazo: {format(new Date(result.approval_deadline), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>

              <Badge className="bg-yellow-100 text-yellow-800 w-full justify-center py-1">
                Status: Pendente Aprovação
              </Badge>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}