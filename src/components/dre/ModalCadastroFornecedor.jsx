import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Search, Building2, Upload, X, FileText, Image as ImageIcon } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function maskCnpj(v = "") {
  return v
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .slice(0, 18);
}

function maskTelefone(v = "") {
  const digits = v.replace(/\D/g, "");
  if (digits.length <= 10)
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").slice(0, 15);
}

function maskCep(v = "") {
  return v.replace(/\D/g, "").replace(/(\d{5})(\d{0,3})/, "$1-$2").slice(0, 9);
}

const CAMPO = "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-red-300 disabled:bg-gray-50 disabled:text-gray-400";
const LABEL = "text-xs text-gray-500 mb-1 block font-medium";

// ─── Componente de Upload de Anexos ───────────────────────────────────────────
function AnexosUploader({ anexos, onChange }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const novos = [];
      for (const file of Array.from(files)) {
        const uploaded = await base44.storage.upload(file);
        const isImage = file.type.startsWith("image/");
        novos.push({
          id: uploaded.file_id || crypto.randomUUID(),
          url: uploaded.url,
          name: file.name,
          type: isImage ? "image" : "document",
          size: file.size,
          extension: file.name.split(".").pop()?.toLowerCase() || "",
        });
      }
      onChange([...anexos, ...novos]);
    } catch (e) {
      toast.error("Erro ao fazer upload: " + (e.message || "tente novamente"));
    } finally {
      setUploading(false);
    }
  };

  const remover = (id) => onChange(anexos.filter((a) => a.id !== id));

  return (
    <div className="space-y-2">
      <div
        className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-red-300 hover:bg-red-50/30 transition-colors"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <Upload className="w-4 h-4" />
            <span>Arraste ou <span className="text-red-600 font-medium">clique para anexar</span> NFe, PDFs e imagens</span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.xml"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {anexos.length > 0 && (
        <div className="space-y-1.5">
          {anexos.map((a) => {
            const isImg = a.type === "image";
            return (
              <div key={a.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                {isImg
                  ? <ImageIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  : <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />
                }
                <span className="text-xs text-gray-700 truncate flex-1">{a.name}</span>
                <button type="button" onClick={() => remover(a.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Modal Principal ──────────────────────────────────────────────────────────
export default function ModalCadastroFornecedor({ workshopId, open, onClose, onCriado }) {
  const [form, setForm] = useState({
    nome: "",
    cnpj: "",
    contato: "",
    numero_nfe: "",
    numero_pedido: "",
    endereco_cep: "",
    endereco_logradouro: "",
    endereco_numero: "",
    endereco_complemento: "",
    endereco_bairro: "",
    endereco_cidade: "",
    endereco_uf: "",
  });
  const [anexos, setAnexos] = useState([]);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const buscarCep = async (cep) => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) { toast.error("CEP não encontrado"); return; }
      setForm((prev) => ({
        ...prev,
        endereco_logradouro: data.logradouro || "",
        endereco_bairro: data.bairro || "",
        endereco_cidade: data.localidade || "",
        endereco_uf: data.uf || "",
      }));
    } catch {
      toast.error("Erro ao buscar CEP");
    } finally {
      setBuscandoCep(false);
    }
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast.error("Razão Social / Nome é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const novo = await base44.entities.WorkshopFornecedor.create({
        workshop_id: workshopId,
        ...form,
        anexos,
      });
      toast.success("Fornecedor cadastrado!");
      onCriado(novo);
      onClose();
      // Reset
      setForm({ nome: "", cnpj: "", contato: "", numero_nfe: "", numero_pedido: "", endereco_cep: "", endereco_logradouro: "", endereco_numero: "", endereco_complemento: "", endereco_bairro: "", endereco_cidade: "", endereco_uf: "" });
      setAnexos([]);
    } catch (e) {
      toast.error("Erro ao salvar fornecedor: " + (e.message || "tente novamente"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <Building2 className="w-5 h-5" />
            Cadastrar Novo Fornecedor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* ── Dados Principais ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={LABEL}>Razão Social / Nome *</label>
              <input className={CAMPO} placeholder="Ex: Distribuidora de Peças Ltda" value={form.nome}
                onChange={(e) => set("nome", e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>CNPJ</label>
              <input className={CAMPO} placeholder="00.000.000/0000-00" value={form.cnpj}
                onChange={(e) => set("cnpj", maskCnpj(e.target.value))} maxLength={18} />
            </div>
            <div>
              <label className={LABEL}>Contato (telefone / e-mail)</label>
              <input className={CAMPO} placeholder="(00) 00000-0000 ou email@..." value={form.contato}
                onChange={(e) => {
                  const v = e.target.value;
                  // Se parece ser telefone, aplica máscara; senão deixa livre (e-mail)
                  const onlyDigits = v.replace(/\D/g, "");
                  set("contato", onlyDigits.length > 0 && !v.includes("@") ? maskTelefone(v) : v);
                }} />
            </div>
            <div>
              <label className={LABEL}>Nº NFe</label>
              <input className={CAMPO} placeholder="Ex: 000123456" value={form.numero_nfe}
                onChange={(e) => set("numero_nfe", e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Nº Pedido</label>
              <input className={CAMPO} placeholder="Ex: PED-2024-001" value={form.numero_pedido}
                onChange={(e) => set("numero_pedido", e.target.value)} />
            </div>
          </div>

          {/* ── Endereço ── */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Endereço</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={LABEL}>CEP</label>
                <div className="relative">
                  <input
                    className={CAMPO + " pr-9"}
                    placeholder="00000-000"
                    value={form.endereco_cep}
                    onChange={(e) => {
                      const v = maskCep(e.target.value);
                      set("endereco_cep", v);
                      if (v.replace(/\D/g, "").length === 8) buscarCep(v);
                    }}
                    maxLength={9}
                  />
                  {buscandoCep ? (
                    <Loader2 className="absolute right-2.5 top-2.5 w-4 h-4 animate-spin text-gray-400" />
                  ) : (
                    <button type="button" onClick={() => buscarCep(form.endereco_cep)}
                      className="absolute right-2.5 top-2.5 text-gray-400 hover:text-red-600">
                      <Search className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <label className={LABEL}>Logradouro</label>
                <input className={CAMPO} placeholder="Rua / Avenida" value={form.endereco_logradouro}
                  onChange={(e) => set("endereco_logradouro", e.target.value)} disabled={buscandoCep} />
              </div>
              <div>
                <label className={LABEL}>Número</label>
                <input className={CAMPO} placeholder="123" value={form.endereco_numero}
                  onChange={(e) => set("endereco_numero", e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Complemento</label>
                <input className={CAMPO} placeholder="Apto, Galpão..." value={form.endereco_complemento}
                  onChange={(e) => set("endereco_complemento", e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Bairro</label>
                <input className={CAMPO} placeholder="Bairro" value={form.endereco_bairro}
                  onChange={(e) => set("endereco_bairro", e.target.value)} disabled={buscandoCep} />
              </div>
              <div className="col-span-2">
                <label className={LABEL}>Cidade</label>
                <input className={CAMPO} placeholder="Cidade" value={form.endereco_cidade}
                  onChange={(e) => set("endereco_cidade", e.target.value)} disabled={buscandoCep} />
              </div>
              <div>
                <label className={LABEL}>UF</label>
                <input className={CAMPO} placeholder="SP" value={form.endereco_uf}
                  onChange={(e) => set("endereco_uf", e.target.value.toUpperCase())} maxLength={2} disabled={buscandoCep} />
              </div>
            </div>
          </div>

          {/* ── Anexos ── */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Anexos (NFe, boletos, pedidos)</p>
            <AnexosUploader anexos={anexos} onChange={setAnexos} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Salvando...</> : "Cadastrar Fornecedor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
