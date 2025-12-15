import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { jobRoles, jobRoleCategories } from "@/components/lib/jobRoles";

export default function ProfileCreator({ onBack, onCreated, profiles }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    type: "externo",
    description: "",
    base_profile_id: "",
    job_roles: [],
    permission_type: "job_role",
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Verificar duplicidade de nome
      const existingProfile = profiles.find(
        (p) => p.name.toLowerCase() === data.name.toLowerCase()
      );
      
      if (existingProfile) {
        throw new Error("Já existe um perfil com este nome");
      }

      let newProfile = {
        name: data.name,
        type: data.type,
        description: data.description,
        job_roles: data.job_roles || [],
        status: "ativo",
        users_count: 0,
        is_system: false,
        roles: [],
        sidebar_permissions: {},
        module_permissions: {
          dashboard: "bloqueado",
          cadastros: "bloqueado",
          patio: "bloqueado",
          resultados: "bloqueado",
          pessoas: "bloqueado",
          diagnosticos: "bloqueado",
          processos: "bloqueado",
          documentos: "bloqueado",
          cultura: "bloqueado",
          treinamentos: "bloqueado",
          gestao: "bloqueado",
          aceleracao: "bloqueado",
          admin: "bloqueado",
        },
        audit_log: [],
      };

      if (data.base_profile_id) {
        const baseProfile = profiles.find((p) => p.id === data.base_profile_id);
        if (baseProfile) {
          newProfile.roles = baseProfile.roles || [];
          newProfile.sidebar_permissions = baseProfile.sidebar_permissions || {};
          newProfile.module_permissions = baseProfile.module_permissions;
          newProfile.cloned_from = baseProfile.id;
        }
      }

      return base44.entities.UserProfile.create(newProfile);
    },
    onSuccess: (newProfile) => {
      queryClient.invalidateQueries(["user-profiles"]);
      toast.success("Perfil criado com sucesso");
      onCreated(newProfile);
    },
    onError: (error) => {
      toast.error("Erro ao criar perfil: " + error.message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Nome do perfil é obrigatório");
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Criar Novo Perfil
          </h1>
          <p className="text-gray-600 mt-1">
            Configure um novo perfil de usuário
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Perfil *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ex: Gerente de Oficina"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo do Perfil *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interno">Interno</SelectItem>
                    <SelectItem value="externo">Externo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descrição do perfil e suas responsabilidades"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="base_profile">
                Perfil Base (opcional)
              </Label>
              <Select
                value={formData.base_profile_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, base_profile_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Copiar permissões de..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Nenhum</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name} ({profile.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Selecione um perfil para copiar suas permissões
              </p>
            </div>

            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
              <Label>Tipo de Vinculação</Label>
              <RadioGroup
                value={formData.permission_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, permission_type: value })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="job_role" id="type-job" />
                  <Label htmlFor="type-job" className="cursor-pointer">
                    <span className="font-medium">Job Role</span> - Vinculado a funções específicas (recomendado)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="role" id="type-role" />
                  <Label htmlFor="type-role" className="cursor-pointer">
                    <span className="font-medium">Role</span> - Permissão manual por role do sistema
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {formData.permission_type === "job_role" && (
              <div className="space-y-2">
                <Label>Funções Vinculadas (job_role)</Label>
                <p className="text-xs text-gray-600 mb-3">
                  Selecione as funções que terão este perfil automaticamente
                </p>
              <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                {Object.entries(jobRoleCategories).map(([cat, catData]) => {
                  const categoryRoles = jobRoles.filter(jr => jr.category === cat);
                  return (
                    <div key={cat} className="mb-4">
                      <h4 className="font-semibold text-sm text-gray-700 mb-2">
                        {catData.label}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {categoryRoles.map((role) => (
                          <div key={role.value} className="flex items-center gap-2">
                            <Checkbox
                              id={`job-${role.value}`}
                              checked={formData.job_roles.includes(role.value)}
                              onCheckedChange={(checked) => {
                                const updated = checked
                                  ? [...formData.job_roles, role.value]
                                  : formData.job_roles.filter(r => r !== role.value);
                                setFormData({ ...formData, job_roles: updated });
                              }}
                            />
                            <Label htmlFor={`job-${role.value}`} className="text-sm cursor-pointer">
                              {role.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              {formData.job_roles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.job_roles.map((jr) => {
                    const role = jobRoles.find(r => r.value === jr);
                    return (
                      <Badge key={jr} variant="outline">
                        {role?.label}
                      </Badge>
                    );
                  })}
                </div>
              )}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button type="button" onClick={onBack} variant="outline">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {createMutation.isPending ? "Criando..." : "Criar Perfil"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}