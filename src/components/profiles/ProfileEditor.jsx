import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Eye, FileText } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import SidebarPermissions from "./SidebarPermissions";
import ModulePermissions from "./ModulePermissions";
import ProfilePreview from "./ProfilePreview";
import RoleManager from "./RoleManager";
import ImpactAnalysis from "./ImpactAnalysis";
import JobRoleManager from "./JobRoleManager";
import CustomRoleSelector from "./CustomRoleSelector";
import PermissionsReport from "./PermissionsReport";

export default function ProfileEditor({ profile, onBack }) {
  const queryClient = useQueryClient();
  const [editedProfile, setEditedProfile] = useState(profile);
  const [showPreview, setShowPreview] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.UserProfile.update(profile.id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user-profiles"] });
      await queryClient.refetchQueries({ queryKey: ["user-profiles"] });
      toast.success("Perfil atualizado com sucesso");
    },
    onError: (error) => {
      console.error("Erro ao atualizar perfil:", error);
      toast.error("Erro ao atualizar perfil: " + error.message);
    },
  });

  const handleSave = async () => {
    try {
      const currentUser = await base44.auth.me();
      
      const auditEntry = {
        changed_by: currentUser.full_name || currentUser.email,
        changed_by_email: currentUser.email,
        changed_at: new Date().toISOString(),
        action: "update",
        field_changed: "permissions_and_roles",
        old_value: JSON.stringify({roles: profile.roles, permissions: profile.sidebar_permissions}),
        new_value: JSON.stringify({roles: editedProfile.roles, permissions: editedProfile.sidebar_permissions}),
        affected_users_count: profile.users_count || 0,
      };

      const updatedData = {
        ...editedProfile,
        audit_log: [...(editedProfile.audit_log || []), auditEntry],
      };

      await updateMutation.mutateAsync(updatedData);
      onBack(); // Voltar após salvar com sucesso
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      toast.error("Erro ao salvar perfil: " + (error.message || "Tente novamente"));
    }
  };

  if (showPreview) {
    return (
      <div className="flex flex-col h-full">
        <ProfilePreview
          profile={editedProfile}
          onBack={() => setShowPreview(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header fixo destacado */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{profile.name}</h1>
            <p className="text-xs text-gray-500">Edite as permissões deste perfil</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowPreview(true)}
            variant="ghost"
            size="icon"
            title="Pré-visualizar"
            className="hover:bg-red-50 hover:text-red-600"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            onClick={onBack}
            variant="ghost"
            size="icon"
            title="Voltar"
            className="hover:bg-red-50 hover:text-red-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white gap-2 ml-1"
          >
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic_info" className="flex flex-col flex-1 overflow-hidden">
        {/* Nav tabs fixo */}
        <div className="border-b bg-gray-50 shrink-0 px-6">
          <TabsList className="bg-transparent h-auto p-0 gap-0 rounded-none">
            {[
              { value: "basic_info", label: "Informações Básicas" },
              { value: "custom_roles", label: "Roles Customizadas" },
              { value: "roles", label: "Roles do Sistema" },
              { value: "job_roles", label: "Funções Vinculadas" },
              { value: "sidebar", label: "Permissões da Sidebar" },
              { value: "modules", label: "Módulos e Cadastros" },
              { value: "report", label: "Relatório" },
              { value: "impact", label: "Análise de Impacto" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:text-red-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-red-500 hover:bg-red-50 text-xs px-3 py-3 transition-colors"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Área de scroll do conteúdo */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">

        <TabsContent value="basic_info">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Nome do Perfil</Label>
                <Input
                  id="profile-name"
                  value={editedProfile.name || ""}
                  onChange={(e) =>
                    setEditedProfile({ ...editedProfile, name: e.target.value })
                  }
                  placeholder="Ex: Consultor de Sucesso"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-description">Descrição</Label>
                <Textarea
                  id="profile-description"
                  value={editedProfile.description || ""}
                  onChange={(e) =>
                    setEditedProfile({ ...editedProfile, description: e.target.value })
                  }
                  placeholder="Descreva as responsabilidades e objetivos deste perfil"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-type">Tipo do Perfil</Label>
                <Select
                  value={editedProfile.type || "interno"}
                  onValueChange={(value) =>
                    setEditedProfile({ ...editedProfile, type: value })
                  }
                >
                  <SelectTrigger id="profile-type">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interno">Interno</SelectItem>
                    <SelectItem value="externo">Externo</SelectItem>
                    <SelectItem value="sistema">Sistema</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="profile-status">Status do Perfil</Label>
                  <p className="text-sm text-gray-500">
                    Perfis inativos não podem ser atribuídos a novos usuários
                  </p>
                </div>
                <Switch
                  id="profile-status"
                  checked={editedProfile.status === "ativo"}
                  onCheckedChange={(checked) =>
                    setEditedProfile({
                      ...editedProfile,
                      status: checked ? "ativo" : "inativo",
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom_roles">
          <CustomRoleSelector
            profile={editedProfile}
            onChange={setEditedProfile}
          />
        </TabsContent>

        <TabsContent value="roles">
          <RoleManager
            profile={editedProfile}
            onChange={setEditedProfile}
          />
        </TabsContent>

        <TabsContent value="job_roles">
          <JobRoleManager
            profile={editedProfile}
            onChange={setEditedProfile}
          />
        </TabsContent>

        <TabsContent value="sidebar">
          <SidebarPermissions
            profile={editedProfile}
            onChange={setEditedProfile}
          />
        </TabsContent>

        <TabsContent value="modules">
          <ModulePermissions
            profile={editedProfile}
            onChange={setEditedProfile}
          />
        </TabsContent>

        <TabsContent value="report">
          <PermissionsReport profile={editedProfile} />
        </TabsContent>

        <TabsContent value="impact">
          <ImpactAnalysis
            profile={editedProfile}
            originalProfile={profile}
          />
        </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}