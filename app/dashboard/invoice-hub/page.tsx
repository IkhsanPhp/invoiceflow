"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { 
    getInvoiceHubData, 
    createInvoiceWithDocs, 
    deleteInvoice 
} from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
    Loader2, 
    ShieldAlert, 
    FileText, 
    CheckCircle2, 
    TrendingUp, 
    AlertTriangle,
    Search,
    Plus,
    Trash2,
    Eye,
    X,
    UploadCloud,
    FileCheck,
    Check,
    History,
    ExternalLink,
    Edit2,
    Clock,
    AlertCircle,
    RefreshCw
} from "lucide-react";
import { getMyPermissions } from "@/app/dashboard/users/actions";
import Link from "next/link";

interface DocItem {
    id: string;
    invoiceId: string;
    docType: string;
    fileUrl: string;
    fileSize: number;
    uploadedAt: Date;
}

interface VerificationItem {
    id: string;
    invoiceId: string;
    section: string;
    passed: boolean;
    comments: string | null;
    checkedBy: string;
    checkedAt: Date;
}

interface AuditLogItem {
    id: string;
    userId: string;
    action: string;
    targetType: string;
    targetId: string | null;
    metadata: unknown;
    loggedAt: Date;
    userName: string | null;
    userEmail: string | null;
}

interface InvoiceHubItem {
    id: string;
    vendorId: string;
    invoiceNumber: string;
    issueDate: Date | null;
    dueDate: Date | null;
    totalAmount: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    vendorName: string | null;
    vendorEmail: string | null;
    termsOfPayment: string | null;
    taxInvoiceNumber: string | null;
    documents: DocItem[];
    verifications: VerificationItem[];
    auditLogs: AuditLogItem[];
}

export default function InvoiceHubPage() {
    const { data: session, isPending: sessionPending } = useSession();
    const [invoices, setInvoices] = useState<InvoiceHubItem[]>([]);
    const [filteredInvoices, setFilteredInvoices] = useState<InvoiceHubItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const [myPermissions, setMyPermissions] = useState<Record<string, { canAccess: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean }>>({});
    const [loadingMyPerms, setLoadingMyPerms] = useState(true);

    // Search and tab filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<string>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Modals & drawers
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<InvoiceHubItem | null>(null);

    // Upload Form States
    const [uploading, setUploading] = useState(false);
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
    const [isInvoiceDragOver, setIsInvoiceDragOver] = useState(false);
    const [supportingFiles, setSupportingFiles] = useState<{ id: string; file: File; type: "tax_invoice" | "delivery_order" | "po" }[]>([]);
    const [invoiceNo, setInvoiceNo] = useState("");
    const [taxInvoiceNo, setTaxInvoiceNo] = useState("");
    const [invoiceAmount, setInvoiceAmount] = useState("");
    const [releaseDate, setReleaseDate] = useState("");


    // PPN calculator states
    const [ppnType, setPpnType] = useState<"1.1" | "11" | "custom">("11");
    const [customPpnRate, setCustomPpnRate] = useState("");

    const fetchMyPermissions = async () => {
        setLoadingMyPerms(true);
        const res = await getMyPermissions();
        if (res.success && res.permissions) {
            setMyPermissions(res.permissions);
        }
        setLoadingMyPerms(false);
    };

    const loadData = async () => {
        setIsLoading(true);
        const res = await getInvoiceHubData();
        if (res.success && res.invoices) {
            setInvoices(res.invoices as InvoiceHubItem[]);
        } else {
            setMessage({ type: "error", text: res.error || "Failed to load invoices." });
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (session?.user) {
            loadData();
            fetchMyPermissions();
        }
    }, [session]);

    // Filtering logic
    useEffect(() => {
        let result = [...invoices];

        if (activeTab !== "all") {
            result = result.filter(inv => inv.status.toLowerCase() === activeTab.toLowerCase());
        }

        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            result = result.filter(inv => 
                inv.invoiceNumber.toLowerCase().includes(query) ||
                (inv.vendorName && inv.vendorName.toLowerCase().includes(query)) ||
                (inv.totalAmount && inv.totalAmount.includes(query))
            );
        }

        setFilteredInvoices(result);
        setCurrentPage(1);
    }, [invoices, searchQuery, activeTab]);

    if (sessionPending || loadingMyPerms) {
        return (
            <div className="flex flex-1 items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const role = (session?.user as { role?: string })?.role || "vendor";
    const isAuthorized = role === "admin" || role === "procurement" || role === "vendor" || myPermissions["invoice-hub"]?.canAccess;

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
                            Peran Anda saat ini adalah **{role}**. Anda tidak memiliki otorisasi untuk mengakses halaman ini.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    // Helper formatting
    const formatCurrency = (val: string | null) => {
        if (!val) return "Rp 0,00";
        return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(parseFloat(val));
    };

    const formatDate = (dateObj: Date | null | string) => {
        if (!dateObj) return "-";
        return new Date(dateObj).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" });
    };

    // Scorecard stats
    const totalCount = invoices.length;
    const inReviewCount = invoices.filter(i => i.status === "In Review").length;
    const verifiedCount = invoices.filter(i => i.status === "Verified").length;
    const revisionCount = invoices.filter(i => i.status === "Needs Revision").length;

    // Handle Upload Supporting Files
    const handleSupportingFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const newFile = e.target.files[0];
            
            const usedTypes = supportingFiles.map(f => f.type);
            let availableType: "tax_invoice" | "delivery_order" | "po" = "tax_invoice";
            if (!usedTypes.includes("tax_invoice")) {
                availableType = "tax_invoice";
            } else if (!usedTypes.includes("delivery_order")) {
                availableType = "delivery_order";
            } else if (!usedTypes.includes("po")) {
                availableType = "po";
            } else {
                alert("Maksimal dokumen pendukung adalah 3 berkas.");
                return;
            }

            setSupportingFiles(prev => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    file: newFile,
                    type: availableType
                }
            ]);
            
            e.target.value = "";
        }
    };

    const handleUpdateSupportingFileType = (id: string, newType: "tax_invoice" | "delivery_order" | "po") => {
        setSupportingFiles(prev => prev.map(f => f.id === id ? { ...f, type: newType } : f));
    };

    const handleRemoveSupportingFile = (id: string) => {
        setSupportingFiles(prev => prev.filter(f => f.id !== id));
    };

    // Handle Upload Document Flow
    const handleOpenUpload = () => {
        setInvoiceFile(null);
        setSupportingFiles([]);
        setIsInvoiceDragOver(false);
        setInvoiceNo("");
        setTaxInvoiceNo("");
        setInvoiceAmount("");
        setReleaseDate("");
        setPpnType("11");
        setCustomPpnRate("");
        setIsUploadOpen(true);
    };

    const calculateGrandTotal = () => {
        const base = parseFloat(invoiceAmount);
        if (isNaN(base) || base <= 0) return 0;
        
        let rate = 0;
        if (ppnType === "1.1") {
            rate = 1.1;
        } else if (ppnType === "11") {
            rate = 11;
        } else {
            const custom = parseFloat(customPpnRate);
            rate = isNaN(custom) ? 0 : custom;
        }
        
        return base + (base * rate) / 100;
    };

    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invoiceFile) {
            alert("Lampiran dokumen invoice wajib diunggah!");
            return;
        }
        if (!invoiceNo.trim() || !invoiceAmount.trim() || !releaseDate) {
            alert("Nomor invoice, nominal invoice, dan tanggal terbit wajib diisi!");
            return;
        }

        setUploading(true);
        setMessage(null);

        try {
            const uploadedDocs: { fileUrl: string; fileSize: number; docType: string }[] = [];

            // Helper function to upload file
            const uploadDoc = async (file: File, type: string) => {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("docType", type);

                const res = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || `Gagal mengunggah file ${type}`);
                }

                const data = await res.json();
                uploadedDocs.push({
                    fileUrl: data.fileUrl,
                    fileSize: data.fileSize,
                    docType: type,
                });
            };

            // 1. Upload Invoice File (Required)
            await uploadDoc(invoiceFile, "invoice");

            // 2. Upload optional files
            for (const sf of supportingFiles) {
                await uploadDoc(sf.file, sf.type);
            }

            const baseAmountNum = parseFloat(invoiceAmount);
            let rate = 0;
            if (ppnType === "1.1") {
                rate = 1.1;
            } else if (ppnType === "11") {
                rate = 11;
            } else {
                const custom = parseFloat(customPpnRate);
                rate = isNaN(custom) ? 0 : custom;
            }
            const ppnAmountNum = (baseAmountNum * rate) / 100;
            const grandTotalNum = baseAmountNum + ppnAmountNum;

            // 3. Call Server Action to create DB records
            const result = await createInvoiceWithDocs({
                invoiceNumber: invoiceNo,
                taxInvoiceNumber: taxInvoiceNo.trim() || undefined,
                issueDate: new Date(releaseDate),
                totalAmount: grandTotalNum.toFixed(2),
                baseAmount: baseAmountNum.toFixed(2),
                ppnRate: rate.toString(),
                ppnAmount: ppnAmountNum.toFixed(2),
                documents: uploadedDocs,
            });

            if (result.success) {
                setMessage({ type: "success", text: "Tagihan baru berhasil dikirim untuk diaudit!" });
                setIsUploadOpen(false);
                loadData();
            } else {
                setMessage({ type: "error", text: result.error || "Gagal membuat invoice." });
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Gagal mengunggah dokumen.";
            setMessage({ type: "error", text: errorMessage });
        } finally {
            setUploading(false);
        }
    };

    // Delete flow
    const handleDelete = (inv: InvoiceHubItem) => {
        setInvoiceToDelete(inv);
    };

    const handleConfirmDelete = async () => {
        if (!invoiceToDelete) return;
        setIsLoading(true);
        const res = await deleteInvoice(invoiceToDelete.id);
        if (res.success) {
            setMessage({ type: "success", text: "Tagihan berhasil dihapus." });
            loadData();
        } else {
            setMessage({ type: "error", text: res.error || "Gagal menghapus tagihan." });
            setIsLoading(false);
        }
        setInvoiceToDelete(null);
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

    // Get primary invoice file URL for viewer
    const getInvoiceUrl = (inv: InvoiceHubItem | null) => {
        if (!inv) return "";
        const doc = inv.documents.find(d => d.docType === "invoice");
        return doc ? doc.fileUrl : "";
    };

return (
        <div className="p-4 md:p-6 max-w-[1400px] mx-auto flex flex-1 flex-col gap-6 select-none relative">
            
            {/* Breadcrumbs */}
            <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Workspace / <span className="text-blue-600 font-semibold">Invoice Hub</span>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-parkinsans tracking-tight">Invoice Hub</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Pusat kolaborasi input dan verifikasi audit tagihan vendor sistem. <span className="text-blue-600 font-bold">{invoices.length} total tagihan.</span>
                    </p>
                </div>
                {(role === "admin" || (role === "vendor" && myPermissions["invoice-hub"]?.canCreate)) && (
                    <div className="flex gap-3">
                        <Button onClick={handleOpenUpload} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2 rounded-lg h-10 px-4 shadow-sm">
                            <Plus className="h-4 w-4" /> Unggah Tagihan Baru
                        </Button>
                    </div>
                )}
            </div>

            {/* Notification alert */}
            {message && (
                <div className={`p-4 rounded-lg flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-3 duration-200 ${
                    message.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400" : "bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400"
                }`}>
                    <div className="flex items-center gap-2.5">
                        {message.type === "success" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <ShieldAlert className="h-5 w-5 text-red-600" />}
                        <span className="text-sm font-semibold">{message.text}</span>
                    </div>
                    <button onClick={() => setMessage(null)} className="opacity-70 hover:opacity-100 transition-opacity">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Scorecards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl p-2 relative overflow-hidden transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Tagihan</span>
                        <div className="h-8 w-8 bg-blue-50 dark:bg-blue-950/40 rounded-lg flex items-center justify-center">
                            <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="text-3xl font-extrabold text-slate-950 dark:text-white font-parkinsans">{totalCount}</div>
                        <p className="text-[10px] font-semibold text-slate-400 mt-2">
                            TOTAL TRANSAKSI TAGIHAN
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl p-2 relative overflow-hidden transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Awaiting Verification</span>
                        <div className="h-8 w-8 bg-amber-50 dark:bg-amber-950/40 rounded-lg flex items-center justify-center">
                            <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="text-3xl font-extrabold text-slate-950 dark:text-white font-parkinsans">{inReviewCount}</div>
                        <p className="text-[10px] font-semibold text-amber-600 mt-2">
                            MENUNGGU PROSES AUDIT
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl p-2 relative overflow-hidden transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Approved / Verified</span>
                        <div className="h-8 w-8 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg flex items-center justify-center">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="text-3xl font-extrabold text-slate-950 dark:text-white font-parkinsans">{verifiedCount}</div>
                        <p className="text-[10px] font-semibold text-emerald-600 mt-2">
                            VERIFIKASI LOLOS AUDIT
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl p-2 relative overflow-hidden transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Needs Revision</span>
                        <div className="h-8 w-8 bg-red-50 dark:bg-red-950/40 rounded-lg flex items-center justify-center">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="text-3xl font-extrabold text-slate-950 dark:text-white font-parkinsans">{revisionCount}</div>
                        <p className="text-[10px] font-semibold text-red-600 mt-2">
                            DIKEMBALIKAN KE VENDOR
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
                        placeholder="Search invoices by number, supplier name, amount..."
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
                            Semua ({totalCount})
                        </button>
                        <button
                            onClick={() => setActiveTab("in review")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeTab === "in review" ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                            }`}
                        >
                            Awaiting Review ({inReviewCount})
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
                            onClick={() => setActiveTab("needs revision")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeTab === "needs revision" ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                            }`}
                        >
                            Needs Revision ({revisionCount})
                        </button>
                        <button
                            onClick={() => setActiveTab("rejected")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeTab === "rejected" ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                            }`}
                        >
                            Rejected ({invoices.filter(i => i.status === "Rejected").length})
                        </button>
                        <button
                            onClick={() => setActiveTab("paid")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeTab === "paid" ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                            }`}
                        >
                            Paid ({invoices.filter(i => i.status === "Paid").length})
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
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/30">
                                        <th className="px-5 py-3 text-center">No. Invoice</th>
                                        <th className="px-5 py-3 text-center">Vendor / Pengirim</th>
                                        <th className="px-5 py-3 text-center">Lampiran Berkas</th>
                                        <th className="px-5 py-3 text-center">Nominal Tagihan</th>
                                        <th className="px-5 py-3 text-center">Tanggal Terbit</th>
                                        <th className="px-5 py-3 text-center">Tanggal Input</th>
                                        <th className="px-5 py-3 text-center">TOP</th>
                                        <th className="px-5 py-3 text-center">Jatuh Tempo</th>
                                        <th className="px-5 py-3 text-center">Status</th>
                                        <th className="px-5 py-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                                    {filteredInvoices.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="text-center py-16 text-slate-400 font-medium">
                                                Belum ada dokumen tagihan yang dikirim.
                                            </td>
                                        </tr>
                                    ) : (
                                        currentItems.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors group">
                                            <td className="px-5 py-3.5">
                                                <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-slate-400" />
                                                    {inv.invoiceNumber}
                                                </div>
                                                {inv.taxInvoiceNumber && (
                                                    <div className="text-[10px] text-purple-650 dark:text-purple-400 font-semibold mt-0.5">
                                                        Faktur: {inv.taxInvoiceNumber}
                                                    </div>
                                                )}
                                                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">ID: {inv.id.substring(0, 8)}</div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="font-semibold text-slate-700 dark:text-slate-300">{inv.vendorName || "Unknown"}</div>
                                                <div className="text-xs text-slate-400 font-mono mt-0.5">{inv.vendorEmail}</div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex flex-wrap gap-1">
                                                    {inv.documents.map((d) => (
                                                        <a 
                                                            key={d.id} 
                                                            href={d.fileUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold capitalize transition-colors ${
                                                                d.docType === "invoice" ? "bg-blue-15 text-blue-600 hover:bg-blue-100" :
                                                                d.docType === "tax_invoice" ? "bg-purple-15 text-purple-600 hover:bg-purple-100" :
                                                                d.docType === "delivery_order" ? "bg-amber-15 text-amber-600 hover:bg-amber-100" :
                                                                "bg-slate-15 text-slate-600 hover:bg-slate-100"
                                                            }`}
                                                            title={d.fileUrl}
                                                        >
                                                            {d.docType.replace("_", " ")}
                                                            <ExternalLink className="h-2.5 w-2.5" />
                                                        </a>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                                                {formatCurrency(inv.totalAmount)}
                                            </td>
                                            <td className="px-5 py-3.5 font-medium text-slate-500 dark:text-slate-400">
                                                {formatDate(inv.issueDate)}
                                            </td>
                                            <td className="px-5 py-3.5 font-medium text-slate-500 dark:text-slate-400">
                                                {formatDate(inv.createdAt)}
                                            </td>
                                            <td className="px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-400">
                                                {inv.termsOfPayment || "-"}
                                            </td>
                                            <td className="px-5 py-3.5 font-semibold text-blue-600 dark:text-blue-400">
                                                {formatDate(inv.dueDate)}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                                                    inv.status === "Paid" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" :
                                                    inv.status === "Verified" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" :
                                                    inv.status === "In Review" ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400" :
                                                    inv.status === "Needs Revision" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400" :
                                                    "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400"
                                                }`}>
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                                    
                                                    {/* Procurement Verifier Actions */}
                                                    {(role === "admin" || role === "procurement") && (
                                                        <Link href={`/dashboard/invoice-hub/verify/${inv.id}`}>
                                                            <Button 
                                                                className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-[11px] uppercase tracking-wider h-7 px-3 rounded flex items-center gap-1.5 mr-1 cursor-pointer"
                                                            >
                                                                <FileCheck className="h-3.5 w-3.5" /> Proses Audit
                                                            </Button>
                                                        </Link>
                                                    )}

                                                    {/* General View Details */}
                                                    <Link href={`/dashboard/invoice-hub/details/${inv.id}`}>
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20" title="Detail Verifikasi">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </Link>

                                                    {/* Vendor Edit Action */}
                                                    {(role === "admin" || (role === "vendor" && myPermissions["invoice-hub"]?.canUpdate)) && (inv.status === "In Review" || inv.status === "Needs Revision") && (
                                                        <Button size="icon" variant="ghost" onClick={() => alert("Fitur edit invoice sedang dalam pengembangan.")} className="h-7 w-7 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20" title="Edit Invoice">
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                    )}

                                                    {/* Vendor Delete Action */}
                                                    {(role === "admin" || (role === "vendor" && myPermissions["invoice-hub"]?.canDelete)) && (inv.status === "In Review" || inv.status === "Needs Revision") && (
                                                        <Button size="icon" variant="ghost" onClick={() => handleDelete(inv)} className="h-7 w-7 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20" title="Hapus Invoice">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )))}
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
                        Showing <span className="text-slate-700 dark:text-slate-300">{indexOfFirstItem + 1}</span> to <span className="text-slate-700 dark:text-slate-300">{Math.min(indexOfLastItem, filteredInvoices.length)}</span> of <span className="text-slate-700 dark:text-slate-300">{filteredInvoices.length}</span> records
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

            {/* Tombol Aksi Unggah Mengambang (Floating Action Button) */}
            {role === "vendor" && (
                <button 
                    onClick={handleOpenUpload}
                    className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-slate-900 text-white hover:bg-slate-800 hover:scale-105 active:scale-95 shadow-xl flex items-center justify-center z-45 transition-all"
                    title="Unggah Tagihan Baru"
                >
                    <Plus className="h-6 w-6 font-bold" />
                </button>
            )}

            {/* Vendor File Upload Modal */}
            {isUploadOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-opacity duration-300">
                    <Card className="w-full max-w-4xl bg-white dark:bg-slate-950 shadow-xl border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <CardHeader className="relative pb-4 border-b bg-slate-50/50 dark:bg-slate-900/50">
                            <CardTitle className="text-xl font-bold font-parkinsans tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                <UploadCloud className="h-5 w-5 text-blue-600" />
                                Unggah Dokumen Tagihan
                            </CardTitle>
                            <CardDescription>
                                Masukkan berkas pendukung transaksi keuangan. Dokumen PDF/Gambar maksimal 10MB.
                            </CardDescription>
                            <button onClick={() => setIsUploadOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </CardHeader>
                        <form onSubmit={handleUploadSubmit}>
                            <CardContent className="p-6 max-h-[75vh] overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Left Column: Data Input Fields */}
                                    <div className="space-y-4 border-b md:border-b-0 md:border-r pb-6 md:pb-0 md:pr-6 border-slate-100 dark:border-slate-900">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2 mb-2">
                                            1. Informasi Tagihan
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Nomor Invoice (Wajib) *</Label>
                                                <Input 
                                                    placeholder="Masukkan nomor invoice (contoh: INV/2026/001)"
                                                    value={invoiceNo}
                                                    onChange={(e) => setInvoiceNo(e.target.value)}
                                                    required
                                                    disabled={uploading}
                                                    className="h-10 rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 font-semibold"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Nomor Faktur Pajak (Jika Ada)</Label>
                                                <Input 
                                                    placeholder="Masukkan nomor faktur pajak (contoh: 010.000-26.00000001)"
                                                    value={taxInvoiceNo}
                                                    onChange={(e) => setTaxInvoiceNo(e.target.value)}
                                                    disabled={uploading}
                                                    className="h-10 rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 font-semibold"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Nominal Invoice (IDR) (Wajib) *</Label>
                                                <Input 
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="Contoh: 15000000"
                                                    value={invoiceAmount}
                                                    onChange={(e) => setInvoiceAmount(e.target.value)}
                                                    required
                                                    disabled={uploading}
                                                    className="h-10 rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 font-bold font-mono"
                                                />
                                            </div>
                                            
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Pilihan PPN *</Label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={uploading}
                                                        onClick={() => setPpnType("1.1")}
                                                        className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                                                            ppnType === "1.1" 
                                                                ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                                                                : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-350 border-slate-200 dark:border-slate-800 hover:bg-slate-100/50"
                                                        }`}
                                                    >
                                                        PPN 1.1%
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={uploading}
                                                        onClick={() => setPpnType("11")}
                                                        className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                                                            ppnType === "11" 
                                                                ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                                                                : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-350 border-slate-200 dark:border-slate-800 hover:bg-slate-100/50"
                                                        }`}
                                                    >
                                                        PPN 11%
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={uploading}
                                                        onClick={() => setPpnType("custom")}
                                                        className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                                                            ppnType === "custom" 
                                                                ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                                                                : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-350 border-slate-200 dark:border-slate-800 hover:bg-slate-100/50"
                                                        }`}
                                                    >
                                                        Lainnya (Custom)
                                                    </button>
                                                </div>
                                            </div>

                                            {ppnType === "custom" && (
                                                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                                                    <Label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">Persentase PPN Kustom (%) *</Label>
                                                    <Input 
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        max="100"
                                                        placeholder="Masukkan persentase PPN (contoh: 12)"
                                                        value={customPpnRate}
                                                        onChange={(e) => setCustomPpnRate(e.target.value)}
                                                        required
                                                        disabled={uploading}
                                                        className="h-10 rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 font-semibold"
                                                    />
                                                </div>
                                            )}

                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Grand Total Nominal (IDR)</Label>
                                                <Input 
                                                    type="text"
                                                    value={formatCurrency(calculateGrandTotal().toString())}
                                                    readOnly
                                                    disabled
                                                    className="h-10 rounded-lg border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/50 font-extrabold text-blue-600 dark:text-blue-400 font-mono"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Tanggal Terbit (Wajib) *</Label>
                                                <Input 
                                                    type="date"
                                                    value={releaseDate}
                                                    onChange={(e) => setReleaseDate(e.target.value)}
                                                    required
                                                    disabled={uploading}
                                                    className="h-10 rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-xs"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: File Uploads */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2 mb-2">
                                            2. Lampiran Berkas Pendukung
                                        </h3>
                                        
                                        {!invoiceFile ? (
                                            <div 
                                                onDragOver={(e) => { e.preventDefault(); if (!uploading) setIsInvoiceDragOver(true); }}
                                                onDragLeave={() => setIsInvoiceDragOver(false)}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    setIsInvoiceDragOver(false);
                                                    if (uploading) return;
                                                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                                        const file = e.dataTransfer.files[0];
                                                        const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
                                                        if (validTypes.includes(file.type)) {
                                                            setInvoiceFile(file);
                                                        } else {
                                                            alert("Hanya berkas PDF atau gambar (JPG/PNG) yang diperbolehkan!");
                                                        }
                                                    }
                                                }}
                                                onClick={() => { if (!uploading) document.getElementById("invoice-file-input")?.click(); }}
                                                className={`border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center cursor-pointer transition-all ${
                                                    isInvoiceDragOver 
                                                        ? "border-blue-500 bg-blue-50/30 dark:bg-blue-950/20" 
                                                        : "border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:bg-slate-50/50 dark:hover:bg-slate-900/20"
                                                }`}
                                            >
                                                <UploadCloud className="h-10 w-10 text-slate-400 mb-3 animate-bounce" />
                                                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Seret dan letakkan berkas invoice di sini</h4>
                                                <p className="text-[10px] text-slate-400 mt-1">PDF, JPG, JPEG, atau PNG (Maks 10MB)</p>
                                                <Button type="button" variant="outline" disabled={uploading} className="mt-4 rounded-lg border-slate-200 dark:border-slate-800 h-8 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                    Pilih Berkas
                                                </Button>
                                                <input 
                                                    id="invoice-file-input" 
                                                    type="file" 
                                                    accept=".pdf, .jpg, .jpeg, .png" 
                                                    required 
                                                    className="hidden" 
                                                    onChange={(e) => {
                                                        if (e.target.files && e.target.files[0]) {
                                                            setInvoiceFile(e.target.files[0]);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 gap-4">
                                                <div className="flex items-center gap-3">
                                                    <FileText className="h-8 w-8 text-blue-600 bg-white dark:bg-slate-950 p-1.5 border rounded-lg shadow-sm" />
                                                    <div>
                                                        <div className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate max-w-[200px] sm:max-w-[300px]" title={invoiceFile.name}>
                                                            {invoiceFile.name}
                                                        </div>
                                                        <div className="text-xs text-slate-400">{(invoiceFile.size / 1024).toFixed(1)} KB</div>
                                                    </div>
                                                </div>
                                                <Button 
                                                    type="button"
                                                    disabled={uploading}
                                                    onClick={() => setInvoiceFile(null)} 
                                                    variant="outline" 
                                                    className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-slate-200 dark:border-slate-800 rounded-lg font-semibold"
                                                >
                                                    Hapus Berkas
                                                </Button>
                                            </div>
                                        )}

                                        {/* Supporting Documents List */}
                                        {invoiceFile && (
                                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-900 animate-in fade-in duration-200">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dokumen Pendukung Opsional</span>
                                                    <span className="text-[10px] text-slate-400 font-medium">({supportingFiles.length}/3 berkas)</span>
                                                </div>

                                                {supportingFiles.map((sf) => (
                                                    <div key={sf.id} className="flex flex-col gap-2 p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-2 duration-200">
                                                        <div className="flex justify-between items-center gap-3">
                                                            <div className="flex items-center gap-2.5 truncate flex-1">
                                                                <FileText className="h-5 w-5 text-blue-600 shrink-0" />
                                                                <div className="truncate text-xs">
                                                                    <div className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px] sm:max-w-[240px]" title={sf.file.name}>
                                                                        {sf.file.name}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-400">{(sf.file.size / 1024).toFixed(1)} KB</div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <select
                                                                    value={sf.type}
                                                                    disabled={uploading}
                                                                    onChange={(e) => handleUpdateSupportingFileType(sf.id, e.target.value as "tax_invoice" | "delivery_order" | "po")}
                                                                    className="h-8 text-[10px] rounded-lg border bg-white dark:bg-slate-950 dark:border-slate-800 px-2 py-0.5 focus-visible:outline-none w-32 font-bold text-slate-700 dark:text-slate-300"
                                                                >
                                                                    <option value="tax_invoice">Faktur Pajak</option>
                                                                    <option value="delivery_order">DO / BAST / Surat Jalan</option>
                                                                    <option value="po">Purchase Order (PO)</option>
                                                                </select>
                                                                <Button 
                                                                    type="button"
                                                                    disabled={uploading}
                                                                    onClick={() => handleRemoveSupportingFile(sf.id)} 
                                                                    variant="ghost" 
                                                                    size="icon"
                                                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-55 border-slate-200 dark:border-slate-800 rounded-lg"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}

                                                {supportingFiles.length < 3 && (
                                                    <div className="pt-1">
                                                        <Button 
                                                            type="button" 
                                                            variant="outline" 
                                                            disabled={uploading}
                                                            onClick={() => document.getElementById("supporting-files-input")?.click()} 
                                                            className="w-full h-10 border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-xs font-bold gap-2 text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50/10 transition-all"
                                                        >
                                                            <Plus className="h-4 w-4" /> Tambah Dokumen Pendukung
                                                        </Button>
                                                        <input 
                                                            id="supporting-files-input" 
                                                            type="file" 
                                                            accept=".pdf, .jpg, .jpeg, .png" 
                                                            className="hidden" 
                                                            onChange={handleSupportingFileChange}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
                                <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)} disabled={uploading} className="border-slate-200 dark:border-slate-800 h-10 font-semibold rounded-lg">Batal</Button>
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-10 rounded-lg shadow-sm" disabled={uploading}>
                                    {uploading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Mengirim Berkas...
                                        </>
                                    ) : (
                                        "Kirim Invoice"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
            {/* Delete Confirmation Modal */}
            {invoiceToDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-opacity duration-300">
                    <Card className="w-full max-w-sm bg-white dark:bg-slate-950 shadow-2xl border border-red-200 dark:border-red-900/50 transform transition-all duration-300 scale-100 rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <CardHeader className="text-center pb-4 pt-6">
                            <div className="flex justify-center mb-3">
                                <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full">
                                    <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                                </div>
                            </div>
                            <CardTitle className="text-xl font-bold font-parkinsans tracking-tight text-slate-900 dark:text-white">Hapus Tagihan?</CardTitle>
                            <CardDescription className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                                Anda yakin ingin menghapus tagihan <strong>{invoiceToDelete.invoiceNumber}</strong>? Data beserta lampirannya akan terhapus.
                            </CardDescription>
                        </CardHeader>
                        <div className="flex gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t">
                            <Button type="button" variant="outline" onClick={() => setInvoiceToDelete(null)} disabled={isLoading} className="flex-1 h-10 font-semibold rounded-lg bg-white">
                                Batal
                            </Button>
                            <Button type="button" onClick={handleConfirmDelete} disabled={isLoading} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold h-10 rounded-lg shadow-sm">
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ya, Hapus"}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
