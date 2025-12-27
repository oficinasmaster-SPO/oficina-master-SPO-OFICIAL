import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Eye, Edit, Trash2, Plus, Share2 } from "lucide-react";

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
    <Card className="hover:shadow-md transition-all group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-gray-500">{map.code}</span>
                <Badge className={statusColors[map.status]}>
                  {map.status}
                </Badge>
              </div>
              <CardTitle className="text-base mt-1">{map.title}</CardTitle>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {map.description || "Sem descrição"}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {itsCount} {itsCount === 1 ? 'IT' : 'ITs'}
          </span>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={onView}>
              <Eye className="w-4 h-4" />
            </Button>
            {canManage && (
              <>
                <Button size="sm" variant="ghost" onClick={onEdit}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={onAddIT}>
                  <Plus className="w-4 h-4 text-blue-600" />
                </Button>
                <Button size="sm" variant="ghost" onClick={onShare}>
                  <Share2 className="w-4 h-4 text-green-600" />
                </Button>
                <Button size="sm" variant="ghost" onClick={onDelete}>
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}