import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, UserPlus, User, DollarSign, TrendingUp, Plus, Trash2, X, Upload } from "lucide-react";
import { toast } from "sonner";
import InviteSuccessDialog from "@/components/convite/InviteSuccessDialog";
import { jobRoles } from "@/components/lib/jobRoles";
import { CANONICAL_PROFILE_IDS, CANONICAL_PROFILE_JOB_ROLES, CANONICAL_PROFILE_MAPPING, getCanonicalProfileByJobRole, isCanonicalJobRole } from "@/components/lib/canonicalProfiles";
import { motion, AnimatePresence } from "framer-motion";
import ProfileSuggestionBanner from "./ProfileSuggestionBanner";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";

export default function ModalCadastroColaborador({ isOpen, onClose, onSuccess }) {
  const navigate = useNavigate();
  const { workshop: activeWorkshop } = useWorkshopContext();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [jobDescriptions, setJobDescriptions] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileSuggestion, setProfileSuggestion] = useState(null);
  const [checkingSuggestion, setCheckingSuggestion] = useState(false);
  const [profileWasManuallyChanged, setProfileWasManuallyChanged] = useState(false);
  const [profileAutoApplied, setProfileAutoApplied] = useState(false);
  const [successInvite, setSuccessInvite] = useState(null);
  
  const [formData, setFormData] = useState({
    workshop_id: "", full_name: "", cpf: "", rg: "", data_nascimento: "", telefone: "", email: "",
    endereco: { rua: "", numero: "", bairro: "", cidade: "", estado: "", cep: "" },
    position: "", job_role: "outros", user_profile_id: "", area: "", hire_date: "",
    salary: 0, commission: 0, bonus: 0, benefits: [], production_parts: 0, production_parts_sales: 0,
    production_services: 0, status: "ativo", job_description_id: "", profile_picture_url: ""
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Apenas imagens são permitidas");
      return;
    }

    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, profile_picture_url: file_url }));
      toast.success("Foto de perfil anexada!");
    } catch (error) {
      toast.error("Erro ao fazer upload: " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      loadData();
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // FASE 4: Auto-apply canonical profile when job_role changes (only if user hasn't manually selected)
  useEffect(() => {
    if (!formData.job_role || !workshop?.id) {
      setProfileSuggestion(null);
      return;
    }

    // Don't auto-apply if user already manually changed the profile
    if (profileWasManuallyChanged) {
      console.info('[PROFILE_OVERRIDE] User manually changed profile, skipping auto-apply', {
        job_role: formData.job_role,
        current_profile_id: formData.user_profile_id
      });
      return;
    }

    const applyCanonicalProfile = async () => {
      setCheckingSuggestion(true);
      try {
        const response = await base44.functions.invoke('autoAssignProfile', {
          job_role: formData.job_role,
          workshop_id: workshop.id,
          current_profile_id: formData.user_profile_id
        });

        if (response.data.success && response.data.has_suggestion) {
          // FASE 4: Auto-apply the canonical profile
          setFormData(prev => ({ ...prev, user_profile_id: response.data.suggested_profile_id }));
          setProfileAutoApplied(true);
          
          console.info('[AUTO_ASSIGN]', {
            job_role: formData.job_role,
            suggested_profile: response.data.suggested_profile_name,
            applied: true
          });

          // Telemetria: sugestão gerada
          await base44.functions.invoke('logProfileSuggestion', {
            event_type: 'profile_suggestion_generated',
            job_role: formData.job_role,
            suggested_profile_id: response.data.suggested_profile_id,
            suggested_profile_name: response.data.suggested_profile_name,
            workshop_id: workshop.id
          });
        } else {
          setProfileSuggestion(null);
          setProfileAutoApplied(false);
        }
      } catch (error) {
        console.error('Erro ao aplicar perfil canônico:', error);
        setProfileSuggestion(null);
        setProfileAutoApplied(false);
      } finally {
        setCheckingSuggestion(false);
      }
    };

    applyCanonicalProfile();
  }, [formData.job_role, workshop?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // Utilizar a filial atualmente selecionada no contexto do usuário
      const userWorkshop = activeWorkshop;
      
      if (userWorkshop) {
        setWorkshop(userWorkshop);
        setFormData(prev => ({ ...prev, workshop_id: userWorkshop.id }));
      }

      const descriptions = await base44.entities.JobDescription.list();
      setJobDescriptions(descriptions.filter(d => !userWorkshop || d.workshop_id === userWorkshop.id));

      const allProfiles = await base44.entities.UserProfile.list();
      // Filtro por ID fixo — mais seguro que filtrar por type ou job_role.
      // CANONICAL_PROFILE_IDS exclui Admin System e qualquer perfil criado acidentalmente.
      // Aplica para todos os usuários, incluindo admin — no cadastro de colaboradores
      // de oficinas clientes nunca deve aparecer perfil de uso interno da plataforma.
      setProfiles(allProfiles.filter(p =>
        p.status === 'ativo' &&
        CANONICAL_PROFILE_IDS.includes(p.id) &&
        (!p.workshop_id || p.workshop_id === userWorkshop?.id)
      ));
    } catch (error) {
      toast.error("Você precisa estar logado");
    } finally {
      setLoading(false);
    }
  };

  const addBenefit = () => {
    setFormData({ ...formData, benefits: [...formData.benefits, { nome: "", valor: 0 }] });
  };

  const removeBenefit = (index) => {
    const newBenefits = formData.benefits.filter((_, i) => i !== index);
    setFormData({ ...formData, benefits: newBenefits });
  };

  const updateBenefit = (index, field, value) => {
    const newBenefits = [...formData.benefits];
    newBenefits[index][field] = field === 'valor' ? parseFloat(value) || 0 : value;
    setFormData({ ...formData, benefits: newBenefits });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.full_name || !formData.position || !formData.email) {
      toast.error("Preencha nome, cargo e e-mail");
      return;
    }

    if (!formData.profile_picture_url) {
      toast.error("A foto de perfil é obrigatória");
      return;
    }

    // Validar email duplicado antes de criar
    setSubmitting(true);
    try {
      const validationResponse = await base44.functions.invoke('validateEmployeeEmail', {
        email: formData.email,
        workshop_id: workshop.id
      });

      if (!validationResponse.data.success) {
        toast.error(validationResponse.data.error || "Email já cadastrado nesta oficina");
        setSubmitting(false);
        return;
      }
    } catch (error) {
      // 409 = email já existe — usar mensagem do body, não a mensagem técnica do axios
      const serverMessage = error.response?.data?.error;
      toast.error(serverMessage || "Este e-mail já está cadastrado nesta oficina");
      setSubmitting(false);
      return;
    }

    try {
      const totalCost = formData.salary + formData.commission + formData.bonus + 
        formData.benefits.reduce((sum, b) => sum + (b.valor || 0), 0);
      
      const totalProduction = formData.production_parts + formData.production_parts_sales + formData.production_services;
      const productionPercentage = totalCost > 0 ? (totalProduction / totalCost) * 100 : 0;

      const isPartner = formData.job_role === 'socio';
      
      let userRoles = [];
      if (formData.user_profile_id && formData.user_profile_id !== "none") {
        const selectedProfile = profiles.find(p => p.id === formData.user_profile_id);
        if (selectedProfile) {
          userRoles = selectedProfile.roles || [];
        }
      }

      // FASE 4: Log telemetry if profile was auto-applied
      if (profileAutoApplied && formData.user_profile_id) {
        console.info('[AUTO_ASSIGN_SAVE]', {
          job_role: formData.job_role,
          profile_id: formData.user_profile_id,
          profile_name: profiles.find(p => p.id === formData.user_profile_id)?.name,
          was_manual: profileWasManuallyChanged
        });
      }

      const resolvedProfileId = formData.user_profile_id && formData.user_profile_id !== "none"
        ? formData.user_profile_id
        : null;
      const resolvedJobDescriptionId = formData.job_description_id && formData.job_description_id !== "none"
        ? formData.job_description_id
        : null;

      const response = await base44.functions.invoke('createUserDirectly', {
        name: formData.full_name,
        email: formData.email,
        telefone: formData.telefone,
        position: formData.position,
        area: formData.area,
        job_role: formData.job_role,
        profile_id: resolvedProfileId,
        workshop_id: workshop.id,
        role: 'user',
        data_nascimento: formData.data_nascimento || null,
        // Campos RH
        cpf: formData.cpf || null,
        rg: formData.rg || null,
        hire_date: formData.hire_date || null,
        salary: formData.salary || 0,
        commission: formData.commission || 0,
        bonus: formData.bonus || 0,
        benefits: formData.benefits || [],
        production_parts: formData.production_parts || 0,
        production_parts_sales: formData.production_parts_sales || 0,
        production_services: formData.production_services || 0,
        production_percentage: productionPercentage,
        endereco: formData.endereco || null,
        profile_picture_url: formData.profile_picture_url || null,
        job_description_id: resolvedJobDescriptionId
      });

      if (!response.data.success) {
        throw new Error(response.data.error?.message || response.data.error || "Erro ao cadastrar colaborador");
      }

      const responseData = response.data.data || response.data;
      toast.success("Colaborador cadastrado com sucesso!");
      
      setSuccessInvite({
        ...responseData,
        name: formData.full_name,
        full_name: formData.full_name,
        email: formData.email,
        telefone: formData.telefone,
        position: formData.position,
        employee: {
          id: responseData.employee_id,
          full_name: formData.full_name,
          email: formData.email,
          telefone: formData.telefone,
          position: formData.position,
          created_date: new Date().toISOString()
        }
      });
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao cadastrar");
    } finally {
      setSubmitting(false);
    }
  };

  const totalCost = formData.salary + formData.commission + formData.bonus + 
    formData.benefits.reduce((sum, b) => sum + (b.valor || 0), 0);
  
  const totalProduction = formData.production_parts + formData.production_parts_sales + formData.production_services;
  const productionPercentage = totalCost > 0 ? ((totalProduction / totalCost) * 100).toFixed(0) : 0;

  const selectedProfileName = profiles.find(p => p.id === formData.user_profile_id)?.name || "-";

  return (
    <>
      <InviteSuccessDialog
        open={!!successInvite}
        onOpenChange={(open) => {
          if (!open) {
            setSuccessInvite(null);
            onClose();
          }
        }}
        inviteData={successInvite}
        workshopName={workshop?.name}
        profileName={selectedProfileName}
        onPreview={() => {
          setSuccessInvite(null);
          onClose();
          navigate(createPageUrl("ConvidarColaborador") + `?id=${successInvite?.employee?.id || successInvite?.employee_id || ""}`);
        }}
      />
      <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.2)] w-[90%] max-w-[800px] max-h-[90vh] overflow-y-auto p-6 relative my-4"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {loading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-500">Carregando dados...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                    <UserPlus className="w-8 h-8 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Cadastrar Colaborador</h2>
                  <p className="text-sm text-gray-600 mt-1">Preencha os dados do novo colaborador</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Dados Pessoais */}
                  <Card className="shadow-none border-gray-200">
                    <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Dados Pessoais</CardTitle>
                          <CardDescription>Informações básicas do colaborador</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                      <div className="flex flex-col items-center mb-6">
                        <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group">
                          {formData.profile_picture_url ? (
                            <img src={formData.profile_picture_url} alt="Perfil" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-8 h-8 text-gray-400" />
                          )}
                          <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                            {uploadingImage ? (
                              <Loader2 className="w-6 h-6 text-white mb-1 animate-spin" />
                            ) : (
                              <>
                                <Upload className="w-6 h-6 text-white mb-1" />
                                <span className="text-[10px] text-white font-medium">Alterar</span>
                              </>
                            )}
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleImageUpload}
                              disabled={uploadingImage}
                            />
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Foto de perfil * (Obrigatória)</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Nome Completo *</Label>
                          <Input value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} required />
                        </div>
                        <div>
                          <Label>CPF</Label>
                          <Input value={formData.cpf} onChange={(e) => setFormData({...formData, cpf: e.target.value})} placeholder="000.000.000-00" maxLength={14} />
                        </div>
                        <div>
                          <Label>RG</Label>
                          <Input value={formData.rg} onChange={(e) => setFormData({...formData, rg: e.target.value})} />
                        </div>
                        <div>
                          <Label>Data de Nascimento</Label>
                          <Input type="date" value={formData.data_nascimento} onChange={(e) => setFormData({...formData, data_nascimento: e.target.value})} />
                        </div>
                        <div>
                          <Label>Telefone</Label>
                          <Input value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} placeholder="(00) 00000-0000" />
                        </div>
                        <div>
                          <Label>Email *</Label>
                          <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                        </div>
                      </div>

                      <div className="pt-4 border-t mt-4">
                        <h3 className="font-semibold text-gray-900 mb-3 text-sm">Endereço</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Rua</Label>
                            <Input value={formData.endereco.rua} onChange={(e) => setFormData({...formData, endereco: {...formData.endereco, rua: e.target.value}})} />
                          </div>
                          <div>
                            <Label>Número</Label>
                            <Input value={formData.endereco.numero} onChange={(e) => setFormData({...formData, endereco: {...formData.endereco, numero: e.target.value}})} />
                          </div>
                          <div>
                            <Label>Bairro</Label>
                            <Input value={formData.endereco.bairro} onChange={(e) => setFormData({...formData, endereco: {...formData.endereco, bairro: e.target.value}})} />
                          </div>
                          <div>
                            <Label>Cidade</Label>
                            <Input value={formData.endereco.cidade} onChange={(e) => setFormData({...formData, endereco: {...formData.endereco, cidade: e.target.value}})} />
                          </div>
                          <div>
                            <Label>Estado (UF)</Label>
                            <Input value={formData.endereco.estado} onChange={(e) => setFormData({...formData, endereco: {...formData.endereco, estado: e.target.value.toUpperCase()}})} maxLength={2} />
                          </div>
                          <div>
                            <Label>CEP</Label>
                            <Input
                              value={formData.endereco.cep}
                              onChange={async (e) => {
                                const cep = e.target.value.replace(/\D/g, '');
                                setFormData({...formData, endereco: {...formData.endereco, cep: e.target.value}});
                                
                                if (cep.length === 8) {
                                  try {
                                    const result = await base44.functions.invoke('consultarCEP', { cep });
                                    if (result.data && !result.data.erro) {
                                      setFormData(prev => ({
                                        ...prev,
                                        endereco: {
                                          ...prev.endereco,
                                          rua: result.data.logradouro || prev.endereco.rua,
                                          bairro: result.data.bairro || prev.endereco.bairro,
                                          cidade: result.data.localidade || prev.endereco.cidade,
                                          estado: result.data.uf || prev.endereco.estado,
                                          cep: e.target.value
                                        }
                                      }));
                                      toast.success("Endereço preenchido automaticamente!");
                                    }
                                  } catch (error) {
                                    console.error("Erro ao buscar CEP:", error);
                                  }
                                }
                              }}
                              placeholder="00000-000"
                              maxLength={9}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Dados da Contratação */}
                  <Card className="shadow-none border-gray-200">
                    <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                          <UserPlus className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Dados da Contratação</CardTitle>
                          <CardDescription>Cargo, área e permissões</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Cargo/Função (Descrição) *</Label>
                          <Input value={formData.position} onChange={(e) => setFormData({...formData, position: e.target.value})} required />
                        </div>
                        <div>
                          <Label>Perfil de Usuário</Label>
                          <Select 
                            value={formData.user_profile_id || "none"} 
                            onValueChange={(value) => {
                              const previousProfileId = formData.user_profile_id;
                              const selectedProfile = profiles.find(p => p.id === value);
                              
                              // FASE 4: Track manual override
                              if (previousProfileId && previousProfileId !== value) {
                                console.info('[PROFILE_OVERRIDE]', {
                                  previous_profile: previousProfileId,
                                  new_profile: value,
                                  profile_name: selectedProfile?.name
                                });
                                setProfileWasManuallyChanged(true);
                                setProfileAutoApplied(false);
                              }
                              
                              if (selectedProfile) {
                                const newJobRole = selectedProfile.permission_type === 'job_role' && 
                                                  selectedProfile.job_roles?.length > 0 
                                                  ? selectedProfile.job_roles[0] 
                                                  : formData.job_role;
                                setFormData({...formData, user_profile_id: value, job_role: newJobRole});
                              } else {
                                setFormData({...formData, user_profile_id: value === "none" ? "" : value});
                              }
                            }}
                          >
                            <SelectTrigger><SelectValue placeholder="Selecione o perfil..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum perfil</SelectItem>
                              {profiles.map(profile => (
                                <SelectItem key={profile.id} value={profile.id}>
                                  {profile.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          {/* FASE 4: Badge indicating auto-apply or manual selection */}
                          {profileAutoApplied && !profileWasManuallyChanged && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-200">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Perfil selecionado automaticamente com base no cargo.</span>
                            </div>
                          )}
                          {profileWasManuallyChanged && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-md border border-green-200">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Perfil definido manualmente.</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <Label>Função do Sistema</Label>
                          <Select 
                            value={formData.job_role} 
                            onValueChange={(value) => {
                              // FASE 4: Reset manual flag when job_role changes
                              setProfileWasManuallyChanged(false);
                              setProfileAutoApplied(false);
                              setFormData({...formData, job_role: value});
                            }}
                          >
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              {jobRoles.filter(role => role.category !== 'interna' && role.value !== 'socio_interno').map((role) => (
                                <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <ProfileSuggestionBanner
                            profileSuggestion={profileSuggestion}
                            checkingSuggestion={checkingSuggestion}
                            job_role={formData.job_role}
                            onDismiss={() => {
                              // Telemetria: sugestão visualizada (Fase 4 - já aplicada automaticamente)
                              base44.functions.invoke('logProfileSuggestion', {
                                event_type: 'profile_suggestion_generated',
                                job_role: formData.job_role,
                                suggested_profile_id: profileSuggestion?.suggested_profile_id,
                                suggested_profile_name: profileSuggestion?.suggested_profile_name,
                                workshop_id: workshop.id
                              }).catch(console.error);
                              setProfileSuggestion(null);
                            }}
                          />
                        </div>
                        <div>
                          <Label>Área</Label>
                          <Select value={formData.area} onValueChange={(value) => setFormData({...formData, area: value})}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
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
                          <Input type="date" value={formData.hire_date} onChange={(e) => setFormData({...formData, hire_date: e.target.value})} />
                        </div>
                      </div>

                      <div>
                        <Label>Descrição de Cargo (Opcional)</Label>
                        <Select value={formData.job_description_id || "none"} onValueChange={(value) => setFormData({...formData, job_description_id: value === "none" ? "" : value})}>
                          <SelectTrigger><SelectValue placeholder="Selecione uma descrição..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhuma</SelectItem>
                            {jobDescriptions.map(desc => (
                              <SelectItem key={desc.id} value={desc.id}>{desc.cargo} - {desc.area}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Remuneração e Benefícios */}
                  <Card className="shadow-none border-gray-200">
                    <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Remuneração e Benefícios</CardTitle>
                          <CardDescription>Salário, comissões e vales</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>Salário Fixo (R$)</Label>
                          <Input type="number" step="0.01" value={formData.salary} onChange={(e) => setFormData({...formData, salary: parseFloat(e.target.value) || 0})} />
                        </div>
                        <div>
                          <Label>Comissão Mensal (R$)</Label>
                          <Input type="number" step="0.01" value={formData.commission} onChange={(e) => setFormData({...formData, commission: parseFloat(e.target.value) || 0})} />
                        </div>
                        <div>
                          <Label>Bonificação/Prêmio (R$)</Label>
                          <Input type="number" step="0.01" value={formData.bonus} onChange={(e) => setFormData({...formData, bonus: parseFloat(e.target.value) || 0})} />
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-gray-900 text-sm">Vales e Benefícios</h3>
                          <Button type="button" size="sm" onClick={addBenefit} variant="outline" className="h-8">
                            <Plus className="w-3 h-3 mr-1" /> Adicionar
                          </Button>
                        </div>
                        {formData.benefits.length === 0 ? (
                          <p className="text-xs text-gray-500">Nenhum benefício cadastrado</p>
                        ) : (
                          <div className="space-y-2">
                            {formData.benefits.map((benefit, index) => (
                              <div key={index} className="flex gap-2 items-center">
                                <Input placeholder="Nome (ex: Alimentação)" value={benefit.nome} onChange={(e) => updateBenefit(index, 'nome', e.target.value)} className="flex-1 h-9" />
                                <Input type="number" step="0.01" placeholder="Valor" value={benefit.valor} onChange={(e) => updateBenefit(index, 'valor', e.target.value)} className="w-32 h-9" />
                                <Button type="button" size="icon" variant="ghost" onClick={() => removeBenefit(index)} className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t bg-blue-50/50 rounded-lg p-4 mt-4">
                        <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider">Custo Total Mensal</p>
                        <p className="text-2xl font-bold text-blue-700">R$ {totalCost.toFixed(2)}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Produção */}
                  <Card className="shadow-none border-gray-200">
                    <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Produção</CardTitle>
                          <CardDescription>Valores de produção mensal</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>Produção de Peças (R$)</Label>
                          <Input type="number" step="0.01" value={formData.production_parts} onChange={(e) => setFormData({...formData, production_parts: parseFloat(e.target.value) || 0})} />
                        </div>
                        <div>
                          <Label>Produção Vendas Peças (R$)</Label>
                          <Input type="number" step="0.01" value={formData.production_parts_sales} onChange={(e) => setFormData({...formData, production_parts_sales: parseFloat(e.target.value) || 0})} />
                        </div>
                        <div>
                          <Label>Produção de Serviços (R$)</Label>
                          <Input type="number" step="0.01" value={formData.production_services} onChange={(e) => setFormData({...formData, production_services: parseFloat(e.target.value) || 0})} />
                        </div>
                      </div>

                      <div className="pt-4 border-t bg-green-50/50 rounded-lg p-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-green-900 uppercase tracking-wider">Produção Total</p>
                            <p className="text-2xl font-bold text-green-700">R$ {totalProduction.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-green-900 uppercase tracking-wider">% sobre Custos</p>
                            <p className={`text-2xl font-bold ${productionPercentage >= 100 ? 'text-green-700' : 'text-orange-600'}`}>
                              {productionPercentage}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={onClose} className="px-6">
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 px-8">
                      {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4 mr-2" /> Salvar Colaborador</>}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
}