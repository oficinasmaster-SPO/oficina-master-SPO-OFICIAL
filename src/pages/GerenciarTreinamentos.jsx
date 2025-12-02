import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, BookOpen, Edit, Trash2, Eye, Users, MoreVertical, Video, FileText } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function GerenciarTreinamentos() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState([]);
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "rascunho",
    cover_image_url: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === currentUser.id);
      setWorkshop(userWorkshop);

      // Fetch modules (both global and workshop specific)
      // Note: Filtering logic might need adjustment depending on exact requirements.
      // For now, fetching all and filtering in memory or simple filter.
      // Assuming admin sees everything or filtered by workshop.
      
      let allModules = [];
      if (userWorkshop) {
          allModules = await base44.entities.TrainingModule.filter({ workshop_id: userWorkshop.id });
      } else {
          // Se não tem oficina, talvez seja um admin global ou usuário sem oficina
          allModules = await base44.entities.TrainingModule.list();
      }
      
      setModules(allModules.sort((a, b) => a.order - b.order));

    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar treinamentos");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title) {
      toast.error("Título é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const data = {
        ...formData,
        workshop_id: workshop?.id || null,
        order: editingModule ? editingModule.order : modules.length + 1
      };

      if (editingModule) {
        await base44.entities.TrainingModule.update(editingModule.id, data);
        toast.success("Módulo atualizado!");
      } else {
        await base44.entities.TrainingModule.create(data);
        toast.success("Módulo criado!");
      }

      setIsModalOpen(false);
      setEditingModule(null);
      setFormData({ title: "", description: "", status: "rascunho", cover_image_url: "" });
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar módulo");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (module) => {
    setEditingModule(module);
    setFormData({
      title: module.title,
      description: module.description,
      status: module.status,
      cover_image_url: module.cover_image_url || ""
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este módulo?")) return;
    try {
      await base44.entities.TrainingModule.delete(id);
      toast.success("Módulo excluído");
      loadData();
    } catch (error) {
      toast.error("Erro ao excluir");
    }
  };

  const openModal = () => {
    setEditingModule(null);
    setFormData({ title: "", description: "", status: "rascunho", cover_image_url: "" });
    setIsModalOpen(true);
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Gestão de Treinamentos</h1>
            <p className="text-slate-600">Crie e gerencie módulos, aulas e avaliações para sua equipe.</p>
          </div>
          <div className="flex gap-2">
             <Button variant="outline" onClick={() => navigate(createPageUrl("AcompanhamentoTreinamento"))}>
                <Users className="w-4 h-4 mr-2" />
                Acompanhar Equipe
             </Button>
             <Button onClick={openModal} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Novo Módulo
             </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-lg border border-dashed border-slate-300">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Nenhum módulo de treinamento encontrado.</p>
                <Button variant="link" onClick={openModal}>Criar o primeiro módulo</Button>
            </div>
          ) : (
            modules.map((module) => (
              <Card key={module.id} className="group hover:shadow-lg transition-all duration-300 overflow-hidden border-slate-200">
                <div className="h-32 bg-slate-200 relative">
                    {module.cover_image_url ? (
                        <img src={module.cover_image_url} alt={module.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100">
                            <BookOpen className="w-10 h-10 text-slate-300" />
                        </div>
                    )}
                    <div className="absolute top-2 right-2">
                        <Badge variant={module.status === 'publicado' ? 'default' : 'secondary'} className={module.status === 'publicado' ? 'bg-green-600' : ''}>
                            {module.status === 'publicado' ? 'Publicado' : 'Rascunho'}
                        </Badge>
                    </div>
                </div>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{module.title}</h3>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(module)}>
                                <Edit className="w-4 h-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(module.id)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <p className="text-sm text-slate-600 line-clamp-2 mb-4 h-10">
                    {module.description || "Sem descrição."}
                  </p>
                  
                  <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => navigate(`${createPageUrl('GerenciarModulo')}?id=${module.id}`)}
                    >
                        <Video className="w-4 h-4 mr-2" />
                        Gerenciar Aulas
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModule ? "Editar Módulo" : "Novo Módulo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
                <Label>Título</Label>
                <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Ex: Vendas Avançadas" />
            </div>
            <div>
                <Label>Descrição</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="O que será ensinado neste módulo?" />
            </div>
            <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="rascunho">Rascunho</SelectItem>
                        <SelectItem value="publicado">Publicado</SelectItem>
                        <SelectItem value="arquivado">Arquivado</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label>URL da Imagem de Capa (Opcional)</Label>
                <Input value={formData.cover_image_url} onChange={(e) => setFormData({...formData, cover_image_url: e.target.value})} placeholder="https://..." />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}