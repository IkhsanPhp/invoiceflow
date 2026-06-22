"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { FileText, Users, Briefcase, Activity, Clock, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SuperAdminDashboard({ stats }: { stats: any }) {
    if (!stats) return <div className="p-8 text-center">Failed to load dashboard data</div>;

    const { kpis, recentInvoices, pendingVendors, chartData, statusDistribution, topVendors, verificationStats, recentActivity } = stats;

    const COLORS = ['#0ea5e9', '#f59e0b', '#10b981', '#64748b', '#ef4444', '#8b5cf6'];

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6 w-full">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Overview</h1>
                <p className="text-muted-foreground mt-1">Super Admin dashboard for system-wide metrics.</p>
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
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending Verification</CardTitle>
                        <Activity className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-500">{kpis.pendingVerifications}</div>
                        <p className="text-xs text-muted-foreground mt-1">Require admin action</p>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Vendors</CardTitle>
                        <Briefcase className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpis.activeVendors}</div>
                        <p className="text-xs text-muted-foreground mt-1">Registered suppliers</p>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpis.totalUsers}</div>
                        <p className="text-xs text-muted-foreground mt-1">Across all roles</p>
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
                                            <p className="text-xs text-muted-foreground mt-1">{inv.vendorName || "Unknown Vendor"}</p>
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

            {/* Additional Analytics Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Status Distribution Donut Chart */}
                <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader>
                        <CardTitle>Invoice Status Distribution</CardTitle>
                        <CardDescription>Breakdown by current status</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {statusDistribution?.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                        itemStyle={{ fontSize: '13px', fontWeight: 500 }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Vendors Bar Chart */}
                <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader>
                        <CardTitle>Top Vendors by Volume</CardTitle>
                        <CardDescription>Highest value invoice submissions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={topVendors}
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" tickFormatter={(value) => `Rp${value / 1000000}M`} />
                                    <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 11}} />
                                    <Tooltip 
                                        formatter={(value: any) => [`Rp ${parseFloat(value).toLocaleString('id-ID')}`, 'Total Value']}
                                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                    />
                                    <Bar dataKey="totalValue" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Verification Success Rate */}
                <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader>
                        <CardTitle>Verification Analysis</CardTitle>
                        <CardDescription>Pass vs Fail by Section</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={verificationStats}>
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="section" tick={{fontSize: 12}} />
                                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                                    <Radar name="Passed" dataKey="passed" stroke="#10b981" fill="#10b981" fillOpacity={0.5} />
                                    <Radar name="Failed" dataKey="failed" stroke="#ef4444" fill="#ef4444" fillOpacity={0.5} />
                                    <Legend />
                                    <Tooltip />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent Activity Feed */}
                <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>System-wide audit trail.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentActivity?.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
                            ) : (
                                recentActivity?.map((activity: any, index: number) => (
                                    <div key={index} className="flex items-start gap-4">
                                        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full mt-0.5">
                                            <Activity className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm">
                                                <span className="font-medium">{activity.userName}</span>{' '}
                                                {activity.action} <span className="font-medium text-slate-700 dark:text-slate-300">{activity.targetType}</span>
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {new Date(activity.loggedAt).toLocaleString("id-ID")}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

            {/* Pending Vendors */}
            {pendingVendors.length > 0 && (
                <div className="grid gap-6 md:grid-cols-1">
                    <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardHeader>
                            <CardTitle>Pending Vendor Registrations</CardTitle>
                            <CardDescription>Vendors waiting for audit and approval.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-900 border-b">
                                        <tr>
                                            <th className="px-4 py-3 font-medium text-slate-500">Vendor Name</th>
                                            <th className="px-4 py-3 font-medium text-slate-500">Type</th>
                                            <th className="px-4 py-3 font-medium text-slate-500">Registration Date</th>
                                            <th className="px-4 py-3 font-medium text-slate-500 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {pendingVendors.map((v: any) => (
                                            <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                                                <td className="px-4 py-3 font-medium">{v.nameOfVendor}</td>
                                                <td className="px-4 py-3 text-muted-foreground capitalize">{v.vendorType ? v.vendorType.replace('_', ' ') : '-'}</td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {new Date(v.createdAt).toLocaleDateString("id-ID", { year: 'numeric', month: 'long', day: 'numeric' })}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button size="sm" variant="ghost" asChild>
                                                        <Link href={`/dashboard/vendors/verify/${v.id}`}>
                                                            Review
                                                        </Link>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
            </div>
        </div>
    );
}
