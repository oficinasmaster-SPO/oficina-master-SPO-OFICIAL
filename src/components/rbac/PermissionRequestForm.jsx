import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export default function PermissionRequestForm({ 
  open, 
  onClose, 
  employee, 
  changeType, 
  newProfileId, 
  newProfileName,
  newCustomRoleIds,
  newStatus,
  currentProfileId,
  currentProfileName,
  currentCustomRoleIds,
  currentStatus,
  onSubmit,
  isLoading 
}) {
  const [justification, setJustification] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!justification.trim()) {
      alert('Por favor, forneça uma justificativa para a mudança.');
      return;
    }
    onSubmit(justification);
  };

  const getChangeDescription = () => {
    switch(changeType) {
      case 'profile_change':
        return `Alterar perfil de "${currentProfileName}" para "${newProfileName}"`;
      case 'custom_roles_add':
        return `Adicionar roles customizadas ao usuário`;
      case 'custom_roles_remove':
        return `Remover roles customizadas do usuário`;
      case 'status_change':
        return `Alterar status de "${currentStatus}" para "${newStatus}"`;
      default:
        return 'Mudança de permissões';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar Aprovação de Mudança</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-800">
              Esta mudança requer aprovação de um supervisor antes de ser aplicada.
            </AlertDescription>
          </Alert>

          <div>
            <Label className="font-semibold">Colaborador</Label>
            <p className="text-sm text-gray-700">{employee?.full_name || employee?.name}</p>
          </div>

          <div>
            <Label className="font-semibold">Mudança Solicitada</Label>
            <p className="text-sm text-gray-700">{getChangeDescription()}</p>
          </div>

          <div>
            <Label htmlFor="justification">Justificativa *</Label>
            <Textarea
              id="justification"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explique o motivo da mudança de permissões..."
              className="h-24"
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Enviando...' : 'Enviar para Aprovação'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}