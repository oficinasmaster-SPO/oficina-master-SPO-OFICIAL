import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { systemRoles } from "@/components/lib/systemRoles";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TemplateSelector from "./templates/TemplateSelector";

export default function CustomRoleForm({ initialData = {}, onSave, onCancel, isSaving }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);

  const { data: templates = [] } = useQuery({
    queryKey: ['roleTemplates'],
    queryFn: () => base44.entities.RoleTemplate.list(),
  });

  const { register, handleSubmit, control, watch, setValue } = useForm({
    defaultValues: {
      name: initialData.name || '',
      description: initialData.description || '',
      system_roles: initialData.system_roles || [],
      entity_permissions: initialData.entity_permissions || {},
      status: initialData.status || 'ativo',
    },
  });

  const handleTemplateSelect = async (templateId) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const template = templates.find(t => t.id === templateId);
    if (template) {
      setValue('system_roles', template.system_roles || []);
      setValue('entity_permissions', template.entity_permissions || {});
      
      // Incrementar contador de uso
      try {
        await base44.entities.RoleTemplate.update(templateId, {
          usage_count: (template.usage_count || 0) + 1
        });
      } catch (err) {
        console.error('Erro ao atualizar contador de template:', err);
      }
    }
  };

  const watchedSystemRoles = watch('system_roles');
  const watchedEntityPermissions = watch('entity_permissions');

  const availableEntities = [
    "Employee", "UserProfile", "CustomRole", "Workshop", "Diagnostic", "ActionPlan",
    "Subtask", "Notification", "Client", "ProcessAssessment"
  ];

  const onSubmit = (data) => {
    onSave(data);
  };

  const handleSystemRoleToggle = (roleId) => {
    const currentRoles = watchedSystemRoles || [];
    if (currentRoles.includes(roleId)) {
      setValue('system_roles', currentRoles.filter(id => id !== roleId));
    } else {
      setValue('system_roles', [...currentRoles, roleId]);
    }
  };

  const handleEntityPermissionToggle = (entity, operation) => {
    const currentEntityPermissions = { ...watchedEntityPermissions };
    const entityOps = currentEntityPermissions[entity] || [];

    if (entityOps.includes(operation)) {
      currentEntityPermissions[entity] = entityOps.filter(op => op !== operation);
    } else {
      currentEntityPermissions[entity] = [...entityOps, operation];
    }
    setValue('entity_permissions', currentEntityPermissions);
  };

  const handleSelectAllSystemModule = (moduleId, isChecked) => {
    const rolesForModule = systemRoles.find(m => m.id === moduleId)?.roles || [];
    const currentRoles = new Set(watchedSystemRoles || []);

    rolesForModule.forEach(role => {
      if (isChecked) {
        currentRoles.add(role.id);
      } else {
        currentRoles.delete(role.id);
      }
    });
    setValue('system_roles', Array.from(currentRoles));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {!initialData.name && (
        <TemplateSelector
          templates={templates}
          selectedTemplateId={selectedTemplateId}
          onTemplateSelect={handleTemplateSelect}
        />
      )}

      <div>
        <Label htmlFor="name">Nome da Role</Label>
        <Input id="name" {...register('name', { required: true })} />
      </div>
      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" {...register('description')} />
      </div>

      <div className="flex items-center space-x-2">
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <Switch
              id="status-switch"
              checked={field.value === 'ativo'}
              onCheckedChange={(checked) => field.onChange(checked ? 'ativo' : 'inativo')}
            />
          )}
        />
        <Label htmlFor="status-switch">Role Ativa</Label>
      </div>

      <Tabs defaultValue="system-permissions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="system-permissions">Permissões de Sistema</TabsTrigger>
          <TabsTrigger value="entity-permissions">Permissões de Entidade</TabsTrigger>
        </TabsList>
        <TabsContent value="system-permissions" className="mt-4">
          <ScrollArea className="h-[400px] border rounded-md p-4">
            <h3 className="text-lg font-semibold mb-3">Módulos e Ações de Sistema</h3>
            {systemRoles.map(module => (
              <div key={module.id} className="mb-4 border-b pb-2">
                <div className="flex items-center space-x-2 mb-2">
                  <Checkbox
                    id={`select-all-${module.id}`}
                    checked={(module.roles || []).every(role => watchedSystemRoles?.includes(role.id))}
                    onCheckedChange={(checked) => handleSelectAllSystemModule(module.id, checked)}
                  />
                  <Label htmlFor={`select-all-${module.id}`} className="font-bold text-base">
                    {module.name}
                  </Label>
                </div>
                <div className="ml-6 grid grid-cols-2 gap-2">
                  {module.roles.map(role => (
                    <div key={role.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={role.id}
                        checked={watchedSystemRoles?.includes(role.id)}
                        onCheckedChange={() => handleSystemRoleToggle(role.id)}
                      />
                      <Label htmlFor={role.id} className="text-sm">{role.name}</Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </ScrollArea>
        </TabsContent>
        <TabsContent value="entity-permissions" className="mt-4">
          <ScrollArea className="h-[400px] border rounded-md p-4">
            <h3 className="text-lg font-semibold mb-3">Permissões CRUD por Entidade</h3>
            {availableEntities.map(entity => (
              <div key={entity} className="mb-4 border-b pb-2">
                <h4 className="font-bold text-base mb-2">{entity}</h4>
                <div className="ml-6 grid grid-cols-4 gap-2">
                  {['create', 'read', 'update', 'delete'].map(operation => (
                    <div key={`${entity}-${operation}`} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${entity}-${operation}`}
                        checked={(watchedEntityPermissions[entity] || []).includes(operation)}
                        onCheckedChange={() => handleEntityPermissionToggle(entity, operation)}
                      />
                      <Label htmlFor={`${entity}-${operation}`} className="text-sm">
                        {operation.charAt(0).toUpperCase() + operation.slice(1)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Salvando..." : "Salvar Role"}
        </Button>
      </div>
    </form>
  );
}