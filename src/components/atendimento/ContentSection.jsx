import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Video, Trash2 } from "lucide-react";
import MediaUploadField from "@/components/aceleracao/MediaUploadField";
import ProcessSearchSelect from "@/components/aceleracao/ProcessSearchSelect";

export default function ContentSection({ formData, setFormData, processos, todasAulas, cursos }) {
  const addProcesso = (processoId) => {
    const processo = processos?.find(p => p.id === processoId);
    if (processo && !formData.processos_vinculados.find(p => p.id === processoId)) {
      setFormData(prev => ({
        ...prev,
        processos_vinculados: [...prev.processos_vinculados, {
          id: processo.id,
          titulo: processo.title,
          categoria: processo.category,
          url: processo.file_url
        }]
      }));
    }
  };

  const removeProcesso = (index) => {
    setFormData(prev => ({
      ...prev,
      processos_vinculados: prev.processos_vinculados.filter((_, i) => i !== index)
    }));
  };

  const addVideoaula = (aulaId) => {
    const aula = todasAulas?.find(a => a.id === aulaId);
    if (aula && !formData.videoaulas_vinculadas.find(v => v.id === aulaId)) {
      const curso = cursos?.find(c => c.id === aula.course_id);
      setFormData(prev => ({
        ...prev,
        videoaulas_vinculadas: [...prev.videoaulas_vinculadas, {
          id: aula.id,
          titulo: aula.title,
          descricao: curso?.title || "",
          video_url: aula.video_url
        }]
      }));
    }
  };

  const removeVideoaula = (index) => {
    setFormData(prev => ({
      ...prev,
      videoaulas_vinculadas: prev.videoaulas_vinculadas.filter((_, i) => i !== index)
    }));
  };

  return (
    <>
      {/* Mídias */}
      <Card>
        <CardHeader>
          <CardTitle>Mídias e Anexos para o Cliente</CardTitle>
          <p className="text-sm text-gray-600">Upload de arquivos, links e documentos do repositório</p>
        </CardHeader>
        <CardContent>
          <MediaUploadField
            midias={formData.midias_anexas}
            onChange={(midias) => setFormData(prev => ({ ...prev, midias_anexas: midias }))}
          />
        </CardContent>
      </Card>

      {/* Processos e Conteúdo */}
      <Card>
        <CardHeader>
          <CardTitle>Processos e Conteúdo Compartilhado</CardTitle>
          <p className="text-sm text-gray-600">Vincule processos, videoaulas e documentos discutidos na reunião</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Processos (MAPs) */}
          <div>
            <Label className="text-base font-semibold flex items-center gap-2 mb-3">
              <Package className="w-4 h-4" />
              Processos (MAPs)
            </Label>
            <div className="space-y-2">
              <ProcessSearchSelect
                processos={processos}
                selectedIds={formData.processos_vinculados.map(p => p.id)}
                onAdd={addProcesso}
              />
              {formData.processos_vinculados.length > 0 && (
                <div className="mt-3 space-y-2">
                  {formData.processos_vinculados.map((processo, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-sm">{processo.titulo}</p>
                          <p className="text-xs text-gray-600">{processo.categoria}</p>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeProcesso(idx)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Videoaulas */}
          <div>
            <Label className="text-base font-semibold flex items-center gap-2 mb-3">
              <Video className="w-4 h-4" />
              Videoaulas e Treinamentos
            </Label>
            <div className="space-y-2">
              <Select onValueChange={addVideoaula}>
                <SelectTrigger>
                  <SelectValue placeholder="Adicionar videoaula..." />
                </SelectTrigger>
                <SelectContent>
                  {todasAulas?.filter(a => !formData.videoaulas_vinculadas.find(v => v.id === a.id)).map((aula) => {
                    const curso = cursos?.find(c => c.id === aula.course_id);
                    return (
                      <SelectItem key={aula.id} value={aula.id}>
                        {curso?.title} - {aula.title}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {formData.videoaulas_vinculadas.length > 0 && (
                <div className="mt-3 space-y-2">
                  {formData.videoaulas_vinculadas.map((video, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-3">
                        <Video className="w-5 h-5 text-purple-600" />
                        <div>
                          <p className="font-medium text-sm">{video.titulo}</p>
                          <p className="text-xs text-gray-600">{video.descricao}</p>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeVideoaula(idx)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}