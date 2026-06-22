import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function TermosDeUso() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-8">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Termos de Uso – SPO</h1>
          <p className="text-sm text-gray-500 mb-10">Última atualização: 02 de junho de 2026</p>

          <Section title="1. Objeto">
            <p>O SPO é uma plataforma digital destinada à gestão empresarial, acompanhamento de indicadores, desenvolvimento de equipes, treinamentos, consultoria, execução de planos de ação e demais recursos disponibilizados pela Oficinas Master.</p>
            <p className="mt-3">Ao utilizar a plataforma, o usuário declara concordar integralmente com estes Termos de Uso.</p>
          </Section>

          <Section title="2. Cadastro e Acesso">
            <p className="mb-3">O acesso à plataforma depende de cadastro válido.</p>
            <p className="mb-2">O usuário compromete-se a:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Fornecer informações verdadeiras e atualizadas</li>
              <li>Manter a confidencialidade de suas credenciais</li>
              <li>Não compartilhar usuários ou senhas</li>
              <li>Utilizar a plataforma apenas para fins legítimos</li>
            </ul>
            <p className="mt-3">O titular da conta é responsável por toda atividade realizada através de suas credenciais.</p>
          </Section>

          <Section title="3. Licença de Uso">
            <p>A empresa contratante recebe uma licença limitada, não exclusiva, intransferível e revogável para utilização da plataforma durante a vigência contratual.</p>
            <p className="mt-3">Nenhum direito de propriedade intelectual é transferido ao usuário.</p>
          </Section>

          <Section title="4. Utilização da Plataforma">
            <p className="mb-2">É proibido:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Violar legislação aplicável</li>
              <li>Tentar acessar áreas restritas sem autorização</li>
              <li>Realizar engenharia reversa</li>
              <li>Copiar ou reproduzir partes do sistema sem autorização</li>
              <li>Utilizar a plataforma para atividades ilícitas</li>
              <li>Inserir conteúdos que violem direitos de terceiros</li>
            </ul>
          </Section>

          <Section title="5. Responsabilidade sobre Dados Inseridos">
            <p>A empresa contratante é integralmente responsável pelos dados inseridos na plataforma.</p>
            <p className="mt-3">A contratante declara possuir base legal adequada para tratamento dos dados de clientes, colaboradores e terceiros cadastrados no sistema.</p>
          </Section>

          <Section title="6. Disponibilidade do Serviço">
            <p className="mb-2">A SPO buscará manter a plataforma disponível continuamente, porém não garante disponibilidade ininterrupta.</p>
            <p className="mb-2">Poderão ocorrer:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Atualizações</li>
              <li>Manutenções</li>
              <li>Correções</li>
              <li>Interrupções técnicas não planejadas</li>
            </ul>
          </Section>

          <Section title="7. Propriedade Intelectual">
            <p className="mb-2">Todo conteúdo da plataforma, incluindo:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Software</li>
              <li>Código-fonte</li>
              <li>Layouts</li>
              <li>Marcas</li>
              <li>Logotipos</li>
              <li>Documentação</li>
            </ul>
            <p className="mt-3">permanece sendo propriedade exclusiva da SPO e seus licenciadores.</p>
          </Section>

          <Section title="8. Limitação de Responsabilidade">
            <p className="mb-2">A SPO não se responsabiliza por:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Decisões empresariais tomadas pelos usuários</li>
              <li>Informações inseridas por terceiros</li>
              <li>Perdas decorrentes de uso inadequado da plataforma</li>
              <li>Problemas oriundos de serviços de terceiros</li>
            </ul>
            <p className="mt-3">A responsabilidade da SPO fica limitada ao valor efetivamente pago pela contratante nos últimos 12 meses, observados os limites legais aplicáveis.</p>
          </Section>

          <Section title="9. Suspensão ou Encerramento">
            <p className="mb-2">A SPO poderá suspender ou encerrar acessos em caso de:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Violação destes Termos</li>
              <li>Uso indevido da plataforma</li>
              <li>Inadimplência contratual</li>
              <li>Determinação legal</li>
            </ul>
          </Section>

          <Section title="10. Alterações">
            <p>Os Termos poderão ser atualizados periodicamente.</p>
            <p className="mt-3">A continuidade do uso da plataforma após alterações representa concordância com a versão vigente.</p>
          </Section>

          <Section title="11. Legislação Aplicável" last>
            <p>Estes Termos são regidos pelas leis da República Federativa do Brasil.</p>
            <p className="mt-3">Fica eleito o foro da comarca da sede da SPO para resolução de controvérsias, salvo disposição legal em contrário.</p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children, last }) {
  return (
    <div className={`py-6 ${!last ? "border-b border-gray-100" : ""}`}>
      <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
      <div className="text-gray-700 leading-relaxed text-sm space-y-1">{children}</div>
    </div>
  );
}