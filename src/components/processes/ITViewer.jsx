import React from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileCheck, AlertTriangle } from "lucide-react";

export default function ITViewer({ it, mapDoc, workshop }) {
  const content = it?.content || {};

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200 print:shadow-none print:border-0">
      {/* Header Institucional Padronizado */}
      <div className="border-b-2 border-gray-800 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo Oficinas Master */}
            <div className="w-16 h-16 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              OM
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 uppercase">
                {it.type === 'IT' ? 'Instrução de Trabalho' : 'Formulário/Registro'}
              </h1>
              <h2 className="text-lg text-gray-600">{it.title}</h2>
              {it.description && (
                <p className="text-sm text-gray-500 mt-1">{it.description}</p>
              )}
            </div>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p><strong>Código:</strong> {it.code || "N/A"}</p>
            <p><strong>Versão:</strong> {it.version || "1"}</p>
            {mapDoc && (
              <p><strong>MAP Pai:</strong> {mapDoc.code}</p>
            )}
            {mapDoc && (
              <p><strong>Área:</strong> {mapDoc.category}</p>
            )}
            <Badge 
              variant={it.status === 'ativo' ? 'default' : 'secondary'} 
              className="mt-1"
            >
              {it.status || 'ativo'}
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* 1. Objetivo */}
        <section>
          <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-3 uppercase">
            1. Objetivo
          </h3>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
            {content.objetivo || "Não definido."}
          </p>
        </section>

        {/* 2. Campo de Aplicação */}
        <section>
          <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-3 uppercase">
            2. Campo de Aplicação
          </h3>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
            {content.campo_aplicacao || "Não definido."}
          </p>
        </section>

        {/* 3. Informações Complementares */}
        {content.informacoes_complementares && (
          <section>
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-3 uppercase">
              3. Informações Complementares
            </h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {content.informacoes_complementares}
            </p>
          </section>
        )}

        {/* 4. Fluxo de Execução */}
        <section>
          <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-3 uppercase">
            4. Fluxo de Execução
          </h3>
          {content.fluxo_descricao && (
            <p className="text-gray-700 leading-relaxed whitespace-pre-line mb-4">
              {content.fluxo_descricao}
            </p>
          )}
          {content.fluxo_image_url ? (
            <div className="border rounded-lg p-2 bg-gray-50 flex justify-center">
              <img 
                src={content.fluxo_image_url} 
                alt="Fluxograma" 
                className="max-w-full h-auto max-h-[600px] object-contain" 
              />
            </div>
          ) : (
            <p className="text-gray-500 italic">Fluxo não definido.</p>
          )}
        </section>

        {/* 5. Atividades e Responsabilidades */}
        <section className="break-inside-avoid">
          <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-3 uppercase">
            5. Atividades e Responsabilidades
          </h3>
          {content.atividades && content.atividades.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-bold text-gray-900">Atividade</TableHead>
                  <TableHead className="font-bold text-gray-900">Responsável</TableHead>
                  <TableHead className="font-bold text-gray-900">Frequência</TableHead>
                  <TableHead className="font-bold text-gray-900">Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {content.atividades.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="align-top">{item.atividade}</TableCell>
                    <TableCell className="align-top">{item.responsavel}</TableCell>
                    <TableCell className="align-top">{item.frequencia}</TableCell>
                    <TableCell className="align-top">{item.observacao}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500 italic">Nenhuma atividade definida.</p>
          )}
        </section>

        {/* 6. Matriz de Riscos Operacionais */}
        <section className="break-inside-avoid">
          <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-3 uppercase flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            6. Matriz de Riscos Operacionais
          </h3>
          {content.matriz_riscos && content.matriz_riscos.filter(r => r.risco).length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-bold text-gray-900">Risco</TableHead>
                  <TableHead className="font-bold text-gray-900">Categoria</TableHead>
                  <TableHead className="font-bold text-gray-900">Causa</TableHead>
                  <TableHead className="font-bold text-gray-900">Impacto</TableHead>
                  <TableHead className="font-bold text-gray-900">Controle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {content.matriz_riscos.filter(r => r.risco).map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium align-top">{item.risco}</TableCell>
                    <TableCell className="align-top">{item.categoria}</TableCell>
                    <TableCell className="align-top">{item.causa}</TableCell>
                    <TableCell className="align-top">{item.impacto}</TableCell>
                    <TableCell className="align-top">{item.controle}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500 italic">Nenhum risco mapeado.</p>
          )}
        </section>

        {/* 7. Inter-relação entre Áreas */}
        {content.inter_relacoes && content.inter_relacoes.length > 0 && (
          <section className="break-inside-avoid">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-3 uppercase">
              7. Inter-relação entre Áreas
            </h3>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="w-[30%] font-bold text-gray-900">Área</TableHead>
                  <TableHead className="font-bold text-gray-900">Interação (Entrada/Saída)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {content.inter_relacoes.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium align-top">{item.area}</TableCell>
                    <TableCell className="align-top">{item.interacao}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        )}

        {/* 8. Indicadores */}
        <section className="break-inside-avoid">
          <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-3 uppercase">
            8. Indicadores de Desempenho
          </h3>
          {content.indicadores && content.indicadores.filter(i => i.nome).length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-bold text-gray-900">Nome</TableHead>
                  <TableHead className="font-bold text-gray-900">Fórmula</TableHead>
                  <TableHead className="font-bold text-gray-900">Meta</TableHead>
                  <TableHead className="font-bold text-gray-900">Frequência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {content.indicadores.filter(i => i.nome).map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium align-top">{item.nome}</TableCell>
                    <TableCell className="align-top">{item.formula}</TableCell>
                    <TableCell className="align-top">{item.meta}</TableCell>
                    <TableCell className="align-top">{item.frequencia}</TableCell>
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
          <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-3 uppercase flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-green-600" />
            9. Evidência de Execução
          </h3>
          {content.evidencia_execucao?.tipo_evidencia ? (
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <div className="space-y-3">
                <div>
                  <span className="font-semibold text-gray-900">Tipo de Evidência:</span>
                  <p className="text-gray-700 mt-1">{content.evidencia_execucao.tipo_evidencia}</p>
                </div>
                {content.evidencia_execucao.descricao && (
                  <div>
                    <span className="font-semibold text-gray-900">Descrição:</span>
                    <p className="text-gray-700 mt-1 whitespace-pre-line">{content.evidencia_execucao.descricao}</p>
                  </div>
                )}
                {content.evidencia_execucao.periodo_retencao && (
                  <div className="border-t pt-3 mt-3">
                    <span className="font-semibold text-gray-900">Período de Retenção:</span>
                    <p className="text-gray-700 mt-1">
                      {content.evidencia_execucao.periodo_retencao.replace(/_/g, ' ').replace('conforme lei', 'Conforme legislação')}
                    </p>
                    {content.evidencia_execucao.justificativa_retencao && (
                      <div className="mt-2">
                        <span className="font-semibold text-gray-900 text-sm">Justificativa:</span>
                        <p className="text-gray-600 text-sm mt-1">{content.evidencia_execucao.justificativa_retencao}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 italic">Evidência não definida.</p>
          )}
        </section>
      </div>

      {/* Footer Institucional */}
      <div className="bg-gray-50 p-4 border-t text-center text-xs text-gray-500 print:bg-white print:border-t-2">
        Documento gerado eletronicamente pela plataforma Oficinas Master. Impresso em {new Date().toLocaleDateString('pt-BR')}.
      </div>
    </div>
  );
}