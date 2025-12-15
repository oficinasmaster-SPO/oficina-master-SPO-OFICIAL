import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const modules = [
  { id: "dashboard", name: "Dashboard & Rankings" },
  { id: "cadastros", name: "Cadastros" },
  { id: "patio", name: "Pátio Operação (QGP)" },
  { id: "resultados", name: "Resultados" },
  { id: "pessoas", name: "Pessoas & RH" },
  { id: "diagnosticos", name: "Diagnósticos & IA" },
  { id: "processos", name: "Processos" },
  { id: "documentos", name: "Documentos" },
  { id: "cultura", name: "Cultura" },
  { id: "treinamentos", name: "Treinamentos" },
  { id: "gestao", name: "Gestão da Operação" },
  { id: "aceleracao", name: "Aceleração" },
  { id: "admin", name: "Administração" },
];

export default function ModulePermissions({ profile, onChange }) {
  const modulePerms = profile.module_permissions || {};

  const updateModulePermission = (moduleId, value) => {
    onChange({
      ...profile,
      module_permissions: {
        ...modulePerms,
        [moduleId]: value,
      },
    });
  };

  const getPermissionColor = (value) => {
    switch (value) {
      case "total":
        return "bg-green-50 border-green-200";
      case "visualizacao":
        return "bg-yellow-50 border-yellow-200";
      case "bloqueado":
        return "bg-red-50 border-red-200";
      default:
        return "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissões por Módulo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {modules.map((module) => {
            const permission = modulePerms[module.id] || "bloqueado";
            return (
              <div
                key={module.id}
                className={`flex items-center justify-between p-4 border rounded-lg ${getPermissionColor(
                  permission
                )}`}
              >
                <div>
                  <Label className="text-base font-semibold">
                    {module.name}
                  </Label>
                </div>
                <Select
                  value={permission}
                  onValueChange={(value) =>
                    updateModulePermission(module.id, value)
                  }
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total">
                      ✅ Acesso Total
                    </SelectItem>
                    <SelectItem value="visualizacao">
                      👁️ Apenas Visualização
                    </SelectItem>
                    <SelectItem value="bloqueado">
                      🚫 Bloqueado
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}