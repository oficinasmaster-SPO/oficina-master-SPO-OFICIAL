import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, FileText, Camera, Download, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function DocumentosAnexos({ employee, onUpdate }) {
  const [showDocDialog, setShowDocDialog] = useState(false);
  const [showAtestadoDialog, setShowAtestadoDialog] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingAtestado, setUploadingAtestado] = useState(false);

  const [docForm, setDocForm] = useState({
    type: "",
    name: "",
    file: null
  });

  const [atestadoForm, setAtestadoForm] = useState({
    days: "",
    notes: "",
    file: null
  });

  const handleDocUpload = async () => {
    if (!docForm.file || !docForm.type || !docForm.name) {
      toast.error("Preencha todos os campos");
      return;
    }

    setUploadingDoc(true);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: docForm.file });

      const newDoc = {
        type: docForm.type,
        name: docForm.name,
        url: file_url,
        date: new Date().toISOString()
      };

      const updatedDocs = [...(employee.documents || []), newDoc];
      await onUpdate({ documents: updatedDocs });

      setShowDocDialog(false);
      setDocForm({ type: "", name: "", file: null });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao fazer upload");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleAtestadoUpload = async () => {
    if (!atestadoForm.file || !atestadoForm.days) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setUploadingAtestado(true);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: atestadoForm.file });

      const newAtestado = {
        date: new Date().toISOString(),
        url: file_url,
        days: parseInt(atestadoForm.days),
        notes: atestadoForm.notes
      };

      const updatedAtestados = [...(employee.medical_certificates || []), newAtestado];
      await onUpdate({ medical_certificates: updatedAtestados });

      setShowAtestadoDialog(false);
      setAtestadoForm({ days: "", notes: "", file: null });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao fazer upload");
    } finally {
      setUploadingAtestado(false);
    }
  };

  const handleDeleteDoc = async (index) => {
    const updatedDocs = employee.documents.filter((_, i) => i !== index);
    await onUpdate({ documents: updatedDocs });
  };

  const handleDeleteAtestado = async (index) => {
    const updatedAtestados = employee.medical_certificates.filter((_, i) => i !== index);
    await onUpdate({ medical_certificates: updatedAtestados });
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documentos Anexados
            </CardTitle>
            <Button onClick={() => setShowDocDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Documento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!employee.documents || employee.documents.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhum documento anexado</p>
          ) : (
            <div className="space-y-2">
              {employee.documents.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-semibold text-sm">{doc.name}</p>
                      <p className="text-xs text-gray-600">
                        {doc.type} • {new Date(doc.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" onClick={() => window.open(doc.url, '_blank')}>
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="destructive" onClick={() => handleDeleteDoc(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg border-2 border-red-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-red-600" />
              Atestados Médicos
            </CardTitle>
            <Button onClick={() => setShowAtestadoDialog(true)} className="bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-2" />
              Enviar Atestado
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!employee.medical_certificates || employee.medical_certificates.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhum atestado médico registrado</p>
          ) : (
            <div className="space-y-2">
              {employee.medical_certificates.map((cert, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-3">
                    <Camera className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="font-semibold text-sm">{cert.days} dias de afastamento</p>
                      <p className="text-xs text-gray-600">
                        {new Date(cert.date).toLocaleDateString('pt-BR')}
                      </p>
                      {cert.notes && <p className="text-xs text-gray-500 mt-1">{cert.notes}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" onClick={() => window.open(cert.url, '_blank')}>
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="destructive" onClick={() => handleDeleteAtestado(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDocDialog} onOpenChange={setShowDocDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Documento</Label>
              <Input
                placeholder="Ex: RG, CPF, Contrato..."
                value={docForm.type}
                onChange={(e) => setDocForm({...docForm, type: e.target.value})}
              />
            </div>
            <div>
              <Label>Nome do Arquivo</Label>
              <Input
                placeholder="Ex: RG frente e verso"
                value={docForm.name}
                onChange={(e) => setDocForm({...docForm, name: e.target.value})}
              />
            </div>
            <div>
              <Label>Arquivo</Label>
              <Input
                type="file"
                onChange={(e) => setDocForm({...docForm, file: e.target.files[0]})}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDocDialog(false)}>Cancelar</Button>
              <Button onClick={handleDocUpload} disabled={uploadingDoc}>
                {uploadingDoc ? "Enviando..." : "Adicionar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAtestadoDialog} onOpenChange={setShowAtestadoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Atestado Médico</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Dias de Afastamento *</Label>
              <Input
                type="number"
                value={atestadoForm.days}
                onChange={(e) => setAtestadoForm({...atestadoForm, days: e.target.value})}
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Input
                placeholder="Informações adicionais..."
                value={atestadoForm.notes}
                onChange={(e) => setAtestadoForm({...atestadoForm, notes: e.target.value})}
              />
            </div>
            <div>
              <Label>Foto do Atestado *</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setAtestadoForm({...atestadoForm, file: e.target.files[0]})}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAtestadoDialog(false)}>Cancelar</Button>
              <Button onClick={handleAtestadoUpload} disabled={uploadingAtestado} className="bg-red-600 hover:bg-red-700">
                {uploadingAtestado ? "Enviando..." : "Enviar Atestado"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}