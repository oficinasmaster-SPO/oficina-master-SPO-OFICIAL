import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trophy, Award, Crown, Zap, Star, Gem, Building, Calendar, Filter, Medal } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const IconMap = {
    Trophy, Award, Crown, Zap, Star, Gem, Building, Medal
};

export default function WorkshopMilestones({ workshop }) {
    const [filterCategory, setFilterCategory] = useState("all");

    const { data: milestones = [], isLoading } = useQuery({
        queryKey: ['workshop-milestones', workshop?.id],
        queryFn: async () => {
            if (!workshop?.id) return [];
            const res = await base44.entities.WorkshopMilestone.filter({
                workshop_id: workshop.id
            });
            return res.sort((a, b) => new Date(b.achieved_date) - new Date(a.achieved_date));
        },
        enabled: !!workshop?.id
    });

    const filteredMilestones = milestones.filter(m => 
        filterCategory === "all" || m.category === filterCategory
    );

    const getIcon = (iconName) => {
        const Icon = IconMap[iconName] || Trophy;
        return <Icon className="w-8 h-8 text-white" />;
    };

    const getGradient = (category, value) => {
        if (category === 'faturamento') {
            if (value >= 1000000) return "bg-gradient-to-br from-slate-900 to-slate-700 border-slate-400"; // Black/Diamond
            if (value >= 500000) return "bg-gradient-to-br from-yellow-400 to-yellow-600 border-yellow-300"; // Gold
            if (value >= 300000) return "bg-gradient-to-br from-slate-300 to-slate-400 border-slate-200"; // Silver
            return "bg-gradient-to-br from-amber-600 to-amber-800 border-amber-500"; // Bronze/Copper
        }
        return "bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-300";
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Medal className="w-8 h-8 text-yellow-600" />
                        Conquistas e Marcos
                    </h2>
                    <p className="text-gray-500">Histórico de placas e crescimento da oficina</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="w-[180px] border-none shadow-none focus:ring-0">
                            <SelectValue placeholder="Filtrar por..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Conquistas</SelectItem>
                            <SelectItem value="faturamento">Faturamento (Placas)</SelectItem>
                            <SelectItem value="unidades">Expansão/Unidades</SelectItem>
                            <SelectItem value="equipe">Equipe</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMilestones.length > 0 ? (
                        filteredMilestones.map((milestone) => (
                            <div 
                                key={milestone.id} 
                                className={`relative overflow-hidden rounded-xl shadow-lg border-2 p-6 text-white transition-transform hover:scale-[1.02] ${getGradient(milestone.category, milestone.value_reached)}`}
                            >
                                <div className="absolute top-0 right-0 p-3 opacity-10">
                                    {getIcon(milestone.icon_name)}
                                </div>
                                
                                <div className="flex items-start justify-between mb-4">
                                    <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                                        {getIcon(milestone.icon_name)}
                                    </div>
                                    <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-0 backdrop-blur-sm">
                                        {format(new Date(milestone.achieved_date), "MMM yyyy", { locale: ptBR })}
                                    </Badge>
                                </div>

                                <h3 className="text-2xl font-bold mb-2">{milestone.title}</h3>
                                <p className="text-white/90 text-sm font-medium mb-4">
                                    {milestone.description}
                                </p>

                                {milestone.is_physical_award && (
                                    <div className="mt-auto pt-4 border-t border-white/20 flex items-center gap-2 text-xs font-semibold bg-black/10 -mx-6 -mb-6 p-4">
                                        <Award className="w-4 h-4" />
                                        Conquista com Prêmio Físico
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                            <Trophy className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">Nenhuma conquista ainda</h3>
                            <p className="text-gray-500">Continue crescendo para desbloquear seus marcos!</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}