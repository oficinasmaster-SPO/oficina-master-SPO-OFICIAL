import React, { useState, useEffect } from "react";
import { usePermissions } from "@/components/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Check, X, Eye, EyeOff } from "lucide-react";

/**
 * Componente de Debug para RBAC
 * Mostra permissões do usuário atual e permite testar acessos
 */
export default function RBACDebugger() {
  const { user, profile, permissions, hasPermission, canAccessPage, loading } = usePermissions();
  const [visible, setVisible] = useState(false);
  const [testPermission, setTestPermission] = useState("");
  const [testResult, setTestResult] = useState(null);

  // Só mostrar em desenvolvimento ou para usuários específicos
  useEffect(() => {
    const isDev = window.location.hostname === 'localhost' || window.location.hostname.includes('dev');
    const isDebugUser = user?.email?.includes('admin') || user?.email?.includes('debug');
    setVisible(isDev || isDebugUser);
  }, [user]);

  if (!visible || loading) return null;

  const handleTest = () => {
    if (testPermission) {
      const result = hasPermission(testPermission);
      setTestResult({ permission: testPermission, hasAccess: result });
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="shadow-2xl border-2 border-purple-500">
        <CardHeader className="bg-purple-50 border-b border-purple-200">
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Shield className="w-5 h-5" />
            RBAC Debugger
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {/* User Info */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Usuário</p>
            <p className="text-sm font-medium">{user?.email}</p>
            <Badge variant={user?.role === 'admin' ? 'destructive' : 'default'}>
              {user?.role}
            </Badge>
          </div>

          {/* Profile Info */}
          {profile && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Perfil</p>
              <p className="text-sm font-medium">{profile.name}</p>
              <Badge>{profile.type}</Badge>
            </div>
          )}

          {/* Permissions List */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">
              Permissões ({permissions.length})
            </p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {permissions.length === 0 ? (
                <p className="text-xs text-gray-400">Nenhuma permissão carregada</p>
              ) : (
                permissions.map((perm, idx) => (
                  <div key={idx} className="text-xs bg-green-50 px-2 py-1 rounded">
                    <Check className="w-3 h-3 inline mr-1 text-green-600" />
                    {perm}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Test Permission */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Testar Permissão</p>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 text-xs border rounded px-2 py-1"
                placeholder="Ex: dashboard.view"
                value={testPermission}
                onChange={(e) => setTestPermission(e.target.value)}
              />
              <Button size="sm" onClick={handleTest}>
                Testar
              </Button>
            </div>
            {testResult && (
              <div className={`mt-2 text-xs p-2 rounded ${testResult.hasAccess ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {testResult.hasAccess ? (
                  <><Check className="w-3 h-3 inline mr-1" /> Acesso permitido</>
                ) : (
                  <><X className="w-3 h-3 inline mr-1" /> Acesso negado</>
                )}
              </div>
            )}
          </div>

          {/* Toggle Visibility */}
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => setVisible(false)}
          >
            <EyeOff className="w-4 h-4 mr-2" />
            Ocultar Debugger
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}