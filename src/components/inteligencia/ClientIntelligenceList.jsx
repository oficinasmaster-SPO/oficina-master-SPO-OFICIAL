import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, CheckCircle } from "lucide-react";
import { GRAVITY_LEVELS, INTELLIGENCE_TYPES } from "@/components/lib/clientIntelligenceConstants";

export default function ClientIntelligenceList({
  items = [],
  onEdit,
  onDelete,
  onStatusChange,
  isLoading = false,
}) {
  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Carregando...</div>;
  }

  if (!items.length) {
    return <div className="text-center py-8 text-gray-500">Nenhum item encontrado</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  {item.is_recurring && (
                    <Badge variant="outline" className="text-xs">
                      Recorrente
                    </Badge>
                  )}
                  {item.action_defined && (
                    <Badge variant="outline" className="text-xs bg-green-50">
                      Ação Definida
                    </Badge>
                  )}
                </div>

                {item.description && (
                  <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    style={{
                      backgroundColor: GRAVITY_LEVELS[item.gravity]?.color || "#f3f4f6",
                      color: "#1f2937",
                    }}
                  >
                    {GRAVITY_LEVELS[item.gravity]?.label || item.gravity}
                  </Badge>

                  <Badge variant="secondary" className="text-xs">
                    {item.status}
                  </Badge>

                  {item.action_defined && item.action_description && (
                    <span className="text-xs text-gray-500">
                      Ação: {item.action_description.substring(0, 50)}...
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                {item.status !== "resolvido" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onStatusChange?.(item.id, "resolvido")}
                    title="Marcar como resolvido"
                  >
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit?.(item)}
                  title="Editar"
                >
                  <Edit className="w-4 h-4 text-blue-600" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete?.(item.id)}
                  title="Deletar"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}