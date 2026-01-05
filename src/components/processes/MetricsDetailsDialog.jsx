import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, ClipboardList, FileCheck, CheckCircle, TrendingUp, Building2, Eye, Download, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MetricsDetailsDialog({ 
  open, 
  onClose, 
  type, 
  data, 
  onViewItem 
}) {
  const getConfig = () => {
    switch (type) {
      case "maps":
        return {
          title: "MAPs - Mapeamentos de Processos",
          icon: FileText,
          color: "text-blue-600",
          items: data
        };
      case "its":
        return {
          title: "ITs - Instruções de Trabalho",
          icon: ClipboardList,
          color: "text-purple-600",
          items: data
        };
      case "frs":
        return {
          title: "FRs - Formulários e Registros",
          icon: FileCheck,
          color: "text-green-600",
          items: data
        };
      case "implementations":
        return {
          title: "Implementações de Processos",
          icon: CheckCircle,
          color: "text-orange-600",
          items: data
        };
      case "audits":
        return {
          title: "Auditorias Realizadas",
          icon: TrendingUp,
          color: "text-red-600",
          items: data
        };
      case "custom":
        return {
          title: "Processos Próprios da Oficina",
          icon: Building2,
          color: "text-indigo-600",
          items: data
        };
      default:
        return { title: "", icon: FileText, color: "", items: [] };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  const renderItem = (item, index) => {
    if (type === "maps" || type === "custom") {
      return (
        <div key={item.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {item.code && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {item.code}
                  </Badge>
                )}
                {item.category && (
                  <Badge variant="secondary" className="text-xs">
                    {item.category}
                  </Badge>
                )}
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
              {item.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
              )}
              <div className="flex gap-2 mt-2">
                {item.child_its_count > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {item.child_its_count} ITs
                  </Badge>
                )}
                {item.indicators_count > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {item.indicators_count} KPIs
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {item.pdf_url && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.open(item.pdf_url, '_blank')}
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
              <Button 
                size="sm" 
                className="bg-red-600 hover:bg-red-700"
                onClick={() => onViewItem(item)}
              >
                <Eye className="w-4 h-4 mr-2" />
                Ver
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (type === "its") {
      return (
        <div key={item.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {item.code && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {item.code}
                  </Badge>
                )}
                {item.status && (
                  <Badge variant="secondary" className="text-xs">
                    {item.status}
                  </Badge>
                )}
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">{item.name}</h4>
              {item.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
              )}
              {item.forms_count > 0 && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    {item.forms_count} Formulários
                  </Badge>
                </div>
              )}
            </div>
            <Button 
              size="sm" 
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => onViewItem(item)}
            >
              <Eye className="w-4 h-4 mr-2" />
              Ver
            </Button>
          </div>
        </div>
      );
    }

    if (type === "implementations") {
      return (
        <div key={item.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge 
                  variant={item.status === 'completed' ? 'default' : 'secondary'} 
                  className="text-xs"
                >
                  {item.status === 'completed' ? 'Concluído' : item.status === 'in_progress' ? 'Em Andamento' : 'Pendente'}
                </Badge>
                {item.implementation_date && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(item.implementation_date), "dd MMM yyyy", { locale: ptBR })}
                  </span>
                )}
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Implementação de Processo</h4>
              {item.notes && (
                <p className="text-sm text-gray-600 line-clamp-2">{item.notes}</p>
              )}
            </div>
            <Button 
              size="sm" 
              className="bg-orange-600 hover:bg-orange-700"
              onClick={() => onViewItem(item)}
            >
              <Eye className="w-4 h-4 mr-2" />
              Ver
            </Button>
          </div>
        </div>
      );
    }

    if (type === "audits") {
      return (
        <div key={item.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">
                  Auditoria #{index + 1}
                </Badge>
                {item.audit_date && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(item.audit_date), "dd MMM yyyy", { locale: ptBR })}
                  </span>
                )}
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">
                {item.title || "Auditoria de Processo"}
              </h4>
              {item.findings && (
                <p className="text-sm text-gray-600 line-clamp-2">{item.findings}</p>
              )}
            </div>
            <Button 
              size="sm" 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => onViewItem(item)}
            >
              <Eye className="w-4 h-4 mr-2" />
              Ver
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${config.color}`}>
            <Icon className="w-6 h-6" />
            {config.title}
          </DialogTitle>
          <DialogDescription>
            Total de {config.items.length} {config.items.length === 1 ? 'item' : 'itens'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-3">
            {config.items.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Icon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Nenhum item encontrado</p>
              </div>
            ) : (
              config.items.map((item, index) => renderItem(item, index))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}