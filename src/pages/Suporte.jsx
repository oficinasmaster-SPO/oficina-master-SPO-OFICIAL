import React from "react";
import { Link } from "react-router-dom";
import { Mail, Clock, MessageCircle, ArrowLeft, Phone } from "lucide-react";

export default function Suporte() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Voltar</span>
          </Link>
          <div className="w-px h-5 bg-gray-200" />
          <img
            src="https://media.base44.com/images/public/69540822472c4a70b54d47aa/121a4c254_Horizontal_Fundo_Claro.png"
            alt="Oficinas Master"
            className="h-8 object-contain"
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Central de Suporte</h1>
          <p className="text-gray-500 text-lg">Estamos aqui para ajudar. Entre em contato com nossa equipe.</p>
        </div>

        <div className="grid gap-6">
          {/* E-mail */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-start gap-5">
            <div className="bg-red-50 p-3 rounded-lg">
              <Mail className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">E-mail</h2>
              <p className="text-gray-500 text-sm mb-2">Envie sua dúvida ou solicitação por e-mail e responderemos o mais breve possível.</p>
              <a
                href="mailto:oficinasmastergtr@gmail.com"
                className="text-red-600 font-medium hover:underline"
              >
                oficinasmastergtr@gmail.com
              </a>
            </div>
          </div>

          {/* Horário de Atendimento */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-start gap-5">
            <div className="bg-blue-50 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Horário de Atendimento</h2>
              <p className="text-gray-500 text-sm mb-3">Nossa equipe está disponível nos seguintes horários:</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between gap-8">
                  <span className="text-gray-600 font-medium">Segunda a Sexta</span>
                  <span className="text-gray-800">08h00 – 18h00</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span className="text-gray-600 font-medium">Sábado</span>
                  <span className="text-gray-800">08h00 – 12h00</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span className="text-gray-600 font-medium">Domingo e Feriados</span>
                  <span className="text-gray-500 italic">Fechado</span>
                </div>
              </div>
            </div>
          </div>

          {/* Formas de Contato */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-start gap-5">
            <div className="bg-green-50 p-3 rounded-lg">
              <MessageCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Formas de Contato</h2>
              <p className="text-gray-500 text-sm mb-4">Escolha o canal de sua preferência para falar com a nossa equipe.</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">E-mail</p>
                    <p className="text-xs text-gray-500">Ideal para dúvidas detalhadas e solicitações formais</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <MessageCircle className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Suporte via Plataforma</p>
                    <p className="text-xs text-gray-500">Utilize o chat de suporte dentro do sistema quando logado</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tempo de resposta */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-4">
            <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Tempo médio de resposta</p>
              <p className="text-sm text-amber-700 mt-1">
                Respondemos e-mails em até <strong>1 dia útil</strong>. Para urgências, entre em contato durante o horário comercial.
              </p>
            </div>
          </div>
        </div>

        {/* Footer links */}
        <div className="mt-10 pt-6 border-t border-gray-200 flex flex-wrap justify-center gap-6 text-sm text-gray-500">
          <Link to="/TermosDeUso" className="hover:text-gray-800 transition-colors">Termos de Uso</Link>
          <Link to="/PoliticaPrivacidade" className="hover:text-gray-800 transition-colors">Política de Privacidade</Link>
          <Link to="/" className="hover:text-gray-800 transition-colors">Página Inicial</Link>
        </div>
      </div>
    </div>
  );
}