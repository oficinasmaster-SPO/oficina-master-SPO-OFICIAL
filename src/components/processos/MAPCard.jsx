import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Edit, Trash2, Eye, Plus, Share2 } from "lucide-react";

export default function MAPCard({ 
  map, 
  itsCount, 
  onView, 
  onEdit, 
  onDelete, 
  onAddIT, 
  onShare,
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
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="font-mono text-xs text-gray-600">{map.code}</span>
          </div>
          <Badge className={statusColors[map.status] || "bg-gray-100"}>
            {map.status}
          </Badge>
        </div>
        <CardTitle className="text-lg">{map.title}</CardTitle>
        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
          {map.description || "Sem descrição"}
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-500">{itsCount} IT(s)</span>
          {map.version && (
            <span className="text-xs text-gray-400">v{map.version}</span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={onView} className="flex-1">
            <Eye className="w-3 h-3 mr-1" /> Ver
          </Button>
          {canManage && (
            <>
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Edit className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="outline" onClick={onAddIT}>
                <Plus className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="outline" onClick={onShare}>
                <Share2 className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="outline" onClick={onDelete}>
                <Trash2 className="w-3 h-3 text-red-600" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}