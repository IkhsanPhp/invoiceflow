"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Loader2,
    ShieldAlert,
    UploadCloud,
    X,
    FileText,
    ArrowLeft,
    AlertTriangle,
    Save,
    RefreshCw,
    CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { getInvoiceById, submitVendorRevision } from "../../actions";

interface SupportingFile {
    id: string;
    file: File;
    type: string;
}

export default function ReviseInvoicePage() {
    const params = useParams();
    const router = useRouter();
    const invoiceId = params.id as string;
    const { data: session, isPending: sessionPending } = useSession();

    const [loading, setLoading] = useState(true);
    const [invoice, setInvoice] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const [invoiceNo, setInvoiceNo] = useState("");
    const [taxInvoiceNo, setTaxInvoiceNo] = useState("");
    const [invoiceAmount, setInvoiceAmount] = useState("");
    const [ppnType, setPpnType] = useState("11");
    const [customPpnRate, setCustomPpnRate] = useState("");
    const [releaseDate, setReleaseDate] = useState("");

    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
    const [supportingFiles, setSupportingFiles] = useState<SupportingFile[]>([]);
    
    // Drag and drop states
    const [isInvoiceDragOver, setIsInvoiceDragOver] = useState(false);

    useEffect(() => {
        if (sessionPending) return;
        if (!session) return;

        const loadInvoice = async () => {
            setLoading(true);
            const res = await getInvoiceById(invoiceId);
            if (res.success && res.invoice) {
                const inv = res.invoice;
                setInvoice(inv);
                setInvoiceNo(inv.invoiceNumber || "");
                setTaxInvoiceNo(inv.taxInvoiceNumber || "");
                setReleaseDate(inv.issueDate ? new Date(inv.issueDate).toISOString().split("T")[0] : "");
                
                // Estimate PPN and Base Amount based on existing totalAmount if available
                if (inv.totalAmount) {
                    // For simplicity, just set the total and assume PPN is 11% (this would ideally come from the DB if stored)
                    // If we stored baseAmount and ppnAmount, we could calculate it exactly.
                    // For now, let's just reverse calculate based on 11%
                    const total = parseFloat(inv.totalAmount);
                    const base = total / 1.11;
                    setInvoiceAmount(base.toFixed(2));
                }
            } else {
                setErrorMsg(res.error || "Gagal memuat invoice");
            }
            setLoading(false);
        };

        loadInvoice();
    }, [invoiceId, session, sessionPending]);

    const formatCurrency = (val: string) => {
        if (!val) return "Rp 0";
        const parsed = parseFloat(val);
        if (isNaN(parsed)) return "Rp 0";
        return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(parsed);
    };

    const calculateGrandTotal = () => {
        const base = parseFloat(invoiceAmount);
        if (isNaN(base)) return 0;
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
            alert("Lampiran dokumen invoice baru wajib diunggah untuk merevisi dokumen!");
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

            await uploadDoc(invoiceFile, "invoice");

            for (const sf of supportingFiles) {
                await uploadDoc(sf.file, sf.type);
            }

            const baseAmountNum = parseFloat(invoiceAmount);
            let rate = 0;
            if (ppnType === "1.1") rate = 1.1;
            else if (ppnType === "11") rate = 11;
            else {
                const custom = parseFloat(customPpnRate);
                rate = isNaN(custom) ? 0 : custom;
            }
            const ppnAmountNum = (baseAmountNum * rate) / 100;
            const grandTotalNum = baseAmountNum + ppnAmountNum;

            const result = await submitVendorRevision(invoiceId, {
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
                setMessage({ type: "success", text: "Revisi berhasil dikirim!" });
                setTimeout(() => {
                    router.push(`/dashboard/invoice-hub/details/${invoiceId}`);
                }, 1500);
            } else {
                setMessage({ type: "error", text: result.error || "Gagal mengirim revisi." });
            }
        } catch (error: unknown) {
            const err = error as Error;
            setMessage({ type: "error", text: err.message || "Terjadi kesalahan saat mengunggah revisi." });
        } finally {
            setUploading(false);
        }
    };

    if (sessionPending || loading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="p-6 max-w-lg mx-auto mt-12">
                <Card className="border-red-200 bg-red-50">
                    <CardHeader className="text-center">
                        <ShieldAlert className="h-12 w-12 text-red-600 mx-auto mb-2" />
                        <CardTitle className="text-red-700">Akses Ditolak</CardTitle>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (errorMsg || !invoice) {
        return (
            <div className="p-6 max-w-lg mx-auto mt-12">
                <Card className="border-slate-200 bg-slate-50">
                    <CardHeader className="text-center">
                        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-2" />
                        <CardTitle>Gagal Memuat Invoice</CardTitle>
                        <CardDescription>{errorMsg || "Dokumen invoice tidak ditemukan."}</CardDescription>
                        <div className="pt-4">
                            <Link href="/dashboard/invoice-hub">
                                <Button variant="outline" className="w-full">Kembali</Button>
                            </Link>
                        </div>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    // Extract revision comments from verifications
    const failedVerifications = invoice.verifications?.filter((v: any) => !v.passed && v.comments) || [];
    const financeRevisions = invoice.verifications?.filter((v: any) => v.section === "finance_revision" && !v.passed && v.comments) || [];
    const allRevisions = [...failedVerifications.filter((v: any) => v.section !== "finance_revision"), ...financeRevisions];

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto w-full flex flex-col gap-6 select-none">
            <div className="flex items-center gap-3">
                <Link href={`/dashboard/invoice-hub/details/${invoiceId}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg border border-slate-200/50">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div className="text-xs text-slate-400 font-medium">
                    Workspace / <Link href="/dashboard/invoice-hub" className="hover:text-blue-600">Invoice Hub</Link> / <span className="text-blue-600 font-semibold">Revisi Dokumen</span>
                </div>
            </div>

            <div>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white font-parkinsans tracking-tight flex items-center gap-2">
                    <RefreshCw className="h-6 w-6 text-amber-600" /> Revisi Tagihan: {invoice.invoiceNumber}
                </h1>
                <p className="text-sm text-slate-500 mt-1">Perbarui detail dan unggah ulang dokumen yang sesuai dengan catatan revisi.</p>
            </div>

            {allRevisions.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                            <h3 className="text-sm font-bold text-amber-800 mb-2">Catatan Revisi dari Auditor</h3>
                            <ul className="list-disc pl-5 space-y-1.5 text-xs text-amber-700 font-medium">
                                {allRevisions.map((rev: any, idx: number) => {
                                    const sectionMap: Record<string, string> = {
                                        "A": "Kelengkapan Berkas Dokumen",
                                        "B": "Validasi Rekening / NPWP",
                                        "C": "Pencocokan Item barang & PO",
                                        "D": "Validasi e-Faktur PPN",
                                        "E": "Perhitungan Finansial",
                                        "finance_revision": "Pengecekan Internal Finance"
                                    };
                                    const title = sectionMap[rev.section] || rev.section;
                                    return (
                                        <li key={idx}>
                                            <span className="font-bold">{rev.section !== "finance_revision" ? rev.section + ". " : ""}{title}:</span> {rev.comments}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {message && (
                <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-2 ${
                    message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                    {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    {message.text}
                </div>
            )}

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
                <form onSubmit={handleUploadSubmit}>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-5">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2">1. Pembaruan Informasi Tagihan</h3>
                                
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Nomor Invoice (Wajib) *</Label>
                                    <Input 
                                        value={invoiceNo}
                                        onChange={(e) => setInvoiceNo(e.target.value)}
                                        required
                                        disabled={uploading}
                                        className="h-10 rounded-lg font-semibold"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Nomor Faktur Pajak</Label>
                                    <Input 
                                        value={taxInvoiceNo}
                                        onChange={(e) => setTaxInvoiceNo(e.target.value)}
                                        disabled={uploading}
                                        className="h-10 rounded-lg font-semibold"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Nominal Dasar (IDR) Sebelum PPN *</Label>
                                    <Input 
                                        type="number"
                                        step="0.01"
                                        value={invoiceAmount}
                                        onChange={(e) => setInvoiceAmount(e.target.value)}
                                        required
                                        disabled={uploading}
                                        className="h-10 rounded-lg font-bold font-mono"
                                    />
                                    <p className="text-[10px] text-slate-400">Total Anda sebelumnya: Rp {parseFloat(invoice.totalAmount || "0").toLocaleString('id-ID')}</p>
                                </div>
                                
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Pilihan PPN *</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button type="button" onClick={() => setPpnType("1.1")} className={`py-2 px-3 rounded-lg border text-xs font-bold ${ppnType === "1.1" ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-700"}`}>1.1%</button>
                                        <button type="button" onClick={() => setPpnType("11")} className={`py-2 px-3 rounded-lg border text-xs font-bold ${ppnType === "11" ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-700"}`}>11%</button>
                                        <button type="button" onClick={() => setPpnType("custom")} className={`py-2 px-3 rounded-lg border text-xs font-bold ${ppnType === "custom" ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-700"}`}>Lainnya</button>
                                    </div>
                                </div>

                                {ppnType === "custom" && (
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-slate-400 uppercase">Persentase PPN (%)</Label>
                                        <Input type="number" step="0.01" min="0" max="100" value={customPpnRate} onChange={(e) => setCustomPpnRate(e.target.value)} required disabled={uploading} className="h-10 rounded-lg" />
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Grand Total Nominal (IDR)</Label>
                                    <Input value={formatCurrency(calculateGrandTotal().toString())} readOnly disabled className="h-10 rounded-lg bg-slate-100 font-extrabold text-blue-600 font-mono" />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Tanggal Terbit (Wajib) *</Label>
                                    <Input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} required disabled={uploading} className="h-10 rounded-lg text-xs" />
                                </div>
                            </div>

                            <div className="space-y-5">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2">2. Unggah Ulang Dokumen Pendukung</h3>
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 font-medium mb-4">
                                    Semua dokumen sebelumnya akan digantikan oleh file yang Anda unggah di sini. Pastikan Anda mengunggah semua halaman lengkap.
                                </div>
                                
                                {!invoiceFile ? (
                                    <div 
                                        onDragOver={(e) => { e.preventDefault(); if (!uploading) setIsInvoiceDragOver(true); }}
                                        onDragLeave={() => setIsInvoiceDragOver(false)}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setIsInvoiceDragOver(false);
                                            if (uploading) return;
                                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                                setInvoiceFile(e.dataTransfer.files[0]);
                                            }
                                        }}
                                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${isInvoiceDragOver ? "border-blue-500 bg-blue-50/50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"}`}
                                        onClick={() => document.getElementById("invoice-upload")?.click()}
                                    >
                                        <UploadCloud className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                                        <p className="text-sm font-bold text-slate-700">Pilih atau seret Dokumen Invoice Baru</p>
                                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">Maks 10MB (PDF/Gambar)</p>
                                        <input id="invoice-upload" type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) setInvoiceFile(e.target.files[0]);
                                        }} disabled={uploading} />
                                    </div>
                                ) : (
                                    <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><FileText className="h-5 w-5" /></div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-700 truncate max-w-[180px]">{invoiceFile.name}</p>
                                                <p className="text-[10px] text-slate-500 font-semibold">{(invoiceFile.size / 1024 / 1024).toFixed(2)} MB - Invoice Utama</p>
                                            </div>
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => setInvoiceFile(null)} disabled={uploading} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg"><X className="h-4 w-4" /></Button>
                                    </div>
                                )}

                                <div className="space-y-3 pt-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Dokumen Tambahan Opsional Baru (Faktur Pajak, DO, PO)</Label>
                                    {supportingFiles.map((sf, idx) => (
                                        <div key={sf.id} className="border border-slate-200 rounded-xl p-3 flex flex-col gap-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-slate-400" />
                                                    <p className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{sf.file.name}</p>
                                                </div>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => setSupportingFiles(supportingFiles.filter(f => f.id !== sf.id))} disabled={uploading} className="h-6 w-6 text-red-400 hover:text-red-600"><X className="h-3 w-3" /></Button>
                                            </div>
                                            <select value={sf.type} onChange={(e) => {
                                                const newFiles = [...supportingFiles];
                                                newFiles[idx].type = e.target.value;
                                                setSupportingFiles(newFiles);
                                            }} disabled={uploading} className="text-xs border-slate-200 rounded-md h-8 px-2 font-semibold bg-slate-50 text-slate-600">
                                                <option value="tax_invoice">⚖️ Faktur Pajak</option>
                                                <option value="delivery_order">🚚 Surat Jalan / DO</option>
                                                <option value="po">💼 Purchase Order / SPK</option>
                                                <option value="other">📄 Lainnya</option>
                                            </select>
                                        </div>
                                    ))}
                                    
                                    <div className="pt-1">
                                        <Button type="button" variant="outline" onClick={() => document.getElementById("supporting-upload")?.click()} disabled={uploading} className="w-full h-9 border-dashed border-2 rounded-lg text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                            + Tambah Dokumen Pendukung Lain
                                        </Button>
                                        <input id="supporting-upload" type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                setSupportingFiles([...supportingFiles, { id: crypto.randomUUID(), file: e.target.files[0], type: "tax_invoice" }]);
                                            }
                                        }} disabled={uploading} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t flex justify-end gap-3">
                            <Link href={`/dashboard/invoice-hub/details/${invoiceId}`}>
                                <Button type="button" variant="outline" disabled={uploading} className="h-10 rounded-xl font-bold px-6 border-slate-200">
                                    Batal
                                </Button>
                            </Link>
                            <Button type="submit" disabled={uploading || !invoiceFile} className="h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 shadow-sm">
                                {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengirim Revisi...</> : <><Save className="mr-2 h-4 w-4" /> Simpan & Kirim Ulang</>}
                            </Button>
                        </div>
                    </CardContent>
                </form>
            </Card>
        </div>
    );
}
