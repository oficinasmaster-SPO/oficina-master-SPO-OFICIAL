import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Share2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

/**
 * Compartilhamento de documento com link temporário
 */
export default function ShareDocumentDialog({ document, onClose }) {
  const [shareLink, setShareLink] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [requirePassword, setRequirePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateShareLink = async () => {
    setGenerating(true);
    try {
      // Gera um token único
      const token = btoa(`${document.id}_${Date.now()}_${Math.random()}`).replace(/=/g, '');
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiresInDays);

      // Salva o compartilhamento no banco
      await base44.entities.DocumentShare.create({
        document_id: document.id,
        token: token,
        expires_at: expiryDate.toISOString(),
        password: requirePassword ? password : null,
        created_by: (await base44.auth.me()).email
      });

      const link = `${window.location.origin}/shared/${token}`;
      setShareLink(link);
      toast.success("Link gerado com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar link: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!document) return null;

  return (
    <Dialog open={!!document} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Compartilhar: {document.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!shareLink ? (
            <>
              <div>
                <Label>Validade do Link (dias)</Label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 7)}
                />
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <Checkbox
                  id="password"
                  checked={requirePassword}
                  onCheckedChange={setRequirePassword}
                />
                <div className="flex-1">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Proteger com senha
                  </Label>
                  <p className="text-xs text-gray-500">
                    Requer senha para acessar o documento
                  </p>
                </div>
              </div>

              {requirePassword && (
                <div>
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    placeholder="Digite a senha..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-green-900">Link gerado com sucesso!</p>
                    <p className="text-sm text-green-700 mt-1">
                      Válido por {expiresInDays} dias
                      {requirePassword && " • Protegido com senha"}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label>Link de Compartilhamento</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={shareLink}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyLink}
                  >
                    {copied ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {requirePassword && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Senha:</strong> {password}
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Envie esta senha separadamente ao destinatário
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {shareLink ? "Fechar" : "Cancelar"}
          </Button>
          {!shareLink && (
            <Button
              onClick={generateShareLink}
              disabled={generating || (requirePassword && !password)}
            >
              {generating ? "Gerando..." : "Gerar Link"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}