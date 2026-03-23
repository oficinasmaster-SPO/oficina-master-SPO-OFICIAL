import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail } from "lucide-react";

export default function EmailPreview({ isOpen, onClose, email, name, workshopName, inviteLink, isPreview = true }) {
  const displayLink = inviteLink && !inviteLink.includes("...") && !inviteLink.includes("[seu-domínio]") ? inviteLink : "https://oficinasmastergtr.com/PrimeiroAcesso?token=...";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-none bg-transparent shadow-none">
        {/* Wrapper to center the email preview visually */}
        <div className="flex justify-center p-4">
          <div style={{
            width: '600px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
            fontFamily: 'Arial, sans-serif'
          }}>
            {/* HEADER */}
            <div style={{
              background: 'linear-gradient(135deg,#0F172A,#1E293B)',
              padding: '24px',
              textAlign: 'center',
              color: '#FFFFFF'
            }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>Oficinas Master</h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.8 }}>Sistema de Gestão para Oficinas</p>
            </div>

            {/* CONTEÚDO */}
            <div style={{ padding: '32px', color: '#374151' }}>
              <h2 style={{ marginTop: 0, color: '#111827', fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
                Você foi convidado para acessar a plataforma
              </h2>

              <p style={{ margin: '16px 0' }}>
                Olá <strong>{name}</strong>,
              </p>

              <p style={{ margin: '16px 0' }}>
                Seu acesso ao sistema da oficina <strong>{workshopName}</strong> foi criado com sucesso.
              </p>

              {/* BOX INFO */}
              <div style={{
                background: '#F9FAFB',
                padding: '16px',
                borderRadius: '10px',
                margin: '20px 0'
              }}>
                <p style={{ margin: '6px 0' }}><strong>Email:</strong> {email}</p>
                <p style={{ margin: '6px 0' }}><strong>Acesso inicial:</strong> criar senha no primeiro acesso</p>
                <p style={{ margin: '6px 0' }}><strong>Validade do convite:</strong> 7 dias</p>
              </div>

              {/* CTA */}
              <div style={{ textAlign: 'center', margin: '30px 0' }}>
                <a 
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  style={{
                    background: '#EF4444',
                    color: '#FFFFFF',
                    padding: '14px 28px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    display: 'inline-block'
                  }}
                >
                  Acessar Plataforma
                </a>
              </div>

              <p style={{ fontSize: '13px', color: '#6B7280', margin: '16px 0 8px 0' }}>
                Caso o botão não funcione, copie e cole o link abaixo no seu navegador:
              </p>

              <p style={{
                fontSize: '12px',
                background: '#F3F4F6',
                padding: '10px',
                borderRadius: '6px',
                wordBreak: 'break-all',
                fontFamily: 'monospace',
                margin: 0
              }}>
                {displayLink}
              </p>

              <hr style={{ border: 'none', borderTop: '1px solid #E5E7EB', margin: '30px 0' }} />

              <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
                Por segurança, recomendamos alterar sua senha após o primeiro acesso.
              </p>
            </div>

            {/* FOOTER */}
            <div style={{
              background: '#F9FAFB',
              padding: '16px',
              textAlign: 'center',
              fontSize: '12px',
              color: '#6B7280'
            }}>
              © 2026 Oficinas Master • Sistema de Gestão para Oficinas<br />
              Este é um email automático. Não responda.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}