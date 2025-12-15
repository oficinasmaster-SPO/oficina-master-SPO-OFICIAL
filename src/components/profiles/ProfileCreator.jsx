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

export default function ProfileCreator({ onBack, onCreated, profiles }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    type: "externo",
    description: "",
    base_profile_id: "",
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