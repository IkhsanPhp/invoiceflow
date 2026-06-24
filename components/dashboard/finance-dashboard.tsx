"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertOctagon, TrendingUp, FileSignature } from "lucide-react";

export function FinanceDashboard({ stats }: { stats: any }) {
    if (!stats || !stats.success) return <div className="p-8 text-center">Failed to load dashboard data</div>;

    const { 
        readyForFinal, 
        readyForPayment, 
        cashflowThisWeek, 
        paymentFailed 
    } = stats;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    };

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6 w-full">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Finance Overview</h1>
                <p className="text-muted-foreground mt-1">Manage final tax verifications, cashflow projections, and payments.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-white dark:bg-slate-950 border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Ready for Final Verif</CardTitle>
                        <FileSignature className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{readyForFinal}</div>
                        <p className="text-xs text-muted-foreground mt-1">Pending tax document checks</p>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-950 border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Ready for Payment</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">{readyForPayment}</div>
                        <p className="text-xs text-muted-foreground mt-1">Approved & awaiting execution</p>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-950 border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Due This Week</CardTitle>
                        <TrendingUp className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(cashflowThisWeek)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Cashflow projection</p>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-950 border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Payment Issues</CardTitle>
                        <AlertOctagon className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{paymentFailed}</div>
                        <p className="text-xs text-muted-foreground mt-1">Failed or rejected transactions</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
