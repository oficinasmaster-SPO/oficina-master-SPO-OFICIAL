import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AttachmentGallery from "./AttachmentGallery"; // Importamos o componente genérico que criamos

export default function PedidoInternoVisualizador({ pedido }) {
  const medias = pedido?.midias_anexas || [];

  if (!medias || medias.length === 0) return null;

  // Aqui nós mapeamos os dados do "Pedido Interno" para o formato 
  // genérico que a nossa AttachmentGallery espera.
  const arquivosFormatados = medias.map(media => ({
    id: media.id || Math.random().toString(), // fallback se não tiver id
    url: media.url,
    name: media.nome,
    type: media.type === "imagem" ? "image" : media.type === "link" ? "link" : "document",
    mimeType: media.mimeType,
    size: media.size,
    extension: media.extension,
    createdBy: media.createdBy || "Sistema",
    origin: "Pedido Interno"
  }));

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">Anexos do Pedido</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Usamos a biblioteca reutilizável que criamos! */}
        <AttachmentGallery files={arquivosFormatados} />
      </CardContent>
    </Card>
  );
}