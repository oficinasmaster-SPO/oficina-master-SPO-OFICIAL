import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Plus, Trash2, Upload, Sparkles, Loader2, Video, Link as LinkIcon, Image, Film, Send, FileText, MessageSquare, Package, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import NotificationSchedulerModal from "@/components/aceleracao/NotificationSchedulerModal";
import TemplateAtendimentoModal from "@/components/aceleracao/TemplateAtendimentoModal";
import MeetingTimer from "@/components/aceleracao/MeetingTimer";
import WorkshopSearchSelect from "@/components/aceleracao/WorkshopSearchSelect";
import ProcessSearchSelect from "@/components/aceleracao/ProcessSearchSelect";
import AudioTranscriptionField from "@/components/aceleracao/AudioTranscriptionField";
import TipoAtendimentoManager from "@/components/aceleracao/TipoAtendimentoManager";
import MediaUploadField from "@/components/aceleracao/MediaUploadField";
import ConflitosHorarioModal from "@/components/aceleracao/ConflitosHorarioModal";
import ClientIntelligenceCapturePanel from "@/components/inteligencia/ClientIntelligenceCapturePanel";

export default function RegistrarAtendimento() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const fromAgenda = urlParams.get('fromAgenda') === 'true';
  const wasFullscreen = urlParams.get('fullscreen') === 'true';
  
  const [formData, setFormData] = useState({
    workshop_id: "",
    tipo_atendimento: "acompanhamento_mensal",
    data_agendada: "",
    hora_agendada: "",
    duracao_minutos: 60,
    status: "agendado",
    status_cliente: "",
    google_meet_link: "",
    participantes: [{ nome: "", cargo: "", email: "" }],
    pauta: [{ titulo: "", descricao: "", tempo_estimado: 15 }],
    objetivos: [""],
    topicos_discutidos: [],
    decisoes_tomadas: [],
    acoes_geradas: [],
    midias_anexas: [],
    processos_vinculados: [],
    videoaulas_vinculadas: [],
    documentos_vinculados: [],
    observacoes_consultor: "",
    proximos_passos: "",
    notificacoes_programadas: []
  });

  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [timerData, setTimerData] = useState(null);
  const [showMeetingTimer, setShowMeetingTimer] = useState(false);
  const [customTipos, setCustomTipos] = useState([]);
  const [showAISummary, setShowAISummary] = useState(false);
  const [aiSummary, setAISummary] = useState(null);
  const [conflitosModal, setConflitosModal] = useState({ open: false, conflitos: [], dataHorario: null });
  const pautaRef = React.useRef(null);

  // Carregar usuário
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  // Carregar atendimento se vier da URL
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const atendimentoId = urlParams.get('atendimento_id') || urlParams.get('edit');
    
    if (atendimentoId && user) {
      const loadAtendimento = async () => {
        try {
          const atendimento = await base44.entities.ConsultoriaAtendimento.get(atendimentoId);
          
          if (atendimento) {
            const dataAgendada = new Date(atendimento.data_agendada);
            setFormData({
              ...atendimento,
              data_agendada: dataAgendada.toISOString().split('T')[0],
              hora_agendada: dataAgendada.toTimeString().slice(0, 5),
              participantes: atendimento.participantes || [{ nome: "", cargo: "", email: "" }],
              pauta: atendimento.pauta || [{ titulo: "", descricao: "", tempo_estimado: 15 }],
              objetivos: atendimento.objetivos || [""],
              midias_anexas: atendimento.midias_anexas || [],
              processos_vinculados: atendimento.processos_vinculados || [],
              videoaulas_vinculadas: atendimento.videoaulas_vinculadas || [],
              documentos_vinculados: atendimento.documentos_vinculados || [],
              topicos_discutidos: atendimento.topicos_discutidos || [],
              decisoes_tomadas: atendimento.decisoes_tomadas || [],
              acoes_geradas: atendimento.acoes_geradas || []
            });
            setShowMeetingTimer(atendimento.status === 'participando');
            console.log("Atendimento carregado para edição:", atendimento);
          }
        } catch (error) {
          console.error("Erro ao carregar atendimento:", error);
          toast.error("Erro ao carregar atendimento");
        }
      };
      
      loadAtendimento();
    }
  }, [user]);

  // Carregar oficinas com planos habilitados
  const { data: workshops } = useQuery({
    queryKey: ['workshops-list'],
    queryFn: async () => {
      const allWorkshops = await base44.entities.Workshop.list();
      return allWorkshops.filter(w => w.planoAtual && w.planoAtual !== 'FREE');
    },
    enabled: user?.role === 'admin' || user?.job_role === 'acelerador'
  });

  // Carregar consultores/aceleradores
  const { data: consultores } = useQuery({
    queryKey: ['consultores-list'],
    queryFn: async () => {
      const employees = await base44.entities.Employee.list();
      return employees.filter(e => e.job_role === 'acelerador' || e.position?.toLowerCase().includes('consultor'));
    },
    enabled: user?.role === 'admin'
  });

  // Carregar colaboradores da oficina selecionada
  const { data: colaboradores } = useQuery({
    queryKey: ['colaboradores-oficina', formData.workshop_id],
    queryFn: async () => {
      if (!formData.workshop_id) return [];
      return await base44.entities.Employee.filter({ 
        workshop_id: formData.workshop_id,
        status: 'ativo'
      });
    },
    enabled: !!formData.workshop_id
  });

  // Carregar colaboradores internos (aceleradores/consultores)
  const { data: colaboradoresInternos } = useQuery({
    queryKey: ['colaboradores-internos'],
    queryFn: async () => {
      return await base44.entities.Employee.filter({ 
        tipo_vinculo: 'interno',
        status: 'ativo'
      });
    }
  });

  // Carregar processos disponíveis
  const { data: processos } = useQuery({
    queryKey: ['processos-disponiveis'],
    queryFn: async () => {
      return await base44.entities.ProcessDocument.list();
    }
  });

  // Carregar cursos de treinamento
  const { data: cursos } = useQuery({
    queryKey: ['cursos-treinamento'],
    queryFn: async () => {
      return await base44.entities.TrainingCourse.list();
    }
  });

  // Carregar aulas de cursos publicados
  const { data: todasAulas } = useQuery({
    queryKey: ['todas-aulas-publicadas'],
    queryFn: async () => {
      const aulas = await base44.entities.CourseLesson.list();
      const cursosPublicados = cursos?.filter(c => c.status === 'published').map(c => c.id) || [];
      return aulas.filter(a => cursosPublicados.includes(a.course_id));
    },
    enabled: !!cursos
  });

  // Mutation para criar ou atualizar atendimento
  const createMutation = useMutation({
    mutationFn: async (data) => {
      if (!data.workshop_id) {
        throw new Error("Selecione uma oficina");
      }
      if (!data.data_agendada || !data.hora_agendada) {
        throw new Error("Preencha data e horário");
      }

      const dataHora = `${data.data_agendada}T${data.hora_agendada}:00`;
      
      const atendimentoData = {
        workshop_id: data.workshop_id,
        tipo_atendimento: data.tipo_atendimento,
        status: data.status,
        status_cliente: data.status_cliente,
        consultor_id: data.consultor_id || user.id,
        consultor_nome: data.consultor_nome || user.full_name,
        data_agendada: dataHora,
        duracao_minutos: data.duracao_minutos,
        google_meet_link: data.google_meet_link,
        participantes: (data.participantes || []).filter(p => p.nome),
        pauta: (data.pauta || []).filter(p => p.titulo),
        objetivos: (data.objetivos || []).filter(o => o),
        topicos_discutidos: data.topicos_discutidos || [],
        decisoes_tomadas: data.decisoes_tomadas || [],
        acoes_geradas: data.acoes_geradas || [],
        midias_anexas: (data.midias_anexas || []).filter(m => m.url),
        processos_vinculados: data.processos_vinculados || [],
        videoaulas_vinculadas: data.videoaulas_vinculadas || [],
        documentos_vinculados: data.documentos_vinculados || [],
        observacoes_consultor: data.observacoes_consultor,
        proximos_passos: data.proximos_passos,
        notificacoes_programadas: data.notificacoes_programadas || []
      };

      console.log("Salvando atendimento:", atendimentoData);

      // Atualizar ou criar
      const atendimento = data.id 
        ? await base44.entities.ConsultoriaAtendimento.update(data.id, atendimentoData)
        : await base44.entities.ConsultoriaAtendimento.create(atendimentoData);

      console.log("Atendimento salvo:", atendimento);

      // Se status é "realizado" e não tem ATA, gerar automaticamente
      if (atendimentoData.status === 'realizado' && !atendimento.ata_id) {
        try {
          const ataResponse = await base44.asServiceRole.functions.invoke('gerarAtaConsultoria', {
            atendimento_id: atendimento.id
          });
          console.log("ATA gerada automaticamente:", ataResponse);
          
          // Atualizar atendimento com ata_id
          if (ataResponse.data?.ata_id) {
            await base44.entities.ConsultoriaAtendimento.update(atendimento.id, {
              ata_id: ataResponse.data.ata_id
            });
            
            // Finalizar ATA
            await base44.entities.MeetingMinutes.update(ataResponse.data.ata_id, {
              status: 'finalizada'
            });
            console.log("ATA finalizada automaticamente");
          }
        } catch (error) {
          console.error('Erro ao gerar/finalizar ATA:', error);
        }
      }
      // Se já tem ATA vinculada, apenas finalizá-la
      else if (atendimento.ata_id) {
        try {
          await base44.entities.MeetingMinutes.update(atendimento.ata_id, {
            status: 'finalizada'
          });
          console.log("ATA finalizada automaticamente");
        } catch (error) {
          console.error('Erro ao finalizar ATA:', error);
        }
      }

      // Se status é "realizado", enviar notificação
      if (atendimentoData.status === 'realizado') {
        try {
          await base44.functions.invoke('notificarClienteAtendimento', {
            atendimento_id: atendimento.id
          });
        } catch (error) {
          console.error('Erro ao enviar notificação:', error);
        }
      }

      return atendimento;
    },
    onSuccess: (atendimento) => {
      queryClient.invalidateQueries(['consultoria-atendimentos']);
      queryClient.invalidateQueries(['meeting-minutes']);
      queryClient.invalidateQueries(['todos-atendimentos']);
      toast.success('Atendimento salvo com sucesso!');
      if (fromAgenda) {
        navigate(-1); // Volta para a página anterior (agenda)
      } else {
        navigate(createPageUrl('ControleAceleracao'));
      }
    },
    onError: (error) => {
      console.error("Erro ao salvar:", error);
      toast.error('Erro ao salvar: ' + (error.message || "Verifique os campos obrigatórios"));
    }
  });

  // Gerar ata com IA
  const gerarAtaMutation = useMutation({
    mutationFn: async (atendimento_id) => {
      return await base44.functions.invoke('gerarAtaConsultoria', {
        atendimento_id: atendimento_id
      });
    },
    onSuccess: () => {
      toast.success('Ata gerada com sucesso!');
      queryClient.invalidateQueries(['consultoria-atendimentos']);
    },
    onError: (error) => {
      toast.error('Erro ao gerar ata: ' + error.message);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.workshop_id) {
      toast.error("Selecione uma oficina");
      return;
    }

    if (!formData.data_agendada || !formData.hora_agendada) {
      toast.error("Preencha data e horário do atendimento");
      return;
    }

    // Verificar conflitos de horário
    try {
      const dataHoraCompleta = `${formData.data_agendada}T${formData.hora_agendada}:00`;
      const consultorId = formData.consultor_id || user.id;

      const response = await base44.functions.invoke('verificarConflitoHorario', {
        consultor_id: consultorId,
        data_agendada: dataHoraCompleta,
        atendimento_id_editando: formData.id // Ignora o próprio atendimento se estiver editando
      });

      if (response.data.conflito) {
        setConflitosModal({
          open: true,
          conflitos: response.data.atendimentos,
          dataHorario: dataHoraCompleta
        });
        return;
      }
    } catch (error) {
      console.error('Erro ao verificar conflitos:', error);
      toast.error("Erro ao verificar conflitos de horário");
      return;
    }

    // Mesclar dados do timer se estiver ativo
    const dadosParaSalvar = timerData ? { ...formData, ...timerData } : formData;
    
    console.log("Submetendo formulário:", dadosParaSalvar);
    createMutation.mutate(dadosParaSalvar);
  };

  const gerarLinkGoogleMeet = () => {
    const randomId = Math.random().toString(36).substring(7);
    const meetLink = `https://meet.google.com/${randomId}`;
    setFormData({ ...formData, google_meet_link: meetLink });
    toast.success("Link gerado! Você pode editá-lo se necessário.");
  };

  const addMidia = () => {
    setFormData({
      ...formData,
      midias_anexas: [...formData.midias_anexas, { tipo: "link", url: "", titulo: "" }]
    });
  };

  const removeMidia = (index) => {
    const newMidias = formData.midias_anexas.filter((_, i) => i !== index);
    setFormData({ ...formData, midias_anexas: newMidias });
  };

  const addProcesso = (processoId) => {
    const processo = processos?.find(p => p.id === processoId);
    if (processo && !formData.processos_vinculados.find(p => p.id === processoId)) {
      setFormData({
        ...formData,
        processos_vinculados: [...formData.processos_vinculados, {
          id: processo.id,
          titulo: processo.title,
          categoria: processo.category,
          url: processo.file_url
        }]
      });
    }
  };

  const removeProcesso = (index) => {
    const newProcessos = formData.processos_vinculados.filter((_, i) => i !== index);
    setFormData({ ...formData, processos_vinculados: newProcessos });
  };

  const addVideoaula = (aulaId) => {
    const aula = todasAulas?.find(a => a.id === aulaId);
    if (aula && !formData.videoaulas_vinculadas.find(v => v.id === aulaId)) {
      const curso = cursos?.find(c => c.id === aula.course_id);
      setFormData({
        ...formData,
        videoaulas_vinculadas: [...formData.videoaulas_vinculadas, {
          id: aula.id,
          titulo: aula.title,
          descricao: curso?.title || "",
          video_url: aula.video_url
        }]
      });
    }
  };

  const removeVideoaula = (index) => {
    const newVideoaulas = formData.videoaulas_vinculadas.filter((_, i) => i !== index);
    setFormData({ ...formData, videoaulas_vinculadas: newVideoaulas });
  };

  const addParticipante = () => {
    setFormData({
      ...formData,
      participantes: [...formData.participantes, { nome: "", cargo: "", email: "" }]
    });
  };

  const removeParticipante = (index) => {
    const newParticipantes = formData.participantes.filter((_, i) => i !== index);
    setFormData({ ...formData, participantes: newParticipantes });
  };

  const addPauta = () => {
    setFormData({
      ...formData,
      pauta: [...formData.pauta, { titulo: "", descricao: "", tempo_estimado: 15 }]
    });
  };

  const removePauta = (index) => {
    const newPauta = formData.pauta.filter((_, i) => i !== index);
    setFormData({ ...formData, pauta: newPauta });
  };

  const addObjetivo = () => {
    setFormData({
      ...formData,
      objetivos: [...formData.objetivos, ""]
    });
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Acesso restrito a consultores</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {formData.id ? 'Editar Atendimento' : 'Registrar Atendimento de Consultoria'}
        </h1>
        <p className="text-gray-600 mt-2">
          {formData.id ? 'Atualize as informações do atendimento' : 'Agende e registre informações do atendimento ao cliente'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados Básicos */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Oficina Cliente *</Label>
                <WorkshopSearchSelect
                  workshops={workshops}
                  value={formData.workshop_id}
                  onValueChange={(value) => setFormData({ ...formData, workshop_id: value })}
                />
              </div>

              {user?.role === 'admin' && (
                <div>
                  <Label>Consultor Responsável</Label>
                  <Select
                    value={formData.consultor_id || user.id}
                    onValueChange={(value) => {
                      const consultor = consultores?.find(c => c.user_id === value);
                      setFormData({ 
                        ...formData, 
                        consultor_id: value,
                        consultor_nome: consultor?.full_name || user.full_name
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={user.id}>{user.full_name} (Eu)</SelectItem>
                      {consultores?.filter(c => c.user_id !== user.id).map((c) => (
                        <SelectItem key={c.id} value={c.user_id}>
                          {c.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Tipo de Atendimento *</Label>
                  <TipoAtendimentoManager
                    customTipos={customTipos}
                    onSave={setCustomTipos}
                  />
                </div>
                <Select
                  value={formData.tipo_atendimento}
                  onValueChange={(value) => {
                    const duracoes = {
                      diagnostico_inicial: 45,
                      acompanhamento_mensal: 45,
                      reuniao_estrategica: 45,
                      treinamento: 45,
                      auditoria: 45,
                      revisao_metas: 45,
                      imersao_individual: 480,
                      imersao_presencial: 1800,
                      pda_grupo: 120,
                      aceleradores_presenciais: 1200,
                      imersao_online: 480,
                      mentoria: 45,
                      outros: 60
                    };

                    const tipoCustom = customTipos.find(t => t.value === value);
                    const duracao = tipoCustom?.duracao_minutos || duracoes[value] || 60;

                    setFormData({ 
                      ...formData, 
                      tipo_atendimento: value,
                      duracao_minutos: duracao
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diagnostico_inicial">Diagnóstico Inicial (45min)</SelectItem>
                    <SelectItem value="acompanhamento_mensal">Acompanhamento Mensal (45min)</SelectItem>
                    <SelectItem value="reuniao_estrategica">Reunião Estratégica (45min)</SelectItem>
                    <SelectItem value="treinamento">Treinamento (45min)</SelectItem>
                    <SelectItem value="auditoria">Auditoria (45min)</SelectItem>
                    <SelectItem value="revisao_metas">Revisão de Metas (45min)</SelectItem>
                    <SelectItem value="imersao_individual">Imersão Individual (8h)</SelectItem>
                    <SelectItem value="imersao_presencial">Imersão Presencial (30h)</SelectItem>
                    <SelectItem value="pda_grupo">PDA em Grupo (2h)</SelectItem>
                    <SelectItem value="aceleradores_presenciais">Aceleradores Presenciais (20h)</SelectItem>
                    <SelectItem value="imersao_online">Imersão Online (8h)</SelectItem>
                    <SelectItem value="mentoria">Mentoria (45min)</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                    {customTipos.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agendado">Agendado</SelectItem>
                    <SelectItem value="confirmado">Confirmado</SelectItem>
                    <SelectItem value="realizado">Realizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={formData.data_agendada}
                  onChange={(e) => setFormData({ ...formData, data_agendada: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Horário *</Label>
                <Input
                  type="time"
                  value={formData.hora_agendada}
                  onChange={(e) => setFormData({ ...formData, hora_agendada: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Duração (min)</Label>
                <Input
                  type="number"
                  value={formData.duracao_minutos}
                  onChange={(e) => setFormData({ ...formData, duracao_minutos: parseInt(e.target.value) })}
                  min="15"
                  step="15"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Google Meet</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Link do Google Meet"
                  value={formData.google_meet_link}
                  onChange={(e) => setFormData({ ...formData, google_meet_link: e.target.value })}
                />
                <Button type="button" variant="outline" onClick={gerarLinkGoogleMeet}>
                  <Video className="w-4 h-4 mr-2" />
                  Gerar
                </Button>
              </div>
            </div>

            {formData.status === 'participando' && (
              <div className="border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mb-4"
                  onClick={() => setShowMeetingTimer(!showMeetingTimer)}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  {showMeetingTimer ? 'Ocultar Timer' : 'Iniciar Reunião com Timer'}
                </Button>
                {showMeetingTimer && <MeetingTimer onTimerData={setTimerData} />}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Participantes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
            <CardTitle>Participantes</CardTitle>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={addParticipante}>
                <Plus className="w-4 h-4 mr-2" />
                Manual
              </Button>
              {colaboradores && colaboradores.length > 0 && (
                <Select onValueChange={(value) => {
                  const colab = colaboradores.find(c => c.id === value);
                  if (colab) {
                    setFormData({
                      ...formData,
                      participantes: [...formData.participantes, {
                        nome: colab.full_name,
                        cargo: colab.position,
                        email: colab.email
                      }]
                    });
                  }
                }}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Da oficina" />
                  </SelectTrigger>
                  <SelectContent>
                    {colaboradores.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name} - {c.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {colaboradoresInternos && colaboradoresInternos.length > 0 && (
                <Select onValueChange={(value) => {
                  const colab = colaboradoresInternos.find(c => c.id === value);
                  if (colab) {
                    setFormData({
                      ...formData,
                      participantes: [...formData.participantes, {
                        nome: colab.full_name,
                        cargo: colab.position + " (Interno)",
                        email: colab.email
                      }]
                    });
                  }
                }}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Interno" />
                  </SelectTrigger>
                  <SelectContent>
                    {colaboradoresInternos.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name} - {c.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.participantes.map((p, idx) => (
              <div key={idx} className="flex gap-3 items-start">
                <div className="flex-1 grid grid-cols-3 gap-3">
                  <Input
                    placeholder="Nome"
                    value={p.nome}
                    onChange={(e) => {
                      const newP = [...formData.participantes];
                      newP[idx].nome = e.target.value;
                      setFormData({ ...formData, participantes: newP });
                    }}
                  />
                  <Input
                    placeholder="Cargo"
                    value={p.cargo}
                    onChange={(e) => {
                      const newP = [...formData.participantes];
                      newP[idx].cargo = e.target.value;
                      setFormData({ ...formData, participantes: newP });
                    }}
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={p.email}
                    onChange={(e) => {
                      const newP = [...formData.participantes];
                      newP[idx].email = e.target.value;
                      setFormData({ ...formData, participantes: newP });
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeParticipante(idx)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Captura Inteligente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📊 Capturar Inteligência do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {formData.workshop_id ? (
              <ClientIntelligenceCapturePanel
                workshopId={formData.workshop_id}
                ataId={formData.id}
                onSuccess={() => {
                  toast.success('Inteligência capturada!');
                }}
                onIntelligenceAdded={(intelligence) => {
                  const novaPauta = {
                    titulo: `${intelligence.area} - ${intelligence.type}`,
                    descricao: intelligence.subcategory,
                    tempo_estimado: 15
                  };
                  setFormData({
                    ...formData,
                    pauta: [...formData.pauta, novaPauta]
                  });
                  toast.success('Adicionado à pauta da reunião!');

                  // Scroll para pauta
                  setTimeout(() => {
                    pautaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 300);
                }}
              />
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                Selecione uma oficina para capturar inteligência
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pauta */}
        <Card ref={pautaRef}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pauta da Reunião</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addPauta}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Tópico
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.pauta.map((p, idx) => (
              <div key={idx} className="space-y-2 border-b pb-4">
                <div className="flex gap-3 items-start">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Título do tópico"
                      value={p.titulo}
                      onChange={(e) => {
                        const newP = [...formData.pauta];
                        newP[idx].titulo = e.target.value;
                        setFormData({ ...formData, pauta: newP });
                      }}
                    />
                    <Textarea
                      placeholder="Descrição"
                      value={p.descricao}
                      onChange={(e) => {
                        const newP = [...formData.pauta];
                        newP[idx].descricao = e.target.value;
                        setFormData({ ...formData, pauta: newP });
                      }}
                      rows={2}
                    />
                  </div>
                  <Input
                    type="number"
                    placeholder="Tempo (min)"
                    className="w-24"
                    value={p.tempo_estimado}
                    onChange={(e) => {
                      const newP = [...formData.pauta];
                      newP[idx].tempo_estimado = parseInt(e.target.value);
                      setFormData({ ...formData, pauta: newP });
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePauta(idx)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Objetivos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Objetivos do Atendimento</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addObjetivo}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {formData.objetivos.map((obj, idx) => (
              <Input
                key={idx}
                placeholder={`Objetivo ${idx + 1}`}
                value={obj}
                onChange={(e) => {
                  const newObj = [...formData.objetivos];
                  newObj[idx] = e.target.value;
                  setFormData({ ...formData, objetivos: newObj });
                }}
              />
            ))}
          </CardContent>
        </Card>

        {/* Mídias e Anexos */}
        <Card>
          <CardHeader>
            <CardTitle>Mídias e Anexos para o Cliente</CardTitle>
            <p className="text-sm text-gray-600">Upload de arquivos, links e documentos do repositório</p>
          </CardHeader>
          <CardContent>
            <MediaUploadField
              midias={formData.midias_anexas}
              onChange={(midias) => setFormData({ ...formData, midias_anexas: midias })}
            />
          </CardContent>
        </Card>

        {/* Conteúdo Pedagógico Vinculado */}
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeProcesso(idx)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Videoaulas/Treinamentos */}
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVideoaula(idx)}
                        >
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

        {/* Observações */}
        <Card>
          <CardHeader>
            <CardTitle>Observações e Próximos Passos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AudioTranscriptionField
              label="Observações do Consultor"
              value={formData.observacoes_consultor}
              onChange={(text) => setFormData({ ...formData, observacoes_consultor: text })}
              placeholder="Notas e observações sobre o atendimento..."
              rows={4}
            />
            <AudioTranscriptionField
              label="Próximos Passos"
              value={formData.proximos_passos}
              onChange={(text) => setFormData({ ...formData, proximos_passos: text })}
              placeholder="O que deve ser feito até o próximo encontro..."
              rows={3}
            />

            {formData.id && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={async () => {
                  setShowAISummary(true);
                  try {
                    const { data } = await base44.functions.invoke('generateAtaSummaryWithContext', {
                      atendimento_id: formData.id
                    });
                    setAISummary(data.analise);
                    toast.success("Análise com IA gerada!");
                  } catch (error) {
                    toast.error("Erro: " + error.message);
                    setShowAISummary(false);
                  }
                }}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar Resumo com IA (últimas 10 atas)
              </Button>
            )}

            {showAISummary && aiSummary && (
              <div className="border rounded-lg p-4 bg-blue-50 space-y-3">
                <h4 className="font-semibold text-blue-900">📊 Análise Inteligente</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="font-medium">Resumo:</p>
                    <p className="text-gray-700">{aiSummary.resumo_executivo}</p>
                  </div>
                  {aiSummary.problemas_recorrentes?.length > 0 && (
                    <div>
                      <p className="font-medium">Problemas Recorrentes:</p>
                      <ul className="list-disc ml-4 text-gray-700">
                        {aiSummary.problemas_recorrentes.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    </div>
                  )}
                  {aiSummary.recomendacoes?.length > 0 && (
                    <div>
                      <p className="font-medium">Recomendações:</p>
                      <ul className="list-disc ml-4 text-gray-700">
                        {aiSummary.recomendacoes.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Opções Avançadas */}
        <Card>
          <CardHeader>
            <CardTitle>Opções Avançadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => setShowNotificationModal(true)}
            >
              📅 Programar Notificações Automáticas
            </Button>

            {!formData.id && (
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowTemplateModal(true)}
              >
                📋 Usar Template de Atendimento
              </Button>
            )}

            {formData.workshop_id && (
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={async () => {
                  try {
                    toast.info('Gerando relatório completo...');
                    const response = await base44.functions.invoke('gerarRelatorioCliente', {
                      workshop_id: formData.workshop_id
                    });

                    // Download do PDF
                    const blob = new Blob([response.data], { type: 'application/pdf' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Relatorio_Completo_${new Date().toISOString().split('T')[0]}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    a.remove();

                    toast.success('Relatório gerado com sucesso!');
                  } catch (error) {
                    toast.error('Erro ao gerar relatório: ' + error.message);
                  }
                }}
              >
                📊 Gerar Relatório Completo do Cliente
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Ações de Envio da Ata */}
        {formData.status === 'realizado' && (
          <Card>
            <CardHeader>
              <CardTitle>Enviar Documento para Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={async () => {
                    if (!formData.workshop_id) {
                      toast.error("Selecione uma oficina primeiro");
                      return;
                    }
                    try {
                      const response = await base44.functions.invoke('enviarAtaWhatsApp', {
                        atendimento_id: formData.id
                      });
                      const phone = response.data.phone?.replace(/\D/g, '') || '';
                      const message = encodeURIComponent(response.data.whatsapp_message);
                      window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
                      toast.success("WhatsApp aberto!");
                    } catch (error) {
                      toast.error("Erro: " + error.message);
                    }
                  }}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={async () => {
                    try {
                      await base44.functions.invoke('enviarAtaEmail', {
                        atendimento_id: formData.id
                      });
                      toast.success("Ata enviada por email!");
                    } catch (error) {
                      toast.error("Erro: " + error.message);
                    }
                  }}
                >
                  <Send className="w-4 h-4 mr-2" />
                  E-mail
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={async () => {
                    try {
                      await base44.functions.invoke('disponibilizarAtaPlataforma', {
                        atendimento_id: formData.id
                      });
                      toast.success("Ata disponibilizada na plataforma!");
                    } catch (error) {
                      toast.error("Erro: " + error.message);
                    }
                  }}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Plataforma
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ações */}
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (fromAgenda) {
                navigate(-1); // Volta para a agenda
              } else {
                navigate(createPageUrl('ControleAceleracao'));
              }
            }}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              formData.id ? 'Atualizar Atendimento' : 'Salvar Atendimento'
            )}
            </Button>
        </div>

        {/* Modais */}
        {showNotificationModal && (
          <NotificationSchedulerModal
            onClose={() => setShowNotificationModal(false)}
            onSave={(notificacoes) => {
              setFormData({ ...formData, notificacoes_programadas: notificacoes });
              setShowNotificationModal(false);
              toast.success('Notificações programadas!');
            }}
          />
        )}

        {showTemplateModal && (
          <TemplateAtendimentoModal
            onClose={() => setShowTemplateModal(false)}
            onSelect={(template) => {
              setFormData({
                ...formData,
                tipo_atendimento: template.tipo,
                pauta: template.pauta || [{ titulo: "", descricao: "", tempo_estimado: 15 }],
                objetivos: template.objetivos || [""],
                duracao_minutos: template.duracao_minutos || 60
              });
              setShowTemplateModal(false);
              toast.success('Template aplicado!');
            }}
          />
        )}

        <ConflitosHorarioModal
          open={conflitosModal.open}
          onOpenChange={(open) => setConflitosModal({ ...conflitosModal, open })}
          conflitos={conflitosModal.conflitos}
          dataHorario={conflitosModal.dataHorario}
          consultorId={formData.consultor_id || user?.id}
          onSelectHorario={({ data, hora }) => {
            setFormData({
              ...formData,
              data_agendada: data,
              hora_agendada: hora
            });
          }}
        />
        </form>
    </div>
  );
}