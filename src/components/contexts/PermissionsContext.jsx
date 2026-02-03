import React, { createContext, useContext, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { systemRoles } from "@/components/lib/systemRoles";

const PermissionsContext = createContext(null);

export function PermissionsProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [customRole, setCustomRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadPermissions = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (!mounted) return;
        
        setUser(currentUser);
        let aggregatedPermissions = [];

        if (currentUser) {
          if (currentUser.role === 'admin') {
            aggregatedPermissions = systemRoles.flatMap(m => m.roles.map(r => r.id));
          } else {
            const profileId = currentUser.profile_id;
            
            if (profileId) {
              try {
                const userProfile = await base44.entities.UserProfile.get(profileId);
                if (!mounted) return;
                
                if (userProfile && userProfile.id) {
                  setProfile(userProfile);
                  const profileRoles = userProfile.data?.roles || userProfile.roles || [];
                  aggregatedPermissions = [...aggregatedPermissions, ...profileRoles];
                  
                  const customRoleIds = userProfile.data?.custom_role_ids || userProfile.custom_role_ids || [];
                  if (customRoleIds && customRoleIds.length > 0) {
                    for (const roleId of customRoleIds) {
                      try {
                        const role = await base44.entities.CustomRole.get(roleId);
                        if (mounted && role) {
                          const systemRoles = role.data?.system_roles || role.system_roles || [];
                          aggregatedPermissions = [...aggregatedPermissions, ...systemRoles];
                        }
                      } catch (e) {
                        console.warn("CustomRole não encontrada:", roleId);
                      }
                    }
                  }

                  // ✅ AUDITORIA: Log de permissões
                  console.log('📋 [PermissionsContext] Permissões carregadas:', {
                    user: currentUser.email,
                    profile: userProfile.name,
                    profileRoles: profileRoles,
                    customRoleIds: customRoleIds,
                    totalPermissions: aggregatedPermissions.length
                  });
                }
              } catch (e) {
                console.error("Erro ao carregar UserProfile:", e);
              }
            }

            if (currentUser.custom_role_id) {
              try {
                const role = await base44.entities.CustomRole.get(currentUser.custom_role_id);
                if (!mounted) return;
                setCustomRole(role);
                aggregatedPermissions = [...aggregatedPermissions, ...(role.system_roles || [])];
              } catch (e) {
                console.error("Erro ao carregar CustomRole:", e);
              }
            }
          }
        }

        if (mounted) {
          setPermissions([...new Set(aggregatedPermissions)]);
          setLoading(false);
        }
      } catch (error) {
        console.error("Erro ao carregar permissões:", error);
        if (mounted) {
          setUser(null);
          setProfile(null);
          setCustomRole(null);
          setPermissions([]);
          setLoading(false);
        }
      }
    };

    loadPermissions();

    return () => {
      mounted = false;
    };
  }, []);

  const value = {
    user: user || null,
    profile: profile || null,
    customRole: customRole || null,
    permissions: permissions || [],
    loading,
    hasPermission: (permissionId) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      return permissions.includes(permissionId);
    },
    canAccessPage: (pageName) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      return true;
    },
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissionsContext() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error("usePermissionsContext deve ser usado dentro de PermissionsProvider");
  }
  return context;
}