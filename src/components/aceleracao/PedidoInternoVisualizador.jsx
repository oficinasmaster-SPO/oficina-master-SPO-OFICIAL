import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AttachmentGallery from "./AttachmentGallery";

export default function PedidoInternoVisualizador({ pedido }) {
  const medias = pedido?.midias_anexas;

  // 1. Mapeamento memoizado e seguro
  const arquivosFormatados = useMemo(() => {
    if (!medias || !Array.isArray(medias)) return [];

    return medias.map((media, index) => ({
      id: media.id || `${index}-${media.url || 'anexo'}`, // ID estável como fallback
      url: media.url,
      name: media.nome || media.name || "Arquivo sem nome",
      type: media.type === "imagem" ? "image" : media.type === "link" ? "link" : "document",
      mimeType: media.mimeType,
      size: media.size,
      extension: media.extension,
      createdBy: media.createdBy || "Sistema",
      origin: "Pedido Interno"
    }));
  }, [medias]);

  // 2. Early return após o Hook (regra dos Hooks no React)
  if (!arquivosFormatados.length) return null;

  return (
    <Card className="mt-6 border-gray-200/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold text-gray-800">
          Anexos do Pedido ({arquivosFormatados.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AttachmentGallery files={arquivosFormatados} />
      </CardContent>
    </Card>
  );
}