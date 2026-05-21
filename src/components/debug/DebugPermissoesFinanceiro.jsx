import React, { useEffect, useState } from "react";
import { usePermissionsContext } from "@/components/contexts/PermissionsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function DebugPermissoesFinanceiro() {
  const { user, profile, permissions, hasPermission, canAccessPage, hasGranularPermission, loading } = usePermissionsContext();
  const [userDetails, setUserDetails] = useState(null);
  const [workshopDetails, setWorkshopDetails] = useState(null);

  useEffect(() => {
    const loadDetails = async () => {
      try {
        // Carregar dados completos do usuário
        const users = await base44.entities.User.list();
        const currentUser = users.find(u => u.id === user?.id);
        setUserDetails(currentUser);

        // Carregar dados da oficina
        if (user?.data?.workshop_id) {
          const workshops = await base44.entities.Workshop.list();
          const workshop = workshops.find(w => w.id === user.data.workshop_id);
          setWorkshopDetails(workshop);
        }
      } catch (error) {
        console.error("Erro ao carregar detalhes:", error);
      }
    };

    if (user && !loading) {
      loadDetails();
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">Carregando permissões...</p>
      </div>
    );
  }

  const requiredPermission = "financeiro.view";
  const hasPagePermission = hasPermission(requiredPermission);
  const canAccessDRE = canAccessPage("DRETCMP2");
  const hasGranularFinanceiro = hasGranularPermission("financeiro", "read");

  // Verificar module_permissions
  const modulePerm = profile?.module_permissions?.financeiro;
  const jobRoles = profile?.job_roles || [];
  const sidebarPerm = profile?.sidebar_permissions?.financeiro;

  return (
    <div className="space-y-4">
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            Debug de Permissões - Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Dados do Usuário */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">👤 Usuário:</p>
            <div className="text-xs space-y-1 ml-4">
              <p><strong>Nome:</strong> {user?.full_name || userDetails?.full_name}</p>
              <p><strong>Email:</strong> {user?.email}</p>
              <p><strong>Role:</strong> {user?.role}</p>
              <p><strong>Workshop ID:</strong> {user?.data?.workshop_id || "N/A"}</p>
              {userDetails?.tipo_vinculo && <p><strong>Tipo Vínculo:</strong> {userDetails.tipo_vinculo}</p>}
              {userDetails?.is_internal !== undefined && <p><strong>É Interno:</strong> {userDetails.is_internal ? "Sim" : "Não"}</p>}
            </div>
          </div>

          {/* Dados da Oficina */}
          {workshopDetails && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">🏢 Oficina:</p>
              <div className="text-xs space-y-1 ml-4">
                <p><strong>Nome:</strong> {workshopDetails.name}</p>
                <p><strong>Plano:</strong> {workshopDetails.planoAtual}</p>
                <p><strong>Status:</strong> {workshopDetails.status}</p>
              </div>
            </div>
          )}

          {/* Permissões */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">🔐 Permissões do Sistema:</p>
            <div className="text-xs space-y-1 ml-4">
              <div className="flex items-center gap-2">
                <p><strong>financeiro.view:</strong></p>
                {hasPagePermission ? (
                  <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Possui</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" /> NÃO Possui</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p><strong>Acesso Página DRETCMP2:</strong></p>
                {canAccessDRE ? (
                  <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Permitido</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" /> BLOQUEADO</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p><strong>Permissão Granular (financeiro.read):</strong></p>
                {hasGranularFinanceiro ? (
                  <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Possui</Badge>
                ) : (
                  <Badge className="bg-yellow-100 text-yellow-700"><AlertCircle className="w-3 h-3 mr-1" /> Não configurado</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Module Permissions */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">📋 Module Permissions:</p>
            <div className="text-xs ml-4">
              <div className="flex items-center gap-2">
                <p><strong>financeiro:</strong></p>
                <Badge className={
                  modulePerm === "total" ? "bg-green-100 text-green-700" :
                  modulePerm === "visualizacao" ? "bg-blue-100 text-blue-700" :
                  "bg-red-100 text-red-700"
                }>
                  {modulePerm || "não definido"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Job Roles */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">💼 Job Roles:</p>
            <div className="flex flex-wrap gap-1 ml-4">
              {jobRoles.length > 0 ? (
                jobRoles.map(role => (
                  <Badge key={role} variant="outline">{role}</Badge>
                ))
              ) : (
                <Badge className="bg-gray-100 text-gray-500">Nenhuma job role definida</Badge>
              )}
            </div>
          </div>

          {/* Sidebar Permissions */}
          {sidebarPerm && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">🎯 Sidebar Permissions (financeiro):</p>
              <div className="text-xs ml-4 space-y-1">
                {Object.entries(sidebarPerm).map(([key, value]) => (
                  value && (
                    <div key={key} className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-600" />
                      <span>{key}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Lista de Permissões */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">📜 Permissões Ativas ({permissions.length}):</p>
            <div className="flex flex-wrap gap-1 ml-4 max-h-32 overflow-y-auto">
              {permissions.map(perm => (
                <Badge key={perm} variant="outline" className="text-xs">{perm}</Badge>
              ))}
            </div>
          </div>

          {/* Diagnóstico */}
          <div className="p-3 bg-white rounded-lg border border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-2">🔍 Diagnóstico:</p>
            <div className="text-xs space-y-1">
              {!hasPagePermission && (
                <p className="text-red-600">❌ <strong>PROBLEMA:</strong> Usuário NÃO tem a permissão `financeiro.view`</p>
              )}
              {!canAccessDRE && (
                <p className="text-red-600">❌ <strong>PROBLEMA:</strong> PageAccessControl está bloqueando acesso à página DRETCMP2</p>
              )}
              {modulePerm === "bloqueado" && (
                <p className="text-red-600">❌ <strong>PROBLEMA:</strong> Module permission 'financeiro' está como 'bloqueado'</p>
              )}
              {jobRoles.length === 0 && (
                <p className="text-yellow-600">⚠️ <strong>ATENÇÃO:</strong> Usuário não tem job roles definidas - pode afetar permissões granulares</p>
              )}
              {hasPagePermission && canAccessDRE && (
                <p className="text-green-600">✅ <strong>SITUÇÃO NORMAL:</strong> Usuário deveria ter acesso à página DRETCMP2</p>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-2 pt-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => window.location.href = "/DRETCMP2"}
            >
              Testar Acesso DRETCMP2
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Recarregar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}