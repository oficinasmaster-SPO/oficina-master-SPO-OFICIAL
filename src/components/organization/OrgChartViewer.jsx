import React from "react";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

export default function OrgChartViewer({ nodes }) {
  const buildTree = (parentId = null, level = 1) => {
    return nodes
      .filter(node => node.parent_node_id === parentId && node.is_active)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(node => ({
        ...node,
        level,
        children: buildTree(node.node_id, level + 1)
      }));
  };

  const tree = buildTree();

  const renderNode = (node) => {
    const hasChildren = node.children && node.children.length > 0;
    const childCount = node.children?.length || 0;
    
    // Se tem mais de 3 filhos, renderiza em grid
    const useGrid = childCount > 3;
    
    return (
      <div key={node.id} className="flex flex-col items-center">
        <div
          className="relative px-6 py-3 rounded-lg shadow-lg text-white font-bold text-center min-w-[180px] max-w-[220px] transition-transform hover:scale-105"
          style={{ backgroundColor: node.color || '#EF4444' }}
        >
          <div className="text-base">{node.title}</div>
          {node.employee_ids && node.employee_ids.length > 0 && (
            <Badge variant="secondary" className="mt-1 bg-white/20 text-white text-xs">
              <Users className="w-3 h-3 mr-1" />
              {node.employee_ids.length}
            </Badge>
          )}
        </div>

        {hasChildren && (
          <div className="flex flex-col items-center mt-4">
            <div className="w-0.5 h-6 bg-red-500" />
            
            {useGrid ? (
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 relative">
                {node.children.map((child) => (
                  <div key={child.id} className="relative flex flex-col items-center">
                    <div className="w-0.5 h-6 bg-red-500 -mt-6" />
                    {renderNode(child)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-6 relative">
                {childCount > 1 && (
                  <div
                    className="absolute top-0 h-0.5 bg-red-500"
                    style={{
                      left: childCount === 2 ? '25%' : '16.66%',
                      right: childCount === 2 ? '25%' : '16.66%',
                    }}
                  />
                )}
                {node.children.map((child) => (
                  <div key={child.id} className="relative">
                    {childCount > 1 && (
                      <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-6 bg-red-500 -top-6" />
                    )}
                    {renderNode(child)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (tree.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Nenhum nó encontrado no organograma
      </div>
    );
  }

  return (
    <div className="overflow-x-auto py-8">
      <div className="flex justify-center min-w-max px-8 max-w-7xl mx-auto">
        <div className="flex flex-col items-center gap-8">
          {tree.map(rootNode => renderNode(rootNode))}
        </div>
      </div>
    </div>
  );
}