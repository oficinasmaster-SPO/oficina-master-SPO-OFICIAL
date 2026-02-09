import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle2, XCircle, Clock, AlertTriangle, 
  User, Shield, FileText 
} from "lucide-react";
import { toast } from "sonner";
import PermissionRequestForm from "./PermissionRequestForm";
import RequestApprovalDialog from "./RequestApprovalDialog";

/**
 * Gerenciador de solicitações de mudança de permissões
 * Permite criar, visualizar e aprovar/rejeitar mudanças críticas
 */
export default function PermissionChangeManager() {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const queryClient = useQueryClient();
  
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });
  
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['permission-requests'],
    queryFn: async () => {
      const result = await base44.entities.PermissionChangeRequest.list('-created_date');
      return Array.isArray(result) ? result : [];
    }
  });
  
  const approveMutation = useMutation({
    mutationFn: async ({ requestId, decision, reason }) => {
      const request = requests.find(r => r.id === requestId);
      if (!request) throw new Error('Solicitação não encontrada');
      
      const newStatus = decision === 'approve' ? 'aprovado' : 'rejeitado';
      
      await base44.entities.PermissionChangeRequest.update(requestId, {
        status: newStatus,
        approved_by: user.email,
        approved_by_name: user.full_name,
        approved_at: new Date().toISOString(),
        rejection_reason: decision === 'reject' ? reason : null
      });
      
      // Se aprovado, aplicar mudança
      if (decision === 'approve') {
        await applyPermissionChange(request);
      }
      
      // Log de auditoria
      await base44.functions.invoke('logRBACAction', {
        action_type: decision === 'approve' ? 'permission_request_approved' : 'permission_request_rejected',
        target_type: 'employee',
        target_id: request.employee_id,
        target_name: request.employee_name,
        changes: {
          request_type: request.change_type,
          approved_by: user.email
        },
        notes: reason || `Solicitação ${newStatus}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-requests'] });
      queryClient.invalidateQueries({ queryKey: ['employees-list'] });
      toast.success('Solicitação processada com sucesso');
      setSelectedRequest(null);
    },
    onError: (error) => {
      toast.error('Erro ao processar solicitação: ' + error.message);
    }
  });
  
  const applyPermissionChange = async (request) => {
    try {
      const updates = {};
      
      switch(request.change_type) {
        case 'profile_change':
          updates.profile_id = request.requested_profile_id;
          break;
        case 'custom_roles_add':
          updates.custom_role_ids = request.requested_custom_role_ids;
          break;
        case 'status_change':
          updates.user_status = request.requested_status;
          break;
      }
      
      const employee = await base44.entities.Employee.get(request.employee_id);
      await base44.entities.Employee.update(request.employee_id, updates);

      if (employee?.user_id) {
        const userUpdates = {};

        if (updates.profile_id !== undefined) {
          userUpdates.profile_id = updates.profile_id;
        }

        if (updates.custom_role_ids !== undefined) {
          userUpdates.custom_role_ids = updates.custom_role_ids;
        }

        if (updates.user_status !== undefined) {
          userUpdates.user_status = updates.user_status === 'ativo' ? 'active' : updates.user_status;
        }

        if (Object.keys(userUpdates).length > 0) {
          await base44.entities.User.update(employee.user_id, userUpdates);
        }
      }
    } catch (error) {
      console.error('Erro ao aplicar mudança:', error);
      throw error;
    }
  };
  
  const getStatusBadge = (status) => {
    switch(status) {
      case 'pendente':
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'aprovado':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />Aprovado</Badge>;
      case 'rejeitado':
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      default:
        return null;
    }
  };
  
  const pendingRequests = requests.filter(r => r.status === 'pendente');
  const processedRequests = requests.filter(r => r.status !== 'pendente');
  
  if (!user || user.role !== 'admin') {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-700 font-medium">Acesso restrito a administradores</p>
        </CardContent>
      </Card>
    );
  }
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Fluxo de Aprovação de Permissões</p>
              <p className="text-blue-800">
                Mudanças críticas de permissões requerem aprovação de um administrador antes de serem aplicadas.
                Isso garante controle e auditoria completa das alterações de acesso.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Solicitações de Mudança</h3>
          <p className="text-sm text-gray-600">
            {pendingRequests.length} pendente(s) de aprovação
          </p>
        </div>
        <Button 
          onClick={() => setShowRequestForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <FileText className="w-4 h-4 mr-2" />
          Nova Solicitação
        </Button>
      </div>
      
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pendentes ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="processed">
            Processadas ({processedRequests.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="space-y-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle2 className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">Nenhuma solicitação pendente</p>
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map(request => (
              <Card key={request.id} className="border-l-4 border-l-yellow-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-gray-500 mt-0.5" />
                      <div>
                        <CardTitle className="text-lg">{request.employee_name}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          Solicitado por: {request.requested_by_name}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Tipo: {request.change_type === 'profile_change' ? 'Mudança de Perfil' : 
                             request.change_type === 'custom_roles_add' ? 'Adicionar Roles' :
                             'Mudança de Status'}
                    </p>
                    {request.justification && (
                      <p className="text-sm text-gray-600">
                        <strong>Justificativa:</strong> {request.justification}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setSelectedRequest(request)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Revisar e Aprovar
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedRequest(request);
                      }}
                      variant="outline"
                      className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Rejeitar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="processed" className="space-y-4">
          {processedRequests.map(request => (
            <Card key={request.id} className={`border-l-4 ${
              request.status === 'aprovado' ? 'border-l-green-500' : 'border-l-red-500'
            }`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{request.employee_name}</CardTitle>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(request.approved_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  {request.status === 'aprovado' ? 'Aprovado' : 'Rejeitado'} por: {request.approved_by_name}
                </p>
                {request.rejection_reason && (
                  <p className="text-sm text-red-600 mt-2">
                    Motivo: {request.rejection_reason}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
      
      {showRequestForm && (
        <PermissionRequestForm
          onClose={() => setShowRequestForm(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['permission-requests'] });
            setShowRequestForm(false);
          }}
        />
      )}
      
      {selectedRequest && (
        <RequestApprovalDialog
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onApprove={(reason) => approveMutation.mutate({ 
            requestId: selectedRequest.id, 
            decision: 'approve',
            reason 
          })}
          onReject={(reason) => approveMutation.mutate({ 
            requestId: selectedRequest.id, 
            decision: 'reject',
            reason 
          })}
          isProcessing={approveMutation.isPending}
        />
      )}
    </div>
  );
}
