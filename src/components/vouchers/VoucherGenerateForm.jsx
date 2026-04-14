import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputMoeda } from "@/components/ui/InputMoeda";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Ticket, Copy, Check, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function VoucherGenerateForm({ user, workshop }) {
  const queryClient = useQueryClient();
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdVoucher, setCreatedVoucher] = useState(null);
  const [form, setForm] = useState({
    discount_type: "percent",
    discount_percent: "",
    discount_value: "",
    max_uses: 1,
    description: ""
  });

  // Buscar regras do vendedor
  const { data: sellerRules = [] } = useQuery({
    queryKey: ["sellerRules", user?.id, workshop?.id],
    queryFn: () => base44.entities.VoucherSellerRule.filter({
      seller_id: user.id,
      workshop_id: workshop.id
    }),
    enabled: !!user?.id && !!workshop?.id
  });

  // Buscar vouchers do mês atual para o vendedor
  const { data: myVouchers = [] } = useQuery({
    queryKey: ["myVouchers", user?.id, workshop?.id],
    queryFn: () => base44.entities.Voucher.filter({
      seller_id: user.id,
      workshop_id: workshop.id
    }, "-created_date", 100),
    enabled: !!user?.id && !!workshop?.id
  });

  const rule = sellerRules[0];
  const isAdmin = user?.role === "admin";
  const isAuthorized = isAdmin || (rule && rule.active);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const vouchersThisMonth = myVouchers.filter(v => 
    v.created_date && v.created_date.startsWith(currentMonth)
  ).length;
  const monthlyLimit = rule?.max_vouchers_per_month || 0;
  const remaining = isAdmin ? "∞" : Math.max(0, monthlyLimit - vouchersThisMonth);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        workshop_id: workshop.id,
        company_id: workshop.company_id || null,
        consulting_firm_id: workshop.consulting_firm_id || null,
        discount_type: form.discount_type,
        discount_percent: form.discount_type === "percent" ? parseFloat(form.discount_percent) : null,
        discount_value: form.discount_type === "fixed" ? parseFloat(form.discount_value) : null,
        max_uses: parseInt(form.max_uses) || 1,
        description: form.description
      };
      const response = await base44.functions.invoke("generateVoucher", payload);
      return response.data;
    },
    onSuccess: (data) => {
      setCreatedVoucher(data.voucher);
      setShowSuccess(true);
      setForm({ discount_type: "percent", discount_percent: "", discount_value: "", max_uses: 1, description: "" });
      queryClient.invalidateQueries(["myVouchers"]);
      queryClient.invalidateQueries(["sellerRules"]);
      queryClient.invalidateQueries(["vouchers"]);
      toast.success("Voucher gerado com sucesso!");
    },
    onError: (error) => {
      const msg = error?.response?.data?.error || error.message || "Erro ao gerar voucher";
      toast.error(msg);
    }
  });

  const handleGenerate = () => {
    if (form.discount_type === "percent") {
      const val = parseFloat(form.discount_percent);
      if (!val || val <= 0 || val > 100) {
        toast.error("Informe um percentual de desconto válido (1-100%)");
        return;
      }
    } else {
      const val = parseFloat(form.discount_value);
      if (!val || val <= 0) {
        toast.error("Informe um valor de desconto válido");
        return;
      }
    }
    generateMutation.mutate();
  };

  const copyCode = () => {
    if (createdVoucher?.code) {
      navigator.clipboard.writeText(createdVoucher.code);
      toast.success("Código copiado!");
    }
  };

  if (!isAuthorized) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">Acesso Não Autorizado</h3>
          <p className="text-yellow-700">
            Você não possui autorização para gerar vouchers. Solicite ao administrador que configure suas regras de vendedor.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats do vendedor */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Vouchers este mês</p>
                <p className="text-2xl font-bold">{vouchersThisMonth}</p>
              </div>
              <Ticket className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Restantes no mês</p>
                <p className="text-2xl font-bold">{remaining}</p>
              </div>
              <Info className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Desconto máximo</p>
                <p className="text-2xl font-bold">
                  {isAdmin ? "∞" : `${rule?.max_discount_percent || 0}%`}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5" />
            Gerar Novo Voucher
          </CardTitle>
          <CardDescription>
            O voucher terá validade de 30 dias a partir da criação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Tipo de Desconto</Label>
              <Select 
                value={form.discount_type} 
                onValueChange={(v) => setForm({ ...form, discount_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentual (%)</SelectItem>
                  <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.discount_type === "percent" ? (
              <div>
                <Label>Desconto (%)</Label>
                <Input
                  type="number"
                  min="1"
                  max={isAdmin ? 100 : (rule?.max_discount_percent || 100)}
                  value={form.discount_percent}
                  onChange={(e) => setForm({ ...form, discount_percent: e.target.value })}
                  placeholder={`Máx: ${isAdmin ? "100" : rule?.max_discount_percent || "100"}%`}
                />
              </div>
            ) : (
              <div>
                <Label>Valor do Desconto (R$)</Label>
                <InputMoeda
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  placeholder="Ex: 50.00"
                />
              </div>
            )}
          </div>

          <div>
            <Label>Quantidade máxima de usos</Label>
            <Input
              type="number"
              min="1"
              max="100"
              value={form.max_uses}
              onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
            />
          </div>

          <div>
            <Label>Descrição / Motivo (opcional)</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ex: Desconto para cliente fidelidade, promoção de aniversário..."
              rows={3}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Ticket className="w-4 h-4 mr-2" />
                Gerar Voucher
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Modal de sucesso */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <Check className="w-6 h-6" />
              Voucher Criado!
            </DialogTitle>
            <DialogDescription>
              Compartilhe o código com o cliente
            </DialogDescription>
          </DialogHeader>
          {createdVoucher && (
            <div className="space-y-4">
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
                <p className="text-sm text-green-600 mb-2">Código do Voucher</p>
                <p className="text-3xl font-mono font-bold text-green-800 tracking-wider">
                  {createdVoucher.code}
                </p>
                <Button variant="outline" size="sm" onClick={copyCode} className="mt-3">
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Código
                </Button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Desconto:</span>
                  <Badge>
                    {createdVoucher.discount_type === "percent"
                      ? `${createdVoucher.discount_percent}%`
                      : `R$ ${createdVoucher.discount_value?.toFixed(2)}`}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Usos máximos:</span>
                  <span className="font-medium">{createdVoucher.max_uses}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Validade:</span>
                  <span className="font-medium">
                    {format(new Date(createdVoucher.expiration_date), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}