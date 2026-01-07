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

  const renderNode = (node) => (
    <div key={node.id} className="flex flex-col items-center">
      <div
        className="relative px-6 py-4 rounded-lg shadow-lg text-white font-bold text-center min-w-[200px] transition-transform hover:scale-105"
        style={{ backgroundColor: node.color || '#EF4444' }}
      >
        <div className="text-lg">{node.title}</div>
        {node.employee_ids && node.employee_ids.length > 0 && (
          <Badge variant="secondary" className="mt-2 bg-white/20 text-white">
            <Users className="w-3 h-3 mr-1" />
            {node.employee_ids.length}
          </Badge>
        )}
      </div>

      {node.children && node.children.length > 0 && (
        <div className="flex flex-col items-center mt-6">
          <div className="w-0.5 h-8 bg-red-500" />
          <div className="flex gap-6 relative">
            {node.children.length > 1 && (
              <div
                className="absolute top-0 h-0.5 bg-red-500"
                style={{
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: `${(node.children.length - 1) * 100}%`
                }}
              />
            )}
            {node.children.map((child, idx) => (
              <div key={child.id} className="relative">
                {node.children.length > 1 && (
                  <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-8 bg-red-500 -top-8" />
                )}
                {renderNode(child)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (tree.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Nenhum nó encontrado no organograma
      </div>
    );
  }

  return (
    <div className="overflow-x-auto py-8">
      <div className="flex justify-center min-w-max px-8">
        <div className="flex flex-col items-center gap-6">
          {tree.map(rootNode => renderNode(rootNode))}
        </div>
      </div>
    </div>
  );
}