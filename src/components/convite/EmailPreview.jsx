import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";

export default function EmailPreview({ isOpen, onClose, email, name, workshopName, inviteLink, isPreview = true }) {
  const displayLink = inviteLink && !inviteLink.includes("...") ? inviteLink : "[LINK_DO_CONVITE_SERÁ_GERADO]";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              {isPreview ? "Preview do Email de Convite" : "Email Enviado com Sucesso!"}
            </DialogTitle>
            {isPreview && (
              <p className="text-xs text-gray-500 mt-2">Este é um preview de como o email será apresentado</p>
            )}
          </div>
        </DialogHeader>

        <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
          <div className="bg-blue-600 text-white p-6 text-center">
            <h2 className="text-xl font-bold">Bem-vindo à {workshopName}!</h2>
          </div>

          <div className="bg-gray-50 p-6 space-y-4">
            <p>Olá <strong>{name}</strong>,</p>
            <p>Você foi convidado(a) para fazer parte da equipe <strong>{workshopName}</strong>.</p>

            <div className="bg-white border-l-4 border-blue-600 p-4 space-y-2">
              <p><strong>📧 Email:</strong> {email}</p>
              <p><strong>🔑 Senha temporária:</strong> Oficina@2025</p>
              <p><strong>⏰ Validade:</strong> 7 dias</p>
            </div>

            <p>Para completar seu cadastro e acessar a plataforma, clique no botão abaixo:</p>

            <div className="text-center">
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2"
                onClick={() => {
                  if (displayLink && !displayLink.includes("[")) {
                    window.open(displayLink, "_blank");
                  }
                }}
              >
                Acessar Plataforma
              </Button>
            </div>

            <div className="text-sm text-gray-600 bg-white border border-gray-200 p-4 rounded">
              <p className="mb-2">Ou copie e cole este link no seu navegador:</p>
              <p className="text-blue-600 break-all font-mono text-xs bg-gray-50 p-3 rounded border">
                {displayLink}
              </p>
            </div>

            <p className="text-sm"><strong>Importante:</strong> Por segurança, você deverá alterar sua senha no primeiro acesso.</p>
          </div>

          <div className="bg-gray-100 text-center py-4 text-xs text-gray-600">
            <p>Este é um email automático. Em caso de dúvidas, entre em contato com o administrador.</p>
            <p>&copy; {new Date().getFullYear()} {workshopName}. Todos os direitos reservados.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}