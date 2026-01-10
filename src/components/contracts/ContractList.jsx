import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Eye, Edit, CheckCircle, XCircle, DollarSign, FileText, User, PenTool, CreditCard, FileCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import ContractDetailsModal from "./ContractDetailsModal";

export default function ContractList({ contracts, isLoading, onEdit }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedContract, setSelectedContract] = useState(null);

  const contractsWithIds = React.useMemo(() => {
    if (!contracts) return [];
    return contracts.map((contract, index) => ({
      ...contract,
      contract_id: contract.contract_number || `CT${String(index + 1).padStart(3, '0')}`
    }));
  }, [contracts]);

  const statusConfig = {
    rascunho: { label: "Rascunho", color: "bg-gray-100 text-gray-800" },
    enviado: { label: "Enviado", color: "bg-blue-100 text-blue-800" },
    dados_preenchidos: { label: "Dados OK", color: "bg-yellow-100 text-yellow-800" },
    assinado: { label: "Assinado", color: "bg-purple-100 text-purple-800" },
    pagamento_confirmado: { label: "Pago", color: "bg-green-100 text-green-800" },
    efetivado: { label: "Efetivado", color: "bg-green-600 text-white" },
    cancelado: { label: "Cancelado", color: "bg-red-100 text-red-800" }
  };

  const filteredContracts = contractsWithIds.filter(contract => {
    const matchesSearch = contract.workshop_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.contract_id?.toLowerCase().includes(searchTerm.toLowerCase());
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
                placeholder="Buscar por oficina ou ID do contrato..."
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

          {filteredContracts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Nenhum contrato encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="text-left p-3 text-xs font-semibold text-gray-700 uppercase">ID</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-700 uppercase">Plano</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-700 uppercase">Oficina</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-700 uppercase">Sócio</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-700 uppercase">Valor</th>
                    <th className="text-center p-3 text-xs font-semibold text-gray-700 uppercase">Indicadores</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-700 uppercase">Progresso</th>
                    <th className="text-center p-3 text-xs font-semibold text-gray-700 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts.map((contract) => {
                    const statusInfo = statusConfig[contract.status] || statusConfig.rascunho;

                    return (
                      <tr
                        key={contract.id}
                        className="border-b hover:bg-gray-50 transition-colors"
                      >
                        <td className="p-3">
                          <span className="font-mono text-sm font-bold text-blue-600">
                            {contract.contract_id}
                          </span>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="font-medium">
                            {contract.plan_type}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900 text-sm">
                              {contract.workshop_name || "Sem nome"}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-700">
                              {contract.consultor_nome || "-"}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span className="font-semibold text-gray-900 text-sm">
                              {contract.contract_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            {/* Status do Contrato */}
                            <div 
                              className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                                contract.status === 'efetivado' ? 'bg-green-500' : 
                                contract.status === 'cancelado' ? 'bg-red-500' : 
                                contract.status === 'enviado' ? 'bg-blue-500' :
                                'bg-gray-300'
                              }`} 
                              title={`Status: ${statusInfo.label}`}
                            >
                              <FileCheck className={`w-4 h-4 ${
                                contract.status === 'efetivado' || contract.status === 'cancelado' || contract.status === 'enviado' 
                                ? 'text-white' 
                                : 'text-gray-500'
                              }`} />
                            </div>

                            {/* Pagamento */}
                            <div 
                              className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                                contract.payment_confirmed ? 'bg-green-500' : 'bg-red-100'
                              }`} 
                              title={contract.payment_confirmed ? 'Pagamento Confirmado' : 'Aguardando Pagamento'}
                            >
                              <DollarSign className={`w-4 h-4 ${
                                contract.payment_confirmed ? 'text-white' : 'text-red-500'
                              }`} />
                            </div>

                            {/* Assinatura */}
                            <div 
                              className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                                contract.client_signed ? 'bg-green-500' : 'bg-red-100'
                              }`} 
                              title={contract.client_signed ? 'Assinado' : 'Aguardando Assinatura'}
                            >
                              <PenTool className={`w-4 h-4 ${
                                contract.client_signed ? 'text-white' : 'text-red-500'
                              }`} />
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Progress value={contract.completion_percentage || 0} className="h-2 flex-1 max-w-[120px]" />
                            <span className="text-xs text-gray-600 min-w-[3rem] text-right font-medium">
                              {contract.completion_percentage || 0}%
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedContract(contract);
                              }}
                              title="Ver detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(contract);
                              }}
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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