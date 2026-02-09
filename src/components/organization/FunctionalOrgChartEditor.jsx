import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCircle, Users, X, Plus, Search } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function FunctionalOrgChartEditor({ nodes, employees, onUpdateNode }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const buildTree = (parentId = null) => {
    return nodes
      .filter(node => node.parent_node_id === parentId && node.is_active)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  const getAssignedEmployees = (node) => {
    return employees.filter(emp => node.employee_ids?.includes(emp.id));
  };

  const getUnassignedEmployees = () => {
    const assignedIds = nodes.flatMap(node => node.employee_ids || []);
    return employees.filter(emp => !assignedIds.includes(emp.id));
  };

  const filteredEmployees = getUnassignedEmployees().filter(emp => {
    const searchLower = searchTerm.toLowerCase();
    return (
      emp.full_name?.toLowerCase().includes(searchLower) ||
      emp.position?.toLowerCase().includes(searchLower) ||
      emp.job_role?.toLowerCase().includes(searchLower)
    );
  });

  const handleAddEmployee = (node, employeeId) => {
    const updatedEmployeeIds = [...(node.employee_ids || []), employeeId];
    onUpdateNode({
      id: node.id,
      data: { ...node, employee_ids: updatedEmployeeIds }
    });
    setSearchTerm("");
  };

  const handleRemoveEmployee = (node, employeeId) => {
    const updatedEmployeeIds = (node.employee_ids || []).filter(id => id !== employeeId);
    onUpdateNode({
      id: node.id,
      data: { ...node, employee_ids: updatedEmployeeIds }
    });
  };

  const renderNodeEditor = (node, level = 0) => {
    const children = buildTree(node?.node_id);
    const assignedEmployees = getAssignedEmployees(node);

    return (
      <div key={node.id} className={`${level > 0 ? 'ml-8' : ''} mt-4`}>
        <Card className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded flex-shrink-0"
                style={{ backgroundColor: node.color || '#374151' }}
              />
              <div>
                <h3 className="font-semibold text-gray-900">{node.title}</h3>
                <p className="text-xs text-gray-500">
                  {assignedEmployees.length} colaborador(es) • Nível {node.level}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setSelectedNode(node);
                setIsDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar Pessoa
            </Button>
          </div>

          {/* Lista de colaboradores já associados */}
          {assignedEmployees.length > 0 && (
            <div className="space-y-2">
              {assignedEmployees.map(emp => (
                <div
                  key={emp.id}
                  className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border"
                >
                  {emp.profile_picture_url ? (
                    <img
                      src={emp.profile_picture_url}
                      alt={emp.full_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <UserCircle className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900">{emp.full_name}</p>
                    <p className="text-xs text-gray-600">{emp.position}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveEmployee(node, emp.id)}
                  >
                    <X className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {assignedEmployees.length === 0 && (
            <div className="text-center py-6 text-gray-500 text-sm border-2 border-dashed rounded-lg">
              <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              Nenhum colaborador associado
            </div>
          )}
        </Card>

        {children.map(child => renderNodeEditor(child, level + 1))}
      </div>
    );
  };

  const rootNodes = buildTree(null);

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Como funciona</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Clique em "Adicionar Pessoa" em cada cargo</li>
          <li>• Selecione colaboradores já cadastrados</li>
          <li>• Foto e nome são puxados automaticamente</li>
          <li>• Você pode associar múltiplas pessoas ao mesmo cargo</li>
        </ul>
      </div>

      <div>
        {rootNodes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Nenhum nó encontrado no organograma estrutural
          </div>
        ) : (
          <div>
            {rootNodes.map(node => renderNodeEditor(node))}
          </div>
        )}
      </div>

      {/* Dialog para adicionar colaborador */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Adicionar pessoa ao cargo: {selectedNode?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Buscar colaborador</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Digite o nome, cargo ou função..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              {filteredEmployees.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? (
                    <p>Nenhum colaborador encontrado com "{searchTerm}"</p>
                  ) : (
                    <p>Todos os colaboradores já foram associados a cargos</p>
                  )}
                </div>
              ) : (
                filteredEmployees.map(emp => (
                  <Card
                    key={emp.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => {
                      handleAddEmployee(selectedNode, emp.id);
                      setIsDialogOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {emp.profile_picture_url ? (
                        <img
                          src={emp.profile_picture_url}
                          alt={emp.full_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <UserCircle className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{emp.full_name}</p>
                        <p className="text-sm text-gray-600">{emp.position}</p>
                        {emp.job_role && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {emp.job_role}
                          </p>
                        )}
                      </div>
                      <Plus className="w-5 h-5 text-blue-600" />
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}