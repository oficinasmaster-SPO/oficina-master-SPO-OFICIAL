import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Shield, AlertCircle, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { systemRoles } from "@/components/lib/systemRoles";
import { toast } from "sonner";

export default function RevokePermissionsDialog({ open, onClose, userId, userEmail, userName }) {
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [revokeReason, setRevokeReason] = useState("");
  const queryClient = useQueryClient();

  // Buscar perfil do usuário
  const { data: userProfile, isLoading: loadingProfile } = useQuery({
    queryKey: ['user-profile-revoke', userId],
    queryFn: async () => {
      try {
        const result = await base44.functions.invoke('getUserProfile', { user_id: userId });
        if (result?.data?.success && result.data.profile_id) {
          const profile = await base44.entities.UserProfile.get(result.data.profile_id);
          return profile;
        }
      } catch (error) {
        console.error("Erro ao buscar perfil:", error);
      }
      return null;
    },
    enabled: open && !!userId
  });

  // Buscar custom roles
  const { data: customRoles = [] } = useQuery({
    queryKey: ['custom-roles-revoke', userProfile?.custom_role_ids],
    queryFn: async () => {
      if (!userProfile?.custom_role_ids || userProfile.custom_role_ids.length === 0) {
        return [];
      }
      
      const roles = await Promise.all(
        userProfile.custom_role_ids.map(async (roleId) => {
          try {
            return await base44.entities.CustomRole.get(roleId);
          } catch {
            return null;
          }
        })
      );
      
      return roles.filter(r => r !== null);
    },
    enabled: !!userProfile?.custom_role_ids
  });

  // Agregar todas as permissões
  const allPermissions = React.useMemo(() => {
    const perms = new Set();
    
    // Permissões do perfil
    if (userProfile?.roles) {
      userProfile.roles.forEach(p => perms.add(p));
    }
    
    // Permissões das custom roles
    customRoles.forEach(role => {
      if (role?.system_roles) {
        role.system_roles.forEach(p => perms.add(p));
      }
    });
    
    return Array.from(perms);
  }, [userProfile, customRoles]);

  // Organizar permissões por categoria
  const permissionsByCategory = React.useMemo(() => {
    const categorized = {};
    
    systemRoles.forEach(category => {
      const categoryPerms = category.roles.filter(role => 
        allPermissions.includes(role.id)
      );
      
      if (categoryPerms.length > 0) {
        categorized[category.label] = categoryPerms;
      }
    });
    
    return categorized;
  }, [allPermissions]);

  // Mutation para revogar permissões
  const revokeMutation = useMutation({
    mutationFn: async () => {
      if (selectedPermissions.length === 0) {
        throw new Error("Selecione ao menos uma permissão para revogar");
      }
      
      if (!revokeReason.trim()) {
        throw new Error("Informe o motivo da revogação");
      }
      
      // Atualizar perfil removendo permissões
      const updatedRoles = userProfile.roles.filter(p => !selectedPermissions.includes(p));
      
      await base44.entities.UserProfile.update(userProfile.id, {
        roles: updatedRoles,
        audit_log: [
          ...(userProfile.audit_log || []),
          {
            changed_by: (await base44.auth.me()).id,
            changed_by_email: (await base44.auth.me()).email,
            changed_at: new Date().toISOString(),
            action: 'revoke_permissions',
            field_changed: 'roles',
            old_value: JSON.stringify(userProfile.roles),
            new_value: JSON.stringify(updatedRoles),
            reason: revokeReason,
            affected_users_count: 1
          }
        ]
      });
      
      // Criar notificação para o usuário
      await base44.entities.Notification.create({
        user_id: userId,
        type: 'config_preferencias',
        title: 'Permissões Atualizadas',
        message: `Algumas de suas permissões foram revogadas. Motivo: ${revokeReason}`,
        metadata: {
          revoked_permissions: selectedPermissions,
          revoked_by: (await base44.auth.me()).email
        }
      });
      
      // Log RBAC
      await base44.functions.invoke('logRBACAction', {
        action: 'revoke_permissions',
        target_user_id: userId,
        target_user_email: userEmail,
        details: {
          permissions_revoked: selectedPermissions,
          reason: revokeReason
        }
      });
    },
    onSuccess: () => {
      toast.success("Permissões revogadas com sucesso");
      queryClient.invalidateQueries({ queryKey: ['user-profile-revoke'] });
      queryClient.invalidateQueries({ queryKey: ['access-logs'] });
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao revogar permissões");
    }
  });

  const handleTogglePermission = (permissionId) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPermissions.length === allPermissions.length) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions([...allPermissions]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-600" />
            Revogar Permissões
          </DialogTitle>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Usuário:</strong> {userName} ({userEmail})
          </AlertDescription>
        </Alert>

        {loadingProfile ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : allPermissions.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Este usuário não possui permissões para revogar.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {/* Select All */}
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Checkbox
                checked={selectedPermissions.length === allPermissions.length}
                onCheckedChange={handleSelectAll}
              />
              <label className="text-sm font-medium">
                Selecionar Todas ({allPermissions.length})
              </label>
              {selectedPermissions.length > 0 && (
                <Badge className="ml-auto bg-red-600 text-white">
                  {selectedPermissions.length} selecionadas
                </Badge>
              )}
            </div>

            {/* Permissions by Category */}
            <div className="space-y-4">
              {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                <div key={category} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">{category}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {permissions.map((permission) => (
                      <div key={permission.id} className="flex items-start gap-2">
                        <Checkbox
                          checked={selectedPermissions.includes(permission.id)}
                          onCheckedChange={() => handleTogglePermission(permission.id)}
                        />
                        <div className="flex-1">
                          <label className="text-sm font-medium text-gray-700 cursor-pointer">
                            {permission.label}
                          </label>
                          {permission.description && (
                            <p className="text-xs text-gray-500">{permission.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Motivo da Revogação <span className="text-red-600">*</span>
              </label>
              <Textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Descreva o motivo da revogação das permissões..."
                rows={3}
              />
            </div>

            {selectedPermissions.length > 0 && (
              <Alert variant="destructive">
                <Trash2 className="h-4 w-4" />
                <AlertDescription>
                  <strong>Atenção:</strong> Você está prestes a revogar {selectedPermissions.length} permissão(ões). 
                  Esta ação será registrada e o usuário será notificado.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => revokeMutation.mutate()}
            disabled={selectedPermissions.length === 0 || !revokeReason.trim() || revokeMutation.isPending}
          >
            {revokeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Revogando...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Revogar Permissões
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}