import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function CardsSkeleton({ count = 4 }) {
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push(
      <div key={i} className="bg-white rounded-xl border p-6 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded" />
        </div>
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-32" />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {items}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  const rowItems = [];
  for (let i = 0; i < rows; i++) {
    const colItems = [];
    for (let j = 0; j < cols; j++) {
      colItems.push(
        <Skeleton
          key={j}
          className={`h-4 ${j === 0 ? "w-32" : j === 1 ? "w-24" : "w-16"}`}
        />
      );
    }
    rowItems.push(
      <div key={i} className="flex items-center gap-4 p-4">
        {colItems}
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="p-4 border-b">
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="divide-y">
        {rowItems}
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-white rounded-xl border p-6 space-y-4">
      <Skeleton className="h-5 w-40" />
      <div className="flex items-end gap-2 h-48">
        {[40, 65, 45, 80, 55, 70, 90, 60, 75, 50, 85, 65].map((h, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function TabSkeleton({ variant = "overview" }) {
  if (variant === "overview") {
    return (
      <div className="space-y-6 animate-pulse">
        <CardsSkeleton count={4} />
        <div className="grid md:grid-cols-3 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className="space-y-6 animate-pulse">
        <CardsSkeleton count={4} />
        <TableSkeleton rows={8} cols={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-pulse">
      <CardsSkeleton count={3} />
      <ChartSkeleton />
    </div>
  );
}