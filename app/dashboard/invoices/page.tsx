"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { getInvoicesMaster } from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Loader2, 
    ShieldAlert, 
    FileText, 
    CheckCircle2, 
    TrendingUp, 
    AlertTriangle,
    Search
} from "lucide-react";

import { getMyPermissions } from "@/app/dashboard/users/actions";

interface InvoiceItem {
    id: string;
    invoiceNumber: string;
    issueDate: Date | null;
    dueDate: Date | null;
    totalAmount: string | null;
    status: string;
    vendorName: string | null;
    vendorEmail: string | null;
    createdAt: Date;
}

export default function InvoicesMasterPage() {
    const { data: session, isPending: sessionPending } = useSession();
    const [invoicesList, setInvoicesList] = useState<InvoiceItem[]>([]);
    const [filteredInvoices, setFilteredInvoices] = useState<InvoiceItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const [myPermissions, setMyPermissions] = useState<Record<string, { canAccess: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean }>>({});
    const [loadingMyPerms, setLoadingMyPerms] = useState(true);

    // Search, tabs, and pagination states
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"all" | "verified" | "pending_ocr" | "in_review" | "needs_revision">("all");
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

    const fetchInvoices = async () => {
        setIsLoading(true);
        const result = await getInvoicesMaster();
        if (result.success && result.invoices) {
            setInvoicesList(result.invoices as InvoiceItem[]);
        } else {
            setError(result.error || "Failed to load invoices");
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (session?.user) {
            fetchInvoices();
            fetchMyPermissions();
        }
    }, [session]);

    // Apply filtering when search query or active tab changes
    useEffect(() => {
        let result = [...invoicesList];
        if (activeTab === "verified") {
            result = result.filter(inv => inv.status === "Verified" || inv.status === "Paid");
        } else if (activeTab === "pending_ocr") {
            result = result.filter(inv => inv.status === "Pending OCR");
        } else if (activeTab === "in_review") {
            result = result.filter(inv => inv.status === "In Review");
        } else if (activeTab === "needs_revision") {
            result = result.filter(inv => inv.status === "Needs Revision");
        }

        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            result = result.filter(inv => 
                inv.invoiceNumber.toLowerCase().includes(query) || 
                (inv.vendorName && inv.vendorName.toLowerCase().includes(query)) ||
                (inv.vendorEmail && inv.vendorEmail.toLowerCase().includes(query))
            );
        }
        setFilteredInvoices(result);
        setCurrentPage(1);
    }, [invoicesList, activeTab, searchQuery]);

    if (sessionPending || loadingMyPerms) {
        return (
            <div className="flex flex-1 items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // Dynamic Access Control Check
    const userRole = (session?.user as { role?: string })?.role;
    const isAuthorized = userRole === "admin" || myPermissions["invoices-master"]?.canAccess;

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

    // Calculate scorecard metrics
    const totalAmountSum = invoicesList.reduce((sum, inv) => sum + parseFloat(inv.totalAmount || "0"), 0);
    const pendingOcrCount = invoicesList.filter(inv => inv.status === "Pending OCR").length;
    const verifiedCount = invoicesList.filter(inv => inv.status === "Verified" || inv.status === "Paid").length;
    const needsRevisionCount = invoicesList.filter(inv => inv.status === "Needs Revision").length;

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(val);
    };

    const formatDate = (dateObj: Date | null) => {
        if (!dateObj) return "-";
        return new Date(dateObj).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" });
    };

    // Pagination calculations
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredInvoices.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);

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
        <div className="p-4 md:p-6 max-w-[1400px] mx-auto flex flex-1 flex-col gap-6 select-none relative">
            
            {/* Breadcrumbs */}
            <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Master Data / <span className="text-blue-600 font-semibold">Invoices</span>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-parkinsans tracking-tight">Master Data Invoices</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Master Data Tagihan & Transaksi Keuangan Sistem. <span className="text-blue-600 font-bold">{invoicesList.length} total records.</span>
                    </p>
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
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Volume Tagihan</span>
                        <div className="h-8 w-8 bg-blue-50 dark:bg-blue-950/40 rounded-lg flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="text-2xl font-extrabold text-slate-950 dark:text-white font-parkinsans">{formatCurrency(totalAmountSum)}</div>
                        <p className="text-xs font-bold text-emerald-600 mt-2 flex items-center gap-1">
                            <span>↗ +12.4% this month</span>
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl p-2 relative overflow-hidden transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Invoices Terverifikasi</span>
                        <div className="h-8 w-8 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg flex items-center justify-center">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="text-2xl font-extrabold text-slate-950 dark:text-white font-parkinsans">{verifiedCount} Tagihan</div>
                        <p className="text-[10px] font-semibold text-slate-400 mt-2">
                            SIAP DIJADWALKAN PEMBAYARAN
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl p-2 relative overflow-hidden transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending OCR Queue</span>
                        <div className="h-8 w-8 bg-blue-50 dark:bg-blue-950/40 rounded-lg flex items-center justify-center">
                            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="text-2xl font-extrabold text-slate-950 dark:text-white font-parkinsans">{pendingOcrCount} Antrean</div>
                        <p className="text-[10px] font-semibold text-slate-400 mt-2">
                            SEDANG DIEKSTRAKSI MESIN OCR
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl p-2 relative overflow-hidden transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Perlu Revisi</span>
                        <div className="h-8 w-8 bg-amber-50 dark:bg-amber-950/40 rounded-lg flex items-center justify-center">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="text-2xl font-extrabold text-slate-950 dark:text-white font-parkinsans">{needsRevisionCount} Tagihan</div>
                        <p className="text-[10px] font-semibold text-amber-600 mt-2">
                            MENUNGGU PERBAIKAN VENDOR
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
                        placeholder="Search invoices by number, vendor name, or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl text-sm h-10 w-full"
                    />
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-t pt-3">
                    
                    {/* Category tabs */}
                    <div className="flex flex-wrap gap-1 bg-slate-50 dark:bg-slate-900 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab("all")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeTab === "all" ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                            }`}
                        >
                            All Invoices ({invoicesList.length})
                        </button>
                        <button
                            onClick={() => setActiveTab("verified")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeTab === "verified" ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                            }`}
                        >
                            Verified ({verifiedCount})
                        </button>
                        <button
                            onClick={() => setActiveTab("pending_ocr")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeTab === "pending_ocr" ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                            }`}
                        >
                            Pending OCR ({pendingOcrCount})
                        </button>
                        <button
                            onClick={() => setActiveTab("in_review")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeTab === "in_review" ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                            }`}
                        >
                            In Review ({invoicesList.filter(inv => inv.status === "In Review").length})
                        </button>
                        <button
                            onClick={() => setActiveTab("needs_revision")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeTab === "needs_revision" ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                            }`}
                        >
                            Needs Revision ({needsRevisionCount})
                        </button>
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
                    ) : filteredInvoices.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 font-medium">No invoices found matching query filters.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/30">
                                        <th className="px-5 py-3">No. Invoice</th>
                                        <th className="px-5 py-3">Vendor</th>
                                        <th className="px-5 py-3">Nominal Tagihan</th>
                                        <th className="px-5 py-3">Tanggal Terbit</th>
                                        <th className="px-5 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                                    {currentItems.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors group">
                                            <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-slate-400" /> {inv.invoiceNumber}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="font-bold text-slate-850 dark:text-slate-205">{inv.vendorName || "Unknown"}</div>
                                                <div className="text-xs text-slate-400 font-mono mt-0.5">{inv.vendorEmail || "-"}</div>
                                            </td>
                                            <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                                                {formatCurrency(parseFloat(inv.totalAmount || "0"))}
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-medium">
                                                {formatDate(inv.issueDate)}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                                                    inv.status === "Paid" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" :
                                                    inv.status === "Verified" ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400" :
                                                    inv.status === "In Review" ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400" :
                                                    inv.status === "Needs Revision" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400" :
                                                    "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-400"
                                                }`}>
                                                    {inv.status}
                                                </span>
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
                        Showing <span className="text-slate-700 dark:text-slate-300">{indexOfFirstItem + 1}</span> to <span className="text-slate-700 dark:text-slate-300">{Math.min(indexOfLastItem, filteredInvoices.length)}</span> of <span className="text-slate-700 dark:text-slate-300">{filteredInvoices.length}</span> invoices
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
        </div>
    );
}
