import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { History, Eye, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function HistoricoVersoesModal({ open, onClose, versions, onViewVersion }) {
  if (!versions || versions.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-purple-600" />
            Histórico de Versões do Plano
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {versions.map((version, index) => (
            <Card key={version.id} className={`border-2 ${version.status === 'ativo' ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-lg">Versão {version.version}</h4>
                      {version.status === 'ativo' && (
                        <Badge className="bg-green-600 text-white">Ativa</Badge>
                      )}
                      {version.version > 1 && (
                        <Badge variant="outline" className="text-purple-600">Refinada</Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Criada em: {format(new Date(version.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>Por: {version.created_by}</span>
                      </div>
                      
                      {version.refinement_notes && (
                        <div className="bg-purple-50 border border-purple-200 rounded p-3 mt-3">
                          <p className="text-sm text-purple-900">
                            <strong>Refinamento:</strong> {version.refinement_notes}
                          </p>
                        </div>
                      )}

                      {version.user_feedback && version.user_feedback.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-3">
                          <p className="text-sm text-blue-900 font-medium mb-2">Feedbacks recebidos:</p>
                          {version.user_feedback.slice(0, 2).map((feedback, i) => (
                            <p key={i} className="text-xs text-blue-800 mb-1">
                              • {feedback.content.substring(0, 100)}...
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewVersion(version)}
                    className="gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Visualizar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}