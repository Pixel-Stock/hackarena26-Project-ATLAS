"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDataStore } from "@/lib/data-store";
import { generateInsights } from "@/lib/insights";
import { TrendingUp, TrendingDown, Info, AlertTriangle, Trophy, Sparkles } from "lucide-react";

// map insight types to icons and colors
const insightStyles = {
    increase: {
        icon: TrendingUp,
        bgColor: "bg-orange-500/10",
        textColor: "text-orange-600",
        borderColor: "border-orange-200 dark:border-orange-800/30",
    },
    decrease: {
        icon: TrendingDown,
        bgColor: "bg-green-500/10",
        textColor: "text-green-600",
        borderColor: "border-green-200 dark:border-green-800/30",
    },
    info: {
        icon: Info,
        bgColor: "bg-blue-500/10",
        textColor: "text-blue-600",
        borderColor: "border-blue-200 dark:border-blue-800/30",
    },
    warning: {
        icon: AlertTriangle,
        bgColor: "bg-red-500/10",
        textColor: "text-red-600",
        borderColor: "border-red-200 dark:border-red-800/30",
    },
    achievement: {
        icon: Trophy,
        bgColor: "bg-yellow-500/10",
        textColor: "text-yellow-600",
        borderColor: "border-yellow-200 dark:border-yellow-800/30",
    },
};

export default function InsightsPage() {
    const { transactions, categories } = useDataStore();

    // generate all insights from transaction data
    const insights = useMemo(
        () => generateInsights(transactions, categories),
        [transactions, categories]
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {/* header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Smart Insights</h1>
                    <p className="text-muted-foreground mt-0.5">
                        Analysis of your spending habits
                    </p>
                </div>
            </div>

            {/* insights list */}
            {insights.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-medium mb-2">No insights yet</h3>
                        <p className="text-muted-foreground max-w-sm">
                            Start adding transactions to get personalized spending insights and recommendations.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {insights.map((insight, index) => {
                        const style = insightStyles[insight.type];
                        const Icon = style.icon;

                        return (
                            <Card
                                key={insight.id}
                                className={`border ${style.borderColor} overflow-hidden`}
                                style={{ animationDelay: `${index * 80}ms` }}
                            >
                                <CardContent className="p-5">
                                    <div className="flex items-start gap-4">
                                        {/* icon */}
                                        <div
                                            className={`w-10 h-10 rounded-lg ${style.bgColor} flex items-center justify-center flex-shrink-0`}
                                        >
                                            <Icon className={`h-5 w-5 ${style.textColor}`} />
                                        </div>

                                        {/* content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-sm">{insight.title}</h3>
                                                {insight.value && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        {insight.value}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {insight.description}
                                            </p>
                                            {insight.change !== undefined && (
                                                <div className="flex items-center gap-1 mt-2">
                                                    {insight.change > 0 ? (
                                                        <TrendingUp className="h-3 w-3 text-orange-500" />
                                                    ) : (
                                                        <TrendingDown className="h-3 w-3 text-green-500" />
                                                    )}
                                                    <span
                                                        className={`text-xs font-medium ${insight.change > 0 ? "text-orange-600" : "text-green-600"
                                                            }`}
                                                    >
                                                        {insight.change > 0 ? "+" : ""}
                                                        {insight.change}%
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
