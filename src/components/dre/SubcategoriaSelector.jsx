import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * SubcategoriaSelector - Componente de seleção de subcategorias dinâmicas
 * 
 * @param {string} categoria - Categoria selecionada (ex: "operacional", "pessoas")
 * @param {string} workshopId - ID da oficina para carregar subcategorias customizadas
 * @param {string} value - Valor selecionado atual
 * @param {function} onChange - Callback quando valor muda
 * @param {boolean} disabled - Se o select está desabilitado
 */
export default function SubcategoriaSelector({ 
  categoria, 
  workshopId, 
  value, 
  onChange, 
  disabled = false,
  placeholder = "Selecione..."
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Carrega subcategorias globais (workshop_id = null)
  const { data: subcategoriasGlobais = [], isLoading: loadingGlobais } = useQuery({
    queryKey: ["subcategorias-dre", "global", categoria],
    queryFn: () => base44.entities.SubcategoriaDRE.filter({
      categoria,
      workshop_id: null,
      ativo: true
    }, "ordem", 100),
    enabled: !!categoria,
  });

  // Carrega subcategorias customizadas do workshop
  const { data: subcategoriasCustomizadas = [], isLoading: loadingCustom } = useQuery({
    queryKey: ["subcategorias-dre", workshopId, categoria],
    queryFn: () => base44.entities.SubcategoriaDRE.filter({
      categoria,
      workshop_id: workshopId,
      ativo: true
    }, "ordem", 100),
    enabled: !!categoria && !!workshopId,
  });

  // Merge: globais primeiro, depois customizadas
  const todasSubcategorias = React.useMemo(() => {
    const globaisMap = new Map(subcategoriasGlobais.map(s => [s.label, s]));
    const customizadasMap = new Map(subcategoriasCustomizadas.map(s => [s.label, s]));
    
    // Prioriza customizadas, mas inclui globais não duplicadas
    const resultado = [...subcategoriasCustomizadas];
    subcategoriasGlobais.forEach(global => {
      if (!customizadasMap.has(global.label)) {
        resultado.push(global);
      }
    });
    
    return resultado.sort((a, b) => (a.ordem || 999) - (b.ordem || 999));
  }, [subcategoriasGlobais, subcategoriasCustomizadas]);

  const isLoading = loadingGlobais || loadingCustom;

  const handleCriarNova = () => {
    setShowCreateModal(true);
  };

  const handleNovaSubcategoriaCriada = (novaSubcategoria) => {
    toast.success(`Subcategoria "${novaSubcategoria.label}" criada!`);
    onChange(novaSubcategoria.label);
    setShowCreateModal(false);
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <select
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-400"
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          disabled={disabled || isLoading}
        >
          <option value="">{placeholder}</option>
          {todasSubcategorias.map(s => (
            <option key={s.id} value={s.label}>
              {s.label} {s.workshop_id ? "(custom)" : "(global)"}
            </option>
          ))}
        </select>
        
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-blue-300 text-blue-700 hover:bg-blue-50 flex-shrink-0"
          onClick={handleCriarNova}
          disabled={disabled || !categoria}
          title="Criar nova subcategoria"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {isLoading && (
        <div className="absolute right-20 top-1/2 -translate-y-1/2">
          <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
        </div>
      )}

      {/* Modal de Criação */}
      {showCreateModal && (
        <CriarSubcategoriaModal
          categoria={categoria}
          workshopId={workshopId}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleNovaSubcategoriaCriada}
        />
      )}
    </div>
  );
}

// ─── MODAL DE CRIAÇÃO DE SUBCATEGORIA ─────────────────────────────────────────
function CriarSubcategoriaModal({ categoria, workshopId, onClose, onCreated }) {
  const [label, setLabel] = useState("");
  const [ordem, setOrdem] = useState("");
  const [entraTcmp2, setEntraTcmp2] = useState(true);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleSalvar = async () => {
    if (!label.trim()) {
      toast.error("Informe o nome da subcategoria");
      return;
    }

    setSaving(true);
    try {
      const novaSubcategoria = await base44.entities.SubcategoriaDRE.create({
        categoria,
        label: label.trim(),
        workshop_id: workshopId,
        tipo: categoria.startsWith("receita") || ["pecas_aplicadas", "servicos", "outras"].includes(categoria) ? "receita" : "despesa",
        ordem: ordem ? parseInt(ordem) : 999,
        ativo: true,
        entra_tcmp2: entraTcmp2,
      });

      // Invalida cache para que a lista seja atualizada imediatamente
      queryClient.invalidateQueries({ queryKey: ["subcategorias-dre"] });

      onCreated(novaSubcategoria);
    } catch (e) {
      toast.error("Erro ao criar subcategoria");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          ➕ Nova Subcategoria
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Nome *</label>
            <input
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Ex: Assinatura de software"
              value={label}
              onChange={e => setLabel(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Ordem (opcional)</label>
            <input
              type="number"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="999"
              value={ordem}
              onChange={e => setOrdem(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">Menor número = aparece primeiro</p>
          </div>

          {categoria && !["pecas_aplicadas", "servicos", "outras"].includes(categoria) && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="entra-tcmp2"
                checked={entraTcmp2}
                onChange={e => setEntraTcmp2(e.target.checked)}
                className="w-4 h-4 text-blue-600"
              />
              <label htmlFor="entra-tcmp2" className="text-sm text-gray-700">
                Entra no cálculo do TCMP²
              </label>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <Button
            size="sm"
            onClick={handleSalvar}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 flex-1"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            Criar
          </Button>
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}