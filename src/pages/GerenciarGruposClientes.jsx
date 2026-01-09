import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Users, Plus, Edit2, Trash2, Eye, Save, X } from "lucide-react";
import { toast } from "sonner";
import ClientGroupForm from "@/components/aceleracao/ClientGroupForm";

export default function GerenciarGruposClientes() {
  const [groups, setGroups] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);

  // Carregar grupos do localStorage
  useEffect(() => {
    const saved = localStorage.getItem("client-groups");
    if (saved) setGroups(JSON.parse(saved));
  }, []);

  // Salvar grupos no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem("client-groups", JSON.stringify(groups));
  }, [groups]);

  const { data: workshops } = useQuery({
    queryKey: ['workshops-grupos'],
    queryFn: async () => {
      const all = await base44.entities.Workshop.list();
      return all.filter(w => w.planoAtual && w.planoAtual !== 'FREE');
    }
  });

  const handleSaveGroup = (groupData) => {
    if (editingGroup) {
      setGroups(groups.map(g => g.id === editingGroup.id ? { ...groupData, id: editingGroup.id } : g));
      toast.success("Grupo atualizado!");
    } else {
      setGroups([...groups, { ...groupData, id: Date.now() }]);
      toast.success("Grupo criado!");
    }
    setShowForm(false);
    setEditingGroup(null);
  };

  const deleteGroup = (id) => {
    setGroups(groups.filter(g => g.id !== id));
    toast.success("Grupo deletado");
  };

  const duplicateGroup = (group) => {
    const newGroup = {
      ...group,
      id: Date.now(),
      name: `${group.name} (Cópia)`
    };
    setGroups([...groups, newGroup]);
    toast.success("Grupo duplicado!");
  };

  const getWorkshopName = (id) => {
    return workshops?.find(w => w.id === id)?.name || id;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-8 h-8 text-blue-600" />
            Grupos de Clientes
          </h1>
          <p className="text-gray-600 mt-1">
            Organize clientes em grupos para registros e ATAs em lote
          </p>
        </div>
        <Button 
          onClick={() => {
            setEditingGroup(null);
            setShowForm(true);
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Grupo
        </Button>
      </div>

      {/* Lista de Grupos */}
      {groups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map(group => (
            <Card key={group.id} className="hover:shadow-lg transition">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <p className="text-xs text-gray-600 mt-1">
                      {group.clientIds?.length || 0} cliente(s)
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {group.clientIds?.length || 0}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Preview dos clientes */}
                <div className="max-h-20 overflow-y-auto text-xs space-y-1">
                  {group.clientIds?.slice(0, 3).map(id => (
                    <p key={id} className="text-gray-700 truncate">
                      • {getWorkshopName(id)}
                    </p>
                  ))}
                  {group.clientIds?.length > 3 && (
                    <p className="text-gray-500 italic">
                      +{group.clientIds.length - 3} mais...
                    </p>
                  )}
                </div>

                {/* Ações */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8"
                    onClick={() => setShowDetails(group)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Ver
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8"
                    onClick={() => {
                      setEditingGroup(group);
                      setShowForm(true);
                    }}
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => duplicateGroup(group)}
                    title="Duplicar"
                  >
                    +
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-red-600 hover:text-red-700"
                    onClick={() => deleteGroup(group.id)}
                    title="Deletar"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">Nenhum grupo criado ainda</p>
          <Button 
            className="mt-4 bg-blue-600 hover:bg-blue-700"
            onClick={() => setShowForm(true)}
          >
            Criar Primeiro Grupo
          </Button>
        </Card>
      )}

      {/* Modal de Formulário */}
      {showForm && (
        <ClientGroupForm
          group={editingGroup}
          workshops={workshops || []}
          onSave={handleSaveGroup}
          onCancel={() => {
            setShowForm(false);
            setEditingGroup(null);
          }}
        />
      )}

      {/* Modal de Detalhes */}
      {showDetails && (
        <Dialog open={!!showDetails} onOpenChange={() => setShowDetails(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{showDetails.name}</DialogTitle>
              <p className="text-sm text-gray-600">
                {showDetails.clientIds?.length || 0} cliente(s)
              </p>
            </DialogHeader>

            <div className="space-y-3 max-h-96 overflow-y-auto py-4">
              {showDetails.clientIds?.map(id => {
                const w = workshops?.find(ws => ws.id === id);
                return w ? (
                  <div key={id} className="flex items-center justify-between p-2 border rounded text-sm">
                    <div>
                      <p className="font-medium">{w.name}</p>
                      <p className="text-xs text-gray-600">{w.city} - {w.state}</p>
                    </div>
                    <Badge variant="outline">{w.planoAtual}</Badge>
                  </div>
                ) : null;
              })}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetails(null)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}