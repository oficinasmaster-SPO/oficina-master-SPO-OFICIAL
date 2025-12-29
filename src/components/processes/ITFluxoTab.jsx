import React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import AIFieldAssist from "./AIFieldAssist";

export default function ITFluxoTab({ content, onChange, onFileUpload, uploading, itData, mapData }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Descrição do Fluxo - Passo a Passo *</Label>
        <div className="relative">
          <Textarea
            value={content.fluxo_descricao || ""}
            onChange={(e) => onChange({ ...content, fluxo_descricao: e.target.value })}
            placeholder="1. Primeiro passo...&#10;2. Segundo passo...&#10;3. Terceiro passo..."
            rows={8}
          />
          <AIFieldAssist
            fieldName="Fluxo Operacional"
            fieldValue={content.fluxo_descricao}
            itData={itData}
            mapData={mapData}
            onApply={(suggestion) => onChange({ ...content, fluxo_descricao: suggestion })}
            suggestions={[
              { type: 'fluxo_gerar', label: '✍️ Gerar fluxo passo a passo' }
            ]}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">Descreva o passo a passo sequencial da execução desta IT</p>
      </div>

      <div>
        <Label>Imagem do Fluxograma (Opcional)</Label>
        <div className="border-2 border-dashed rounded-lg p-4 text-center">
          {content.fluxo_image_url ? (
            <div className="relative">
              <img src={content.fluxo_image_url} alt="Fluxograma" className="max-h-64 mx-auto rounded" />
              <Button
                size="sm"
                variant="destructive"
                className="absolute top-2 right-2"
                onClick={() => onChange({ ...content, fluxo_image_url: "" })}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div>
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <Label htmlFor="fluxo-upload" className="cursor-pointer text-blue-600 hover:underline">
                Clique para fazer upload da imagem do fluxo
              </Label>
              <Input
                id="fluxo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onFileUpload(e, 'fluxo')}
                disabled={uploading}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}