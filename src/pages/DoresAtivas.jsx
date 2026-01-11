import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Loader } from "lucide-react";
import ClientIntelligenceForm from "@/components/inteligencia/ClientIntelligenceForm";
import ClientIntelligenceList from "@/components/inteligencia/ClientIntelligenceList";

export default function DoresAtivas() {
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const loadData = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const workshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
      setWorkshop(workshops?.[0] || null);
    };
    loadData();
  }, []);

  const { data: dores = [], isLoading } = useQuery({
    queryKey: ["client-intelligence", workshop?.id, "dor"],
    queryFn: () =>
      base44.entities.ClientIntelligence.filter({
        workshop_id: workshop?.id,
        type: "dor",
      }),
    enabled: !!workshop?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.ClientIntelligence.create({
        ...data,
        workshop_id: workshop.id,
        type: "dor",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-intelligence", workshop?.id] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientIntelligence.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-intelligence", workshop?.id] });
      setEditingItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientIntelligence.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-intelligence", workshop?.id] });
    },
  });

  const handleSubmit = (formData) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleStatusChange = (id, newStatus) => {
    updateMutation.mutate({
      id,
      data: { status: newStatus },
    });
  };

  if (!workshop) return <div className="text-center py-8">Carregando...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dores Ativas</h1>
          <p className="text-gray-600 mt-2">Gerencie as dores e dificuldades da sua oficina</p>
        </div>

        <Button
          onClick={() => {
            setEditingItem(null);
            setShowForm(!showForm);
          }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Nova Dor
        </Button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold mb-6">
            {editingItem ? "Editar Dor" : "Registrar Nova Dor"}
          </h2>
          <ClientIntelligenceForm
            type="dor"
            item={editingItem}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingItem(null);
            }}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </div>
      )}

      <ClientIntelligenceList
        items={dores}
        onEdit={(item) => {
          setEditingItem(item);
          setShowForm(true);
        }}
        onDelete={(id) => {
          if (confirm("Tem certeza que deseja deletar?")) {
            deleteMutation.mutate(id);
          }
        }}
        onStatusChange={handleStatusChange}
        isLoading={isLoading}
      />
    </div>
  );
}