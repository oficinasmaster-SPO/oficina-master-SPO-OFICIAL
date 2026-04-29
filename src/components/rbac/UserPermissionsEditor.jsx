import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Save, AlertTriangle, Pencil, X, Check } from "lucide-react";
import { toast } from "sonner";
import { systemRoles } from "@/components/lib/systemRoles";

export default function UserPermissionsEditor({ user, employees, profiles, customRoles }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  // Estado editável
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [selectedCustomRoleIds, setSelectedCustomRoleIds] = useState([]);

  const employee = employees.find(e => e.user_id === user.id);

  // Inicializar com valores atuais do usuário
  useEffect(() => {
    const profileIdToUse = employee?.profile_id || user.profile_id || "";
    setSelectedProfileId(profileIdToUse);

    const crIds = [];
    if (user.custom_role_id) crIds.push(user.custom_role_id);
    const profile = profiles.find(p => p.id === profileIdToUse);
    (profile?.custom_role_ids || []).forEach(id => { if (!crIds.includes(id)) crIds.push(id); });
    setSelectedCustomRoleIds(crIds);
  }, [user.id, employee, profiles]);

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);

  const { mutate: save, isPending } = useMutation({
    mutationFn: async () => {
      const updates = { profile_id: selectedProfileId || null };
      if (selectedCustomRoleIds.length > 0) updates.custom_role_id = selectedCustomRoleIds[0];

      // Atualizar Employee se existir
      if (employee) {
        await base44.entities.Employee.update(employee.id, { profile_id: selectedProfileId || null });
      }

      // Atualizar User
      await base44.auth.updateMe ? 
        await base44.entities.User.update(user.id, updates) :
        await base44.entities.User.update(user.id, updates);
    },
    onSuccess: () => {
      toast.success("Permissões atualizadas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      queryClient.invalidateQueries({ queryKey: ["all-employees"] });
      setEditing(false);
    },
    onError: (e) => toast.error("Erro ao salvar: " + e.message),
  });

  const toggleCustomRole = (roleId) => {
    setSelectedCustomRoleIds(prev =>
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    );
  };

  if (user.role === 'admin') {
    return (
      <Alert className="bg-red-50 border-red-200">
        <AlertTriangle className="w-4 h-4 text-red-600" />
        <AlertDescription className="text-red-900">
          <strong>Administrador do Sistema:</strong> Acesso total e irrestrito. Não é possível editar permissões de um administrador.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com toggle editar */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-600" />
          Permissões e Perfil
        </h3>
        {!editing ? (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-2">
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="gap-1">
              <X className="w-3.5 h-3.5" />
              Cancelar
            </Button>
            <Button size="sm" onClick={() => save()} disabled={isPending} className="gap-1 bg-purple-600 hover:bg-purple-700">
              <Save className="w-3.5 h-3.5" />
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        )}
      </div>

      {/* Perfil Principal */}
      <div className="border rounded-lg p-4 bg-purple-50">
        <p className="text-sm font-medium text-gray-700 mb-2">Perfil de Acesso</p>
        {editing ? (
          <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Selecionar perfil..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem perfil</SelectItem>
              {profiles.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} {p.type ? `(${p.type})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="outline" className="bg-white text-sm">
            {selectedProfile?.name || "Sem perfil definido"}
          </Badge>
        )}

        {/* Permissões do perfil selecionado (somente leitura) */}
        {selectedProfile && (
          <div className="mt-3 space-y-2">
            {selectedProfile.type && (
              <p className="text-xs text-gray-500">Tipo: <span className="font-medium">{selectedProfile.type}</span></p>
            )}
            {selectedProfile.roles?.length > 0 && (
              <p className="text-xs text-gray-500">
                {selectedProfile.roles.length} permissão(ões) de sistema vinculadas
              </p>
            )}
            {selectedProfile.modules_allowed?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedProfile.modules_allowed.slice(0, 6).map(m => (
                  <Badge key={m} variant="outline" className="text-xs bg-white">{m}</Badge>
                ))}
                {selectedProfile.modules_allowed.length > 6 && (
                  <Badge variant="outline" className="text-xs bg-white">+{selectedProfile.modules_allowed.length - 6} mais</Badge>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Roles Customizadas */}
      {customRoles.length > 0 && (
        <div className="border rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Roles Customizadas</p>
          <div className="flex flex-wrap gap-2">
            {customRoles.map(cr => {
              const active = selectedCustomRoleIds.includes(cr.id);
              return (
                <button
                  key={cr.id}
                  disabled={!editing}
                  onClick={() => editing && toggleCustomRole(cr.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                    ${active ? 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-gray-50 border-gray-200 text-gray-600'}
                    ${editing ? 'cursor-pointer hover:border-amber-400' : 'cursor-default'}`}
                >
                  {active && <Check className="w-3 h-3" />}
                  {cr.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* System Roles derivadas do perfil (readonly) */}
      {selectedProfile?.roles?.length > 0 && (
        <div className="border rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Permissões de Sistema (via perfil)</p>
          <div className="space-y-3">
            {systemRoles.map(module => {
              const activeRoles = module.roles.filter(r => selectedProfile.roles.includes(r.id));
              if (!activeRoles.length) return null;
              const Icon = module.icon;
              return (
                <div key={module.id} className="pl-3 border-l-2 border-purple-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-3.5 h-3.5 text-purple-500" />
                    <span className="text-xs font-semibold text-gray-700">{module.name}</span>
                    <Badge variant="outline" className="text-xs">{activeRoles.length}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {activeRoles.map(r => (
                      <Badge key={r.id} variant="outline" className="text-xs bg-green-50 border-green-200">{r.name}</Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}