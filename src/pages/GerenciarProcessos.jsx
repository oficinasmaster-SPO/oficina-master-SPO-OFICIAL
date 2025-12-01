import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Upload, FileText, Trash2, Edit, Search } from "lucide-react";
import { toast } from "sonner";

export default function GerenciarProcessos() {
  const [user, setUser] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    code: "",
    revision: "1",
    category: "",
    description: "",
    pdf_url: "",
    plan_access: ["FREE", "START", "BRONZE", "PRATA", "GOLD", "IOM", "MILLIONS"],
    is_template: true
  });
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(console.error);
  }, []);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['process-documents'],
    queryFn: async () => {
      return await base44.entities.ProcessDocument.list();
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingDoc) {
        return await base44.entities.ProcessDocument.update(editingDoc.id, data);
      } else {
        return await base44.entities.ProcessDocument.create(data);
      }
    },
    onSuccess: () => {
      toast.success(editingDoc ? "Processo atualizado!" : "Processo criado!");
      queryClient.invalidateQueries(['process-documents']);
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error("Erro ao salvar processo.")
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => await base44.entities.ProcessDocument.delete(id),
    onSuccess: () => {
      toast.success("Processo removido!");
      queryClient.invalidateQueries(['process-documents']);
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, pdf_url: file_url }));
      toast.success("Arquivo enviado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro no upload do arquivo.");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      code: "",
      revision: "1",
      category: "",
      description: "",
      pdf_url: "",
      plan_access: ["FREE", "START", "BRONZE", "PRATA", "GOLD", "IOM", "MILLIONS"],
      is_template: true
    });
    setEditingDoc(null);
  };

  const handleEdit = (doc) => {
    setEditingDoc(doc);
    setFormData({
      title: doc.title,
      code: doc.code || "",
      revision: doc.revision || "1",
      category: doc.category,
      description: doc.description || "",
      pdf_url: doc.pdf_url,
      plan_access: doc.plan_access || [],
      is_template: doc.is_template
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.category || !formData.pdf_url) {
      toast.error("Preencha os campos obrigatórios e faça o upload do PDF.");
      return;
    }
    saveMutation.mutate(formData);
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (doc.code && doc.code.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    "Vendas", "Comercial", "Pátio", "Financeiro", "Estoque", 
    "Compras", "Contratação", "RH", "Marketing", "Qualidade", "Geral"
  ];

  const plans = ["FREE", "START", "BRONZE", "PRATA", "GOLD", "IOM", "MILLIONS"];

  if (user?.role !== 'admin') {
    return <div className="p-8 text-center">Acesso restrito a administradores.</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar Processos (MAPs)</h1>
          <p className="text-gray-600">Cadastre e organize os documentos de processos da Oficinas Master.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-2" /> Novo Processo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingDoc ? "Editar Processo" : "Novo Processo"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Título *</Label>
                  <Input 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    placeholder="Ex: Precificação R70/I30"
                  />
                </div>
                <div>
                  <Label>Código</Label>
                  <Input 
                    value={formData.code} 
                    onChange={e => setFormData({...formData, code: e.target.value})} 
                    placeholder="Ex: MAP.0003"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Categoria *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={value => setFormData({...formData, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Revisão</Label>
                  <Input 
                    value={formData.revision} 
                    onChange={e => setFormData({...formData, revision: e.target.value})} 
                  />
                </div>
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="Breve resumo do processo..."
                />
              </div>

              <div>
                <Label>Arquivo PDF *</Label>
                <div className="flex gap-2 items-center mt-1">
                  <Input 
                    type="file" 
                    accept=".pdf" 
                    onChange={handleFileUpload}
                    className="cursor-pointer"
                  />
                  {uploading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                </div>
                {formData.pdf_url && (
                  <p className="text-xs text-green-600 mt-1 flex items-center">
                    <FileText className="w-3 h-3 mr-1" /> Arquivo carregado
                  </p>
                )}
              </div>

              <div>
                <Label className="mb-2 block">Planos com Acesso</Label>
                <div className="flex flex-wrap gap-3">
                  {plans.map(plan => (
                    <div key={plan} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`plan-${plan}`}
                        checked={formData.plan_access.includes(plan)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({ ...prev, plan_access: [...prev.plan_access, plan] }));
                          } else {
                            setFormData(prev => ({ ...prev, plan_access: prev.plan_access.filter(p => p !== plan) }));
                          }
                        }}
                      />
                      <label htmlFor={`plan-${plan}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {plan}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="is_template" 
                  checked={formData.is_template}
                  onCheckedChange={(checked) => setFormData({...formData, is_template: checked})}
                />
                <label htmlFor="is_template" className="text-sm font-medium">
                  É um modelo padrão (Template)?
                </label>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saveMutation.isPending || uploading}>
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Salvar Processo
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input 
                placeholder="Buscar por título ou código..." 
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtrar Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Planos</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Nenhum processo encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDocs.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-mono text-xs">{doc.code || "-"}</TableCell>
                        <TableCell>
                          <div className="font-medium">{doc.title}</div>
                          <div className="text-xs text-gray-500">{doc.description && doc.description.substring(0, 50) + "..."}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{doc.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {doc.plan_access?.slice(0, 3).map(p => (
                              <span key={p} className="text-xs bg-gray-100 px-1 rounded">{p}</span>
                            ))}
                            {doc.plan_access?.length > 3 && <span className="text-xs text-gray-500">+{doc.plan_access.length - 3}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="icon" variant="ghost" onClick={() => window.open(doc.pdf_url, '_blank')}>
                              <FileText className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(doc)}>
                              <Edit className="w-4 h-4 text-gray-600" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => {
                              if(confirm("Tem certeza que deseja excluir este processo?")) deleteMutation.mutate(doc.id);
                            }}>
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}