import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, FileCheck, ClipboardList, Trash2, Edit, Upload } from "lucide-react";
import { toast } from "sonner";

export default function ITManager({ mapId, workshopId }) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    title: "",
    type: "IT",
    description: "",
    content: {
      objetivo: "",
      procedimento: "",
      recursos_necessarios: [],
      pontos_criticos: []
    },
    file_url: ""
  });

  const { data: its = [], isLoading } = useQuery({
    queryKey: ['its', mapId],
    queryFn: async () => {
      const result = await base44.entities.InstructionDocument.filter({ parent_map_id: mapId });
      return result.sort((a, b) => (a.order || 0) - (b.order || 0));
    },
    enabled: !!mapId
  });

  const generateCode = async (type) => {
    const prefix = type === 'IT' ? 'IT' : 'FR';
    const existingCodes = its.filter(it => it.code?.startsWith(prefix));
    const numbers = existingCodes.map(it => {
      const match = it.code.match(/\d+/);
      return match ? parseInt(match[0]) : 0;
    });
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    return `${prefix}-${String(maxNumber + 1).padStart(4, '0')}`;
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const code = await generateCode(data.type);
      return await base44.entities.InstructionDocument.create({
        parent_map_id: mapId,
        workshop_id: workshopId,
        code,
        version: "1",
        status: "ativo",
        ...data
      });
    },
    onSuccess: () => {
      toast.success("Documento criado!");
      queryClient.invalidateQueries(['its', mapId]);
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => await base44.entities.InstructionDocument.delete(id),
    onSuccess: () => {
      toast.success("Documento removido!");
      queryClient.invalidateQueries(['its', mapId]);
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, file_url });
      toast.success("Arquivo enviado!");
    } catch (error) {
      toast.error("Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      type: "IT",
      description: "",
      content: { objetivo: "", procedimento: "", recursos_necessarios: [], pontos_criticos: [] },
      file_url: ""
    });
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Instruções de Trabalho & Formulários</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar IT/FR
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Instrução/Formulário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Título</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Abertura de OS"
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IT">IT - Instrução de Trabalho</SelectItem>
                    <SelectItem value="FR">FR - Formulário/Registro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <Label>Upload de Arquivo (Opcional)</Label>
                <Input type="file" onChange={handleFileUpload} disabled={uploading} />
              </div>
              <Button
                onClick={() => saveMutation.mutate(formData)}
                disabled={saveMutation.isPending || !formData.title}
                className="w-full"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Documento'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {its.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="p-8 text-center">
            <FileCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhuma IT ou FR vinculada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {its.map((it) => {
            const Icon = it.type === 'IT' ? FileCheck : ClipboardList;
            return (
              <Card key={it.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${it.type === 'IT' ? 'text-green-600' : 'text-orange-600'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{it.code}</span>
                        <span className="text-gray-900">{it.title}</span>
                        <Badge variant="outline">{it.type}</Badge>
                      </div>
                      {it.description && (
                        <p className="text-sm text-gray-600 mt-1">{it.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {it.file_url && (
                        <Button size="sm" variant="ghost" onClick={() => window.open(it.file_url, '_blank')}>
                          Ver Arquivo
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Excluir este documento?")) {
                            deleteMutation.mutate(it.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}