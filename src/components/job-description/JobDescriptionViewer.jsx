import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";
import JobDescriptionPDFGenerator from "./JobDescriptionPDFGenerator";

export default function JobDescriptionViewer({ open, onClose, jobDescription, workshop }) {
  const handleDownloadPDF = () => {
    if (!jobDescription) return;
    const generator = new JobDescriptionPDFGenerator();
    generator.generate(jobDescription, workshop);
  };

  if (!jobDescription) return null;

  const renderListItems = (items, type) => {
    if (!items || items.length === 0) return null;

    return (
      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2 text-gray-700">
            <span className="text-purple-600 font-bold mt-1">✓</span>
            <div className="flex-1">
              <span>{typeof item === 'string' ? item : item.item}</span>
              {typeof item === 'object' && (
                <div className="flex gap-2 mt-1">
                  {item.required && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Requerido</span>}
                  {item.desired && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Desejado</span>}
                  {item.internal && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Interno</span>}
                  {item.external && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Externo</span>}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900">
            Descrição de Cargo - {jobDescription.job_title}
          </h2>
          <div className="flex gap-2">
            <Button onClick={handleDownloadPDF} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Baixar PDF
            </Button>
            <Button onClick={onClose} variant="ghost" size="icon">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-lg p-6">
            <h1 className="text-3xl font-bold mb-2">Descrição de Cargo</h1>
            <p className="text-purple-100">{workshop?.name || 'Oficina'}</p>
            <p className="text-sm text-purple-200">
              {workshop?.city}, {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>

          {/* Job Title */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg p-6">
            <h3 className="text-2xl font-bold text-purple-900 mb-2">
              {jobDescription.job_title}
            </h3>
            {jobDescription.generated_by_ai && (
              <p className="text-sm text-purple-600">✨ Gerado por IA</p>
            )}
          </div>

          {/* Main Activities */}
          {jobDescription.main_activities?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Principais Atividades</h3>
              {renderListItems(jobDescription.main_activities)}
            </div>
          )}

          {/* Main Responsibilities */}
          {jobDescription.main_responsibilities && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Responsabilidades Principais</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {jobDescription.main_responsibilities}
              </p>
            </div>
          )}

          {/* Co-Responsibilities */}
          {jobDescription.co_responsibilities && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Co-Responsabilidades</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {jobDescription.co_responsibilities}
              </p>
            </div>
          )}

          {/* Education */}
          {jobDescription.education?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Formação Escolar</h3>
              {renderListItems(jobDescription.education)}
            </div>
          )}

          {/* Previous Experience */}
          {jobDescription.previous_experience?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Experiência Prévia</h3>
              {renderListItems(jobDescription.previous_experience)}
            </div>
          )}

          {/* Knowledge */}
          {jobDescription.knowledge?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Conhecimentos</h3>
              {renderListItems(jobDescription.knowledge)}
            </div>
          )}

          {/* Personal Attributes */}
          {jobDescription.personal_attributes?.length > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-6">
              <h3 className="text-lg font-bold text-blue-900 mb-4">Atributos Pessoais Essenciais</h3>
              {renderListItems(jobDescription.personal_attributes)}
            </div>
          )}

          {/* Clients */}
          {jobDescription.clients?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Clientes (Internos e Externos)</h3>
              {renderListItems(jobDescription.clients)}
            </div>
          )}

          {/* Equipment and Tools */}
          {jobDescription.equipment_tools?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Máquinas, Equipamentos e Ferramentas</h3>
              {renderListItems(jobDescription.equipment_tools)}
            </div>
          )}

          {/* Working Conditions */}
          {(jobDescription.working_conditions || jobDescription.physical_effort || jobDescription.mental_effort || jobDescription.visual_effort) && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Condições e Esforços de Trabalho</h3>
              <div className="space-y-4">
                {jobDescription.working_conditions && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Condições de Trabalho</h4>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {jobDescription.working_conditions}
                    </p>
                  </div>
                )}
                {jobDescription.physical_effort && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Esforço Físico</h4>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {jobDescription.physical_effort}
                    </p>
                  </div>
                )}
                {jobDescription.mental_effort && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Esforço Mental</h4>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {jobDescription.mental_effort}
                    </p>
                  </div>
                )}
                {jobDescription.visual_effort && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Esforço Visual</h4>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {jobDescription.visual_effort}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Risks */}
          {jobDescription.inherent_risks && (
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6">
              <h3 className="text-lg font-bold text-red-900 mb-3">⚠️ Riscos Inerentes ao Cargo</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {jobDescription.inherent_risks}
              </p>
            </div>
          )}

          {/* Managed Information */}
          {jobDescription.managed_information && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Informações Administradas</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {jobDescription.managed_information}
              </p>
            </div>
          )}

          {/* Responsibilities */}
          {(jobDescription.financial_transactions || jobDescription.third_party_safety || jobDescription.contact_responsibilities) && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Responsabilidades Específicas</h3>
              <div className="space-y-4">
                {jobDescription.financial_transactions && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Transações Financeiras</h4>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {jobDescription.financial_transactions}
                    </p>
                  </div>
                )}
                {jobDescription.third_party_safety && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Segurança de Terceiros</h4>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {jobDescription.third_party_safety}
                    </p>
                  </div>
                )}
                {jobDescription.contact_responsibilities && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Contatos e Relacionamentos</h4>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {jobDescription.contact_responsibilities}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Indicators */}
          {jobDescription.indicators?.length > 0 && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6">
              <h3 className="text-lg font-bold text-green-900 mb-4">Indicadores de Desempenho</h3>
              {renderListItems(jobDescription.indicators)}
            </div>
          )}

          {/* Trainings */}
          {jobDescription.trainings?.length > 0 && (
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-300 rounded-lg p-6">
              <h3 className="text-lg font-bold text-orange-900 mb-4">Treinamentos Necessários</h3>
              {renderListItems(jobDescription.trainings)}
            </div>
          )}

          {/* Footer */}
          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-lg p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Descrição Oficial de Cargo</h3>
            <p className="text-purple-100 leading-relaxed max-w-2xl mx-auto">
              Este documento define as competências, responsabilidades e expectativas para o cargo descrito.
              É utilizado para recrutamento, desenvolvimento e avaliação de desempenho.
            </p>
          </div>

          {/* Document Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <p className="text-sm text-gray-500 text-center italic">
              Documento criado em {new Date(jobDescription.created_date).toLocaleDateString('pt-BR')} • Uso interno para gestão de pessoas
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}