import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function ProcessViewer({ processo, isViewingInManual = false }) {
  const content = processo?.content_json || {};

  return (
    <div className="space-y-6">
      {/* Metadados */}
      <div className="grid grid-cols-3 gap-4 pb-4 border-b">
        <div>
          <span className="text-sm font-semibold text-gray-600">Código:</span>
          <p className="font-mono text-sm">{processo.code || 'N/A'}</p>
        </div>
        <div>
          <span className="text-sm font-semibold text-gray-600">Versão:</span>
          <p className="text-sm">{processo.revision || '1'}</p>
        </div>
        <div>
          <span className="text-sm font-semibold text-gray-600">Categoria:</span>
          <p className="text-sm">{processo.category || 'N/A'}</p>
        </div>
      </div>

      {/* 1. Objetivo */}
      <section>
        <h4 className="font-bold text-gray-900 border-b pb-2 mb-2 uppercase section-title">1. Objetivo</h4>
        <p className="text-gray-700 whitespace-pre-line section-content">{content.objetivo || 'Não definido.'}</p>
      </section>

      {/* 2. Campo de Aplicação */}
      <section>
        <h4 className="font-bold text-gray-900 border-b pb-2 mb-2 uppercase section-title">2. Campo de Aplicação</h4>
        <p className="text-gray-700 whitespace-pre-line section-content">{content.campo_aplicacao || 'Não definido.'}</p>
      </section>

      {/* 3. Informações Complementares */}
      {content.informacoes_complementares && (
        <section>
          <h4 className="font-bold text-gray-900 border-b pb-2 mb-2 uppercase section-title">3. Informações Complementares</h4>
          <p className="text-gray-700 whitespace-pre-line section-content">{content.informacoes_complementares}</p>
        </section>
      )}

      {/* 4. Fluxo do Processo */}
      <section>
        <h4 className="font-bold text-gray-900 border-b pb-2 mb-2 uppercase section-title">4. Fluxo do Processo</h4>
        {content.fluxo_descricao && (
          <p className="text-gray-700 whitespace-pre-line section-content mb-3">{content.fluxo_descricao}</p>
        )}
        {content.fluxo_image_url ? (
          <div className="border rounded-lg p-2 bg-gray-50 flex justify-center">
            <img 
              src={content.fluxo_image_url} 
              alt="Fluxograma do Processo" 
              className="max-w-full h-auto max-h-96 object-contain flowchart-image"
            />
          </div>
        ) : (
          !content.fluxo_descricao && <p className="text-gray-500 italic">Fluxo não definido.</p>
        )}
      </section>

      {/* 5. Atividades e Responsabilidades */}
      {content.atividades && content.atividades.length > 0 && (
        <section className="page-break-inside-avoid">
          <h4 className="font-bold text-gray-900 border-b pb-2 mb-2 uppercase section-title">5. Atividades e Responsabilidades</h4>
          <Table className="print-table">
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="font-bold">Atividade</TableHead>
                <TableHead className="font-bold">Responsável</TableHead>
                <TableHead className="font-bold">Ferramentas/Docs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {content.atividades.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>{item.atividade}</TableCell>
                  <TableCell>{item.responsavel}</TableCell>
                  <TableCell>{item.ferramentas}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      {/* 6. Matriz de Riscos */}
      {content.matriz_riscos && content.matriz_riscos.length > 0 && (
        <section className="page-break-inside-avoid">
          <h4 className="font-bold text-gray-900 border-b pb-2 mb-2 uppercase section-title">6. Matriz de Riscos</h4>
          <Table className="print-table">
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="font-bold">Risco</TableHead>
                <TableHead className="font-bold">Fonte</TableHead>
                <TableHead className="font-bold">Impacto</TableHead>
                <TableHead className="font-bold">Categoria</TableHead>
                <TableHead className="font-bold">Controle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {content.matriz_riscos.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>{item.identificacao}</TableCell>
                  <TableCell>{item.fonte}</TableCell>
                  <TableCell>{item.impacto}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.categoria}</Badge>
                  </TableCell>
                  <TableCell>{item.controle}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      {/* 7. Inter-relação entre Áreas */}
      {content.inter_relacoes && content.inter_relacoes.length > 0 && (
        <section className="page-break-inside-avoid">
          <h4 className="font-bold text-gray-900 border-b pb-2 mb-2 uppercase section-title">7. Inter-relação entre Áreas</h4>
          <Table className="print-table">
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

      {/* 8. Indicadores de Desempenho */}
      {content.indicadores && content.indicadores.length > 0 && (
        <section className="page-break-inside-avoid">
          <h4 className="font-bold text-gray-900 border-b pb-2 mb-2 uppercase section-title">8. Indicadores de Desempenho</h4>
          <Table className="print-table">
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="font-bold">Indicador</TableHead>
                <TableHead className="font-bold">Meta</TableHead>
                <TableHead className="font-bold">Como Medir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {content.indicadores.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{item.indicador}</TableCell>
                  <TableCell>{item.meta}</TableCell>
                  <TableCell>{item.como_medir}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}
    </div>
  );
}