import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Dashboard de métricas de documentos
 */
export default function DocumentsDashboard({ documents = [] }) {
  const now = new Date();
  
  const metrics = React.useMemo(() => {
    const total = documents.length;
    
    const expired = documents.filter(doc => {
      if (!doc.expiry_date) return false;
      return new Date(doc.expiry_date) < now;
    }).length;
    
    const expiringSoon = documents.filter(doc => {
      if (!doc.expiry_date) return false;
      const expiryDate = new Date(doc.expiry_date);
      const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
    }).length;
    
    const byCategory = documents.reduce((acc, doc) => {
      acc[doc.category] = (acc[doc.category] || 0) + 1;
      return acc;
    }, {});
    
    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
    
    return { total, expired, expiringSoon, topCategory };
  }, [documents, now]);

  const cards = [
    {
      title: "Total de Documentos",
      value: metrics.total,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Vencidos",
      value: metrics.expired,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-100"
    },
    {
      title: "Vencem em 30 dias",
      value: metrics.expiringSoon,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    },
    {
      title: "Categoria Principal",
      value: metrics.topCategory?.[0] || "-",
      count: metrics.topCategory?.[1],
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-100"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold mt-2">
                    {typeof card.value === 'string' ? card.value : card.value.toLocaleString()}
                  </p>
                  {card.count && (
                    <Badge variant="secondary" className="mt-1">
                      {card.count} docs
                    </Badge>
                  )}
                </div>
                <div className={`p-3 rounded-full ${card.bgColor}`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}