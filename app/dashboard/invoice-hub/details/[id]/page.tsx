"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { getInvoiceById, submitShippingConfirmation, confirmPhysicalReceipt, financeApprove, financeRevision, rejectShippingReceipt } from "../../actions";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    ExternalLink,
    Edit2
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

interface OcrDocumentItem {
    description: string | null;
    quantity: number | null;
    unit: string | null;
    unitPrice: string | null;
    totalPrice: string | null;
}

interface OcrDocument {
    id: string;
    type: "invoice" | "tax_invoice" | "delivery_order" | "po";
    pages: number[];
    data: {
        invoiceNumber?: string | null;
        taxInvoiceNumber?: string | null;
        issueDate?: string | null;
        dueDate?: string | null;
        totalAmount?: string | null;
        vendorName?: string | null;
        customerName?: string | null;
        doNumber?: string | null;
        deliveryDate?: string | null;
        poNumber?: string | null;
        recipientName?: string | null;
        poDate?: string | null;
        buyerName?: string | null;
        discount?: string | null;
        ppnPercent?: string | null;
        grandTotal?: string | null;
        bankName?: string | null;
        bankAccount?: string | null;
    };
    fields?: { key: string; label: string; value: string | null }[];
    items?: OcrDocumentItem[];
}

interface OcrResultItem {
    id: string;
    documentId: string;
    extractedData: {
        documents: OcrDocument[];
    } | null;
    processedAt: Date;
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
    ocrResults?: OcrResultItem[];
    auditLogs: AuditLogItem[];
    financeNotes?: string | null;
    shippingDetails?: any;
    grDetails?: any;
}

export default function InvoiceDetailsPage() {
    const params = useParams();
    const invoiceId = params.id as string;
    const { data: session, isPending: sessionPending } = useSession();

    const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [activeOcrTab, setActiveOcrTab] = useState<string>("");

    const [resiFile, setResiFile] = useState<File | null>(null);
    const [resiNumber, setResiNumber] = useState("");
    const [resiCourier, setResiCourier] = useState("");
    const [isSubmittingResi, setIsSubmittingResi] = useState(false);
    
    const [isProcurementConfirming, setIsProcurementConfirming] = useState(false);
    const [isRejectingShipping, setIsRejectingShipping] = useState(false);
    const [shippingRejectionNotes, setShippingRejectionNotes] = useState("");
    const [shippingNotes, setShippingNotes] = useState("");

    // Procurement shipping confirm
    const [receiptDate, setReceiptDate] = useState("");
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [showRejectShippingInput, setShowRejectShippingInput] = useState(false);
    
    const [financeNotesInput, setFinanceNotesInput] = useState("");
    const [isFinanceSubmitting, setIsFinanceSubmitting] = useState(false);

    const handleVendorSubmitResi = async () => {
        setIsSubmittingResi(true);
        const result = await submitShippingConfirmation(invoiceId, {
            shippingNotes
        });
        setIsSubmittingResi(false);
        if (result.success) loadInvoiceData();
        else setErrorMsg(result.error);
    };

    const handleProcurementConfirmReceipt = async () => {
        if (!receiptDate) {
            setErrorMsg("Tanggal terima harus diisi.");
            return;
        }
        setIsProcurementConfirming(true);
        // Normally upload file here, mock for now
        const mockFileUrl = receiptFile ? "https://example.com/receipt-mock.pdf" : null;
        const result = await confirmPhysicalReceipt(invoiceId, { receiptDate, receiptFileUrl: mockFileUrl });
        setIsProcurementConfirming(false);
        if (result.success) loadInvoiceData();
        else setErrorMsg(result.error);
    };

    const handleRejectShippingReceipt = async () => {
        if (!shippingRejectionNotes.trim()) {
            setErrorMsg("Catatan penolakan harus diisi.");
            return;
        }
        setIsRejectingShipping(true);
        const result = await rejectShippingReceipt(invoiceId, shippingRejectionNotes);
        setIsRejectingShipping(false);
        if (result.success) {
            setShowRejectShippingInput(false);
            setShippingRejectionNotes("");
            loadInvoiceData();
        } else {
            setErrorMsg(result.error);
        }
    };

    const handleFinanceApprove = async () => {
        setIsFinanceSubmitting(true);
        const result = await financeApprove(invoiceId);
        setIsFinanceSubmitting(false);
        if (result.success) loadInvoiceData();
        else setErrorMsg(result.error);
    };

    const handleFinanceReject = async () => {
        if (!financeNotesInput) {
            setErrorMsg("Harap isi catatan revisi keuangan.");
            return;
        }
        setIsFinanceSubmitting(true);
        const result = await financeRevision(invoiceId, financeNotesInput);
        setIsFinanceSubmitting(false);
        if (result.success) loadInvoiceData();
        else setErrorMsg(result.error);
    };


    useEffect(() => {
        const docs = invoice?.ocrResults?.[0]?.extractedData?.documents;
        if (docs && docs.length > 0) {
            setActiveOcrTab(docs[0].id);
        }
    }, [invoice]);

    const loadInvoiceData = async () => {
        setIsLoading(true);
        setErrorMsg(null);
        try {
            const res = await getInvoiceById(invoiceId);
            if (res.success && res.invoice) {
                const inv = res.invoice as InvoiceDetail;
                setInvoice(inv);
                if (inv.shippingDetails) {
                    setShippingNotes(inv.shippingDetails.shippingNotes || "");
                }
            } else {
                setErrorMsg(res.error || "Gagal memuat detail invoice.");
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, invoiceId]);

    // Auto-refresh for Pending OCR
    useEffect(() => {
        if (!session?.user || !invoiceId) return;
        
        const intervalId = setInterval(() => {
            setInvoice(currentInvoice => {
                if (currentInvoice && currentInvoice.status.toLowerCase() === "pending ocr") {
                    getInvoiceById(invoiceId as string).then(res => {
                        if (res.success && res.invoice) {
                            setInvoice(res.invoice as InvoiceDetail);
                        }
                    }).catch(err => console.error("Auto-refresh failed:", err));
                }
                return currentInvoice;
            });
        }, 5000);

        return () => clearInterval(intervalId);
    }, [session, invoiceId]);

    const formatCurrency = (val: string | null) => {
        if (!val) return "Rp 0,00";
        return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(parseFloat(val));
    };

    const formatDate = (dateObj: Date | null | string) => {
        if (!dateObj) return "-";
        return new Date(dateObj).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" });
    };

    const formatDueDateRange = (dateObj: Date | null | string) => {
        if (!dateObj) return "-";
        const date = new Date(dateObj);
        const monthName = date.toLocaleDateString("id-ID", { month: "long" });
        const year = date.getFullYear();
        return `28-30 ${monthName} ${year}`;
    };

    const getDisplayStatus = (status: string, userRole: string) => {
        if (userRole === "vendor") {
            const statusLower = status.toLowerCase();
            if (["pending ocr", "in review", "procurement verified", "needs finance revision"].includes(statusLower)) {
                return "In Review";
            }
        }
        return status;
    };

    const getPendingStep = (status: string) => {
        switch(status) {
            case "Pending OCR":
                return { title: "Menunggu Pemrosesan OCR", desc: "Sistem sedang membaca data dokumen secara otomatis.", actor: "Sistem AI" };
            case "In Review":
                return { title: "Menunggu Verifikasi Procurement", desc: "Tim procurement sedang meninjau kelengkapan dokumen invoice.", actor: "Tim Procurement" };
            case "Procurement Verified":
                return { title: "Menunggu Pengiriman Dokumen Fisik", desc: "Vendor diharapkan segera mengirim dokumen fisik dan memasukkan detail pengiriman (resi).", actor: "Vendor" };
            case "Document in Transit":
                return { title: "Menunggu Penerimaan Dokumen Fisik", desc: "Dokumen fisik sedang dalam pengiriman. Menunggu konfirmasi penerimaan oleh tim internal.", actor: "Tim Procurement / Resepsionis" };
            case "In Finance Verification":
                return { title: "Menunggu Verifikasi Finance", desc: "Tim finance sedang meninjau dokumen untuk persetujuan akhir pembayaran.", actor: "Tim Finance" };
            case "Needs Revision":
                return { title: "Menunggu Revisi Vendor", desc: "Vendor perlu memperbaiki dokumen invoice berdasarkan catatan dari auditor.", actor: "Vendor" };
            case "Needs Finance Revision":
                if (role === "vendor") {
                    return { title: "Menunggu Verifikasi Finance", desc: "Tim finance sedang meninjau dokumen untuk persetujuan akhir pembayaran.", actor: "Tim Finance" };
                }
                return { title: "Menunggu Perbaikan Tim Procurement", desc: "Tim procurement perlu memperbaiki dokumen berdasarkan catatan finance.", actor: "Tim Procurement" };
            default:
                return null;
        }
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
                            Silakan masuk terlebih dahulu untuk melihat informasi detail invoice.
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

    const role = (session?.user as { role?: string })?.role || "vendor";
    const isVendor = role === "vendor";

    return (
        <div className="p-4 md:p-6 w-full flex flex-col gap-6 select-none">
            
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
                        Detail verifikasi kelengkapan berkas dan audit log invoice: <span className="font-bold text-slate-700 dark:text-slate-350">{invoice.invoiceNumber}</span>
                    </p>
                </div>
                
                {/* External links */}
                <div className="flex gap-2 flex-wrap justify-end">
                    {((role === "admin" || role === "superadmin" || role === "procurement")) && (
                        <Link href={`/dashboard/invoice-hub/verify/${invoice.id}?mode=edit`}>
                            <Button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 hover:text-amber-800">
                                <Edit2 className="h-3.5 w-3.5" />
                                Edit Verifikasi
                            </Button>
                        </Link>
                    )}
                    {(role === "vendor" && invoice.status.toLowerCase() === "needs revision") && (
                        <Link href={`/dashboard/invoice-hub/revise/${invoice.id}`}>
                            <Button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 hover:text-amber-800">
                                <Edit2 className="h-3.5 w-3.5" />
                                Revisi Dokumen
                            </Button>
                        </Link>
                    )}
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
                    {(() => {
                        const displayStatus = getDisplayStatus(invoice.status, role);
                        let dotColor = "bg-red-500";
                        if (displayStatus === "Verified" || displayStatus === "Paid") {
                            dotColor = "bg-emerald-500";
                        } else if (displayStatus === "In Review") {
                            dotColor = "bg-blue-500";
                        } else if (displayStatus === "Needs Revision") {
                            dotColor = "bg-amber-500";
                        }
                        return <div className={`h-3 w-3 rounded-full animate-pulse ${dotColor}`} />;
                    })()}
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status Audit Sistem</span>
                </div>
                {(() => {
                    const displayStatus = getDisplayStatus(invoice.status, role);
                    let badgeClass = "bg-red-55 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50";
                    if (displayStatus === "Verified" || displayStatus === "Paid") {
                        badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50";
                    } else if (displayStatus === "In Review") {
                        badgeClass = "bg-blue-50 text-blue-700 border-blue-250 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50";
                    } else if (displayStatus === "Needs Revision") {
                        badgeClass = "bg-amber-50 text-amber-700 border-amber-255 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50";
                    }
                    return (
                        <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider border shadow-sm ${badgeClass}`}>
                            {displayStatus}
                        </span>
                    );
                })()}
            </div>

            
            {/* VENDOR UI: Submit Resi */}
            {role === "vendor" && invoice.status === "Procurement Verified" && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 p-4 rounded-2xl flex flex-col gap-3 shadow-sm">
                    <div className="flex items-center gap-2 font-bold text-xs text-blue-800 dark:text-blue-400">
                        <UploadCloud className="h-4.5 w-4.5" />
                        <span>Konfirmasi Pengiriman Dokumen Fisik</span>
                    </div>
                    {invoice.shippingDetails?.rejectionNotes && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex gap-2 shadow-sm animate-in fade-in slide-in-from-top-2">
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="text-xs font-bold mb-1">Pengiriman Sebelumnya Ditolak</h4>
                                <p className="text-[11px] font-medium leading-relaxed">{invoice.shippingDetails.rejectionNotes}</p>
                                <p className="text-[10px] mt-1.5 opacity-80">Silakan perbaiki dokumen dan konfirmasi ulang pengiriman.</p>
                            </div>
                        </div>
                    )}
                    <p className="text-xs text-blue-700 dark:text-blue-300">Invoice telah diverifikasi Procurement. Harap kirim dokumen fisik ke kantor Chitra Pratama BPN.</p>
                    <div className="mt-2">
                        <Label className="text-xs text-blue-900 dark:text-blue-200 mb-1 block">Catatan Pengiriman (Opsional)</Label>
                        <Textarea 
                            placeholder="Tambahkan catatan jika ada..." 
                            className="text-xs min-h-[80px]"
                            value={shippingNotes}
                            onChange={(e) => setShippingNotes(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleVendorSubmitResi} disabled={isSubmittingResi} className="mt-2 w-full sm:w-auto self-end bg-blue-600 hover:bg-blue-700 text-xs h-8">
                        {isSubmittingResi ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Check className="h-3 w-3 mr-2" />}
                        Konfirmasi Pengiriman Dokumen Fisik
                    </Button>
                </div>
            )}

            {/* PROCUREMENT UI: Confirm Receipt */}
            {((role === "procurement" || role === "admin" || role === "superadmin") && invoice.status === "Document in Transit") && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4 rounded-2xl flex flex-col gap-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-xs text-amber-800 dark:text-amber-400">
                            <CheckCircle2 className="h-4.5 w-4.5" />
                            <span>Konfirmasi Penerimaan Dokumen Fisik</span>
                        </div>
                    </div>
                    
                    {invoice.shippingDetails?.shippingNotes && (
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30">
                            <h4 className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1 border-b border-amber-100 pb-1">Catatan Pengiriman Vendor</h4>
                            <p className="text-xs text-slate-700 dark:text-slate-300 mt-2">{invoice.shippingDetails.shippingNotes}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-amber-900 dark:text-amber-200">Tanggal Terima Dokumen</Label>
                            <Input type="date" className="text-xs h-8 bg-white" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-amber-900 dark:text-amber-200">Upload Dokumen Fisik (Scan)</Label>
                            <Input type="file" accept=".pdf,.jpg,.jpeg,.png" className="text-xs h-8 bg-white" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
                        </div>
                    </div>

                    {!showRejectShippingInput ? (
                        <div className="flex justify-end gap-2 mt-1">
                            <Button onClick={() => setShowRejectShippingInput(true)} variant="outline" className="text-xs h-8 border-red-200 text-red-600 hover:bg-red-50">
                                <X className="h-3 w-3 mr-1.5" />
                                Diterima dengan kondisi tidak lengkap
                            </Button>
                            <Button onClick={handleProcurementConfirmReceipt} disabled={isProcurementConfirming} className="bg-amber-600 hover:bg-amber-700 text-xs h-8">
                                {isProcurementConfirming ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Check className="h-3 w-3 mr-2" />}
                                Diterima dengan kondisi lengkap
                            </Button>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 p-3 rounded-xl animate-in fade-in slide-in-from-top-2">
                            <Label className="text-xs font-bold text-red-700 dark:text-red-400 mb-2 block">Catatan Kekurangan Dokumen (Wajib)</Label>
                            <Textarea 
                                placeholder="Jelaskan dokumen apa saja yang kurang atau tidak sesuai..." 
                                className="text-xs min-h-[80px] border-red-200 focus-visible:ring-red-500 mb-3"
                                value={shippingRejectionNotes}
                                onChange={(e) => setShippingRejectionNotes(e.target.value)}
                            />
                            <div className="flex justify-end gap-2">
                                <Button onClick={() => { setShowRejectShippingInput(false); setShippingRejectionNotes(""); }} variant="ghost" className="text-xs h-8 text-slate-500">Batal</Button>
                                <Button onClick={handleRejectShippingReceipt} disabled={isRejectingShipping || !shippingRejectionNotes.trim()} className="bg-red-600 hover:bg-red-700 text-white text-xs h-8">
                                    {isRejectingShipping ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <AlertTriangle className="h-3 w-3 mr-2" />}
                                    Tolak & Minta Revisi Vendor
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* FINANCE UI: Approve / Reject Physical Document */}
            {role === "finance" && invoice.status === "In Finance Verification" && (
                <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col gap-3 shadow-sm">
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-slate-200">
                        <FileText className="h-4.5 w-4.5" />
                        <span>Verifikasi Dokumen Fisik (Offline)</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Harap periksa fisik dokumen yang diserahkan Procurement. Jika sesuai, setujui pembayaran. Jika ada masalah, tolak dan kembalikan.</p>
                    <Textarea 
                        placeholder="Catatan revisi (wajib diisi jika menolak)..." 
                        className="text-xs min-h-[80px]"
                        value={financeNotesInput}
                        onChange={(e) => setFinanceNotesInput(e.target.value)}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                        <Button variant="outline" onClick={handleFinanceReject} disabled={isFinanceSubmitting} className="text-xs h-8 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                            Tolak & Minta Revisi
                        </Button>
                        <Button onClick={handleFinanceApprove} disabled={isFinanceSubmitting} className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700">
                            Setujui & Tandai Siap Bayar
                        </Button>
                    </div>
                </div>
            )}


            {/* Finance Revision Comment Alert */}
            {(() => {
                const finRev = invoice.verifications.find(v => v.section === "finance_revision");
                const notes = invoice.financeNotes || (finRev ? finRev.comments : null);
                if (invoice.status === "Needs Revision" && notes) {
                    return (
                        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-400 rounded-2xl flex flex-col gap-1.5 shadow-sm">
                            <div className="flex items-center gap-2 font-bold text-xs">
                                <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0" />
                                <span>Catatan Peninjauan/Revisi Keuangan (Finance)</span>
                            </div>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                &quot;{finRev?.comments || ""}&quot;
                            </p>
                        </div>
                    );
                }
                return null;
            })()}

            {/* Metadata Informative Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">Nominal Invoice (IDR)</span>
                    <span className="font-extrabold text-lg text-slate-950 dark:text-white mt-1.5 block font-mono text-blue-600 dark:text-blue-400">{formatCurrency(invoice.totalAmount)}</span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">Tanggal Terbit</span>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-205 block">{formatDate(invoice.issueDate)}</span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">Jatuh Tempo (TOP {invoice.termsOfPayment || "30"})</span>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-205 block font-mono text-amber-600 dark:text-amber-450">{formatDueDateRange(invoice.dueDate)}</span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">Nomor Faktur Pajak</span>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-1.5 block font-mono truncate" title={invoice.taxInvoiceNumber || "-"}>{invoice.taxInvoiceNumber || "-"}</span>
                </div>
            </div>

            {/* Stacked content grid */}
            {!isVendor && (
            <div className="grid grid-cols-1 gap-8 items-start border-t pt-6">
                
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
                                    E: { title: "E. Perhitungan Finansial", desc: "Akurasi matematika nominal DPP, PPN, dan grand total invoice." }
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

                {/* Right Column: Lampiran Dokumen Ekstraksi OCR */}
                <div className="space-y-6">
                    {/* Lampiran Dokumen Ekstraksi OCR */}
                    {!isVendor && invoice.ocrResults && invoice.ocrResults.length > 0 && (
                        <div className="space-y-4 pt-6 border-t border-slate-200/50 dark:border-slate-800">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-600" />
                                Hasil Klasifikasi & Lampiran Dokumen OCR
                            </h3>

                            {/* Tab Headers */}
                            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto shrink-0 mb-4 bg-slate-50/50 dark:bg-slate-900/30 p-1 rounded-xl">
                                {(invoice.ocrResults[0].extractedData?.documents || []).map((doc: OcrDocument) => {
                                    let label = "Dokumen";
                                    if (doc.type === "invoice") label = "📄 Invoice";
                                    else if (doc.type === "tax_invoice") label = "⚖️ Faktur Pajak";
                                    else if (doc.type === "delivery_order") label = "🚚 Surat Jalan / DO";
                                    else if (doc.type === "po") label = "💼 Purchase Order";

                                    const isActive = activeOcrTab === doc.id;
                                    return (
                                        <button
                                            key={doc.id}
                                            type="button"
                                            onClick={() => setActiveOcrTab(doc.id)}
                                            className={`px-3 py-1.5 text-[11px] font-bold transition-all rounded-lg cursor-pointer whitespace-nowrap ${
                                                isActive 
                                                    ? "bg-white dark:bg-slate-950 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-slate-800" 
                                                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-250 border border-transparent"
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="space-y-4">
                                {(invoice.ocrResults[0].extractedData?.documents || [])
                                    .filter((doc: OcrDocument) => doc.id === activeOcrTab)
                                    .map((doc: OcrDocument) => {
                                        // Colors based on document type
                                        let cardBorder = "border-l-blue-500";
                                        let bgClass = "bg-blue-500/5 dark:bg-blue-950/10";
                                        let badgeClass = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50";
                                        let badgeText = "Invoice";

                                        if (doc.type === "tax_invoice") {
                                            cardBorder = "border-l-purple-500";
                                            bgClass = "bg-purple-500/5 dark:bg-purple-950/10";
                                            badgeClass = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/50";
                                            badgeText = "Faktur Pajak";
                                        } else if (doc.type === "delivery_order") {
                                            cardBorder = "border-l-amber-500";
                                            bgClass = "bg-amber-500/5 dark:bg-amber-950/10";
                                            badgeClass = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50";
                                            badgeText = "Surat Jalan / DO";
                                        } else if (doc.type === "po") {
                                            cardBorder = "border-l-emerald-500";
                                            bgClass = "bg-emerald-500/5 dark:bg-emerald-950/10";
                                            badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50";
                                            badgeText = "Purchase Order";
                                        }

                                        return (
                                            <div 
                                                key={doc.id} 
                                                className={`p-4 rounded-xl border border-slate-200 dark:border-slate-800 border-l-4 transition-all shadow-sm flex flex-col gap-3 ${cardBorder} ${bgClass}`}
                                            >
                                                {/* Card Header */}
                                                <div className="flex items-center justify-between gap-2 border-b pb-2 border-slate-200/50 dark:border-slate-850">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-extrabold uppercase tracking-wider ${badgeClass}`}>
                                                            {badgeText}
                                                        </span>
                                                        <span className="text-[10px] text-slate-450 dark:text-slate-500 font-bold">
                                                            Halaman: {doc.pages.join(", ")}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Card Content Data Fields */}
                                                <div className="flex flex-col gap-3.5">
                                                    {/* Dynamic Fields Grid */}
                                                    <div className="grid grid-cols-2 gap-3.5">
                                                        {(doc.fields && doc.fields.length > 0 ? doc.fields : Object.keys(doc.data).map(key => {
                                                            let label = key;
                                                            if (key === "invoiceNumber") label = "Nomor Invoice";
                                                            else if (key === "taxInvoiceNumber") label = "Nomor Faktur Pajak";
                                                            else if (key === "issueDate") label = "Tanggal Terbit";
                                                            else if (key === "dueDate") label = "Jatuh Tempo";
                                                            else if (key === "totalAmount") label = "Total Invoice";
                                                            else if (key === "vendorName") label = "Nama Vendor";
                                                            else if (key === "customerName") label = "Nama Customer";
                                                            else if (key === "doNumber") label = "Nomor DO";
                                                            else if (key === "deliveryDate") label = "Tanggal Pengiriman";
                                                            else if (key === "poNumber") label = "Nomor PO";
                                                            else if (key === "recipientName") label = "Penerima";
                                                            else if (key === "poDate") label = "Tanggal PO";
                                                            else if (key === "buyerName") label = "Pembeli";
                                                            else if (key === "discount" || key === "ppnPercent" || key === "grandTotal" || key === "bankName" || key === "bankAccount") return null;
                                                            return { key, label, value: doc.data[key as keyof typeof doc.data] };
                                                        }).filter(Boolean) as { key: string; label: string; value: string | null }[]).map(field => (
                                                            <div key={field.key} className="space-y-0.5">
                                                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block">{field.label}</span>
                                                                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={field.value || ""}>
                                                                    {field.value || "-"}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Tabular Line Items Section */}
                                                    {(doc.items && doc.items.length > 0) && (
                                                        <div className="mt-2 space-y-2 border-t pt-3 border-slate-200/50 dark:border-slate-800/30">
                                                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                                                Rincian Item Transaksi
                                                            </span>
                                                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                                                                <table className="w-full text-[11px] border-collapse bg-white dark:bg-slate-950">
                                                                    <thead>
                                                                        <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[9px] font-bold uppercase tracking-wider text-slate-500 text-left">
                                                                            <th className="px-2 py-1.5 min-w-[120px]">Deskripsi</th>
                                                                            <th className="px-1.5 py-1.5 w-12 text-center">Qty</th>
                                                                            <th className="px-1.5 py-1.5 w-14 text-center">Satuan</th>
                                                                            <th className="px-2 py-1.5 w-20 text-right">Harga (Rp)</th>
                                                                            <th className="px-2 py-1.5 w-20 text-right">Total (Rp)</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                                                                        {doc.items.map((item, idx) => (
                                                                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                                                                                <td className="px-2 py-1">
                                                                                    <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-2" title={item.description || ""}>
                                                                                        {item.description || "-"}
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-1.5 py-1 text-center font-semibold text-slate-800 dark:text-slate-200">
                                                                                    {item.quantity ?? "-"}
                                                                                </td>
                                                                                <td className="px-1.5 py-1 text-center font-bold text-[10px] text-slate-500 dark:text-slate-400 uppercase">
                                                                                    {item.unit || "-"}
                                                                                </td>
                                                                                <td className="px-2 py-1 text-right font-mono font-bold text-slate-850 dark:text-slate-200">
                                                                                    {item.unitPrice ? parseFloat(item.unitPrice).toLocaleString('id-ID') : "-"}
                                                                                </td>
                                                                                <td className="px-2 py-1 text-right font-mono font-bold text-slate-850 dark:text-slate-200">
                                                                                    {item.totalPrice ? parseFloat(item.totalPrice).toLocaleString('id-ID') : "-"}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Financial Summary & Payment Info */}
                                                    <div className="mt-2 grid grid-cols-3 gap-3 border-t pt-3.5 border-slate-200/50 dark:border-slate-800/30">
                                                        <div className="space-y-0.5">
                                                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Diskon</span>
                                                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono">
                                                                {doc.data.discount ? `Rp ${parseFloat(doc.data.discount).toLocaleString('id-ID')}` : "-"}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Tarif PPN (%)</span>
                                                            <div className="text-xs font-bold text-slate-800 dark:text-slate-205 dark:text-slate-200">{doc.data.ppnPercent ? `${doc.data.ppnPercent}%` : "-"}</div>
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Grand Total</span>
                                                            <div className="text-xs font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                                                                {doc.data.grandTotal ? `Rp ${parseFloat(doc.data.grandTotal).toLocaleString('id-ID')}` : "-"}
                                                            </div>
                                                        </div>

                                                        {/* Bank Account */}
                                                        {doc.data.bankAccount && (
                                                            <div className="col-span-3 grid grid-cols-2 gap-3.5 border-t pt-2 border-slate-200/50 dark:border-slate-800/30">
                                                                <div className="space-y-0.5">
                                                                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Nama Bank</span>
                                                                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{doc.data.bankName || "-"}</div>
                                                                </div>
                                                                <div className="space-y-0.5">
                                                                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Nomor Rekening</span>
                                                                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono truncate" title={doc.data.bankAccount || ""}>
                                                                        {doc.data.bankAccount || "-"}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            )}

            {/* Full-width Bottom Column: History timeline list */}
            <div className="mt-8 pt-6 border-t border-slate-200/60 dark:border-slate-800 space-y-6">
                {/* History timeline list */}
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
                            {(() => {
                                const pending = getPendingStep(invoice.status);
                                if (pending) {
                                    return (
                                        <div className="relative group opacity-90 animate-pulse pb-2">
                                            <div className={`absolute -left-[37px] top-0.5 rounded-full p-1.5 flex items-center justify-center shrink-0 shadow-sm bg-emerald-50 dark:bg-emerald-950/40 border-2 border-dashed border-emerald-500 dark:border-emerald-600`}>
                                                <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                                    <h4 className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">{pending.title} <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1">(Sedang Berjalan)</span></h4>
                                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono italic">Saat ini</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{pending.desc}</p>
                                                <div className="flex items-center gap-1.5 text-[9px] text-slate-400 dark:text-slate-500 pt-0.5 font-semibold">
                                                    <span className="italic">Aksi Selanjutnya: {pending.actor}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                            
                            {[...invoice.auditLogs]
                                .filter(log => {
                                    if (role === "vendor") {
                                        return log.action !== "FINANCE_REVISION_REQUEST" && log.action !== "NEEDS_FINANCE_REVISION";
                                    }
                                    return true;
                                })
                                .sort((a,b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()).map((log, index) => {
                                let title = "";
                                let desc = "";
                                let iconBg = "";
                                let iconColor = "";
                                let iconNode = null;

                                switch (log.action) {
                                    case "CREATE":
                                        title = "Invoice Berhasil Dikirim";
                                        desc = "Vendor mengunggah dokumen invoice utama beserta berkas pendukung wajib.";
                                        iconNode = <UploadCloud className="h-3.5 w-3.5" />;
                                        break;
                                    case "PROCUREMENT_VERIFY":
                                        title = "Verifikasi Procurement Disetujui";
                                        desc = "Procurement Admin memverifikasi kelengkapan berkas dan menyetujui dokumen.";
                                        iconNode = <Check className="h-3.5 w-3.5 font-bold" />;
                                        break;
                                    case "FINANCE_VERIFY":
                                        title = "Persetujuan Final Finance (Verified)";
                                        desc = "Finance menyetujui invoice secara final untuk proses pembayaran.";
                                        iconNode = <Check className="h-3.5 w-3.5 font-bold" />;
                                        break;
                                    case "FINANCE_REVISION_REQUEST":
                                        title = "Revisi Dikembalikan oleh Finance";
                                        desc = "Finance meninjau invoice dan mengembalikannya ke Procurement dengan catatan perbaikan.";
                                        iconNode = <RefreshCw className="h-3.5 w-3.5" />;
                                        break;
                                    case "FINANCE_REJECT":
                                        title = "Ditolak oleh Finance (Rejected)";
                                        desc = "Finance menolak invoice karena alasan fatal.";
                                        iconNode = <X className="h-3.5 w-3.5" />;
                                        break;
                                    case "VERIFY":
                                        title = "Pemeriksaan Disetujui (Verified)";
                                        desc = "Pemeriksa menyelesaikan proses verifikasi dan menyetujui invoice.";
                                        iconNode = <Check className="h-3.5 w-3.5 font-bold" />;
                                        break;
                                    case "REVISION_REQUEST":
                                        title = "Permintaan Revisi ke Vendor";
                                        desc = "Pemeriksa mengembalikan invoice ke vendor untuk perbaikan data.";
                                        iconNode = <RefreshCw className="h-3.5 w-3.5" />;
                                        break;
                                    case "REJECT":
                                        title = "Invoice Ditolak (Rejected)";
                                        desc = "Dokumen invoice ditolak oleh pemeriksa karena tidak sesuai ketentuan.";
                                        iconNode = <X className="h-3.5 w-3.5" />;
                                        break;
                                    case "SHIPPING_SUBMITTED":
                                        title = "Dokumen Fisik Dikirim";
                                        desc = "Vendor mengonfirmasi pengiriman dokumen fisik invoice ke kantor/alamat tujuan.";
                                        iconNode = <UploadCloud className="h-3.5 w-3.5" />;
                                        break;
                                    case "PHYSICAL_RECEIVED":
                                        title = "Dokumen Fisik Diterima";
                                        desc = "Resepsionis atau admin menerima dokumen fisik dan meneruskannya ke Finance.";
                                        iconNode = <Check className="h-3.5 w-3.5 font-bold" />;
                                        break;
                                    default:
                                        title = log.action;
                                        desc = "Aktivitas tercatat oleh sistem.";
                                        iconNode = <FileText className="h-3.5 w-3.5" />;
                                        break;
                                }

                                // Apply Grey coloring for all past steps
                                iconBg = "bg-slate-100 dark:bg-slate-800";
                                iconColor = "text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700";

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
                                            
                                            {/* Render revision comments if any */}
                                            {((log.metadata as any)?.checklist && Array.isArray((log.metadata as any).checklist) && (log.metadata as any).checklist.some((c: any) => !c.passed && c.comments)) && (
                                                <div className="mt-2 text-[11px] bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 p-2.5 rounded-lg">
                                                    <strong className="block mb-1 font-bold">Catatan Revisi:</strong>
                                                    <ul className="list-disc pl-4 space-y-1">
                                                        {(log.metadata as any).checklist.filter((c: any) => !c.passed && c.comments).map((c: any, i: number) => (
                                                            <li key={i}>{c.comments}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            
                                            {/* Render single comment note (e.g. from finance) */}
                                            {((log.metadata as any)?.comments && typeof (log.metadata as any).comments === "string") && (
                                                <div className="mt-2 text-[11px] bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 p-2.5 rounded-lg">
                                                    <strong className="block mb-1 font-bold">Catatan Pemeriksa:</strong>
                                                    <p>{(log.metadata as any).comments}</p>
                                                </div>
                                            )}

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
    );
}
