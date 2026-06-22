"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { getAuditLogsMaster } from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Loader2, 
    ShieldAlert, 
    History, 
    Eye, 
    Download, 
    ArrowUpDown, 
    Search,
    Calendar,
    User,
    Activity,
    X,
    Filter
} from "lucide-react";

import { getMyPermissions } from "@/app/dashboard/users/actions";

interface AuditLogItem {
    id: string;
    action: string;
    targetType: string;
    targetId: string | null;
    metadata: Record<string, unknown> | null;
    loggedAt: Date;
    userName: string | null;
    userEmail: string | null;
}

export default function AuditLogsMasterPage() {
    const { data: session, isPending: sessionPending } = useSession();
    const [logs, setLogs] = useState<AuditLogItem[]>([]);
    const [filteredLogs, setFilteredLogs] = useState<AuditLogItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const [myPermissions, setMyPermissions] = useState<Record<string, { canAccess: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean }>>({});
    const [loadingMyPerms, setLoadingMyPerms] = useState(true);

    // Modal details
    const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Search and filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [actionFilter, setActionFilter] = useState("all");
    const [sortField, setSortField] = useState<"loggedAt" | "action" | "targetType">("loggedAt");
    const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const fetchMyPermissions = async () => {
        setLoadingMyPerms(true);
        const res = await getMyPermissions();
        if (res.success && res.permissions) {
            setMyPermissions(res.permissions);
        }
        setLoadingMyPerms(false);
    };

    const fetchLogs = async () => {
        setIsLoading(true);
        const result = await getAuditLogsMaster();
        if (result.success && result.logs) {
            setLogs(result.logs as AuditLogItem[]);
            setFilteredLogs(result.logs as AuditLogItem[]);
        } else {
            setError(result.error || "Failed to load audit logs");
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (session?.user) {
            fetchLogs();
            fetchMyPermissions();
        }
    }, [session]);

    // Apply filtering and sorting
    useEffect(() => {
        let result = [...logs];

        // Apply search
        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (log) =>
                    log.action.toLowerCase().includes(query) ||
                    log.targetType.toLowerCase().includes(query) ||
                    (log.userName && log.userName.toLowerCase().includes(query)) ||
                    (log.userEmail && log.userEmail.toLowerCase().includes(query)) ||
                    (log.targetId && log.targetId.toLowerCase().includes(query))
            );
        }

        // Apply action type filter
        if (actionFilter !== "all") {
            result = result.filter((log) => log.action.toLowerCase() === actionFilter.toLowerCase());
        }

        // Apply sorting
        result.sort((a, b) => {
            let valA: string | number = "";
            let valB: string | number = "";

            if (sortField === "loggedAt") {
                valA = new Date(a.loggedAt).getTime();
                valB = new Date(b.loggedAt).getTime();
            } else {
                valA = String(a[sortField] || "").toLowerCase();
                valB = String(b[sortField] || "").toLowerCase();
            }

            if (valA < valB) return sortDirection === "asc" ? -1 : 1;
            if (valA > valB) return sortDirection === "asc" ? 1 : -1;
            return 0;
        });

        setFilteredLogs(result);
        setCurrentPage(1);
    }, [logs, searchQuery, actionFilter, sortField, sortDirection]);

    if (sessionPending || loadingMyPerms) {
        return (
            <div className="flex flex-1 items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // Dynamic Access Control Check
    const userRole = (session?.user as { role?: string })?.role;
    const isAuthorized = userRole === "admin" || myPermissions["audit-logs"]?.canAccess;

    if (!session || !isAuthorized) {
        return (
            <div className="p-6 max-w-lg mx-auto mt-12">
                <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-2">
                            <ShieldAlert className="h-12 w-12 text-red-600 dark:text-red-400" />
                        </div>
                        <CardTitle className="text-red-700 dark:text-red-400">Akses Ditolak (Unauthorized)</CardTitle>
                        <CardDescription className="text-red-600/80 dark:text-red-400/80">
                            Halaman ini hanya dapat diakses oleh aktor **Super Admin**. Peran Anda saat ini adalah **{userRole || "Guest"}**.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    const toggleSort = (field: "loggedAt" | "action" | "targetType") => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("desc");
        }
    };

    const handleOpenDetails = (log: AuditLogItem) => {
        setSelectedLog(log);
        setIsModalOpen(true);
    };

    const handleExportCSV = () => {
        const headers = ["ID", "Action", "Target Type", "Target ID", "User", "Email", "Logged At", "Metadata"];
        const rows = filteredLogs.map((log) => [
            log.id,
            log.action,
            log.targetType,
            log.targetId || "",
            log.userName || "",
            log.userEmail || "",
            new Date(log.loggedAt).toISOString(),
            JSON.stringify(log.metadata || {}).replace(/"/g, '""'),
        ]);

        const csvContent =
            "data:text/csv;charset=utf-8," +
            [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `audit_logs_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Calculate scorecard statistics
    const totalLogs = logs.length;
    const uniqueUsers = new Set(logs.map((l) => l.userEmail).filter(Boolean)).size;
    const loginCount = logs.filter((l) => l.action.toLowerCase().includes("login") || l.action.toLowerCase().includes("auth")).length;
    const dataChangeCount = logs.filter((l) => 
        l.action.toLowerCase().includes("create") || 
        l.action.toLowerCase().includes("update") || 
        l.action.toLowerCase().includes("delete")
    ).length;

    const formatDate = (dateObj: Date) => {
        return new Date(dateObj).toLocaleDateString("id-ID", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
    };

    // Unique actions list for dropdown filter
    const uniqueActions = Array.from(new Set(logs.map((l) => l.action)));

    // Pagination calculations
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

    const getPageNumbers = () => {
        const pageNumbers = [];
        const maxPageButtons = 5;
        if (totalPages <= maxPageButtons) {
            for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            if (currentPage <= 3) {
                pageNumbers.push(1, 2, 3, 4, "ellipsis-right", totalPages);
            } else if (currentPage >= totalPages - 2) {
                pageNumbers.push(1, "ellipsis-left", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pageNumbers.push(1, "ellipsis-left", currentPage - 1, currentPage, currentPage + 1, "ellipsis-right", totalPages);
            }
        }
        return pageNumbers;
    };

    return (
        <div className="p-4 md:p-6 w-full flex flex-1 flex-col gap-6 select-none relative">
            
            {/* Breadcrumbs */}
            <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Audit Logs / <span className="text-blue-600 font-semibold">Activity Trail</span>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-parkinsans tracking-tight">System Audit Trail</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Compliance & activity records tracking all system operations. <span className="text-blue-600 font-bold">{logs.length} total events logged.</span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={handleExportCSV} variant="outline" className="gap-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg h-10 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        <Download className="h-4 w-4 text-slate-400" /> Export CSV
                    </Button>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400">
                    <span className="text-sm font-medium">{error}</span>
                </div>
            )}

            {/* Scorecards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl p-2 relative overflow-hidden transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Aktivitas</span>
                        <div className="h-8 w-8 bg-blue-50 dark:bg-blue-950/40 rounded-lg flex items-center justify-center">
                            <History className="h-4 w-4 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="text-2xl font-extrabold text-slate-950 dark:text-white font-parkinsans">{totalLogs} Record</div>
                        <p className="text-[10px] font-semibold text-slate-400 mt-2 font-mono">
                            SELURUH AUDIT LOG TERSIMPAN
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl p-2 relative overflow-hidden transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Aktor Aktif</span>
                        <div className="h-8 w-8 bg-purple-50 dark:bg-purple-950/40 rounded-lg flex items-center justify-center">
                            <User className="h-4 w-4 text-purple-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="text-2xl font-extrabold text-slate-950 dark:text-white font-parkinsans">{uniqueUsers} User</div>
                        <p className="text-[10px] font-semibold text-slate-400 mt-2">
                            PENGGUNA BERTRANSAKSI
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl p-2 relative overflow-hidden transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Aktivitas Autentikasi</span>
                        <div className="h-8 w-8 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg flex items-center justify-center">
                            <Activity className="h-4 w-4 text-emerald-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="text-2xl font-extrabold text-slate-950 dark:text-white font-parkinsans">{loginCount} Log</div>
                        <p className="text-[10px] font-semibold text-slate-400 mt-2">
                            SESI LOGIN & LOGOUT SISTEM
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl p-2 relative overflow-hidden transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Perubahan Data</span>
                        <div className="h-8 w-8 bg-amber-50 dark:bg-amber-950/40 rounded-lg flex items-center justify-center">
                            <Filter className="h-4 w-4 text-amber-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="text-2xl font-extrabold text-slate-950 dark:text-white font-parkinsans">{dataChangeCount} Mutasi</div>
                        <p className="text-[10px] font-semibold text-slate-400 mt-2">
                            CREATE, UPDATE, DELETE RECORDS
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Controls panel: Filter Tabs, Search and Multi-select filtering */}
            <div className="flex flex-col gap-4 bg-white dark:bg-slate-950 p-4 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm">
                
                {/* Search query input */}
                <div className="relative w-full">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search logs by action, target type, user email, or id..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl text-sm h-10 w-full"
                    />
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-t pt-3">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                            <Filter className="h-3 w-3" /> Filter by:
                        </span>
                        
                        {/* Action Filter Selector */}
                        <select
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="h-9 rounded-lg border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 px-3 py-1 text-xs font-semibold focus-visible:outline-none w-48 text-slate-700 dark:text-slate-300"
                        >
                            <option value="all">All Actions</option>
                            {uniqueActions.map((act) => (
                                <option key={act} value={act}>{act}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* List Table Card */}
            <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl overflow-hidden transition-all">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 font-medium">No logs found matching query filters.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/30">
                                        <th className="px-5 py-3 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-250" onClick={() => toggleSort("action")}>
                                            <div className="flex items-center gap-1.5">
                                                Aksi <ArrowUpDown className="h-3 w-3" />
                                            </div>
                                        </th>
                                        <th className="px-5 py-3 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-250" onClick={() => toggleSort("targetType")}>
                                            <div className="flex items-center gap-1.5">
                                                Objek Master <ArrowUpDown className="h-3 w-3" />
                                            </div>
                                        </th>
                                        <th className="px-5 py-3">User Pengoperasi</th>
                                        <th className="px-5 py-3 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-250" onClick={() => toggleSort("loggedAt")}>
                                            <div className="flex items-center gap-1.5">
                                                Waktu Kejadian <ArrowUpDown className="h-3 w-3" />
                                            </div>
                                        </th>
                                        <th className="px-5 py-3 text-right">Detail</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                                    {currentItems.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors group">
                                            <td className="px-5 py-3.5">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-semibold tracking-wide ${
                                                    log.action.toLowerCase().includes("create") || log.action.toLowerCase().includes("insert") ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400" :
                                                    log.action.toLowerCase().includes("update") || log.action.toLowerCase().includes("edit") ? "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400" :
                                                    log.action.toLowerCase().includes("delete") || log.action.toLowerCase().includes("remove") ? "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400" :
                                                    "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-400"
                                                }`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors">{log.targetType}</div>
                                                {log.targetId && (
                                                    <div className="text-[10px] font-mono text-slate-400 truncate max-w-[150px] mt-0.5" title={log.targetId}>ID: {log.targetId}</div>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="font-bold text-slate-800 dark:text-slate-200">{log.userName || "Sistem"}</div>
                                                <div className="text-xs text-slate-400 font-mono mt-0.5">{log.userEmail || "automated-process"}</div>
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                    {formatDate(log.loggedAt)}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                <Button size="icon" variant="ghost" onClick={() => handleOpenDetails(log)} className="h-8 w-8 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-md">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-2">
                    <div className="text-xs font-semibold text-slate-400">
                        Showing <span className="text-slate-700 dark:text-slate-300">{indexOfFirstItem + 1}</span> to <span className="text-slate-700 dark:text-slate-300">{Math.min(indexOfLastItem, filteredLogs.length)}</span> of <span className="text-slate-700 dark:text-slate-300">{filteredLogs.length}</span> records
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Button 
                            disabled={currentPage === 1} 
                            onClick={() => setCurrentPage(currentPage - 1)}
                            variant="outline" 
                            size="sm"
                            className="h-8 w-8 p-0 rounded-lg"
                        >
                            &lt;
                        </Button>
                        {getPageNumbers().map((pageNum, idx) => {
                            if (pageNum === "ellipsis-left" || pageNum === "ellipsis-right") {
                                return (
                                    <span key={`ellipsis-${idx}`} className="text-slate-400 dark:text-slate-500 text-xs px-1 select-none font-bold">
                                        ...
                                    </span>
                                );
                            }
                            const pageVal = pageNum as number;
                            return (
                                <Button
                                    key={pageVal}
                                    onClick={() => setCurrentPage(pageVal)}
                                    variant={currentPage === pageVal ? "default" : "outline"}
                                    size="sm"
                                    className={`h-8 w-8 p-0 rounded-lg text-xs font-bold ${currentPage === pageVal ? "bg-blue-600 text-white" : ""}`}
                                >
                                    {pageVal}
                                </Button>
                            );
                        })}
                        <Button 
                            disabled={currentPage === totalPages} 
                            onClick={() => setCurrentPage(currentPage + 1)}
                            variant="outline" 
                            size="sm"
                            className="h-8 w-8 p-0 rounded-lg"
                        >
                            &gt;
                        </Button>
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {isModalOpen && selectedLog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-opacity duration-300">
                    <Card className="w-full max-w-lg bg-white dark:bg-slate-950 shadow-xl border border-slate-200 dark:border-slate-800 transform transition-all duration-300 scale-100 rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <CardHeader className="relative border-b pb-4 bg-slate-50/50 dark:bg-slate-900/50">
                            <CardTitle className="text-lg font-bold font-parkinsans flex items-center gap-2 text-slate-900 dark:text-white">
                                <History className="h-5 w-5 text-blue-600" /> Audit Log Payload
                            </CardTitle>
                            <CardDescription>
                                Metadata teknis yang dipicu pada peristiwa aktivitas ini.
                            </CardDescription>
                            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 dark:hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-xs font-semibold text-slate-400 block uppercase">Operasi Aksi</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedLog.action}</span>
                                </div>
                                <div>
                                    <span className="text-xs font-semibold text-slate-400 block uppercase">Objek Master</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedLog.targetType}</span>
                                </div>
                                <div>
                                    <span className="text-xs font-semibold text-slate-400 block uppercase">Dioperasikan Oleh</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedLog.userName || "System"}</span>
                                    <span className="text-xs text-slate-400 block font-mono mt-0.5">{selectedLog.userEmail || "automated-process"}</span>
                                </div>
                                <div>
                                    <span className="text-xs font-semibold text-slate-400 block uppercase">Waktu Peristiwa</span>
                                    <span className="text-slate-700 dark:text-slate-300 block font-medium">{formatDate(selectedLog.loggedAt)}</span>
                                </div>
                            </div>

                            {selectedLog.targetId && (
                                <div className="border-t pt-3">
                                    <span className="text-xs font-semibold text-slate-400 block uppercase">Target ID Objek</span>
                                    <code className="text-xs font-mono bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded select-all block mt-1 dark:text-slate-350 text-slate-800">
                                        {selectedLog.targetId}
                                    </code>
                                </div>
                            )}

                            <div className="border-t pt-3">
                                <span className="text-xs font-semibold text-slate-400 block uppercase mb-1">Payload Metadata JSON</span>
                                <pre className="text-xs font-mono bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto max-h-64 scrollbar-thin">
                                    {JSON.stringify(selectedLog.metadata || {}, null, 2)}
                                </pre>
                            </div>
                        </CardContent>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
                            <Button type="button" onClick={() => setIsModalOpen(false)} className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg font-semibold h-10 px-4">
                                Close Details
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
