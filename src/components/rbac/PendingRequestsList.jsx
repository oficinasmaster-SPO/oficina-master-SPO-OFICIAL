import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, CheckCircle, XCircle, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import RequestApprovalDialog from "./RequestApprovalDialog";

export default function PendingRequestsList() {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['permission-requests'],
    queryFn: async () => {
      const all = await base44.entities.PermissionChangeRequest.list('-created_date');
      return Array.isArray(all) ? all : [];
    },
    refetchInterval: 30000 // Atualiza a cada 30s
  });

  const pendingRequests = requests.filter(r => r.status === 'pendente');
  const processedRequests = requests.filter(r => r.status !== 'pendente');

  const getChangeTypeLabel = (type) => {
    const labels = {
      profile_change: 'Mudança de Perfil',
      custom_roles_add: 'Adicionar Roles',
      custom_roles_remove: 'Remover Roles',
      status_change: 'Mudança de Status'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status) => {
    const config = {
      pendente: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      aprovado: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
      rejeitado: { color: 'bg-red-100 text-red-700', icon: XCircle }
    };
    const { color, icon: Icon } = config[status] || config.pendente;
    
    return (
      <Badge className={color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setApprovalDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">Carregando solicitações...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Solicitações Pendentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Solicitações Pendentes ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <p className="text-center py-8 text-gray-500">
                Nenhuma solicitação pendente
              </p>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map(request => (
                  <div 
                    key={request.id}
                    className="border rounded-lg p-4 bg-orange-50 border-orange-200 hover:bg-orange-100 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900">
                            {request.employee_name}
                          </h4>
                          <Badge variant="outline">
                            {getChangeTypeLabel(request.change_type)}
                          </Badge>
                          {getStatusBadge(request.status)}
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>
                            <strong>Solicitado por:</strong> {request.requested_by_name || request.requested_by}
                          </p>
                          <p>
                            <strong>Data:</strong> {format(new Date(request.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                          
                          {request.change_type === 'profile_change' && (
                            <p>
                              <strong>Mudança:</strong> {request.current_profile_name || 'Sem perfil'} → {request.requested_profile_name}
                            </p>
                          )}
                          
                          {request.justification && (
                            <p className="mt-2 p-2 bg-white rounded border">
                              <strong>Justificativa:</strong> {request.justification}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => handleViewRequest(request)}
                        className="bg-orange-600 hover:bg-orange-700 ml-4"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Analisar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Histórico Processado */}
        {processedRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Solicitações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {processedRequests.slice(0, 10).map(request => (
                  <div 
                    key={request.id}
                    className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{request.employee_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {getChangeTypeLabel(request.change_type)}
                          </Badge>
                          {getStatusBadge(request.status)}
                        </div>
                        <div className="text-xs text-gray-600">
                          {request.approved_by_name && (
                            <span>Por {request.approved_by_name} • </span>
                          )}
                          {format(new Date(request.approved_at || request.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewRequest(request)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de Aprovação */}
      <RequestApprovalDialog
        open={approvalDialogOpen}
        onClose={() => {
          setApprovalDialogOpen(false);
          setSelectedRequest(null);
        }}
        request={selectedRequest}
      />
    </>
  );
}