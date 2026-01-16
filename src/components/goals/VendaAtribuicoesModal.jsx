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
  { value: "gerou_lead", label: "Gerou Lead", equipe: "marketing" },
  { value: "agendou", label: "Agendou Cliente", equipe: "sdr_telemarketing" },
  { value: "vendeu", label: "Vendeu / Fechou", equipe: "comercial_vendas" },
  { value: "atendeu", label: "Atendeu Cliente", equipe: "atendimento" },
  { value: "executou", label: "Executou Serviço", equipe: "tecnico" },
  { value: "apoiou", label: "Apoiou / Suporte", equipe: "outros" }
];

export default function VendaAtribuicoesModal({ 
  open, 
  onClose, 
  valorTotal, 
  valorPecas,
  valorServicos,
  employees, 
  onConfirm 
}) {
  const [atribuicoes, setAtribuicoes] = useState([]);

  useEffect(() => {
    if (open && atribuicoes.length === 0) {
      adicionarAtribuicao();
    }
  }, [open]);

  const adicionarAtribuicao = () => {
    setAtribuicoes([
      ...atribuicoes,
      {
        pessoa_id: "",
        pessoa_nome: "",
        equipe: "marketing",
        papel: "gerou_lead",
        percentual_credito: 0
      }
    ]);
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
      novasAtribuicoes[index].pessoa_nome = emp ? emp.full_name : valor;
    }

    setAtribuicoes(novasAtribuicoes);
  };

  const totalPercentual = atribuicoes.reduce((sum, a) => sum + (parseFloat(a.percentual_credito) || 0), 0);
  const isValid = Math.abs(totalPercentual - 100) < 0.01;

  const handleConfirm = () => {
    if (!isValid) {
      toast.error("A soma dos percentuais deve ser 100%!");
      return;
    }

    const atribuicoesFinais = atribuicoes.map(a => ({
      ...a,
      percentual_credito: parseFloat(a.percentual_credito) / 100,
      valor_credito: valorTotal * (parseFloat(a.percentual_credito) / 100)
    }));

    onConfirm(atribuicoesFinais);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Atribuir Participação na Venda</DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            Distribua o crédito entre as pessoas/equipes que participaram. Total deve somar 100%.
          </p>
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

          {/* Lista de Atribuições */}
          <div className="space-y-3">
            {atribuicoes.map((atrib, index) => (
              <Card key={index} className="bg-white border border-gray-200">
                <CardContent className="p-4">
                  <div className="grid grid-cols-12 gap-3 items-end">
                    {/* Pessoa/Equipe */}
                    <div className="col-span-4">
                      <Label className="text-xs">Pessoa/Equipe</Label>
                      <Select 
                        value={atrib.pessoa_id} 
                        onValueChange={(v) => atualizarAtribuicao(index, "pessoa_id", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
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

                    {/* Papel */}
                    <div className="col-span-3">
                      <Label className="text-xs">Papel</Label>
                      <Select 
                        value={atrib.papel} 
                        onValueChange={(v) => atualizarAtribuicao(index, "papel", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAPEIS_DISPONIVEIS.map(p => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Percentual */}
                    <div className="col-span-2">
                      <Label className="text-xs">% Crédito</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={atrib.percentual_credito}
                        onChange={(e) => atualizarAtribuicao(index, "percentual_credito", e.target.value)}
                        className="font-semibold"
                      />
                    </div>

                    {/* Valor Calculado */}
                    <div className="col-span-2">
                      <Label className="text-xs">Valor R$</Label>
                      <Input
                        value={(valorTotal * (parseFloat(atrib.percentual_credito) || 0) / 100).toFixed(2)}
                        disabled
                        className="bg-gray-100 font-bold"
                      />
                    </div>

                    {/* Deletar */}
                    <div className="col-span-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removerAtribuicao(index)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Adicionar Atribuição */}
          <Button
            variant="outline"
            onClick={adicionarAtribuicao}
            className="w-full border-dashed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Participante
          </Button>

          {/* Status da Soma */}
          <Card className={`border-2 ${isValid ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className={`w-5 h-5 ${isValid ? 'text-green-600' : 'text-red-600'}`} />
                  <p className={`font-semibold ${isValid ? 'text-green-900' : 'text-red-900'}`}>
                    Total: {totalPercentual.toFixed(1)}%
                  </p>
                </div>
                {!isValid && (
                  <p className="text-sm text-red-600">
                    Faltam {(100 - totalPercentual).toFixed(1)}% para completar 100%
                  </p>
                )}
                {isValid && (
                  <p className="text-sm text-green-600 font-semibold">✓ Distribuição correta!</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!isValid || atribuicoes.length === 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Confirmar Atribuições
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}