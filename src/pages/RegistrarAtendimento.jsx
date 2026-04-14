import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, X, Check, AlertCircle, User, ChevronRight, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import ClientIntelligenceViewer from "@/components/inteligencia/ClientIntelligenceViewer";
import { INTELLIGENCE_AREAS, INTELLIGENCE_TYPES } from "@/components/lib/clientIntelligenceConstants";

export default function RegistrarAtendimento({ isModal = false, onClose, atendimentoId: atendimentoIdProp, consultoresExternos, isReadOnly = false }) {
  const navigate = useNavigate();
  const location = window.location;
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const fromAgenda = urlParams.get('fromAgenda') === 'true';

  const actualClose = () => {
    if (onClose) {
      onClose();
    } else if (fromAgenda) {
      navigate(-1);
    } else {
      navigate(`${createPageUrl('ControleAceleracao')}?tab=atendimentos`);
    }
  };

  const handleClose = () => {
    // E2: Confirm before discarding unsaved changes (also for new records with data filled)
    const hasFilledData = formData.workshop_id || formData.data_agendada || formData.observacoes_consultor;
    if (hasUnsavedChanges && formData.id) {
      if (!window.confirm('Existem alterações não salvas. Deseja realmente sair?')) return;
    } else if (!formData.id && hasFilledData) {
      if (!window.confirm('Você preencheu dados que ainda não foram salvos. Deseja realmente sair?')) return;
    }
    if (isModal) {
      setIsClosing(true);
      setTimeout(() => actualClose(), 250);
    } else {
      actualClose();
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
  const [autoSaveStatus, setAutoSaveStatus] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [conflitosModal, setConflitosModal] = useState({ open: false, conflitos: [], dataHorario: null });
  const autoSaveTimerRef = useRef(null);
  const autoSaveInitializedRef = useRef(false);
  const pautaRef = React.useRef(null);
  const pendingIntelligenceIdsRef = useRef([]);
  const closeTimerRef = useRef(null);
  const fallbackTimerRef = useRef(null);
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
    // P3: basic fields included in auto-save
    st: formData.status,
    sc: formData.status_cliente,
    ta: formData.tipo_atendimento,
    dm: formData.duracao_minutos,
    gm: formData.google_meet_link,
  }), [
    formData.observacoes_consultor, formData.proximos_passos,
    formData.proximos_passos_list, formData.checklist_respostas,
    formData.topicos_discutidos, formData.decisoes_tomadas,
    formData.acoes_geradas, formData.midias_anexas,
    formData.processos_vinculados, formData.videoaulas_vinculadas,
    formData.documentos_vinculados, formData.participantes,
    formData.pauta, formData.objetivos,
    formData.status, formData.status_cliente,
    formData.tipo_atendimento, formData.duracao_minutos,
    formData.google_meet_link,
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
      // P6: Reset auto-save guard when switching between attendances
      autoSaveInitializedRef.current = false;
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
            // Timer removed
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

  const { data: ataData } = useQuery({
    queryKey: ['ata-read-only', formData.ata_id],
    queryFn: () => base44.entities.MeetingMinutes.get(formData.ata_id),
    enabled: !!formData.ata_id && isReadOnly
  });

  const { data: followUps } = useQuery({
    queryKey: ['follow-ups', resolvedAtendimentoId],
    queryFn: async () => {
      if (!resolvedAtendimentoId) return [];
      return await base44.entities.FollowUpReminder.filter({ atendimento_id: resolvedAtendimentoId }, 'sequence_number');
    },
    enabled: !!resolvedAtendimentoId && isReadOnly
  });

  const { data: clientIntelligences } = useQuery({
    queryKey: ['client-intelligences', resolvedAtendimentoId],
    queryFn: async () => {
      if (!resolvedAtendimentoId) return [];
      const items = await base44.entities.ClientIntelligence.filter({ attendance_id: resolvedAtendimentoId });
      return items.map(item => {
        const typeObj = INTELLIGENCE_TYPES[item.type];
        const gravityLabel = { baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica" }[item.gravity || "media"];
        return {
          ...item,
          gravityLabel,
          typeIcon: typeObj?.icon,
          typeColor: typeObj?.color,
          areaLabel: INTELLIGENCE_AREAS[item.area]?.label || item.area,
          typeLabel: INTELLIGENCE_TYPES[item.type]?.label || item.type,
        };
      });
    },
    enabled: !!resolvedAtendimentoId && isReadOnly
  });

  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedIntelligence, setSelectedIntelligence] = useState(null);

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
      queryClient.invalidateQueries({ queryKey: ['consultoria-atendimentos'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-minutes'] });
      queryClient.invalidateQueries({ queryKey: ['todos-atendimentos'] });
      setSaveSuccess(true);
      setHasUnsavedChanges(false);
      toast.success('Atendimento salvo com sucesso!');
      // E5: Use refs so timers can be properly cleaned up
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      closeTimerRef.current = setTimeout(() => handleClose(), 800);
      fallbackTimerRef.current = setTimeout(() => {
        setSaveSuccess(false);
        if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
      }, 5000);
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
      queryClient.invalidateQueries({ queryKey: ['consultoria-atendimentos'] });
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
        queryClient.invalidateQueries({ queryKey: ['consultoria-atendimentos'] });
        queryClient.invalidateQueries({ queryKey: ['meeting-minutes'] });
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

    createMutation.mutate(formData);
  };

  // ── C4: Auto-save uses stable JSON snapshot ──
  useEffect(() => {
    if (!formData.id || isReadOnly) return;

    // E4: Skip first auto-save after loading existing record
    if (!autoSaveInitializedRef.current) {
      autoSaveInitializedRef.current = true;
      return;
    }

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    // E3: Mark unsaved immediately on change
    setHasUnsavedChanges(true);

    autoSaveTimerRef.current = setTimeout(async () => {
      if (!formData.workshop_id || !formData.data_agendada || !formData.hora_agendada) return;
      setAutoSaveStatus('saving');
      try {
        await base44.entities.ConsultoriaAtendimento.update(formData.id, {
          // P3: basic fields
          status: formData.status,
          status_cliente: formData.status_cliente,
          tipo_atendimento: formData.tipo_atendimento,
          duracao_minutos: formData.duracao_minutos,
          google_meet_link: formData.google_meet_link,
          // content fields
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
        setHasUnsavedChanges(false);
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

  let sectionCounter = 1;
  const readOnlyContent = (
    <div className="space-y-10 max-w-4xl mx-auto py-8 text-left px-4">
      <div className="border-b border-gray-200 pb-6 mb-8">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight capitalize">
          {formData.tipo_atendimento?.replace(/_/g, ' ')}
        </h2>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
          <span className="bg-gray-100 px-3 py-1.5 rounded-full font-medium">
            🗓️ {formData.data_agendada?.split('-').reverse().join('/')} às {formData.hora_agendada}
          </span>
          <span className="bg-gray-100 px-3 py-1.5 rounded-full font-medium">
            ⏱️ {formData.duracao_minutos} min
          </span>
          <span className="bg-gray-100 px-3 py-1.5 rounded-full font-medium capitalize">
            📌 Status: {formData.status}
          </span>
          {formData.status_cliente && (
            <span className="bg-gray-100 px-3 py-1.5 rounded-full font-medium capitalize">
              👤 Cliente: {formData.status_cliente}
            </span>
          )}
          {formData.google_meet_link && (
            <a href={formData.google_meet_link} target="_blank" rel="noreferrer" className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full font-medium hover:bg-blue-100 transition-colors">
              🔗 Link da Reunião
            </a>
          )}
        </div>
      </div>

      <Tabs defaultValue="ata" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="ata">Detalhes do Atendimento</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
        </TabsList>
        
        <TabsContent value="ata" className="space-y-10">

      {/* Participantes (Header em Documento) */}
      {formData.participantes?.length > 0 && formData.participantes.some(p => p.nome) && (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 border-l-4 border-blue-500 pl-3">Participantes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-4">
            {formData.participantes.filter(p => p.nome).map((p, idx) => (
              <div key={idx} className="text-gray-700">
                <p className="font-medium text-base">{p.nome}</p>
                {(p.cargo || p.email) && (
                  <p className="text-sm text-gray-500">{p.cargo}{p.cargo && p.email ? ' • ' : ''}{p.email}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 1. PAUTAS */}
      {((ataData?.pautas) || (formData.pauta?.length > 0 && formData.pauta.some(p => p.titulo))) && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-l-4 border-blue-500 pl-3">1. Pautas (Anotações do Consultor)</h3>
          <div className="space-y-4 pl-4">
            {ataData?.pautas ? (
              <p className="text-gray-700 text-base whitespace-pre-wrap leading-relaxed">{ataData.pautas}</p>
            ) : (
              formData.pauta.filter(p => p.titulo).map((p, idx) => (
                <div key={idx}>
                  <h4 className="text-base font-medium text-gray-800 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    {p.titulo} <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">{p.tempo_estimado} min</span>
                  </h4>
                  {p.descricao && <p className="text-sm text-gray-600 mt-1.5 leading-relaxed pl-3 border-l-2 border-gray-100">{p.descricao}</p>}
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* 2. OBJETIVOS DO ATENDIMENTO */}
      {((ataData?.objetivos_atendimento) || (formData.objetivos?.length > 0 && formData.objetivos.some(o => o))) && (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 border-l-4 border-blue-500 pl-3">2. Objetivos do Atendimento (Anotações do Consultor)</h3>
          <div className="pl-4">
            {ataData?.objetivos_atendimento ? (
              <p className="text-gray-700 text-base whitespace-pre-wrap leading-relaxed">{ataData.objetivos_atendimento}</p>
            ) : (
              <ul className="space-y-2">
                {formData.objetivos.filter(o => o).map((obj, idx) => (
                  <li key={idx} className="text-gray-700 text-base flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* 3. OBSERVAÇÕES E OBJETIVOS DO CONSULTOR */}
      {(ataData?.objetivos_consultor || ataData?.observacoes_consultor || formData.observacoes_consultor) && (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 border-l-4 border-blue-500 pl-3">3. Observações e Objetivos do Consultor (Anotações)</h3>
          <div className="pl-4">
            <p className="text-gray-700 text-base whitespace-pre-wrap leading-relaxed bg-gray-50/50 p-4 rounded-lg border border-gray-100">
              {ataData?.objetivos_consultor || ataData?.observacoes_consultor || formData.observacoes_consultor}
            </p>
          </div>
        </section>
      )}

      {/* 4. PRÓXIMOS PASSOS */}
      {((formData.proximos_passos_list?.length > 0 && formData.proximos_passos_list.some(p => p.descricao)) || formData.proximos_passos) && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-l-4 border-blue-500 pl-3">4. Próximos Passos (Anotações do Consultor)</h3>
          <div className="space-y-3 pl-4">
            {formData.proximos_passos_list?.filter(p => p.descricao).map((step, idx) => (
              <div key={idx} className="text-base text-gray-700 flex items-start gap-3 bg-white border border-gray-100 p-3 rounded-lg shadow-sm">
                <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center font-medium shrink-0 mt-0.5 text-sm">{idx + 1}</span>
                <div>
                  <p className="font-medium text-gray-900">{step.descricao}</p>
                  <div className="flex gap-3 mt-1.5 text-sm text-gray-500">
                    {step.responsavel && <span className="flex items-center gap-1">👤 {step.responsavel}</span>}
                    {step.prazo && <span className="flex items-center gap-1">📅 {toBrazilDate(step.prazo).toLocaleDateString('pt-BR')}</span>}
                  </div>
                </div>
              </div>
            ))}
            {formData.proximos_passos && (
              <p className="text-gray-700 text-base whitespace-pre-wrap leading-relaxed mt-4">
                {formData.proximos_passos}
              </p>
            )}
          </div>
        </section>
      )}

      {/* 5. RESUMO DA REUNIAO (GERADO POR IA) */}
      {ataData?.ata_ia && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-purple-700 border-l-4 border-purple-500 pl-3">5. Resumo Executivo (Gerado por IA)</h3>
          <div className="pl-4 prose prose-slate prose-sm max-w-none text-gray-700 bg-purple-50/30 p-5 rounded-lg border border-purple-100">
            <ReactMarkdown>{ataData.ata_ia}</ReactMarkdown>
          </div>
        </section>
      )}

      {/* 6. DECISÕES TOMADAS */}
      {formData.decisoes_tomadas?.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-l-4 border-blue-500 pl-3">6. Decisões Tomadas (Anotações do Consultor)</h3>
          <div className="space-y-3 pl-4">
            {formData.decisoes_tomadas.map((decisao, idx) => (
              <div key={idx} className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <p className="font-medium text-gray-900 text-base">{decisao.decisao}</p>
                <div className="flex gap-3 mt-1.5 text-sm text-gray-600">
                  {decisao.responsavel && <span>Responsável: {decisao.responsavel}</span>}
                  {decisao.prazo && <span>Prazo: {toBrazilDate(decisao.prazo).toLocaleDateString('pt-BR')}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. AÇÕES DE ACOMPANHAMENTO */}
      {formData.acoes_geradas?.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-l-4 border-blue-500 pl-3">7. Ações de Acompanhamento (Anotações do Consultor)</h3>
          <div className="space-y-3 pl-4">
            {formData.acoes_geradas.map((acao, idx) => (
              <div key={idx} className="bg-green-50 border border-green-200 p-3 rounded-lg">
                <p className="font-medium text-gray-900 text-base">{acao.acao}</p>
                <div className="flex gap-3 mt-1.5 text-sm text-gray-600">
                  {acao.responsavel && <span>Responsável: {acao.responsavel}</span>}
                  {acao.prazo && <span>Prazo: {toBrazilDate(acao.prazo).toLocaleDateString('pt-BR')}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 8. PROCESSOS (MAPs) COMPARTILHADOS */}
      {formData.processos_vinculados?.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-l-4 border-blue-500 pl-3">8. Processos (MAPs) Compartilhados</h3>
          <div className="pl-4 flex flex-col gap-2">
            {formData.processos_vinculados.map((p, idx) => (
              <div key={idx} className="bg-blue-50/50 border border-blue-200 p-3 rounded-lg">
                <p className="font-medium text-gray-900 text-base">{p.titulo}</p>
                <p className="text-sm text-gray-600">Categoria: {p.categoria}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 9. VIDEOAULAS RECOMENDADAS */}
      {formData.videoaulas_vinculadas?.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-l-4 border-blue-500 pl-3">9. Videoaulas Recomendadas</h3>
          <div className="pl-4 flex flex-col gap-2">
            {formData.videoaulas_vinculadas.map((v, idx) => (
              <div key={idx} className="bg-purple-50/50 border border-purple-200 p-3 rounded-lg">
                <p className="font-medium text-gray-900 text-base">{v.titulo}</p>
                <p className="text-sm text-gray-600">Curso: {v.descricao}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 10. MIDIAS E ANEXOS */}
      {formData.midias_anexas?.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-l-4 border-blue-500 pl-3">10. Mídias e Anexos</h3>
          <div className="pl-4 flex flex-col gap-2">
            {formData.midias_anexas.map((m, idx) => (
              <a key={`m-${idx}`} href={m.url} target="_blank" rel="noreferrer" className="text-base text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-2 w-fit">
                <span className="bg-blue-50 p-1.5 rounded text-blue-500 text-sm">📎</span>
                <span className="font-medium">{m.nome || 'Arquivo Anexo'}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* 11. VISÃO GERAL DO PROJETO */}
      {(ataData?.visao_geral_projeto || formData.visao_geral_projeto) && (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 border-l-4 border-blue-500 pl-3">11. Visão Geral do Projeto de Aceleração</h3>
          <div className="pl-4">
            <p className="text-gray-700 text-base whitespace-pre-wrap leading-relaxed bg-gray-50/50 p-4 rounded-lg border border-gray-100">
              {ataData?.visao_geral_projeto || formData.visao_geral_projeto}
            </p>
          </div>
        </section>
      )}

      {/* 12. CHECKLIST DE DIAGNÓSTICO */}
      {formData.checklist_respostas?.length > 0 && (
        <section className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 border-l-4 border-blue-500 pl-3">12. Checklist de Diagnóstico</h3>
          <div className="pl-4 flex flex-col gap-6">
            {formData.checklist_respostas.map((bloco, idx) => (
              <div key={idx} className="space-y-3">
                <h4 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <span className="text-blue-500">📋</span>
                  {bloco.template_nome}
                </h4>
                <div className="flex flex-col gap-3 pl-6 border-l-2 border-gray-100">
                  {bloco.perguntas?.map((p, pIdx) => (
                    <div key={pIdx} className="bg-gray-50 border border-gray-100 p-4 rounded-lg space-y-2">
                      <p className="font-medium text-gray-900 text-base">{p.pergunta_texto}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        {p.resposta_atual && (
                          <div>
                            <span className="text-xs font-semibold uppercase text-gray-400 block mb-0.5">Resposta Atual</span>
                            <p className="text-sm text-gray-700">{p.resposta_atual}</p>
                          </div>
                        )}
                        {p.resposta_meta && (
                          <div>
                            <span className="text-xs font-semibold uppercase text-gray-400 block mb-0.5">Resposta Meta</span>
                            <p className="text-sm text-gray-700">{p.resposta_meta}</p>
                          </div>
                        )}
                        {(p.atingimento_descritivo || p.pct_atingimento) && (
                          <div className="md:col-span-2 flex items-center gap-2 bg-white px-3 py-2 rounded border border-gray-100 w-fit">
                            <span className="text-xs font-semibold uppercase text-gray-400">Atingimento:</span>
                            {p.pct_atingimento && (
                              <span className={`text-sm font-bold ${Number(p.pct_atingimento) >= 80 ? 'text-green-600' : Number(p.pct_atingimento) >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                {p.pct_atingimento}%
                              </span>
                            )}
                            {p.atingimento_descritivo && (
                              <span className="text-sm text-gray-600">({p.atingimento_descritivo})</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 13. INTELIGÊNCIA DO CLIENTE */}
      {clientIntelligences?.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-l-4 border-blue-500 pl-3">13. Inteligência do Cliente (Dores e Oportunidades)</h3>
          <div className="pl-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {clientIntelligences.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSelectedIntelligence(item);
                  setViewerOpen(true);
                }}
                className="text-left bg-orange-50/50 border border-orange-200 hover:border-orange-300 hover:shadow-md rounded-lg p-4 space-y-2 transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-2">
                  <div className="bg-orange-100 p-1.5 rounded-md mt-0.5">
                    <AlertCircle className="w-4 h-4 text-orange-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-orange-900 text-base">{item.areaLabel}</p>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-xs font-semibold text-gray-500">Tipo:</span>
                       <span className={`text-xs font-medium ${item.typeColor ? `text-${item.typeColor}` : 'text-orange-600'}`}>
                         {item.typeLabel}
                       </span>
                     </div>
                    <div className="mt-1">
                      <span className="text-xs font-semibold text-gray-500">Problema:</span>
                      <p className="text-sm text-gray-800 font-medium truncate group-hover:whitespace-normal group-hover:text-clip">{item.subcategory}</p>
                    </div>
                    <div className="flex items-center gap-2 pt-2 mt-1 border-t border-orange-200/50">
                      <span className="text-xs font-semibold text-gray-500">Gravidade:</span>
                      <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-800 text-xs font-bold rounded">
                        {item.gravityLabel}
                      </span>
                      <span className="ml-auto text-xs text-orange-500 opacity-0 group-hover:opacity-100 font-medium flex items-center gap-1 transition-opacity">Ver detalhes <ChevronRight className="w-3 h-3" /></span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
      
        </TabsContent>

        <TabsContent value="followups" className="space-y-6">
          {followUps?.length > 0 ? (
            <div className="space-y-4 pt-2">
              {followUps.map((followUp, idx) => (
                <div key={idx} className={`border ${followUp.is_completed ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'} p-4 rounded-lg shadow-sm`}>
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-semibold text-gray-900 flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-sm">{followUp.sequence_number}</span>
                      Acompanhamento {followUp.days_since_meeting ? `(${followUp.days_since_meeting} dias)` : ''}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${followUp.is_completed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {followUp.is_completed ? 'Concluído' : 'Pendente'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    <p><strong>Data Prevista:</strong> {followUp.reminder_date ? toBrazilDate(followUp.reminder_date).toLocaleDateString('pt-BR') : '-'}</p>
                    {followUp.completed_at && <p><strong>Concluído em:</strong> {toBrazilDate(followUp.completed_at).toLocaleDateString('pt-BR')}</p>}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{followUp.message}</p>
                  {followUp.notes && (
                    <div className="mt-3 p-3 bg-white/50 border border-gray-100 rounded">
                      <p className="text-xs font-semibold text-gray-500 mb-1">Anotações do Retorno:</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{followUp.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200 mt-4">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>Nenhum acompanhamento (follow-up) registrado para este atendimento.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ClientIntelligenceViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        item={selectedIntelligence}
        workshopId={formData.workshop_id}
      />
    </div>
  );

  const content = (
    <>
      <AtendimentoProgressIndicator formData={formData} />

      {formData.id && (autoSaveStatus || hasUnsavedChanges) && (
        <div className="flex justify-end items-center gap-2">
          {hasUnsavedChanges && !autoSaveStatus && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Alterações não salvas
            </span>
          )}
          {autoSaveStatus && <AutoSaveIndicator status={autoSaveStatus} />}
        </div>
      )}

      <BasicInfoSection
        formData={formData} setFormData={setFormData} user={user}
        workshops={workshops} consultores={consultores}
        todosOsTipos={todosOsTipos} customTipos={customTipos} setCustomTipos={setCustomTipos}
        createMeeting={createMeeting} isCreating={isCreating}
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
        onIgnoreConflict={() => createMutation.mutate(formData)}
      />
    </>
  );

  if (isModal) {
    return (
      <div
        className={`fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6 transition-opacity duration-250 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      >
        <div className="absolute inset-0" onClick={handleClose} />
        <div className={`relative bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.2)] w-full max-w-[800px] max-h-[95vh] flex flex-col z-10 transition-all duration-250 ${isClosing ? 'opacity-0 scale-95 translate-y-4' : 'animate-in fade-in zoom-in-95 duration-200'}`}>
          <div className="flex items-center justify-between p-6 border-b shrink-0 shadow-[0_4px_16px_rgba(0,0,0,0.10)]">
            <div>
              {isReadOnly ? (
                <>
                  <div className="flex items-center gap-3">
                    {formData.consultor_nome && (() => {
                      const consultor = consultores?.find(c => c.id === formData.consultor_id);
                      return (
                        <div className="flex items-center gap-2.5">
                          {consultor?.profile_picture_url ? (
                            <img src={consultor.profile_picture_url} alt={formData.consultor_nome} className="w-9 h-9 rounded-full object-cover border border-gray-200" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                          )}
                          <h1 className="text-2xl font-bold text-gray-900 truncate max-w-[200px]" title={formData.consultor_nome}>
                            {formData.consultor_nome}
                          </h1>
                        </div>
                      );
                    })()}
                    <span className="text-gray-300 text-2xl font-light mx-1">/</span>
                    {(() => {
                      const workshop = workshops?.find(w => w.id === formData.workshop_id);
                      const wsName = workshop?.name || 'Oficina';
                      return (
                        <div className="flex items-center gap-2.5">
                          {workshop?.logo_url ? (
                            <img src={workshop.logo_url} alt={wsName} className="w-9 h-9 rounded-lg object-contain bg-white border border-gray-200 p-0.5" />
                          ) : null}
                          <span className="text-xl font-medium text-gray-600 truncate max-w-md" title={wsName}>
                            {wsName}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                  <p className="text-sm text-gray-500 mt-2 uppercase tracking-wider font-medium">Visualizando Atendimento (Somente Leitura)</p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900">{formData.id ? 'Editar Atendimento' : 'Registrar Atendimento de Consultoria'}</h1>
                    {formData.consultor_nome && (
                      <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium border border-blue-100 flex items-center">
                        <User className="w-3.5 h-3.5 mr-1.5" />
                        {formData.consultor_nome}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{formData.id ? 'Atualize as informações do atendimento' : 'Agende e registre informações do atendimento ao cliente'}</p>
                </>
              )}
            </div>
            <button type="button" onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
            <form id="atendimento-form" onSubmit={handleSubmit} className="space-y-6">
              {isReadOnly ? readOnlyContent : (
                <fieldset disabled={isReadOnly} className={`space-y-0 border-0 p-0 m-0 min-w-0 ${isReadOnly ? 'opacity-95' : ''}`}>
                  {content}
                </fieldset>
              )}
            </form>
          </div>
          <div className="flex gap-3 justify-end border-t border-gray-200 bg-white px-6 py-4 shrink-0 rounded-b-2xl shadow-[0_-4px_16px_rgba(0,0,0,0.10)]">
            {isReadOnly ? (
              <>
                <Button type="button" variant="outline" onClick={handleClose} className="px-6">Fechar</Button>
                <Button 
                  type="button" 
                  disabled={!formData.ata_id}
                  title={!formData.ata_id ? "Atendimento em aberto" : "Baixar ATA em PDF"}
                  onClick={async () => {
                    try {
                      const ata = await base44.entities.MeetingMinutes.get(formData.ata_id);
                      if (ata) {
                        const intelligence = await base44.entities.ClientIntelligence.filter({ attendance_id: formData.id });
                        const ataComInteligencia = { ...ata, client_intelligence: intelligence || [], checklist_respostas: ata.checklist_respostas || formData.checklist_respostas || [] };
                        const { downloadAtaPDF } = await import("@/components/aceleracao/AtasPDFGenerator");
                        const workshop = workshops?.find(w => w.id === formData.workshop_id);
                        await downloadAtaPDF(ataComInteligencia, workshop);
                        toast.success("Download iniciado!");
                      }
                    } catch (error) {
                      toast.error("Erro ao acessar ATA: " + error.message);
                    }
                  }}
                  className={`px-6 transition-all ${!formData.ata_id ? 'bg-gray-100 text-gray-400 border-gray-200 opacity-80' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'}`}
                >
                  <Download className="w-4 h-4 mr-2" /> Baixar ATA
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={handleClose} className="px-6">Cancelar</Button>
                <Button
                  type="submit"
                  form="atendimento-form"
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
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        {isReadOnly ? (
          <>
            <div className="flex items-center gap-3 mb-1">
              {formData.consultor_nome && (() => {
                const consultor = consultores?.find(c => c.id === formData.consultor_id);
                return (
                  <div className="flex items-center gap-3">
                    {consultor?.profile_picture_url ? (
                      <img src={consultor.profile_picture_url} alt={formData.consultor_nome} className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-sm" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200 shadow-sm">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                    )}
                    <h1 className="text-3xl font-bold text-gray-900 truncate" title={formData.consultor_nome}>
                      {formData.consultor_nome}
                    </h1>
                  </div>
                );
              })()}
              <span className="text-gray-300 text-3xl font-light mx-2">/</span>
              {(() => {
                const workshop = workshops?.find(w => w.id === formData.workshop_id);
                const wsName = workshop?.name || 'Oficina';
                return (
                  <div className="flex items-center gap-3">
                    {workshop?.logo_url ? (
                      <img src={workshop.logo_url} alt={wsName} className="w-10 h-10 rounded-lg object-contain bg-white border border-gray-200 shadow-sm p-0.5" />
                    ) : null}
                    <span className="text-2xl font-medium text-gray-600 truncate" title={wsName}>
                      {wsName}
                    </span>
                  </div>
                );
              })()}
            </div>
            <p className="text-sm text-gray-500 mt-2 uppercase tracking-wider font-medium">Visualizando Atendimento (Somente Leitura)</p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{formData.id ? 'Editar Atendimento' : 'Registrar Atendimento de Consultoria'}</h1>
              {formData.consultor_nome && (
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium border border-blue-100 flex items-center mt-1">
                  <User className="w-4 h-4 mr-1.5" />
                  {formData.consultor_nome}
                </span>
              )}
            </div>
            <p className="text-gray-600 mt-2">{formData.id ? 'Atualize as informações do atendimento' : 'Agende e registre informações do atendimento ao cliente'}</p>
          </>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {isReadOnly ? readOnlyContent : (
          <fieldset disabled={isReadOnly} className={`space-y-0 border-0 p-0 m-0 min-w-0 ${isReadOnly ? 'opacity-95' : ''}`}>
            {content}
          </fieldset>
        )}
        <div className="sticky bottom-0 z-20 -mx-6 px-6 mt-6">
          <div className="flex gap-3 justify-end bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] rounded-t-xl py-4 px-6">
            {isReadOnly ? (
              <>
                <Button type="button" variant="outline" onClick={handleClose} className="px-6">Fechar</Button>
                <Button 
                  type="button" 
                  disabled={!formData.ata_id}
                  title={!formData.ata_id ? "Atendimento em aberto" : "Baixar ATA em PDF"}
                  onClick={async () => {
                    try {
                      const ata = await base44.entities.MeetingMinutes.get(formData.ata_id);
                      if (ata) {
                        const intelligence = await base44.entities.ClientIntelligence.filter({ attendance_id: formData.id });
                        const ataComInteligencia = { ...ata, client_intelligence: intelligence || [], checklist_respostas: ata.checklist_respostas || formData.checklist_respostas || [] };
                        const { downloadAtaPDF } = await import("@/components/aceleracao/AtasPDFGenerator");
                        const workshop = workshops?.find(w => w.id === formData.workshop_id);
                        await downloadAtaPDF(ataComInteligencia, workshop);
                        toast.success("Download iniciado!");
                      }
                    } catch (error) {
                      toast.error("Erro ao acessar ATA: " + error.message);
                    }
                  }}
                  className={`px-6 transition-all ${!formData.ata_id ? 'bg-gray-100 text-gray-400 border-gray-200 opacity-80' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'}`}
                >
                  <Download className="w-4 h-4 mr-2" /> Baixar ATA
                </Button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}