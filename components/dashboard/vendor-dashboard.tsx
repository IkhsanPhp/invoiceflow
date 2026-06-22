"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { FileText, Users, Briefcase, Activity, Clock, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function VendorDashboard({ stats }: { stats: any }) {
    if (!stats) return <div className="p-8 text-center">Failed to load dashboard data</div>;

    const { kpis, recentInvoices, chartData } = stats;

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6 w-full">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Vendor Overview</h1>
                <p className="text-muted-foreground mt-1">Monitor your invoice submissions and status.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoices</CardTitle>
                        <FileText className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpis.totalInvoices}</div>
                        <p className="text-xs text-muted-foreground mt-1">Processed by system</p>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending Invoices</CardTitle>
                        <Activity className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-500">{kpis.pendingInvoices}</div>
                        <p className="text-xs text-muted-foreground mt-1">In review or processing</p>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Rejected Invoices</CardTitle>
                        <XCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{kpis.rejectedInvoices}</div>
                        <p className="text-xs text-muted-foreground mt-1">Require your attention</p>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Verified & Paid</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">{kpis.verifiedInvoices}</div>
                        <p className="text-xs text-muted-foreground mt-1">Successfully processed</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 md:grid-cols-7">
                {/* Chart */}
                <Card className="md:col-span-4 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader>
                        <CardTitle>Invoice Processing Volume (30 Days)</CardTitle>
                        <CardDescription>Daily breakdown of invoice submissions and their current status.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-0">
                        <div className="h-[300px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorVerified" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorRejected" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                        itemStyle={{ fontSize: '13px', fontWeight: 500 }}
                                    />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <Area type="monotone" dataKey="Verified" stroke="#10b981" fillOpacity={1} fill="url(#colorVerified)" strokeWidth={2} />
                                    <Area type="monotone" dataKey="Pending" stroke="#f59e0b" fillOpacity={1} fill="url(#colorPending)" strokeWidth={2} />
                                    <Area type="monotone" dataKey="Rejected" stroke="#ef4444" fillOpacity={1} fill="url(#colorRejected)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Invoices */}
                <Card className="md:col-span-3 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                    <CardHeader>
                        <CardTitle>Recent Invoices</CardTitle>
                        <CardDescription>Latest submissions requiring attention.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-4">
                        {recentInvoices.length === 0 ? (
                            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground border border-dashed rounded-md p-8">
                                No recent invoices found.
                            </div>
                        ) : (
                            recentInvoices.map((inv: any) => (
                                <div key={inv.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${
                                            inv.status === 'Verified' ? 'bg-emerald-100 text-emerald-600' : 
                                            inv.status === 'Rejected' ? 'bg-red-100 text-red-600' : 
                                            'bg-amber-100 text-amber-600'
                                        }`}>
                                            {inv.status === 'Verified' ? <CheckCircle2 className="h-4 w-4" /> : 
                                             inv.status === 'Rejected' ? <XCircle className="h-4 w-4" /> : 
                                             <Clock className="h-4 w-4" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium leading-none">{inv.invoiceNumber}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {new Date(inv.createdAt).toLocaleDateString("id-ID", { month: "short", day: "numeric", year: "numeric" })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium">{inv.totalAmount ? `Rp ${parseFloat(inv.totalAmount).toLocaleString('id-ID')}` : '-'}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{inv.status}</p>
                                    </div>
                                </div>
                            ))
                        )}
                        <Button variant="outline" className="w-full mt-auto" asChild>
                            <Link href="/dashboard/invoice-hub">
                                View All Invoices <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>


        </div>
    );
}
