import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, CheckCircle } from "lucide-react";

export default function UserFormDialog({ 
  open, 
  onClose, 
  isCreateMode, 
  selectedUser, 
  profiles,
  admins,
  onSubmit,
  isLoading
}) {
  const [selectedProfileId, setSelectedProfileId] = useState(selectedUser?.profile_id || "");
  const [formData, setFormData] = useState({
    role: selectedUser?.role || "user"
  });
  
  // Atualiza selectedProfileId e formData quando selectedUser mudar (modo edição)
  React.useEffect(() => {
    if (selectedUser?.profile_id) {
      setSelectedProfileId(selectedUser.profile_id);
    } else if (isCreateMode) {
      setSelectedProfileId("");
    }
  }, [selectedUser, isCreateMode]);
  
  const selectedProfile = profiles?.find(p => p.id === selectedProfileId);
  
  // Auto-seleciona o nível de acesso baseado no perfil
  React.useEffect(() => {
    if (selectedProfile && isCreateMode) {
      // Detecta se é perfil de administrador baseado no nome ou permissões
      const profileName = selectedProfile.name?.toLowerCase() || '';
      const isAdminProfile = 
        profileName.includes('admin') || 
        profileName.includes('diretor') ||
        profileName.includes('gestor') ||
        selectedProfile.roles?.some(role => 
          role.includes('admin_') || 
          role.includes('sistema_') ||
          role.includes('gerenciar_')
        );
      
      const newRole = isAdminProfile ? 'admin' : 'user';
      setFormData(prev => ({ ...prev, role: newRole }));
      
      console.log("🔐 Perfil selecionado:", selectedProfile.name);
      console.log("🔐 Nível de acesso auto-definido:", newRole === 'admin' ? 'Administrador' : 'Usuário Padrão');
    }
  }, [selectedProfile, isCreateMode]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const formDataObj = new FormData(e.target);
    
    // Validar campos obrigatórios
    if (!selectedProfileId) {
      alert("Por favor, selecione um perfil");
      return;
    }
    
    const data = {
      full_name: formDataObj.get('full_name'),
      email: formDataObj.get('email'),
      telefone: formDataObj.get('telefone'),
      position: formDataObj.get('position'),
      profile_id: selectedProfileId,
      user_status: formDataObj.get('user_status') || 'ativo',
      role: isCreateMode ? formData.role : undefined
    };

    console.log("📤 Enviando dados do usuário interno:", {
      ...data,
      profile_name: profiles?.find(p => p.id === selectedProfileId)?.name
    });
    
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isCreateMode ? '✨ Criar Novo Usuário Interno' : `✏️ Editar: ${selectedUser?.full_name}`}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-6">
          {/* Dados Básicos */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Dados Básicos</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome Completo *</Label>
                <Input 
                  name="full_name" 
                  defaultValue={selectedUser?.full_name || ""} 
                  placeholder="Ex: João Silva"
                  required 
                />
              </div>

              <div>
                <Label>Email (Login) *</Label>
                <Input 
                  name="email" 
                  type="email"
                  defaultValue={selectedUser?.email || ""} 
                  placeholder="joao@oficinasmaster.com.br"
                  disabled={!isCreateMode}
                  required 
                />
                {!isCreateMode && (
                  <p className="text-xs text-gray-500 mt-1">Email não pode ser alterado</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Telefone *</Label>
                <Input 
                  name="telefone" 
                  defaultValue={selectedUser?.telefone || ""} 
                  placeholder="(00) 00000-0000"
                  required 
                />
              </div>

              <div>
                <Label>Cargo *</Label>
                <Input 
                  name="position" 
                  defaultValue={selectedUser?.position || ""} 
                  placeholder="Ex: Consultor Sênior"
                  required 
                />
              </div>
            </div>
          </div>

          {/* Perfil e Permissões */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Perfil de Acesso</h3>
            
            <div>
              <Label>Perfil *</Label>
              <Select 
                value={selectedProfileId}
                onValueChange={setSelectedProfileId}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o perfil de acesso">
                    {selectedProfile ? selectedProfile.name : "Selecione o perfil de acesso"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {!profiles || profiles.length === 0 ? (
                    <div className="p-2 text-xs text-gray-500 text-center">
                      Nenhum perfil interno disponível
                    </div>
                  ) : (
                    profiles.map(profile => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.name}
                        {profile.is_system && " (Sistema)"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                O usuário herdará todas as permissões do perfil selecionado
              </p>
            </div>

            {/* Resumo de Permissões */}
            {selectedProfile && (
              <Alert className="bg-blue-50 border-blue-200">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <AlertDescription>
                  <p className="font-semibold text-blue-900 mb-2">Permissões do Perfil: {selectedProfile.name}</p>
                  <div className="space-y-1 text-xs text-blue-800">
                    {selectedProfile.description && (
                      <p>• {selectedProfile.description}</p>
                    )}
                    {selectedProfile.roles && selectedProfile.roles.length > 0 && (
                      <p>• {selectedProfile.roles.length} roles ativas</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(selectedProfile.module_permissions || {}).map(([module, level]) => 
                        level !== 'bloqueado' && (
                          <Badge key={module} className="text-xs bg-blue-100 text-blue-700">
                            {module}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {!isCreateMode && selectedUser?.profile_id !== selectedProfileId && (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-xs text-amber-800">
                  ⚠️ Alterar o perfil modificará todas as permissões deste usuário imediatamente
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Administração */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Administração</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {isCreateMode && (
                <div>
                  <Label>Nível de Acesso no Sistema *</Label>
                  <Select 
                    value={formData.role}
                    onValueChange={(value) => setFormData({...formData, role: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário Padrão</SelectItem>
                      <SelectItem value="admin">Administrador do Sistema</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Admin = acesso total; Usuário = permissões do perfil
                  </p>
                </div>
              )}

              {!isCreateMode && (
                <div>
                  <Label>Status do Usuário *</Label>
                  <Select 
                    name="user_status" 
                    defaultValue={selectedUser?.user_status || "ativo"}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">✅ Ativo</SelectItem>
                      <SelectItem value="inativo">⏸️ Inativo</SelectItem>
                      <SelectItem value="bloqueado">🔒 Bloqueado</SelectItem>
                      <SelectItem value="ferias">🏖️ Férias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                isCreateMode ? '✨ Criar Usuário' : '💾 Salvar Alterações'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}