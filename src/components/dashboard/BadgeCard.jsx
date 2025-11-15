import React from "react";
import { Award, Trophy, Star, Medal, Crown, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const badgeIcons = {
  trophy: Trophy,
  award: Award,
  star: Star,
  medal: Medal,
  crown: Crown,
  zap: Zap
};

const badgeColors = {
  gold: "from-yellow-400 to-yellow-600",
  silver: "from-gray-300 to-gray-500",
  bronze: "from-orange-400 to-orange-600",
  blue: "from-blue-400 to-blue-600",
  purple: "from-purple-400 to-purple-600",
  green: "from-green-400 to-green-600"
};

export default function BadgeCard({ badge }) {
  const Icon = badgeIcons[badge.icon] || Award;
  const colorClass = badgeColors[badge.color] || badgeColors.blue;

  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm border-2 border-gray-100 hover:shadow-md transition-all">
      <div className={cn(
        "w-16 h-16 rounded-full bg-gradient-to-br flex items-center justify-center mb-2",
        colorClass
      )}>
        <Icon className="w-8 h-8 text-white" />
      </div>
      <p className="text-sm font-semibold text-gray-900 text-center">{badge.name}</p>
      {badge.earned_date && (
        <p className="text-xs text-gray-500 mt-1">
          {new Date(badge.earned_date).toLocaleDateString('pt-BR')}
        </p>
      )}
    </div>
  );
}