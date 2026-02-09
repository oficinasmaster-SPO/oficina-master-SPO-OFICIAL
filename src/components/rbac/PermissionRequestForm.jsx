import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function PermissionRequestForm({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    employee_id: '',
    change_type: 'profile_change',
    requested_profile_id: '',
    justification: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-for-request'],
    queryFn: async () => {
      const result = await base44.entities.Employee.list();
      return Array.isArray(result) ? result : [];
    }
  });
  
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-for-request'],
    queryFn: async () => {
      const result = await base44.entities.UserProfile.list();
      return Array.isArray(result) ? result : [];
    }
  });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.employee_id || !formData.justification) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const employee = employees.find(e => e.id === formData.employee_id);
      const user = await base44.auth.me();
      
      await base44.entities.PermissionChangeRequest.create({
        employee_id: formData.employee_id,
        employee_name: employee?.full_name || '',
        requested_by: user.email,
        requested_by_name: user.full_name,
        change_type: formData.change_type,
        current_profile_id: employee?.profile_id || null,
        requested_profile_id: formData.requested_profile_id || null,
        justification: formData.justification,
        status: 'pendente'
      });
      
      toast.success('Solicitação enviada para aprovação');
      onSuccess();
    } catch (error) {
      toast.error('Erro ao criar solicitação: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova Solicitação de Mudança de Permissões</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label>Colaborador *</Label>
            <Select 
              value={formData.employee_id} 
              onValueChange={(value) => setFormData({...formData, employee_id: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o colaborador" />
              </SelectTrigger>
              <SelectContent>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name} - {emp.position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Tipo de Mudança *</Label>
            <Select 
              value={formData.change_type} 
              onValueChange={(value) => setFormData({...formData, change_type: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profile_change">Mudança de Perfil</SelectItem>
                <SelectItem value="custom_roles_add">Adicionar Roles Customizadas</SelectItem>
                <SelectItem value="status_change">Mudança de Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {formData.change_type === 'profile_change' && (
            <div>
              <Label>Novo Perfil *</Label>
              <Select 
                value={formData.requested_profile_id} 
                onValueChange={(value) => setFormData({...formData, requested_profile_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div>
            <Label>Justificativa *</Label>
            <Textarea
              value={formData.justification}
              onChange={(e) => setFormData({...formData, justification: e.target.value})}
              placeholder="Explique o motivo da mudança..."
              className="h-24"
            />
          </div>
          
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Solicitação'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}