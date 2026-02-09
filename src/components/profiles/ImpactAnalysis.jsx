import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Users, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function ImpactAnalysis({ profile, originalProfile }) {
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const affectedUsers = users.filter((u) => u.profile_id === profile.id);
  
  // Análise de mudanças
  const originalRoles = originalProfile.roles || [];
  const newRoles = profile.roles || [];
  const addedRoles = newRoles.filter((r) => !originalRoles.includes(r));
  const removedRoles = originalRoles.filter((r) => !newRoles.includes(r));
  
  const hasChanges = addedRoles.length > 0 || removedRoles.length > 0;
  
  return (
    <div className="space-y-6">
      <Alert className={hasChanges ? "border-yellow-500 bg-yellow-50" : "border-green-500 bg-green-50"}>
        <AlertTriangle className={hasChanges ? "h-4 w-4 text-yellow-600" : "h-4 w-4 text-green-600"} />
        <AlertDescription className="text-sm">
          {hasChanges ? (
            <>
              <strong>Atenção:</strong> As alterações realizadas afetarão <strong>{affectedUsers.length} usuário(s)</strong> imediatamente após salvar.
            </>
          ) : (
            <>
              <strong>Nenhuma alteração detectada.</strong> O perfil está igual ao estado original.
            </>
          )}
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="w-10 h-10 mx-auto text-blue-600 mb-2" />
              <p className="text-3xl font-bold text-gray-900">
                {affectedUsers.length}
              </p>
              <p className="text-sm text-gray-600">Usuários Afetados</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="w-10 h-10 mx-auto text-green-600 mb-2" />
              <p className="text-3xl font-bold text-gray-900">
                {addedRoles.length}
              </p>
              <p className="text-sm text-gray-600">Roles Adicionadas</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="w-10 h-10 mx-auto text-red-600 mb-2" />
              <p className="text-3xl font-bold text-gray-900">
                {removedRoles.length}
              </p>
              <p className="text-sm text-gray-600">Roles Removidas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {affectedUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Usuários Impactados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {affectedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{user.full_name || user.email}</p>
                    <p className="text-xs text-gray-600">{user.email}</p>
                  </div>
                  <Badge variant="outline">
                    {user.role === "admin" ? "Admin" : "Usuário"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {addedRoles.length > 0 && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-green-700">Roles Adicionadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {addedRoles.map((role) => (
                <Badge key={role} className="bg-green-100 text-green-700">
                  + {role}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {removedRoles.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">Roles Removidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {removedRoles.map((role) => (
                <Badge key={role} className="bg-red-100 text-red-700">
                  - {role}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {profile.audit_log && profile.audit_log.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Histórico de Alterações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {[...profile.audit_log].reverse().map((log, idx) => (
                <div key={idx} className="border-l-2 border-blue-500 pl-4 py-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{log.action || "Atualização"}</p>
                      <p className="text-xs text-gray-600">
                        Por: {log.changed_by || "Sistema"}
                      </p>
                      {log.affected_users_count > 0 && (
                        <p className="text-xs text-gray-500">
                          Afetou {log.affected_users_count} usuário(s)
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {format(new Date(log.changed_at), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}