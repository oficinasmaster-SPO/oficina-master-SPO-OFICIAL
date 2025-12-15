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

export default function RegistrarAtendimento() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
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

  // Carregar usuário
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  // Carregar atendimento se vier da URL
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const atendimentoId = urlParams.get('atendimento_id');
    
    if (atendimentoId && user) {
      const loadAtendimento = async () => {
        try {
          const atendimentos = await base44.entities.ConsultoriaAtendimento.filter({ id: atendimentoId });
          const atendimento = atendimentos[0];
          
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
              documentos_vinculados: atendimento.documentos_vinculados || []
            });
            setShowMeetingTimer(atendimento.status === 'participando');
          }
        } catch (error) {
          console.error("Erro ao carregar atendimento:", error);
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

  // Carregar processos disponíveis
  const { data: processos } = useQuery({
    queryKey: ['processos-disponiveis'],
    queryFn: async () => {
      return await base44.entities.ProcessDocument.list();
    }
  });

  // Carregar módulos de treinamento
  const { data: modulos } = useQuery({
    queryKey: ['modulos-treinamento'],
    queryFn: async () => {
      return await base44.entities.TrainingModule.list();
    }
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
      toast.success('Atendimento salvo com sucesso!');
      navigate(createPageUrl('ControleAceleracao'));
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

  const addVideoaula = (moduloId) => {
    const modulo = modulos?.find(m => m.id === moduloId);
    if (modulo && !formData.videoaulas_vinculadas.find(v => v.id === moduloId)) {
      setFormData({
        ...formData,
        videoaulas_vinculadas: [...formData.videoaulas_vinculadas, {
          id: modulo.id,
          titulo: modulo.title,
          descricao: modulo.description
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
                <Select
                  value={formData.workshop_id}
                  onValueChange={(value) => setFormData({ ...formData, workshop_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a oficina" />
                  </SelectTrigger>
                  <SelectContent>
                    {workshops?.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} - {w.planoAtual} - {w.city}/{w.state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Label>Tipo de Atendimento *</Label>
                <Select
                  value={formData.tipo_atendimento}
                  onValueChange={(value) => setFormData({ ...formData, tipo_atendimento: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diagnostico_inicial">Diagnóstico Inicial</SelectItem>
                    <SelectItem value="acompanhamento_mensal">Acompanhamento Mensal</SelectItem>
                    <SelectItem value="reuniao_estrategica">Reunião Estratégica</SelectItem>
                    <SelectItem value="treinamento">Treinamento</SelectItem>
                    <SelectItem value="auditoria">Auditoria</SelectItem>
                    <SelectItem value="revisao_metas">Revisão de Metas</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
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
                  Adicionar Manual
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
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Adicionar da oficina" />
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

        {/* Pauta */}
        <Card>
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
            <div className="flex items-center justify-between">
              <CardTitle>Mídias e Anexos para o Cliente</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addMidia}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Mídia
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.midias_anexas.map((midia, idx) => (
              <div key={idx} className="flex gap-3 items-start border-b pb-3">
                <Select
                  value={midia.tipo}
                  onValueChange={(value) => {
                    const newMidias = [...formData.midias_anexas];
                    newMidias[idx].tipo = value;
                    setFormData({ ...formData, midias_anexas: newMidias });
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="link">Link</SelectItem>
                    <SelectItem value="imagem">Imagem</SelectItem>
                    <SelectItem value="video">Vídeo</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="URL"
                  value={midia.url}
                  onChange={(e) => {
                    const newMidias = [...formData.midias_anexas];
                    newMidias[idx].url = e.target.value;
                    setFormData({ ...formData, midias_anexas: newMidias });
                  }}
                />
                <Input
                  placeholder="Título"
                  value={midia.titulo}
                  onChange={(e) => {
                    const newMidias = [...formData.midias_anexas];
                    newMidias[idx].titulo = e.target.value;
                    setFormData({ ...formData, midias_anexas: newMidias });
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeMidia(idx)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
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
                <Select onValueChange={addProcesso}>
                  <SelectTrigger>
                    <SelectValue placeholder="Adicionar processo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {processos?.filter(p => !formData.processos_vinculados.find(pv => pv.id === p.id)).map((processo) => (
                      <SelectItem key={processo.id} value={processo.id}>
                        {processo.title} - {processo.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

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
                    {modulos?.filter(m => !formData.videoaulas_vinculadas.find(v => v.id === m.id)).map((modulo) => (
                      <SelectItem key={modulo.id} value={modulo.id}>
                        {modulo.title}
                      </SelectItem>
                    ))}
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
            <div>
              <Label>Observações do Consultor</Label>
              <Textarea
                value={formData.observacoes_consultor}
                onChange={(e) => setFormData({ ...formData, observacoes_consultor: e.target.value })}
                rows={4}
                placeholder="Notas e observações sobre o atendimento..."
              />
            </div>
            <div>
              <Label>Próximos Passos</Label>
              <Textarea
                value={formData.proximos_passos}
                onChange={(e) => setFormData({ ...formData, proximos_passos: e.target.value })}
                rows={3}
                placeholder="O que deve ser feito até o próximo encontro..."
              />
            </div>
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
            onClick={() => navigate(createPageUrl('CronogramaConsultoria'))}
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
      </form>
    </div>
  );
}