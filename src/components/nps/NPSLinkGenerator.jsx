import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Check, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

export default function NPSLinkGenerator({ defaultContext = "cliente" }) {
  const { user } = useAuth();
  const workshopId = user?.data?.workshop_id || user?.workshop_id;
  const [contextType, setContextType] = useState(defaultContext);
  const [copied, setCopied] = useState(false);

  const generateLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/PublicNPS?wid=${workshopId}&ctx=${contextType}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateLink());
    setCopied(true);
    toast.success("Link copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!workshopId) return null;

  return (
    <Card className="shadow-sm border border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <LinkIcon className="w-4 h-4 text-blue-600" />
          Gerar Link de Pesquisa NPS
        </CardTitle>
        <CardDescription className="text-xs">
          Envie este link para coletar avaliações públicas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <Select value={contextType} onValueChange={setContextType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cliente">Cliente (Pós-Serviço)</SelectItem>
              <SelectItem value="imersao">Imersão</SelectItem>
              <SelectItem value="treinamento">Treinamento</SelectItem>
              <SelectItem value="mentoria">Mentoria</SelectItem>
              <SelectItem value="monitoria">Monitoria</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs truncate text-slate-600 flex items-center">
              {generateLink()}
            </div>
            <Button onClick={handleCopy} size="icon" variant="outline" className="shrink-0">
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}