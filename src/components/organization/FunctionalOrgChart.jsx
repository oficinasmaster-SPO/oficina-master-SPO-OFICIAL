import React from "react";
import { UserCircle, Users as UsersIcon } from "lucide-react";

export default function FunctionalOrgChart({ structuralNodes, employees, workshop }) {
  // Mapeia employees aos nós estruturais
  const mapEmployeesToNodes = (nodes) => {
    return nodes.map(node => {
      const assignedEmployees = employees.filter(emp => 
        node.employee_ids?.includes(emp.id)
      );
      
      return {
        ...node,
        assignedEmployees
      };
    });
  };

  const nodesWithEmployees = mapEmployeesToNodes(structuralNodes);

  const buildTree = (parentId = null, level = 1) => {
    return nodesWithEmployees
      .filter(node => node.parent_node_id === parentId && node.is_active)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(node => ({
        ...node,
        level,
        children: buildTree(node.node_id, level + 1)
      }));
  };

  const tree = buildTree();

  const renderEmployeeCard = (employee, nodeColor) => (
    <div 
      key={employee.id}
      className="flex flex-col items-center group"
    >
      {/* Foto do colaborador */}
      <div className="relative">
        {employee.profile_picture_url ? (
          <img
            src={employee.profile_picture_url}
            alt={employee.full_name}
            className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-200 border-4 border-white shadow-lg flex items-center justify-center">
            <UserCircle className="w-16 h-16 text-gray-400" />
          </div>
        )}
      </div>

      {/* Name Tag com design moderno */}
      <div className="mt-2 relative">
        <div 
          className="px-6 py-2 rounded-lg shadow-md text-white font-bold text-center min-w-[200px] relative overflow-hidden"
          style={{ backgroundColor: nodeColor || '#374151' }}
        >
          <div className="relative z-10">
            <div className="text-sm font-semibold">{employee.full_name}</div>
          </div>
          {/* Efeito de brilho diagonal */}
          <div 
            className="absolute bottom-0 right-0 w-16 h-1 bg-blue-400"
            style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }}
          />
        </div>
        <div className="mt-1 text-center">
          <span className="text-xs text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            {employee.position}
          </span>
        </div>
      </div>
    </div>
  );

  const renderNode = (node) => {
    const hasChildren = node.children && node.children.length > 0;
    const hasEmployees = node.assignedEmployees && node.assignedEmployees.length > 0;
    const childCount = node.children?.length || 0;

    return (
      <div key={node.id} className="flex flex-col items-center">
        {/* Renderiza colaboradores do nó atual */}
        {hasEmployees ? (
          <div className="flex gap-8 flex-wrap justify-center mb-4">
            {node.assignedEmployees.map(emp => renderEmployeeCard(emp, node.color))}
          </div>
        ) : (
          <div className="flex flex-col items-center mb-4">
            <div className="w-24 h-24 rounded-full bg-gray-100 border-4 border-white shadow-lg flex items-center justify-center">
              <UsersIcon className="w-12 h-12 text-gray-300" />
            </div>
            <div 
              className="mt-2 px-6 py-2 rounded-lg shadow-md text-white font-bold text-center min-w-[200px]"
              style={{ backgroundColor: node.color || '#374151' }}
            >
              <div className="text-sm">{node.title}</div>
            </div>
            <div className="mt-1 text-center">
              <span className="text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                Vaga em aberto
              </span>
            </div>
          </div>
        )}

        {hasChildren && (
          <div className="flex flex-col items-center">
            {/* Linha vertical descendo */}
            <div className="w-0.5 h-12 bg-gray-300" />
            
            <div className="flex gap-12 relative">
              {/* Linha horizontal conectando os filhos */}
              {childCount > 1 && (
                <div 
                  className="absolute h-0.5 bg-gray-300" 
                  style={{
                    top: 0,
                    left: '50%',
                    right: '50%',
                    width: `calc(100% - 100px)`,
                    transform: 'translateX(-50%)',
                  }}
                />
              )}
              
              {node.children.map((child) => (
                <div key={child.id} className="relative flex flex-col items-center">
                  {/* Linha vertical descendo da linha horizontal */}
                  <div className="w-0.5 h-12 bg-gray-300" />
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
        Nenhum nó encontrado no organograma estrutural
      </div>
    );
  }

  return (
    <div className="overflow-x-auto py-8 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="flex justify-center min-w-max px-8">
        <div className="flex flex-col items-center gap-8">
          {tree.map(rootNode => renderNode(rootNode))}
        </div>
      </div>
    </div>
  );
}