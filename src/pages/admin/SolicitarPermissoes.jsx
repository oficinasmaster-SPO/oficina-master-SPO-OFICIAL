import React, { useState } from "react";
import { base44 } from '@/api/base44Client';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {  Alert, AlertDescription  } from "@/components/ui/alert";
import { Shield, Clock, CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import PermissionRequestForm from "@/components/rbac/PermissionRequestForm";
import {  usePermissionChangeRequest  } from "@/components/rbac/hooks/usePermissionChangeRequest";

export default function SolicitarPermissoes() {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestType, setRequestType] = useState(null);
  const { createRequest, isCreating } = usePermissionChangeRequest();

  const { data: currentUser, isLoading: loadingUser } = useQuery({
    queryKey: ['current-user-self'],
    queryFn: () => base44.auth.me()
  });

  const { data: myEmployee, isLoading: loadingEmployee } = useQuery({
    queryKey: ['my-employee', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const employees = await base44.entities.Employee.filter({ email: currentUser.email });
      return Array.isArray(employees) && employees.length > 0 ? employees[0] : null;
    },
    enabled: !!currentUser?.email
  });

  const { data: myRequests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ['my-permission-requests', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const all = await base44.entities.PermissionChangeRequest.filter({ 
        requested_by: currentUser.email 
      });
      return Array.isArray(all) ? all : [];
    },
    enabled: !!currentUser?.email,
    refetchInterval: 30000
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['user-profiles-external'],
    queryFn: async () => {
      const all = await base44.entities.UserProfile.list();
      return all.filter(p => p.type === 'externo' && p.status === 'ativo');
    }
  });

  const { data: customRoles = [] } = useQuery({
    queryKey: ['custom-roles-available'],
    queryFn: () => base44.entities.CustomRole.filter({ status: 'ativo' })
  });

  const handleStartRequest = (type) => {
    setRequestType(type);
    setShowRequestForm(true);
  };

  const handleSubmitRequest = async (justification) => {
    if (!myEmployee || !currentUser) return;

    let requestData = {
      employee_id: myEmployee.id,
      employee_name: myEmployee.full_name,
      requested_by: currentUser.email,
      requested_by_name: currentUser.full_name,
      justification
    };

    if (requestType === 'profile') {
      requestData.change_type = 'profile_change';
      requestData.current_profile_id = myEmployee.profile_id || '';
      requestData.current_profile_name = profiles.find(p => p.id === myEmployee.profile_id)?.name || 'Sem perfil';
    } else if (requestType === 'custom_roles') {
      requestData.change_type = 'custom_roles_add';
      requestData.current_custom_role_ids = myEmployee.custom_role_ids || [];
    }

    createRequest(requestData, {
      onSuccess: () => {
        setShowRequestForm(false);
        setRequestType(null);
      }
    });
  };

  const getStatusBadge = (status) => {
    const config = {
      pendente: { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: Clock, label: 'Pendente' },
      aprovado: { color: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle, label: 'Aprovado' },
      rejeitado: { color: 'bg-red-100 text-red-700 border-red-300', icon: XCircle, label: 'Rejeitado' }
    };
    const { color, icon: Icon, label } = config[status] || config.pendente;
    
    return (
      <Badge className={`${color} border`}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  if (loadingUser || loadingEmployee) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!myEmployee) {
    return (
      <Alert className="max-w-2xl mx-auto mt-8">
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>
          Seu cadastro de colaborador nÃ£o foi encontrado. Entre em contato com o administrador.
        </AlertDescription>
      </Alert>
    );
  }

  const currentProfile = profiles.find(p => p.id === myEmployee.profile_id);
  const myCustomRoles = customRoles.filter(r => 
    (myEmployee.custom_role_ids || []).includes(r.id)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Solicitar PermissÃµes</h1>
          <p className="text-gray-600 mt-1">
            Portal de autoatendimento para solicitaÃ§Ã£o de acessos
          </p>
        </div>
      </div>

      {/* Minhas PermissÃµes Atuais */}
      <Card>
        <CardHeader>
          <CardTitle>Minhas PermissÃµes Atuais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Perfil AtribuÃ­do:</p>
            {currentProfile ? (
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-700 border-blue-300 border">
                  {currentProfile.name}
                </Badge>
                <span className="text-xs text-gray-600">
                  {currentProfile.roles?.length || 0} permissÃµes
                </span>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Nenhum perfil atribuÃ­do</p>
            )}
          </div>

          {myCustomRoles.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Roles Customizadas:</p>
              <div className="flex flex-wrap gap-2">
                {myCustomRoles.map(role => (
                  <Badge key={role.id} variant="outline">
                    {role.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <p className="text-xs text-gray-500">
              Para solicitar alteraÃ§Ãµes nas suas permissÃµes, clique em uma das opÃ§Ãµes abaixo.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AÃ§Ãµes de SolicitaÃ§Ã£o */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500"
              onClick={() => handleStartRequest('profile')}>
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Solicitar MudanÃ§a de Perfil</h3>
              <p className="text-sm text-gray-600">
                Solicite a alteraÃ§Ã£o do seu perfil de acesso
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-purple-500"
              onClick={() => handleStartRequest('custom_roles')}>
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Solicitar Roles Adicionais</h3>
              <p className="text-sm text-gray-600">
                Solicite permissÃµes especÃ­ficas adicionais
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* HistÃ³rico de SolicitaÃ§Ãµes */}
      <Card>
        <CardHeader>
          <CardTitle>Minhas SolicitaÃ§Ãµes</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRequests ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
            </div>
          ) : myRequests.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              VocÃª ainda nÃ£o fez nenhuma solicitaÃ§Ã£o
            </p>
          ) : (
            <div className="space-y-3">
              {myRequests.map(request => (
                <div 
                  key={request.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-sm">
                          {request.change_type === 'profile_change' ? 'MudanÃ§a de Perfil' : 
                           request.change_type === 'custom_roles_add' ? 'Adicionar Roles' :
                           'AlteraÃ§Ã£o de PermissÃµes'}
                        </span>
                        {getStatusBadge(request.status)}
                      </div>
                      
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>
                          <strong>Data:</strong> {format(new Date(request.created_date), "dd/MM/yyyy 'Ã s' HH:mm", { locale: ptBR })}
                        </p>
                        
                        {request.change_type === 'profile_change' && (
                          <p>
                            <strong>MudanÃ§a:</strong> {request.current_profile_name || 'Sem perfil'} â†’ {request.requested_profile_name || 'A definir'}
                          </p>
                        )}
                        
                        {request.justification && (
                          <p className="mt-2 p-2 bg-gray-50 rounded border text-xs">
                            <strong>Justificativa:</strong> {request.justification}
                          </p>
                        )}
                        
                        {request.status === 'aprovado' && request.approved_by_name && (
                          <p className="text-green-700">
                            <strong>Aprovado por:</strong> {request.approved_by_name}
                          </p>
                        )}
                        
                        {request.status === 'rejeitado' && (
                          <p className="text-red-700">
                            <strong>Motivo da rejeiÃ§Ã£o:</strong> {request.rejection_reason || 'NÃ£o informado'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de SolicitaÃ§Ã£o */}
      {showRequestForm && (
        <PermissionRequestForm
          open={showRequestForm}
          onClose={() => {
            setShowRequestForm(false);
            setRequestType(null);
          }}
          employee={myEmployee}
          changeType={requestType === 'profile' ? 'profile_change' : 'custom_roles_add'}
          currentProfileId={myEmployee.profile_id}
          currentProfileName={currentProfile?.name}
          currentCustomRoleIds={myEmployee.custom_role_ids}
          onSubmit={handleSubmitRequest}
          isLoading={isCreating}
        />
      )}
    </div>
  );
}



