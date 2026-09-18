import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Search, Building2 } from "lucide-react";
import { toast } from "sonner";
import AttachmentGallery from "@/components/aceleracao/AttachmentGallery";

// ─── BUSCA CEP ────────────────────────────────────────────────────────────────
async function buscarCEP(cep) {
  const cepLimpo = cep.replace(/\D/g, "");
  if (cepLimpo.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}

// ─── CAMPO COM LABEL ──────────────────────────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT_CLS =
  "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50";

// ─── MODAL PRINCIPAL ──────────────────────────────────────────────────────────
export default function ModalCadastroFornecedor({ open, onClose, workshopId, onCriado }) {
  // Trava o scroll do body quando o modal abre, evitando layout shift da scrollbar
  useEffect(() => {
    if (!open) return;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [open]);
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [contato, setContato] = useState("");
  const [numeroNfe, setNumeroNfe] = useState("");
  const [numeroPedido, setNumeroPedido] = useState("");

  // Endereço
  const [cep, setCep] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");

  // Anexos
  const [anexos, setAnexos] = useState([]);
  const [uploadingAnexo, setUploadingAnexo] = useState(false);

  const [saving, setSaving] = useState(false);

  // ── Busca CEP ───────────────────────────────────────────────────────────────
  const handleCepBlur = async () => {
    if (cep.replace(/\D/g, "").length !== 8) return;
    setBuscandoCep(true);
    const dados = await buscarCEP(cep);
    setBuscandoCep(false);
    if (!dados) {
      toast.error("CEP não encontrado");
      return;
    }
    setLogradouro(dados.logradouro || "");
    setBairro(dados.bairro || "");
    setCidade(dados.localidade || "");
    setUf(dados.uf || "");
  };

  // ── Upload de Anexo ─────────────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingAnexo(true);
    try {
      const uploads = await Promise.all(
        files.map(async (file) => {
          const uploaded = await base44.storage.upload(file);
          const ext = file.name.split(".").pop()?.toLowerCase() || "";
          const isImage = file.type.startsWith("image/");
          return {
            id: uploaded.file_path || uploaded.url || String(Date.now()),
            url: uploaded.url,
            name: file.name,
            type: isImage ? "image" : "document",
            size: file.size,
            extension: ext,
          };
        })
      );
      setAnexos((prev) => [...prev, ...uploads]);
      toast.success(`${uploads.length} arquivo(s) anexado(s)`);
    } catch (err) {
      toast.error("Erro ao enviar arquivo: " + (err.message || "tente novamente"));
    } finally {
      setUploadingAnexo(false);
      e.target.value = "";
    }
  };

  // ── Salvar ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!nome.trim()) {
      toast.error("Razão Social / Nome do fornecedor é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const novo = await base44.entities.WorkshopFornecedor.create({
        workshop_id: workshopId,
        nome: nome.trim(),
        ...(cnpj && { cnpj }),
        ...(contato && { contato }),
        ...(numeroNfe && { numero_nfe: numeroNfe }),
        ...(numeroPedido && { numero_pedido: numeroPedido }),
        ...(cep && { endereco_cep: cep }),
        ...(logradouro && { endereco_logradouro: logradouro }),
        ...(numero && { endereco_numero: numero }),
        ...(complemento && { endereco_complemento: complemento }),
        ...(bairro && { endereco_bairro: bairro }),
        ...(cidade && { endereco_cidade: cidade }),
        ...(uf && { endereco_uf: uf }),
        ...(anexos.length > 0 && { anexos }),
      });
      toast.success("Fornecedor cadastrado com sucesso!");
      onCriado(novo);
      handleClose();
    } catch (err) {
      toast.error("Erro ao salvar fornecedor: " + (err.message || "tente novamente"));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setNome(""); setCnpj(""); setContato(""); setNumeroNfe(""); setNumeroPedido("");
    setCep(""); setLogradouro(""); setNumero(""); setComplemento("");
    setBairro(""); setCidade(""); setUf(""); setAnexos([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <Building2 className="w-5 h-5" />
            Cadastrar Fornecedor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* ── Dados Principais ── */}
          <Field label="Razão Social / Nome" required>
            <input
              className={INPUT_CLS}
              placeholder="Nome ou razão social do fornecedor"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="CNPJ">
              <input
                className={INPUT_CLS}
                placeholder="00.000.000/0001-00"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
              />
            </Field>
            <Field label="Contato">
              <input
                className={INPUT_CLS}
                placeholder="Nome ou telefone"
                value={contato}
                onChange={(e) => setContato(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nº NFe">
              <input
                className={INPUT_CLS}
                placeholder="Ex: NF-2024-00123"
                value={numeroNfe}
                onChange={(e) => setNumeroNfe(e.target.value)}
              />
            </Field>
            <Field label="Nº Pedido">
              <input
                className={INPUT_CLS}
                placeholder="Ex: PED-001"
                value={numeroPedido}
                onChange={(e) => setNumeroPedido(e.target.value)}
              />
            </Field>
          </div>

          {/* ── Endereço ── */}
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Endereço
            </p>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="col-span-2">
                <Field label="CEP">
                  <div className="relative">
                    <input
                      className={INPUT_CLS + " pr-9"}
                      placeholder="00000-000"
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      onBlur={handleCepBlur}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      {buscandoCep ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      ) : (
                        <Search className="w-4 h-4 text-gray-300" />
                      )}
                    </div>
                  </div>
                </Field>
              </div>
              <Field label="UF">
                <input
                  className={INPUT_CLS}
                  placeholder="SP"
                  value={uf}
                  onChange={(e) => setUf(e.target.value)}
                  maxLength={2}
                />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="col-span-2">
                <Field label="Logradouro">
                  <input
                    className={INPUT_CLS}
                    placeholder="Rua / Avenida"
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Número">
                <input
                  className={INPUT_CLS}
                  placeholder="123"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Complemento">
                <input
                  className={INPUT_CLS}
                  placeholder="Apto, sala..."
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                />
              </Field>
              <Field label="Bairro">
                <input
                  className={INPUT_CLS}
                  placeholder="Bairro"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Cidade">
              <input
                className={INPUT_CLS}
                placeholder="São Paulo"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
              />
            </Field>
          </div>

          {/* ── Anexos ── */}
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Anexos (NFe, Contratos, Documentos)
            </p>

            <label className="flex items-center justify-center gap-2 w-full py-2 px-3 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-red-400 hover:bg-red-50 transition-colors text-sm text-gray-500 hover:text-red-700">
              {uploadingAnexo ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
              ) : (
                <>+ Adicionar PDF ou Imagem</>
              )}
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                multiple
                className="hidden"
                onChange={handleFileChange}
                disabled={uploadingAnexo}
              />
            </label>

            {anexos.length > 0 && (
              <div className="mt-3">
                <AttachmentGallery files={anexos} />
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            className="flex-1 bg-red-600 hover:bg-red-700"
            onClick={handleSave}
            disabled={saving || uploadingAnexo}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Salvar Fornecedor
          </Button>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
