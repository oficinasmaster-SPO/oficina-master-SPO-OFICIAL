import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit2, Trash2, Loader2, Globe, Building2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

const CATEGORIAS = [
  "operacional",
  "pessoas",
  "marketing",
  "manutencao",
  "terceirizados",
  "administrativo",
  "financeiro",
  "pecas_estoque",
  "pecas_aplicadas",
  "servicos",
  "outras"
];

export default function GerenciarSubcategorias({ workshopId }) {
  const queryClient = useQueryClient();
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("operacional");
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    label: "",
    ordem: "",
    entra_tcmp2: true,
  });

  // Carregar usuário para verificar permissões
  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: () => base44.auth.me(),
  });

  // Verificar se é admin ou owner
  const canEdit = user?.role === "admin" || user?.data?.workshop_id === workshopId;

  // Carregar subcategorias globais
  const { data: subcategoriasGlobais = [], isLoading: loadingGlobais } = useQuery({
    queryKey: ["subcategorias-dre", "global", categoriaSelecionada],
    queryFn: () => base44.entities.SubcategoriaDRE.filter({
      categoria: categoriaSelecionada,
      workshop_id: null,
      ativo: true
    }, "ordem", 100),
    enabled: !!categoriaSelecionada,
  });

  // Carregar subcategorias customizadas
  const { data: subcategoriasCustomizadas = [], isLoading: loadingCustom } = useQuery({
    queryKey: ["subcategorias-dre", workshopId, categoriaSelecionada],
    queryFn: () => base44.entities.SubcategoriaDRE.filter({
      categoria: categoriaSelecionada,
      workshop_id: workshopId,
      ativo: true
    }, "ordem", 100),
    enabled: !!categoriaSelecionada && !!workshopId,
  });

  // Criar/Atualizar subcategoria
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        categoria: categoriaSelecionada,
        ...data,
        tipo: categoriaSelecionada.startsWith("receita") || ["pecas_aplicadas", "servicos", "outras"].includes(categoriaSelecionada) ? "receita" : "despesa",
        ativo: true,
      };

      if (editingId) {
        return await base44.entities.SubcategoriaDRE.update(editingId, payload);
      } else {
        return await base44.entities.SubcategoriaDRE.create({
          ...payload,
          workshop_id: workshopId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategorias-dre"] });
      toast.success(editingId ? "Subcategoria atualizada!" : "Subcategoria criada!");
      resetForm();
    },
    onError: () => {
      toast.error("Erro ao salvar subcategoria");
    }
  });

  // Deletar subcategoria
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.SubcategoriaDRE.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategorias-dre"] });
      toast.success("Subcategoria deletada!");
    },
    onError: () => {
      toast.error("Erro ao deletar subcategoria");
    }
  });

  // Ativar/Desativar subcategoria
  const toggleAtivoMutation = useMutation({
    mutationFn: async ({ id, ativo }) => {
      return await base44.entities.SubcategoriaDRE.update(id, { ativo });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategorias-dre"] });
      toast.success("Status atualizado!");
    }
  });

  const resetForm = () => {
    setFormData({ label: "", ordem: "", entra_tcmp2: true });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (subcat) => {
    setFormData({
      label: subcat.label,
      ordem: String(subcat.ordem || ""),
      entra_tcmp2: subcat.entra_tcmp2 ?? true,
    });
    setEditingId(subcat.id);
    setShowForm(true);
  };

  const handleDelete = (subcat) => {
    if (window.confirm(`Tem certeza que deseja deletar "${subcat.label}"?`)) {
      deleteMutation.mutate(subcat.id);
    }
  };

  const handleToggleAtivo = (subcat) => {
    toggleAtivoMutation.mutate({ id: subcat.id, ativo: !subcat.ativo });
  };

  if (!canEdit) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <XCircle className="w-12 h-12 mx-auto mb-2 text-red-500" />
            <p className="font-semibold">Acesso Restrito</p>
            <p className="text-sm">Apenas administradores ou owners da oficina podem gerenciar subcategorias.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner Explicativo */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">📚 Sistema de Subcategorias Dinâmicas</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Subcategorias Globais:</strong> Padrão do sistema (somente leitura)</li>
                <li>• <strong>Subcategorias Customizadas:</strong> Criadas pela sua oficina (editáveis)</li>
                <li>• <strong>Permissões:</strong> Apenas admin ou owner podem criar/editar</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seletor de Categoria */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIAS.map(cat => (
          <Button
            key={cat}
            size="sm"
            variant={categoriaSelecionada === cat ? "default" : "outline"}
            onClick={() => setCategoriaSelecionada(cat)}
            className={categoriaSelecionada === cat ? "bg-blue-600 hover:bg-blue-700" : ""}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Formulário de Criação/Edição */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "✏️ Editar Subcategoria" : "➕ Nova Subcategoria"}</CardTitle>
            <CardDescription>Categoria: <strong>{categoriaSelecionada}</strong></CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Nome da Subcategoria *</Label>
                <Input
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="Ex: Assinatura de software"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Ordem (opcional)</Label>
                  <Input
                    type="number"
                    value={formData.ordem}
                    onChange={(e) => setFormData({ ...formData, ordem: e.target.value })}
                    placeholder="999"
                  />
                  <p className="text-xs text-gray-500 mt-1">Menor = aparece primeiro</p>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    id="entra-tcmp2"
                    checked={formData.entra_tcmp2}
                    onCheckedChange={(checked) => setFormData({ ...formData, entra_tcmp2: checked })}
                  />
                  <Label htmlFor="entra-tcmp2">Entra no TCMP²</Label>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button
                  onClick={() => saveMutation.mutate(formData)}
                  disabled={saveMutation.isPending || !formData.label.trim()}
                >
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {editingId ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Subcategorias */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Subcategorias Globais */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              <CardTitle>Subcategorias Globais</CardTitle>
              <Badge variant="outline">{subcategoriasGlobais.length}</Badge>
            </div>
            <CardDescription>Padrão do sistema (somente leitura)</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingGlobais ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
              </div>
            ) : subcategoriasGlobais.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma subcategoria global nesta categoria.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {subcategoriasGlobais.map(subcat => (
                  <div key={subcat.id} className="p-3 border rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{subcat.label}</p>
                        <p className="text-xs text-gray-500">Ordem: {subcat.ordem || 999}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={subcat.entra_tcmp2 ? "default" : "secondary"} className="text-xs">
                          {subcat.entra_tcmp2 ? "TCMP²" : "Fora TCMP²"}
                        </Badge>
                        <Badge variant={subcat.ativo ? "default" : "secondary"} className="text-xs">
                          {subcat.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subcategorias Customizadas */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-green-600" />
                <CardTitle>Subcategorias da Oficina</CardTitle>
                <Badge variant="outline">{subcategoriasCustomizadas.length}</Badge>
              </div>
              {!showForm && (
                <Button size="sm" onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Nova
                </Button>
              )}
            </div>
            <CardDescription>Criadas pela sua oficina (editáveis)</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCustom ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
              </div>
            ) : subcategoriasCustomizadas.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma subcategoria customizada. Clique em "Nova" para criar.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {subcategoriasCustomizadas.map(subcat => (
                  <div key={subcat.id} className="p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{subcat.label}</p>
                        <p className="text-xs text-gray-500">Ordem: {subcat.ordem || 999}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={subcat.entra_tcmp2 ? "default" : "secondary"} className="text-xs">
                          {subcat.entra_tcmp2 ? "TCMP²" : "Fora TCMP²"}
                        </Badge>
                        <Switch
                          checked={subcat.ativo}
                          onCheckedChange={() => handleToggleAtivo(subcat)}
                          className="scale-75"
                        />
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(subcat)}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(subcat)}>
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}