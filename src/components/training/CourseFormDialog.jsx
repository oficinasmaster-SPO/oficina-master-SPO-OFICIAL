import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function CourseFormDialog({ open, onClose, onSuccess, course, workshopId }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "outros",
    difficulty_level: "iniciante",
    cover_image_url: "",
    trailer_url: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (course) {
      setFormData({
        title: course.title || "",
        description: course.description || "",
        category: course.category || "outros",
        difficulty_level: course.difficulty_level || "iniciante",
        cover_image_url: course.cover_images?.[0] || "",
        trailer_url: course.trailer_url || ""
      });
    } else {
      setFormData({
        title: "",
        description: "",
        category: "outros",
        difficulty_level: "iniciante",
        cover_image_url: "",
        trailer_url: ""
      });
    }
  }, [course, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) {
      toast.error("Título é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const data = {
        ...formData,
        cover_images: formData.cover_image_url ? [formData.cover_image_url] : [],
        workshop_id: workshopId || null,
        status: course?.status || 'rascunho'
      };

      if (course) {
        await base44.entities.TrainingCourse.update(course.id, data);
        toast.success("Curso atualizado!");
      } else {
        await base44.entities.TrainingCourse.create(data);
        toast.success("Curso criado!");
      }

      onSuccess();
      onClose();
    } catch (error) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{course ? "Editar Curso" : "Novo Curso"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Vendas Avançadas"
            />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="O que será ensinado neste curso?"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendas">Vendas</SelectItem>
                  <SelectItem value="tecnico">Técnico</SelectItem>
                  <SelectItem value="gestao">Gestão</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="rh">RH</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Dificuldade</Label>
              <Select
                value={formData.difficulty_level}
                onValueChange={(value) => setFormData({ ...formData, difficulty_level: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="iniciante">Iniciante</SelectItem>
                  <SelectItem value="intermediario">Intermediário</SelectItem>
                  <SelectItem value="avancado">Avançado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>URL da Imagem de Capa</Label>
            <Input
              value={formData.cover_image_url}
              onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div>
            <Label>URL do Trailer (vídeo)</Label>
            <Input
              value={formData.trailer_url}
              onChange={(e) => setFormData({ ...formData, trailer_url: e.target.value })}
              placeholder="https://youtube.com/..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {course ? "Atualizar" : "Criar Curso"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}