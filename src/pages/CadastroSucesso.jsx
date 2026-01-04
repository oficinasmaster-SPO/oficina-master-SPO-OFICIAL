import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, Mail, Building2 } from "lucide-react";

export default function CadastroSucesso() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-white">
              <h1 className="text-2xl font-bold">Sistema Oficinas Master</h1>
              <p className="text-white/80 text-sm">Plataforma de Gestão</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <Card className="shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
            <CardTitle className="text-3xl text-green-700">Cadastro Realizado com Sucesso!</CardTitle>
            <p className="text-gray-600 mt-2 text-lg">
              Seu registro foi enviado para análise.
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Status Atual */}
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <Clock className="w-8 h-8 text-yellow-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-yellow-900 text-lg mb-2">
                    Aguardando Aprovação do Gestor
                  </h3>
                  <p className="text-yellow-800 leading-relaxed">
                    Seu cadastro está aguardando revisão e aprovação pelo responsável da oficina. 
                    Este processo normalmente leva de <strong>algumas horas até 1 dia útil</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Próximos Passos */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-bold text-blue-900 text-lg mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5" />
                O que acontece agora?
              </h3>
              <ol className="space-y-4 text-blue-800">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</span>
                  <div>
                    <strong>Análise do Gestor</strong>
                    <p className="text-sm text-blue-700 mt-1">O responsável da oficina receberá uma notificação sobre seu cadastro e irá revisar suas informações.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</span>
                  <div>
                    <strong>Aprovação e Configuração</strong>
                    <p className="text-sm text-blue-700 mt-1">Após aprovação, suas permissões de acesso serão configuradas de acordo com seu cargo.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">3</span>
                  <div>
                    <strong>Notificação por Email</strong>
                    <p className="text-sm text-blue-700 mt-1">Você receberá um <strong>email de confirmação</strong> quando seu acesso for liberado.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">4</span>
                  <div>
                    <strong>Acesso ao Sistema</strong>
                    <p className="text-sm text-blue-700 mt-1">Após aprovação, você poderá fazer login normalmente usando suas credenciais.</p>
                  </div>
                </li>
              </ol>
            </div>

            {/* Informações de Contato */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="font-bold text-gray-900 mb-3">💬 Precisa de ajuda?</h3>
              <p className="text-sm text-gray-700 mb-3">
                Se tiver dúvidas ou sua aprovação demorar mais de 24 horas, entre em contato diretamente com o gestor da sua oficina.
              </p>
              <p className="text-xs text-gray-500">
                Você pode fechar esta página com segurança. Aguarde o email de aprovação.
              </p>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-3">
              <Button
                onClick={() => navigate(createPageUrl("Home"))}
                variant="outline"
                className="flex-1"
              >
                Voltar ao Início
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}