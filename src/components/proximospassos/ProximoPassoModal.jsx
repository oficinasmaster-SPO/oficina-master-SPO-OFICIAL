import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  X, Clock, CheckCircle2, AlertTriangle, MessageSquare,
  Paperclip, History, Save, Bell, Phone, FileText, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import ProximoPassoTimeline from "./ProximoPassoTimeline";
import EvidenciasUploader from "./EvidenciasUploader";
import ProgressBarExecucao from "./ProgressBarExecucao";
import ClienteDataTab from "./ClienteDataTab";
import AtaViewTab from "./AtaViewTab";

const STATUS_OPTIONS = [
  { value: "pendente",             label: "Pendente" },
  { value: "em_andamento",         label: "Em andamento" },
  { value: "aguardando_cliente",   label: "Aguardando cliente" },
  { value: "aguardando_consultor", label: "Aguardando consultor" },
  { value: "validacao",            label: "Validação" },
  { value: "finalizado",           label: "Finalizado" },
  { value: "atrasado",             label: "Atrasado" },
  { value: "cancelado",            label: "Cancelado" },
];

const PRIORIDADE_OPTIONS = [
  { value: "baixa",   label: "Baixa" },
  { value: "media",   label: "Média" },
  { value: "alta",    label: "Alta" },
  { value: "critica", label: "Crítica" },
];

export default function ProximoPassoModal({ passo, onClose, onSaved }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("detalhes");

  const [status, setStatus] = useState(passo.status || "pendente");
  const [percentual, setPercentual] = useState(passo.percentual_execucao || 0);
  const [prioridade, setPrioridade] = useState(passo.prioridade || "media");
  const [observacoes, setObservacoes] = useState(passo.observacoes_consultor || "");
  const [evidencias, setEvidencias] = useState(passo.evidencias || []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const historicoAtual = passo.historico || [];
      const novasEntradas = [];

      if (status !== passo.status) {
        novasEntradas.push({
          tipo: "status_alterado",
          descricao: `Status alterado de "${passo.status}" para "${status}"`,
          de: passo.status,
          para: status,
          usuario_id: user?.id,
          usuario_nome: user?.full_name || user?.email,
          created_at: now,
        });
      }

      if (percentual !== passo.percentual_execucao) {
        novasEntradas.push({
          tipo: "comentario",
          descricao: `Progresso atualizado para ${percentual}%`,
          usuario_id: user?.id,
          usuario_nome: user?.full_name || user?.email,
          created_at: now,
        });
      }

      if (evidencias.length > (passo.evidencias || []).length) {
        novasEntradas.push({
          tipo: "evidencia",
          descricao: "Nova evidência anexada",
          usuario_id: user?.id,
          usuario_nome: user?.full_name || user?.email,
          created_at: now,
        });
      }

      await base44.entities.ConsultoriaProximoPasso.update(passo.id, {
        status,
        percentual_execucao: percentual,
        prioridade,
        observacoes_consultor: observacoes,
        evidencias,
        historico: [...historicoAtual, ...novasEntradas],
        ...(status === "finalizado" && !passo.data_finalizacao ? { data_finalizacao: now } : {}),
        ...(status === "em_andamento" && !passo.data_inicio ? { data_inicio: now } : {}),
      });

      queryClient.invalidateQueries({ queryKey: ["central-proximos-passos"] });
      onSaved();
    } catch (err) {
      console.error("Erro ao salvar próximo passo:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCobrar = async () => {
    try {
      const now = new Date().toISOString();
      const historicoAtual = passo.historico || [];
      await base44.entities.ConsultoriaProximoPasso.update(passo.id, {
        ultima_cobranca_em: now,
        historico: [...historicoAtual, {
          tipo: "cobranca",
          descricao: "Consultor registrou cobrança ao responsável",
          usuario_id: user?.id,
          usuario_nome: user?.full_name || user?.email,
          created_at: now,
        }],
      });
      queryClient.invalidateQueries({ queryKey: ["central-proximos-passos"] });
      onSaved();
    } catch (err) {
      console.error("Erro ao registrar cobrança:", err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Deseja deletar "${passo.titulo}"?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }
    try {
      setSaving(true);
      await base44.entities.ConsultoriaProximoPasso.delete(passo.id);
      queryClient.invalidateQueries({ queryKey: ["central-proximos-passos"] });
      onSaved();
    } catch (err) {
      console.error("Erro ao deletar próximo passo:", err);
      alert("Erro ao deletar próximo passo");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "detalhes", label: "Detalhes", icon: CheckCircle2 },
    { id: "evidencias", label: "Evidências", icon: Paperclip },
    { id: "historico", label: "Histórico", icon: History },
    { id: "cliente", label: "Cliente", icon: Phone },
    { id: "ata", label: "ATA", icon: FileText },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-base font-bold text-gray-900 truncate">{passo.titulo}</h2>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
              {passo.responsavel_nome && <span>👤 {passo.responsavel_nome}</span>}
              {passo.prazo && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(passo.prazo), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5 gap-1 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {activeTab === "detalhes" && (
            <div className="space-y-5">
              {/* Status + Prioridade */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {STATUS_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">Prioridade</label>
                  <select
                    value={prioridade}
                    onChange={e => setPrioridade(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {PRIORIDADE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Percentual */}
              <ProgressBarExecucao value={percentual} onChange={setPercentual} />

              {/* Observações */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" /> Observações do consultor
                </label>
                <textarea
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  rows={3}
                  placeholder="Anotações, bloqueios, orientações..."
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>

              {/* Última cobrança */}
              {passo.ultima_cobranca_em && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Bell className="w-3.5 h-3.5" />
                  Última cobrança: {format(new Date(passo.ultima_cobranca_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              )}
            </div>
          )}

          {activeTab === "evidencias" && (
            <EvidenciasUploader evidencias={evidencias} onChange={setEvidencias} />
          )}

          {activeTab === "historico" && (
            <ProximoPassoTimeline historico={passo.historico || []} />
          )}

          {activeTab === "cliente" && (
            <ClienteDataTab passo={passo} />
          )}

          {activeTab === "ata" && !passo.consultoria_atendimento_id && (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <p className="text-gray-600 text-sm font-medium">ATA não vinculada</p>
              <p className="text-gray-400 text-xs mt-1">Este próximo passo não tem um atendimento associado</p>
            </div>
          )}

          {activeTab === "ata" && passo.consultoria_atendimento_id && (
            <AtaViewTab passo={passo} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4 border-t border-gray-100 bg-gray-50">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCobrar}
              className="text-xs gap-1.5"
            >
              <Bell className="w-3.5 h-3.5" /> Registrar Cobrança
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={saving}
              className="text-xs gap-1.5 text-red-600 hover:bg-red-50 hover:border-red-200"
            >
              <Trash2 className="w-3.5 h-3.5" /> Deletar
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
              <Save className="w-3.5 h-3.5" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}