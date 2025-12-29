import React from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileCheck, AlertTriangle } from "lucide-react";

export default function ITViewer({ it }) {
  const content = it?.content || {};

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200 print:shadow-none print:border-0">
      {/* Cabeçalho IT/FR - APENAS Metadados */}
      <div className="border-b-2 border-gray-800 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold ${
              it.type === 'IT' ? 'bg-green-600' : 'bg-orange-600'
            }`}>
              {it.type}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{it.title}</h2>
            </div>
          </div>
          <div className="text-right text-sm">
            <p><strong>Código:</strong> {it.code || "N/A"}</p>
            <p><strong>Versão:</strong> {it.version || "1"}</p>
            <p><strong>Status:</strong> <Badge>{it.status || "ativo"}</Badge></p>
          </div>
        </div>
      </div>

      {/* Resumo/Descrição - Seção Separada */}
      {it.description && (
        <div className="bg-blue-50 border-b border-blue-200 p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Resumo do Documento</h4>
          <p className="text-sm text-gray-700 leading-relaxed">{it.description}</p>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* 1. Objetivo */}
        <section>
          <h4 className="font-bold text-gray-900 border-b pb-2 mb-2 uppercase">1. Objetivo</h4>
          <p className="text-gray-700 whitespace-pre-line">{content.objetivo || "Não definido."}</p>
        </section>

        {/* 2. Campo de Aplicação */}
        <section>
          <h4 className="font-bold text-gray-900 border-b pb-2 mb-2 uppercase">2. Campo de Aplicação</h4>
          <p className="text-gray-700 whitespace-pre-line">{content.campo_aplicacao || "Não definido."}</p>
        </section>

        {/* 3. Informações Complementares */}
        {content.informacoes_complementares && (
          <section>
            <h4 className="font-bold text-gray-900 border-b pb-2 mb-2 uppercase">3. Informações Complementares</h4>
            <p className="text-gray-700 whitespace-pre-line">{content.informacoes_complementares}</p>
          </section>
        )}

        {/* 4. Fluxo */}
        <section>
          <h4 className="font-bold text-gray-900 border-b pb-2 mb-2 uppercase">4. Fluxo de Execução</h4>
          {content.fluxo_descricao && (
            <p className="text-gray-700 whitespace-pre-line mb-3">{content.fluxo_descricao}</p>
          )}
          {content.fluxo_image_url && (
            <div className="border rounded-lg p-2 bg-gray-50 flex justify-center">
              <img src={content.fluxo_image_url} alt="Fluxograma" className="max-w-full h-auto max-h-96 object-contain" />
            </div>
          )}
          {!content.fluxo_descricao && !content.fluxo_image_url && (
            <p className="text-gray-500 italic">Fluxo não definido.</p>
          )}
        </section>

        {/* 5. Atividades */}
        <section className="break-inside-avoid">
          <h4 className="font-bold text-gray-900 border-b pb-2 mb-2 uppercase">5. Atividades e Responsabilidades</h4>
          {content.atividades && content.atividades.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-bold">Atividade</TableHead>
                  <TableHead className="font-bold">Responsável</TableHead>
                  <TableHead className="font-bold">Frequência</TableHead>
                  <TableHead className="font-bold">Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {content.atividades.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.atividade}</TableCell>
                    <TableCell>{item.responsavel}</TableCell>
                    <TableCell>{item.frequencia}</TableCell>
                    <TableCell>{item.observacao}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500 italic">Nenhuma atividade definida.</p>
          )}
        </section>

        {/* 6. Matriz de Riscos */}
        <section className="break-inside-avoid">
          <h4 className="font-bold text-gray-900 border-b pb-2 mb-2 uppercase flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            6. Matriz de Riscos Operacionais
          </h4>
          {content.matriz_riscos && content.matriz_riscos.filter(r => r.risco).length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-bold">Risco</TableHead>
                  <TableHead className="font-bold">Categoria</TableHead>
                  <TableHead className="font-bold">Causa</TableHead>
                  <TableHead className="font-bold">Impacto</TableHead>
                  <TableHead className="font-bold">Controle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {content.matriz_riscos.filter(r => r.risco).map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{item.risco}</TableCell>
                    <TableCell>{item.categoria}</TableCell>
                    <TableCell>{item.causa}</TableCell>
                    <TableCell>{item.impacto}</TableCell>
                    <TableCell>{item.controle}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500 italic">Nenhum risco mapeado.</p>
          )}
        </section>

        {/* 7. Inter-relações */}
        {content.inter_relacoes && content.inter_relacoes.length > 0 && (
          <section className="break-inside-avoid">
            <h4 className="font-bold text-gray-900 border-b pb-2 mb-2 uppercase">7. Inter-relação entre Áreas</h4>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-bold">Área</TableHead>
                  <TableHead className="font-bold">Interação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {content.inter_relacoes.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{item.area}</TableCell>
                    <TableCell>{item.interacao}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        )}

        {/* 8. Indicadores */}
        <section className="break-inside-avoid">
          <h4 className="font-bold text-gray-900 border-b pb-2 mb-2 uppercase">8. Indicadores</h4>
          {content.indicadores && content.indicadores.filter(i => i.nome).length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-bold">Nome</TableHead>
                  <TableHead className="font-bold">Fórmula</TableHead>
                  <TableHead className="font-bold">Meta</TableHead>
                  <TableHead className="font-bold">Frequência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {content.indicadores.filter(i => i.nome).map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{item.nome}</TableCell>
                    <TableCell>{item.formula}</TableCell>
                    <TableCell>{item.meta}</TableCell>
                    <TableCell>{item.frequencia}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500 italic">Nenhum indicador definido.</p>
          )}
        </section>

        {/* 9. Evidência de Execução */}
        <section className="break-inside-avoid">
          <h4 className="font-bold text-gray-900 border-b pb-2 mb-2 uppercase flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-green-600" />
            9. Evidência de Execução
          </h4>
          {content.evidencia_execucao?.tipo_evidencia ? (
            <div className="space-y-2">
              <div>
                <span className="font-semibold">Tipo:</span> {content.evidencia_execucao.tipo_evidencia}
              </div>
              {content.evidencia_execucao.descricao && (
                <div>
                  <span className="font-semibold">Descrição:</span>
                  <p className="text-gray-700 mt-1">{content.evidencia_execucao.descricao}</p>
                </div>
              )}
              {content.evidencia_execucao.periodo_retencao && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-2">
                  <span className="font-semibold">Período de Retenção:</span> {
                    content.evidencia_execucao.periodo_retencao.replace('_', ' ').replace('conforme_lei', 'Conforme legislação')
                  }
                  {content.evidencia_execucao.justificativa_retencao && (
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>Justificativa:</strong> {content.evidencia_execucao.justificativa_retencao}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 italic">Evidência não definida.</p>
          )}
        </section>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 p-3 border-t text-center text-xs text-gray-500 print:bg-white">
        Documento gerado pela Oficinas Master - Impresso em {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}