import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import OrgChartViewer from "./OrgChartViewer";

const AREA_OPTIONS = [
  { value: "diretoria", label: "Diretoria" },
  { value: "vendas", label: "Vendas" },
  { value: "comercial", label: "Comercial" },
  { value: "marketing", label: "Marketing" },
  { value: "financeiro", label: "Financeiro" },
  { value: "estoque", label: "Estoque" },
  { value: "operacao", label: "Operação" },
  { value: "tecnico", label: "Técnico" },
  { value: "administrativo", label: "Administrativo" },
  { value: "rh", label: "RH" },
  { value: "outros", label: "Outros" }
];

const COLOR_OPTIONS = [
  { value: "#EF4444", label: "Vermelho" },
  { value: "#3B82F6", label: "Azul" },
  { value: "#10B981", label: "Verde" },
  { value: "#F59E0B", label: "Laranja" },
  { value: "#8B5CF6", label: "Roxo" },
  { value: "#EC4899", label: "Rosa" },
  { value: "#6B7280", label: "Cinza" },
];

export default function OrgChartEditor({ nodes, workshopId, onCreateNode, onUpdateNode, onDeleteNode }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    area: "diretoria",
    parent_node_id: null,
    level: 1,
    color: "#EF4444",
    order: 0,
  });

  const resetForm = () => {
    setFormData({
      title: "",
      area: "diretoria",
      parent_node_id: null,
      level: 1,
      color: "#EF4444",
      order: 0,
    });
    setEditingNode(null);
  };

  const handleOpenDialog = (node = null, parentNode = null) => {
    if (node) {
      setEditingNode(node);
      setFormData({
        title: node.title,
        area: node.area,
        parent_node_id: node.parent_node_id,
        level: node.level,
        color: node.color || "#EF4444",
        order: node.order || 0,
      });
    } else if (parentNode) {
      setFormData({
        ...formData,
        parent_node_id: parentNode.node_id,
        level: parentNode.level + 1,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    const nodeData = {
      ...formData,
      workshop_id: workshopId,
      node_id: editingNode?.node_id || `node_${Date.now()}`,
      is_active: true,
    };

    if (editingNode) {
      onUpdateNode({ id: editingNode.id, data: nodeData });
    } else {
      onCreateNode(nodeData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (node) => {
    if (confirm(`Confirma a exclusão de "${node.title}"?`)) {
      onDeleteNode(node.id);
    }
  };

  const handleReorder = (node, direction) => {
    const newOrder = (node.order || 0) + (direction === 'up' ? -1 : 1);
    onUpdateNode({ id: node.id, data: { ...node, order: newOrder } });
  };

  const buildTree = (parentId = null) => {
    return nodes
      .filter(node => node.parent_node_id === parentId && node.is_active)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  const renderNodeEditor = (node, level = 0) => {
    const children = buildTree(node?.node_id);
    
    return (
      <div key={node.id} className="ml-8 mt-4">
        <div className="flex items-center gap-3 p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: node.color || '#EF4444' }}
          />
          <div className="flex-1">
            <div className="font-semibold">{node.title}</div>
            <div className="text-xs text-gray-500">
              Nível {node.level} • {AREA_OPTIONS.find(a => a.value === node.area)?.label}
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => handleReorder(node, 'up')}>
              <ArrowUp className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleReorder(node, 'down')}>
              <ArrowDown className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(node)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(null, node)}>
              <Plus className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleDelete(node)}>
              <Trash2 className="w-4 h-4 text-red-600" />
            </Button>
          </div>
        </div>
        {children.map(child => renderNodeEditor(child, level + 1))}
      </div>
    );
  };

  const rootNodes = buildTree(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Editor de Estrutura</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Nó Raiz
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingNode ? "Editar Nó" : "Adicionar Nó"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Título do Cargo</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Gerente Geral, Líder de Vendas"
                />
              </div>
              <div>
                <Label>Área</Label>
                <Select
                  value={formData.area}
                  onValueChange={(value) => setFormData({ ...formData, area: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AREA_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cor</Label>
                <Select
                  value={formData.color}
                  onValueChange={(value) => setFormData({ ...formData, color: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: option.value }}
                          />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit}>
                  {editingNode ? "Salvar" : "Criar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg p-4 bg-gray-50">
        {rootNodes.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            Nenhum nó criado. Clique em "Adicionar Nó Raiz" para começar.
          </p>
        ) : (
          <div>
            {rootNodes.map(node => renderNodeEditor(node))}
          </div>
        )}
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">Pré-visualização</h3>
        <div className="bg-white border rounded-lg p-6">
          <OrgChartViewer nodes={nodes} />
        </div>
      </div>
    </div>
  );
}