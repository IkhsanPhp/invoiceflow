"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, Briefcase, FileText, CheckCircle2, Clock, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SuperAdminDashboard({ stats }: { stats: any }) {
    if (!stats || !stats.success) return <div className="p-8 text-center">Failed to load dashboard data</div>;

    const { 
        totalOutstanding, 
        overdue, 
        upcoming7Days, 
        bottleneckProcurement, 
        bottleneckFinance, 
        pendingVendors, 
        recentActivity 
    } = stats;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    };

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6 w-full">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Superadmin Overview</h1>
                <p className="text-muted-foreground mt-1">System-wide performance and operational bottlenecks.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-white dark:bg-slate-950 border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Outstanding</CardTitle>
                        <FileText className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Unpaid invoices in system</p>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-950 border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Invoices</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{overdue}</div>
                        <p className="text-xs text-muted-foreground mt-1">Requires immediate attention</p>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-950 border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Due in 7 Days</CardTitle>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{upcoming7Days}</div>
                        <p className="text-xs text-muted-foreground mt-1">Approaching TOP deadline</p>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-950 border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Procurement Bottleneck</CardTitle>
                        <Activity className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-indigo-600">{bottleneckProcurement}</div>
                        <p className="text-xs text-muted-foreground mt-1">Invoices pending initial check</p>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-950 border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Finance Bottleneck</CardTitle>
                        <Activity className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">{bottleneckFinance}</div>
                        <p className="text-xs text-muted-foreground mt-1">Invoices pending tax check</p>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-950 border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending Vendors</CardTitle>
                        <Briefcase className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{pendingVendors}</div>
                        <p className="text-xs text-muted-foreground mt-1">Waiting registration approval</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity classified by role */}
            <Card className="w-full bg-white dark:bg-slate-950 border-slate-200 shadow-sm mt-4">
                <CardHeader>
                    <CardTitle>Recent System Activity</CardTitle>
                    <CardDescription>Latest actions taken by users across different roles.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {recentActivity && recentActivity.length > 0 ? (
                            recentActivity.map((activity: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                                    <div className={`p-2 rounded-full ${activity.userRole === 'vendor' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                        {activity.userRole === 'vendor' ? <Briefcase className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium leading-none">
                                            {activity.action} - <span className="text-slate-500 font-normal">{activity.targetType}</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            By {activity.userName} ({activity.userRole})
                                        </p>
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        {new Date(activity.loggedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-slate-500">No recent activity.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
