import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderOpen, ChevronRight, Edit, Trash2 } from "lucide-react";

export default function AreaCard({ area, mapsCount, onSelect, onEdit, onDelete, canManage }) {
  return (
    <Card className="hover:shadow-lg transition-all cursor-pointer group" onClick={onSelect}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{area.name}</CardTitle>
              <Badge variant="secondary" className="mt-1">
                {mapsCount} {mapsCount === 1 ? 'MAP' : 'MAPs'}
              </Badge>
            </div>
          </div>
          {canManage && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
              >
                <Edit className="w-4 h-4" />
              </Button>
              {!area.is_system && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 line-clamp-2">
          {area.description || "Sem descrição"}
        </p>
        <div className="flex justify-end mt-4">
          <Button variant="ghost" size="sm" className="gap-2">
            Ver MAPs <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}