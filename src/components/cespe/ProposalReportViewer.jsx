import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";
import ProposalPDFGenerator from "./ProposalPDFGenerator";

export default function ProposalReportViewer({ open, onClose, proposal, candidate, workshop }) {
  const handleDownloadPDF = () => {
    if (!proposal || !candidate || !workshop) return;
    const generator = new ProposalPDFGenerator();
    generator.generate(proposal, candidate, workshop);
  };

  if (!proposal || !candidate || !workshop) return null;

  const totalCompensation = (proposal.fixed_salary || 0) + (proposal.variable_bonus || 0);
  const benefitsTotal = proposal.benefits?.reduce((sum, b) => sum + (b.value || 0), 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900">
            Proposta de Trabalho - {candidate.full_name}
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
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-6">
            <h1 className="text-3xl font-bold mb-2">Proposta de Trabalho</h1>
            <p className="text-blue-100">{workshop.name}</p>
            <p className="text-sm text-blue-200">
              {workshop.city}, {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>

          {/* Welcome Message */}
          <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-300 rounded-lg p-6">
            <h3 className="text-xl font-bold text-green-900 mb-3">
              Seja Bem-Vindo(a) ao Nosso Time!
            </h3>
            <p className="text-gray-700 leading-relaxed">
              É com grande entusiasmo que apresentamos esta proposta. Identificamos em você um enorme potencial e
              acreditamos que juntos construiremos uma trajetória de sucesso e crescimento mútuo.
            </p>
          </div>

          {/* Candidate Info */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Dados do Candidato</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Nome</p>
                <p className="font-semibold">{candidate.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Cargo Proposto</p>
                <p className="font-semibold">{proposal.position}</p>
              </div>
            </div>
          </div>

          {/* Function Objective */}
          {proposal.function_objective && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Seu Propósito e Missão</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {proposal.function_objective}
              </p>
            </div>
          )}

          {/* Responsibilities */}
          {proposal.main_responsibilities?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Suas Principais Responsabilidades</h3>
              <ul className="space-y-2">
                {proposal.main_responsibilities.map((resp, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-gray-700">
                    <span className="text-green-600 font-bold mt-1">✓</span>
                    <span>{resp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Compensation */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6">
            <h3 className="text-xl font-bold text-green-900 mb-4">Remuneração e Benefícios</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Salário Fixo</p>
                <p className="text-2xl font-bold text-green-700">
                  R$ {proposal.fixed_salary?.toLocaleString('pt-BR')}
                </p>
              </div>
              {proposal.variable_bonus > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Bônus/Comissão</p>
                  <p className="text-2xl font-bold text-green-700">
                    R$ {proposal.variable_bonus?.toLocaleString('pt-BR')}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-green-200">
              <p className="text-sm text-gray-600 mb-1">Compensação Total</p>
              <p className="text-3xl font-bold text-green-900">
                R$ {totalCompensation.toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Contrato</p>
                <p className="font-semibold">{proposal.contract_type?.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-gray-600">Modelo</p>
                <p className="font-semibold">{proposal.work_model}</p>
              </div>
              <div>
                <p className="text-gray-600">Carga Horária</p>
                <p className="font-semibold">{proposal.workload}</p>
              </div>
              <div>
                <p className="text-gray-600">Horário</p>
                <p className="font-semibold">{proposal.work_schedule}</p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          {proposal.benefits?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Pacote de Benefícios Completo</h3>
              <div className="space-y-3">
                {proposal.benefits.map((benefit, idx) => (
                  <div key={idx} className="flex justify-between items-start border-b border-gray-100 pb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{benefit.name}</p>
                      {benefit.description && (
                        <p className="text-sm text-gray-600 mt-1">{benefit.description}</p>
                      )}
                    </div>
                    <p className="font-bold text-green-600">
                      R$ {benefit.value?.toLocaleString('pt-BR')}
                    </p>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2">
                  <p className="font-bold text-gray-900">Total em Benefícios</p>
                  <p className="text-xl font-bold text-green-700">
                    R$ {benefitsTotal.toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Career Path */}
          {proposal.career_path && (
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-300 rounded-lg p-6">
              <h3 className="text-xl font-bold text-orange-900 mb-4">Seu Futuro Aqui: Plano de Crescimento</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line mb-4">
                {proposal.career_path}
              </p>
              {proposal.future_positions?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-orange-200">
                  <p className="font-semibold text-orange-900 mb-2">Possíveis Cargos Futuros:</p>
                  <ul className="space-y-1">
                    {proposal.future_positions.map((pos, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-gray-700">
                        <span className="text-orange-600">→</span>
                        <span>{pos}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Success Criteria */}
          {(proposal.success_criteria_30d || proposal.success_criteria_60d) && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Expectativas e Metas de Integração</h3>
              {proposal.success_criteria_30d && (
                <div className="mb-6">
                  <h4 className="font-semibold text-blue-700 mb-2">Primeiros 30 dias:</h4>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {proposal.success_criteria_30d}
                  </p>
                </div>
              )}
              {proposal.success_criteria_60d && (
                <div>
                  <h4 className="font-semibold text-blue-700 mb-2">60 dias:</h4>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {proposal.success_criteria_60d}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* CTA */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-lg p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Estamos Ansiosos Para Ter Você no Time!</h3>
            <p className="text-blue-100 leading-relaxed max-w-2xl mx-auto">
              Esta proposta reflete nosso compromisso em construir uma parceria de longo prazo. Acreditamos no seu
              potencial e estamos prontos para investir no seu desenvolvimento profissional. Seja parte desta jornada de
              sucesso!
            </p>
          </div>

          {/* Contact Info */}
          {(proposal.responsible_contact?.name || proposal.responsible_contact?.email) && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-3">Contato para Dúvidas:</h4>
              <div className="space-y-1 text-sm text-gray-700">
                {proposal.responsible_contact?.name && (
                  <p><span className="font-medium">Nome:</span> {proposal.responsible_contact.name}</p>
                )}
                {proposal.responsible_contact?.email && (
                  <p><span className="font-medium">E-mail:</span> {proposal.responsible_contact.email}</p>
                )}
                {proposal.responsible_contact?.phone && (
                  <p><span className="font-medium">Telefone:</span> {proposal.responsible_contact.phone}</p>
                )}
              </div>
            </div>
          )}

          {/* Validity */}
          {proposal.proposal_validity && (
            <p className="text-sm text-gray-500 text-center italic">
              {proposal.proposal_validity}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}