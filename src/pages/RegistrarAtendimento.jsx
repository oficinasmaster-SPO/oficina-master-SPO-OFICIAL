import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, X, Check } from "lucide-react";
import { toast } from "sonner";
import ConflitosHorarioModal from "@/components/aceleracao/ConflitosHorarioModal";
import ClientIntelligenceCapturePanel from "@/components/inteligencia/ClientIntelligenceCapturePanel";
import ChecklistConsultoria from "@/components/aceleracao/ChecklistConsultoria";
import { useGoogleMeet } from "@/components/hooks/useGoogleMeet";
import useConsultoresList from "@/components/hooks/useConsultoresList";
import AtendimentoProgressIndicator from "@/components/aceleracao/AtendimentoProgressIndicator";
import AutoSaveIndicator from "@/components/aceleracao/AutoSaveIndicator";
import { toBrazilDate } from "@/utils/timezone";

// Decomposed sections (M3)
import BasicInfoSection from "@/components/atendimento/BasicInfoSection";
import ParticipantsSection from "@/components/atendimento/ParticipantsSection";
import AgendaSection from "@/components/atendimento/AgendaSection";
import ContentSection from "@/components/atendimento/ContentSection";
import ObservationsSection from "@/components/atendimento/ObservationsSection";
import AdvancedOptionsSection from "@/components/atendimento/AdvancedOptionsSection";
import AtaActionsSection from "@/components/atendimento/AtaActionsSection";

export default function RegistrarAtendimento({ isModal = false, onClose, atendimentoId: atendimentoIdProp, consultoresExternos }) {
  const navigate = useNavigate();
  const location = window.location;
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const fromAgenda = urlParams.get('fromAgenda') === 'true';

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (fromAgenda) {
      navigate(-1);
    } else {
      navigate(`${createPageUrl('ControleAceleracao')}?tab=atendimentos`);
    }
  };

  React.useEffect(() => {
    if (!onClose && location.pathname.toLowerCase().includes('registraratendimento')) {
      const isStandaloneMode = !isModal;
      if (!isStandaloneMode) {
        const newSearch = location.search ? location.search + '&modal=atendimento' : '?modal=atendimento';
        navigate(`${createPageUrl('ControleAceleracao')}${newSearch}`, { replace: true });
      }
    }
  }, [location.pathname, location.search, navigate, onClose]);

  React.useEffect(() => {
    if (isModal && (!location.pathname.toLowerCase().includes('registraratendimento'))) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = 'unset'; };
    }
  }, [isModal, location.pathname]);

  const [formData, setFormData] = useState({
    workshop_id: "", tipo_atendimento: "acompanhamento_mensal",
    data_agendada: "", hora_agendada: "", duracao_minutos: 60,
    status: "agendado", status_cliente: "", google_meet_link: "",
    participantes: [{ nome: "", cargo: "", email: "" }],
    pauta: [{ titulo: "", descricao: "", tempo_estimado: 15 }],
    objetivos: [""], topicos_discutidos: [], decisoes_tomadas: [],
    acoes_geradas: [], midias_anexas: [], processos_vinculados: [],
    videoaulas_vinculadas: [], documentos_vinculados: [],
    observacoes_consultor: "", proximos_passos: "",
    proximos_passos_list: [], notificacoes_programadas: [],
    checklist_respostas: []
  });

  const [customTipos, setCustomTipos] = useState([]);
  const [timerData, setTimerData] = useState(null);
  const [showMeetingTimer, setShowMeetingTimer] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [conflitosModal, setConflitosModal] = useState({ open: false, conflitos: [], dataHorario: null });
  const autoSaveTimerRef = useRef(null);
  const pautaRef = React.useRef(null);
  const pendingIntelligenceIdsRef = useRef([]);
  const { createMeeting, isCreating } = useGoogleMeet();

  // ── C4: Stable auto-save deps via JSON snapshot (I5: includes participantes, pauta, objetivos) ──
  const autoSaveSnapshot = useMemo(() => JSON.stringify({
    obs: formData.observacoes_consultor,
    pp: formData.proximos_passos,
    ppl: formData.proximos_passos_list,
    cr: formData.checklist_respostas,
    td: formData.topicos_discutidos,
    dt: formData.decisoes_tomadas,
    ag: formData.acoes_geradas,
    ma: formData.midias_anexas,
    pv: formData.processos_vinculados,
    vv: formData.videoaulas_vinculadas,
    dv: formData.documentos_vinculados,
    pa: formData.participantes,
    pt: formData.pauta,
    ob: formData.objetivos,
  }), [
    formData.observacoes_consultor, formData.proximos_passos,
    formData.proximos_passos_list, formData.checklist_respostas,
    formData.topicos_discutidos, formData.decisoes_tomadas,
    formData.acoes_geradas, formData.midias_anexas,
    formData.processos_vinculados, formData.videoaulas_vinculadas,
    formData.documentos_vinculados, formData.participantes,
    formData.pauta, formData.objetivos,
  ]);

  // ── Auth ──
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  // ── C3: Added atendimentoIdProp to deps ──
  const resolvedAtendimentoId = atendimentoIdProp || urlParams.get('atendimento_id') || urlParams.get('edit');

  React.useEffect(() => {
    if (resolvedAtendimentoId && user) {
      const loadAtendimento = async () => {
        try {
          const atendimento = await base44.entities.ConsultoriaAtendimento.get(resolvedAtendimentoId);
          if (atendimento) {
            const dataAgendada = toBrazilDate(atendimento.data_agendada);
            const yr = dataAgendada.getFullYear();
            const mo = String(dataAgendada.getMonth() + 1).padStart(2, '0');
            const dy = String(dataAgendada.getDate()).padStart(2, '0');
            const hr = String(dataAgendada.getHours()).padStart(2, '0');
            const mn = String(dataAgendada.getMinutes()).padStart(2, '0');
            setFormData({
              ...atendimento,
              data_agendada: `${yr}-${mo}-${dy}`,
              hora_agendada: `${hr}:${mn}`,
              participantes: atendimento.participantes || [{ nome: "", cargo: "", email: "" }],
              pauta: atendimento.pauta || [{ titulo: "", descricao: "", tempo_estimado: 15 }],
              objetivos: atendimento.objetivos || [""],
              midias_anexas: atendimento.midias_anexas || [],
              processos_vinculados: atendimento.processos_vinculados || [],
              videoaulas_vinculadas: atendimento.videoaulas_vinculadas || [],
              documentos_vinculados: atendimento.documentos_vinculados || [],
              topicos_discutidos: atendimento.topicos_discutidos || [],
              decisoes_tomadas: atendimento.decisoes_tomadas || [],
              acoes_geradas: atendimento.acoes_geradas || [],
              proximos_passos_list: atendimento.proximos_passos_list || [],
              checklist_respostas: atendimento.checklist_respostas || []
            });
            setShowMeetingTimer(atendimento.status === 'participando');
          }
        } catch (error) {
          toast.error("Erro ao carregar atendimento");
        }
      };
      loadAtendimento();
    }
  }, [user, resolvedAtendimentoId]);

  // ── C2: Unified workshop query — uses same queryKey as useWorkshopsAtivos ──
  const { data: workshops } = useQuery({
    queryKey: ['workshops-ativos'],
    queryFn: async () => {
      const all = await base44.entities.Workshop.filter({ status: 'ativo' }, 'name', 5000);
      return all.filter(w => w.planoAtual && w.planoAtual !== 'FREE');
    },
    enabled: user?.role === 'admin' || user?.job_role === 'acelerador',
    staleTime: 10 * 60 * 1000
  });

  // ── I1: consultores come from Employee (not User) — names are accurate ──
  const { data: consultoresFetched } = useConsultoresList(user);
  const consultores = (consultoresExternos?.length > 0) ? consultoresExternos : consultoresFetched;

  // ── I2: Set default consultor_id when user loads and consultores are available ──
  useEffect(() => {
    if (user?.id && !formData.consultor_id && !resolvedAtendimentoId) {
      const consultor = consultores?.find(c => c.id === user.id);
      setFormData(prev => ({
        ...prev,
        consultor_id: user.id,
        consultor_nome: consultor?.full_name || user.full_name
      }));
    }
  }, [user?.id, consultores, resolvedAtendimentoId]);

  const { data: colaboradores } = useQuery({
    queryKey: ['colaboradores-oficina', formData.workshop_id],
    queryFn: async () => {
      if (!formData.workshop_id) return [];
      return await base44.entities.Employee.filter({
        workshop_id: formData.workshop_id, status: 'ativo'
      }, null, 500);
    },
    enabled: !!formData.workshop_id
  });



  const { data: processos } = useQuery({
    queryKey: ['processos-disponiveis'],
    queryFn: () => base44.entities.ProcessDocument.list('-created_date', 1000),
    staleTime: 10 * 60 * 1000
  });

  const { data: tiposCustomizados = [], refetch: refetchTipos } = useQuery({
    queryKey: ['tipos-atendimento-consultoria'],
    queryFn: async () => {
      const tipos = await base44.entities.TipoAtendimentoConsultoria.filter({ ativo: true });
      return tipos || [];
    },
    staleTime: 5 * 60 * 1000
  });

  const todosOsTipos = useMemo(() => {
    const customFormatted = (tiposCustomizados || []).map(t => ({
      id: t.value || t.id, value: t.value, label: t.label, duracao: t.duracao_minutos || 45
    }));
    const padrao = [
      { id: 'acompanhamento_mensal', value: 'acompanhamento_mensal', label: 'Acompanhamento Mensal', duracao: 60 },
      { id: 'diagnostico', value: 'diagnostico', label: 'Diagnóstico', duracao: 90 },
      { id: 'workshop', value: 'workshop', label: 'Workshop', duracao: 120 },
      { id: 'mentoria', value: 'mentoria', label: 'Mentoria', duracao: 45 }
    ];
    const customIds = new Set(customFormatted.map(c => c.value));
    return [...customFormatted, ...padrao.filter(p => !customIds.has(p.value))];
  }, [tiposCustomizados]);

  const { data: cursos } = useQuery({
    queryKey: ['cursos-treinamento'],
    queryFn: () => base44.entities.TrainingCourse.list('-created_date', 1000),
    staleTime: 10 * 60 * 1000
  });

  const { data: todasAulas } = useQuery({
    queryKey: ['todas-aulas-publicadas'],
    queryFn: async () => {
      const aulas = await base44.entities.CourseLesson.list('-created_date', 2000);
      const cursosPublicados = cursos?.filter(c => c.status === 'published').map(c => c.id) || [];
      return aulas.filter(a => cursosPublicados.includes(a.course_id));
    },
    enabled: !!cursos,
    staleTime: 10 * 60 * 1000
  });

  // ── Mutation: create/update ──
  const createMutation = useMutation({
    mutationFn: async (data) => {
      if (!data.workshop_id) throw new Error("Selecione uma oficina");
      if (!data.data_agendada || !data.hora_agendada) throw new Error("Preencha data e horário");

      const dataHora = `${data.data_agendada}T${data.hora_agendada}:00`;

      // I1: Use consultor_nome from consultores list (Employee name) if available
      let consultorNome = data.consultor_nome;
      if (!consultorNome || consultorNome === user.full_name) {
        const consultorId = data.consultor_id || user.id;
        const consultor = consultores?.find(c => c.id === consultorId);
        consultorNome = consultor?.full_name || user.full_name;
      }

      const atendimentoData = {
        workshop_id: data.workshop_id,
        tipo_atendimento: data.tipo_atendimento,
        status: data.status,
        status_cliente: data.status_cliente,
        consultor_id: data.consultor_id || user.id,
        consultor_nome: consultorNome,
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
        proximos_passos_list: (data.proximos_passos_list || []).filter(p => p.descricao),
        checklist_respostas: data.checklist_respostas || [],
        notificacoes_programadas: data.notificacoes_programadas || []
      };

      const atendimento = data.id
        ? await base44.entities.ConsultoriaAtendimento.update(data.id, atendimentoData)
        : await base44.entities.ConsultoriaAtendimento.create(atendimentoData);

      // Link pending intelligence
      if (!data.id && pendingIntelligenceIdsRef.current.length > 0) {
        try {
          await Promise.all(
            pendingIntelligenceIdsRef.current.map(id =>
              base44.entities.ClientIntelligence.update(id, { attendance_id: atendimento.id })
            )
          );
          pendingIntelligenceIdsRef.current = [];
        } catch (e) {
          console.error('Erro ao vincular inteligências:', e);
        }
      }

      // C1: Use base44.functions.invoke instead of asServiceRole in frontend
      if (atendimentoData.status === 'realizado' && !atendimento.ata_id) {
        try {
          const ataResponse = await base44.functions.invoke('gerarAtaConsultoria', {
            atendimento_id: atendimento.id
          });
          if (ataResponse.data?.ata_id) {
            await base44.entities.ConsultoriaAtendimento.update(atendimento.id, {
              ata_id: ataResponse.data.ata_id
            });
            await base44.entities.MeetingMinutes.update(ataResponse.data.ata_id, {
              status: 'finalizada'
            });
          }
        } catch (error) {
          console.error('Erro ao gerar/finalizar ATA:', error);
        }
      } else if (atendimento.ata_id) {
        try {
          await base44.entities.MeetingMinutes.update(atendimento.ata_id, { status: 'finalizada' });
        } catch (error) {
          console.error('Erro ao finalizar ATA:', error);
        }
      }

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
    onSuccess: () => {
      queryClient.invalidateQueries(['consultoria-atendimentos']);
      queryClient.invalidateQueries(['meeting-minutes']);
      queryClient.invalidateQueries(['todos-atendimentos']);
      setSaveSuccess(true);
      toast.success('Atendimento salvo com sucesso!');
      setTimeout(() => handleClose(), 800);
    },
    onError: (error) => {
      toast.error('Erro ao salvar: ' + (error.message || "Verifique os campos obrigatórios"));
    }
  });

  // ── Mutation: gerar ATA ──
  const gerarAtaMutation = useMutation({
    mutationFn: async (params) => {
      const payload = typeof params === 'string'
        ? { atendimento_id: params }
        : {
            atendimento_id: params.atendimento_id,
            ai_config: {
              selectedSections: params.selectedSections,
              tone: params.tone,
              suggestNextSteps: params.suggestNextSteps,
            }
          };
      return await base44.functions.invoke('gerarAtaConsultoria', payload);
    },
    onSuccess: (response) => {
      toast.success('Ata gerada com sucesso!');
      queryClient.invalidateQueries(['consultoria-atendimentos']);
      const sugestoes = response?.data?.suggested_next_steps;
      if (sugestoes && sugestoes.length > 0) {
        setFormData(prev => ({
          ...prev,
          ata_id: response.data.ata_id || prev.ata_id,
          proximos_passos_list: [
            ...(prev.proximos_passos_list || []),
            ...sugestoes.map(s => ({ descricao: s.descricao, responsavel: s.responsavel || '', prazo: s.prazo || '' }))
          ]
        }));
        toast.info(`${sugestoes.length} próximos passos sugeridos pela IA foram adicionados!`);
      } else if (response?.data?.ata_id) {
        setFormData(prev => ({ ...prev, ata_id: response.data.ata_id }));
      }
    },
    onError: (error) => {
      toast.error('Erro ao gerar ata: ' + error.message);
    }
  });

  const handleDeleteAta = async () => {
    if (window.confirm("Tem certeza que deseja excluir esta ATA permanentemente?")) {
      try {
        await base44.functions.invoke('deleteAta', { ata_id: formData.ata_id });
        toast.success("ATA excluída com sucesso!");
        setFormData(prev => ({ ...prev, ata_id: null }));
        queryClient.invalidateQueries(['consultoria-atendimentos']);
        queryClient.invalidateQueries(['meeting-minutes']);
      } catch (error) {
        toast.error("Erro ao excluir ATA: " + error.message);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.workshop_id) { toast.error("Selecione uma oficina"); return; }
    if (!formData.consultor_id) { toast.error("Selecione um consultor"); return; }
    if (!formData.tipo_atendimento) { toast.error("Selecione o tipo de atendimento"); return; }
    if (!formData.data_agendada || !formData.hora_agendada) { toast.error("Preencha data e horário do atendimento"); return; }

    try {
      const dataHoraCompleta = `${formData.data_agendada}T${formData.hora_agendada}:00`;
      const consultorId = formData.consultor_id || user.id;
      const response = await base44.functions.invoke('verificarConflitoHorario', {
        consultor_id: consultorId,
        data_agendada: dataHoraCompleta,
        duracao_minutos: formData.duracao_minutos,
        atendimento_id_editando: formData.id
      });
      if (response.data.conflito) {
        setConflitosModal({ open: true, conflitos: response.data.atendimentos, dataHorario: dataHoraCompleta });
        return;
      }
    } catch (error) {
      toast.error("Erro ao verificar conflitos de horário");
      return;
    }

    const dadosParaSalvar = timerData ? { ...formData, ...timerData } : formData;
    createMutation.mutate(dadosParaSalvar);
  };

  // ── C4: Auto-save uses stable JSON snapshot ──
  useEffect(() => {
    if (!formData.id) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      if (!formData.workshop_id || !formData.data_agendada || !formData.hora_agendada) return;
      setAutoSaveStatus('saving');
      try {
        await base44.entities.ConsultoriaAtendimento.update(formData.id, {
          observacoes_consultor: formData.observacoes_consultor,
          proximos_passos: formData.proximos_passos,
          proximos_passos_list: (formData.proximos_passos_list || []).filter(p => p.descricao),
          checklist_respostas: formData.checklist_respostas || [],
          topicos_discutidos: formData.topicos_discutidos || [],
          decisoes_tomadas: formData.decisoes_tomadas || [],
          acoes_geradas: formData.acoes_geradas || [],
          midias_anexas: (formData.midias_anexas || []).filter(m => m.url),
          processos_vinculados: formData.processos_vinculados || [],
          videoaulas_vinculadas: formData.videoaulas_vinculadas || [],
          documentos_vinculados: formData.documentos_vinculados || [],
          participantes: (formData.participantes || []).filter(p => p.nome),
          pauta: (formData.pauta || []).filter(p => p.titulo),
          objetivos: (formData.objetivos || []).filter(o => o),
        });
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus(null), 3000);
      } catch (e) {
        console.error('Auto-save error:', e);
        setAutoSaveStatus('error');
      }
    }, 3000);

    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [autoSaveSnapshot, formData.id, formData.workshop_id, formData.data_agendada, formData.hora_agendada]);

  if (!user || user.role !== 'admin') {
    return <div className="text-center py-12"><p className="text-gray-600">Acesso restrito a consultores</p></div>;
  }

  const content = (
    <>
      <AtendimentoProgressIndicator formData={formData} />

      {formData.id && autoSaveStatus && (
        <div className="flex justify-end"><AutoSaveIndicator status={autoSaveStatus} /></div>
      )}

      <BasicInfoSection
        formData={formData} setFormData={setFormData} user={user}
        workshops={workshops} consultores={consultores}
        todosOsTipos={todosOsTipos} customTipos={customTipos} setCustomTipos={setCustomTipos}
        createMeeting={createMeeting} isCreating={isCreating}
        showMeetingTimer={showMeetingTimer} setShowMeetingTimer={setShowMeetingTimer}
        setTimerData={setTimerData}
      />

      <ParticipantsSection
        formData={formData} setFormData={setFormData}
        colaboradores={colaboradores} colaboradoresInternos={consultores}
      />

      {/* Captura Inteligente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">📊 Capturar Inteligência do Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          {formData.workshop_id ? (
            <ClientIntelligenceCapturePanel
              key={`intel-${formData.id || 'new'}-${formData.workshop_id}`}
              workshopId={formData.workshop_id}
              ataId={formData.id}
              onPendingIdsChange={(ids) => { pendingIntelligenceIdsRef.current = ids; }}
              onSuccess={() => { toast.success('Inteligência capturada!'); }}
              onIntelligenceAdded={(intelligence) => {
                const novaPauta = {
                  titulo: `${intelligence.area} - ${intelligence.type}`,
                  descricao: intelligence.subcategory,
                  tempo_estimado: 15
                };
                setFormData(prev => ({ ...prev, pauta: [...prev.pauta, novaPauta] }));
                toast.success('Adicionado à pauta da reunião!');
                setTimeout(() => { pautaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 300);
              }}
            />
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">Selecione uma oficina para capturar inteligência</p>
          )}
        </CardContent>
      </Card>

      <AgendaSection formData={formData} setFormData={setFormData} pautaRef={pautaRef} />

      <ContentSection
        formData={formData} setFormData={setFormData}
        processos={processos} todasAulas={todasAulas} cursos={cursos}
      />

      {/* Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><span>📋</span> Checklist de Diagnóstico</CardTitle>
        </CardHeader>
        <CardContent>
          <ChecklistConsultoria
            respostas={formData.checklist_respostas || []}
            onChange={(respostas) => setFormData(prev => ({ ...prev, checklist_respostas: respostas }))}
          />
        </CardContent>
      </Card>

      <ObservationsSection formData={formData} setFormData={setFormData} />

      <AdvancedOptionsSection formData={formData} setFormData={setFormData} workshops={workshops} />

      <AtaActionsSection
        formData={formData} setFormData={setFormData}
        workshops={workshops} gerarAtaMutation={gerarAtaMutation}
        handleDeleteAta={handleDeleteAta} queryClient={queryClient}
      />

      {/* Action Buttons */}
      <div className="sticky bottom-0 z-20 -mx-6 px-6 mt-6">
        <div className="flex gap-3 justify-end bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] rounded-t-xl py-4 px-6">
          <Button type="button" variant="outline" onClick={handleClose} className="px-6">Cancelar</Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || saveSuccess}
            className={`px-6 shadow-md transition-all duration-300 ${
              saveSuccess
                ? 'bg-green-600 hover:bg-green-600'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {createMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
            ) : saveSuccess ? (
              <><Check className="w-4 h-4 mr-2" />Salvo!</>
            ) : (
              formData.id ? 'Atualizar Atendimento' : 'Salvar Atendimento'
            )}
          </Button>
        </div>
      </div>

      <ConflitosHorarioModal
        open={conflitosModal.open}
        onOpenChange={(open) => setConflitosModal(prev => ({ ...prev, open }))}
        conflitos={conflitosModal.conflitos}
        dataHorario={conflitosModal.dataHorario}
        consultorId={formData.consultor_id || user?.id}
        duracaoMinutos={formData.duracao_minutos}
        onSelectHorario={({ data, hora }) => {
          setFormData(prev => ({ ...prev, data_agendada: data, hora_agendada: hora }));
        }}
      />
    </>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
        <div className="absolute inset-0" onClick={handleClose} />
        <div className="relative bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.2)] w-full max-w-[800px] max-h-[95vh] flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between p-6 border-b shrink-0">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{formData.id ? 'Editar Atendimento' : 'Registrar Atendimento de Consultoria'}</h1>
              <p className="text-sm text-gray-600 mt-1">{formData.id ? 'Atualize as informações do atendimento' : 'Agende e registre informações do atendimento ao cliente'}</p>
            </div>
            <button type="button" onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
            <form onSubmit={handleSubmit} className="space-y-6">{content}</form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{formData.id ? 'Editar Atendimento' : 'Registrar Atendimento de Consultoria'}</h1>
        <p className="text-gray-600 mt-2">{formData.id ? 'Atualize as informações do atendimento' : 'Agende e registre informações do atendimento ao cliente'}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">{content}</form>
    </div>
  );
}