import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Clock, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import RequestApprovalDialog from "./RequestApprovalDialog";
import { format } from "date-fns";

export default function PendingRequestsList({ onRequestProcessed }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['permissionRequests'],
    queryFn: () => base44.entities.PermissionChangeRequest.list('-created_date'),
  });

  const filteredRequests = (requests || []).filter(req => {
    if (!req) return false;
    const matchesSearch = !searchTerm || 
                         req?.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         req?.requested_by_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "todos" || req?.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = requests.filter(r => r.status === 'pendente').length;

  const handleOpenApproval = (request) => {
    setSelectedRequest(request);
    setApprovalDialogOpen(true);
  };

  const handleRequestProcessed = () => {
    setApprovalDialogOpen(false);
    setSelectedRequest(null);
    if (onRequestProcessed) onRequestProcessed();
  };

  if (isLoading) {
    return <div className="text-center p-4">Carregando solicitações...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Solicitações de Permissão</h2>
          <p className="text-sm text-gray-600 mt-1">
            {pendingCount} solicitação(ões) pendente(s) de aprovação
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por colaborador ou solicitante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-md bg-white"
        >
          <option value="todos">Todos os Status</option>
          <option value="pendente">Pendentes</option>
          <option value="aprovado">Aprovados</option>
          <option value="rejeitado">Rejeitados</option>
        </select>
      </div>

      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma solicitação encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map(request => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{request.employee_name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Solicitado por: {request.requested_by_name}
                    </p>
                  </div>
                  <Badge variant={
                    request.status === 'pendente' ? 'default' :
                    request.status === 'aprovado' ? 'outline' :
                    'destructive'
                  }>
                    {request.status === 'pendente' ? '⏳ Pendente' :
                     request.status === 'aprovado' ? '✅ Aprovado' :
                     '❌ Rejeitado'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                   <span className="font-medium">Tipo de mudança:</span>{' '}
                   {request.change_type === 'profile_change' ? 'Mudança de Perfil' :
                    request.change_type === 'custom_roles_add' ? 'Adicionar Roles' :
                    request.change_type === 'custom_roles_remove' ? 'Remover Roles' :
                    'Mudança de Status'}
                  </div>
                  {request.change_type === 'profile_change' && (
                   <div>
                     <span className="font-medium">De:</span> {request.current_profile_name || 'Sem perfil'} → 
                     <span className="font-medium"> Para:</span> {request.requested_profile_name || 'N/A'}
                   </div>
                  )}
                  {request.change_type === 'status_change' && (
                    <div>
                      <span className="font-medium">De:</span> {request.current_status} → 
                      <span className="font-medium"> Para:</span> {request.requested_status}
                    </div>
                  )}
                  {request.justification && (
                    <div>
                      <span className="font-medium">Justificativa:</span>
                      <p className="text-gray-700 mt-1">{request.justification}</p>
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    Criado em: {format(new Date(request.created_date), 'dd/MM/yyyy HH:mm')}
                  </div>
                  {request.status !== 'pendente' && request.approved_at && (
                    <div className="text-xs text-gray-500">
                      {request.status === 'aprovado' ? 'Aprovado' : 'Rejeitado'} por {request.approved_by_name} em{' '}
                      {format(new Date(request.approved_at), 'dd/MM/yyyy HH:mm')}
                    </div>
                  )}
                  {request.rejection_reason && (
                    <div className="text-xs text-red-600">
                      Motivo da rejeição: {request.rejection_reason}
                    </div>
                  )}
                </div>
                
                {request.status === 'pendente' && (
                  <div className="flex gap-2 mt-4">
                    <Button 
                      size="sm" 
                      onClick={() => handleOpenApproval(request)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Revisar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RequestApprovalDialog
        open={approvalDialogOpen}
        onClose={() => setApprovalDialogOpen(false)}
        request={selectedRequest}
        onProcessed={handleRequestProcessed}
      />
    </div>
  );
}