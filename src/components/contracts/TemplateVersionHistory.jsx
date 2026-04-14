import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, Eye, RotateCcw, Trash2, X } from "lucide-react";
import moment from "moment";

export default function TemplateVersionHistory({ versions = [], onRestore, onDelete, open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col p-0 gap-0 [&>button]:hidden">
        <DialogHeader className="p-6 bg-background sticky top-0 z-20 shadow-[0_5px_10px_-5px_rgba(0,0,0,0.1)] border-b flex-row justify-between items-center space-y-0">
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Histórico de Versões ({versions.length})
          </DialogTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900" onClick={() => onOpenChange(false)}>
            <X className="w-5 h-5" />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 p-6">
          {versions.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">Nenhuma versão anterior encontrada.</p>
          )}

          {versions.map((version, index) => (
            <div
              key={version.id}
              className="border rounded-lg p-4 transition-colors hover:bg-gray-50"
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
                  {onRestore && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onRestore(version);
                        onOpenChange(false);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Selecionar
                    </Button>
                  )}
                  {versions.length > 1 && onDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(version.id)}
                      title="Excluir versão"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
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

            </div>
          ))}
        </div>

      </DialogContent>
    </Dialog>
  );
}