import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Building2, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

export default function FiliaisWorkshop({ workshop }) {
  const { user } = useAuth();
  const [filiais, setFiliais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newFilial, setNewFilial] = useState({ name: "", city: "", state: "" });

  useEffect(() => {
    loadFiliais();
  }, [workshop.id]);

  const loadFiliais = async () => {
    try {
      setLoading(true);
      // Busca oficinas que têm esta oficina como matriz (company_id)
      const data = await base44.entities.Workshop.filter({ company_id: workshop.id });
      setFiliais(data || []);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar filiais");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFilial = async () => {
    if (!newFilial.name || !newFilial.city || !newFilial.state) {
      toast.error("Preencha nome, cidade e estado");
      return;
    }

    try {
      setIsAdding(true);
      const filial = await base44.entities.Workshop.create({
        name: newFilial.name,
        city: newFilial.city,
        state: newFilial.state,
        company_id: workshop.id,
        owner_id: user.id,
        consulting_firm_id: workshop.consulting_firm_id
      });
      
      setFiliais([...filiais, filial]);
      setNewFilial({ name: "", city: "", state: "" });
      toast.success("Filial adicionada com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao adicionar filial");
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateFilial = async (id, field, value) => {
    // Avoid updating if value hasn't changed effectively
    const currentFilial = filiais.find(f => f.id === id);
    if (currentFilial && currentFilial[field] === value) return;

    try {
      await base44.entities.Workshop.update(id, { [field]: value });
      setFiliais(filiais.map(f => f.id === id ? { ...f, [field]: value } : f));
      toast.success("Filial atualizada!");
    } catch (error) {
      toast.error("Erro ao atualizar filial");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Tem certeza que deseja remover esta filial? A ação não poderá ser desfeita.")) return;
    try {
      await base44.entities.Workshop.delete(id);
      setFiliais(filiais.filter((f) => f.id !== id));
      toast.success("Filial removida!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao remover filial");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Building2 className="w-6 h-6 text-blue-600" />
          Filiais da Oficina (Matriz)
        </CardTitle>
        <p className="text-sm text-gray-500">
          Adicione e gerencie as filiais conectadas a esta matriz. Elas ficarão disponíveis no seletor do topo da página.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-gray-50 p-4 rounded-lg border border-gray-100">
          <div>
            <label className="text-sm font-medium text-gray-700">Nome da Filial</label>
            <Input 
              value={newFilial.name} 
              onChange={(e) => setNewFilial({...newFilial, name: e.target.value})}
              placeholder="Ex: Oficina Master - Centro"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Cidade</label>
            <Input 
              value={newFilial.city} 
              onChange={(e) => setNewFilial({...newFilial, city: e.target.value})}
              placeholder="Sua cidade"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Estado (UF)</label>
            <Input 
              value={newFilial.state} 
              onChange={(e) => setNewFilial({...newFilial, state: e.target.value})}
              placeholder="Ex: SP"
              maxLength={2}
            />
          </div>
          <Button onClick={handleAddFilial} disabled={isAdding} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Adicionar Filial
          </Button>
        </div>

        <div className="space-y-3 mt-6">
          <h3 className="font-medium text-gray-900 mb-2">Filiais Cadastradas</h3>
          {filiais.map((filial) => (
            <div key={filial.id} className="flex flex-col md:flex-row items-center gap-4 p-4 border border-gray-200 rounded-lg bg-white hover:border-gray-300 transition-all shadow-sm">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nome</label>
                  <Input 
                    defaultValue={filial.name} 
                    onBlur={(e) => handleUpdateFilial(filial.id, 'name', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Cidade</label>
                  <Input 
                    defaultValue={filial.city} 
                    onBlur={(e) => handleUpdateFilial(filial.id, 'city', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Estado</label>
                  <Input 
                    defaultValue={filial.state} 
                    onBlur={(e) => handleUpdateFilial(filial.id, 'state', e.target.value)}
                  />
                </div>
              </div>
              <div className="md:mt-5">
                <Button variant="ghost" size="icon" onClick={() => handleDelete(filial.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50" title="Remover filial">
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          ))}
          
          {filiais.length === 0 && (
            <div className="text-center p-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              Nenhuma filial cadastrada para esta matriz no momento.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}