"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { getInvoiceById, submitVerificationAndOCRCorrection } from "../../actions";
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
    Check,
    X,
    FileCheck,
    Clock,
    AlertCircle,
    ArrowLeft,
    ExternalLink,
    RefreshCw
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
}

type PointStatus = "pass" | "revision" | "pending";

export default function VerifyInvoicePage() {
    const params = useParams();
    const router = useRouter();
    const invoiceId = params.id as string;
    const { data: session, isPending: sessionPending } = useSession();

    const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [savingVerification, setSavingVerification] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Form inputs
    const [verifyInvoiceNo, setVerifyInvoiceNo] = useState("");
    const [verifyTaxInvoiceNo, setVerifyTaxInvoiceNo] = useState("");
    const [verifyIssueDate, setVerifyIssueDate] = useState("");
    const [verifyDueDate, setVerifyDueDate] = useState("");
    const [verifyTotal, setVerifyTotal] = useState("");

    // Checklist Point-Specific State
    const [statusA, setStatusA] = useState<PointStatus>("pending");
    const [statusB, setStatusB] = useState<PointStatus>("pending");
    const [statusC, setStatusC] = useState<PointStatus>("pending");
    const [statusD, setStatusD] = useState<PointStatus>("pending");
    const [statusE, setStatusE] = useState<PointStatus>("pending");

    const [commentA, setCommentA] = useState("");
    const [commentB, setCommentB] = useState("");
    const [commentC, setCommentC] = useState("");
    const [commentD, setCommentD] = useState("");
    const [commentE, setCommentE] = useState("");

    const [verifyComments, setVerifyComments] = useState("");

    const loadInvoiceData = async () => {
        setIsLoading(true);
        setErrorMsg(null);
        try {
            const res = await getInvoiceById(invoiceId);
            if (res.success && res.invoice) {
                const inv = res.invoice as InvoiceDetail;
                setInvoice(inv);
                setVerifyInvoiceNo(inv.invoiceNumber);
                setVerifyTaxInvoiceNo(inv.taxInvoiceNumber || "");

                const getISODateStr = (d: Date | null) => {
                    if (!d) return "";
                    return new Date(d).toISOString().split("T")[0];
                };
                setVerifyIssueDate(getISODateStr(inv.issueDate));
                setVerifyDueDate(getISODateStr(inv.dueDate));
                setVerifyTotal(inv.totalAmount || "0");

                // Initialize checklist points
                const initPoint = (sec: string) => {
                    const record = inv.verifications.find(v => v.section === sec);
                    if (!record) return { status: "pending" as PointStatus, comment: "" };
                    if (record.passed) return { status: "pass" as PointStatus, comment: "" };
                    
                    const isRevision = inv.status === "Needs Revision";
                    const hasRealComment = record.comments && record.comments !== "Pass" && record.comments !== "Fail";
                    
                    if (isRevision && hasRealComment) {
                        return { status: "revision" as PointStatus, comment: record.comments || "" };
                    }
                    return { status: "pending" as PointStatus, comment: "" };
                };

                const a = initPoint("A");
                const b = initPoint("B");
                const c = initPoint("C");
                const d = initPoint("D");
                const e = initPoint("E");

                setStatusA(a.status);
                setStatusB(b.status);
                setStatusC(c.status);
                setStatusD(d.status);
                setStatusE(e.status);

                setCommentA(a.comment);
                setCommentB(b.comment);
                setCommentC(c.comment);
                setCommentD(d.comment);
                setCommentE(e.comment);

                const latestComment = inv.verifications.find(v => v.comments && v.comments !== "Pass" && v.comments !== "Fail")?.comments || "";
                setVerifyComments(latestComment);
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

    if (sessionPending || isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const role = (session?.user as { role?: string })?.role || "vendor";
    const isAuthorized = role === "admin" || role === "procurement";

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
                            Hanya Procurement Admin atau Pemeriksa yang memiliki otorisasi untuk melakukan audit tagihan.
                        </CardDescription>
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

    if (errorMsg || !invoice) {
        return (
            <div className="p-6 max-w-lg mx-auto mt-12">
                <Card className="border-slate-200 bg-slate-50 dark:bg-slate-900/20 dark:border-slate-800">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-2">
                            <AlertTriangle className="h-12 w-12 text-amber-500" />
                        </div>
                        <CardTitle className="text-slate-850 dark:text-slate-200">Gagal Memuat Data</CardTitle>
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

    const getInvoiceUrl = () => {
        const doc = invoice.documents.find(d => d.docType === "invoice");
        return doc ? doc.fileUrl : "";
    };

    const handleVerifySubmit = async (decision: "Verified" | "Needs Revision" | "Rejected") => {
        setSavingVerification(true);
        setErrorMsg(null);

        try {
            // Mapping statuses to passed & comments
            const mapPointPayload = (sec: string, status: PointStatus, commentText: string) => {
                if (status === "pass") {
                    return { section: sec, passed: true, comments: "Pass" };
                } else if (status === "revision") {
                    return { section: sec, passed: false, comments: commentText.trim() || "Fail" };
                } else {
                    // Pending / unchecked: send as not passed with empty comments
                    return { section: sec, passed: false, comments: "" };
                }
            };

            const checklist = [
                mapPointPayload("A", statusA, commentA),
                mapPointPayload("B", statusB, commentB),
                mapPointPayload("C", statusC, commentC),
                mapPointPayload("D", statusD, commentD),
                mapPointPayload("E", statusE, commentE),
            ];

            const result = await submitVerificationAndOCRCorrection(
                invoice.id,
                {
                    invoiceNumber: verifyInvoiceNo,
                    taxInvoiceNumber: verifyTaxInvoiceNo.trim() || undefined,
                    issueDate: verifyIssueDate,
                    dueDate: verifyDueDate,
                    totalAmount: verifyTotal,
                },
                checklist,
                decision
            );

            if (result.success) {
                router.push("/dashboard/invoice-hub");
            } else {
                setErrorMsg(result.error || "Gagal menyelesaikan verifikasi.");
                setSavingVerification(false);
            }
        } catch (error: unknown) {
            setErrorMsg(error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan audit.");
            setSavingVerification(false);
        }
    };

    // Validation conditions
    const hasRevision = statusA === "revision" || statusB === "revision" || statusC === "revision" || statusD === "revision" || statusE === "revision";
    const allPassed = statusA === "pass" && statusB === "pass" && statusC === "pass" && statusD === "pass" && statusE === "pass";

    const renderTriStateControl = (
        status: PointStatus, 
        setStatus: (s: PointStatus) => void,
        comment: string,
        setComment: (c: string) => void,
        placeholder: string
    ) => {
        return (
            <div className="flex flex-col gap-2.5">
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setStatus(status === "pass" ? "pending" : "pass")}
                        className={`flex-1 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 border cursor-pointer ${
                            status === "pass" 
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" 
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                    >
                        <Check className="h-3.5 w-3.5" /> Setuju
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatus(status === "revision" ? "pending" : "revision")}
                        className={`flex-1 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 border cursor-pointer ${
                            status === "revision" 
                                ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                    >
                        <AlertCircle className="h-3.5 w-3.5" /> Revisi
                    </button>
                </div>
                {status === "revision" && (
                    <div className="animate-in slide-in-from-top-1 duration-150">
                        <Input
                            type="text"
                            placeholder={placeholder}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            required
                            className="text-xs h-8 border-slate-200 dark:border-slate-800 focus:ring-blue-500 rounded-lg bg-slate-50/50 dark:bg-slate-900 font-semibold"
                        />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col gap-4 p-4 md:p-6 overflow-hidden h-[calc(100vh-var(--header-height))] max-w-[1600px] mx-auto w-full">
            
            {/* Breadcrumb & Navigation Back */}
            <div className="flex items-center gap-3 shrink-0">
                <Link href="/dashboard/invoice-hub">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg border border-slate-200/50 dark:border-slate-800">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    Workspace / <Link href="/dashboard/invoice-hub" className="hover:text-blue-600 transition-colors">Invoice Hub</Link> / <span className="text-blue-600 font-semibold">Proses Audit</span>
                </div>
            </div>

            {/* Error Notification Alert */}
            {errorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400 rounded-xl flex items-center justify-between shadow-sm shrink-0">
                    <div className="flex items-center gap-2.5">
                        <ShieldAlert className="h-5 w-5 text-red-600" />
                        <span className="text-xs font-bold">{errorMsg}</span>
                    </div>
                    <button onClick={() => setErrorMsg(null)} className="opacity-70 hover:opacity-100">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Main side-by-side grid container */}
            <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden min-h-0">
                
                {/* Left Column: Full Width Document Viewer */}
                <div className="flex-1 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-4 flex flex-col overflow-hidden min-h-[300px]">
                    <div className="flex items-center justify-between mb-3 shrink-0">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <FileText className="h-4 w-4 text-blue-600" />
                            DOCUMENT PREVIEW (INVOICE UTAMA)
                        </span>
                        {getInvoiceUrl() && (
                            <a 
                                href={getInvoiceUrl()} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-xs text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 font-bold"
                            >
                                Buka Tab Baru <ExternalLink className="h-3 w-3" />
                            </a>
                        )}
                    </div>
                    <div className="flex-1 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden relative">
                        {getInvoiceUrl() ? (
                            <iframe 
                                src={getInvoiceUrl()} 
                                className="w-full h-full border-none"
                                title="Document Viewer"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                                Preview tidak tersedia.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: OCR form & Tri-state checklist */}
                <div className="w-full lg:w-[460px] bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-5 flex flex-col gap-5 overflow-y-auto shrink-0 min-h-0">
                    
                    {/* Invoice Meta header */}
                    <div className="border-b pb-4 shrink-0">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-1">PROSES AUDIT & VERIFIKASI</span>
                        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white font-parkinsans leading-none">CV. {invoice.vendorName || "Mitra Utama"}</h2>
                        <p className="text-xs text-slate-400 mt-1 font-semibold">Status: <span className="text-slate-600 dark:text-slate-350">{invoice.status}</span></p>
                    </div>

                    {/* OCR Correction Fields */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                            <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                            Koreksi Hasil Ekstraksi OCR
                        </h3>
                        
                        <div className="grid grid-cols-1 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nomor Invoice *</Label>
                                <Input 
                                    value={verifyInvoiceNo} 
                                    onChange={(e) => setVerifyInvoiceNo(e.target.value)} 
                                    required 
                                    className="h-9 rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 font-semibold text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nomor Faktur Pajak</Label>
                                <Input 
                                    value={verifyTaxInvoiceNo} 
                                    onChange={(e) => setVerifyTaxInvoiceNo(e.target.value)} 
                                    className="h-9 rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 font-semibold text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Tanggal Terbit</Label>
                                    <Input 
                                        type="date" 
                                        value={verifyIssueDate} 
                                        onChange={(e) => setVerifyIssueDate(e.target.value)} 
                                        className="h-9 rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-xs"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Jatuh Tempo</Label>
                                    <Input 
                                        type="date" 
                                        value={verifyDueDate} 
                                        onChange={(e) => setVerifyDueDate(e.target.value)} 
                                        className="h-9 rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Nominal Tagihan (IDR) *</Label>
                                <Input 
                                    type="number"
                                    step="0.01"
                                    value={verifyTotal} 
                                    onChange={(e) => setVerifyTotal(e.target.value)} 
                                    required 
                                    className="h-9 rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 font-bold font-mono text-xs text-blue-600 dark:text-blue-400"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Verification Checklists (Tri-State Layout) */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Checklist Verifikasi Audit
                        </h3>
                        
                        <div className="space-y-3.5">
                            
                            {/* Bagian A */}
                            <div className={`p-3 rounded-xl border border-slate-100 dark:border-slate-900/60 bg-slate-50/20 dark:bg-slate-900/10 flex flex-col gap-2.5 transition-all border-l-4 ${
                                statusA === "pass" ? "border-l-emerald-500 bg-emerald-50/5 dark:bg-emerald-950/5" :
                                statusA === "revision" ? "border-l-blue-500 bg-blue-50/5 dark:bg-blue-950/5" : "border-l-slate-350"
                            }`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                            {statusA === "pass" && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                                            {statusA === "revision" && <AlertCircle className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                                            {statusA === "pending" && <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                            A. Kelengkapan Berkas Dokumen
                                        </div>
                                        <p className="text-[10px] text-slate-450 mt-0.5 leading-relaxed">Invoice, Faktur Pajak, DO/Surat Jalan, dan PO lengkap.</p>
                                    </div>
                                </div>
                                {renderTriStateControl(statusA, setStatusA, commentA, setCommentA, "Tulis alasan revisi kelengkapan berkas...")}
                            </div>

                            {/* Bagian B */}
                            <div className={`p-3 rounded-xl border border-slate-100 dark:border-slate-900/60 bg-slate-50/20 dark:bg-slate-900/10 flex flex-col gap-2.5 transition-all border-l-4 ${
                                statusB === "pass" ? "border-l-emerald-500 bg-emerald-50/5 dark:bg-emerald-950/5" :
                                statusB === "revision" ? "border-l-blue-500 bg-blue-50/5 dark:bg-blue-950/5" : "border-l-slate-350"
                            }`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                            {statusB === "pass" && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                                            {statusB === "revision" && <AlertCircle className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                                            {statusB === "pending" && <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                            B. Validasi Rekening / NPWP
                                        </div>
                                        <p className="text-[10px] text-slate-450 mt-0.5 leading-relaxed">Pencocokan nama supplier, nomor rekening & NPWP.</p>
                                    </div>
                                </div>
                                {renderTriStateControl(statusB, setStatusB, commentB, setCommentB, "Tulis alasan revisi data supplier...")}
                            </div>

                            {/* Bagian C */}
                            <div className={`p-3 rounded-xl border border-slate-100 dark:border-slate-900/60 bg-slate-50/20 dark:bg-slate-900/10 flex flex-col gap-2.5 transition-all border-l-4 ${
                                statusC === "pass" ? "border-l-emerald-500 bg-emerald-50/5 dark:bg-emerald-950/5" :
                                statusC === "revision" ? "border-l-blue-500 bg-blue-50/5 dark:bg-blue-950/5" : "border-l-slate-350"
                            }`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                            {statusC === "pass" && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                                            {statusC === "revision" && <AlertCircle className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                                            {statusC === "pending" && <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                            C. Pencocokan Item barang & PO
                                        </div>
                                        <p className="text-[10px] text-slate-450 mt-0.5 leading-relaxed">Kesesuaian qty & harga satuan barang dengan Purchase Order.</p>
                                    </div>
                                </div>
                                {renderTriStateControl(statusC, setStatusC, commentC, setCommentC, "Tulis alasan revisi item barang/PO...")}
                            </div>

                            {/* Bagian D */}
                            <div className={`p-3 rounded-xl border border-slate-100 dark:border-slate-900/60 bg-slate-50/20 dark:bg-slate-900/10 flex flex-col gap-2.5 transition-all border-l-4 ${
                                statusD === "pass" ? "border-l-emerald-500 bg-emerald-50/5 dark:bg-emerald-950/5" :
                                statusD === "revision" ? "border-l-blue-500 bg-blue-50/5 dark:bg-blue-950/5" : "border-l-slate-350"
                            }`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                            {statusD === "pass" && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                                            {statusD === "revision" && <AlertCircle className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                                            {statusD === "pending" && <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                            D. Validasi e-Faktur PPN
                                        </div>
                                        <p className="text-[10px] text-slate-450 mt-0.5 leading-relaxed">Pencocokan kode pajak e-Faktur PPN dan kalkulasinya.</p>
                                    </div>
                                </div>
                                {renderTriStateControl(statusD, setStatusD, commentD, setCommentD, "Tulis alasan revisi kode e-Faktur PPN...")}
                            </div>

                            {/* Bagian E */}
                            <div className={`p-3 rounded-xl border border-slate-100 dark:border-slate-900/60 bg-slate-50/20 dark:bg-slate-900/10 flex flex-col gap-2.5 transition-all border-l-4 ${
                                statusE === "pass" ? "border-l-emerald-500 bg-emerald-50/5 dark:bg-emerald-950/5" :
                                statusE === "revision" ? "border-l-blue-500 bg-blue-50/5 dark:bg-blue-950/5" : "border-l-slate-350"
                            }`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                            {statusE === "pass" && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                                            {statusE === "revision" && <AlertCircle className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                                            {statusE === "pending" && <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                            E. Perhitungan Finansial
                                        </div>
                                        <p className="text-[10px] text-slate-450 mt-0.5 leading-relaxed">Akurasi perkalian total, diskon, dan kalkulasi nominal akhir.</p>
                                    </div>
                                </div>
                                {renderTriStateControl(statusE, setStatusE, commentE, setCommentE, "Tulis alasan revisi perhitungan finansial...")}
                            </div>
                        </div>
                    </div>

                    {/* Overall audit notes */}
                    <div className="space-y-1.5 shrink-0">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Catatan Verifikasi Tambahan</Label>
                        <Textarea 
                            placeholder="Berikan keterangan detail tambahan untuk audit berkas ini..."
                            value={verifyComments} 
                            onChange={(e) => setVerifyComments(e.target.value)}
                            className="text-xs rounded-lg border-slate-200 dark:border-slate-800 focus:ring-blue-500 min-h-[60px] bg-slate-50/50 dark:bg-slate-900"
                        />
                    </div>

                    {/* Bottom Decisions Actions Footer */}
                    <div className="flex flex-col gap-2.5 mt-2 border-t pt-4 shrink-0">
                        <div className="flex gap-2">
                            <Button 
                                type="button"
                                onClick={() => handleVerifySubmit("Rejected")} 
                                disabled={savingVerification} 
                                className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-bold h-10 text-xs rounded-lg border border-red-200 transition-all cursor-pointer"
                            >
                                <X className="h-3.5 w-3.5 mr-1" /> Tolak (Reject)
                            </Button>
                            
                            <Button 
                                type="button"
                                onClick={() => handleVerifySubmit("Needs Revision")} 
                                disabled={savingVerification || !hasRevision} 
                                className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-600 hover:text-amber-700 font-bold h-10 text-xs rounded-lg border border-amber-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                title={!hasRevision ? "Minimal harus ada 1 kriteria dengan status Revisi" : ""}
                            >
                                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Minta Revisi
                            </Button>
                        </div>

                        <Button 
                            type="button"
                            onClick={() => handleVerifySubmit("Verified")} 
                            disabled={savingVerification || !allPassed} 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 text-xs rounded-lg shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                            title={!allPassed ? "Semua 5 kriteria harus disetujui (Setuju)" : ""}
                        >
                            {savingVerification ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Menyimpan Audit...
                                </>
                            ) : (
                                <>
                                    <FileCheck className="h-4 w-4" /> Setujui Verifikasi
                                </>
                            )}
                        </Button>
                    </div>

                </div>

            </div>

        </div>
    );
}
