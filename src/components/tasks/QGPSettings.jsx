import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench, Car, DollarSign, AlertTriangle, Clock, RotateCcw } from "lucide-react";
import { formatCurrency } from "../utils/formatters";

const TASK_TYPES = [
  { value: "geral", label: "Geral", icon: Wrench, color: "bg-gray-100 text-gray-700" },
  { value: "qgp_solicitacao_servico", label: "Solicitação de Serviço", icon: Car, color: "bg-blue-100 text-blue-700" },
  { value: "qgp_aviso_entrega", label: "Aviso de Entrega", icon: Clock, color: "bg-green-100 text-green-700" },
  { value: "qgp_tcmp2", label: "Acompanhamento TCMP²", icon: DollarSign, color: "bg-purple-100 text-purple-700" },
  { value: "qgp_retrabalho", label: "Retrabalho", icon: RotateCcw, color: "bg-red-100 text-red-700" },
  { value: "qgp_aguardando", label: "Aguardando", icon: AlertTriangle, color: "bg-yellow-100 text-yellow-700" }
];

const WAITING_REASONS = [
  { value: "peca", label: "Aguardando Peça" },
  { value: "aprovacao_cliente", label: "Aprovação do Cliente" },
  { value: "autorizacao", label: "Autorização" },
  { value: "pagamento", label: "Pagamento" },
  { value: "outros", label: "Outros" }
];

const DELIVERY_STATUS = [
  { value: "no_prazo", label: "No Prazo", color: "bg-green-100 text-green-700" },
  { value: "atrasado", label: "Atrasado", color: "bg-red-100 text-red-700" },
  { value: "entregue", label: "Entregue", color: "bg-blue-100 text-blue-700" },
  { value: "aguardando_cliente", label: "Aguardando Cliente", color: "bg-yellow-100 text-yellow-700" }
];

export default function QGPSettings({ taskType, qgpData, onTypeChange, onDataChange }) {
  const currentType = taskType || "geral";
  const data = qgpData || {};

  const handleDataChange = (field, value) => {
    onDataChange({
      ...data,
      [field]: value
    });
  };

  const isQGPType = currentType.startsWith("qgp_");

  return (
    <Card className="border-orange-200 bg-orange-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Wrench className="w-4 h-4 text-orange-600" />
          Tipo de Tarefa / QGP
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <Label>Tipo da Tarefa</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
            {TASK_TYPES.map(type => {
              const Icon = type.icon;
              const isSelected = currentType === type.value;
              return (
                <div
                  key={type.value}
                  onClick={() => onTypeChange(type.value)}
                  className={`
                    flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all border-2
                    ${isSelected 
                      ? 'border-orange-500 bg-orange-100' 
                      : 'border-transparent bg-white hover:border-orange-200'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{type.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {isQGPType && (
          <Tabs defaultValue="veiculo" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="veiculo">Veículo</TabsTrigger>
              <TabsTrigger value="tcmp2">TCMP²</TabsTrigger>
              <TabsTrigger value="entrega">Entrega</TabsTrigger>
              <TabsTrigger value="status">Status</TabsTrigger>
            </TabsList>

            <TabsContent value="veiculo" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nº da O.S.</Label>
                  <Input
                    value={data.os_number || ""}
                    onChange={(e) => handleDataChange("os_number", e.target.value)}
                    placeholder="Ex: 12345"
                  />
                </div>
                <div>
                  <Label>Placa do Veículo</Label>
                  <Input
                    value={data.vehicle_plate || ""}
                    onChange={(e) => handleDataChange("vehicle_plate", e.target.value.toUpperCase())}
                    placeholder="Ex: ABC-1234"
                    maxLength={8}
                  />
                </div>
              </div>

              <div>
                <Label>Modelo do Veículo</Label>
                <Input
                  value={data.vehicle_model || ""}
                  onChange={(e) => handleDataChange("vehicle_model", e.target.value)}
                  placeholder="Ex: Honda Civic 2020"
                />
              </div>

              <div>
                <Label>Nome do Cliente</Label>
                <Input
                  value={data.client_name || ""}
                  onChange={(e) => handleDataChange("client_name", e.target.value)}
                  placeholder="Ex: João Silva"
                />
              </div>

              <div>
                <Label>Tipo de Serviço</Label>
                <Input
                  value={data.service_type || ""}
                  onChange={(e) => handleDataChange("service_type", e.target.value)}
                  placeholder="Ex: Troca de óleo e filtros"
                />
              </div>
            </TabsContent>

            <TabsContent value="tcmp2" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>TCMP² Previsto (R$)</Label>
                  <Input
                    type="number"
                    value={data.tcmp2_predicted || ""}
                    onChange={(e) => handleDataChange("tcmp2_predicted", parseFloat(e.target.value) || 0)}
                    placeholder="Ex: 150.00"
                  />
                </div>
                <div>
                  <Label>TCMP² Executado (R$)</Label>
                  <Input
                    type="number"
                    value={data.tcmp2_executed || ""}
                    onChange={(e) => handleDataChange("tcmp2_executed", parseFloat(e.target.value) || 0)}
                    placeholder="Ex: 145.00"
                  />
                </div>
              </div>

              {data.tcmp2_predicted > 0 && data.tcmp2_executed > 0 && (
                <div className={`p-4 rounded-lg ${
                  data.tcmp2_executed >= data.tcmp2_predicted 
                    ? 'bg-green-100 border-2 border-green-300' 
                    : 'bg-red-100 border-2 border-red-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Status TCMP²:</span>
                    <Badge className={
                      data.tcmp2_executed >= data.tcmp2_predicted
                        ? 'bg-green-600'
                        : 'bg-red-600'
                    }>
                      {data.tcmp2_executed >= data.tcmp2_predicted ? 'Dentro/Acima' : 'Abaixo do Esperado'}
                    </Badge>
                  </div>
                  <div className="mt-2 text-sm">
                    <p>Previsto: {formatCurrency(data.tcmp2_predicted)}</p>
                    <p>Executado: {formatCurrency(data.tcmp2_executed)}</p>
                    <p className="font-bold">
                      Diferença: {formatCurrency(data.tcmp2_executed - data.tcmp2_predicted)}
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="entrega" className="space-y-4 mt-4">
              <div>
                <Label>Data Prevista de Entrega</Label>
                <Input
                  type="datetime-local"
                  value={data.delivery_date ? new Date(data.delivery_date).toISOString().slice(0, 16) : ""}
                  onChange={(e) => handleDataChange("delivery_date", e.target.value ? new Date(e.target.value).toISOString() : "")}
                />
              </div>

              <div>
                <Label>Status da Entrega</Label>
                <Select 
                  value={data.delivery_status || ""} 
                  onValueChange={(value) => handleDataChange("delivery_status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERY_STATUS.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        <div className="flex items-center gap-2">
                          <Badge className={status.color}>{status.label}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="status" className="space-y-4 mt-4">
              {currentType === "qgp_retrabalho" && (
                <>
                  <div>
                    <Label>Motivo do Retrabalho</Label>
                    <Textarea
                      value={data.rework_reason || ""}
                      onChange={(e) => handleDataChange("rework_reason", e.target.value)}
                      placeholder="Descreva o motivo do retrabalho..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Quantidade de Retrabalhos</Label>
                    <Input
                      type="number"
                      min="0"
                      value={data.rework_count || 0}
                      onChange={(e) => handleDataChange("rework_count", parseInt(e.target.value) || 0)}
                    />
                  </div>
                </>
              )}

              {currentType === "qgp_aguardando" && (
                <>
                  <div>
                    <Label>Motivo da Espera</Label>
                    <Select 
                      value={data.waiting_reason || ""} 
                      onValueChange={(value) => handleDataChange("waiting_reason", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o motivo" />
                      </SelectTrigger>
                      <SelectContent>
                        {WAITING_REASONS.map(reason => (
                          <SelectItem key={reason.value} value={reason.value}>
                            {reason.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Aguardando Desde</Label>
                    <Input
                      type="datetime-local"
                      value={data.waiting_since ? new Date(data.waiting_since).toISOString().slice(0, 16) : ""}
                      onChange={(e) => handleDataChange("waiting_since", e.target.value ? new Date(e.target.value).toISOString() : "")}
                    />
                  </div>

                  <div>
                    <Label>Observações</Label>
                    <Textarea
                      value={data.waiting_notes || ""}
                      onChange={(e) => handleDataChange("waiting_notes", e.target.value)}
                      placeholder="Observações adicionais..."
                      rows={2}
                    />
                  </div>
                </>
              )}

              {currentType !== "qgp_retrabalho" && currentType !== "qgp_aguardando" && (
                <div className="text-center py-8 text-gray-500">
                  <p>Selecione "Retrabalho" ou "Aguardando" para ver mais opções</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}