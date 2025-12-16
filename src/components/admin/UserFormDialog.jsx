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
    admin_responsavel_id: selectedUser?.admin_responsavel_id || ""
  });
  
  // Debug: Log profiles recebidos
  React.useEffect(() => {
    console.log("🔍 Perfis disponíveis no formulário:", profiles);
    console.log("👤 Usuário selecionado:", selectedUser);
    console.log("📝 Modo criação:", isCreateMode);
  }, [profiles, selectedUser, isCreateMode]);
  
  // Atualiza selectedProfileId e formData quando selectedUser mudar (modo edição)
  React.useEffect(() => {
    if (selectedUser?.profile_id) {
      setSelectedProfileId(selectedUser.profile_id);
      console.log("✅ Profile ID definido:", selectedUser.profile_id);
    } else if (isCreateMode) {
      setSelectedProfileId("");
      console.log("🆕 Modo criação - perfil limpo");
    }
    
    if (selectedUser?.admin_responsavel_id) {
      setFormData({admin_responsavel_id: selectedUser.admin_responsavel_id});
      console.log("✅ Admin Responsável definido:", selectedUser.admin_responsavel_id);
    } else if (isCreateMode) {
      setFormData({admin_responsavel_id: ""});
      console.log("🆕 Modo criação - admin limpo");
    }
  }, [selectedUser, isCreateMode]);
  
  const selectedProfile = profiles?.find(p => p.id === selectedProfileId);
  
  React.useEffect(() => {
    if (selectedProfile) {
      console.log("✨ Perfil selecionado encontrado:", selectedProfile.name);
    }
  }, [selectedProfile]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const formDataObj = new FormData(e.target);
    
    const data = {
      full_name: formDataObj.get('full_name'),
      email: formDataObj.get('email'),
      telefone: formDataObj.get('telefone'),
      position: formDataObj.get('position'),
      profile_id: selectedProfileId,
      admin_responsavel_id: formData.admin_responsavel_id, // Usa o state
      user_status: formDataObj.get('user_status') || 'ativo'
    };

    console.log("📤 Dados do formulário:", data);
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
              <div>
                <Label>Administrador Responsável *</Label>
                <Select 
                  name="admin_responsavel_id" 
                  value={formData.admin_responsavel_id || selectedUser?.admin_responsavel_id || ""}
                  onValueChange={(value) => setFormData({...formData, admin_responsavel_id: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o admin responsável">
                      {(() => {
                        const selectedAdmin = admins?.find(a => a.id === (formData.admin_responsavel_id || selectedUser?.admin_responsavel_id));
                        return selectedAdmin ? (selectedAdmin.full_name || selectedAdmin.email) : "Selecione o admin responsável";
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {!admins || admins.length === 0 ? (
                      <div className="p-2 text-xs text-gray-500 text-center">
                        Nenhum admin disponível
                      </div>
                    ) : (
                      admins.map(admin => (
                        <SelectItem key={admin.id} value={admin.id}>
                          {admin.full_name || admin.email}
                          {admin.position && <span className="text-xs text-gray-500"> • {admin.position}</span>}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Administrador que supervisionará este usuário
                </p>
              </div>

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