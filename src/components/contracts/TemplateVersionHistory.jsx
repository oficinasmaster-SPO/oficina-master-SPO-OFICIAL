import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, Eye, RotateCcw } from "lucide-react";
import moment from "moment";

export default function TemplateVersionHistory({ versions = [], onRestore, open, onOpenChange }) {
  const [previewVersion, setPreviewVersion] = useState(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Histórico de Versões ({versions.length})
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {versions.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">Nenhuma versão anterior encontrada.</p>
          )}

          {versions.map((version, index) => (
            <div
              key={version.id}
              className={`border rounded-lg p-4 transition-colors ${
                previewVersion?.id === version.id ? "border-blue-400 bg-blue-50" : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant={index === 0 ? "default" : "outline"}>
                    v{version.version}
                  </Badge>
                  {index === 0 && (
                    <Badge className="bg-green-100 text-green-700">Atual</Badge>
                  )}
                  <span className="text-sm text-gray-600">
                    {moment(version.created_at).format("DD/MM/YYYY [às] HH:mm")}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPreviewVersion(previewVersion?.id === version.id ? null : version)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    {previewVersion?.id === version.id ? "Fechar" : "Ver"}
                  </Button>
                  {index !== 0 && onRestore && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onRestore(version);
                        onOpenChange(false);
                      }}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Carregar no Editor
                    </Button>
                  )}
                </div>
              </div>

              {version.change_note && (
                <p className="text-xs text-gray-500 mb-2">
                  Nota: {version.change_note}
                </p>
              )}

              {version.edited_by && (
                <p className="text-xs text-gray-400">
                  Por: {version.edited_by}
                </p>
              )}

              {previewVersion?.id === version.id && (
                <pre className="mt-3 bg-white border rounded p-3 text-xs overflow-auto max-h-60 font-mono whitespace-pre-wrap">
                  {version.content}
                </pre>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}