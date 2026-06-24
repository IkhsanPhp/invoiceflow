"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, FileCheck, RefreshCw, Send } from "lucide-react";

export function ProcurementDashboard({ stats }: { stats: any }) {
    if (!stats || !stats.success) return <div className="p-8 text-center">Failed to load dashboard data</div>;

    const { 
        pendingVendors, 
        pendingInitial, 
        waitingRevision, 
        documentsInTransit 
    } = stats;

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6 w-full">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Procurement Overview</h1>
                <p className="text-muted-foreground mt-1">Manage vendor registrations and initial document verifications.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-white dark:bg-slate-950 border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending Vendor Approvals</CardTitle>
                        <Briefcase className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{pendingVendors}</div>
                        <p className="text-xs text-muted-foreground mt-1">Vendors waiting to be verified</p>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-950 border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending Initial Check</CardTitle>
                        <FileCheck className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{pendingInitial}</div>
                        <p className="text-xs text-muted-foreground mt-1">Invoices awaiting DO/PO match</p>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-950 border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Waiting for Revision</CardTitle>
                        <RefreshCw className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{waitingRevision}</div>
                        <p className="text-xs text-muted-foreground mt-1">Invoices returned to vendor</p>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-950 border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Physical Docs In Transit</CardTitle>
                        <Send className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">{documentsInTransit}</div>
                        <p className="text-xs text-muted-foreground mt-1">Confirmed sent by vendor</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
