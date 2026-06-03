"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { getInvoiceById } from "../../actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Loader2, 
    ShieldAlert, 
    FileText, 
    CheckCircle2, 
    AlertTriangle,
    Check,
    X,
    Clock,
    AlertCircle,
    ArrowLeft,
    History,
    UploadCloud,
    RefreshCw,
    ExternalLink
} from "lucide-react";
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

interface InvoiceDetail {
    id: string;
    vendorId: string;
    invoiceNumber: string;
    taxInvoiceNumber: string | null;
    issueDate: Date | null;
    dueDate: Date | null;
    totalAmount: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    vendorName: string | null;
    vendorEmail: string | null;
    termsOfPayment: string | null;
    documents: DocItem[];
    verifications: VerificationItem[];
    auditLogs: AuditLogItem[];
}

export default function InvoiceDetailsPage() {
    const params = useParams();
    const invoiceId = params.id as string;
    const { data: session, isPending: sessionPending } = useSession();

    const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const loadInvoiceData = async () => {
        setIsLoading(true);
        setErrorMsg(null);
        try {
            const res = await getInvoiceById(invoiceId);
            if (res.success && res.invoice) {
                setInvoice(res.invoice as InvoiceDetail);
            } else {
                setErrorMsg(res.error || "Gagal memuat detail tagihan.");
            }
        } catch (error: unknown) {
            setErrorMsg(error instanceof Error ? error.message : "Terjadi kesalahan koneksi.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (session?.user && invoiceId) {
            loadInvoiceData();
        }
    }, [session, invoiceId]);

    const formatCurrency = (val: string | null) => {
        if (!val) return "Rp 0,00";
        return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(parseFloat(val));
    };

    const formatDate = (dateObj: Date | null | string) => {
        if (!dateObj) return "-";
        return new Date(dateObj).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" });
    };

    if (sessionPending || isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="p-6 max-w-lg mx-auto mt-12">
                <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-2">
                            <ShieldAlert className="h-12 w-12 text-red-600 dark:text-red-400" />
                        </div>
                        <CardTitle className="text-red-700 dark:text-red-400">Akses Ditolak</CardTitle>
                        <CardDescription>
                            Silakan masuk terlebih dahulu untuk melihat informasi detail tagihan.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (errorMsg || !invoice) {
        return (
            <div className="p-6 max-w-lg mx-auto mt-12">
                <Card className="border-slate-200 bg-slate-50 dark:bg-slate-900/20 dark:border-slate-800">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-2">
                            <AlertTriangle className="h-12 w-12 text-amber-500" />
                        </div>
                        <CardTitle className="text-slate-850 dark:text-slate-200">Gagal Memuat Detail</CardTitle>
                        <CardDescription>{errorMsg || "Dokumen invoice tidak ditemukan."}</CardDescription>
                        <div className="pt-4">
                            <Link href="/dashboard/invoice-hub">
                                <Button variant="outline" className="w-full">Kembali ke Invoice Hub</Button>
                            </Link>
                        </div>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-[1200px] mx-auto flex flex-col gap-6 select-none">
            
            {/* Header / Breadcrumb navigation */}
            <div className="flex items-center gap-3">
                <Link href="/dashboard/invoice-hub">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg border border-slate-200/50 dark:border-slate-800">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    Workspace / <Link href="/dashboard/invoice-hub" className="hover:text-blue-600 transition-colors">Invoice Hub</Link> / <span className="text-blue-600 font-semibold">Detail Verifikasi</span>
                </div>
            </div>

            {/* Title Block */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white font-parkinsans tracking-tight">CV. {invoice.vendorName || "Mitra Utama"}</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Detail verifikasi kelengkapan berkas dan audit log tagihan: <span className="font-bold text-slate-700 dark:text-slate-350">{invoice.invoiceNumber}</span>
                    </p>
                </div>
                
                {/* External links */}
                <div className="flex gap-2">
                    {invoice.documents.map((d) => (
                        <a 
                            key={d.id} 
                            href={d.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-bold capitalize transition-all shadow-sm ${
                                d.docType === "invoice" ? "bg-blue-50/80 border-blue-200 text-blue-700 hover:bg-blue-100" :
                                d.docType === "tax_invoice" ? "bg-purple-50/80 border-purple-200 text-purple-700 hover:bg-purple-100" :
                                d.docType === "delivery_order" ? "bg-amber-50/80 border-amber-200 text-amber-700 hover:bg-amber-100" :
                                "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                        >
                            <FileText className="h-3.5 w-3.5" />
                            {d.docType.replace("_", " ")}
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    ))}
                </div>
            </div>

            {/* Status Summary Banner */}
            <div className="flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full animate-pulse ${
                        invoice.status === "Verified" || invoice.status === "Paid" ? "bg-emerald-500" :
                        invoice.status === "In Review" ? "bg-blue-500" :
                        invoice.status === "Needs Revision" ? "bg-amber-500" : "bg-red-500"
                    }`} />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status Audit Sistem</span>
                </div>
                <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider border shadow-sm ${
                    invoice.status === "Verified" || invoice.status === "Paid" ? "bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50" :
                    invoice.status === "In Review" ? "bg-blue-50 text-blue-700 border-blue-250 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50" :
                    invoice.status === "Needs Revision" ? "bg-amber-50 text-amber-700 border-amber-255 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50" :
                    "bg-red-50 text-red-700 border-red-250 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50"
                }`}>{invoice.status}</span>
            </div>

            {/* Metadata Informative Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">Nominal Tagihan (IDR)</span>
                    <span className="font-extrabold text-lg text-slate-950 dark:text-white mt-1.5 block font-mono text-blue-600 dark:text-blue-400">{formatCurrency(invoice.totalAmount)}</span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">Tanggal Terbit</span>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-1.5 block">{formatDate(invoice.issueDate)}</span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">Jatuh Tempo (TOP {invoice.termsOfPayment || "30"})</span>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-1.5 block font-mono text-amber-600 dark:text-amber-450">{formatDate(invoice.dueDate)}</span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">Nomor Faktur Pajak</span>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-1.5 block font-mono truncate" title={invoice.taxInvoiceNumber || "-"}>{invoice.taxInvoiceNumber || "-"}</span>
                </div>
            </div>

            {/* Side-by-side content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start border-t pt-6">
                
                {/* Left Column: Checklist & Auditor notes */}
                <div className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            Hasil Checklist Verifikasi Audit
                        </h3>
                        
                        <div className="space-y-3.5">
                            {["A", "B", "C", "D", "E"].map((sec) => {
                                const match = invoice.verifications.find(v => v.section === sec);
                                const passed = match ? match.passed : false;
                                
                                const itemsMap: Record<string, { title: string; desc: string }> = {
                                    A: { title: "A. Kelengkapan Berkas Dokumen", desc: "Pemeriksaan lampiran invoice utama dan berkas pendukung wajib." },
                                    B: { title: "B. Validasi Rekening / NPWP", desc: "Kesesuaian identitas rekening bank dan NPWP supplier." },
                                    C: { title: "C. Pencocokan Item barang & PO", desc: "Konsistensi nama, jumlah (qty), dan harga unit dengan Purchase Order." },
                                    D: { title: "D. Validasi e-Faktur PPN", desc: "Pengecekan keabsahan e-Faktur PPN dengan server DJP." },
                                    E: { title: "E. Perhitungan Finansial", desc: "Akurasi matematika nominal DPP, PPN, dan grand total tagihan." }
                                };
                                
                                const item = itemsMap[sec];

                                // Custom tri-state status logic:
                                let pointStatus: "yellow" | "red" | "blue" | "green" = "yellow";
                                if (!match) {
                                    pointStatus = "yellow";
                                } else if (passed) {
                                    pointStatus = "green";
                                } else {
                                    const hasComment = match.comments && match.comments !== "Pass" && match.comments !== "Fail";
                                    if (hasComment) {
                                        if (invoice.status === "Needs Revision") {
                                            pointStatus = "blue";
                                        } else if (invoice.status === "Rejected") {
                                            pointStatus = "red";
                                        } else {
                                            pointStatus = "yellow";
                                        }
                                    } else {
                                        pointStatus = "yellow";
                                    }
                                }

                                // Design mappings
                                let bgClass = "";
                                let borderClass = "";
                                let badgeClass = "";
                                let badgeText = "";
                                let icon = null;

                                if (pointStatus === "yellow") {
                                    bgClass = "bg-amber-500/5 dark:bg-amber-950/5";
                                    borderClass = "border-l-amber-500";
                                    badgeClass = "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-400";
                                    badgeText = "Belum Diperiksa";
                                    icon = <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400 animate-pulse" />;
                                } else if (pointStatus === "green") {
                                    bgClass = "bg-emerald-500/5 dark:bg-emerald-950/5";
                                    borderClass = "border-l-emerald-500";
                                    badgeClass = "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400";
                                    badgeText = "Benar (Pass)";
                                    icon = <Check className="h-3 w-3 font-bold text-emerald-600 dark:text-emerald-400" />;
                                } else if (pointStatus === "blue") {
                                    bgClass = "bg-blue-500/5 dark:bg-blue-950/5";
                                    borderClass = "border-l-blue-500";
                                    badgeClass = "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-900/50 dark:text-blue-400";
                                    badgeText = "Revisi";
                                    icon = <AlertCircle className="h-3 w-3 text-blue-600 dark:text-blue-400" />;
                                } else {
                                    bgClass = "bg-red-500/5 dark:bg-red-950/5";
                                    borderClass = "border-l-red-500";
                                    badgeClass = "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400";
                                    badgeText = "Gagal (Reject)";
                                    icon = <X className="h-3 w-3 text-red-600 dark:text-red-400" />;
                                }

                                return (
                                    <div 
                                        key={sec} 
                                        className={`flex flex-col gap-2.5 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/60 border-l-4 transition-all hover:translate-x-1 ${bgClass} ${borderClass}`}
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <span className="text-xs font-bold block text-slate-850 dark:text-slate-200">{item.title}</span>
                                                <span className="text-[10px] text-slate-450 block mt-0.5 leading-relaxed">{item.desc}</span>
                                            </div>
                                            
                                            <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border font-extrabold text-[9px] uppercase tracking-wider shrink-0 select-none ${badgeClass}`}>
                                                {icon} {badgeText}
                                            </div>
                                        </div>
                                        
                                        {/* Revision feedback info */}
                                        {pointStatus === "blue" && match?.comments && (
                                            <div className="mt-1.5 text-[11px] bg-blue-500/10 dark:bg-blue-950/20 border border-blue-500/20 dark:border-blue-900/30 text-blue-700 dark:text-blue-450 px-3 py-2 rounded-xl flex items-start gap-2">
                                                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" />
                                                <div className="flex-1">
                                                    <strong className="font-semibold block mb-0.5 text-blue-800 dark:text-blue-300">Catatan Perbaikan:</strong>
                                                    <p className="leading-relaxed">{match.comments}</p>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Rejection comments */}
                                        {pointStatus === "red" && match?.comments && (
                                            <div className="mt-1.5 text-[11px] bg-red-500/10 dark:bg-red-950/20 border border-red-500/20 dark:border-red-900/30 text-red-700 dark:text-red-450 px-3 py-2 rounded-xl flex items-start gap-2">
                                                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />
                                                <div className="flex-1">
                                                    <strong className="font-semibold block mb-0.5 text-red-800 dark:text-red-300">Catatan Penolakan:</strong>
                                                    <p className="leading-relaxed">{match.comments}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Column: History timeline list */}
                <div className="space-y-6 lg:border-l lg:pl-8 border-slate-200/60 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <History className="h-4 w-4 text-blue-600" />
                        Histori Log Alur Dokumen
                    </h3>

                    {(!invoice.auditLogs || invoice.auditLogs.length === 0) ? (
                        <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs italic bg-slate-50 dark:bg-slate-900/20 border border-dashed rounded-2xl">
                            Belum ada riwayat tercatat untuk dokumen ini.
                        </div>
                    ) : (
                        <div className="relative pl-6 space-y-6 border-l-2 border-slate-200/60 dark:border-slate-800/80 ml-3">
                            {invoice.auditLogs.map((log) => {
                                let title = "";
                                let desc = "";
                                let iconBg = "";
                                let iconColor = "";
                                let iconNode = null;

                                switch (log.action) {
                                    case "CREATE":
                                        title = "Invoice Berhasil Dikirim";
                                        desc = "Vendor mengunggah dokumen invoice utama beserta berkas pendukung wajib.";
                                        iconBg = "bg-blue-50 dark:bg-blue-950/40";
                                        iconColor = "text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50";
                                        iconNode = <UploadCloud className="h-3.5 w-3.5" />;
                                        break;
                                    case "VERIFY":
                                        title = "Pemeriksaan Disetujui (Verified)";
                                        desc = "Pemeriksa menyelesaikan proses verifikasi dan menyetujui invoice.";
                                        iconBg = "bg-emerald-50 dark:bg-emerald-950/40";
                                        iconColor = "text-emerald-600 dark:text-emerald-450 border border-emerald-200 dark:border-emerald-900/50";
                                        iconNode = <Check className="h-3.5 w-3.5 font-bold" />;
                                        break;
                                    case "REVISION_REQUEST":
                                        title = "Permintaan Revisi Dokumen";
                                        desc = "Pemeriksa meminta perbaikan data atau kelengkapan dokumen kepada vendor.";
                                        iconBg = "bg-amber-50 dark:bg-amber-950/40";
                                        iconColor = "text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50";
                                        iconNode = <RefreshCw className="h-3.5 w-3.5" />;
                                        break;
                                    case "REJECT":
                                        title = "Tagihan Ditolak (Rejected)";
                                        desc = "Dokumen tagihan ditolak oleh pemeriksa karena tidak sesuai ketentuan.";
                                        iconBg = "bg-red-50 dark:bg-red-950/40";
                                        iconColor = "text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50";
                                        iconNode = <X className="h-3.5 w-3.5" />;
                                        break;
                                    default:
                                        title = log.action;
                                        desc = "Aktivitas tercatat oleh sistem.";
                                        iconBg = "bg-slate-50 dark:bg-slate-900/40";
                                        iconColor = "text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800/80";
                                        iconNode = <FileText className="h-3.5 w-3.5" />;
                                        break;
                                }

                                return (
                                    <div key={log.id} className="relative group">
                                        
                                        {/* Colored Dot timeline */}
                                        <div className={`absolute -left-[37px] top-0.5 rounded-full p-1.5 flex items-center justify-center shrink-0 shadow-sm ${iconBg} ${iconColor}`}>
                                            {iconNode}
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                                 <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{title}</h4>
                                                 <span className="text-[10px] text-slate-450 dark:text-slate-500 font-mono">
                                                     {new Date(log.loggedAt).toLocaleString("id-ID", {
                                                         day: "2-digit",
                                                         month: "short",
                                                         year: "numeric",
                                                         hour: "2-digit",
                                                         minute: "2-digit",
                                                         second: "2-digit"
                                                     })}
                                                 </span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
                                            
                                            {/* Actor description label */}
                                            <div className="flex items-center gap-1.5 text-[9px] text-slate-400 dark:text-slate-500 pt-0.5 font-semibold">
                                                 <span>{log.userName || log.userEmail || "Sistem"}</span>
                                                 <span className="text-slate-300 dark:text-slate-800">•</span>
                                                 <span className="italic">{(log.userEmail?.includes("vendor") || log.userEmail?.includes("rema")) ? "Aktor: Vendor" : "Aktor: Admin Pemeriksa"}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>

        </div>
    );
}
