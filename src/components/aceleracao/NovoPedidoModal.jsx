/**
 * NovoPedidoModal — Modal de criação de pedido interno.
 * Estética custom conforme REFACTOR_BRIEF (não usa shadcn Dialog).
 * Shell próprio: overlay blur + dialog animado + header/body/footer.
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, X, Plus, Upload, Link2, Image as ImageIcon,
  FileText, ChevronDown, Loader2,
} from "lucide-react";
import {
  TIPO_PEDIDO_OPTIONS, PRIORIDADE_OPTIONS, IMPACTO_CLIENTE_OPTIONS,
} from "@/components/shared/backlogConstants";

/* ═══════════════════════════════════════════════════════════════════════════
   DESIGN TOKENS (inline — mesmos do spec)
   ═══════════════════════════════════════════════════════════════════════════ */
const ring = "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none";
const inputBase = `w-full h-10 px-3 rounded-[10px] border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 transition-all ${ring}`;
const selectBase = `${inputBase} appearance-none pr-9 cursor-pointer`;
const textareaBase = `w-full px-3 py-2.5 rounded-[10px] border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 resize-y min-h-[96px] transition-all ${ring}`;

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Label ─────────────────────────────────────────────────────────────── */
function Lbl({ children, required }) {
  return (
    <span className="block text-[13px] font-semibold text-gray-900 mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </span>
  );
}

/* ── Custom Select (chevron SVG embutido) ──────────────────────────────── */
function CSelect({ value, onChange, options, placeholder, required }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={selectBase}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
    </div>
  );
}

/* ── Dropzone ──────────────────────────────────────────────────────────── */
function Dropzone({ onFiles, uploading }) {
  const ref = useRef(null);
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  };

  return (
    <div
      ref={ref}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        border-2 border-dashed rounded-xl px-6 py-6 text-center cursor-pointer transition-all
        ${dragOver
          ? "border-blue-400 bg-blue-50/60"
          : "border-gray-200 bg-gray-50/40 hover:bg-gray-100/60 hover:border-gray-300"}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        onChange={(e) => e.target.files && onFiles(Array.from(e.target.files))}
        className="hidden"
      />
      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white">
        {uploading
          ? <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          : <Upload className="h-5 w-5 text-gray-400" />}
      </div>
      <p className="text-sm font-semibold text-gray-700">
        Arraste arquivos aqui ou clique para selecionar
      </p>
      <p className="mt-1 text-xs text-gray-400">
        Ou cole imagens direto (Ctrl+V / ⌘V)
      </p>
    </div>
  );
}

/* ── Link input row ────────────────────────────────────────────────────── */
function LinkInput({ onAdd }) {
  const [val, setVal] = useState("");
  const add = () => {
    if (!val.trim()) return;
    onAdd(val.trim());
    setVal("");
  };
  return (
    <div className="flex gap-2 mt-2">
      <div className="relative flex-1">
        <Link2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="Cole um link aqui (ex: https://…)"
          className={`${inputBase} pl-9`}
        />
      </div>
      <button
        type="button"
        onClick={add}
        disabled={!val.trim()}
        className="flex h-10 items-center gap-2 rounded-[10px] border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40"
      >
        <Link2 className="h-3.5 w-3.5" />
        Adicionar
      </button>
    </div>
  );
}

/* ── Thumbnails de anexos ──────────────────────────────────────────────── */
function AttachmentList({ items, onRemove }) {
  if (!items.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((m, i) => (
        <div key={i} className="group relative flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs">
          {m.type === "imagem"
            ? <img src={m.url} alt="" className="h-6 w-6 rounded object-cover" />
            : m.type === "link"
            ? <Link2 className="h-3.5 w-3.5 text-blue-500" />
            : <FileText className="h-3.5 w-3.5 text-gray-400" />}
          <span className="max-w-[120px] truncate text-gray-700">{m.nome}</span>
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-100 hover:text-red-600"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN MODAL
   ═══════════════════════════════════════════════════════════════════════════ */
export default function NovoPedidoModal({ user, onClose }) {
  const queryClient = useQueryClient();
  const firstFieldRef = useRef(null);

  /* ── Form state ──────────────────────────────────────────────────────── */
  const [form, setForm] = useState({
    tipo:             "apoio_tecnico",
    prioridade:       "media",
    titulo:           "",
    descricao:        "",
    assignee_id:      "",
    assignee_name:    "",
    workshop_id:      "",
    workshop_nome:    "",
    prazo:            "",
    impacto_cliente:  "medio",
    midias_anexas:    [],
  });
  const [uploading, setUploading] = useState(false);

  const set = useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), []);

  /* ── Data ────────────────────────────────────────────────────────────── */
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-internos-pedido"],
    queryFn: async () => {
      const r = await base44.entities.Employee.filter({ user_type: "internal" }, "full_name", 200);
      return (r || []).filter(e => e.full_name && e.user_id);
    },
  });

  const { data: workshops = [] } = useQuery({
    queryKey: ["workshops-pedido-interno"],
    queryFn: async () => (await base44.entities.Workshop.list()) || [],
  });

  /* ── Submit ──────────────────────────────────────────────────────────── */
  const createMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.PedidoInterno.create({
        ...form,
        requester_id:   user?.id,
        requester_name: user?.full_name || user?.email,
        status:         "pendente",
      });
    },
    onSuccess: () => {
      toast.success("Pedido criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["pedidos-internos"] });
      onClose();
    },
    onError: (err) => {
      toast.error("Erro ao criar pedido");
      console.error(err);
    },
  });

  const handleSubmit = () => {
    if (!form.titulo.trim())     return toast.error("Preencha o título do pedido");
    if (!form.assignee_id)       return toast.error("Selecione o responsável");
    if (!form.prazo)             return toast.error("Defina o prazo");
    createMutation.mutate();
  };

  /* ── File upload ─────────────────────────────────────────────────────── */
  const handleFiles = async (files) => {
    setUploading(true);
    try {
      const newMedias = [...form.midias_anexas];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        newMedias.push({
          type: file.type.startsWith("image/") ? "imagem" : "arquivo",
          url: file_url,
          nome: file.name,
          uploaded_at: new Date().toISOString(),
        });
      }
      set("midias_anexas", newMedias);
      toast.success(`${files.length} arquivo(s) enviado(s)`);
    } catch {
      toast.error("Erro ao fazer upload");
    } finally {
      setUploading(false);
    }
  };

  const handleAddLink = (url) => {
    set("midias_anexas", [
      ...form.midias_anexas,
      { type: "link", url, nome: url.split("/").pop() || "Link", uploaded_at: new Date().toISOString() },
    ]);
    toast.success("Link adicionado");
  };

  const handleRemoveMedia = (idx) => {
    set("midias_anexas", form.midias_anexas.filter((_, i) => i !== idx));
  };

  /* ── Paste handler (body-level) ──────────────────────────────────────── */
  useEffect(() => {
    const h = (e) => {
      const files = [];
      for (const item of e.clipboardData?.items || []) {
        if (item.kind === "file") files.push(item.getAsFile());
      }
      if (files.length) { e.preventDefault(); handleFiles(files); }
    };
    document.addEventListener("paste", h);
    return () => document.removeEventListener("paste", h);
  }, [form.midias_anexas]);

  /* ── Responsável / Cliente handlers ──────────────────────────────────── */
  const handleResponsavel = (userId) => {
    const emp = employees.find(e => e.user_id === userId);
    set("assignee_id", userId);
    set("assignee_name", emp?.full_name || "");
  };

  const handleCliente = (wId) => {
    const w = workshops.find(x => x.id === wId);
    set("workshop_id", wId);
    set("workshop_nome", w?.name || "");
  };

  /* ── Focus first field on mount ──────────────────────────────────────── */
  useEffect(() => {
    const t = setTimeout(() => firstFieldRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  /* ── Esc to close ────────────────────────────────────────────────────── */
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: "rgba(26,28,43,0.42)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ── Dialog ──────────────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="novo-pedido-title"
        className="flex w-full max-w-[672px] flex-col overflow-hidden rounded-[18px] border border-gray-200 bg-white shadow-[0_24px_60px_-20px_rgba(20,22,45,0.25),0_2px_8px_rgba(20,22,45,0.06)] animate-in fade-in zoom-in-[0.98] duration-200"
        style={{ maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ────────────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-[22px] py-[14px]">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-[18px] w-[18px]" />
            </button>
            <div>
              <h2 id="novo-pedido-title" className="text-[15px] font-extrabold text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "-0.02em" }}>
                Novo Pedido Interno
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Preencha os detalhes para abrir o chamado</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            aria-label="Fechar"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* ── BODY (scroll interno) ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-[22px] py-[18px] space-y-[14px]">

          {/* Row 1: Tipo + Prioridade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
            <label className="block">
              <Lbl required>Tipo de Pedido</Lbl>
              <CSelect
                ref={firstFieldRef}
                value={form.tipo}
                onChange={(v) => set("tipo", v)}
                options={TIPO_PEDIDO_OPTIONS}
                required
              />
            </label>
            <label className="block">
              <Lbl required>Prioridade</Lbl>
              <CSelect
                value={form.prioridade}
                onChange={(v) => set("prioridade", v)}
                options={PRIORIDADE_OPTIONS}
                required
              />
            </label>
          </div>

          {/* Título */}
          <label className="block">
            <Lbl required>Título do Pedido</Lbl>
            <input
              value={form.titulo}
              onChange={(e) => set("titulo", e.target.value)}
              placeholder="Ex: Solicitar aprovação de desconto especial"
              required
              className={inputBase}
            />
          </label>

          {/* Descrição */}
          <label className="block">
            <Lbl>Descrição Detalhada</Lbl>
            <textarea
              value={form.descricao}
              onChange={(e) => set("descricao", e.target.value)}
              placeholder="Descreva o pedido com todos os detalhes necessários…"
              rows={4}
              className={textareaBase}
            />
          </label>

          {/* Row 2: Responsável + Cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
            <label className="block">
              <Lbl required>Responsável</Lbl>
              <CSelect
                value={form.assignee_id}
                onChange={handleResponsavel}
                options={employees.map(e => ({ value: e.user_id, label: e.full_name }))}
                placeholder="Selecione o responsável"
                required
              />
            </label>
            <label className="block">
              <Lbl>Cliente Relacionado</Lbl>
              <CSelect
                value={form.workshop_id}
                onChange={handleCliente}
                options={workshops.map(w => ({ value: w.id, label: w.name }))}
                placeholder="Selecione o cliente"
              />
            </label>
          </div>

          {/* Row 3: Prazo + Impacto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
            <label className="block">
              <Lbl required>Prazo</Lbl>
              <input
                type="date"
                value={form.prazo}
                onChange={(e) => set("prazo", e.target.value)}
                required
                className={inputBase}
              />
            </label>
            <label className="block">
              <Lbl>Impacto no Cliente</Lbl>
              <CSelect
                value={form.impacto_cliente}
                onChange={(v) => set("impacto_cliente", v)}
                options={IMPACTO_CLIENTE_OPTIONS}
              />
            </label>
          </div>

          {/* Anexos e Links */}
          <div>
            <span className="block text-[13px] font-semibold text-gray-900 mb-1.5">
              Anexos e Links
              <span className="font-normal text-gray-400 text-xs ml-1">(imagens, documentos, links)</span>
            </span>
            <Dropzone onFiles={handleFiles} uploading={uploading} />
            <LinkInput onAdd={handleAddLink} />
            <AttachmentList items={form.midias_anexas} onRemove={handleRemoveMedia} />
          </div>
        </div>

        {/* ── FOOTER ────────────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-gray-200 bg-gray-50/50 px-[22px] py-[14px]">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 items-center gap-2 rounded-[10px] border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="flex h-10 items-center gap-2 rounded-[10px] bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_6px_16px_-6px_rgba(37,99,235,0.5)] transition-all hover:bg-blue-700 disabled:opacity-60"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            )}
            {createMutation.isPending ? "Criando…" : "Criar Pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}
