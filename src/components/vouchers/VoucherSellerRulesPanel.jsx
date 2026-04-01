import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, UserCheck, UserX, Pencil, Plus, Trash2, Loader2, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";

export default function VoucherSellerRulesPanel({ user }) {
  const queryClient = useQueryClient();
  const { workshop } = useWorkshopContext();
  const [editRule, setEditRule] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSellerId, setSelectedSellerId] = useState("");

  // Buscar regras existentes
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["sellerRules", workshop?.id],
    queryFn: () => base44.entities.VoucherSellerRule.filter(
      { workshop_id: workshop.id }, "-created_date", 200
    ),
    enabled: !!workshop?.id
  });

  // Buscar colaboradores/vendedores da oficina
  const { data: employees = [] } = useQuery({
    queryKey: ["employees", workshop?.id],
    queryFn: () => base44.entities.Employee.filter(
      { workshop_id: workshop.id, status: "ativo" }, "full_name", 200
    ),
    enabled: !!workshop?.id
  });

  const sellersWithoutRules = employees.filter(
    (emp) => !rules.some((r) => r.seller_id === emp.user_id)
  );

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (data.id) {
        await base44.entities.VoucherSellerRule.update(data.id, data);
      } else {
        await base44.entities.VoucherSellerRule.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["sellerRules"]);
      setShowForm(false);
      setEditRule(null);
      toast.success("Regras salvas com sucesso!");
    },
    onError: (err) => toast.error(err.message || "Erro ao salvar regras")
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.VoucherSellerRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["sellerRules"]);
      toast.success("Regra removida");
    }
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => base44.entities.VoucherSellerRule.update(id, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries(["sellerRules"]);
      toast.success("Status atualizado");
    }
  });

  const openCreate = () => {
    setEditRule(null);
    setSelectedSellerId("");
    setShowForm(true);
  };

  const openEdit = (rule) => {
    setEditRule(rule);
    setSelectedSellerId(rule.seller_id);
    setShowForm(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const seller = employees.find((emp) => emp.user_id === selectedSellerId);

    const payload = {
      ...(editRule?.id ? { id: editRule.id } : {}),
      seller_id: selectedSellerId,
      seller_name: seller?.full_name || editRule?.seller_name || "",
      workshop_id: workshop.id,
      company_id: workshop.company_id || null,
      consulting_firm_id: workshop.consulting_firm_id || null,
      max_vouchers_per_month: parseInt(fd.get("max_vouchers_per_month")) || 5,
      max_discount_percent: parseFloat(fd.get("max_discount_percent")) || 20,
      max_discount_value: parseFloat(fd.get("max_discount_value")) || null,
      max_sale_value: parseFloat(fd.get("max_sale_value")) || null,
      active: fd.get("active") === "on",
      notes: fd.get("notes") || ""
    };

    if (!payload.seller_id) {
      toast.error("Selecione um vendedor");
      return;
    }

    saveMutation.mutate(payload);
  };

  const filteredRules = rules.filter((r) =>
    !searchTerm || r.seller_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            Regras de Vendedores
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Defina limites e permissões de vouchers por vendedor
          </p>
        </div>
        <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          Nova Regra
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Vendedores com regra</p>
              <p className="text-2xl font-bold">{rules.length}</p>
            </div>
            <Users className="w-8 h-8 text-indigo-400" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Autorizados</p>
              <p className="text-2xl font-bold text-green-600">{rules.filter((r) => r.active).length}</p>
            </div>
            <UserCheck className="w-8 h-8 text-green-400" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Bloqueados</p>
              <p className="text-2xl font-bold text-red-600">{rules.filter((r) => !r.active).length}</p>
            </div>
            <UserX className="w-8 h-8 text-red-400" />
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar vendedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filteredRules.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-400">
            <Settings className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>Nenhuma regra configurada</p>
            <p className="text-sm mt-1">Clique em "Nova Regra" para começar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRules.map((rule) => (
            <SellerRuleCard
              key={rule.id}
              rule={rule}
              onEdit={() => openEdit(rule)}
              onDelete={() => {
                if (confirm("Remover regra deste vendedor?")) deleteMutation.mutate(rule.id);
              }}
              onToggle={(active) => toggleMutation.mutate({ id: rule.id, active })}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editRule ? "Editar Regra" : "Nova Regra de Vendedor"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            {!editRule ? (
              <div>
                <Label>Vendedor</Label>
                <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um vendedor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sellersWithoutRules.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        Todos já possuem regra
                      </SelectItem>
                    ) : (
                      sellersWithoutRules.map((emp) => (
                        <SelectItem key={emp.user_id || emp.id} value={emp.user_id || emp.id}>
                          {emp.full_name} — {emp.position || emp.job_role || "Vendedor"}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Vendedor</p>
                <p className="font-medium">{editRule.seller_name}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="max_vouchers_per_month">Vouchers / Mês</Label>
                <Input
                  name="max_vouchers_per_month"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={editRule?.max_vouchers_per_month || 5}
                />
              </div>
              <div>
                <Label htmlFor="max_discount_percent">Desconto Máx. (%)</Label>
                <Input
                  name="max_discount_percent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  defaultValue={editRule?.max_discount_percent || 20}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="max_discount_value">Desconto Fixo Máx. (R$)</Label>
                <Input
                  name="max_discount_value"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={editRule?.max_discount_value || ""}
                  placeholder="Sem limite"
                />
              </div>
              <div>
                <Label htmlFor="max_sale_value">Valor Máx. Venda (R$)</Label>
                <Input
                  name="max_sale_value"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={editRule?.max_sale_value || ""}
                  placeholder="Sem limite"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch name="active" defaultChecked={editRule?.active !== false} />
              <Label>Autorizado a gerar vouchers</Label>
            </div>

            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                name="notes"
                rows={2}
                defaultValue={editRule?.notes || ""}
                placeholder="Observações internas sobre este vendedor..."
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editRule ? "Salvar Alterações" : "Criar Regra"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SellerRuleCard({ rule, onEdit, onDelete, onToggle }) {
  return (
    <Card className={`transition-all ${!rule.active ? "opacity-60 border-red-200 bg-red-50/30" : ""}`}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${rule.active ? "bg-green-100" : "bg-red-100"}`}>
              {rule.active ? (
                <UserCheck className="w-5 h-5 text-green-600" />
              ) : (
                <UserX className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{rule.seller_name || "Vendedor"}</p>
              <p className="text-xs text-gray-400">ID: {rule.seller_id?.slice(0, 8)}...</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {rule.max_vouchers_per_month || 0} / mês
            </Badge>
            <Badge variant="outline" className="text-xs">
              Máx {rule.max_discount_percent || 0}%
            </Badge>
            {rule.max_discount_value && (
              <Badge variant="outline" className="text-xs">
                Máx R$ {rule.max_discount_value.toFixed(2)}
              </Badge>
            )}
            {rule.max_sale_value && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                Venda ≤ R$ {rule.max_sale_value.toFixed(2)}
              </Badge>
            )}
            <Badge className={rule.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
              {rule.active ? "Ativo" : "Bloqueado"}
            </Badge>
          </div>

          <div className="flex items-center gap-1">
            <Switch checked={rule.active} onCheckedChange={onToggle} />
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} className="text-red-500 hover:text-red-700">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {rule.notes && (
          <p className="text-xs text-gray-400 mt-2 pl-13">{rule.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}