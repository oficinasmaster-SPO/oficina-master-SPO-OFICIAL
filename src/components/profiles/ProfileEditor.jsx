import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { toast } from "sonner";
import SidebarPermissions from "./SidebarPermissions";
import ModulePermissions from "./ModulePermissions";
import ProfilePreview from "./ProfilePreview";

export default function ProfileEditor({ profile, onBack }) {
  const queryClient = useQueryClient();
  const [editedProfile, setEditedProfile] = useState(profile);
  const [showPreview, setShowPreview] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.UserProfile.update(profile.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["user-profiles"]);
      toast.success("Perfil atualizado com sucesso");
    },
  });

  const handleSave = () => {
    if (
      !confirm("Deseja salvar as alterações? Isso afetará todos os usuários vinculados a este perfil.")
    ) {
      return;
    }

    const auditEntry = {
      changed_by: "current_user",
      changed_at: new Date().toISOString(),
      field_changed: "permissions",
      old_value: JSON.stringify(profile),
      new_value: JSON.stringify(editedProfile),
    };

    const updatedData = {
      ...editedProfile,
      audit_log: [...(editedProfile.audit_log || []), auditEntry],
    };

    updateMutation.mutate(updatedData);
  };

  if (showPreview) {
    return (
      <ProfilePreview
        profile={editedProfile}
        onBack={() => setShowPreview(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {profile.name}
            </h1>
            <p className="text-gray-600 mt-1">
              Edite as permissões deste perfil
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowPreview(true)}
            variant="outline"
            className="gap-2"
          >
            <Eye className="w-4 h-4" />
            Pré-visualizar
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="sidebar" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sidebar">Permissões da Sidebar</TabsTrigger>
          <TabsTrigger value="modules">Módulos e Cadastros</TabsTrigger>
        </TabsList>

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
      </Tabs>
    </div>
  );
}