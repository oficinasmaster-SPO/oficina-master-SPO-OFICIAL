import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Download } from "lucide-react";

const maturidadeLevels = [
  { nivel: 0, label: "Inexistente", color: "bg-gray-500" },
  { nivel: 1, label: "Inicial", color: "bg-red-500" },
  { nivel: 2, label: "Documentado", color: "bg-orange-500" },
  { nivel: 3, label: "Implementado", color: "bg-yellow-500" },
  { nivel: 4, label: "Gerenciado", color: "bg-blue-500" },
  { nivel: 5, label: "Otimizado", color: "bg-green-500" }
];

export default function ReportPreview({ open, onClose, formData, onGenerate }) {
  const selectedLevel = maturidadeLevels.find(l => l.nivel === formData.nivel_maturidade);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" />
            Preview do Relatório
          </DialogTitle>
        </DialogHeader>

        <div className="bg-white border rounded-lg p-6 space-y-6 mt-4">
          {/* Header */}
          <div className="bg-red-600 text-white p-4 rounded-lg text-center">
            <h1 className="text-xl font-bold">RELATÓRIO DE IMPLEMENTAÇÃO ESTRUTURADA</h1>
            <p className="text-sm opacity-90">Oficinas Master</p>
          </div>

          {/* Info Básica */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Empresa:</strong> {formData.empresa || '-'}</div>
            <div><strong>Unidade/Área:</strong> {formData.unidade_area || '-'}</div>
            <div><strong>Data:</strong> {formatDate(formData.data)}</div>
            <div><strong>Local:</strong> {formData.local || '-'}</div>
            <div><strong>Horário:</strong> {formData.horario_inicio} - {formData.horario_termino || '...'}</div>
          </div>

          {/* Normas */}
          {formData.normas_om.length > 0 && (
            <div>
              <strong className="text-sm">Normas OM:</strong>
              <div className="flex flex-wrap gap-1 mt-1">
                {formData.normas_om.map(n => (
                  <Badge key={n} variant="outline">{n}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Participantes */}
          {formData.participantes.length > 0 && (
            <div>
              <h3 className="font-bold text-sm border-b pb-1 mb-2">PARTICIPANTES</h3>
              <div className="text-sm space-y-1">
                {formData.participantes.map((p, i) => (
                  <div key={i}>{p.nome} - {p.cargo} ({p.empresa})</div>
                ))}
              </div>
            </div>
          )}

          {/* Objetivo */}
          <div>
            <h3 className="font-bold text-sm border-b pb-1 mb-2">OBJETIVO</h3>
            <p className="text-sm">{formData.objetivo_consultoria || 'Não informado'}</p>
          </div>

          {/* Diagnóstico */}
          <div>
            <h3 className="font-bold text-sm border-b pb-1 mb-2">DIAGNÓSTICO</h3>
            <p className="text-sm whitespace-pre-line">{formData.pontos_conformes || 'Não informado'}</p>
            
            {formData.nao_conformidades.length > 0 && (
              <div className="mt-3">
                <strong className="text-sm text-red-600">Não Conformidades:</strong>
                <ul className="list-disc list-inside text-sm mt-1">
                  {formData.nao_conformidades.map((nc, i) => (
                    <li key={i}>
                      <span className={`${
                        nc.severidade === 'critica' ? 'text-red-700' :
                        nc.severidade === 'maior' ? 'text-orange-600' : 'text-yellow-600'
                      }`}>
                        {nc.descricao}
                      </span>
                      {nc.requisito_om && ` (${nc.requisito_om})`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Plano de Ação */}
          {formData.plano_acao.length > 0 && (
            <div>
              <h3 className="font-bold text-sm border-b pb-1 mb-2">PLANO DE AÇÃO</h3>
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-1">Nº</th>
                    <th className="border p-1">Ação</th>
                    <th className="border p-1">Responsável</th>
                    <th className="border p-1">Prazo</th>
                    <th className="border p-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.plano_acao.map((a, i) => (
                    <tr key={i}>
                      <td className="border p-1 text-center">{a.numero}</td>
                      <td className="border p-1">{a.acao}</td>
                      <td className="border p-1">{a.responsavel}</td>
                      <td className="border p-1">{formatDate(a.prazo)}</td>
                      <td className="border p-1">{a.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Conclusão */}
          <div>
            <h3 className="font-bold text-sm border-b pb-1 mb-2">CONCLUSÃO</h3>
            <p className="text-sm whitespace-pre-line">{formData.conclusao || 'Não informado'}</p>
          </div>

          {/* Maturidade */}
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm">Nível de Maturidade:</span>
            <Badge className={`${selectedLevel?.color} text-white`}>
              Nível {formData.nivel_maturidade} - {selectedLevel?.label}
            </Badge>
          </div>

          {/* Evidências */}
          {formData.evidencias_fotos?.length > 0 && (
            <div>
              <h3 className="font-bold text-sm border-b pb-1 mb-2">EVIDÊNCIAS FOTOGRÁFICAS</h3>
              <div className="grid grid-cols-4 gap-2">
                {formData.evidencias_fotos.slice(0, 8).map((ev, i) => (
                  <img 
                    key={i} 
                    src={ev.url} 
                    alt={`Evidência ${i+1}`}
                    className="w-full h-20 object-cover rounded"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Voltar e Editar
          </Button>
          <Button onClick={onGenerate} className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Download className="w-4 h-4" />
            Gerar PDF Final
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}