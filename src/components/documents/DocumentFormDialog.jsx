import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Upload, Save } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function DocumentFormDialog({ open, onClose, document, workshopId, onSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    document_id: '',
    title: '',
    category: '',
    subprocess_area: '',
    document_type: '',
    responsible_role: '',
    process_owner: '',
    status: 'em_construcao',
    file_url: '',
    version: 'v1.0',
    creation_date: new Date().toISOString().split('T')[0],
    last_revision_date: '',
    next_review_date: '',
    legal_impact: '',
    risk_if_not_comply: '',
    mandatory_by_law: false,
    legal_reference: '',
    target_audience: '',
    has_training: false,
    training_link: '',
    observations: ''
  });

  useEffect(() => {
    if (document) {
      setFormData({
        document_id: document.document_id || '',
        title: document.title || '',
        category: document.category || '',
        subprocess_area: document.subprocess_area || '',
        document_type: document.document_type || '',
        responsible_role: document.responsible_role || '',
        process_owner: document.process_owner || '',
        status: document.status || 'em_construcao',
        file_url: document.file_url || '',
        version: document.version || 'v1.0',
        creation_date: document.creation_date || new Date().toISOString().split('T')[0],
        last_revision_date: document.last_revision_date || '',
        next_review_date: document.next_review_date || '',
        legal_impact: document.legal_impact || '',
        risk_if_not_comply: document.risk_if_not_comply || '',
        mandatory_by_law: document.mandatory_by_law || false,
        legal_reference: document.legal_reference || '',
        target_audience: document.target_audience || '',
        has_training: document.has_training || false,
        training_link: document.training_link || '',
        observations: document.observations || ''
      });
    }
  }, [document]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, file_url });
      toast.success("Arquivo enviado!");
    } catch (error) {
      toast.error("Erro ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.category || !formData.document_type) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    try {
      if (document?.id) {
        await base44.entities.CompanyDocument.update(document.id, {
          ...formData,
          workshop_id: workshopId,
          last_revision_date: new Date().toISOString().split('T')[0]
        });
        toast.success("Documento atualizado!");
      } else {
        await base44.entities.CompanyDocument.create({
          ...formData,
          workshop_id: workshopId
        });
        toast.success("Documento criado!");
      }
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar documento");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{document ? 'Editar' : 'Novo'} Documento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {/* ID do Documento */}
            <div>
              <Label>ID do Documento *</Label>
              <Input 
                placeholder="DOC-001, RH-012, OP-045"
                value={formData.document_id}
                onChange={(e) => setFormData({...formData, document_id: e.target.value})}
              />
            </div>

            {/* Nome Oficial */}
            <div>
              <Label>Nome Oficial do Documento *</Label>
              <Input 
                placeholder="Regimento Interno, MAP - Atendimento"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
              />
            </div>

            {/* Categoria */}
            <div>
              <Label>Área (Categoria) *</Label>
              <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="governanca">Governança</SelectItem>
                  <SelectItem value="juridico_regimento">Jurídico / Regimento</SelectItem>
                  <SelectItem value="rh_pessoas">RH / Pessoas</SelectItem>
                  <SelectItem value="operacional">Operacional</SelectItem>
                  <SelectItem value="tecnico">Técnico</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="treinamento">Treinamento</SelectItem>
                  <SelectItem value="auditoria_dados">Auditoria / Dados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Subárea/Processo */}
            <div>
              <Label>Processo / Subárea</Label>
              <Input 
                placeholder="Admissão, Venda, Diagnóstico, Pátio..."
                value={formData.subprocess_area}
                onChange={(e) => setFormData({...formData, subprocess_area: e.target.value})}
              />
            </div>

            {/* Tipo de Documento */}
            <div>
              <Label>Tipo de Documento *</Label>
              <Select value={formData.document_type} onValueChange={(val) => setFormData({...formData, document_type: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regimento">Regimento</SelectItem>
                  <SelectItem value="map">MAP</SelectItem>
                  <SelectItem value="it">IT</SelectItem>
                  <SelectItem value="politica">Política</SelectItem>
                  <SelectItem value="checklist">Checklist</SelectItem>
                  <SelectItem value="contrato">Contrato</SelectItem>
                  <SelectItem value="relatorio">Relatório</SelectItem>
                  <SelectItem value="treinamento">Treinamento</SelectItem>
                  <SelectItem value="evidencia">Evidência</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cargo Responsável */}
            <div>
              <Label>Cargo Responsável</Label>
              <Select value={formData.responsible_role} onValueChange={(val) => setFormData({...formData, responsible_role: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="socio">Sócio</SelectItem>
                  <SelectItem value="diretor">Diretor</SelectItem>
                  <SelectItem value="gerente">Gerente</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="consultor_vendas">Consultor de Vendas</SelectItem>
                  <SelectItem value="tecnico">Técnico</SelectItem>
                  <SelectItem value="rh">RH</SelectItem>
                  <SelectItem value="administrativo">Administrativo</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dono do Processo */}
            <div>
              <Label>Dono do Processo (Nome)</Label>
              <Input 
                placeholder="Nome da pessoa responsável"
                value={formData.process_owner}
                onChange={(e) => setFormData({...formData, process_owner: e.target.value})}
              />
            </div>

            {/* Status */}
            <div>
              <Label>Status *</Label>
              <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="em_construcao">Em Construção</SelectItem>
                  <SelectItem value="em_revisao">Em Revisão</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="em_uso">Em Uso</SelectItem>
                  <SelectItem value="obsoleto">Obsoleto</SelectItem>
                  <SelectItem value="arquivado">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Versão */}
            <div>
              <Label>Versão</Label>
              <Input 
                placeholder="v1.0, v2.1"
                value={formData.version}
                onChange={(e) => setFormData({...formData, version: e.target.value})}
              />
            </div>

            {/* Data de Criação */}
            <div>
              <Label>Data de Criação</Label>
              <Input 
                type="date"
                value={formData.creation_date}
                onChange={(e) => setFormData({...formData, creation_date: e.target.value})}
              />
            </div>

            {/* Próxima Revisão */}
            <div>
              <Label>Revisar Até (Validade)</Label>
              <Input 
                type="date"
                value={formData.next_review_date}
                onChange={(e) => setFormData({...formData, next_review_date: e.target.value})}
              />
            </div>

            {/* Impacto Jurídico */}
            <div>
              <Label>Impacto Jurídico</Label>
              <Select value={formData.legal_impact} onValueChange={(val) => setFormData({...formData, legal_impact: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alto">Alto</SelectItem>
                  <SelectItem value="medio">Médio</SelectItem>
                  <SelectItem value="baixo">Baixo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Risco */}
            <div className="md:col-span-2">
              <Label>Risco se Não Cumprir</Label>
              <Input 
                placeholder="Trabalhista, Financeiro, Operacional, Imagem, Segurança"
                value={formData.risk_if_not_comply}
                onChange={(e) => setFormData({...formData, risk_if_not_comply: e.target.value})}
              />
            </div>

            {/* Obrigatório por Lei */}
            <div className="flex items-center gap-2">
              <Checkbox 
                id="mandatory"
                checked={formData.mandatory_by_law}
                onCheckedChange={(checked) => setFormData({...formData, mandatory_by_law: checked})}
              />
              <Label htmlFor="mandatory" className="font-normal cursor-pointer">
                Obrigatório por Lei
              </Label>
            </div>

            {/* Base Legal */}
            <div>
              <Label>Referência Legal</Label>
              <Input 
                placeholder="CLT Art. 482, NR-06, LGPD"
                value={formData.legal_reference}
                onChange={(e) => setFormData({...formData, legal_reference: e.target.value})}
              />
            </div>

            {/* Público-Alvo */}
            <div>
              <Label>Público-Alvo</Label>
              <Input 
                placeholder="Todos, Liderança, Técnicos, Comercial"
                value={formData.target_audience}
                onChange={(e) => setFormData({...formData, target_audience: e.target.value})}
              />
            </div>

            {/* Possui Treinamento */}
            <div className="flex items-center gap-2">
              <Checkbox 
                id="has-training"
                checked={formData.has_training}
                onCheckedChange={(checked) => setFormData({...formData, has_training: checked})}
              />
              <Label htmlFor="has-training" className="font-normal cursor-pointer">
                Possui Treinamento Vinculado
              </Label>
            </div>

            {/* Link do Treinamento */}
            {formData.has_training && (
              <div>
                <Label>Link do Treinamento</Label>
                <Input 
                  placeholder="URL do curso/treinamento"
                  value={formData.training_link}
                  onChange={(e) => setFormData({...formData, training_link: e.target.value})}
                />
              </div>
            )}

            {/* Upload do Arquivo */}
            <div className="md:col-span-2">
              <Label>Arquivo do Documento {!document && '*'}</Label>
              <div className="flex gap-2">
                <Input 
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="flex-1"
                />
                {uploading && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
              </div>
              {formData.file_url && (
                <p className="text-xs text-green-600 mt-1">✓ Arquivo carregado</p>
              )}
            </div>

            {/* Observações */}
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea 
                placeholder="Pendências, melhorias, alertas..."
                value={formData.observations}
                onChange={(e) => setFormData({...formData, observations: e.target.value})}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              {document ? 'Atualizar' : 'Criar'} Documento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}