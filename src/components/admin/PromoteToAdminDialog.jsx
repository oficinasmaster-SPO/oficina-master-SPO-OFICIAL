import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle, Loader2 } from "lucide-react";

export default function PromoteToAdminDialog({ open, onOpenChange, user, onConfirm, onCancel, isLoading }) {
  const [confirmText, setConfirmText] = useState("");

  const handleConfirm = () => {
    if (confirmText === "ADMIN") {
      onConfirm();
      setConfirmText("");
      onOpenChange?.(false);
    }
  };

  const handleClose = () => {
    setConfirmText("");
    onCancel?.();
    onOpenChange?.(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <Shield className="w-6 h-6" />
            Promover para Administrador
          </DialogTitle>
          <DialogDescription className="sr-only">
            Confirmar promoção de usuário para nível admin
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <AlertDescription className="text-sm text-amber-800 space-y-2">
              <p className="font-semibold">
                ⚠️ Atenção: Esta ação concederá acesso total ao sistema
              </p>
              <ul className="list-disc ml-4 space-y-1 text-xs">
                <li>Acesso completo a todos os módulos e configurações</li>
                <li>Visualização e edição de dados de <strong>todos os clientes externos</strong></li>
                <li>Permissão para gerenciar outros usuários</li>
                <li>Acesso a relatórios financeiros e sensíveis</li>
                <li>Capacidade de alterar configurações do sistema</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-900 mb-1">
              Usuário: <span className="font-semibold">{user.full_name}</span>
            </p>
            <p className="text-sm text-gray-600">
              Email: <span className="font-mono">{user.email}</span>
            </p>
            <p className="text-sm text-gray-600">
              Cargo atual: <span className="font-semibold">{user.position}</span>
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Para confirmar, digite <strong className="text-amber-600">ADMIN</strong> no campo abaixo:
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Digite ADMIN aqui"
              className="font-mono"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={confirmText !== "ADMIN" || isLoading}
            className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Promovendo...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Confirmar Promoção
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}