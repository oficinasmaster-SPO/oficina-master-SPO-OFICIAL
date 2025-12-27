import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileCheck, Eye, Edit, Trash2, Paperclip } from "lucide-react";

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
    <Card className="hover:shadow-sm transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <FileCheck className="w-5 h-5 text-blue-600 mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs text-gray-500">{it.code}</span>
                <Badge className={statusColors[it.status]} size="sm">
                  {it.status}
                </Badge>
              </div>
              <h4 className="font-semibold text-sm">{it.title}</h4>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {it.description || "Sem descrição"}
              </p>
              {supportDocsCount > 0 && (
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                  <Paperclip className="w-3 h-3" />
                  {supportDocsCount} documento{supportDocsCount > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={onView}>
              <Eye className="w-3 h-3" />
            </Button>
            {canManage && (
              <>
                <Button size="sm" variant="ghost" onClick={onEdit}>
                  <Edit className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={onAddDoc}>
                  <Paperclip className="w-3 h-3 text-blue-600" />
                </Button>
                <Button size="sm" variant="ghost" onClick={onDelete}>
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