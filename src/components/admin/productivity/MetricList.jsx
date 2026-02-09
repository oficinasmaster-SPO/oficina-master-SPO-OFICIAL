import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Image as ImageIcon } from "lucide-react";

export default function MetricList({ metrics, onEdit, onDelete }) {
    const categoryColors = {
        vendas: "bg-blue-100 text-blue-800",
        comercial: "bg-purple-100 text-purple-800",
        tecnico: "bg-orange-100 text-orange-800",
        financeiro: "bg-green-100 text-green-800",
        estoque: "bg-yellow-100 text-yellow-800",
        rh: "bg-pink-100 text-pink-800",
        zeladoria: "bg-gray-100 text-gray-800",
        lava_jato: "bg-cyan-100 text-cyan-800"
    };

    if (metrics.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                Nenhuma métrica cadastrada. Adicione novas métricas ou use a IA para gerar sugestões.
            </div>
        );
    }

    return (
        <div className="grid gap-4">
            {metrics.map((metric) => (
                <Card key={metric.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Badge className={categoryColors[metric.category] || "bg-gray-100"}>
                                {metric.code}
                            </Badge>
                            <div>
                                <h4 className="font-bold text-gray-900">{metric.name}</h4>
                                <p className="text-sm text-gray-500">{metric.description}</p>
                                <div className="flex gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                        {metric.data_type}
                                    </Badge>
                                    {metric.requires_evidence && (
                                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                                            <ImageIcon className="w-3 h-3" /> Exige Evidência
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => onEdit(metric)}>
                                <Edit className="w-4 h-4 text-gray-500" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => onDelete(metric.id)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}