import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Star, Heart, Shield, Users, Target } from "lucide-react";

export default function ManualCultura() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">Manual da Cultura</h1>
          <p className="text-xl text-gray-600">Nossa identidade, nossos valores e nosso jeito de fazer acontecer.</p>
        </div>

        {/* Missão, Visão e Valores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-blue-600 text-white border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-6 h-6" />
                Missão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-relaxed">
                Transformar o mercado automotivo através da excelência técnica e do atendimento humanizado, garantindo segurança e confiança para cada cliente.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-purple-600 text-white border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-6 h-6" />
                Visão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-relaxed">
                Ser a referência nacional em gestão e qualidade de serviços automotivos, reconhecida pela inovação e pelo desenvolvimento de pessoas.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-indigo-600 text-white border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-6 h-6" />
                Valores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">• Transparência Total</li>
                <li className="flex items-center gap-2">• Foco no Cliente</li>
                <li className="flex items-center gap-2">• Melhoria Contínua</li>
                <li className="flex items-center gap-2">• Respeito e Ética</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Regimento e Normas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-gray-700" />
              Regimento Interno e Conduta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6 text-gray-700">
                <section>
                  <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    1. Postura e Atendimento
                  </h3>
                  <p className="mb-2">
                    Todos os colaboradores devem tratar clientes, fornecedores e colegas com máximo respeito e cordialidade. A satisfação do cliente é nossa prioridade número um.
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>Cumprimente a todos com um sorriso.</li>
                    <li>Escute atentamente antes de responder.</li>
                    <li>Mantenha a calma em situações de conflito.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    2. Trabalho em Equipe
                  </h3>
                  <p className="mb-2">
                    O sucesso de um é o sucesso de todos. Incentivamos a colaboração, a troca de conhecimentos e o apoio mútuo entre os setores.
                  </p>
                </section>

                <section>
                  <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-blue-600" />
                    3. Organização e Limpeza (5S)
                  </h3>
                  <p className="mb-2">
                    Manter o ambiente de trabalho limpo e organizado é responsabilidade de todos. Aplicamos o conceito 5S diariamente:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>Utilização: Separe o útil do inútil.</li>
                    <li>Ordenação: Um lugar para cada coisa.</li>
                    <li>Limpeza: Não sujar é melhor que limpar.</li>
                    <li>Saúde: Cuide da sua segurança e bem-estar.</li>
                    <li>Autodisciplina: Faça disso um hábito.</li>
                  </ul>
                </section>

                <section>
                    <h3 className="font-bold text-lg mb-2 text-gray-400 italic">
                        ... (Conteúdo completo do regimento disponível no RH)
                    </h3>
                </section>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Ícone auxiliar para evitar erro de undefined
import { Wrench } from "lucide-react";