import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PermissionRequestForm({ 
  open,
  onClose,
  employee,
  changeType,
  newProfileName,
  currentProfileName,
  newStatus,
  currentStatus,
  onSubmit,
  isLoading
}) {
  const [justification, setJustification] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!justification.trim()) return;
    onSubmit(justification);
  };

  const getChangeTypeLabel = () => {
    switch(changeType) {
      case 'profile_change': return 'Mudança de Perfil de Acesso';
      case 'custom_roles': return 'Alteração de Roles Customizadas';
      case 'custom_roles_add': return 'Alteração de Roles Customizadas';
      case 'status_change': return 'Mudança de Status do Usuário';
      default: return 'Alteração de Permissões';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            Aprovação Necessária
          </DialogTitle>
          <DialogDescription>
            Esta alteração de acessos é sensível e precisa ser justificada para aprovação.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="bg-gray-50 p-4 rounded-lg space-y-4 border border-gray-100">
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Colaborador</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{employee?.full_name}</p>
              <p className="text-xs text-gray-600">{employee?.email}</p>
            </div>
            
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Tipo de Alteração</p>
              <p className="text-sm text-gray-900 mt-1">{getChangeTypeLabel()}</p>
            </div>

            {changeType === 'profile_change' && (
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Mudança Solicitada</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-gray-500 line-through bg-white">
                    {currentProfileName || 'Nenhum'}
                  </Badge>
                  <span className="text-gray-400">➔</span>
                  <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-indigo-200">
                    {newProfileName || 'Nenhum'}
                  </Badge>
                </div>
              </div>
            )}

            {changeType === 'status_change' && (
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Mudança Solicitada</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-gray-500 line-through bg-white">
                    {currentStatus}
                  </Badge>
                  <span className="text-gray-400">➔</span>
                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">
                    {newStatus}
                  </Badge>
                </div>
              </div>
            )}
          </div>
          
          <div>
            <Label htmlFor="justification">Justificativa da Mudança *</Label>
            <Textarea
              id="justification"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explique o motivo desta alteração de acesso para avaliação dos administradores..."
              className="h-24 mt-2"
              required
            />
          </div>
          
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !justification.trim()} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Solicitar Aprovação'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}