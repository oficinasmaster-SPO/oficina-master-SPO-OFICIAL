import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Shield, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function PermissionExceptionEditor({ open, onOpenChange, user }) {
  const queryClient = useQueryClient();
  const [permissionType, setPermissionType] = useState("module_permission");
  const [permissionKey, setPermissionKey] = useState("");
  const [permissionLabel, setPermissionLabel] = useState("");
  const [granted, setGranted] = useState(true);
  const [justification, setJustification] = useState("");

  // Busca exceções existentes
  const { data: exceptions = [] } = useQuery({
    queryKey: ['user-permission-exceptions', user?.user_id],
    queryFn: async () => {
      if (!user?.user_id) return [];
      const response = await base44.functions.invoke('getUserPermissionExceptions', { user_id: user.user_id });
      return response.data.exceptions || [];
    },
    enabled: !!user?.user_id && open
  });

  const upsertMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.functions.invoke('upsertUserPermissionException', {
        ...data,
        user_id: user.user_id,
        employee_id: user.employee_id,
        workshop_id: user.workshop_id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permission-exceptions'] });
      toast.success('Permissão individual salva com sucesso');
      setPermissionKey("");
      setPermissionLabel("");
      setJustification("");
    },
    onError: (error) => {
      toast.error('Erro ao salvar: ' + error.message);
    }
  });

  const removeMutation = useMutation({
    mutationFn: async (exception_id) => {
      return await base44.functions.invoke('removeUserPermissionException', { exception_id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permission-exceptions'] });
      toast.success('Exceção removida');
    },
    onError: (error) => {
      toast.error('Erro ao remover: ' + error.message);
    }
  });

  const handleSave = () => {
    if (!permissionKey || !justification) {
      toast.error('Preencha a permissão e justificativa');
      return;
    }

    upsertMutation.mutate({
      permission_type: permissionType,
      permission_key: permissionKey,
      permission_label: permissionLabel,
      granted: granted,
      justification: justification
    });
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Gerenciar Permissões Individuais
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Usuário */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="font-semibold text-blue-900">{user.full_name}</p>
            <p className="text-sm text-blue-700">{user.email}</p>
            <p className="text-xs text-blue-600 mt-1">
              Oficina: {user.workshop_name || 'N/A'}
            </p>
          </div>

          {/* Exceções Existentes */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Exceções Ativas</h3>
            {exceptions.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Nenhuma exceção cadastrada.</p>
            ) : (
              <div className="space-y-2">
                {exceptions.map((exc) => (
                  <div key={exc.id} className="border rounded-lg p-3 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={
                          exc.permission_type === 'module_permission' ? 'bg-blue-100 text-blue-700' :
                          exc.permission_type === 'sidebar_permission' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }>
                          {exc.permission_type === 'module_permission' ? 'Módulo' :
                           exc.permission_type === 'sidebar_permission' ? 'Sidebar' : 'Página'}
                        </Badge>
                        <Badge className={exc.granted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {exc.granted ? <><CheckCircle className="w-3 h-3 mr-1" /> Concede</> : <><XCircle className="w-3 h-3 mr-1" /> Nega</>}
                        </Badge>
                      </div>
                      <p className="font-medium text-gray-900">{exc.permission_label || exc.permission_key}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        <strong>Justificativa:</strong> {exc.justification}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => removeMutation.mutate(exc.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Adicionar Nova Exceção */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Adicionar Nova Exceção
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="permission-type">Tipo de Permissão</Label>
                <Select value={permissionType} onValueChange={setPermissionType}>
                  <SelectTrigger id="permission-type">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="module_permission">Módulo</SelectItem>
                    <SelectItem value="sidebar_permission">Sidebar</SelectItem>
                    <SelectItem value="page_access">Página</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="permission-action">Ação</Label>
                <Select value={granted} onValueChange={(v) => setGranted(v === "true")}>
                  <SelectTrigger id="permission-action">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Conceder Permissão</SelectItem>
                    <SelectItem value="false">Negar Permissão</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label htmlFor="permission-key">Chave da Permissão</Label>
                <Input
                  id="permission-key"
                  placeholder="Ex: dashboard.view, processos.edit, /financeiro"
                  value={permissionKey}
                  onChange={(e) => setPermissionKey(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formato: modulo.acao (ex: dashboard.view, processos.edit)
                </p>
              </div>

              <div className="col-span-2">
                <Label htmlFor="permission-label">Nome Legível</Label>
                <Input
                  id="permission-label"
                  placeholder="Ex: Dashboard Financeiro, Editar Processos"
                  value={permissionLabel}
                  onChange={(e) => setPermissionLabel(e.target.value)}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="justification">Justificativa (Obrigatório)</Label>
                <Textarea
                  id="justification"
                  placeholder="Por que esta exceção é necessária?"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={upsertMutation.isPending || !permissionKey || !justification}
              className="w-full mt-4"
            >
              {upsertMutation.isPending ? 'Salvando...' : 'Salvar Exceção'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}