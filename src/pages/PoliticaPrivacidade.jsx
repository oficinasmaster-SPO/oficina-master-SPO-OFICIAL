import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PoliticaPrivacidade() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-8">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Política de Privacidade – SPO</h1>
          <p className="text-sm text-gray-500 mb-10">Última atualização: 02 de junho de 2026</p>

          <Section title="1. Apresentação">
            <p>A presente Política de Privacidade descreve como o SPO ("Plataforma"), operado pela Oficinas Master, coleta, utiliza, armazena, compartilha e protege informações de usuários, empresas clientes e seus colaboradores, em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 – LGPD).</p>
            <p className="mt-3">Ao utilizar a Plataforma, o usuário declara estar ciente das práticas descritas nesta Política.</p>
          </Section>

          <Section title="2. Quem Somos">
            <p>O SPO é uma plataforma de gestão empresarial, consultoria, treinamento e desenvolvimento organizacional voltada para empresas, permitindo o gerenciamento de processos, equipes, indicadores, planos de ação, treinamentos e demais informações corporativas.</p>
          </Section>

          <Section title="3. Dados Coletados">
            <h3 className="font-semibold text-gray-800 mb-2">3.1 Dados de Cadastro</h3>
            <p className="mb-2">Podemos coletar:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Nome completo</li>
              <li>E-mail</li>
              <li>Telefone</li>
              <li>Cargo</li>
              <li>Empresa vinculada</li>
              <li>Identificador do usuário na plataforma</li>
            </ul>

            <h3 className="font-semibold text-gray-800 mt-5 mb-2">3.2 Dados Empresariais</h3>
            <p className="mb-2">Dependendo dos recursos utilizados, poderão ser armazenadas informações relacionadas à gestão da empresa, incluindo:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Indicadores de desempenho</li>
              <li>Metas</li>
              <li>Processos internos</li>
              <li>Informações financeiras</li>
              <li>Dados operacionais</li>
              <li>Diagnósticos empresariais</li>
              <li>Planos de ação</li>
              <li>Relatórios gerenciais</li>
            </ul>

            <h3 className="font-semibold text-gray-800 mt-5 mb-2">3.3 Dados de Colaboradores</h3>
            <p className="mb-2">A Plataforma poderá armazenar informações fornecidas pela empresa contratante referentes aos seus colaboradores, incluindo:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Nome</li>
              <li>Cargo</li>
              <li>Histórico de treinamentos</li>
              <li>Avaliações de desempenho</li>
              <li>Feedbacks</li>
              <li>Certificações</li>
              <li>Advertências</li>
              <li>Planos de desenvolvimento</li>
            </ul>

            <h3 className="font-semibold text-gray-800 mt-5 mb-2">3.4 Dados de Navegação e Uso</h3>
            <p className="mb-2">Poderemos coletar automaticamente:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Endereço IP</li>
              <li>Data e hora de acesso</li>
              <li>Navegador utilizado</li>
              <li>Sistema operacional</li>
              <li>Informações de dispositivo</li>
              <li>Logs de utilização da plataforma</li>
              <li>Registros de autenticação</li>
            </ul>
          </Section>

          <Section title="4. Finalidade do Tratamento dos Dados">
            <p className="mb-2">Os dados coletados são utilizados para:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Disponibilizar e operar a Plataforma</li>
              <li>Executar serviços contratados</li>
              <li>Gerar relatórios e indicadores</li>
              <li>Realizar treinamentos e avaliações</li>
              <li>Apoiar processos de consultoria</li>
              <li>Fornecer suporte técnico</li>
              <li>Garantir segurança e prevenção de fraudes</li>
              <li>Cumprir obrigações legais e regulatórias</li>
              <li>Melhorar a experiência dos usuários</li>
            </ul>
          </Section>

          <Section title="5. Bases Legais Utilizadas">
            <p className="mb-2">O tratamento de dados poderá ocorrer com fundamento em uma ou mais das seguintes bases legais previstas na LGPD:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Execução de contrato</li>
              <li>Cumprimento de obrigação legal</li>
              <li>Legítimo interesse</li>
              <li>Exercício regular de direitos</li>
              <li>Consentimento, quando necessário</li>
            </ul>
          </Section>

          <Section title="6. Papéis de Controlador e Operador">
            <p className="mb-3">Nas situações em que a empresa cliente insere dados de seus colaboradores, clientes ou terceiros na Plataforma:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>A empresa contratante atua como <strong>Controladora dos Dados</strong></li>
              <li>O SPO atua como <strong>Operador dos Dados</strong>, realizando o tratamento exclusivamente conforme as instruções da empresa contratante e para execução dos serviços contratados</li>
            </ul>
            <p className="mt-3">A empresa contratante é responsável por garantir que possui base legal adequada para inserção e utilização dos dados na Plataforma.</p>
          </Section>

          <Section title="7. Compartilhamento de Dados">
            <p className="mb-2">Os dados poderão ser compartilhados apenas quando necessário para a execução dos serviços, incluindo provedores de:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Hospedagem em nuvem</li>
              <li>Banco de dados</li>
              <li>Monitoramento e segurança</li>
              <li>Serviços de e-mail</li>
              <li>Ferramentas de comunicação</li>
              <li>Serviços de pagamento</li>
              <li>Serviços de inteligência artificial utilizados pela Plataforma</li>
            </ul>
            <p className="mt-3">Todos os terceiros são contratados observando requisitos razoáveis de segurança e proteção de dados.</p>
          </Section>

          <Section title="8. Inteligência Artificial">
            <p>A Plataforma poderá utilizar recursos de inteligência artificial para geração de análises, recomendações, resumos, relatórios e suporte à tomada de decisão.</p>
            <p className="mt-3">Os dados processados por tais recursos serão tratados de acordo com esta Política de Privacidade e com os contratos firmados com os respectivos fornecedores tecnológicos.</p>
          </Section>

          <Section title="9. Segurança das Informações">
            <p className="mb-2">Adotamos medidas técnicas e administrativas razoáveis para proteção dos dados pessoais, incluindo:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Controle de acesso por usuário</li>
              <li>Perfis e permissões</li>
              <li>Criptografia quando aplicável</li>
              <li>Registro de auditoria</li>
              <li>Monitoramento de acessos</li>
              <li>Backups periódicos</li>
              <li>Políticas internas de segurança</li>
            </ul>
            <p className="mt-3">Apesar dos esforços empregados, nenhum sistema é completamente imune a riscos de segurança.</p>
          </Section>

          <Section title="10. Retenção dos Dados">
            <p className="mb-2">Os dados serão mantidos:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Enquanto houver relação contratual ativa</li>
              <li>Pelo período necessário para cumprimento de obrigações legais</li>
              <li>Pelo prazo necessário para exercício regular de direitos</li>
              <li>Conforme políticas internas de retenção da Plataforma</li>
            </ul>
            <p className="mt-3">Após o encerramento da relação contratual, os dados poderão ser excluídos ou anonimizados, observadas as hipóteses legais de retenção.</p>
          </Section>

          <Section title="11. Direitos dos Titulares">
            <p className="mb-2">Nos termos da LGPD, os titulares dos dados poderão solicitar:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Confirmação da existência de tratamento</li>
              <li>Acesso aos dados</li>
              <li>Correção de informações incompletas ou desatualizadas</li>
              <li>Anonimização, bloqueio ou eliminação quando cabível</li>
              <li>Portabilidade dos dados</li>
              <li>Informações sobre compartilhamento</li>
              <li>Revogação do consentimento quando aplicável</li>
            </ul>
          </Section>

          <Section title="12. Cookies e Tecnologias Semelhantes">
            <p className="mb-2">A Plataforma poderá utilizar cookies e tecnologias similares para:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Autenticação</li>
              <li>Segurança</li>
              <li>Preferências do usuário</li>
              <li>Estatísticas de utilização</li>
              <li>Melhoria da experiência de navegação</li>
            </ul>
            <p className="mt-3">O usuário poderá configurar seu navegador para restringir ou bloquear cookies, observadas eventuais limitações de funcionamento.</p>
          </Section>

          <Section title="13. Alterações desta Política">
            <p>Esta Política poderá ser atualizada periodicamente para refletir melhorias da Plataforma, alterações legais ou mudanças operacionais.</p>
            <p className="mt-3">A versão mais recente estará sempre disponível dentro da Plataforma.</p>
          </Section>

          <Section title="14. Contato" last>
            <p>Para dúvidas, solicitações ou assuntos relacionados à privacidade e proteção de dados, entre em contato pelos canais oficiais da empresa.</p>
            <p className="mt-3"><strong>E-mail:</strong>{" "}
              <a href="mailto:oficinasmastergtr@gmail.com" className="text-red-600 hover:underline">
                oficinasmastergtr@gmail.com
              </a>
            </p>
            <p className="mt-4 text-sm text-gray-500 italic">Ao utilizar o SPO, o usuário declara ter lido e compreendido esta Política de Privacidade.</p>
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