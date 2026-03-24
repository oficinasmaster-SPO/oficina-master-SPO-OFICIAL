import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { jobRoles, jobRoleCategories } from "@/components/lib/jobRoles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";

export default function DescricaoCargos() {
  const { workshopId } = useWorkshopContext();
  const queryClient = useQueryClient();
  const [editingRole, setEditingRole] = useState(null);
  const [editForm, setEditForm] = useState({ custom_label: "", custom_description: "" });

  const { data: customRoles = [], isLoading } = useQuery({
    queryKey: ['custom-job-roles', workshopId],
    queryFn: async () => {
      if (!workshopId) return [];
      return await base44.entities.CustomJobRole.filter({ workshop_id: workshopId });
    },
    enabled: !!workshopId
  });

  const saveCustomRoleMutation = useMutation({
    mutationFn: async (data) => {
      if (data.id) {
        return await base44.entities.CustomJobRole.update(data.id, data);
      } else {
        return await base44.entities.CustomJobRole.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['custom-job-roles']);
      setEditingRole(null);
      toast.success("Descrição de cargo atualizada com sucesso!");
    }
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  const handleEdit = (role, customRole) => {
    setEditingRole(role.isCustom ? role.customId : role.value);
    setEditForm({
      custom_label: customRole?.custom_label || role.label,
      custom_description: customRole?.custom_description || role.description
    });
  };

  const handleSave = (baseRoleValue, customRoleId, category, level) => {
    saveCustomRoleMutation.mutate({
      id: customRoleId,
      workshop_id: workshopId,
      base_role_value: baseRoleValue,
      custom_label: editForm.custom_label,
      custom_description: editForm.custom_description,
      category,
      level
    });
  };

  const handleDuplicate = (role) => {
    const newLabel = `${role.label} (Cópia)`;
    saveCustomRoleMutation.mutate({
      workshop_id: workshopId,
      base_role_value: role.value,
      custom_label: newLabel,
      custom_description: role.description,
      category: role.category,
      level: role.level
    });
  };

  const allRoles = [...jobRoles];
  customRoles.forEach(cr => {
    if (!cr.id) return;
    const baseIndex = allRoles.findIndex(r => r.value === cr.base_role_value && !r.isCustom);
    if (baseIndex !== -1) {
      allRoles.splice(baseIndex + 1, 0, {
        ...allRoles[baseIndex],
        label: cr.custom_label,
        description: cr.custom_description,
        isCustom: true,
        customId: cr.id
      });
    }
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Descrições de Cargos</h1>
          <p className="text-gray-600">Gerencie e personalize as descrições de cargos da sua oficina.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allRoles.map((role, idx) => {
          const isEditing = editingRole === (role.isCustom ? role.customId : role.value);
          const categoryStyle = jobRoleCategories[role.category]?.color || "bg-gray-100 text-gray-700";

          return (
            <Card key={role.customId || role.value + idx} className="flex flex-col">
              <CardHeader className="pb-3 border-b">
                <div className="flex justify-between items-start mb-2">
                  <Badge className={categoryStyle} variant="outline">
                    {jobRoleCategories[role.category]?.label || role.category}
                  </Badge>
                  {role.isCustom && <Badge variant="secondary">Personalizado</Badge>}
                </div>
                {isEditing ? (
                  <Input 
                    value={editForm.custom_label} 
                    onChange={e => setEditForm({...editForm, custom_label: e.target.value})} 
                    className="font-bold text-lg"
                  />
                ) : (
                  <CardTitle className="text-lg">{role.label}</CardTitle>
                )}
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col">
                {isEditing ? (
                  <Textarea 
                    value={editForm.custom_description}
                    onChange={e => setEditForm({...editForm, custom_description: e.target.value})}
                    className="flex-1 min-h-[100px] mb-4 text-sm"
                  />
                ) : (
                  <p className="text-sm text-gray-600 flex-1 mb-4">{role.description}</p>
                )}
                
                <div className="flex justify-end gap-2 mt-auto">
                  {isEditing ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setEditingRole(null)}>
                        <X className="w-4 h-4 mr-1" /> Cancelar
                      </Button>
                      <Button size="sm" onClick={() => handleSave(role.base_role_value || role.value, role.customId, role.category, role.level)}>
                        <Check className="w-4 h-4 mr-1" /> Salvar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleDuplicate(role)}>
                        <Copy className="w-4 h-4 mr-1" /> Duplicar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(role, role.isCustom ? role : null)}>
                        <Edit2 className="w-4 h-4 mr-1" /> Editar
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}