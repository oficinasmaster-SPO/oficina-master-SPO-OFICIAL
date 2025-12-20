import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { jobRoles } from "@/components/lib/jobRoles";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function UserProfileForm({ initialData = {}, onSave, onCancel, isSaving }) {
  const { register, handleSubmit, control, watch, setValue } = useForm({
    defaultValues: {
      name: initialData.name || '',
      description: initialData.description || '',
      type: initialData.type || 'interno',
      permission_type: initialData.permission_type || 'job_role',
      custom_role_ids: initialData.custom_role_ids || [],
      job_roles: initialData.job_roles || [],
      status: initialData.status || 'ativo',
    },
  });

  const watchedPermissionType = watch('permission_type');
  const watchedJobRoles = watch('job_roles');
  const watchedCustomRoleIds = watch('custom_role_ids');
  const watchedStatus = watch('status');

  const { data: customRoles = [], isLoading: isLoadingCustomRoles } = useQuery({
    queryKey: ['customRoles'],
    queryFn: () => base44.entities.CustomRole.list(),
  });

  const onSubmit = (data) => {
    const payload = { ...data };
    if (payload.permission_type !== 'job_role') {
      payload.job_roles = [];
    }
    if (payload.permission_type !== 'custom_role') {
      payload.custom_role_ids = [];
    }
    onSave(payload);
  };

  const handleJobRoleToggle = (jobRoleValue) => {
    const currentJobRoles = new Set(watchedJobRoles || []);
    if (currentJobRoles.has(jobRoleValue)) {
      currentJobRoles.delete(jobRoleValue);
    } else {
      currentJobRoles.add(jobRoleValue);
    }
    setValue('job_roles', Array.from(currentJobRoles));
  };

  const handleCustomRoleToggle = (roleId) => {
    const currentCustomRoles = new Set(watchedCustomRoleIds || []);
    if (currentCustomRoles.has(roleId)) {
      currentCustomRoles.delete(roleId);
    } else {
      currentCustomRoles.add(roleId);
    }
    setValue('custom_role_ids', Array.from(currentCustomRoles));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome do Perfil</Label>
        <Input id="name" {...register('name', { required: true })} />
      </div>
      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" {...register('description')} />
      </div>

      <div>
        <Label htmlFor="type">Tipo</Label>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interno">Interno</SelectItem>
                <SelectItem value="externo">Externo</SelectItem>
                <SelectItem value="sistema">Sistema</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="status-switch"
          checked={watchedStatus === 'ativo'}
          onCheckedChange={(checked) => setValue('status', checked ? 'ativo' : 'inativo')}
        />
        <Label htmlFor="status-switch">Perfil Ativo</Label>
      </div>

      <div>
        <Label htmlFor="permission_type">Tipo de Permissão</Label>
        <Controller
          name="permission_type"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de permissão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="job_role">Baseado em Cargo</SelectItem>
                <SelectItem value="custom_role">Roles Customizadas</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {watchedPermissionType === 'job_role' && (
        <ScrollArea className="h-[200px] border rounded-md p-4">
          <h3 className="text-lg font-semibold mb-3">Cargos Associados</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {jobRoles.map(jr => (
              <div key={jr.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`job-role-${jr.value}`}
                  checked={watchedJobRoles?.includes(jr.value)}
                  onCheckedChange={() => handleJobRoleToggle(jr.value)}
                />
                <Label htmlFor={`job-role-${jr.value}`} className="text-sm">{jr.label}</Label>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {watchedPermissionType === 'custom_role' && (
        <ScrollArea className="h-[200px] border rounded-md p-4">
          <h3 className="text-lg font-semibold mb-3">Roles Customizadas Associadas</h3>
          {isLoadingCustomRoles ? (
            <p>Carregando roles...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {customRoles.filter(r => r.status === 'ativo').map(role => (
                <div key={role.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`custom-role-${role.id}`}
                    checked={watchedCustomRoleIds?.includes(role.id)}
                    onCheckedChange={() => handleCustomRoleToggle(role.id)}
                  />
                  <Label htmlFor={`custom-role-${role.id}`} className="text-sm">{role.name}</Label>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      )}

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Salvando..." : "Salvar Perfil"}
        </Button>
      </div>
    </form>
  );
}