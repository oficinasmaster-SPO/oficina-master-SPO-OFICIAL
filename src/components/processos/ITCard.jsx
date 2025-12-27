import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileCheck, Edit, Trash2, Eye, Plus } from "lucide-react";

export default function ITCard({ 
  it, 
  supportDocsCount, 
  onView, 
  onEdit, 
  onDelete, 
  onAddDoc,
  canManage 
}) {
  const statusColors = {
    rascunho: "bg-gray-100 text-gray-700",
    ativo: "bg-green-100 text-green-700",
    revisao: "bg-yellow-100 text-yellow-700",
    obsoleto: "bg-red-100 text-red-700"
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3 flex-1">
            <FileCheck className="w-5 h-5 text-green-600 mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs text-gray-600">{it.code}</span>
                <Badge className={statusColors[it.status] || "bg-gray-100"}>
                  {it.status}
                </Badge>
              </div>
              <h4 className="font-semibold text-gray-900">{it.title}</h4>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {it.description || "Sem descrição"}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                <span>{it.execution_steps?.length || 0} passos</span>
                <span>{supportDocsCount} doc(s)</span>
                {it.version && <span>v{it.version}</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-1 ml-3">
            <Button size="sm" onClick={onView}>
              <Eye className="w-3 h-3" />
            </Button>
            {canManage && (
              <>
                <Button size="sm" variant="outline" onClick={onEdit}>
                  <Edit className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={onAddDoc}>
                  <Plus className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={onDelete}>
                  <Trash2 className="w-3 h-3 text-red-600" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}