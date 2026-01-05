import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Upload, Save, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function DocumentFormDialog({ open, onClose, document, workshopId, onSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [autoGenerateId, setAutoGenerateId] = useState(!document);
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [customTypes, setCustomTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
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

  // Gerar ID automaticamente
  useEffect(() => {
    if (autoGenerateId && formData.category && formData.document_type) {
      generateDocumentId();
    }
  }, [formData.category, formData.document_type, autoGenerateId]);

  const generateDocumentId = async () => {
    try {
      const categoryPrefix = {
        governanca: 'GOV',
        juridico_regimento: 'JUR',
        rh_pessoas: 'RH',
        operacional: 'OP',
        tecnico: 'TEC',
        comercial: 'COM',
        financeiro: 'FIN',
        treinamento: 'TRE',
        auditoria_dados: 'AUD'
      };

      const typePrefix = {
        regimento: 'REG',
        map: 'MAP',
        it: 'IT',
        politica: 'POL',
        checklist: 'CHK',
        contrato: 'CTR',
        relatorio: 'REL',
        treinamento: 'TRE',
        evidencia: 'EVD'
      };

      const area = categoryPrefix[formData.category];
      let type = typePrefix[formData.document_type];

      // Se tipo customizado, usar as 3 primeiras letras maiúsculas
      if (!type && formData.document_type) {
        type = formData.document_type.substring(0, 3).toUpperCase();
      }

      if (!area || !type) return;

      // Buscar documentos existentes com mesmo prefixo
      const allDocs = await base44.entities.CompanyDocument.filter({ workshop_id: workshopId });
      const prefix = `${area}-${type}-`;
      const existingDocs = allDocs.filter(d => d.document_id?.startsWith(prefix));
      
      const numbers = existingDocs.map(d => {
        const match = d.document_id?.match(new RegExp(`${prefix}(\\d+)`));
        return match ? parseInt(match[1]) : 0;
      });

      const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
      const newId = `${prefix}${String(maxNumber + 1).padStart(4, '0')}`;
      
      setFormData(prev => ({ ...prev, document_id: newId }));
    } catch (error) {
      console.error('Erro ao gerar ID:', error);
    }
  };

  // Carregar tipos customizados
  useEffect(() => {
    loadCustomTypes();
  }, [workshopId]);

  const loadCustomTypes = async () => {
    if (!workshopId) return;
    try {
      const workshop = await base44.entities.Workshop.get(workshopId);
      setCustomTypes(workshop.custom_document_types || []);
    } catch (error) {
      console.error('Erro ao carregar tipos:', error);
    }
  };

  const handleAddCustomType = async () => {
    if (!newTypeName.trim()) {
      toast.error("Digite um nome para o tipo");
      return;
    }

    setLoadingTypes(true);
    try {
      const workshop = await base44.entities.Workshop.get(workshopId);
      const currentTypes = workshop.custom_document_types || [];
      const typeKey = newTypeName.toLowerCase().replace(/\s+/g, '_');
      
      if (currentTypes.some(t => t.key === typeKey)) {
        toast.error("Tipo já existe");
        setLoadingTypes(false);
        return;
      }

      const updatedTypes = [...currentTypes, { key: typeKey, label: newTypeName.trim() }];
      
      await base44.entities.Workshop.update(workshopId, {
        custom_document_types: updatedTypes
      });

      setCustomTypes(updatedTypes);
      setFormData({ ...formData, document_type: typeKey });
      setNewTypeName('');
      setShowAddTypeModal(false);
      toast.success("Tipo adicionado!");
    } catch (error) {
      console.error('Erro ao adicionar tipo:', error);
      toast.error("Erro ao adicionar tipo");
    } finally {
      setLoadingTypes(false);
    }
  };

  useEffect(() => {
    if (document) {
      setAutoGenerateId(false);
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

    if (!document && !formData.file_url) {
      toast.error("É necessário enviar um arquivo");
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
        const created = await base44.entities.CompanyDocument.create({
          ...formData,
          workshop_id: workshopId
        });
        
        // Notificar usuários interessados
        const { notifyNewDocument } = await import("./DocumentNotificationManager");
        await notifyNewDocument(created, workshopId);
        
        toast.success("Documento criado!");
      }
      onSuccess();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error(`Erro ao salvar: ${error?.message || 'Erro desconhecido'}`);
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
              <Label className="flex items-center justify-between">
                <span>ID do Documento *</span>
                {!document && (
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="auto-id"
                      checked={autoGenerateId}
                      onCheckedChange={setAutoGenerateId}
                    />
                    <Label htmlFor="auto-id" className="text-xs font-normal cursor-pointer text-blue-600">
                      Gerar automaticamente
                    </Label>
                  </div>
                )}
              </Label>
              <Input 
                placeholder="Ex: RH-MAP-0001, OP-IT-0042"
                value={formData.document_id}
                onChange={(e) => {
                  setAutoGenerateId(false);
                  setFormData({...formData, document_id: e.target.value});
                }}
                disabled={autoGenerateId}
                className={autoGenerateId ? 'bg-gray-100' : ''}
              />
              {autoGenerateId && (
                <p className="text-xs text-blue-600 mt-1">
                  ℹ️ Formato: [ÁREA]-[TIPO]-[NÚMERO] (ex: RH-MAP-0001)
                </p>
              )}
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
              <Label className="flex items-center justify-between mb-2">
                <span>Tipo de Documento *</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddTypeModal(true)}
                  className="h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Novo Tipo
                </Button>
              </Label>
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
                  {customTypes.map(type => (
                    <SelectItem key={type.key} value={type.key}>
                      {type.label} ✨
                    </SelectItem>
                  ))}
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

      {/* Modal Adicionar Tipo Customizado */}
      <Dialog open={showAddTypeModal} onOpenChange={setShowAddTypeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Tipo de Documento</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Nome do Tipo</Label>
            <Input
              placeholder="Ex: Manual Técnico, Diagrama Elétrico..."
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomType()}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddTypeModal(false);
              setNewTypeName('');
            }}>
              Cancelar
            </Button>
            <Button onClick={handleAddCustomType} disabled={loadingTypes}>
              {loadingTypes && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}