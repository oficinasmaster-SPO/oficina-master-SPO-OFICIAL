import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, ChevronUp, Settings, ClipboardList, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const TEMAS = [
  { value: "vendas", label: "Vendas", color: "bg-green-50 text-green-700 border-green-200", iconBg: "bg-green-100", iconColor: "text-green-600" },
  { value: "comercial", label: "Comercial", color: "bg-blue-50 text-blue-700 border-blue-200", iconBg: "bg-blue-100", iconColor: "text-blue-600" },
  { value: "patio", label: "Pátio", color: "bg-yellow-50 text-yellow-700 border-yellow-200", iconBg: "bg-yellow-100", iconColor: "text-yellow-600" },
  { value: "financeiro", label: "Financeiro", color: "bg-purple-50 text-purple-700 border-purple-200", iconBg: "bg-purple-100", iconColor: "text-purple-600" },
  { value: "pessoas", label: "Pessoas", color: "bg-pink-50 text-pink-700 border-pink-200", iconBg: "bg-pink-100", iconColor: "text-pink-600" },
  { value: "marketing", label: "Marketing", color: "bg-orange-50 text-orange-700 border-orange-200", iconBg: "bg-orange-100", iconColor: "text-orange-600" },
  { value: "operacional", label: "Operacional", color: "bg-slate-50 text-slate-700 border-slate-200", iconBg: "bg-slate-100", iconColor: "text-slate-600" },
  { value: "estrategico", label: "Estratégico", color: "bg-indigo-50 text-indigo-700 border-indigo-200", iconBg: "bg-indigo-100", iconColor: "text-indigo-600" },
];

// ─── Gerenciador de Templates (Modal simples inline) ──────────────────────────
function GerenciarTemplates({ onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ nome: "", tema: "", descricao: "", perguntas: [] });
  const [novaP, setNovaP] = useState("");

  const { data: templates = [] } = useQuery({
    queryKey: ["checklist-templates"],
    queryFn: () => base44.entities.ConsultoriaChecklistTemplate.filter({ ativo: true }),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.ConsultoriaChecklistTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["checklist-templates"]);
      setForm({ nome: "", tema: "", descricao: "", perguntas: [] });
      toast.success("Template criado!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ConsultoriaChecklistTemplate.update(id, { ativo: false }),
    onSuccess: () => queryClient.invalidateQueries(["checklist-templates"]),
  });

  const addPergunta = () => {
    if (!novaP.trim()) return;
    setForm(f => ({
      ...f,
      perguntas: [...f.perguntas, { id: Date.now().toString(), texto: novaP.trim(), ordem: f.perguntas.length }],
    }));
    setNovaP("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">Gerenciar Templates de Checklist</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Criar novo */}
          <div className="border rounded-xl p-4 space-y-3 bg-gray-50">
            <h3 className="font-semibold text-gray-800">Novo Template</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Diagnóstico de Vendas" />
              </div>
              <div>
                <Label>Tema *</Label>
                <Select value={form.tema} onValueChange={v => setForm(f => ({ ...f, tema: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {TEMAS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Perguntas</Label>
              <div className="flex gap-2 mt-1">
                <Input value={novaP} onChange={e => setNovaP(e.target.value)} placeholder="Digite a pergunta e pressione Adicionar"
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addPergunta())} />
                <Button type="button" variant="outline" onClick={addPergunta}><Plus className="w-4 h-4" /></Button>
              </div>
              {form.perguntas.length > 0 && (
                <div className="mt-2 space-y-1">
                  {form.perguntas.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-2 p-2 bg-white border rounded-lg text-sm">
                      <span className="text-gray-400 text-xs w-5">{i + 1}.</span>
                      <span className="flex-1">{p.texto}</span>
                      <button type="button" onClick={() => setForm(f => ({ ...f, perguntas: f.perguntas.filter((_, idx) => idx !== i) }))}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button type="button" onClick={() => saveMutation.mutate(form)} disabled={!form.nome || !form.tema || saveMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700">
              Salvar Template
            </Button>
          </div>

          {/* Lista */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">Templates Existentes ({templates.length})</h3>
            {templates.map(t => {
              const tema = TEMAS.find(x => x.value === t.tema);
              return (
                <div key={t.id} className="border rounded-xl p-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{t.nome}</span>
                      {tema && <Badge className={`text-xs border ${tema.color}`}>{tema.label}</Badge>}
                    </div>
                    <p className="text-xs text-gray-500">{t.perguntas?.length || 0} perguntas</p>
                  </div>
                  <button type="button" onClick={() => deleteMutation.mutate(t.id)}>
                    <Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" />
                  </button>
                </div>
              );
            })}
            {templates.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Nenhum template criado ainda.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Card de Resposta de Pergunta ─────────────────────────────────────────────
function PerguntaCard({ pergunta, resposta, onChange }) {
  const pct = Math.min(100, Math.max(0, Number(resposta?.pct_atingimento) || 0));

  return (
    <div className="border border-gray-100 rounded-xl p-4 space-y-3 bg-white hover:border-gray-200 transition-colors">
      <p className="font-medium text-sm text-gray-900">{pergunta.texto}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium uppercase tracking-wider text-gray-400">Resposta Atual</Label>
          <Textarea
            value={resposta?.resposta_atual || ""}
            onChange={e => onChange({ ...resposta, resposta_atual: e.target.value })}
            placeholder="Descreva a situação atual..."
            rows={2}
            className="mt-1 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs font-medium uppercase tracking-wider text-gray-400">Resposta Meta</Label>
          <Textarea
            value={resposta?.resposta_meta || ""}
            onChange={e => onChange({ ...resposta, resposta_meta: e.target.value })}
            placeholder="Descreva o objetivo..."
            rows={2}
            className="mt-1 text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium uppercase tracking-wider text-gray-400">Atingimento (descritivo)</Label>
          <Input
            value={resposta?.atingimento_descritivo || ""}
            onChange={e => onChange({ ...resposta, atingimento_descritivo: e.target.value })}
            placeholder="Ex: R$ 48.000 / 80% concluído"
            className="mt-1 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs font-medium uppercase tracking-wider text-gray-400">Atingimento (%)</Label>
          <div className="mt-1 space-y-1">
            <Input
              type="number"
              min="0"
              max="100"
              value={resposta?.pct_atingimento || ""}
              onChange={e => onChange({ ...resposta, pct_atingimento: e.target.value })}
              placeholder="0–100"
              className="text-sm"
            />
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  backgroundColor: pct >= 80 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626",
                }}
              />
            </div>
            <p className="text-xs text-right text-gray-500">{pct}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function ChecklistConsultoria({ respostas, onChange }) {
  const [showGerenciar, setShowGerenciar] = useState(false);
  const [expandidos, setExpandidos] = useState({});

  const { data: templates = [] } = useQuery({
    queryKey: ["checklist-templates"],
    queryFn: () => base44.entities.ConsultoriaChecklistTemplate.filter({ ativo: true }),
  });

  const toggleExpand = (id) => setExpandidos(e => ({ ...e, [id]: !e[id] }));

  const adicionarTemplate = (template) => {
    const jaAdicionado = respostas.find(r => r.template_id === template.id);
    if (jaAdicionado) {
      toast.info("Este checklist já foi adicionado.");
      return;
    }
    const novoBloco = {
      template_id: template.id,
      template_nome: template.nome,
      template_tema: template.tema,
      incluir_na_ata: true,
      perguntas: template.perguntas.map(p => ({
        pergunta_id: p.id,
        pergunta_texto: p.texto,
        resposta_atual: "",
        resposta_meta: "",
        atingimento_descritivo: "",
        pct_atingimento: "",
      })),
    };
    onChange([...(respostas || []), novoBloco]);
    setExpandidos(e => ({ ...e, [template.id]: true }));
    toast.success(`Checklist "${template.nome}" adicionado!`);
  };

  const removerBloco = (templateId) => {
    onChange((respostas || []).filter(r => r.template_id !== templateId));
  };

  const updateResposta = (templateId, perguntaId, novaResposta) => {
    onChange((respostas || []).map(bloco => {
      if (bloco.template_id !== templateId) return bloco;
      return {
        ...bloco,
        perguntas: bloco.perguntas.map(p =>
          p.pergunta_id === perguntaId ? { ...p, ...novaResposta } : p
        ),
      };
    }));
  };

  const toggleIncluirAta = (templateId) => {
    onChange((respostas || []).map(bloco =>
      bloco.template_id === templateId ? { ...bloco, incluir_na_ata: !bloco.incluir_na_ata } : bloco
    ));
  };

  const temaInfo = (value) => TEMAS.find(t => t.value === value) || { label: value, color: "bg-gray-100 text-gray-700 border-gray-200" };

  return (
    <>
      {showGerenciar && <GerenciarTemplates onClose={() => setShowGerenciar(false)} />}

      <div className="space-y-5">
        {/* Header com ações */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-gray-900">Checklist de Diagnóstico</h3>
                <p className="text-xs text-gray-400 mt-0.5">Adicione checklists temáticos e registre respostas do cliente.</p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowGerenciar(true)} className="gap-1.5">
              <Settings className="w-4 h-4" />
              Gerenciar Templates
            </Button>
          </div>

          {/* Seletor de templates disponíveis */}
          {templates.length > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-3">Adicionar Checklist ao Atendimento</p>
              <div className="flex flex-wrap gap-2">
                {templates.map(t => {
                  const tema = temaInfo(t.tema);
                  const jaAdicionado = (respostas || []).find(r => r.template_id === t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => adicionarTemplate(t)}
                      disabled={!!jaAdicionado}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                        jaAdicionado
                          ? "opacity-40 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400"
                          : "hover:shadow-sm cursor-pointer bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50/30"
                      }`}
                    >
                      {jaAdicionado ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Plus className="w-4 h-4 text-blue-500" />}
                      <span className="text-gray-700">{t.nome}</span>
                      <Badge className={`text-xs border ${tema.color} font-medium`}>{tema.label}</Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {templates.length === 0 && (respostas || []).length === 0 && (
          <div className="text-center py-10 border-2 border-dashed rounded-xl text-gray-400 bg-gray-50/50">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">Nenhum template criado</p>
            <p className="text-xs mt-1">Clique em "Gerenciar Templates" para criar.</p>
          </div>
        )}

        {/* Blocos de respostas */}
        {(respostas || []).map(bloco => {
          const tema = temaInfo(bloco.template_tema);
          const isOpen = expandidos[bloco.template_id] !== false;
          const totalPreenchidas = bloco.perguntas.filter(p => p.resposta_atual || p.resposta_meta).length;

          return (
            <div key={bloco.template_id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Header do bloco */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50/80 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => toggleExpand(bloco.template_id)} className="hover:bg-gray-200 rounded-lg p-1.5 transition-colors">
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </button>
                  <div className={`w-7 h-7 rounded-lg ${tema.iconBg || 'bg-gray-100'} flex items-center justify-center`}>
                    <ClipboardList className={`w-3.5 h-3.5 ${tema.iconColor || 'text-gray-600'}`} />
                  </div>
                  <span className="font-semibold text-gray-900 text-sm">{bloco.template_nome}</span>
                  <Badge className={`text-xs border ${tema.color} font-medium`}>{tema.label}</Badge>
                  <span className="text-xs text-gray-400 font-medium">{totalPreenchidas}/{bloco.perguntas.length} respondidas</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleIncluirAta(bloco.template_id)}
                    title={bloco.incluir_na_ata ? "Incluído na ATA" : "Não incluído na ATA"}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                      bloco.incluir_na_ata
                        ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {bloco.incluir_na_ata ? "✓ Na ATA" : "Fora da ATA"}
                  </button>
                  <button type="button" onClick={() => removerBloco(bloco.template_id)} className="hover:bg-red-50 rounded-lg p-1.5 transition-colors">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>

              {/* Perguntas */}
              {isOpen && (
                <div className="p-4 space-y-3 bg-white">
                  {bloco.perguntas.map(p => (
                    <PerguntaCard
                      key={p.pergunta_id}
                      pergunta={{ texto: p.pergunta_texto }}
                      resposta={p}
                      onChange={(nova) => updateResposta(bloco.template_id, p.pergunta_id, nova)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}