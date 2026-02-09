import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2, CheckCircle, Calendar } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PublishCourseDialog({ open, onClose, course, onSuccess }) {
  const [status, setStatus] = useState(course?.status || 'rascunho');
  const [releaseDate, setReleaseDate] = useState(course?.release_date || '');
  const [saving, setSaving] = useState(false);

  const handlePublish = async () => {
    setSaving(true);
    try {
      const data = {
        status,
        release_date: status === 'em_breve' ? releaseDate : null
      };

      await base44.entities.TrainingCourse.update(course.id, data);
      toast.success("Status atualizado com sucesso!");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error("Erro ao publicar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publicar Curso: {course?.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Controle quando e como este curso será exibido na Academia de Treinamento
            </AlertDescription>
          </Alert>

          <div>
            <Label>Status de Publicação</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rascunho">
                  Rascunho (não visível)
                </SelectItem>
                <SelectItem value="publicado">
                  Publicado (disponível agora)
                </SelectItem>
                <SelectItem value="em_breve">
                  Em Breve (agendado)
                </SelectItem>
                <SelectItem value="arquivado">
                  Arquivado (oculto)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {status === 'em_breve' && (
            <div>
              <Label>Data de Liberação</Label>
              <Input
                type="datetime-local"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                O curso será automaticamente publicado nesta data
              </p>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-900 font-medium mb-2">
              O que acontece ao publicar?
            </p>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• O curso fica visível na Academia de Treinamento</li>
              <li>• Usuários com permissão podem começar a assistir</li>
              <li>• O progresso será rastreado automaticamente</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handlePublish} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar Status
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}