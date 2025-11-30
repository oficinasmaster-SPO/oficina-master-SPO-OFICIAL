import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Star, TrendingUp, BookOpen, CalendarCheck } from "lucide-react";

export default function RankingSection({ rankings, userEmployee }) {
    if (!rankings || rankings.length === 0) return null;

    // Filter rankings
    const myArea = userEmployee?.area;
    const myRole = userEmployee?.job_role;

    // 1. Top 3 Global
    const topGlobal = [...rankings].sort((a, b) => b.total_score - a.total_score).slice(0, 3);

    // 2. Top 3 My Area (if user has area)
    const topArea = myArea 
        ? rankings.filter(r => r.area === myArea).sort((a, b) => b.total_score - a.total_score).slice(0, 3)
        : [];

    // 3. First of Each Area
    const areas = [...new Set(rankings.map(r => r.area))];
    const firstOfEachArea = areas.map(area => {
        const areaRankings = rankings.filter(r => r.area === area).sort((a, b) => b.total_score - a.total_score);
        return areaRankings[0];
    }).filter(Boolean);

    const RankingCard = ({ title, items, icon: Icon, colorClass }) => (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${colorClass}`}>
                        <Icon className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-lg">{title}</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {items.map((item, index) => (
                        <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 flex items-center justify-center rounded-full font-bold text-xs ${
                                    index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                    index === 1 ? 'bg-gray-100 text-gray-700' :
                                    index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'
                                }`}>
                                    {index + 1}º
                                </div>
                                <Avatar className="w-8 h-8">
                                    <AvatarImage src={item.employee?.profile_picture_url} />
                                    <AvatarFallback>{item.employee?.full_name?.substring(0, 2)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-medium leading-none">{item.employee?.full_name}</p>
                                    <p className="text-xs text-gray-500">{item.area}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-bold">{item.total_score?.toFixed(0)}</span>
                                <p className="text-[10px] text-gray-500">pts</p>
                            </div>
                        </div>
                    ))}
                    {items.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Nenhum dado disponível</p>}
                </div>
            </CardContent>
        </Card>
    );

    const EngagementCard = ({ ranking }) => (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <CardTitle className="text-lg">Seu Engajamento</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-3 rounded-lg text-center shadow-sm">
                        <CalendarCheck className="w-5 h-5 text-green-500 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Registros Diários</p>
                        <p className="text-lg font-bold text-gray-900">{ranking?.daily_logs_count || 0}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg text-center shadow-sm">
                        <BookOpen className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Treinamentos</p>
                        <p className="text-lg font-bold text-gray-900">{ranking?.trainings_completed || 0}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg text-center shadow-sm">
                        <Star className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Média Notas</p>
                        <p className="text-lg font-bold text-gray-900">{ranking?.average_training_grade?.toFixed(1) || '-'}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

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
                {myArea && (
                    <RankingCard 
                        title={`Top 3 - ${myArea}`}
                        items={topArea}
                        icon={Users} // Assuming Users icon is imported, reusing imports
                        colorClass="bg-blue-500"
                    />
                )}

                {/* 2. Top 3 Global */}
                <RankingCard 
                    title="Top 3 Global"
                    items={topGlobal}
                    icon={Trophy}
                    colorClass="bg-yellow-500"
                />

                {/* 3. First of Each Area */}
                <RankingCard 
                    title="Líderes por Área"
                    items={firstOfEachArea}
                    icon={Medal}
                    colorClass="bg-purple-500"
                />
            </div>
        </div>
    );
}

// Helper icon component if needed, but imported from lucide-react in main file
import { Users } from "lucide-react";