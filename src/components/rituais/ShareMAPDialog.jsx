import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Share2, Copy, Mail, Users } from "lucide-react";
import { toast } from "sonner";

export default function ShareMAPDialog({ map, open, onClose, workshop }) {
  const [shareEmail, setShareEmail] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shares, setShares] = useState([]);

  useEffect(() => {
    if (open && map?.id) {
      generateShareLink();
      loadExistingShares();
    }
  }, [open, map?.id]);

  const generateShareLink = () => {
    const link = `${window.location.origin}/VisualizarProcesso?id=${map.id}`;
    setShareLink(link);
  };

  const loadExistingShares = async () => {
    try {
      const allShares = await base44.entities.ProcessShare.filter({
        process_document_id: map.id
      });
      setShares(allShares);
    } catch (error) {
      console.error("Erro ao carregar compartilhamentos:", error);
    }
  };

  const handleShare = async () => {
    if (!shareEmail) {
      toast.error("Digite um email para compartilhar");
      return;
    }

    setSharing(true);
    try {
      await base44.entities.ProcessShare.create({
        process_document_id: map.id,
        shared_with_email: shareEmail,
        shared_by: workshop.owner_id,
        workshop_id: workshop.id,
        message: shareMessage,
        permission_level: "view",
        expires_at: null
      });

      // Enviar email de notificação
      await base44.integrations.Core.SendEmail({
        to: shareEmail,
        subject: `MAP Compartilhado: ${map.title}`,
        body: `
          Olá!
          
          ${shareMessage || "Um MAP foi compartilhado com você."}
          
          Título: ${map.title}
          Código: ${map.code}
          
          Acesse o link para visualizar:
          ${shareLink}
          
          Atenciosamente,
          ${workshop.name}
        `
      });

      toast.success("MAP compartilhado com sucesso!");
      setShareEmail("");
      setShareMessage("");
      loadExistingShares();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao compartilhar MAP");
    } finally {
      setSharing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success("Link copiado!");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-600" />
            Compartilhar MAP: {map?.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Link direto */}
          <div className="space-y-2">
            <Label>Link de Acesso</Label>
            <div className="flex gap-2">
              <Input value={shareLink} readOnly className="flex-1" />
              <Button size="icon" variant="outline" onClick={copyToClipboard}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Compartilhar por email */}
          <div className="space-y-2">
            <Label>Compartilhar por Email</Label>
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
            />
            <Textarea
              placeholder="Mensagem opcional..."
              value={shareMessage}
              onChange={(e) => setShareMessage(e.target.value)}
              rows={3}
            />
            <Button onClick={handleShare} disabled={sharing} className="w-full">
              <Mail className="w-4 h-4 mr-2" />
              {sharing ? "Compartilhando..." : "Enviar por Email"}
            </Button>
          </div>

          {/* Lista de compartilhamentos */}
          {shares.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Compartilhado com ({shares.length})
              </Label>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {shares.map((share) => (
                  <div key={share.id} className="p-2 bg-gray-50 rounded flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{share.shared_with_email}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(share.created_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline">{share.permission_level}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}