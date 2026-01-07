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
    
    return (
      <div key={node.id} className="flex flex-col items-center">
        <div
          className="relative px-6 py-3 rounded-lg shadow-lg text-white font-bold text-center min-w-[180px] max-w-[220px] transition-transform hover:scale-105 border-2 border-white"
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
          <div className="flex flex-col items-center">
            {/* Linha vertical descendo do nó pai */}
            <div className="w-0.5 h-8 bg-gray-400" />
            
            <div className="flex gap-6 relative">
              {/* Linha horizontal conectando os filhos */}
              {childCount > 1 && (
                <div 
                  className="absolute h-0.5 bg-gray-400" 
                  style={{
                    top: 0,
                    left: '50%',
                    right: '50%',
                    width: `calc(100% - 100px)`,
                    transform: 'translateX(-50%)',
                  }}
                />
              )}
              
              {node.children.map((child, idx) => (
                <div key={child.id} className="relative flex flex-col items-center">
                  {/* Linha vertical descendo da linha horizontal até o filho */}
                  <div className="w-0.5 h-8 bg-gray-400" />
                  {renderNode(child)}
                </div>
              ))}
            </div>
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