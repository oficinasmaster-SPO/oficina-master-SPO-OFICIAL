import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";

export default function NPSLinkGenerator() {
  const { workshop } = useWorkshopContext();
  
  if (!workshop) return null;

  const link = `${window.location.origin}/PublicNPS?wid=${workshop.id}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(link);
    toast.success("Link copiado para a área de transferência!");
  };

  return (
    <div className="p-4 bg-white border rounded-xl shadow-sm space-y-4 mb-6">
      <div>
        <h3 className="font-semibold text-gray-900">Link Público de NPS</h3>
        <p className="text-sm text-gray-600">Compartilhe este link com seus clientes após o atendimento para coletar o NPS da sua oficina.</p>
      </div>
      
      <div className="flex gap-2">
        <Input value={link} readOnly className="bg-gray-50" />
        <Button onClick={copyToClipboard} variant="outline">
          <Copy className="w-4 h-4 mr-2" />
          Copiar
        </Button>
      </div>
    </div>
  );
}