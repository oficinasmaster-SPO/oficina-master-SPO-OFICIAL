import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Repeat2 } from "lucide-react";

export default function ConfiguracaoRecorrencia({ 
  frequencia, 
  dataInicio, 
  dataFim, 
  numeroParcelas,
  onChange 
}) {
  const [tipoTermino, setTipoTermino] = useState('parcelas'); // 'parcelas' | 'data_fim'

  useEffect(() => {
    if (dataFim) {
      setTipoTermino('data_fim');
    }
  }, [dataFim]);

  if (frequencia === 'unico' || !frequencia) {
    return null;
  }

  const calcularPreview = () => {
    if (!dataInicio) return null;

    const inicio = new Date(dataInicio);
    const qtd = numeroParcelas || 1;
    
    let periodo = '';
    switch (frequencia) {
      case 'mensal': periodo = 'mês(es)'; break;
      case 'quinzenal': periodo = 'quinzena(s)'; break;
      case 'semanal': periodo = 'semana(s)'; break;
      case 'anual': periodo = 'ano(s)'; break;
    }

    const fim = new Date(inicio);
    switch (frequencia) {
      case 'mensal': fim.setMonth(fim.getMonth() + qtd - 1); break;
      case 'quinzenal': fim.setDate(fim.getDate() + (qtd * 15)); break;
      case 'semanal': fim.setDate(fim.getDate() + (qtd * 7)); break;
      case 'anual': fim.setFullYear(fim.getFullYear() + qtd - 1); break;
    }

    const mesInicio = inicio.toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
    const mesFim = fim.toLocaleString('pt-BR', { month: 'short', year: 'numeric' });

    return `Serão criados ${qtd} lançamento${qtd > 1 ? 's' : ''} de ${mesInicio} a ${mesFim}`;
  };

  const preview = calcularPreview();

  return (
    <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-2">
        <Repeat2 className="w-5 h-5 text-blue-600" />
        <h4 className="font-semibold text-blue-900">Configurar Recorrência</h4>
      </div>

      {/* Data de Início */}
      <div>
        <Label className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Data de Início
        </Label>
        <Input
          type="date"
          value={dataInicio}
          onChange={(e) => onChange({ data_inicio: e.target.value })}
          className="mt-1"
        />
      </div>

      {/* Tipo de Término */}
      <div>
        <Label>Término</Label>
        <RadioGroup
          value={tipoTermino}
          onValueChange={(value) => {
            setTipoTermino(value);
            if (value === 'parcelas') {
              onChange({ data_fim: null, numero_parcelas: numeroParcelas || 12 });
            } else {
              onChange({ numero_parcelas: null, data_fim: dataFim || dataInicio });
            }
          }}
          className="mt-2"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="parcelas" id="parcelas" />
            <Label htmlFor="parcelas" className="cursor-pointer">
              Número de parcelas</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="data_fim" id="data_fim" />
            <Label htmlFor="data_fim" className="cursor-pointer">
              Data final específica
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Campo Condicional */}
      {tipoTermino === 'parcelas' ? (
        <div>
          <Label>Número de Parcelas</Label>
          <Input
            type="number"
            min="1"
            max="60"
            value={numeroParcelas || 12}
            onChange={(e) => onChange({ numero_parcelas: parseInt(e.target.value) || 1 })}
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">Máximo: 60 parcelas (5 anos)</p>
        </div>
      ) : (
        <div>
          <Label>Data Final</Label>
          <Input
            type="date"
            value={dataFim}
            min={dataInicio}
            onChange={(e) => onChange({ data_fim: e.target.value })}
            className="mt-1"
          />
        </div>
      )}

      {/* Preview */}
      {preview && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800 font-medium">
            💡 {preview}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}