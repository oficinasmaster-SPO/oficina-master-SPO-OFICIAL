import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Star, TrendingUp, BookOpen, CalendarCheck, Users, Briefcase, Crown } from "lucide-react";

const STANDARD_AREAS = [
    { id: 'vendas', label: 'Vendas' },
    { id: 'comercial', label: 'Comercial' },
    { id: 'marketing', label: 'Marketing' },
    { id: 'tecnico', label: 'Técnico' },
    { id: 'administrativo', label: 'Administrativo' },
    { id: 'financeiro', label: 'Financeiro' },
    { id: 'gerencia', label: 'Gerência' }
];

export default function RankingSection({ rankings, userEmployee }) {
    if (!rankings) return null; // Allow empty array to render structure

    // Filter rankings
    const myArea = userEmployee?.area;

    // 1. Top 3 Global
    const topGlobal = [...rankings].sort((a, b) => b.total_score - a.total_score).slice(0, 3);

    // 2. Top 3 My Area (if user has area)
    const topArea = myArea 
        ? rankings.filter(r => r.area === myArea).sort((a, b) => b.total_score - a.total_score).slice(0, 3)
        : [];

    // 3. First of Each Area (Map standard areas to their leader)
    const leadersByArea = STANDARD_AREAS.map(areaDef => {
        const areaRankings = rankings
            .filter(r => r.area === areaDef.id || r.area === areaDef.label || (r.area && r.area.toLowerCase() === areaDef.id))
            .sort((a, b) => b.total_score - a.total_score);
        
        return {
            areaLabel: areaDef.label,
            leader: areaRankings[0] || null
        };
    });

    // Helper for Engagement Classification
    const getEngagementLevel = (score) => {
        if (score >= 1000) return { label: "Elite", color: "bg-purple-100 text-purple-800" };
        if (score >= 500) return { label: "Avançado", color: "bg-blue-100 text-blue-800" };
        if (score >= 200) return { label: "Engajado", color: "bg-green-100 text-green-800" };
        return { label: "Iniciante", color: "bg-gray-100 text-gray-800" };
    };

    const RankingCard = ({ title, items, icon: Icon, colorClass, emptyMessage }) => (
        <Card className="h-full hover:shadow-md transition-shadow border-none shadow-sm bg-white">
            <CardHeader className="pb-2 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${colorClass}`}>
                        <Icon className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-lg text-gray-800">{title}</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                <div className="space-y-3">
                    {items.map((item, index) => (
                        <div key={item.id || index} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-gray-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all">
                            <div className="flex items-center gap-3">
                                <div className={`w-7 h-7 flex items-center justify-center rounded-full font-bold text-xs shadow-sm ${
                                    index === 0 ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-200' :
                                    index === 1 ? 'bg-gray-100 text-gray-700 ring-2 ring-gray-200' :
                                    index === 2 ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-200' : 'bg-slate-50 text-slate-600'
                                }`}>
                                    {index + 1}º
                                </div>
                                <Avatar className="w-9 h-9 border-2 border-white shadow-sm">
                                    <AvatarImage src={item.employee?.profile_picture_url} />
                                    <AvatarFallback className="bg-blue-100 text-blue-700">{item.employee?.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900 leading-none">{item.employee?.full_name}</p>
                                    <p className="text-[11px] text-gray-500 mt-1 capitalize">{item.area}</p>
                                </div>
                            </div>
                            <div className="text-right bg-gray-50 px-2 py-1 rounded-lg">
                                <span className="text-sm font-bold text-gray-900">{item.total_score?.toFixed(0)}</span>
                                <p className="text-[9px] text-gray-500 font-medium uppercase">pts</p>
                            </div>
                        </div>
                    ))}
                    {items.length === 0 && <p className="text-sm text-gray-400 text-center py-8 italic">{emptyMessage || "Nenhum dado disponível"}</p>}
                </div>
            </CardContent>
        </Card>
    );

    const AreaLeadersCard = ({ leaders }) => (
        <Card className="h-full hover:shadow-md transition-shadow border-none shadow-sm bg-white">
            <CardHeader className="pb-2 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-purple-500">
                        <Crown className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-lg text-gray-800">Líderes por Área</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                    {leaders.map((item, index) => (
                        <div key={item.areaLabel} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0 text-purple-600">
                                    <Briefcase className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">{item.areaLabel}</p>
                                    {item.leader ? (
                                        <div className="flex items-center gap-2">
                                            <Avatar className="w-5 h-5">
                                                <AvatarImage src={item.leader.employee?.profile_picture_url} />
                                                <AvatarFallback className="text-[9px]">{item.leader.employee?.full_name?.substring(0, 2)}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium text-gray-900 truncate">{item.leader.employee?.full_name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-sm text-gray-400 italic">- Sem representante -</span>
                                    )}
                                </div>
                            </div>
                            {item.leader && (
                                <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-100 text-[10px]">
                                    Top 1
                                </Badge>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );

    const EngagementCard = ({ ranking }) => {
        const level = getEngagementLevel(ranking?.total_score || 0);
        return (
            <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-lg overflow-hidden relative">
                <div className="absolute top-0 right-0 p-20 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <CardHeader className="pb-2 relative z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-200" />
                            <CardTitle className="text-lg text-white">Sua Performance</CardTitle>
                        </div>
                        <Badge className={`${level.color} border-none`}>{level.label}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="relative z-10 pt-2">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl text-center border border-white/10">
                            <CalendarCheck className="w-5 h-5 text-blue-200 mx-auto mb-1" />
                            <p className="text-[10px] text-blue-100 uppercase tracking-wide">Registros</p>
                            <p className="text-xl font-bold text-white">{ranking?.daily_logs_count || 0}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl text-center border border-white/10">
                            <BookOpen className="w-5 h-5 text-purple-200 mx-auto mb-1" />
                            <p className="text-[10px] text-blue-100 uppercase tracking-wide">Cursos</p>
                            <p className="text-xl font-bold text-white">{ranking?.trainings_completed || 0}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl text-center border border-white/10">
                            <Star className="w-5 h-5 text-yellow-300 mx-auto mb-1" />
                            <p className="text-[10px] text-blue-100 uppercase tracking-wide">Média</p>
                            <p className="text-xl font-bold text-white">{ranking?.average_training_grade?.toFixed(1) || '-'}</p>
                        </div>
                    </div>
                    
                    <div className="mt-4 bg-black/20 rounded-lg p-3 flex items-center justify-between">
                         <span className="text-xs text-blue-100">Preenchimento diário</span>
                         <div className="h-2 w-24 bg-white/20 rounded-full overflow-hidden">
                            <div className="h-full bg-green-400 rounded-full" style={{ width: `${Math.min((ranking?.daily_logs_count || 0) * 5, 100)}%` }}></div>
                         </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    const userRanking = rankings.find(r => r.employee_id === userEmployee?.id);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {userRanking && (
                <div className="mb-6">
                    <EngagementCard ranking={userRanking} />
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 1. Top 3 My Area */}
                <div className="h-full">
                    {myArea ? (
                        <RankingCard 
                            title={`Top 3 - ${myArea}`}
                            items={topArea}
                            icon={Users} 
                            colorClass="bg-blue-600"
                            emptyMessage={`Seja o primeiro a pontuar em ${myArea}!`}
                        />
                    ) : (
                         <Card className="h-full flex items-center justify-center bg-gray-50 border-dashed">
                            <CardContent className="text-center py-10">
                                <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-500">Complete seu cadastro para ver o ranking da sua área</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* 2. Top 3 Global */}
                <div className="h-full">
                    <RankingCard 
                        title="Top 3 Global"
                        items={topGlobal}
                        icon={Trophy}
                        colorClass="bg-yellow-500"
                    />
                </div>

                {/* 3. First of Each Area */}
                <div className="h-full">
                    <AreaLeadersCard leaders={leadersByArea} />
                </div>
            </div>
        </div>
    );
}