import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail } from "lucide-react";

export default function EmailPreview({ isOpen, onClose, email, name, workshopName, inviteLink, isPreview = true }) {
  const displayLink = inviteLink && !inviteLink.includes("...") && !inviteLink.includes("[seu-domínio]") ? inviteLink : "https://oficinasmastergtr.com/PrimeiroAcesso?token=...";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-none bg-transparent shadow-none">
        {/* Wrapper to center the email preview visually */}
        {/* Wrapper to center the email preview visually */}
        <div className="flex justify-center p-4">
          <div style={{
            width: '100%',
            maxWidth: '600px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            overflow: 'hidden',
            fontFamily: 'Arial, sans-serif'
          }}>
            {/* HEADER */}
            <div style={{
              background: 'linear-gradient(135deg,#0F172A,#1E293B)',
              padding: '20px',
              textAlign: 'center',
              color: '#FFFFFF'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>Oficinas Master</h2>
              <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.8 }}>
                Sistema de Gestão para Oficinas
              </p>
            </div>

            {/* CONTEÚDO */}
            <div style={{ padding: '20px' }}>
              <h2 style={{ marginTop: 0, color: '#111827', fontSize: '20px' }}>
                Seu acesso foi liberado
              </h2>

              <p style={{ color: '#374151', fontSize: '14px', margin: '10px 0' }}>
                Olá <strong>{name}</strong>,
              </p>

              <p style={{ color: '#374151', fontSize: '14px', margin: '10px 0' }}>
                Você foi adicionado à oficina <strong>{workshopName}</strong>.
                Para começar, acesse a plataforma e configure sua senha.
              </p>

              {/* BOX INFORMAÇÕES */}
              <div style={{ background: '#F9FAFB', borderRadius: '10px', margin: '20px 0', padding: '14px' }}>
                <p style={{ margin: '6px 0', fontSize: '14px', color: '#111827' }}><strong>Email:</strong> {email}</p>
                <p style={{ margin: '6px 0', fontSize: '14px', color: '#111827' }}><strong>Acesso inicial:</strong> criar senha no primeiro login</p>
                <p style={{ margin: '6px 0', fontSize: '14px', color: '#111827' }}><strong>Validade do convite:</strong> 7 dias</p>
              </div>

              {/* BOTÃO */}
              <div style={{ margin: '25px 0', textAlign: 'center' }}>
                <a href={displayLink}
                   onClick={(e) => isPreview && e.preventDefault()}
                   style={{
                     display: 'block',
                     width: '100%',
                     maxWidth: '320px',
                     margin: 'auto',
                     background: '#EF4444',
                     color: '#FFFFFF',
                     padding: '14px',
                     borderRadius: '8px',
                     textDecoration: 'none',
                     fontWeight: 'bold',
                     fontSize: '14px',
                     textAlign: 'center'
                   }}>
                   Acessar Plataforma
                </a>
              </div>

              {/* LINK ALTERNATIVO */}
              <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px' }}>
                Se o botão não funcionar, copie e cole o link abaixo:
              </p>

              <p style={{ fontSize: '12px', background: '#F3F4F6', padding: '10px', borderRadius: '6px', wordBreak: 'break-all', color: '#111827' }}>
                {displayLink}
              </p>

              {/* AVISO */}
              <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '20px' }}>
                Por segurança, recomendamos alterar sua senha após o primeiro acesso.
              </p>
            </div>
            
            {/* FOOTER */}
            <div style={{ background: '#F9FAFB', padding: '16px', textAlign: 'center', fontSize: '12px', color: '#6B7280' }}>
              © 2026 Oficinas Master • Sistema de Gestão para Oficinas<br />
              Este é um e-mail automático. Não responda.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}