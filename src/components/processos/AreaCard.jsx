import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, Edit, Trash2, ChevronRight } from "lucide-react";

export default function AreaCard({ area, mapsCount, onSelect, onEdit, onDelete, canManage }) {
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <FolderOpen className="w-8 h-8 text-blue-600" />
          {canManage && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent onClick={onSelect}>
        <CardTitle className="text-lg mb-2">{area.name}</CardTitle>
        <p className="text-sm text-gray-600 mb-3">{area.description || "Sem descrição"}</p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">{mapsCount} MAP(s)</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      </CardContent>
    </Card>
  );
}