import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Download, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Histórico de versões do documento
 */
export default function VersionHistory({ document, versions = [], onClose, onRestore }) {
  if (!document) return null;

  const allVersions = [document, ...versions].sort((a, b) => 
    new Date(b.created_date) - new Date(a.created_date)
  );

  return (
    <Dialog open={!!document} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Histórico de Versões: {document.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {allVersions.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                Nenhuma versão anterior encontrada
              </CardContent>
            </Card>
          ) : (
            allVersions.map((version, index) => (
              <Card key={version.id} className={index === 0 ? "border-blue-500" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={index === 0 ? "default" : "secondary"}>
                          Versão {version.version || allVersions.length - index}
                        </Badge>
                        {index === 0 && (
                          <Badge className="bg-green-100 text-green-800">
                            Atual
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {format(new Date(version.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Enviado por: {version.created_by || "Sistema"}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(version.file_url, '_blank')}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(version.file_url, '_blank')}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      {index > 0 && onRestore && (
                        <Button
                          size="sm"
                          onClick={() => onRestore(version)}
                        >
                          Restaurar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}