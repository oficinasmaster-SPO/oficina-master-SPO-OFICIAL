import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  AlertTriangle, 
  Clock, 
  ShieldAlert, 
  Scale, 
  GraduationCap,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  BarChart3
} from "lucide-react";

export default function DocumentsDashboard({ documents }) {
  // Contadores
  const totalDocs = documents.length;
  
  // Documentos vencidos
  const expiredDocs = documents.filter(doc => {
    if (!doc.next_review_date) return false;
    const now = new Date();
    const reviewDate = new Date(doc.next_review_date);
    return reviewDate < now;
  }).length;

  // Documentos próximos ao vencimento (30 dias)
  const expiringSoon = documents.filter(doc => {
    if (!doc.next_review_date) return false;
    const now = new Date();
    const reviewDate = new Date(doc.next_review_date);
    const daysUntilExpiry = Math.floor((reviewDate - now) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
  }).length;

  // Documentos com impacto jurídico alto
  const highLegalImpact = documents.filter(doc => doc.legal_impact === 'alto').length;

  // Documentos obrigatórios por lei
  const mandatoryByLaw = documents.filter(doc => doc.mandatory_by_law === true).length;

  // Documentos sem treinamento vinculado (que deveriam ter)
  const missingTraining = documents.filter(doc => 
    doc.has_training === false && 
    (doc.legal_impact === 'alto' || doc.mandatory_by_law)
  ).length;

  // Status
  const statusCounts = {
    em_uso: documents.filter(d => d.status === 'em_uso').length,
    aprovado: documents.filter(d => d.status === 'aprovado').length,
    em_revisao: documents.filter(d => d.status === 'em_revisao').length,
    em_construcao: documents.filter(d => d.status === 'em_construcao').length,
    obsoleto: documents.filter(d => d.status === 'obsoleto').length
  };

  // Por área
  const byCategory = documents.reduce((acc, doc) => {
    acc[doc.category] = (acc[doc.category] || 0) + 1;
    return acc;
  }, {});

  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Por tipo
  const byType = documents.reduce((acc, doc) => {
    acc[doc.document_type] = (acc[doc.document_type] || 0) + 1;
    return acc;
  }, {});

  const topTypes = Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const categoryLabels = {
    governanca: "Governança",
    juridico_regimento: "Jurídico",
    rh_pessoas: "RH",
    operacional: "Operacional",
    tecnico: "Técnico",
    comercial: "Comercial",
    financeiro: "Financeiro",
    treinamento: "Treinamento",
    auditoria_dados: "Auditoria"
  };

  const stats = [
    {
      title: "Total de Documentos",
      value: totalDocs,
      icon: FileText,
      color: "bg-blue-100 text-blue-700",
      description: "Documentos cadastrados"
    },
    {
      title: "Vencidos",
      value: expiredDocs,
      icon: AlertTriangle,
      color: "bg-red-100 text-red-700",
      description: "Precisam revisão urgente",
      alert: expiredDocs > 0
    },
    {
      title: "Vencem em 30 dias",
      value: expiringSoon,
      icon: Clock,
      color: "bg-yellow-100 text-yellow-700",
      description: "Revisar em breve",
      alert: expiringSoon > 0
    },
    {
      title: "Impacto Jurídico Alto",
      value: highLegalImpact,
      icon: ShieldAlert,
      color: "bg-orange-100 text-orange-700",
      description: "Requerem atenção especial"
    },
    {
      title: "Obrigatórios por Lei",
      value: mandatoryByLaw,
      icon: Scale,
      color: "bg-purple-100 text-purple-700",
      description: "Exigidos legalmente"
    },
    {
      title: "Sem Treinamento",
      value: missingTraining,
      icon: GraduationCap,
      color: "bg-pink-100 text-pink-700",
      description: "Críticos sem capacitação",
      alert: missingTraining > 0
    }
  ];

  return (
    <div className="mb-6 space-y-6">
      {/* Cards Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className={`hover:shadow-lg transition-shadow ${stat.alert ? 'border-2 border-red-300' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cards Secundários - Status e Distribuição */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Status dos Documentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">Em Uso</span>
              </div>
              <Badge className="bg-green-100 text-green-700">{statusCounts.em_uso}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span className="text-sm">Aprovado</span>
              </div>
              <Badge className="bg-blue-100 text-blue-700">{statusCounts.aprovado}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm">Em Revisão</span>
              </div>
              <Badge className="bg-yellow-100 text-yellow-700">{statusCounts.em_revisao}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-600" />
                <span className="text-sm">Em Construção</span>
              </div>
              <Badge className="bg-gray-100 text-gray-700">{statusCounts.em_construcao}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm">Obsoleto</span>
              </div>
              <Badge className="bg-red-100 text-red-700">{statusCounts.obsoleto}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Top Áreas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-600" />
              Top 3 Áreas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topCategories.length > 0 ? (
              topCategories.map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm">{categoryLabels[category] || category}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Nenhum documento ainda</p>
            )}
          </CardContent>
        </Card>

        {/* Top Tipos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Top 3 Tipos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topTypes.length > 0 ? (
              topTypes.map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm uppercase">{type}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Nenhum documento ainda</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}