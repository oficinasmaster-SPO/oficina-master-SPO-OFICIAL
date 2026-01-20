import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";

export default function EmailPreview({ isOpen, onClose, email, name, workshopName, inviteLink }) {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .info-box { background: white; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Bem-vindo à ${workshopName}!</h1>
        </div>
        <div class="content">
          <p>Olá <strong>${name}</strong>,</p>
          <p>Você foi convidado(a) para fazer parte da equipe <strong>${workshopName}</strong>.</p>

          <div class="info-box">
            <p><strong>📧 Email:</strong> ${email}</p>
            <p><strong>🔑 Senha temporária:</strong> Oficina@2025</p>
            <p><strong>⏰ Validade:</strong> 7 dias</p>
          </div>

          <p>Para completar seu cadastro e acessar a plataforma, clique no botão abaixo:</p>

          <div style="text-align: center;">
            <a href="${inviteLink}" class="button">Acessar Plataforma</a>
          </div>

          <p style="font-size: 14px; color: #6b7280;">
            Ou copie e cole este link no seu navegador:<br>
            <a href="${inviteLink}">${inviteLink}</a>
          </p>

          <p><strong>Importante:</strong> Por segurança, você deverá alterar sua senha no primeiro acesso.</p>
        </div>
        <div class="footer">
          <p>Este é um email automático. Em caso de dúvidas, entre em contato com o administrador.</p>
          <p>&copy; ${new Date().getFullYear()} ${workshopName}. Todos os direitos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Preview do Email de Convite
          </DialogTitle>
        </DialogHeader>

        <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
          <div className="bg-blue-600 text-white p-6 text-center">
            <h2 className="text-xl font-bold">Bem-vindo à {workshopName}!</h2>
          </div>

          <div className="bg-gray-50 p-6 space-y-4">
            <p>Olá <strong>{name}</strong>,</p>
            <p>Você foi convidado(a) para fazer parte da equipe <strong>{workshopName}</strong>.</p>

            <div className="bg-white border-l-4 border-blue-600 p-4">
              <p><strong>📧 Email:</strong> {email}</p>
              <p><strong>🔑 Senha temporária:</strong> Oficina@2025</p>
              <p><strong>⏰ Validade:</strong> 7 dias</p>
            </div>

            <p>Para completar seu cadastro e acessar a plataforma, clique no botão abaixo:</p>

            <div className="text-center">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2">
                Acessar Plataforma
              </Button>
            </div>

            <div className="text-sm text-gray-600">
              <p>Ou copie e cole este link no seu navegador:</p>
              <p className="text-blue-600 break-all mt-1">{inviteLink}</p>
            </div>

            <p className="font-semibold">Importante:</strong> Por segurança, você deverá alterar sua senha no primeiro acesso.</p>
          </div>

          <div className="bg-gray-100 text-center py-4 text-sm text-gray-600">
            <p>Este é um email automático. Em caso de dúvidas, entre em contato com o administrador.</p>
            <p>&copy; {new Date().getFullYear()} {workshopName}. Todos os direitos reservados.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}