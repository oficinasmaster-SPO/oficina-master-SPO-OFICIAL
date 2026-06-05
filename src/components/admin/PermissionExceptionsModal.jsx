import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Shield, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function PermissionExceptionsModal({ open, onOpenChange, user }) {
  const [selectedUser, setSelectedUser] = useState(user || null);
  const [filterType, setFilterType] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newException, setNewException] = useState({
    permission_type: "module_permission",
    permission_key: "",
    permission_label: "",
    granted: true,
    justification: ""
  });
  const queryClient = useQueryClient();

  // Busca todos os usuários externos
  const { data: externalUsers = [] } = useQuery({
    queryKey: ['external-users-list'],
    queryFn: async () => {
      const response = await base44.functions.invoke('listExternalUsersByWorkshop', {});
      return response.data.users || [];
    },
    enabled: !selectedUser && open
  });

  const { data: exceptions = [] } = useQuery({
    queryKey: ['user-permission-exceptions', selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser?.id) return [];
      const response = await base44.functions.invoke('getUserPermissionExceptions', { user_id: selectedUser.id });
      return response.data.exceptions || [];
    },
    enabled: !!selectedUser?.id && open
  });

  const createExceptionMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('upsertUserPermissionException', {
        user_id: user.id,
        ...data
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permission-exceptions'] });
      toast.success('Exceção adicionada com sucesso');
      setShowAddForm(false);
      setNewException({
        permission_type: "module_permission",
        permission_key: "",
        permission_label: "",
        granted: true,
        justification: ""
      });
    },
    onError: (error) => {
      toast.error('Erro ao adicionar exceção: ' + error.message);
    }
  });

  const removeExceptionMutation = useMutation({
    mutationFn: async (exception_id) => {
      await base44.functions.invoke('removeUserPermissionException', { exception_id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permission-exceptions'] });
      toast.success('Exceção removida com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao remover: ' + error.message);
    }
  });

  const filteredExceptions = filterType === "all" 
    ? exceptions 
    : exceptions.filter(e => e.permission_type === filterType);

  const handleSubmit = () => {
    if (!newException.permission_key || !newException.permission_label) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    createExceptionMutation.mutate(newException);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <div>
              <p className="text-xl font-bold">Permissões Individuais</p>
              <p className="text-sm text-gray-500 font-normal">
                {selectedUser ? selectedUser.full_name : 'Selecione um usuário'}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Seletor de Usuário (quando não há usuário específico) */}
        {!user && !selectedUser && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-semibold">ℹ️ Selecione um Usuário</p>
              <p className="text-xs text-blue-700 mt-1">
                Escolha um usuário externo para gerenciar suas permissões individuais.
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {externalUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Nenhum usuário externo encontrado</p>
                </div>
              ) : (
                externalUsers.map((u) => (
                  <div
                    key={u.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedUser(u)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{u.full_name}</p>
                        <p className="text-sm text-gray-600">{u.email}</p>
                        <p className="text-xs text-gray-500 mt-1">🏢 {u.workshop_name || 'Sem oficina'}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Selecionar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Conteúdo de Permissões (quando há usuário selecionado) */}
        {(selectedUser || user) && (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Toolbar */}
            <div className="flex justify-between items-center gap-4">
            <div className="flex gap-2">
              <Button
                variant={filterType === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("all")}
              >
                Todas
              </Button>
              <Button
                variant={filterType === "module_permission" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("module_permission")}
              >
                Módulos
              </Button>
              <Button
                variant={filterType === "sidebar_permission" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("sidebar_permission")}
              >
                Sidebar
              </Button>
              <Button
                variant={filterType === "page_access" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("page_access")}
              >
                Páginas
              </Button>
            </div>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              {showAddForm ? "Cancelar" : "Nova Exceção"}
            </Button>
          </div>

          {/* Form de Adição */}
          {showAddForm && (
            <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Permissão</Label>
                  <Select
                    value={newException.permission_type}
                    onValueChange={(val) => setNewException({ ...newException, permission_type: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="module_permission">Módulo</SelectItem>
                      <SelectItem value="sidebar_permission">Sidebar</SelectItem>
                      <SelectItem value="page_access">Página</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ação</Label>
                  <Select
                    value={newException.granted ? "granted" : "denied"}
                    onValueChange={(val) => setNewException({ ...newException, granted: val === "granted" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="granted">Conceder</SelectItem>
                      <SelectItem value="denied">Negar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Chave da Permissão *</Label>
                  <Input
                    placeholder="ex: dashboard.view"
                    value={newException.permission_key}
                    onChange={(e) => setNewException({ ...newException, permission_key: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Nome Legível *</Label>
                  <Input
                    placeholder="ex: Dashboard Financeiro"
                    value={newException.permission_label}
                    onChange={(e) => setNewException({ ...newException, permission_label: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Justificativa</Label>
                <Textarea
                  placeholder="Por que esta exceção é necessária?"
                  value={newException.justification}
                  onChange={(e) => setNewException({ ...newException, justification: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={createExceptionMutation.isPending}>
                  {createExceptionMutation.isPending ? "Salvando..." : "Salvar Exceção"}
                </Button>
              </div>
            </div>
          )}

          {/* Lista de Exceções */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {filteredExceptions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>Nenhuma exceção encontrada.</p>
                <p className="text-sm">O usuário segue estritamente o perfil de acesso.</p>
              </div>
            ) : (
              filteredExceptions.map((exception) => (
                <div key={exception.id} className="border rounded-lg p-4 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={
                        exception.permission_type === 'module_permission' ? 'bg-blue-100 text-blue-700' :
                        exception.permission_type === 'sidebar_permission' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }>
                        {exception.permission_type === 'module_permission' ? 'Módulo' :
                         exception.permission_type === 'sidebar_permission' ? 'Sidebar' : 'Página'}
                      </Badge>
                      <Badge className={exception.granted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {exception.granted ? 'Concede' : 'Nega'}
                      </Badge>
                      {exception.expires_at && (
                        <Badge variant="outline">
                          Expira: {new Date(exception.expires_at).toLocaleDateString('pt-BR')}
                        </Badge>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900">{exception.permission_label || exception.permission_key}</p>
                    <p className="text-sm text-gray-500">{exception.permission_key}</p>
                    {exception.justification && (
                      <p className="text-xs text-gray-600 mt-2 bg-amber-50 p-2 rounded border border-amber-200">
                        <AlertCircle className="w-3 h-3 inline mr-1" />
                        {exception.justification}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Criado por: {exception.created_by_name || exception.created_by} em {new Date(exception.created_at || exception.created_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-600 hover:text-red-700 flex-shrink-0"
                    onClick={() => {
                      if (window.confirm('Remover esta exceção?')) {
                        removeExceptionMutation.mutate(exception.id);
                      }
                    }}
                    disabled={removeExceptionMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
        )}

        {/* Botão Voltar */}
        {!user && selectedUser && (
          <div className="border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setSelectedUser(null)}
              className="w-full"
            >
              ← Voltar para Lista de Usuários
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}