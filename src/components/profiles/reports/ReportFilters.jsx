import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function ReportFilters({ profiles, customRoles, selectedProfile, selectedRole, onProfileChange, onRoleChange, onClear }) {
  const hasFilters = selectedProfile || selectedRole;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Label>Filtrar por Perfil</Label>
            <Select value={selectedProfile || "all"} onValueChange={(v) => onProfileChange(v === "all" ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os perfis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os perfis</SelectItem>
                {profiles.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <Label>Filtrar por Role Customizada</Label>
            <Select value={selectedRole || "all"} onValueChange={(v) => onRoleChange(v === "all" ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as roles</SelectItem>
                {customRoles.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasFilters && (
            <Button variant="outline" onClick={onClear}>
              <X className="w-4 h-4 mr-2" />
              Limpar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}