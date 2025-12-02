import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Upload, User, PenTool, Loader2, Camera } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function DadosPessoais({ employee, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const photoInputRef = useRef(null);
  const signatureInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    full_name: employee.full_name || "",
    cpf: employee.cpf || "",
    rg: employee.rg || "",
    data_nascimento: employee.data_nascimento || "",
    telefone: employee.telefone || "",
    email: employee.email || "",
    position: employee.position || "",
    job_role: employee.job_role || "outros",
    area: employee.area || "",
    hire_date: employee.hire_date || "",
    status: employee.status || "ativo",
    endereco: employee.endereco || {},
    profile_picture_url: employee.profile_picture_url || "",
    digital_signature_url: employee.digital_signature_url || "",
    shift_settings: employee.shift_settings || { lunch_start: "", lunch_end: "", work_start: "", work_end: "" }
  });

  const handleSave = async () => {
    await onUpdate(formData);
    setEditing(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, profile_picture_url: file_url });
      await onUpdate({ ...formData, profile_picture_url: file_url });
      toast.success("Foto de perfil atualizada!");
    } catch (error) {
      toast.error("Erro ao fazer upload da foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingSignature(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, digital_signature_url: file_url });
      await onUpdate({ ...formData, digital_signature_url: file_url });
      toast.success("Assinatura digital salva!");
    } catch (error) {
      toast.error("Erro ao fazer upload da assinatura");
    } finally {
      setUploadingSignature(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Dados Pessoais</CardTitle>
          {!editing ? (
            <Button onClick={() => setEditing(true)}>Editar</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Foto de Perfil e Assinatura Digital */}
        <div className="flex flex-col md:flex-row gap-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          {/* Foto de Perfil */}
          <div className="flex flex-col items-center gap-3">
            <Label className="font-semibold text-gray-700">Foto de Perfil</Label>
            <div className="relative">
              {formData.profile_picture_url ? (
                <img 
                  src={formData.profile_picture_url} 
                  alt="Foto de perfil"
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-white shadow-lg">
                  <User className="w-16 h-16 text-gray-400" />
                </div>
              )}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="gap-2"
            >
              {uploadingPhoto ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
              {uploadingPhoto ? "Enviando..." : "Alterar Foto"}
            </Button>
          </div>

          {/* Assinatura Digital */}
          <div className="flex flex-col items-center gap-3">
            <Label className="font-semibold text-gray-700">Assinatura Digital</Label>
            <div className="relative">
              {formData.digital_signature_url ? (
                <div className="w-48 h-24 bg-white rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden shadow">
                  <img 
                    src={formData.digital_signature_url} 
                    alt="Assinatura digital"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-48 h-24 bg-white rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center shadow">
                  <div className="text-center text-gray-400">
                    <PenTool className="w-8 h-8 mx-auto mb-1" />
                    <span className="text-xs">Sem assinatura</span>
                  </div>
                </div>
              )}
              <input
                ref={signatureInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleSignatureUpload}
              />
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => signatureInputRef.current?.click()}
              disabled={uploadingSignature}
              className="gap-2"
            >
              {uploadingSignature ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploadingSignature ? "Enviando..." : "Upload Assinatura"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Nome Completo *</Label>
            <Input
              value={formData.full_name}
              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              disabled={!editing}
            />
          </div>
          <div>
            <Label>CPF</Label>
            <Input
              value={formData.cpf}
              onChange={(e) => setFormData({...formData, cpf: e.target.value})}
              disabled={!editing}
            />
          </div>
          <div>
            <Label>RG</Label>
            <Input
              value={formData.rg}
              onChange={(e) => setFormData({...formData, rg: e.target.value})}
              disabled={!editing}
            />
          </div>
          <div>
            <Label>Data de Nascimento</Label>
            <Input
              type="date"
              value={formData.data_nascimento}
              onChange={(e) => setFormData({...formData, data_nascimento: e.target.value})}
              disabled={!editing}
            />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input
              value={formData.telefone}
              onChange={(e) => setFormData({...formData, telefone: e.target.value})}
              disabled={!editing}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              disabled={!editing}
            />
          </div>
          <div>
            <Label>Cargo (Descrição) *</Label>
            <Input
              value={formData.position}
              onChange={(e) => setFormData({...formData, position: e.target.value})}
              disabled={!editing}
            />
          </div>
          <div>
            <Label>Função do Sistema</Label>
            <Select value={formData.job_role} onValueChange={(value) => setFormData({...formData, job_role: value})} disabled={!editing}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="diretor">Diretor</SelectItem>
                <SelectItem value="supervisor_loja">Supervisor de Loja</SelectItem>
                <SelectItem value="gerente">Gerente</SelectItem>
                <SelectItem value="lider_tecnico">Líder Técnico</SelectItem>
                <SelectItem value="financeiro">Financeiro</SelectItem>
                <SelectItem value="rh">RH</SelectItem>
                <SelectItem value="tecnico">Técnico / Mecânico / Eletricista</SelectItem>
                <SelectItem value="funilaria_pintura">Funileiro / Pintor / Chapeador</SelectItem>
                <SelectItem value="comercial">Comercial / Telemarketing</SelectItem>
                <SelectItem value="consultor_vendas">Consultor de Vendas</SelectItem>
                <SelectItem value="marketing">Marketing / Tráfego</SelectItem>
                <SelectItem value="estoque">Estoque</SelectItem>
                <SelectItem value="administrativo">Administrativo</SelectItem>
                <SelectItem value="motoboy">Moto Boy</SelectItem>
                <SelectItem value="lavador">Lavador</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Área</Label>
            <Select value={formData.area} onValueChange={(value) => setFormData({...formData, area: value})} disabled={!editing}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vendas">Vendas</SelectItem>
                <SelectItem value="comercial">Comercial</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="tecnico">Técnico</SelectItem>
                <SelectItem value="administrativo">Administrativo</SelectItem>
                <SelectItem value="financeiro">Financeiro</SelectItem>
                <SelectItem value="gerencia">Gerência</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data de Contratação</Label>
            <Input
              type="date"
              value={formData.hire_date}
              onChange={(e) => setFormData({...formData, hire_date: e.target.value})}
              disabled={!editing}
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})} disabled={!editing}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="ferias">Férias</SelectItem>
                <SelectItem value="afastado">Afastado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="pt-4 border-t">
          <h3 className="font-semibold text-gray-900 mb-3">Configuração de Turno (QGP)</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Label>Início Expediente</Label>
              <Input
                type="time"
                value={formData.shift_settings?.work_start || ""}
                onChange={(e) => setFormData({...formData, shift_settings: {...formData.shift_settings, work_start: e.target.value}})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Início Almoço</Label>
              <Input
                type="time"
                value={formData.shift_settings?.lunch_start || ""}
                onChange={(e) => setFormData({...formData, shift_settings: {...formData.shift_settings, lunch_start: e.target.value}})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Fim Almoço</Label>
              <Input
                type="time"
                value={formData.shift_settings?.lunch_end || ""}
                onChange={(e) => setFormData({...formData, shift_settings: {...formData.shift_settings, lunch_end: e.target.value}})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Fim Expediente</Label>
              <Input
                type="time"
                value={formData.shift_settings?.work_end || ""}
                onChange={(e) => setFormData({...formData, shift_settings: {...formData.shift_settings, work_end: e.target.value}})}
                disabled={!editing}
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <h3 className="font-semibold text-gray-900 mb-3">Endereço</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Rua</Label>
              <Input
                value={formData.endereco?.rua || ""}
                onChange={(e) => setFormData({...formData, endereco: {...formData.endereco, rua: e.target.value}})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Número</Label>
              <Input
                value={formData.endereco?.numero || ""}
                onChange={(e) => setFormData({...formData, endereco: {...formData.endereco, numero: e.target.value}})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Bairro</Label>
              <Input
                value={formData.endereco?.bairro || ""}
                onChange={(e) => setFormData({...formData, endereco: {...formData.endereco, bairro: e.target.value}})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input
                value={formData.endereco?.cidade || ""}
                onChange={(e) => setFormData({...formData, endereco: {...formData.endereco, cidade: e.target.value}})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Estado</Label>
              <Input
                value={formData.endereco?.estado || ""}
                onChange={(e) => setFormData({...formData, endereco: {...formData.endereco, estado: e.target.value}})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>CEP</Label>
              <Input
                value={formData.endereco?.cep || ""}
                onChange={(e) => setFormData({...formData, endereco: {...formData.endereco, cep: e.target.value}})}
                disabled={!editing}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}