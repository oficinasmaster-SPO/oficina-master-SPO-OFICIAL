import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FileCheck, ClipboardList, ChevronDown, ChevronRight, Download, Edit, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import ITViewer from "./ITViewer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { downloadProcessPDF } from "./ProcessPDFGenerator";

export default function ITManagerList({ its = [], mapDoc, workshop, onEdit, onDelete }) {
  const [expandedId, setExpandedId] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedIT, setSelectedIT] = useState(null);

  const handleViewFull = (it) => {
    setSelectedIT(it);
    setViewDialogOpen(true);
  };

  const handleDownloadIT = (it) => {
    toast.promise(
      Promise.resolve(downloadProcessPDF(mapDoc, [it], workshop)),
      {
        loading: 'Gerando PDF...',
        success: 'PDF baixado com sucesso!',
        error: 'Erro ao gerar PDF'
      }
    );
  };

  return (
    <div className="space-y-2">
      {its.map((it) => {
        const Icon = it.type === 'IT' ? FileCheck : ClipboardList;
        const isExpanded = expandedId === it.id;
        const content = it?.content || {};

        return (
          <Collapsible
            key={it.id}
            open={isExpanded}
            onOpenChange={() => setExpandedId(isExpanded ? null : it.id)}
            className="border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 p-4">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="p-0 h-auto">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                </Button>
              </CollapsibleTrigger>

              <Icon className={`w-5 h-5 ${it.type === 'IT' ? 'text-green-600' : 'text-orange-600'}`} />
              
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-semibold text-gray-900">{it.code}</span>
                  <span className="text-gray-900 font-medium">{it.title}</span>
                  <Badge 
                    variant="outline" 
                    className={it.type === 'IT' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}
                  >
                    {it.type}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    v{it.version || '1'}
                  </Badge>
                  <Badge variant={it.status === 'ativo' ? 'default' : 'secondary'} className="text-xs">
                    {it.status || 'ativo'}
                  </Badge>
                </div>
                {it.description && (
                  <p className="text-sm text-gray-600 mt-1">{it.description}</p>
                )}
              </div>

              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleViewFull(it)}
                  title="Ver completo"
                >
                  <Eye className="w-4 h-4 text-blue-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownloadIT(it)}
                  title="Download PDF"
                >
                  <Download className="w-4 h-4 text-green-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(it)}
                  title="Editar"
                >
                  <Edit className="w-4 h-4 text-gray-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm("Excluir este documento?")) {
                      onDelete(it.id);
                    }
                  }}
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            </div>

            <CollapsibleContent>
              <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-3">
                {/* Preview rápido inline */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h5 className="font-semibold text-gray-900 mb-1">Objetivo</h5>
                    <p className="text-gray-700 line-clamp-3">{content.objetivo || "Não definido."}</p>
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-900 mb-1">Campo de Aplicação</h5>
                    <p className="text-gray-700 line-clamp-3">{content.campo_aplicacao || "Não definido."}</p>
                  </div>
                </div>

                {content.atividades && content.atividades.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-gray-900 mb-1 text-sm">Atividades Principais</h5>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      {content.atividades.slice(0, 3).map((item, idx) => (
                        <li key={idx} className="line-clamp-1">{item.atividade}</li>
                      ))}
                      {content.atividades.length > 3 && (
                        <li className="text-gray-500 italic">+ {content.atividades.length - 3} atividades</li>
                      )}
                    </ul>
                  </div>
                )}

                {content.evidencia_execucao?.tipo_evidencia && (
                  <div>
                    <h5 className="font-semibold text-gray-900 mb-1 text-sm flex items-center gap-1">
                      <FileCheck className="w-4 h-4 text-green-600" />
                      Evidência
                    </h5>
                    <p className="text-sm text-gray-700">
                      {content.evidencia_execucao.tipo_evidencia}
                      {content.evidencia_execucao.periodo_retencao && (
                        <span className="text-gray-500 ml-2">
                          (Retenção: {content.evidencia_execucao.periodo_retencao.replace(/_/g, ' ')})
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      {/* Dialog para visualização completa */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Visualização Completa</DialogTitle>
          </DialogHeader>
          {selectedIT && (
            <ITViewer it={selectedIT} mapDoc={mapDoc} workshop={workshop} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}