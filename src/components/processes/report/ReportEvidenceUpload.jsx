import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Upload, X, Image, FileText, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ReportEvidenceUpload({ evidencias, onChange }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const newEvidencias = [...(evidencias || [])];

    try {
      for (const file of files) {
        const isImage = file.type.startsWith('image/');
        
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        newEvidencias.push({
          id: Date.now() + Math.random(),
          url: file_url,
          name: file.name,
          type: isImage ? 'image' : 'document',
          uploadedAt: new Date().toISOString()
        });
      }

      onChange(newEvidencias);
      toast.success(`${files.length} arquivo(s) enviado(s)`);
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  };

  const removeEvidencia = (id) => {
    const updated = evidencias.filter(e => e.id !== id);
    onChange(updated);
    toast.success("Evidência removida");
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-semibold">Evidências Fotográficas</Label>
      
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => handleFileUpload(Array.from(e.target.files))}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFileUpload(Array.from(e.target.files))}
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="gap-2"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          Upload
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading}
          className="gap-2"
        >
          <Camera className="w-4 h-4" />
          Câmera
        </Button>
      </div>

      {evidencias && evidencias.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {evidencias.map((ev) => (
            <Card key={ev.id} className="relative group overflow-hidden">
              <CardContent className="p-2">
                {ev.type === 'image' ? (
                  <div className="aspect-square relative">
                    <img 
                      src={ev.url} 
                      alt={ev.name}
                      className="w-full h-full object-cover rounded"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <a 
                        href={ev.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-white text-sm underline"
                      >
                        Visualizar
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square flex flex-col items-center justify-center bg-gray-100 rounded">
                    <FileText className="w-8 h-8 text-gray-500" />
                    <span className="text-xs text-gray-600 mt-1 text-center truncate w-full px-1">
                      {ev.name}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => removeEvidencia(ev.id)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(!evidencias || evidencias.length === 0) && (
        <p className="text-sm text-gray-500 text-center py-4 border-2 border-dashed rounded-lg">
          Nenhuma evidência fotográfica adicionada
        </p>
      )}
    </div>
  );
}