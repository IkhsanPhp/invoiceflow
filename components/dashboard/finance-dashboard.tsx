"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertOctagon, TrendingUp, FileSignature } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function FinanceDashboard({ stats }: { stats: any }) {
    if (!stats || !stats.success) return <div className="p-8 text-center">Failed to load dashboard data</div>;

    const { 
        readyForFinal, 
        readyForPayment, 
        cashflowThisWeek, 
        paymentFailed,
        cashflowChart,
        recentInvoices
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
                        <div className="text-2xl font-bold text-indigo-600">{formatCurrency(cashflowThisWeek)}</div>
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

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="bg-white dark:bg-slate-950 border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>Cashflow Projection (Next 7 Days)</CardTitle>
                        <CardDescription>Estimated outgoing funds based on invoice due dates.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={cashflowChart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis 
                                        stroke="#888888" 
                                        fontSize={12} 
                                        tickLine={false} 
                                        axisLine={false}
                                        tickFormatter={(val) => `Rp ${(val/1000000).toFixed(0)}M`}
                                    />
                                    <Tooltip 
                                        cursor={{fill: 'rgba(0,0,0,0.05)'}}
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                        formatter={(val: number) => formatCurrency(val)}
                                    />
                                    <Bar dataKey="Projected CashOut" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-950 border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Upcoming Verifications & Payments</CardTitle>
                            <CardDescription>Invoices waiting for finance action.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/dashboard/invoice-hub">View All</Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentInvoices && recentInvoices.length > 0 ? (
                                recentInvoices.map((inv: any) => (
                                    <div key={inv.id} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                                        <div>
                                            <p className="font-medium">{inv.invoiceNumber}</p>
                                            <p className="text-xs text-muted-foreground">{inv.vendorName}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-medium text-sm">{formatCurrency(inv.totalAmount)}</div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                Due: {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('id-ID') : '-'}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">No invoices needing attention.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
