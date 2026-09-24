import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Trash2, ArrowUpCircle, ArrowDownCircle,
  CheckCircle, AlertCircle, BarChart3, TrendingUp, TrendingDown,
  ChevronDown, ChevronUp, Loader2, RefreshCw, UserPlus, Building2,
  Paperclip, X as XIcon, ArrowLeftRight,
  Pencil, CheckSquare, Calendar, DollarSign, FileText, RotateCcw
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency } from "@/components/utils/formatters";
import { toast } from "sonner";
import SubcategoriaSelector from "./SubcategoriaSelector";
import FiltroPeriodo from "./FiltroPeriodo";
import ConfiguracaoRecorrencia from "./ConfiguracaoRecorrencia";
import Combobox from "@/components/ui/combobox";
import ModalCadastroCliente from "./ModalCadastroCliente";
import ModalCadastroFornecedor from "./ModalCadastroFornecedor";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, Legend } from "recharts";
import ModalTransferenciaContas from "@/components/dfc/ModalTransferenciaContas";
import useFontesDinheiro from "@/components/dfc/useFontesDinheiro";

const FREQUENCIAS = [
  { value: "unico", label: "Único (só este mês)" },
  { value: "mensal", label: "Mensal" },
  { value: "quinzenal", label: "Quinzenal" },
  { value: "semanal", label: "Semanal" },
  { value: "anual", label: "Anual" },
];

const TIPOS_DOCUMENTO = [
  { value: "nota_fiscal", label: "Nota Fiscal" },
  { value: "pedido_compra", label: "Pedido de Compra" },
  { value: "fatura", label: "Fatura" },
  { value: "outro", label: "Outro" },
];

const CATEGORIAS_RECEITA_KEYS = ['pecas_aplicadas', 'servicos', 'outras'];
const CATEGORIAS_DESPESA_KEYS = ['operacional', 'pessoas', 'marketing', 'manutencao', 'terceirizados', 'administrativo', 'financeiro', 'pecas_estoque', 'tecnologia', 'juridico'];

function inferirTipoPorCategoria(categoria) {
  if (CATEGORIAS_RECEITA_KEYS.includes(categoria)) return 'receita';
  if (CATEGORIAS_DESPESA_KEYS.includes(categoria)) return 'despesa';
  return null;
}

const CATEGORIAS_DESPESA = {
  operacional:    { label: "Operacional",              entra_tcmp2: true,  subcategorias: ["Aluguel", "Energia elétrica", "Água e esgoto", "Telefone / Internet", "IPTU", "Seguro predial"] },
  pessoas:        { label: "Pessoas",                  entra_tcmp2: true,  subcategorias: ["Salários", "FGTS", "INSS", "Vale transporte", "Vale refeição", "Férias / 13º (provisão)", "Pró-labore sócios"] },
  marketing:      { label: "Marketing",                entra_tcmp2: true,  subcategorias: ["Tráfego pago (Meta/Google)", "Agência de marketing", "Material gráfico", "Patrocínios", "Uniforme / Branding"] },
  manutencao:     { label: "Manutenção",               entra_tcmp2: true,  subcategorias: ["Manutenção predial", "Manutenção de equipamentos", "Ferramentas", "EPI"] },
  terceirizados:  { label: "Serviços Terceiros",       entra_tcmp2: true,  subcategorias: ["Contabilidade", "Advocacia", "Consultoria", "TI / Software de gestão", "Limpeza / Segurança"] },
  administrativo: { label: "Administrativo",           entra_tcmp2: true,  subcategorias: ["Material de escritório", "Taxas bancárias", "Impostos sobre serviço", "Certificações", "Seguros gerais"] },
  financeiro:     { label: "Financeiro / Investimento",entra_tcmp2: false, subcategorias: ["Financiamento (veículo/imóvel)", "Consórcio", "Parcelamento de equipamento", "Empréstimo bancário", "Processos judiciais", "Compra de imóvel/terreno"] },
  pecas_estoque:  { label: "Peças para Estoque",      entra_tcmp2: false, subcategorias: ["Boleto de peças (estoque)", "Compra antecipada", "Devolução de peças"] },
  tecnologia:     { label: "Tecnologia",               entra_tcmp2: true,  subcategorias: ["APIs IA", "Base44", "Cloud", "OpenAI", "Software", "Infraestrutura", "Segurança"] },
  juridico:       { label: "Jurídico",                 entra_tcmp2: false, subcategorias: ["Processos Trabalhistas", "Processos Cíveis", "Honorários Jurídicos", "Acordos", "Custas Judiciais", "Indenizações", "Multas"] },
};

const CATEGORIAS_RECEITA = {
  pecas_aplicadas: { label: "Peças Aplicadas",        subcategorias: ["Peças mecânicas", "Peças elétricas", "Funilaria / Pintura", "Pneus / Rodas", "Acessórios"] },
  servicos:        { label: "Serviços (Mão de Obra)", subcategorias: ["Revisão / Manutenção", "Funilaria", "Pintura", "Alinhamento / Balanceamento", "Elétrica / Scanner", "Vidros / Insulfilm"] },
  outras:          { label: "Outras Receitas",         subcategorias: ["Venda de sucata", "Locadora / Seguradora", "Franquia / Repasse", "Outros"] },
};

// ─── FORMULÁRIO DE LANÇAMENTO ─────────────────────────────────────────────────
function FormLancamento({ tipo, workshopId, mes, onSuccess, onCancel }) {
  const queryClient = useQueryClient();
  const [catKey, setCatKey] = useState("");
  const [subcat, setSubcat] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [dataPagamento, setDataPagamento] = useState("");
  const [saving, setSaving] = useState(false);
  const [anexoFile, setAnexoFile]   = useState(null);
  const [anexoUrl, setAnexoUrl]     = useState("");
  const [anexoNome, setAnexoNome]   = useState("");
  const [uploadingAnexo, setUploadingAnexo] = useState(false);

  const handleAnexoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Arquivo muito grande (máx. 10 MB)'); return; }
    setAnexoFile(file); setAnexoNome(file.name); setUploadingAnexo(true);
    try {
      const { url } = await base44.integrations.Core.UploadFile({ file });
      setAnexoUrl(url); toast.success('Anexo pronto!');
    } catch (err) {
      toast.error('Erro no upload: ' + (err.message || 'tente novamente'));
      setAnexoFile(null); setAnexoNome("");
    } finally { setUploadingAnexo(false); }
  };

  const handleRemoverAnexo = () => {
    setAnexoFile(null); setAnexoUrl(""); setAnexoNome("");
    const input = document.querySelector('input[type="file"][accept=".pdf,.jpg,.jpeg,.png,.webp"]');
    if (input) input.value = '';
  };

  const [docOpen, setDocOpen] = useState(false);
  const [dataCompetencia, setDataCompetencia] = useState("");
  const [dataDocumento, setDataDocumento] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [modalClienteOpen, setModalClienteOpen] = useState(false);
  const [fornecedorId, setFornecedorId] = useState("");
  const [fornecedorNome, setFornecedorNome] = useState("");
  const [modalFornecedorOpen, setModalFornecedorOpen] = useState(false);

  const { data: clientes = [] } = useQuery({
    queryKey: ["workshop-clientes", workshopId],
    queryFn: () => base44.entities.WorkshopCliente.filter({ workshop_id: workshopId }, 'nome', 200),
    enabled: tipo === "receita" && !!workshopId, staleTime: 30_000,
  });
  const { data: fornecedores = [] } = useQuery({
    queryKey: ["workshop-fornecedores", workshopId],
    queryFn: () => base44.entities.WorkshopFornecedor.filter({ workshop_id: workshopId }, 'nome', 200),
    enabled: tipo === "despesa" && !!workshopId, staleTime: 30_000,
  });

  const handleClienteChange = (id) => { setClienteId(id || ""); const f = clientes.find(c => c.id === id); setClienteNome(f ? f.nome : ""); };
  const handleFornecedorChange = (id) => { setFornecedorId(id || ""); const f = fornecedores.find(f => f.id === id); setFornecedorNome(f ? f.nome : ""); };
  const handleClienteCriado = (novo) => { queryClient.invalidateQueries({ queryKey: ["workshop-clientes", workshopId] }); setClienteId(novo.id); setClienteNome(novo.nome); };
  const handleFornecedorCriado = (novo) => { queryClient.invalidateQueries({ queryKey: ["workshop-fornecedores", workshopId] }); setFornecedorId(novo.id); setFornecedorNome(novo.nome); };

  const tipoInferido = catKey ? inferirTipoPorCategoria(catKey) : tipo;
  const [frequencia, setFrequencia] = useState("unico");
  const [recorrencia, setRecorrencia] = useState({ data_inicio: mes ? mes + "-01" : "", data_fim: null, numero_parcelas: 12 });

  const categorias = tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
  const catSelecionada = categorias[catKey];

  const handleSave = async () => {
    if (!catKey || !valor || !descricao) { toast.error("Preencha todos os campos obrigatórios"); return; }
    if (!subcat) { toast.error("Selecione uma subcategoria"); return; }
    const valorLimpo = String(valor).replace(/\./g, "").replace(",", ".");
    const valorNum = parseFloat(valorLimpo);
    if (isNaN(valorNum) || valorNum <= 0) { toast.error("Informe um valor maior que zero"); return; }
    setSaving(true);
    try {
      if (frequencia && frequencia !== "unico") {
        if (!recorrencia.data_inicio) { toast.error("Informe a data de início da recorrência"); setSaving(false); return; }
        const resp = await base44.functions.invoke("criarLancamentoRecorrente", {
          workshop_id: workshopId, mes_inicio: mes, tipo: tipoInferido || tipo,
          categoria: catKey, subcategoria: subcat, descricao, valor: valorNum,
          entra_tcmp2: catSelecionada?.entra_tcmp2 ?? true,
          ...(dataVencimento && { data_vencimento: dataVencimento }),
          ...(dataCompetencia && { data_competencia: dataCompetencia }),
          ...(dataDocumento && { data_documento: dataDocumento }),
          ...(tipoDocumento && { tipo_documento: tipoDocumento }),
          ...(numeroDocumento.trim() && { numero_documento: numeroDocumento.trim() }),
          frequencia, data_inicio: recorrencia.data_inicio,
          ...(recorrencia.data_fim ? { data_fim: recorrencia.data_fim } : { numero_parcelas: recorrencia.numero_parcelas }),
        });
        toast.success(`${resp.data?.total_criado ?? 0} lançamentos recorrentes criados!`);
      } else {
        const novoLancamento = await base44.entities.DRELancamento.create({
          workshop_id: workshopId, mes, tipo: tipoInferido || tipo,
          categoria: catKey, subcategoria: subcat, descricao, valor: valorNum,
          entra_tcmp2: catSelecionada?.entra_tcmp2 ?? true, frequencia: "unico",
          ...(dataVencimento && { data_vencimento: dataVencimento }),
          ...(dataPagamento && { data_pagamento: dataPagamento }),
          ...(dataCompetencia && { data_competencia: dataCompetencia }),
          ...(dataDocumento && { data_documento: dataDocumento }),
          ...(tipoDocumento && { tipo_documento: tipoDocumento }),
          ...(numeroDocumento.trim() && { numero_documento: numeroDocumento.trim() }),
          ...((tipoInferido || tipo) === "receita" && clienteId ? { cliente_id: clienteId, cliente_nome: clienteNome } : {}),
          ...((tipoInferido || tipo) === "despesa" && fornecedorId ? { fornecedor_id: fornecedorId, fornecedor_nome: fornecedorNome } : {}),
          ...(anexoUrl ? { anexo_url: anexoUrl, anexo_nome: anexoNome } : {}),
        });
        window.dispatchEvent(new CustomEvent('dre-lancamento-criado', { detail: { workshop_id: workshopId, mes, lancamento: novoLancamento } }));
        toast.success("Lançamento adicionado!");
      }
      onSuccess();
    } catch (e) {
      toast.error("Erro ao salvar: " + (e.message || "tente novamente"));
    } finally { setSaving(false); }
  };

  const cor = tipo === "receita"
    ? { bg: "bg-green-50", border: "border-green-200", title: "text-green-700", ring: "focus:ring-green-300", btn: "bg-green-600 hover:bg-green-700" }
    : { bg: "bg-red-50", border: "border-red-200", title: "text-red-700", ring: "focus:ring-red-300", btn: "bg-red-600 hover:bg-red-700" };
  const inputCls = `w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 ${cor.ring}`;

  return (
    <>
      <ModalCadastroCliente workshopId={workshopId} open={modalClienteOpen} onClose={() => setModalClienteOpen(false)} onCriado={handleClienteCriado} />
      <ModalCadastroFornecedor workshopId={workshopId} open={modalFornecedorOpen} onClose={() => setModalFornecedorOpen(false)} onCriado={handleFornecedorCriado} />
      <div className={`${cor.bg} border-2 border-dashed ${cor.border} rounded-xl p-4 space-y-3`}>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm font-semibold ${cor.title}`}>{tipo === "receita" ? "💰 Novo Lançamento de Receita" : "📋 Novo Lançamento de Despesa"}</p>
          {catKey && tipoInferido && (
            <Badge className={tipoInferido === "receita" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
              {tipoInferido === "receita" ? "💰 Receita" : "📉 Despesa"} Detectado
            </Badge>
          )}
        </div>
        {tipo === "receita" && (
          <div>
            <label className="text-xs text-gray-500 mb-1 block font-medium">Cliente</label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Combobox options={clientes} value={clienteId} onChange={handleClienteChange}
                  getOptionLabel={(c) => c.nome} getOptionValue={(c) => c.id}
                  placeholder="Selecione o cliente..." emptyText="Nenhum cliente. Cadastre um novo →" clearValue="" />
              </div>
              <button type="button" onClick={() => setModalClienteOpen(true)}
                className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border-2 border-dashed border-green-300 text-green-600 hover:bg-green-100 hover:border-green-500 transition-colors" title="Cadastrar novo cliente">
                <UserPlus className="w-4 h-4" />
              </button>
            </div>
            {clienteNome && <p className="text-xs text-green-600 mt-1 pl-1">✓ {clienteNome}</p>}
          </div>
        )}
        {tipo === "despesa" && (
          <div>
            <label className="text-xs text-gray-500 mb-1 block font-medium">Fornecedor</label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Combobox options={fornecedores} value={fornecedorId} onChange={handleFornecedorChange}
                  getOptionLabel={(f) => f.nome} getOptionValue={(f) => f.id}
                  placeholder="Selecione o fornecedor..." emptyText="Nenhum fornecedor. Cadastre um novo →" clearValue="" />
              </div>
              <button type="button" onClick={() => setModalFornecedorOpen(true)}
                className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border-2 border-dashed border-red-300 text-red-600 hover:bg-red-100 hover:border-red-500 transition-colors" title="Cadastrar novo fornecedor">
                <Building2 className="w-4 h-4" />
              </button>
            </div>
            {fornecedorNome && <p className="text-xs text-red-600 mt-1 pl-1">✓ {fornecedorNome}</p>}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Categoria *</label>
            <select className={inputCls} value={catKey} onChange={e => { setCatKey(e.target.value); setSubcat(""); }}>
              <option value="">Selecione...</option>
              {Object.entries(categorias).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Subcategoria *</label>
            <SubcategoriaSelector categoria={catKey} workshopId={workshopId} value={subcat} onChange={setSubcat} disabled={!catKey} placeholder="Selecione ou crie..." />
          </div>
        </div>
        {catKey && tipo === "despesa" && (
          <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${catSelecionada?.entra_tcmp2 ? "bg-blue-100 text-blue-700" : "bg-red-50 text-red-700"}`}>
            {catSelecionada?.entra_tcmp2
              ? <><CheckCircle className="w-3 h-3 flex-shrink-0" /> Este custo <strong className="ml-1">ENTRA</strong> no cálculo do TCMP²</>
              : <><AlertCircle className="w-3 h-3 flex-shrink-0" /> Este custo <strong className="ml-1">NÃO ENTRA</strong> no cálculo do TCMP²</>}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Descrição *</label>
            <input className={inputCls} placeholder="Ex: Energia elétrica maio" value={descricao} onChange={e => setDescricao(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Valor (R$) *</label>
            <input className={`${inputCls} text-right font-mono`} placeholder="0,00" value={valor} onChange={e => setValor(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">{tipo === "receita" ? "🛒 Data da Venda" : "🛒 Data da Compra"} <span className="text-gray-400">(opcional)</span></label>
          <input type="date" className={inputCls} value={dataCompetencia} onChange={e => setDataCompetencia(e.target.value)} />
        </div>
        {tipo === "despesa" && (
          <div className="border border-gray-200 rounded-lg bg-white/70">
            <button type="button" onClick={() => setDocOpen(!docOpen)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700">
              <span>📄 Documento (NF, Pedido, Fatura) <span className="text-gray-400 font-normal">(opcional)</span></span>
              {docOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {docOpen && (
              <div className="px-3 pb-3 pt-2 grid grid-cols-2 gap-2 border-t border-gray-100">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Data do Documento</label>
                  <input type="date" className={inputCls} value={dataDocumento} onChange={e => setDataDocumento(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tipo de Documento</label>
                  <select className={inputCls} value={tipoDocumento} onChange={e => setTipoDocumento(e.target.value)}>
                    <option value="">Selecione...</option>
                    {TIPOS_DOCUMENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Número do Documento</label>
                  <input className={inputCls} placeholder="Ex: NF 1234" value={numeroDocumento} onChange={e => setNumeroDocumento(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        )}
        <div className="border border-gray-200 rounded-lg bg-white/70 px-3 py-2">
          <p className="text-xs font-medium text-gray-500 mb-1.5"><Paperclip className="w-3 h-3 inline mr-1" />Anexo <span className="font-normal text-gray-400">(NF, fatura, comprovante — opcional)</span></p>
          {!anexoNome ? (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleAnexoChange} disabled={uploadingAnexo} />
              <span className="flex items-center gap-1.5 text-xs border border-dashed border-gray-300 rounded-lg px-3 py-2 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors">
                {uploadingAnexo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                {uploadingAnexo ? 'Enviando...' : 'Selecionar arquivo'}
              </span>
            </label>
          ) : (
            <div className="flex items-center justify-between gap-2 text-xs bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5">
              <a href={anexoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-700 hover:underline truncate">
                <Paperclip className="w-3 h-3 flex-shrink-0" /><span className="truncate">{anexoNome}</span>
              </a>
              <button type="button" onClick={handleRemoverAnexo} className="flex-shrink-0 text-gray-400 hover:text-red-500"><XIcon className="w-3 h-3" /></button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">📅 Vencimento <span className="text-gray-400">(opcional)</span></label>
            <input type="date" className={inputCls} value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">✅ Data Pagamento <span className="text-gray-400">(opcional)</span></label>
            <input type="date" className={inputCls} value={dataPagamento} onChange={e => setDataPagamento(e.target.value)}
              disabled={frequencia !== "unico"} title={frequencia !== "unico" ? "Data de pagamento só disponível para lançamentos únicos" : ""} />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">🔁 Recorrência</label>
          <select className={inputCls} value={frequencia} onChange={e => setFrequencia(e.target.value)}>
            {FREQUENCIAS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        {frequencia !== "unico" && (
          <ConfiguracaoRecorrencia frequencia={frequencia} dataInicio={recorrencia.data_inicio}
            dataFim={recorrencia.data_fim} numeroParcelas={recorrencia.numero_parcelas}
            onChange={(partial) => setRecorrencia(prev => ({ ...prev, ...partial }))} />
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving} className={`${cor.btn} text-white flex-1`}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            {frequencia !== "unico" ? "Criar Recorrência" : "Adicionar"}
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>Cancelar</Button>
        </div>
      </div>
    </>
  );
}

// ─── LINHA DE LANÇAMENTO — Sprint A ───────────────────────────────────────────
// 3 estados separados:
//   expanded      — accordion de detalhe (clique na linha)
//   editing       — Dialog de edição (botão Editar)
//   confirmDelete — confirmação inline de exclusão
function LancamentoRow({ item, onDelete, onSaved }) {
  const [expanded,      setExpanded]      = useState(false);
  const [editing,       setEditing]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [markingPago,   setMarkingPago]   = useState(false);

  const categorias = item.tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
  const cat        = categorias[item.categoria];

  const [catKey,         setCatKey]         = useState(item.categoria);
  const [subcat,         setSubcat]         = useState(item.subcategoria || "");
  const [descricao,      setDescricao]      = useState(item.descricao || "");
  const [valor,          setValor]          = useState(String(item.valor));
  const [dataVencimento, setDataVencimento] = useState(item.data_vencimento || "");
  const [dataPagamento,  setDataPagamento]  = useState(item.data_pagamento  || "");
  const [frequencia,     setFrequencia]     = useState(item.frequencia || "unico");

  const catSelecionada = categorias[catKey];

  const abrirEdicao = (e) => {
    e.stopPropagation();
    setCatKey(item.categoria);
    setSubcat(item.subcategoria || "");
    setDescricao(item.descricao || "");
    setValor(String(item.valor));
    setDataVencimento(item.data_vencimento || "");
    setDataPagamento(item.data_pagamento   || "");
    setFrequencia(item.frequencia || "unico");
    setEditing(true);
  };

  const handleMarcarPago = async (e) => {
    e.stopPropagation();
    if (item.data_pagamento) return;
    const hoje = new Date().toISOString().split("T")[0];
    setMarkingPago(true);
    try {
      await base44.entities.DRELancamento.update(item.id, { data_pagamento: hoje });
      window.dispatchEvent(new CustomEvent("dre-lancamento-criado", { detail: { workshop_id: item.workshop_id, mes: item.mes } }));
      toast.success("✅ Marcado como pago!");
      onSaved();
    } catch { toast.error("Erro ao marcar como pago"); }
    finally { setMarkingPago(false); }
  };

  const handleDesfazerPago = async (e) => {
    e.stopPropagation();
    setSaving(true);
    try {
      await base44.entities.DRELancamento.update(item.id, { data_pagamento: null });
      window.dispatchEvent(new CustomEvent("dre-lancamento-criado", { detail: { workshop_id: item.workshop_id, mes: item.mes } }));
      toast.success("Pagamento revertido");
      onSaved();
    } catch { toast.error("Erro ao reverter"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    setDeleting(true);
    try {
      await base44.entities.DRELancamento.delete(item.id);
      onDelete();
    } catch { toast.error("Erro ao excluir"); setDeleting(false); }
  };

  const handleSave = async () => {
    const valorNum = parseFloat(String(valor).replace(/\./g, "").replace(",", "."));
    if (!catKey || !descricao || isNaN(valorNum) || valorNum <= 0) { toast.error("Preencha todos os campos corretamente"); return; }
    setSaving(true);
    try {
      await base44.entities.DRELancamento.update(item.id, {
        categoria: catKey, subcategoria: subcat, descricao, valor: valorNum,
        entra_tcmp2: catSelecionada?.entra_tcmp2 ?? item.entra_tcmp2,
        data_vencimento: dataVencimento || null,
        data_pagamento:  dataPagamento  || null,
        frequencia: frequencia || "unico",
      });
      window.dispatchEvent(new CustomEvent("dre-lancamento-criado", { detail: { workshop_id: item.workshop_id, mes: item.mes } }));
      toast.success("Lançamento atualizado!");
      setEditing(false);
      onSaved();
    } catch { toast.error("Erro ao salvar"); }
    finally { setSaving(false); }
  };

  const fmtData     = (d) => { if (!d) return ""; const [,m,dia] = d.split("-"); return `${dia}/${m}`; };
  const fmtDataLonga = (d) => { if (!d) return ""; const [ano,m,dia] = d.split("-"); return `${dia}/${m}/${ano}`; };

  const isPago    = !!item.data_pagamento;
  const hasVenc   = !!item.data_vencimento;
  const hoje      = new Date().toISOString().split("T")[0];
  const isVencido = hasVenc && !isPago && item.data_vencimento < hoje;

  const barColor   = item.tipo === "receita" ? "bg-green-400" : item.entra_tcmp2 ? "bg-blue-400" : "bg-orange-400";
  const cardBorder = isVencido ? "border-red-200 bg-red-50/30"
    : expanded ? "border-blue-200 bg-blue-50/20"
    : "border-gray-200 bg-white";

  return (
    <>
      <div className={`relative border rounded-xl overflow-hidden shadow-sm transition-all duration-150 ${cardBorder}`}>
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${barColor}`} />

        {/* Linha principal — clique expande/recolhe */}
        <div className="flex items-center gap-3 pl-4 pr-3 py-3 cursor-pointer group select-none"
             onClick={() => { setExpanded(v => !v); setConfirmDelete(false); }}>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{item.descricao}</p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[11px] text-gray-400">{cat?.label ?? item.categoria}</span>
              {item.subcategoria && <span className="text-[11px] text-gray-400">· {item.subcategoria}</span>}
              {item.tipo === "receita" && item.cliente_nome && (
                <span className="inline-flex items-center gap-1 text-[11px] bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full">👤 {item.cliente_nome}</span>
              )}
              {item.tipo === "despesa" && item.fornecedor_nome && (
                <span className="inline-flex items-center gap-1 text-[11px] bg-gray-100 text-gray-600 border border-gray-200 px-1.5 py-0.5 rounded-full">🏪 {item.fornecedor_nome}</span>
              )}
              {item.data_competencia && (
                <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full">
                  {item.tipo === "receita" ? "venda" : "compra"} {fmtData(item.data_competencia)}
                </span>
              )}
              {(item.tipo_documento || item.numero_documento) && (
                <span className="text-[11px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded-full">
                  📄 {TIPOS_DOCUMENTO.find(t => t.value === item.tipo_documento)?.label ?? "Doc"}{item.numero_documento ? ` ${item.numero_documento}` : ""}
                </span>
              )}
              {item.tipo === "despesa" && (
                item.entra_tcmp2
                  ? <span className="text-[11px] text-blue-600">✅ TCMP²</span>
                  : <span className="text-[11px] text-orange-500">🚫 Fora TCMP²</span>
              )}
              {item.frequencia && item.frequencia !== "unico" && (
                <span className="text-[11px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
                  🔁 {FREQUENCIAS.find(f => f.value === item.frequencia)?.label ?? item.frequencia}
                  {item.parcela_atual && item.numero_parcelas ? ` (${item.parcela_atual}/${item.numero_parcelas})` : ""}
                </span>
              )}
              {isPago ? (
                <span className="inline-flex items-center gap-1 text-[11px] bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full font-medium">✅ pago {fmtData(item.data_pagamento)}</span>
              ) : isVencido ? (
                <span className="inline-flex items-center gap-1 text-[11px] bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full font-medium">⚠️ venceu {fmtData(item.data_vencimento)}</span>
              ) : hasVenc ? (
                <span className="inline-flex items-center gap-1 text-[11px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium">🕐 vence {fmtData(item.data_vencimento)}</span>
              ) : null}
              {item.anexo_url && (
                <a href={item.anexo_url} target="_blank" rel="noreferrer"
                   onClick={e => e.stopPropagation()} title={item.anexo_nome || "Ver anexo"}
                   className="text-blue-400 hover:text-blue-600"><Paperclip className="w-3 h-3" /></a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-sm font-bold ${item.tipo === "receita" ? "text-green-600" : "text-red-600"}`}>
              {item.tipo === "receita" ? "+" : "-"} {formatCurrency(item.valor)}
            </span>
            {!isPago && (
              <button onClick={handleMarcarPago} disabled={markingPago} title="Marcar como pago hoje"
                className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px] text-green-600 hover:text-green-800 hover:bg-green-50 border border-green-200 rounded-lg px-2 py-1">
                {markingPago ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckSquare className="w-3 h-3" />}
                Pago
              </button>
            )}
            <button onClick={abrirEdicao} title="Editar"
              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg p-1.5">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <div className="text-gray-300 group-hover:text-gray-500 transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>

        {/* Accordion de detalhe */}
        {expanded && (
          <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3 space-y-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
              {item.data_vencimento && (
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Calendar className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-400">Vencimento</span>
                  <span className="font-medium">{fmtDataLonga(item.data_vencimento)}</span>
                </div>
              )}
              {item.data_pagamento && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span className="text-gray-400">Pago em</span>
                  <span className="font-medium text-green-700">{fmtDataLonga(item.data_pagamento)}</span>
                </div>
              )}
              {item.data_competencia && (
                <div className="flex items-center gap-1.5 text-gray-600">
                  <DollarSign className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-400">{item.tipo === "receita" ? "Venda" : "Compra"}</span>
                  <span className="font-medium">{fmtDataLonga(item.data_competencia)}</span>
                </div>
              )}
              {item.numero_documento && (
                <div className="flex items-center gap-1.5 text-gray-600">
                  <FileText className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-400">{TIPOS_DOCUMENTO.find(t => t.value === item.tipo_documento)?.label ?? "Doc"}</span>
                  <span className="font-medium">{item.numero_documento}</span>
                </div>
              )}
              {item.recorrencia_id && (
                <div className="flex items-center gap-1.5 text-gray-600 col-span-2">
                  <RotateCcw className="w-3 h-3 text-purple-400" />
                  <span className="text-gray-400">Série</span>
                  <span className="font-medium text-purple-700">
                    {FREQUENCIAS.find(f => f.value === item.frequencia)?.label}
                    {item.parcela_atual && item.numero_parcelas ? ` — parcela ${item.parcela_atual} de ${item.numero_parcelas}` : ""}
                  </span>
                </div>
              )}
              {item.anexo_url && (
                <div className="flex items-center gap-1.5 col-span-2">
                  <Paperclip className="w-3 h-3 text-blue-400" />
                  <a href={item.anexo_url} target="_blank" rel="noreferrer"
                     className="text-blue-600 hover:underline truncate text-xs">{item.anexo_nome || "Ver anexo"}</a>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <Button size="sm" variant="outline" onClick={abrirEdicao}
                className="border-blue-200 text-blue-700 hover:bg-blue-50 h-7 text-xs">
                <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
              </Button>
              {!isPago ? (
                <Button size="sm" variant="outline" onClick={handleMarcarPago} disabled={markingPago}
                  className="border-green-200 text-green-700 hover:bg-green-50 h-7 text-xs">
                  {markingPago ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <CheckSquare className="w-3.5 h-3.5 mr-1" />}
                  Marcar como pago
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={handleDesfazerPago} disabled={saving}
                  className="border-amber-200 text-amber-700 hover:bg-amber-50 h-7 text-xs">
                  <RotateCcw className="w-3.5 h-3.5 mr-1" /> Desfazer pagamento
                </Button>
              )}
              <div className="ml-auto">
                {!confirmDelete ? (
                  <button onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
                    className="text-[11px] text-gray-400 hover:text-red-500 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3 h-3" /> Excluir
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                    <span className="text-[11px] text-red-700 font-medium">Confirmar exclusão?</span>
                    <button onClick={handleDelete} disabled={deleting}
                      className="text-[11px] font-bold text-red-600 hover:text-red-800">
                      {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Sim"}
                    </button>
                    <button onClick={e => { e.stopPropagation(); setConfirmDelete(false); }}
                      className="text-[11px] text-gray-500 hover:text-gray-700">Não</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dialog de edição */}
      <Dialog open={editing} onOpenChange={open => { if (!open) setEditing(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-gray-100 pb-3 mb-2">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Pencil className="w-4 h-4 text-blue-500" />
              Editar Lançamento
              <Badge className={`ml-auto ${item.tipo === "receita" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {item.tipo === "receita" ? "💰 Receita" : "📉 Despesa"}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Categoria</label>
                <Combobox
                  className="w-full"
                  options={Object.entries(categorias).map(([k, v]) => ({ label: v.label, value: k }))}
                  value={catKey}
                  onChange={v => { setCatKey(v); setSubcat(""); }}
                  placeholder="Selecione a categoria"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Subcategoria</label>
                <SubcategoriaSelector categoria={catKey} workshopId={item.workshop_id}
                  value={subcat} onChange={setSubcat} placeholder="Selecione ou crie..." />
              </div>
            </div>
            {catKey && item.tipo === "despesa" && (
              <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${catSelecionada?.entra_tcmp2 ? "bg-blue-100 text-blue-700" : "bg-orange-50 text-orange-700"}`}>
                {catSelecionada?.entra_tcmp2
                  ? <><CheckCircle className="w-3 h-3" /> <strong>ENTRA</strong> no TCMP²</>
                  : <><AlertCircle className="w-3 h-3" /> <strong>NÃO ENTRA</strong> no TCMP²</>}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Descrição *</label>
                <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={descricao} onChange={e => setDescricao(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Valor (R$) *</label>
                <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 text-right font-mono"
                  value={valor} onChange={e => setValor(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Vencimento</label>
                <input type="date" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Pago em</label>
                <input type="date" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
                  value={dataPagamento} onChange={e => setDataPagamento(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Recorrência</label>
              <Combobox
                className="w-full"
                options={FREQUENCIAS}
                value={frequencia}
                onChange={setFrequencia}
                placeholder="Selecione a recorrência"
              />
              {item.recorrencia_id && (
                <p className="text-xs text-amber-600 mt-1">⚠️ Parte de uma recorrência — alteração afeta só este item.</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 justify-end border-t border-gray-100 pt-3 mt-2">
            <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── SEÇÃO AGRUPADA POR CATEGORIA — Sprint B ───────────────────────────────────
// Cabeçalho rico: total bruto + subtotais pago/pendente + badge de vencidos
function GrupoCategoria({ catKey, label, itens, tipo, onDelete, onSaved }) {
  const [expanded, setExpanded] = useState(true);

  // ── Totalizadores calculados sobre os itens do grupo ───────────────────
  const hoje  = new Date().toISOString().split("T")[0];
  const total = itens.reduce((s, i) => s + i.valor, 0);

  const totalPago = itens
    .filter(i => !!i.data_pagamento)
    .reduce((s, i) => s + i.valor, 0);

  const totalPendente = itens
    .filter(i => !i.data_pagamento)
    .reduce((s, i) => s + i.valor, 0);

  const qtdVencidos = itens.filter(
    i => !i.data_pagamento && !!i.data_vencimento && i.data_vencimento < hoje
  ).length;

  const temPagos    = totalPago    > 0;
  const temPendente = totalPendente > 0;

  return (
    <div className="space-y-1.5">
      {/* ── Cabeçalho do grupo ── */}
      <button
        className="w-full flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded-lg transition-colors group"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Esquerda: label + badge vencidos */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider truncate">
            {label}
          </span>
          <span className="text-[11px] text-gray-400">
            {itens.length} {itens.length === 1 ? "item" : "itens"}
          </span>
          {qtdVencidos > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full">
              ⚠️ {qtdVencidos} vencido{qtdVencidos > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Direita: subtotais + total bruto + chevron */}
        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
          {/* Subtotais pago/pendente — visíveis quando há mix */}
          {temPagos && temPendente && (
            <div className="hidden sm:flex items-center gap-2 text-[11px]">
              <span className="text-green-600 font-medium">
                ✅ {formatCurrency(totalPago)}
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-amber-600 font-medium">
                ⏳ {formatCurrency(totalPendente)}
              </span>
            </div>
          )}
          {/* Só pagos */}
          {temPagos && !temPendente && (
            <span className="hidden sm:inline text-[11px] text-green-600 font-medium">
              ✅ tudo pago
            </span>
          )}
          {/* Só pendentes */}
          {!temPagos && temPendente && qtdVencidos > 0 && (
            <span className="hidden sm:inline text-[11px] text-red-600 font-medium">
              tudo vencido
            </span>
          )}

          {/* Total bruto */}
          <span className={`text-xs font-bold ${
            tipo === "receita" ? "text-green-700" : "text-red-700"
          }`}>
            {formatCurrency(total)}
          </span>

          {expanded
            ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            : <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />}
        </div>
      </button>

      {/* ── Lista de lançamentos ── */}
      {expanded && (
        <div className="space-y-1.5 pl-1">
          {itens.map(item => (
            <LancamentoRow key={item.id} item={item} onDelete={onDelete} onSaved={onSaved} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PAINEL DE ANÁLISE ────────────────────────────────────────────────────────
function PainelAnalise({ lancamentos, tecnicosCount, horasMes }) {
  const receitas = lancamentos.filter(l => l.tipo === "receita");
  const despesas = lancamentos.filter(l => l.tipo === "despesa");

  const totalReceita  = receitas.reduce((s, l) => s + l.valor, 0);
  const totalTcmp2    = despesas.filter(l => l.entra_tcmp2).reduce((s, l) => s + l.valor, 0);
  const totalNaoTcmp2 = despesas.filter(l => !l.entra_tcmp2 && l.categoria !== "pecas_estoque").reduce((s, l) => s + l.valor, 0);
  const custoPecas    = despesas.filter(l => l.categoria === "pecas_estoque").reduce((s, l) => s + l.valor, 0);
  const receitaPecas  = receitas.filter(l => l.categoria === "pecas_aplicadas").reduce((s, l) => s + l.valor, 0);
  const receitaServicos = receitas.filter(l => l.categoria === "servicos").reduce((s, l) => s + l.valor, 0);

  const lucro      = totalReceita - totalTcmp2 - totalNaoTcmp2 - custoPecas;
  const margemLucro = totalReceita > 0 ? (lucro / totalReceita) * 100 : 0;
  const totalHoras = (tecnicosCount || 1) * (horasMes || 219);
  const tcmp2      = totalHoras > 0 ? totalTcmp2 / totalHoras : 0;
  const r70        = totalReceita > 0 ? ((totalReceita - receitaPecas) / totalReceita) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-3 text-white">
          <p className="text-xs opacity-75">Receita Total</p>
          <p className="text-xl font-bold">{formatCurrency(totalReceita)}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-3 text-white">
          <p className="text-xs opacity-75">TCMP² / hora</p>
          <p className="text-xl font-bold">{formatCurrency(tcmp2)}</p>
          <p className="text-xs opacity-60">{tecnicosCount} téc × {horasMes}h</p>
        </div>
        <div className={`bg-gradient-to-br ${r70 >= 70 ? "from-purple-500 to-pink-600" : "from-orange-500 to-red-600"} rounded-xl p-3 text-white`}>
          <p className="text-xs opacity-75">R70 / I30</p>
          <p className="text-xl font-bold">{r70.toFixed(0)}% / {(100 - r70).toFixed(0)}%</p>
          <p className="text-xs opacity-80">{r70 >= 70 ? "✅ Meta atingida" : "⚠️ Abaixo da meta"}</p>
        </div>
        <div className={`bg-gradient-to-br ${lucro >= 0 ? "from-emerald-500 to-teal-600" : "from-red-500 to-rose-600"} rounded-xl p-3 text-white`}>
          <p className="text-xs opacity-75">Lucro Estimado</p>
          <p className="text-xl font-bold">{formatCurrency(lucro)}</p>
          <p className="text-xs opacity-80">{margemLucro.toFixed(1)}% margem</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-gray-700 mb-3">Demonstrativo de Resultado</p>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Receitas</p>
          {receitas.filter(l => l.categoria === "pecas_aplicadas").length > 0 && (
            <div className="flex items-center justify-between text-sm py-1 pl-2 border-l-2 border-green-500">
              <span className="text-gray-600">Peças Aplicadas</span>
              <span className="font-semibold text-green-700">+ {formatCurrency(receitaPecas)}</span>
            </div>
          )}
          {receitas.filter(l => l.categoria === "servicos").length > 0 && (
            <div className="flex items-center justify-between text-sm py-1 pl-2 border-l-2 border-green-500">
              <span className="text-gray-600">Serviços</span>
              <span className="font-semibold text-green-700">+ {formatCurrency(receitaServicos)}</span>
            </div>
          )}
          {receitas.filter(l => l.categoria === "outras").length > 0 && (
            <div className="flex items-center justify-between text-sm py-1 pl-2 border-l-2 border-green-500">
              <span className="text-gray-600">Outras Receitas</span>
              <span className="font-semibold text-green-700">+ {formatCurrency(totalReceita - receitaPecas - receitaServicos)}</span>
            </div>
          )}
        </div>
        <div className="space-y-1 mt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Despesas por Categoria</p>
          {(() => {
            const catsDespesas = despesas.reduce((acc, d) => {
              if (!acc[d.categoria]) acc[d.categoria] = { label: CATEGORIAS_DESPESA[d.categoria]?.label ?? d.categoria, valor: 0, entra_tcmp2: d.entra_tcmp2 };
              acc[d.categoria].valor += d.valor;
              return acc;
            }, {});
            return ["operacional","pessoas","marketing","manutencao","terceirizados","administrativo","tecnologia","juridico","financeiro","pecas_estoque"]
              .filter(cat => catsDespesas[cat] && catsDespesas[cat].valor > 0)
              .map(cat => (
                <div key={cat} className={`flex items-center justify-between text-sm py-1 pl-2 border-l-2 ${catsDespesas[cat].entra_tcmp2 ? "border-blue-500" : "border-orange-500"}`}>
                  <span className="text-gray-600">{catsDespesas[cat].label}</span>
                  <span className={`font-semibold ${catsDespesas[cat].entra_tcmp2 ? "text-blue-700" : "text-orange-700"}`}>- {formatCurrency(catsDespesas[cat].valor)}</span>
                </div>
              ));
          })()}
        </div>
        <div className="space-y-1 mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm py-1">
            <span className="text-gray-600 font-medium">Total TCMP²</span>
            <span className="font-semibold text-blue-700">- {formatCurrency(totalTcmp2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm py-1">
            <span className="text-gray-600 font-medium">Total Não-TCMP²</span>
            <span className="font-semibold text-orange-700">- {formatCurrency(totalNaoTcmp2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm py-1">
            <span className="text-gray-600 font-medium">Peças / Estoque</span>
            <span className="font-semibold text-purple-700">- {formatCurrency(custoPecas)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-3 border-t-2 border-gray-300 mt-2">
          <span className="font-bold text-gray-800">= Lucro Líquido</span>
          <span className={lucro >= 0 ? "font-bold text-lg text-emerald-700" : "font-bold text-lg text-red-700"}>
            {formatCurrency(lucro)} ({margemLucro.toFixed(1)}%)
          </span>
        </div>
      </div>

      {totalReceita > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">Mix de Receita</p>
          <div className="flex gap-0.5 h-5 rounded-full overflow-hidden">
            <div className="bg-green-500 transition-all" style={{ width: ((receitaPecas / totalReceita) * 100) + "%" }} />
            <div className="bg-emerald-400 transition-all" style={{ width: ((receitaServicos / totalReceita) * 100) + "%" }} />
            <div className="bg-cyan-400 transition-all" style={{ width: (((totalReceita - receitaPecas - receitaServicos) / totalReceita) * 100) + "%" }} />
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-500 inline-block" /> Peças: {((receitaPecas / totalReceita) * 100).toFixed(0)}%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-400 inline-block" /> Serviços: {((receitaServicos / totalReceita) * 100).toFixed(0)}%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-cyan-400 inline-block" /> Outros: {(((totalReceita - receitaPecas - receitaServicos) / totalReceita) * 100).toFixed(0)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function DREAvancadoTab({ workshopId, mes, tecnicosCount, horasMes, onConsolidar }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(null);
  const [showTransferencia, setShowTransferencia] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState("todos");
  const [periodo, setPeriodo] = useState("mensal");

  const mesAtual = mes ? mes.split('-')[1] : "01";
  const anoAtual = mes ? parseInt(mes.split('-')[0]) : new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  useEffect(() => { setAno(anoAtual); }, [anoAtual]);

  const { data: dadosAnuais, isLoading: isLoadingAnual } = useQuery({
    queryKey: ["dre-anual", workshopId, ano],
    queryFn: () => base44.functions.invoke('getDREDataAnual', { workshop_id: workshopId, ano: String(ano) }),
    enabled: periodo === "anual" && !!workshopId && !!ano
  });

  const { data: fontesDinheiro } = useFontesDinheiro(workshopId, mes);
  const totalContas = (fontesDinheiro?.bancos?.length ?? 0)
    + (fontesDinheiro?.maquinas_cartao?.length ?? 0)
    + ((fontesDinheiro?.caixa ?? 0) > 0 ? 1 : 0);
  const podeTransferir = totalContas >= 2;

  const { data: lancamentos = [], isLoading, refetch } = useQuery({
    queryKey: ["dre-lancamentos", workshopId, mes],
    queryFn: () => base44.entities.DRELancamento.filter({ workshop_id: workshopId, mes }, "-created_date", 200),
    enabled: periodo === "mensal" && !!workshopId && !!mes
  });

  useEffect(() => {
    if (!workshopId) return;
    const unsubscribe = base44.entities.DRELancamento.subscribe((event) => {
      if (event.data?.workshop_id !== workshopId) return;
      if (event.type !== 'create' && event.type !== 'delete' && event.type !== 'update') return;
      const eventoMes = event.data?.mes || "";
      if (periodo === "mensal" && eventoMes === mes) refetch();
      else if (periodo === "anual" && eventoMes.startsWith(String(ano))) queryClient.invalidateQueries({ queryKey: ["dre-anual", workshopId, ano] });
    });
    return unsubscribe;
  }, [workshopId, mes, ano, periodo, refetch, queryClient]);

  const refresh = () => refetch();

  const totaisConsolidados = useMemo(() => {
    const receitas = lancamentos.filter(l => l.tipo === "receita");
    const despesas = lancamentos.filter(l => l.tipo === "despesa");
    return {
      revenue: {
        parts_applied: receitas.filter(l => l.categoria === "pecas_aplicadas").reduce((s, l) => s + l.valor, 0),
        services:      receitas.filter(l => l.categoria === "servicos").reduce((s, l) => s + l.valor, 0),
        other:         receitas.filter(l => l.categoria === "outras").reduce((s, l) => s + l.valor, 0),
      },
      costs_tcmp2: {
        operational: despesas.filter(l => l.categoria === "operacional").reduce((s, l) => s + l.valor, 0),
        people:      despesas.filter(l => l.categoria === "pessoas" && l.subcategoria !== "Pró-labore sócios").reduce((s, l) => s + l.valor, 0),
        prolabore:   despesas.filter(l => l.subcategoria === "Pró-labore sócios").reduce((s, l) => s + l.valor, 0),
        marketing:   despesas.filter(l => l.categoria === "marketing").reduce((s, l) => s + l.valor, 0),
        maintenance: despesas.filter(l => l.categoria === "manutencao").reduce((s, l) => s + l.valor, 0),
        third_party: despesas.filter(l => l.categoria === "terceirizados").reduce((s, l) => s + l.valor, 0),
        administrative: despesas.filter(l => l.categoria === "administrativo").reduce((s, l) => s + l.valor, 0),
      },
      costs_not_tcmp2: {
        financing: despesas.filter(l => l.categoria === "financeiro" && l.subcategoria === "Financiamento (veículo/imóvel)").reduce((s, l) => s + l.valor, 0),
        consortium: despesas.filter(l => l.subcategoria === "Consórcio").reduce((s, l) => s + l.valor, 0),
        equipment_installments: despesas.filter(l => l.subcategoria === "Parcelamento de equipamento").reduce((s, l) => s + l.valor, 0),
        parts_invoices: 0,
        legal_processes: despesas.filter(l => l.subcategoria === "Processos judiciais").reduce((s, l) => s + l.valor, 0),
        land_purchase: despesas.filter(l => l.subcategoria === "Compra de imóvel/terreno").reduce((s, l) => s + l.valor, 0),
        investments: despesas.filter(l => l.categoria === "financeiro" && !["Financiamento (veículo/imóvel)","Consórcio","Parcelamento de equipamento","Processos judiciais","Compra de imóvel/terreno"].includes(l.subcategoria)).reduce((s, l) => s + l.valor, 0),
      },
      parts_cost: {
        parts_applied_cost: 0,
        parts_stock_purchase: despesas.filter(l => l.categoria === "pecas_estoque").reduce((s, l) => s + l.valor, 0),
      }
    };
  }, [lancamentos]);

  const grupos = useMemo(() => {
    const filtrados = abaAtiva === "receitas" ? lancamentos.filter(l => l.tipo === "receita")
      : abaAtiva === "despesas" ? lancamentos.filter(l => l.tipo === "despesa")
      : lancamentos;
    return filtrados.reduce((acc, item) => {
      const key = item.tipo + "_" + item.categoria;
      if (!acc[key]) {
        const cats = item.tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
        acc[key] = { label: cats[item.categoria]?.label ?? item.categoria, tipo: item.tipo, itens: [], catKey: item.categoria };
      }
      acc[key].itens.push(item);
      return acc;
    }, {});
  }, [lancamentos, abaAtiva]);

  const totalReceitas = lancamentos.filter(l => l.tipo === "receita").reduce((s, l) => s + l.valor, 0);
  const totalDespesas = lancamentos.filter(l => l.tipo === "despesa").reduce((s, l) => s + l.valor, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
        <BarChart3 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800">
          <strong>Modo Avançado:</strong> Lance cada receita e despesa individualmente. O sistema classifica automaticamente se entra no TCMP² e calcula sua margem. Ao finalizar, clique em <strong>"Consolidar no DRE"</strong> para aplicar os totais.
        </p>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <FiltroPeriodo
          mes={mesAtual} ano={anoAtual} periodo={periodo}
          onMesChange={(novoMes) => {
            const novaData = `${anoAtual}-${novoMes}`;
            window.dispatchEvent(new CustomEvent('dre-mudar-mes', { detail: { mes: novaData } }));
          }}
          onAnoChange={(novoAno) => {
            const novoAnoInt = parseInt(novoAno);
            setAno(novoAnoInt);
            if (periodo === "mensal") window.dispatchEvent(new CustomEvent('dre-mudar-mes', { detail: { mes: `${novoAnoInt}-${mesAtual}` } }));
          }}
          onPeriodoChange={(novoPeriodo) => setPeriodo(novoPeriodo)}
        />
      </div>

      {periodo === "anual" ? (
        <div className="space-y-6">
          {isLoadingAnual ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : (dadosAnuais?.data ?? dadosAnuais)?.total_anual ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                  <CardHeader className="pb-2"><CardTitle className="text-xs opacity-75">Receita Total Anual</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency((dadosAnuais?.data ?? dadosAnuais).total_anual.receitas)}</p>
                    <p className="text-xs opacity-80 mt-1">Média mensal: {formatCurrency((dadosAnuais?.data ?? dadosAnuais).media_mensal.receitas)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  <CardHeader className="pb-2"><CardTitle className="text-xs opacity-75">Despesas Totais</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency((dadosAnuais?.data ?? dadosAnuais).total_anual.despesas)}</p>
                    <p className="text-xs opacity-80 mt-1">Média mensal: {formatCurrency((dadosAnuais?.data ?? dadosAnuais).media_mensal.despesas)}</p>
                  </CardContent>
                </Card>
                <Card className={`bg-gradient-to-br ${(dadosAnuais?.data ?? dadosAnuais).total_anual.lucro >= 0 ? "from-emerald-500 to-teal-600" : "from-red-500 to-rose-600"} text-white`}>
                  <CardHeader className="pb-2"><CardTitle className="text-xs opacity-75">Lucro Anual</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency((dadosAnuais?.data ?? dadosAnuais).total_anual.lucro)}</p>
                    <p className="text-xs opacity-80 mt-1">Margem: {(dadosAnuais?.data ?? dadosAnuais).total_anual.margem.toFixed(1)}%</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                  <CardHeader className="pb-2"><CardTitle className="text-xs opacity-75">Total Lançamentos</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{(dadosAnuais?.data ?? dadosAnuais).total_lancamentos}</p>
                    <p className="text-xs opacity-80 mt-1">em {(dadosAnuais?.data ?? dadosAnuais).meses.filter(m => m.receitas > 0 || m.despesas > 0).length} meses</p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader><CardTitle className="text-sm">📊 Evolução Mensal - {ano}</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(dadosAnuais?.data ?? dadosAnuais).meses}>
                        <XAxis dataKey="mes_nome" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ fontSize: '12px' }} />
                        <Legend />
                        <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[4,4,0,0]} />
                        <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4,4,0,0]} />
                        <Bar dataKey="lucro"    name="Lucro"    fill="#3b82f6" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">📋 Totais por Categoria - {ano}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(dadosAnuais?.data ?? dadosAnuais).categorias.map((cat) => (
                      <div key={cat.categoria} className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cat.tipo === "receita" ? "border-green-300 text-green-700" : "border-red-300 text-red-700"}>
                            {cat.tipo === "receita" ? "💰" : "📉"} {cat.label}
                          </Badge>
                          {!cat.entra_tcmp2 && cat.tipo === "despesa" && <span className="text-xs text-orange-600">🚫 Fora TCMP²</span>}
                        </div>
                        <span className={`font-bold ${cat.tipo === "receita" ? "text-green-700" : "text-red-700"}`}>
                          {cat.tipo === "receita" ? "+" : "-"} {formatCurrency(cat.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[
              { key: "todos",    label: "📋 Todos" },
              { key: "receitas", label: "💰 Receitas (" + formatCurrency(totalReceitas) + ")" },
              { key: "despesas", label: "📉 Despesas (" + formatCurrency(totalDespesas) + ")" },
              { key: "analise",  label: "📊 Análise" },
            ].map(tab => (
              <button key={tab.key} onClick={() => setAbaAtiva(tab.key)}
                className={"flex-1 text-xs py-1.5 px-2 rounded-md transition-all font-medium " + (abaAtiva === tab.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700")}>
                {tab.label}
              </button>
            ))}
          </div>

          {abaAtiva === "analise" ? (
            <PainelAnalise lancamentos={lancamentos} tecnicosCount={tecnicosCount} horasMes={horasMes} />
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                {(abaAtiva === "todos" || abaAtiva === "receitas") && (
                  <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-50"
                    onClick={() => setShowForm(showForm === "receita" ? null : "receita")}>
                    <ArrowUpCircle className="w-4 h-4 mr-1" /> + Receita
                  </Button>
                )}
                {(abaAtiva === "todos" || abaAtiva === "despesas") && (
                  <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50"
                    onClick={() => setShowForm(showForm === "despesa" ? null : "despesa")}>
                    <ArrowDownCircle className="w-4 h-4 mr-1" /> + Despesa
                  </Button>
                )}
                <div className="relative group"
                  title={!podeTransferir ? `Cadastre pelo menos 2 contas no Saldo Inicial do DFC (atual: ${totalContas})` : undefined}>
                  <Button size="sm" variant="outline"
                    className={`border-blue-300 transition-all ${podeTransferir ? 'text-blue-700 hover:bg-blue-50 cursor-pointer' : 'text-blue-300 border-blue-200 opacity-50 cursor-not-allowed'}`}
                    onClick={() => podeTransferir && setShowTransferencia(true)} disabled={false}>
                    <ArrowLeftRight className="w-4 h-4 mr-1" /> Transferir entre Contas
                  </Button>
                  {!podeTransferir && (
                    <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 rounded-lg bg-gray-900 text-white text-xs px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <p className="font-semibold mb-0.5">Contas insuficientes</p>
                      <p>Cadastre pelo menos <strong>2 contas</strong> no Saldo Inicial do DFC para habilitar.</p>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                    </div>
                  )}
                </div>
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="outline" onClick={refresh}><RefreshCw className="w-4 h-4" /></Button>
                  {lancamentos.length > 0 && onConsolidar && (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onConsolidar(totaisConsolidados)}>
                      <TrendingUp className="w-4 h-4 mr-1" /> Consolidar no DRE
                    </Button>
                  )}
                </div>
              </div>

              {showForm && (
                <FormLancamento tipo={showForm} workshopId={workshopId} mes={mes}
                  onSuccess={() => { refresh(); setShowForm(null); }}
                  onCancel={() => setShowForm(null)} />
              )}

              {Object.keys(grupos).length === 0 ? (
                <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                  <Plus className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum lançamento ainda.</p>
                  <p className="text-xs">Clique em "+ Receita" ou "+ Despesa" para começar.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(grupos).map(([key, grupo]) => (
                    <GrupoCategoria key={key} catKey={grupo.catKey} label={grupo.label}
                      itens={grupo.itens} tipo={grupo.tipo} onDelete={refresh} onSaved={refresh} />
                  ))}
                </div>
              )}
            </>
          )}

          {abaAtiva !== "analise" && lancamentos.some(l => l.tipo === "despesa") && (
            <div className="flex gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" /> Entra no TCMP²</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" /> Fora do TCMP²</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" /> Receita</span>
            </div>
          )}
        </div>
      )}

      <ModalTransferenciaContas aberto={showTransferencia} onFechar={() => setShowTransferencia(false)}
        workshopId={workshopId} onSucesso={() => setShowTransferencia(false)} />
    </div>
  );
}