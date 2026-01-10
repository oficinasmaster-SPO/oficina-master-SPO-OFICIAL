import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Edit, Send, Copy, CheckCircle, Clock, AlertCircle, Search, Filter } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import ContractDetailsModal from "./ContractDetailsModal";

export default function ContractList({ contracts, isLoading, onEdit }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedContract, setSelectedContract] = useState(null);

  const statusConfig = {
    rascunho: { label: "Rascunho", color: "bg-gray-100 text-gray-800", icon: FileText },
    enviado: { label: "Enviado", color: "bg-blue-100 text-blue-800", icon: Send },
    dados_preenchidos: { label: "Dados OK", color: "bg-yellow-100 text-yellow-800", icon: Clock },
    assinado: { label: "Assinado", color: "bg-purple-100 text-purple-800", icon: CheckCircle },
    pagamento_confirmado: { label: "Pago", color: "bg-green-100 text-green-800", icon: CheckCircle },
    efetivado: { label: "Efetivado", color: "bg-green-600 text-white", icon: CheckCircle },
    cancelado: { label: "Cancelado", color: "bg-red-100 text-red-800", icon: AlertCircle }
  };

  const copyLink = (contract) => {
    const link = contract.contract_link || `${window.location.origin}/contrato/${contract.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.workshop_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.contract_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || contract.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por oficina ou número..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {filteredContracts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>Nenhum contrato encontrado</p>
              </div>
            ) : (
              filteredContracts.map((contract) => {
                const StatusIcon = statusConfig[contract.status]?.icon || FileText;
                
                return (
                  <div
                    key={contract.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedContract(contract)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{contract.workshop_name}</h3>
                          <Badge className={statusConfig[contract.status]?.color}>
                            {statusConfig[contract.status]?.label}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>Contrato: <span className="font-medium">{contract.contract_number}</span></p>
                          <p>Plano: <span className="font-medium">{contract.plan_type}</span></p>
                          <p>Consultor: <span className="font-medium">{contract.consultor_nome}</span></p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(contract);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {contract.status !== 'rascunho' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyLink(contract);
                            }}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Progresso de Efetivação</span>
                        <span className="font-semibold">{contract.completion_percentage || 0}%</span>
                      </div>
                      <Progress value={contract.completion_percentage || 0} className="h-2" />
                      
                      <div className="flex gap-2 text-xs">
                        <div className={`flex items-center gap-1 ${contract.client_data_filled ? 'text-green-600' : 'text-gray-400'}`}>
                          <CheckCircle className="w-3 h-3" />
                          Dados
                        </div>
                        <div className={`flex items-center gap-1 ${contract.client_signed ? 'text-green-600' : 'text-gray-400'}`}>
                          <CheckCircle className="w-3 h-3" />
                          Assinado
                        </div>
                        <div className={`flex items-center gap-1 ${contract.payment_confirmed ? 'text-green-600' : 'text-gray-400'}`}>
                          <CheckCircle className="w-3 h-3" />
                          Pagamento
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {selectedContract && (
        <ContractDetailsModal
          contract={selectedContract}
          open={!!selectedContract}
          onClose={() => setSelectedContract(null)}
          onEdit={onEdit}
        />
      )}
    </>
  );
}