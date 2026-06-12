import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Shield, Trash2, Plus, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PermissionExceptionEditor from "@/components/permissions/ExternalUserManagement/PermissionExceptionEditor";

export default function PermissionExceptionsModal({ open, onOpenChange }) {
  const [selectedWorkshopId, setSelectedWorkshopId] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const queryClient = useQueryClient();

  const { data: workshops = [] } = useQuery({
    queryKey: ['workshops-list-permissions'],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('getUserWorkshops', {});
        return response?.data?.workshops || [];
      } catch {
        return [];
      }
    },
    enabled: open,
    staleTime: 5 * 60 * 1000
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-in-workshop', selectedWorkshopId],
    queryFn: async () => {
      if (!selectedWorkshopId) return [];
      try {
        const emps = await base44.asServiceRole.entities.Employee.filter({ workshop_id: selectedWorkshopId });
        return Array.isArray(emps) ? emps : [];
      } catch {
        return [];
      }
    },
    enabled: !!selectedWorkshopId && open
  });

  const { data: exceptions = [] } = useQuery({
    queryKey: ['user-permission-exceptions', selectedUserId, selectedWorkshopId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      // W2 FIX: passa workshop_id para escopo correto
      const response = await base44.functions.invoke('getUserPermissionExceptions', {
        user_id: selectedUserId,
        workshop_id: selectedWorkshopId
      });
      return response.data.exceptions || [];
    },
    enabled: !!selectedUserId && open
  });

  const removeMutation = useMutation({
    mutationFn: (exception_id) => base44.functions.invoke('removeUserPermissionException', { exception_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permission-exceptions'] });
      toast.success('Exceção removida com sucesso!');
    },
    onError: (error) => toast.error('Erro ao remover: ' + error.message)
  });

  const handleAddException = () => {
    if (!selectedUserId || !selectedWorkshopId) {
      toast.error('Selecione uma oficina e um usuário primeiro');
      return;
    }
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    queryClient.invalidateQueries({ queryKey: ['user-permission-exceptions'] });
  };

  const selectedEmployee = employees.find(e => e.user_id === selectedUserId);
  const selectedWorkshop = workshops.find(w => w.id === selectedWorkshopId);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Shield className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold">Permissões Individuais</p>
                <p className="text-sm text-gray-500 font-normal">Gerencie exceções de permissão por usuário</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900">
                  <strong>⚠️ Permissões Individuais (Exceções)</strong> sobrescrevem o perfil de acesso padrão. Use com cautela.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Oficina *</Label>
                <Select
                  value={selectedWorkshopId || ""}
                  onValueChange={(v) => { setSelectedWorkshopId(v); setSelectedUserId(null); }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma oficina..." />
                  </SelectTrigger>
                  <SelectContent>
                    {workshops.map(ws => (
                      <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Usuário *</Label>
                <Select
                  value={selectedUserId || ""}
                  onValueChange={setSelectedUserId}
                  disabled={!selectedWorkshopId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedWorkshopId ? "Selecione um usuário..." : "Selecione uma oficina primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.filter(e => e.user_id).map(emp => (
                      <SelectItem key={emp.user_id} value={emp.user_id}>
                        {emp.full_name} — {emp.job_role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedUserId && selectedWorkshopId && (
              <div className="flex justify-end">
                <Button onClick={handleAddException} className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Exceção
                </Button>
              </div>
            )}

            {!selectedUserId || !selectedWorkshopId ? (
              <div className="text-center py-12 text-gray-500">
                <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium text-gray-700">Selecione uma oficina e usuário</p>
                <p className="text-sm mt-1">Use os filtros acima para visualizar as permissões individuais</p>
              </div>
            ) : exceptions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium text-gray-700">Nenhuma exceção cadastrada</p>
                <p className="text-sm mt-1">Este usuário segue estritamente o perfil de acesso</p>
              </div>
            ) : (
              <div className="space-y-3">
                {exceptions.map((exception) => (
                  <div key={exception.id} className="border rounded-lg p-4 flex items-start justify-between hover:bg-gray-50">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={
                          exception.permission_type === 'module_permission' ? 'bg-blue-100 text-blue-700' :
                          exception.permission_type === 'sidebar_permission' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }>
                          {exception.permission_type === 'module_permission' ? 'Módulo' :
                           exception.permission_type === 'sidebar_permission' ? 'Sidebar' : 'Página'}
                        </Badge>
                        <Badge className={exception.granted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {exception.granted ? '✅ Concede' : '❌ Nega'}
                        </Badge>
                      </div>
                      <p className="font-semibold text-gray-900">{exception.permission_label || exception.permission_key}</p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Chave:</span>{' '}
                        <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{exception.permission_key}</code>
                      </p>
                      {exception.justification && (
                        <div className="bg-gray-50 p-2 rounded text-sm">
                          <p className="font-medium text-gray-700">Justificativa:</p>
                          <p className="text-gray-600 mt-1">{exception.justification}</p>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 pt-1 border-t">
                        Criado por: {exception.created_by_name || exception.created_by} •{' '}
                        {format(new Date(exception.created_at || exception.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0 ml-4"
                      onClick={() => window.confirm('Deseja remover esta exceção?') && removeMutation.mutate(exception.id)}
                      disabled={removeMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {showEditor && selectedUserId && selectedWorkshopId && (
        <PermissionExceptionEditor
          open={showEditor}
          onOpenChange={handleCloseEditor}
          user={{
            user_id: selectedUserId,
            workshop_id: selectedWorkshopId,
            full_name: selectedEmployee?.full_name || '',
            email: selectedEmployee?.email || '',
            workshop_name: selectedWorkshop?.name || ''
          }}
        />
      )}
    </>
  );
}