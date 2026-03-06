import { Transaction, Category, Insight } from "./types";
import { getCurrentMonth, formatCurrency } from "./utils";

// generate AI-style spending insights based on transaction data
export function generateInsights(
    transactions: Transaction[],
    categories: Category[]
): Insight[] {
    const insights: Insight[] = [];
    const now = new Date();
    const currentMonth = getCurrentMonth();

    // get this month & last month transactions
    const thisMonthTxns = transactions.filter((t) =>
        t.date.startsWith(currentMonth)
    );
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
    const lastMonthTxns = transactions.filter((t) =>
        t.date.startsWith(lastMonthStr)
    );

    // total spending comparison
    const thisMonthTotal = thisMonthTxns.reduce((sum, t) => sum + t.amount, 0);
    const lastMonthTotal = lastMonthTxns.reduce((sum, t) => sum + t.amount, 0);

    if (lastMonthTotal > 0) {
        const change = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
        if (change > 0) {
            insights.push({
                id: "spending-increase",
                title: "Spending Increased",
                description: `You've spent ${Math.abs(Math.round(change))}% more this month compared to last month. Current total: ${formatCurrency(thisMonthTotal)}.`,
                type: "warning",
                icon: "📈",
                value: formatCurrency(thisMonthTotal),
                change: Math.round(change),
            });
        } else {
            insights.push({
                id: "spending-decrease",
                title: "Great Savings!",
                description: `Your spending decreased by ${Math.abs(Math.round(change))}% compared to last month. Keep it up!`,
                type: "achievement",
                icon: "🎉",
                value: formatCurrency(thisMonthTotal),
                change: Math.round(change),
            });
        }
    }

    // find highest spending category this month
    const categorySpending: Record<string, number> = {};
    thisMonthTxns.forEach((t) => {
        categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
    });

    const topCategory = Object.entries(categorySpending).sort(
        ([, a], [, b]) => b - a
    )[0];

    if (topCategory) {
        insights.push({
            id: "top-category",
            title: "Top Spending Category",
            description: `${topCategory[0]} is your highest spending category this month at ${formatCurrency(topCategory[1])}.`,
            type: "info",
            icon: "📊",
            value: formatCurrency(topCategory[1]),
        });
    }

    // find most frequent merchant
    const merchantCount: Record<string, number> = {};
    transactions.slice(0, 30).forEach((t) => {
        merchantCount[t.merchant] = (merchantCount[t.merchant] || 0) + 1;
    });

    const topMerchant = Object.entries(merchantCount).sort(
        ([, a], [, b]) => b - a
    )[0];

    if (topMerchant) {
        insights.push({
            id: "frequent-merchant",
            title: "Most Frequent Merchant",
            description: `You've visited ${topMerchant[0]} ${topMerchant[1]} times recently. It's your go-to place!`,
            type: "info",
            icon: "🏪",
            value: `${topMerchant[1]} visits`,
        });
    }

    // category comparison with last month
    const lastMonthCategorySpending: Record<string, number> = {};
    lastMonthTxns.forEach((t) => {
        lastMonthCategorySpending[t.category] =
            (lastMonthCategorySpending[t.category] || 0) + t.amount;
    });

    Object.entries(categorySpending).forEach(([cat, amount]) => {
        const lastAmount = lastMonthCategorySpending[cat] || 0;
        if (lastAmount > 0) {
            const change = ((amount - lastAmount) / lastAmount) * 100;
            if (Math.abs(change) > 15) {
                insights.push({
                    id: `category-change-${cat}`,
                    title: `${cat} ${change > 0 ? "Increased" : "Decreased"}`,
                    description: `${cat} spending ${change > 0 ? "increased" : "decreased"} by ${Math.abs(Math.round(change))}% compared to last month.`,
                    type: change > 0 ? "increase" : "decrease",
                    icon: change > 0 ? "⬆️" : "⬇️",
                    change: Math.round(change),
                });
            }
        }
    });

    // budget warnings
    categories.forEach((cat) => {
        const spent = categorySpending[cat.name] || 0;
        if (cat.budget_limit > 0 && spent > cat.budget_limit * 0.8) {
            const percentage = Math.round((spent / cat.budget_limit) * 100);
            insights.push({
                id: `budget-warning-${cat.name}`,
                title: `${cat.name} Budget Alert`,
                description: `You've used ${percentage}% of your ${cat.name} budget (${formatCurrency(spent)} of ${formatCurrency(cat.budget_limit)}).`,
                type: percentage >= 100 ? "warning" : "info",
                icon: percentage >= 100 ? "🚨" : "⚠️",
                value: `${percentage}%`,
            });
        }
    });

    // average daily spending
    if (thisMonthTxns.length > 0) {
        const dayOfMonth = now.getDate();
        const avgDaily = thisMonthTotal / dayOfMonth;
        insights.push({
            id: "daily-average",
            title: "Daily Average",
            description: `Your average daily spending this month is ${formatCurrency(avgDaily)}.`,
            type: "info",
            icon: "📅",
            value: formatCurrency(avgDaily),
        });
    }

    // weekend vs weekday spending
    const weekendTxns = thisMonthTxns.filter((t) => {
        const day = new Date(t.date).getDay();
        return day === 0 || day === 6;
    });
    const weekdayTxns = thisMonthTxns.filter((t) => {
        const day = new Date(t.date).getDay();
        return day !== 0 && day !== 6;
    });

    const weekendTotal = weekendTxns.reduce((sum, t) => sum + t.amount, 0);
    const weekdayTotal = weekdayTxns.reduce((sum, t) => sum + t.amount, 0);

    if (weekendTotal > weekdayTotal * 0.5) {
        insights.push({
            id: "weekend-spending",
            title: "Weekend Spender",
            description: `You spend ${formatCurrency(weekendTotal)} on weekends vs ${formatCurrency(weekdayTotal)} on weekdays this month.`,
            type: "info",
            icon: "🎭",
        });
    }

    return insights;
}
