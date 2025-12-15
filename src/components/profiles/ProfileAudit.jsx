import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function ProfileAudit({ onBack, profiles }) {
  const [selectedProfile, setSelectedProfile] = useState(null);

  const analyzeProfile = (profile) => {
    const issues = [];
    const warnings = [];

    const sidebarPerms = profile.sidebar_permissions || {};
    const modulePerms = profile.module_permissions || {};

    if (Object.keys(sidebarPerms).length === 0) {
      issues.push("Nenhuma permissão de sidebar configurada");
    }

    const emptyModules = Object.entries(modulePerms).filter(
      ([_, value]) => value === "bloqueado"
    );
    if (emptyModules.length === Object.keys(modulePerms).length) {
      issues.push("Todos os módulos estão bloqueados");
    }

    const editWithoutView = Object.entries(sidebarPerms).filter(
      ([_, perms]) => perms.edit && !perms.view
    );
    if (editWithoutView.length > 0) {
      warnings.push(
        `${editWithoutView.length} item(ns) com permissão de edição sem visualização`
      );
    }

    return { issues, warnings };
  };

  const profilesWithAnalysis = profiles.map((profile) => ({
    ...profile,
    analysis: analyzeProfile(profile),
  }));

  const profilesWithIssues = profilesWithAnalysis.filter(
    (p) => p.analysis.issues.length > 0
  );
  const profilesWithWarnings = profilesWithAnalysis.filter(
    (p) => p.analysis.warnings.length > 0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Auditoria de Perfis
          </h1>
          <p className="text-gray-600 mt-1">
            Identifique problemas e inconsistências nas permissões
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-2" />
              <p className="text-3xl font-bold text-gray-900">
                {profiles.length -
                  profilesWithIssues.length -
                  profilesWithWarnings.length}
              </p>
              <p className="text-sm text-gray-600">Perfis OK</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 mx-auto text-yellow-600 mb-2" />
              <p className="text-3xl font-bold text-gray-900">
                {profilesWithWarnings.length}
              </p>
              <p className="text-sm text-gray-600">Com Avisos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="w-12 h-12 mx-auto text-red-600 mb-2" />
              <p className="text-3xl font-bold text-gray-900">
                {profilesWithIssues.length}
              </p>
              <p className="text-sm text-gray-600">Com Problemas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Análise Detalhada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profilesWithAnalysis.map((profile) => {
              const hasIssues = profile.analysis.issues.length > 0;
              const hasWarnings = profile.analysis.warnings.length > 0;

              if (!hasIssues && !hasWarnings) return null;

              return (
                <div
                  key={profile.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                      {profile.name}
                    </h3>
                    {hasIssues && (
                      <Badge variant="destructive">Problemas Críticos</Badge>
                    )}
                    {!hasIssues && hasWarnings && (
                      <Badge className="bg-yellow-500">Avisos</Badge>
                    )}
                  </div>

                  {profile.analysis.issues.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-red-700">
                        Problemas:
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        {profile.analysis.issues.map((issue, idx) => (
                          <li key={idx} className="text-sm text-red-600">
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {profile.analysis.warnings.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-yellow-700">
                        Avisos:
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        {profile.analysis.warnings.map((warning, idx) => (
                          <li key={idx} className="text-sm text-yellow-600">
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {profile.audit_log && profile.audit_log.length > 0 && (
                    <div className="pt-3 border-t">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Última alteração:
                      </p>
                      <p className="text-xs text-gray-600">
                        {format(
                          new Date(
                            profile.audit_log[profile.audit_log.length - 1]
                              .changed_at
                          ),
                          "dd/MM/yyyy HH:mm"
                        )}{" "}
                        por{" "}
                        {
                          profile.audit_log[profile.audit_log.length - 1]
                            .changed_by
                        }
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
            {profilesWithIssues.length === 0 &&
              profilesWithWarnings.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  ✅ Todos os perfis estão configurados corretamente
                </p>
              )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}