import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const PAPEIS_DISPONIVEIS = [
  { value: "gerou_lead", label: "🎯 Gerou Lead", equipe: "marketing" },
  { value: "agendou", label: "📞 Agendou Cliente", equipe: "sdr_telemarketing" },
  { value: "vendeu", label: "💰 Vendeu / Fechou", equipe: "comercial_vendas" },
  { value: "atendeu", label: "🤝 Atendeu Cliente", equipe: "atendimento" },
  { value: "executou", label: "🔧 Executou Serviço", equipe: "tecnico" }
];

const EQUIPES_PADRAO = [
  { id: "marketing_team", nome: "Marketing (equipe)", equipe: "marketing" },
  { id: "sdr_team", nome: "SDR/Telemarketing (equipe)", equipe: "sdr_telemarketing" }
];

export default function VendaAtribuicoesModal({ 
  open, 
  onClose, 
  valorTotal, 
  valorPecas,
  valorServicos,
  employees, 
  onConfirm,
  existingAtribuicoes = []
}) {
  const [atribuicoes, setAtribuicoes] = useState([]);

  useEffect(() => {
    if (open) {
      // Se há atribuições existentes, carregá-las
      if (existingAtribuicoes && existingAtribuicoes.length > 0) {
        const atribuicoesCarregadas = existingAtribuicoes.map(a => ({
          pessoa_id: a.pessoa_id,
          pessoa_nome: a.pessoa_nome,
          equipe: a.equipe,
          papel: a.papel,
          percentual_credito: 100,
          valor_credito: valorTotal
        }));
        setAtribuicoes(atribuicoesCarregadas);
      } else {
        // Resetar atribuições se não houver existentes
        setAtribuicoes([]);
      }
    }
  }, [open, existingAtribuicoes, valorTotal]);

  const adicionarAtribuicao = (papelPadrao = null) => {
    const papel = papelPadrao || PAPEIS_DISPONIVEIS[0];
    setAtribuicoes([
      ...atribuicoes,
      {
        pessoa_id: "",
        pessoa_nome: "",
        equipe: papel.equipe,
        papel: papel.value,
        percentual_credito: 100,
        valor_credito: valorTotal
      }
    ]);
  };

  const adicionarPapelRapido = (papel) => {
    adicionarAtribuicao(papel);
  };

  const removerAtribuicao = (index) => {
    setAtribuicoes(atribuicoes.filter((_, i) => i !== index));
  };

  const atualizarAtribuicao = (index, campo, valor) => {
    const novasAtribuicoes = [...atribuicoes];
    novasAtribuicoes[index][campo] = valor;

    if (campo === "papel") {
      const papel = PAPEIS_DISPONIVEIS.find(p => p.value === valor);
      if (papel) {
        novasAtribuicoes[index].equipe = papel.equipe;
      }
    }

    if (campo === "pessoa_id") {
      const emp = employees.find(e => e.id === valor);
      const equipe = EQUIPES_PADRAO.find(e => e.id === valor);
      novasAtribuicoes[index].pessoa_nome = emp ? emp.full_name : (equipe ? equipe.nome : valor);
    }

    // Atualizar valor e percentual dinamicamente
    if (campo === "valor_credito") {
      const percentual = valorTotal > 0 ? (valor / valorTotal) * 100 : 0;
      novasAtribuicoes[index].percentual_credito = percentual;
    }
    
    if (campo === "percentual_credito") {
      novasAtribuicoes[index].valor_credito = (valor / 100) * valorTotal;
    }

    setAtribuicoes(novasAtribuicoes);
  };

  const isValid = atribuicoes.length > 0 && atribuicoes.every(a => a.pessoa_id);

  const handleConfirm = () => {
    if (!isValid) {
      toast.error("Selecione pelo menos uma pessoa para cada etapa!");
      return;
    }

    const atribuicoesFinais = atribuicoes.map(a => ({
      ...a,
      percentual_credito: a.percentual_credito / 100,
      valor_credito: a.valor_credito
    }));

    onConfirm(atribuicoesFinais);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Participantes do Funil de Vendas</DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            Marque QUEM participou desta venda específica. Ajuste o crédito de cada um conforme sua contribuição.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
            <p className="text-xs font-semibold text-blue-900 mb-1">💡 Como funciona:</p>
            <p className="text-xs text-blue-700">
              Faturamento real = R$ {valorTotal.toFixed(2)}. Cada papel é independente - ajuste o valor conforme a participação real de cada um nesta venda.
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo da Venda */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-blue-700">Valor Total</p>
                  <p className="text-lg font-bold text-blue-900">R$ {valorTotal.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-700">Peças</p>
                  <p className="text-lg font-bold text-blue-900">R$ {valorPecas.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-700">Serviços</p>
                  <p className="text-lg font-bold text-blue-900">R$ {valorServicos.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botões Rápidos - Etapas do Funil */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-gray-900 mb-3">🚀 Adicionar Participantes:</p>
              <div className="flex flex-wrap gap-2">
                {PAPEIS_DISPONIVEIS.map(papel => (
                  <Button
                    key={papel.value}
                    size="sm"
                    variant="outline"
                    onClick={() => adicionarPapelRapido(papel)}
                    className="bg-white hover:bg-blue-50"
                  >
                    {papel.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Lista de Participantes */}
          <div className="space-y-3">
            {atribuicoes.map((atrib, index) => {
              const papel = PAPEIS_DISPONIVEIS.find(p => p.value === atrib.papel);
              return (
                <Card key={index} className="bg-white border-l-4 border-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {/* Papel (fixo) */}
                      <div className="flex-shrink-0 bg-blue-100 px-3 py-2 rounded-lg">
                        <p className="text-xs font-semibold text-blue-900">
                          {papel?.label || atrib.papel}
                        </p>
                      </div>

                      {/* Pessoa/Equipe */}
                      <div className="flex-1">
                        <Select 
                          value={atrib.pessoa_id} 
                          onValueChange={(v) => atualizarAtribuicao(index, "pessoa_id", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Quem?" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="marketing_team">🎯 Marketing (equipe)</SelectItem>
                            <SelectItem value="sdr_team">📞 SDR/Telemarketing (equipe)</SelectItem>
                            {employees.map(emp => (
                              <SelectItem key={emp.id} value={emp.id}>
                                👤 {emp.full_name} - {emp.position}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Crédito (editável) */}
                      <div className="flex-shrink-0 bg-green-100 px-3 py-2 rounded-lg">
                        <Label className="text-xs text-green-700 mb-1 block">Crédito R$</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={atrib.valor_credito}
                          onChange={(e) => {
                            const novoValor = parseFloat(e.target.value) || 0;
                            const novoPercentual = valorTotal > 0 ? (novoValor / valorTotal) * 100 : 0;
                            atualizarAtribuicao(index, "valor_credito", novoValor);
                            atualizarAtribuicao(index, "percentual_credito", novoPercentual);
                          }}
                          className="h-8 w-28 font-semibold text-sm"
                        />
                        <p className="text-xs text-green-600 mt-1">
                          {((atrib.valor_credito / valorTotal) * 100).toFixed(1)}%
                        </p>
                      </div>

                      {/* Deletar */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removerAtribuicao(index)}
                        className="text-red-600 hover:bg-red-50 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {atribuicoes.length === 0 && (
              <Card className="bg-yellow-50 border-2 border-yellow-300">
                <CardContent className="p-6 text-center">
                  <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-2" />
                  <p className="text-sm text-yellow-800 font-semibold">
                    Clique nos botões acima para adicionar participantes
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Exemplo: Marketing → SDR → Vendedor → Técnico
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Resumo do Funil */}
          {atribuicoes.length > 0 && (
            <Card className="border-2 border-green-500 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-green-900">
                      ✅ {atribuicoes.length} participante(s) no funil
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Faturamento real: R$ {valorTotal.toFixed(2)} | Crédito total distribuído: R$ {(valorTotal * atribuicoes.length).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-green-700">Crédito médio:</p>
                    <p className="text-lg font-bold text-green-900">
                      {atribuicoes.length > 0 
                        ? ((atribuicoes.reduce((sum, a) => sum + a.valor_credito, 0) / atribuicoes.length / valorTotal) * 100).toFixed(1)
                        : 0}% = R$ {(atribuicoes.reduce((sum, a) => sum + a.valor_credito, 0) / (atribuicoes.length || 1)).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ações */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!isValid}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Salvar Funil de Vendas
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}